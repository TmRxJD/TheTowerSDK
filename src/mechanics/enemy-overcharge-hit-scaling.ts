/**
 * Overcharge tower hit scaling — `Enemy.OverchargeAttack` @ 0x27D90C4 (il2cpp dump).
 *
 * Each attack fires two closures (`b__0` outbound, `b__1` return) that share the same
 * multiplier before `overchargeNumAttacksInARow` increments at the end of the attack:
 *
 *   raw = enemyDamage × (overchargeNumAttacksInARow + 1) × …module DR…
 *
 * `enemyAttackCount` increments in the closures but is not read in this path.
 * Generic `Enemy$$Attack` applies `enemyDamage × pow(1.04, enemyAttackCount)` separately.
 */

/** Heat-up per hit for generic `Enemy$$Attack` (not Overcharge volley contacts). */
export const ENEMY_HEAT_UP_MULTIPLIER_PER_HIT = 1.04

/** 0-based volley index: hits 1–2 → 0, hits 3–4 → 1, … */
export function overchargeVolleyIndex(hitNumber: number): number {
  if (hitNumber < 1) return 0
  return Math.floor((hitNumber - 1) / 2)
}

/** Shared multiplier for both hits in a volley (`overchargeNumAttacksInARow + 1`). */
export function overchargeVolleyDamageMultiplier(hitNumber: number): number {
  return overchargeVolleyIndex(hitNumber) + 1
}

/** Compound heat-up through hit `hitNumber` (1-based). */
export function enemyHeatUpMultiplierThroughHit(hitNumber: number): number {
  if (hitNumber <= 1) return 1
  return ENEMY_HEAT_UP_MULTIPLIER_PER_HIT ** (hitNumber - 1)
}

export interface OverchargeRawHitDamageInput {
  hitNumber: number
  /** OC adjusted damage after wave/type/perk scaling (enemyDamage field). */
  baseAdjustedDmg: number
  /** Optional FAQ heat model (not used by OverchargeAttack il2cpp path). */
  includeHeatUp?: boolean
}

/** Pre-DR tower hit damage for Overcharge contact `hitNumber`. */
export function rawOverchargeHitDamageBeforeReduction(input: OverchargeRawHitDamageInput): number {
  const { hitNumber, baseAdjustedDmg, includeHeatUp = false } = input
  if (hitNumber < 1 || baseAdjustedDmg <= 0) return 0

  let mult = overchargeVolleyDamageMultiplier(hitNumber)
  if (includeHeatUp) {
    mult *= enemyHeatUpMultiplierThroughHit(hitNumber)
  }
  return baseAdjustedDmg * mult
}
