import { useEffect, useState } from "react"

import { BASE_URL } from "../config/envconfig"

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
 * Placeholder games using assets already in public/assets/images/games/.
 * These will be replaced by Registry API + Bifrost prototype fetching.
 */
const PLACEHOLDER_GAMES: Game[] = [
    {
        id: "jeopardy",
        title: "Jeopardy",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/jeopardy.avif`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/jeopardy.avif`,
    },
    {
        id: "song-quiz",
        title: "Song Quiz",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/song-quiz.avif`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/song-quiz.avif`,
    },
    {
        id: "cocomelon",
        title: "CoComelon",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/ccm.avif`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/ccm.avif`,
    },
    {
        id: "wheel-of-fortune",
        title: "Wheel of Fortune",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/wof.avif`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/wof.avif`,
    },
    {
        id: "wits-end",
        title: "Wit's End",
        tileImageUrl: `${BASE_URL}assets/images/games/tiles/wits-end.webp`,
        heroImageUrl: `${BASE_URL}assets/images/games/heroes/wits-end-static.webp`,
    },
]

/**
 * Provides the ordered list of games for the carousel.
 * Currently returns placeholder games — will be wired to the Crucible Registry API.
 */
export const useGames = (): Game[] => {
    const [games, setGames] = useState<Game[]>([])

    useEffect(() => {
        // TODO: Fetch from Crucible Registry API + Bifrost prototypes
        setGames(PLACEHOLDER_GAMES)
    }, [])

    return games
}
