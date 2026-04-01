import type { JSX } from "react"

import type { ImagePreloadingResult } from "../../hooks/usePreloadImages"
import { Background } from "./Background"
import { Main } from "./MainMenu"

export function TvHub({
    setAssetLoadingStates,
    isInitialized,
    optionalImagesLoaded,
    videoComplete,
    platformReady,
}: {
    setAssetLoadingStates: (states: ImagePreloadingResult) => void
    isInitialized: boolean
    optionalImagesLoaded: boolean
    videoComplete: boolean
    platformReady: boolean
}): JSX.Element {
    return (
        <>
            <Background />
            <Main
                setAssetLoadingStates={setAssetLoadingStates}
                isInitialized={isInitialized}
            />
        </>
    )
}
