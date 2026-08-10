/**
 * Ultimate weapon hit damage — shared Enemy hit paths.
 *
 * Common pattern across `BlackHoleDamage`, `LightningDamage`, `DeathRayDamage`,
 * `DropLandMineDamage`, and similar:
 *
 *   moduleMult = GetModuleBonus(slot) + 1.0
 *   effective  = max(0, incomingDamage − enemyAbsorbPool)
 *
 * Absorb pool depletes first; negative remainder spills into Main damage accounting.
 *
 * ## Chain Lightning — `LightningDamage`
 *
 *   base = incoming × moduleMult
 *   if elite (type 7–8) and lab active:
 *     stackMult = labValue × hitCount² + 1
 *     base ×= stackMult
 *     hitCount += 1
 *
 * ## Black Hole / Death Ray absorb
 *
 *   pool -= damage; if pool < 0, credit overflow to Main totals and clamp pool.
 */

/** Ultimate benefit pattern: returned mult is `bonus + 1`. */
export function ultimateModuleMultiplier(moduleBonus: number): number {
  return moduleBonus + 1
}

export interface UltimateAbsorbInput {
  incomingDamage: number
  absorbPool: number
}

export interface UltimateAbsorbResult {
  damageApplied: number
  absorbPool: number
  overflow: number
}

export function applyUltimateAbsorbPool(input: UltimateAbsorbInput): UltimateAbsorbResult {
  const nextPool = input.absorbPool - input.incomingDamage
  if (nextPool >= 0) {
    return {
      damageApplied: input.incomingDamage,
      absorbPool: nextPool,
      overflow: 0,
    }
  }
  return {
    damageApplied: input.absorbPool,
    absorbPool: 0,
    overflow: -nextPool,
  }
}

export interface LightningStackInput {
  baseDamage: number
  moduleBonus: number
  labValue: number
  hitCount: number
  isEliteType: boolean
  labActive: boolean
}

export function lightningDamageWithStack(input: LightningStackInput): number {
  let dmg = input.baseDamage * ultimateModuleMultiplier(input.moduleBonus)
  if (input.isEliteType && input.labActive && input.hitCount >= 1) {
    const stackMult = input.labValue * input.hitCount * input.hitCount + 1
    dmg *= stackMult
  }
  return dmg
}

export function nextLightningHitCount(hitCount: number): number {
  return hitCount + 1
}

/** True when enemy.type − 7 ∈ [0, 1] (Ray / Scatter elites). */
export function isLightningEliteType(enemyType: number): boolean {
  const t = enemyType - 7
  return t >= 0 && t <= 1
}
