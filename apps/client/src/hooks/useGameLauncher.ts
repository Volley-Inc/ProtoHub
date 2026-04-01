import type { IGameOrchestration } from "@volley/platform-sdk/lib"

import { getCachedPlatform } from "../config/platformDetection"
import { GAME_LAUNCHER_ERROR_DIAGNOSTICS } from "../constants"
import type { DurationVitalReference } from "../utils/datadog"
import { safeDatadogRum } from "../utils/datadog"
import { logger } from "../utils/logger"
import type { Game } from "./useGames"
import { LaunchedGameState } from "./useLaunchedGameState"

export const DEFAULT_MIN_LAUNCH_INTERVAL_MS = 2000
export const DEFAULT_MAX_CONSECUTIVE_FAILURES = 3
export const DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS = 30000

/** Configuration for {@link GameLauncher} safety mechanisms. */
export interface GameLauncherConfig {
    /** Minimum milliseconds between launch attempts. Prevents double-tap launches. Default: 2000ms. */
    minLaunchIntervalMs?: number
    /** Number of consecutive failures before the circuit breaker activates. Default: 3. */
    maxConsecutiveFailures?: number
    /** How long the circuit breaker stays active after tripping, in milliseconds. Default: 30000ms. */
    circuitBreakerCooldownMs?: number
}

/**
 * Orchestrates game launches with built-in safety mechanisms:
 *
 * - **Rate limiting**: Enforces a minimum interval between launches to prevent double-taps
 * - **Circuit breaker**: After N consecutive failures of a specific game, blocks that game for a cooldown period
 * - **Duration vitals**: Reports launch timing to Datadog for performance monitoring
 */
export class GameLauncher {
    private readonly CIRCUIT_BREAKER_COOLDOWN_MS: number

    private failuresByGame = new Map<
        string,
        { consecutiveFailures: number; circuitBreakerUntil: number }
    >()

    private isLaunching = false

    private lastLaunchTime = 0

    private readonly MAX_CONSECUTIVE_FAILURES: number

    private readonly MIN_LAUNCH_INTERVAL_MS: number

    public get isGameLaunching(): boolean {
        return this.isLaunching
    }

    constructor(
        private readonly gameOrchestration: IGameOrchestration,
        private readonly setLaunchedGameState: (
            state: LaunchedGameState | null
        ) => void,
        config: GameLauncherConfig = {}
    ) {
        this.MIN_LAUNCH_INTERVAL_MS =
            config.minLaunchIntervalMs ?? DEFAULT_MIN_LAUNCH_INTERVAL_MS
        this.MAX_CONSECUTIVE_FAILURES =
            config.maxConsecutiveFailures ?? DEFAULT_MAX_CONSECUTIVE_FAILURES
        this.CIRCUIT_BREAKER_COOLDOWN_MS =
            config.circuitBreakerCooldownMs ??
            DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS
    }

