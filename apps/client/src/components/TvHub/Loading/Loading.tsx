import { useEffect, useState } from "react"

import { SHOULD_SKIP_VIDEO } from "../../../config/devOverrides"
import { LoadingScreen } from "../LoadingScreen"

interface LoadingProps {
    logoDisplayMillis: number
    videoUrl?: string
    videoComplete: boolean
    setVideoComplete: (videoComplete: boolean) => void
}

export const Loading: React.FC<LoadingProps> = ({
    logoDisplayMillis,
    videoUrl,
    videoComplete,
    setVideoComplete,
}) => {
    useEffect(() => {
        if (SHOULD_SKIP_VIDEO) {
            setVideoComplete(true)
        }
    }, [setVideoComplete])

    const [logoDisplayFinished, setLogoDisplayFinished] =
        useState<boolean>(false)

    const handleLogoAnimationComplete = (): void => {
        setLogoDisplayFinished(true)
    }

    return (
        <LoadingScreen
            showIdentVideo
            displayLogo={!logoDisplayFinished}
            videoUrl={videoUrl}
            videoComplete={videoComplete}
            setVideoComplete={setVideoComplete}
            onLogoAnimationComplete={handleLogoAnimationComplete}
            logoDisplayMillis={logoDisplayMillis}
        />
    )
}
