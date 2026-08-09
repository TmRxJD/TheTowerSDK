/**
 * Game formulas.
 *
 * These model how the game behaves rather than reading stored values. Most are
 * **approximations** fitted to observed behaviour — close, but not exact,
 * especially at very high waves and tiers. Don't use them where you need to
 * match the game to the last digit.
 *
 * @example
 * import { computeWaveBaseHealth, abilityDamage } from 'thetowersdk/mechanics'
 *
 * const hp = computeWaveBaseHealth({ tier: 10, wave: 4200, tournament: false })
 */

// Enemy scaling by wave and tier
export * from './wave-base-scaling'
export * from './enemy-type-mults'
export * from './enemy-level-skip'
export * from './wave-info-enemy-constants'

// Battle conditions
export * from './battle-conditions'
export * from './battle-condition-config'
export * from './tournament-heat-bc'

// Tower and bots
export * from './tower-range'
export * from './bot-hit-multiplier'

// Damage and bonuses
export * from './damage'
export * from './bonuses'
