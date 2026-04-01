import { useCallback, useRef, useState } from "react"

import type { GameLauncher } from "./useGameLauncher"
import type { Game } from "./useGames"

interface UseWeekendRebrandModalProps {
    isInitialized: boolean
    activeGame: Game | null
    isInUpsell: boolean
    gameLauncher: GameLauncher
}

interface UseWeekendRebrandModalReturn {
    showWeekendRebrandModal: boolean
    showWeekendRebrandModalRef: React.RefObject<boolean>
    handleAcknowledge: () => void
    handleBackButtonInWeekendRebrandModal: () => void
}

/**
 * Weekend rebrand modal — currently disabled (experiment system removed).
 * TODO: Remove this hook and the WeekendRebrandModal component entirely
 * once confirmed no longer needed.
 */
export const useWeekendRebrandModal = ({
    isInitialized: _isInitialized,
    activeGame: _activeGame,
    isInUpsell: _isInUpsell,
    gameLauncher: _gameLauncher,
}: UseWeekendRebrandModalProps): UseWeekendRebrandModalReturn => {
    const [showWeekendRebrandModal] = useState(false)
    const showWeekendRebrandModalRef = useRef(showWeekendRebrandModal)

    const handleAcknowledge = useCallback(() => {
        // no-op: modal is currently disabled
    }, [])

    const handleBackButtonInWeekendRebrandModal = useCallback(() => {
        // no-op: modal is currently disabled
    }, [])

    return {
        showWeekendRebrandModal,
        showWeekendRebrandModalRef,
        handleAcknowledge,
        handleBackButtonInWeekendRebrandModal,
    }
}
