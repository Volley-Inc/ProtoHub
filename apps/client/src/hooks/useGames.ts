import { useEffect, useState } from "react"

/**
 * Game identifier. For now this is a plain string — Crucible game IDs
 * will come from the Registry API, not from a hard-coded enum.
 */
export type GameId = string

/**
 * An object representing a game, with various properties related to
 * the display and launch of the game.
 */
export interface Game {
    id: GameId
    title: string
    tileImageUrl: string
    /**
     * The URL of the game's hero image (shown fullscreen when hovering over the tile).
     */
    heroImageUrl: string
    /**
     * The URL of the game's video (shown fullscreen when hovering over the tile).
     */
    videoUrl?: string
    /**
     * The URL of the game's tile animation (shown when the tile is focused).
     */
    animationUri?: string
}

/**
 * Provides the ordered list of games for the carousel.
 * Currently returns an empty list — will be wired to the Crucible Registry API.
 */
export const useGames = (): Game[] => {
    const [games, setGames] = useState<Game[]>([])

    useEffect(() => {
        // TODO: Fetch from Crucible Registry API + Bifrost prototypes
        setGames([])
    }, [])

    return games
}
