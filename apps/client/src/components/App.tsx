import { useAccount } from "@volley/platform-sdk/react"
import { type FeatureBundle, LazyMotion } from "motion/react"
import {
    type JSX,
    lazy,
    Suspense,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"

import { LOGO_DISPLAY_MILLIS } from "../config/envconfig"
import { AppLifecycleVideoProvider } from "../contexts/AppLifecycleVideoContext"
import { useBrandDocumentMeta } from "../hooks/useBrandDocumentMeta"
import { useDatadogIdentity } from "../hooks/useDatadogIdentity"
import { useFailedInitializationModal } from "../hooks/useFailedInitializationModal"
import { useHubSessionStart } from "../hooks/useHubSessionStart"
import { useInitializationDatadogRUMEvents } from "../hooks/useInitializationDatadogRUMEvents"
import { useInitializationError } from "../hooks/useInitializationError"
import { usePlatformReadiness } from "../hooks/usePlatformReadiness"
import { getVideoIdent } from "../utils/getVideoIdent"
import { ChunkLoadErrorBoundary } from "./ChunkLoadErrorBoundary/ChunkLoadErrorBoundary"
import { FailedInitializationModal } from "./FailedInitializationModal"
import { Loading } from "./TvHub/Loading"

const TvHub = lazy(() =>
    import("./TvHub/TvHub").then((module) => ({ default: module.TvHub }))
)

const loadFeatures = (): Promise<FeatureBundle> =>
    import("../features").then((res) => res.default)

function AppBody({
    platformInitializationError,
}: {
    platformInitializationError: string | null
}): JSX.Element {
    useDatadogIdentity()
    useBrandDocumentMeta()

    const [videoComplete, setVideoComplete] = useState<boolean>(false)
    const [assetLoadingStates, setAssetLoadingStates] = useState({
        requiredImagesLoaded: false,
        tileImagesLoaded: false,
        firstHeroImageLoaded: false,
        remainingHeroImagesLoaded: false,
        focusIndicatorLoaded: false,
        webCheckoutRequiredImagesLoaded: false,
        statusBannersLoaded: false,
        tileAnimationsLoaded: false,
        optionalImagesLoaded: false,
    })
    const [completedInitialLoad, setCompletedInitialLoad] =
        useState<boolean>(false)

    const { account } = useAccount()

    const isPlatformReady = usePlatformReadiness()

    const initializationError = useInitializationError({
        platformInitializationError,
        account,
    })

    const { showFailedInitModal, errorMessage, handleExit } =
        useFailedInitializationModal(initializationError)

    const hasInitializedRef = useRef(false)

    useHubSessionStart(undefined, false, isPlatformReady)

    const isInitialized = useMemo(() => {
        const isLoadingComplete =
            videoComplete &&
            assetLoadingStates.requiredImagesLoaded &&
            isPlatformReady

        if (isLoadingComplete && !hasInitializedRef.current) {
            hasInitializedRef.current = true
        }

        return hasInitializedRef.current || isLoadingComplete
    }, [
        videoComplete,
        assetLoadingStates.requiredImagesLoaded,
        isPlatformReady,
    ])

    const loadingComplete =
        isInitialized && assetLoadingStates.optionalImagesLoaded

    useEffect(() => {
        if (!completedInitialLoad && loadingComplete && videoComplete) {
            setCompletedInitialLoad(true)
        }
    }, [completedInitialLoad, loadingComplete, videoComplete])

    const initializationStages = useMemo(
        () => ({
            videoComplete,
            experimentsReady: true,
            platformReady: isPlatformReady,
            isInitialized,
            ...assetLoadingStates,
            qrCodeRendered: false,
            isWebCheckoutPlatform: false,
            isSubscribed: account?.isSubscribed ?? null,
        }),
        [
            videoComplete,
            isPlatformReady,
            isInitialized,
            assetLoadingStates,
            account?.isSubscribed,
        ]
    )

    useInitializationDatadogRUMEvents(initializationStages)

    const appContent = (
        <>
            {!loadingComplete &&
                !showFailedInitModal &&
                !completedInitialLoad && (
                    <Loading
                        videoUrl={getVideoIdent()}
                        videoComplete={videoComplete}
                        setVideoComplete={setVideoComplete}
                        logoDisplayMillis={LOGO_DISPLAY_MILLIS}
                    />
                )}

            <FailedInitializationModal
                isOpen={showFailedInitModal}
                onExit={handleExit}
                errorMessage={errorMessage}
            />

            <Suspense fallback={null}>
                {!showFailedInitModal && (
                    <TvHub
                        isInitialized={isInitialized}
                        optionalImagesLoaded={
                            assetLoadingStates.optionalImagesLoaded
                        }
                        setAssetLoadingStates={setAssetLoadingStates}
                        videoComplete={videoComplete}
                        platformReady={isPlatformReady}
                    />
                )}
            </Suspense>
        </>
    )

    return appContent
}

/**
 * Root app component that orchestrates providers (error boundary, lifecycle video)
 * and delegates initialization to AppBody.
 */
export function App(): JSX.Element {
    return (
        <ChunkLoadErrorBoundary>
            <AppLifecycleVideoProvider>
                <LazyMotion features={loadFeatures} strict>
                    <AppBody platformInitializationError={null} />
                </LazyMotion>
            </AppLifecycleVideoProvider>
        </ChunkLoadErrorBoundary>
    )
}
