import { Platform } from "@volley/platform-sdk/lib"
import {
    useAccount,
    useDeviceInfo,
    useSessionId,
} from "@volley/platform-sdk/react"
import { useEffect, useState } from "react"

import packageJson from "../../../../package.json"
import { ENVIRONMENT } from "../../../config/envconfig"
import { Environment } from "../../../config/environment"
import { getCachedPlatform, isMobile } from "../../../config/platformDetection"
import { useAccountId } from "../../../hooks/useAccountId"
import { useAnonymousId } from "../../../hooks/useAnonymousId"
import { useFocusDebug } from "../../../hooks/useFocusDebug"
import { KONAMI_CODE, useKonamiCode } from "../../../hooks/useKonamiCode"
import { getMemoryUsage } from "../../../utils/getMemoryUsage"
import { getTvMemoryLimits } from "../../../utils/getTvMemoryLimits"
import { logger } from "../../../utils/logger"
import { logoutAndReload } from "../../../utils/logoutAndReload"
import styles from "./Debug.module.scss"

const formatKonamiKey = (key: string): string => {
    if (key.startsWith("Arrow")) {
        return key.replace("Arrow", "").substring(0, 1)
    }
    return key.toUpperCase()
}

export const Debug: React.FC<{
    isInitialized: boolean
}> = ({ isInitialized }) => {
    const { konamiState } = useKonamiCode(() => {
        void logoutAndReload()
    })
    const [memoryInfo, setMemoryInfo] =
        useState<ReturnType<typeof getMemoryUsage>>(null)
    const focusInfo = useFocusDebug()

    const anonymousId = useAnonymousId()
    const accountId = useAccountId()
    const sessionId = useSessionId()
    const deviceInfo = useDeviceInfo()
    const platform = getCachedPlatform()
    const deviceId = deviceInfo.getDeviceId?.()
    const osVersion = deviceInfo.getOSVersion?.()
    const model = deviceInfo.getModel?.()

    const { account } = useAccount()
    const isSubscribed = account?.isSubscribed

    useEffect(() => {
        const updateMemoryInfo = (): void => {
            const memory = getMemoryUsage()
            if (memory) {
                setMemoryInfo(memory)
            }

            if (memory) {
                const deviceModel = deviceInfo.getModel?.() ?? null

                const limits = getTvMemoryLimits(
                    deviceModel,
                    memory.limit * 1024 * 1024
                )
                const usedBytes = memory.used * 1024 * 1024
                const warningThreshold = Math.round(
                    limits.warning / (1024 * 1024)
                )
                const criticalThreshold = Math.round(
                    limits.critical / (1024 * 1024)
                )

                if (usedBytes >= limits.critical) {
                    logger.info(
                        `CRITICAL: Memory usage ${memory.used}MB exceeds ${platform} critical threshold (${criticalThreshold}MB)`
                    )
                } else if (usedBytes >= limits.warning) {
                    logger.info(
                        `WARNING: Memory usage ${memory.used}MB approaching ${platform} limit (${warningThreshold}MB warning threshold)`
                    )
                }
            }
        }

        updateMemoryInfo()
        const interval = setInterval(updateMemoryInfo, 5000)

        return (): void => clearInterval(interval)
    }, [deviceInfo, platform])

    if (ENVIRONMENT === Environment.PRODUCTION) {
        return null
    }

    if (isMobile()) {
        return (
            <div className={styles.debug}>
                <span>mobile</span>
                <span>hub client: {packageJson.version}</span>
                <span>
                    psdk: {packageJson.dependencies["@volley/platform-sdk"]}
                </span>
                <span>platform: {platform}</span>
                {osVersion && <span>osVersion: {osVersion}</span>}
                <span>sessionId: {sessionId}</span>
                <span>anonymousId: {anonymousId}</span>
                {accountId && <span>accountId: {accountId}</span>}
                <span>env: {ENVIRONMENT}</span>
                {memoryInfo && (
                    <span>
                        mem: {memoryInfo.used}MB ({memoryInfo.percentage}%)
                    </span>
                )}
                <span>focus: {focusInfo.activeElement}</span>
                <span>
                    window: {focusInfo.windowFocused ? "focused" : "blurred"} |
                    page: {focusInfo.documentVisibility} | hasFocus:{" "}
                    {focusInfo.hasFocus ? "yes" : "no"}
                </span>
            </div>
        )
    }

    return (
        <div className={styles.debug}>
            <span>hub client: {packageJson.version}</span>
            <span>
                psdk: {packageJson.dependencies["@volley/platform-sdk"]}
            </span>
            <span>platform: {platform}</span>
            {osVersion && <span>osVersion: {osVersion}</span>}
            {model && <span>model: {model}</span>}
            <span>sessionId: {sessionId}</span>
            <span>anonymousId: {anonymousId}</span>
            {accountId && <span>accountId: {accountId}</span>}
            {deviceId && <span>deviceId: {deviceId}</span>}
            <span>isSubscribed: {String(isSubscribed)}</span>
            <span>isInitialized: {String(isInitialized)}</span>
            <span>env: {ENVIRONMENT}</span>
            {memoryInfo && (
                <span>
                    memory: {memoryInfo.used}MB used/{memoryInfo.limit}MB limit
                    ({memoryInfo.percentage}%)
                </span>
            )}
            <span>focus: {focusInfo.activeElement}</span>
            <span>
                window: {focusInfo.windowFocused ? "focused" : "blurred"} |
                page: {focusInfo.documentVisibility} | hasFocus:{" "}
                {focusInfo.hasFocus ? "yes" : "no"}
            </span>
            {platform !== Platform.FireTV && (
                <div className={styles.konamiSection}>
                    <span className={styles.konamiTitle}>
                        web checkout sign out sequence
                    </span>
                    <div className={styles.konamiCode}>
                        {KONAMI_CODE.map((key, index) => {
                            const isComplete = index < konamiState.currentIndex
                            const isActive = index === konamiState.currentIndex
                            return (
                                <span
                                    className={`${styles.konamiKey} ${
                                        isComplete ? styles.complete : ""
                                    } ${isActive ? styles.active : ""}`}
                                >
                                    {formatKonamiKey(key)}
                                </span>
                            )
                        })}
                        {konamiState.isComplete && (
                            <span className={styles.konamiPrompt}>
                                Press Enter to unsubscribe & reload
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
