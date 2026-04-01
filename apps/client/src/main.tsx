import "./polyfills"
import "./Global.scss"
import "./utils/datadog"

import { init } from "@noriginmedia/norigin-spatial-navigation"
import { PlatformProvider } from "@volley/platform-sdk/react"
import { lazy, Suspense, Component, type ReactNode } from "react"
import { createRoot } from "react-dom/client"

import packageJson from "../package.json"
import { ChunkLoadErrorBoundary } from "./components/ChunkLoadErrorBoundary/ChunkLoadErrorBoundary"
import { ArrowPressProvider } from "./components/FocusableUI/ArrowPressContext"
import {
    PLATFORM_API_URL,
    PLATFORM_AUTH_API_URL,
    PLATFORM_STAGE,
} from "./constants"
import { initResourceDetection } from "./utils/resourceDetection"
import { pngDetector } from "./utils/pngDetection"
import { s3Detector } from "./utils/s3Detection"

const App = lazy(() =>
    import("./components/App").then((module) => ({
        default: module.App,
    }))
)

const rootElement = document.getElementById("root")
if (!rootElement) {
    throw new Error("Root element not found")
}

const basePlatformOptions = {
    appVersion: packageJson.version,
    stage: PLATFORM_STAGE,
    platformApiUrl: PLATFORM_API_URL,
    platformAuthApiUrl: PLATFORM_AUTH_API_URL,
    readyEventTimeoutMs: 30000,
}

/**
 * Wraps PlatformProvider so the app doesn't crash when Platform SDK
 * can't connect (local dev without a session server). Falls back to
 * rendering children without the Platform context.
 */
class PlatformErrorBoundary extends Component<{ children: ReactNode }, { hasFailed: boolean }> {
    state = { hasFailed: false }
    static getDerivedStateFromError() {
        return { hasFailed: true }
    }
    componentDidCatch(error: Error) {
        console.warn("[Proto-Hub] Platform SDK unavailable, running without it:", error.message)
    }
    render() {
        if (this.state.hasFailed) {
            return this.props.children
        }
        return (
            <PlatformProvider
                options={{
                    ...basePlatformOptions,
                    gameId: "proto-hub",
                }}
            >
                {this.props.children}
            </PlatformProvider>
        )
    }
}

init({ throttleKeypresses: true, throttle: 50 })
initResourceDetection([pngDetector, s3Detector])
window.addEventListener(
    "keydown",
    (e: KeyboardEvent) => {
        if (
            e.key === "ArrowUp" ||
            e.key === "ArrowDown" ||
            e.key === "ArrowLeft" ||
            e.key === "ArrowRight"
        ) {
            e.preventDefault()
        }
    },
    { passive: false }
)

createRoot(rootElement).render(
    <PlatformErrorBoundary>
        <ArrowPressProvider>
            <ChunkLoadErrorBoundary>
                <Suspense fallback={null}>
                    <App />
                </Suspense>
            </ChunkLoadErrorBoundary>
        </ArrowPressProvider>
    </PlatformErrorBoundary>
)
