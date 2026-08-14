/**
 * Effective Paths — the settings a save can answer for.
 *
 * The paths read almost everything from the trackers, which the save import
 * already fills. What it does not fill is the handful of inputs the Effective
 * Paths page asks the player for directly: how far they have got, and how fast
 * the game is running.
 *
 * Those are not tracker progress and have no tracker to live in, so they are
 * read here and applied as their own import step.
 *
 * ## What is deliberately absent
 *
 * Steps, enemies attacking together and chain-lightning share are *estimates*.
 * The sheet asks a player to judge them about their own run; the save has no
 * equivalent field, and inventing one would put a confident number in front of
 * someone who would reasonably assume it came from their game. They are left
 * for the player to set.
 */

import { coerceSaveNumber, toNumberArray } from './read-values'

export interface EffectivePathsSaveSettings {
  /** The furthest tier with any progress, not the tier last played. */
  highestTier: number | null
  /** The best wave reached on that tier. */
  highestWave: number | null
  /** The game speed the player is running, which scales every lab timing. */
  gameSpeed: number | null
}

/**
 * Read what the save knows about the player's reach.
 *
 * `currentTier` is deliberately not used for `highestTier`: it is the tier they
 * happen to be sitting on, which is often lower than the furthest they have
 * cleared, and the paths rank against the furthest. So the tiers are scanned
 * for the last one with a wave recorded.
 */
export function readEffectivePathsSettingsFromSaveRoot(
  root: Record<string, unknown>,
): EffectivePathsSaveSettings {
  const waves = toNumberArray(root.highestWaveThisTier)

  let highestTier: number | null = null
  for (let index = 0; index < waves.length; index += 1) {
    if ((waves[index] ?? 0) > 0) highestTier = index + 1
  }

  const highestWave = highestTier !== null
    ? Math.max(0, Math.floor(waves[highestTier - 1] ?? 0))
    : null

  const gameSpeed = coerceSaveNumber(root.gameSpeedMemory)

  return {
    highestTier,
    highestWave,
    gameSpeed: gameSpeed !== null && gameSpeed > 0 ? gameSpeed : null,
  }
}

/** Whether there is anything worth importing, so the page can offer it or not. */
export function canImportEffectivePathsSettings(
  settings: EffectivePathsSaveSettings,
): boolean {
  return settings.highestTier !== null
    || settings.highestWave !== null
    || settings.gameSpeed !== null
}