    /**
     * Attempts to launch a game. Applies all safety checks in order:
     * 1. Circuit breaker: reject if in cooldown
     * 2. Rate limit: reject if too soon after previous launch
     * 3. Call Platform SDK `gameOrchestration.launchGame()`
     * 4. On success: update launched game state, reset failure counter
     * 5. On failure: log diagnostics, increment failure counter, maybe trip circuit breaker
     */
    public async launchGame(game: Game): Promise<void> {
        logger.info(`GameLauncher - launching game: ${game.id} (${game.title})`)

        const now = Date.now()

        const gameFailures = this.failuresByGame.get(game.id)
        if (gameFailures && now < gameFailures.circuitBreakerUntil) {
            const remainingSeconds = Math.ceil(
                (gameFailures.circuitBreakerUntil - now) / 1000
            )
            logger.warn(
                `GameLauncher - Circuit breaker active for ${game.id}. Too many consecutive failures. Try again in ${remainingSeconds}s`
            )
            return
        }

        const timeSinceLastLaunch = now - this.lastLaunchTime
        if (
            this.lastLaunchTime > 0 &&
            timeSinceLastLaunch < this.MIN_LAUNCH_INTERVAL_MS
        ) {
            const remainingMs =
                this.MIN_LAUNCH_INTERVAL_MS - timeSinceLastLaunch
            logger.warn(
                `GameLauncher - Rate limit: Ignoring launch request. Min interval: ${this.MIN_LAUNCH_INTERVAL_MS}ms, time since last: ${timeSinceLastLaunch}ms, wait ${remainingMs}ms`
            )
            return
        }

        this.lastLaunchTime = now
        this.isLaunching = true

        let launchVitalRef: DurationVitalReference | null = null

        launchVitalRef = safeDatadogRum.startDurationVital("launchGame", {
            context: {
                gameId: game.id,
            },
            description: "Time from game launch initated to game ready",
        })

        try {
            logger.info(
                `GameLauncher - launching game: ${game.id} (${game.title})`
            )
            const response = await this.gameOrchestration.launchGame(game.id)

            if (!response.url || response.url.trim() === "") {
                throw new Error("Invalid game launch response: empty URL")
            }

            logger.info(`GameLauncher - launchGame response: ${response.url}`)

            this.setLaunchedGameState(
                new LaunchedGameState(response.url, game, launchVitalRef)
            )

            this.failuresByGame.delete(game.id)
        } catch (error) {
            const diagnostics = this.extractErrorDiagnostics(
                error,
                this.lastLaunchTime
            )
            logger.error(
                "Error - GameLauncher - Request aborted or failed",
                error,
                diagnostics
            )

            if (launchVitalRef) {
                safeDatadogRum.stopDurationVital(launchVitalRef, {
                    context: {
                        status: "error",
                        error: error as Error,
                        ...diagnostics,
                    },
                })
            }

            this.setLaunchedGameState(null)

            const entry = this.failuresByGame.get(game.id) ?? {
                consecutiveFailures: 0,
                circuitBreakerUntil: 0,
            }
            entry.consecutiveFailures++
            if (entry.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
                entry.circuitBreakerUntil =
                    Date.now() + this.CIRCUIT_BREAKER_COOLDOWN_MS
                logger.warn(
                    `GameLauncher - Circuit breaker activated for ${game.id} after ${entry.consecutiveFailures} consecutive failures. Cooldown for ${this.CIRCUIT_BREAKER_COOLDOWN_MS}ms`,
                    diagnostics
                )
            }
            this.failuresByGame.set(game.id, entry)
        } finally {
            this.isLaunching = false
        }
    }

    /**
     * Capture error classification (AbortError vs network errors), timing information, platform
     * details, and user agent data.
     */
    private extractErrorDiagnostics(
        error: unknown,
        launchStartTime: number
    ): Record<string, unknown> {
        const now = Date.now()
        const latencyMs = now - launchStartTime
        const errorObj =
            error instanceof Error ? error : new Error(String(error))

        const errorName = errorObj.name || "Unknown"
        const errorMessage = errorObj.message || ""
        const isAbortError = errorName === "AbortError"

        const userAgent = navigator.userAgent
        const platform = getCachedPlatform()
        const errorCategory = this.categorizeErrorCause(
            isAbortError,
            errorName,
            latencyMs
        )

        return {
            errorType: errorName,
            errorMessage,
            isAbortError,
            errorCategory,
            latencyMs,
            launchStartTime,
            platform: platform?.toString(),
            userAgent,
            timestamp: new Date().toISOString(),
        }
    }

    private categorizeErrorCause(
        isAbortError: boolean,
        errorType: string,
        latencyMs: number
    ): string {
        if (isAbortError) {
            if (
                latencyMs <
                GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_LATENCY_USER_NAVIGATION_THRESHOLD_MS
            ) {
                return GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_USER_NAVIGATION
            }
            if (
                latencyMs >
                GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_LATENCY_TIMEOUT_THRESHOLD_MS
            ) {
                return GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_TIMEOUT
            }
        }

        if (errorType.includes("AxiosError")) {
            return GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_NETWORK_ERROR
        }

        return GAME_LAUNCHER_ERROR_DIAGNOSTICS.ERROR_CATEGORY_UNKNOWN
    }
}
