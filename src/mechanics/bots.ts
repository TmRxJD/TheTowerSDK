/**
 * Bot effective range.
 *
 * ## Pipeline
 *
 *   t = clamp((maxDistance − 3) / (12 − 3), 0, 1)    // 30 m → 120 m internal
 *   towerFactor = t × 0.6 + 0.7                         // 0.7 at 30 m, 1.3 at 120 m
 *
 *   botRangeBenefit = bot benefit at (botIndex, botLevel)
 *   effectiveRadius = (botRangeBenefit / 10) × towerFactor
 *
 * Then × relic/tech-tree bot range (tech tree stat 13) and Singularity Harness
 * bonus for Flame bot (type 0).
 *
 * ## GetBotBenefit
 *
 *   benefit = baseBenefit[index] + benefitPerLevel[index] × level
 *   // certain indices also pull lab researchBaseBenefit / researchBenefitIncrease [8–15]
 *
 * ## Stun bot duration (size-dependent — not derivable from bot level alone)
 *
 * Uses enemy **display fill fraction** vs tiers 0.25, 0.5, 0.75:
 *
 * | Size fraction | Effect |
 * |---------------|--------|
 * | ≤ 0.25        | Short stun branch (2.5 s base constant) |
 * | 0.25 – 0.5    | Medium tier |
 * | 0.5 – 0.75    | Large tier — increments stun debt counters |
 * | > 0.75        | Boss-like path |
 *
 * Large enemies lerp stun duration toward 15 s cap:
 *
 *   if (stunDuration − reference) < 2.5: use base stun
 *   else: stunDuration = lerp(reference, 15.0, sizeFactor)
 *
 * ## Flame bot damage reduction
 *
 * UI table: 20% + 3% × level. Stored on enemy.flameBotDamageReduction during overlap.
 * Feeds into `CalculateDamageReductionResult` (see damage-reduction.ts).
 *
 * ## Thunder bot linger
 *
 * Parallel to swamp +10 s refresh: thunder uses enemy.lingerTime with lab 107
 * (`thunder_bot_linger_time`) through getLabResearchMult.
 *
 * ## Burn stack (lab 106)
 *
 * Same fractional stack family as poison: stack += 1 / tickInterval (not +1 per hit).
 */

import {
  BOT_RANGE_MAX_INTERNAL,
  BOT_RANGE_MIN_INTERNAL,
  BOT_TOWER_FACTOR_BASE,
  BOT_TOWER_FACTOR_WEIGHT,
  STUN_BASE_SECONDS,
  STUN_BOT_SIZE_TIER_LARGE,
  STUN_BOT_SIZE_TIER_MEDIUM,
  STUN_BOT_SIZE_TIER_SMALL,
  STUN_LARGE_ENEMY_CAP_SECONDS,
} from './constants'
import { clamp, inverseLerp, lerp } from './math'

export function botTowerFactor(maxDistance: number): number {
  const t = inverseLerp(maxDistance, BOT_RANGE_MIN_INTERNAL, BOT_RANGE_MAX_INTERNAL)
  return t * BOT_TOWER_FACTOR_WEIGHT + BOT_TOWER_FACTOR_BASE
}

export function botEffectiveRadius(
  botRangeBenefit: number,
  maxDistance: number,
  relicBotRangeMult = 1,
): number {
  return (botRangeBenefit / 10) * botTowerFactor(maxDistance) * relicBotRangeMult
}

export function getBotBenefit(
  baseBenefit: number,
  benefitPerLevel: number,
  level: number,
): number {
  return baseBenefit + benefitPerLevel * level
}

/** Flame bot UI damage reduction percent → multiplier on damage taken. */
export function flameBotDamageReductionMultiplier(botLevel: number): number {
  const percent = 20 + 3 * botLevel
  return 1 - percent / 100
}

export interface FlameBotReductionInput {
  inFlameRange?: boolean
  eliteFlamePath?: boolean
  damageMultiplier: number
  powExponent?: number
}

/**
 * Flame bot damage reduction while an enemy is in range.
 */
export function getFlameBotDamageReduction(input: FlameBotReductionInput): number {
  if (!input.inFlameRange && !input.eliteFlamePath) return 0
  if (input.eliteFlamePath) {
    const base = 1 - input.damageMultiplier
    const exp = input.powExponent ?? 1
    return 1 - Math.pow(base, exp)
  }
  return input.damageMultiplier
}

export interface ThunderBotLingerInput {
  lingerActive?: boolean
  lingerBase: number
  lingerMult?: number
}

/** Thunder bot linger duration with optional active multiplier. */
export function getThunderBotLinger(input: ThunderBotLingerInput): number {
  if (input.lingerActive && input.lingerMult != null) {
    return input.lingerBase * input.lingerMult
  }
  return input.lingerBase
}

export type StunBotSizeTier = 'small' | 'medium' | 'large' | 'boss'

export function stunBotSizeTier(enemyDisplayFillFraction: number): StunBotSizeTier {
  if (enemyDisplayFillFraction <= STUN_BOT_SIZE_TIER_SMALL) return 'small'
  if (enemyDisplayFillFraction <= STUN_BOT_SIZE_TIER_MEDIUM) return 'medium'
  if (enemyDisplayFillFraction <= STUN_BOT_SIZE_TIER_LARGE) return 'large'
  return 'boss'
}

export function stunBotDuration(
  baseStunDuration: number,
  referenceDuration: number,
  sizeFactor: number,
): number {
  if (baseStunDuration - referenceDuration < STUN_BASE_SECONDS) {
    return baseStunDuration
  }
  return lerp(referenceDuration, STUN_LARGE_ENEMY_CAP_SECONDS, clamp(sizeFactor, 0, 1))
}

/** Tracker bug reference: game uses botTowerFactor, not towerRange/60. */
export const TRACKER_BOT_RANGE_BUG = {
  game: 'inverseLerp(maxDistance, 3, 12) × 0.6 + 0.7',
  tracker: 'towerRange / 60',
} as const
