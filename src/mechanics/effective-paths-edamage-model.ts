/**
 * Effective Paths — the eDamage composition.
 *
 * `eDamage!ES5`, the number the damage paths maximise:
 *
 * ```text
 * eDamage = Base × (Crit × BulletDmgMulti × SL + UWs × UWCrit) × Slow
 *           DI5     DN5    EA5              ED5   EO5   DO5      ER5
 * ```
 *
 * The shape matters. Bullet damage and ultimate weapon damage are **added**,
 * not multiplied — they are two separate sources — and only the bullet half
 * takes the Spotlight coverage bonus. Everything is then scaled by Slow, which
 * applies to the whole run.
 *
 * Credit for the original formulas belongs to the Effective Paths maintainers —
 * see `effective-paths-credits.ts`.
 */

import type { DamageRunType } from './effective-paths-damage-base'

export interface BulletDamageMultiplierInput {
  /** `DP5` — multishot. */
  multishot: number
  /** `DQ5` — bounce shot, with Astral Deliverance. */
  bounceShot: number
  /** `DT5` — bullets per second. */
  bulletsPerSecond: number
  /** `DS5` — rapid fire. */
  rapidFire: number
  /** `DW5` — range times damage per meter. */
  rangeDamagePerMeter: number
  /** `DX5` — the Super Tower card. */
  superTowerCard: number
  /** `DZ5` — the maximum rend armour multiplier. */
  maxRendArmour: number
}

/**
 * `eDamage!EA5` — everything that multiplies a bullet.
 *
 * Seven independent multipliers, so a mistake in any one of them is invisible
 * in the product. Each is checked on its own in the stat layer.
 */
export function bulletDamageMultiplier(input: BulletDamageMultiplierInput): number {
  return input.multishot
    * input.bounceShot
    * input.bulletsPerSecond
    * input.rapidFire
    * input.rangeDamagePerMeter
    * input.superTowerCard
    * input.maxRendArmour
}

/**
 * `eDamage!EP5` — Chrono Field's slow, as a damage multiplier.
 *
 * Slowed enemies spend longer in range, so the term is `1 / (1 − slow)` in the
 * same way the defensive reductions are. The slow is capped at 90% however
 * much is stacked, and the whole term is inert without the weapon.
 */
export function chronoFieldSlow(input: {
  /** Chrono Field owned and in play. */
  has: boolean
  /** The weapon's own slow, as a fraction. */
  baseSlow: number
  /** The combined Chrono Field substat. */
  substat: number
}): number {
  if (!input.has) return 1
  return 1 / (1 - Math.min(0.9, input.baseSlow + input.substat))
}

/**
 * `eDamage!EQ5` — the Chrono Field+ slow, which stacks on the first.
 *
 * A separate term rather than more of the same slow, so it is not subject to
 * the 90% cap the base slow is. Inert until the upgrade is unlocked.
 */
export function chronoFieldPlusSlow(input: {
  has: boolean
  /** The upgrade's slow, or null when it is still locked. */
  slow: number | null | undefined
}): number {
  if (!input.has || typeof input.slow !== 'number' || !Number.isFinite(input.slow)) return 1
  return 1 / (1 - input.slow)
}

/** `eDamage!ER5` — the two Chrono Field terms together. */
export function slowMultiplier(chronoField: number, chronoFieldPlus: number): number {
  return chronoField * chronoFieldPlus
}

export interface EffectiveDamageComposition {
  /** `DI5` — everything that scales all damage. */
  base: number
  /** `DN5` — the critical hit multiplier for bullets. */
  crit: number
  /** `EA5` — everything that multiplies a bullet. */
  bulletDamageMultiplier: number
  /** `ED5` — Spotlight's coverage bonus, on the bullet half only. */
  spotlight: number
  /** `EO5` — the ultimate weapons' contribution. */
  ultimateWeapons: number
  /** `DO5` — the critical multiplier ultimate weapons get, which differs. */
  ultimateWeaponCrit: number
  /** `ER5` — Chrono Field's slow. */
  slow: number
}

/**
 * `eDamage!ES5` — effective damage.
 *
 * Adding the two halves rather than multiplying them is the thing to preserve:
 * a player with no ultimate weapons still has bullet damage, and one running
 * Attack Dissonance has almost only ultimate weapons.
 */
export function composeEffectiveDamage(input: EffectiveDamageComposition): number {
  const bullets = input.crit * input.bulletDamageMultiplier * input.spotlight
  const ultimates = input.ultimateWeapons * input.ultimateWeaponCrit
  return input.base * (bullets + ultimates) * input.slow
}

/**
 * What the Run Type switches off, from every `$AX$19` comparison in the grid.
 *
 * Scanned rather than inferred: the sheet gates on it in four distinct ways,
 * and two of them are not where you would look. `perksApply` runs through
 * `AX20` — the Simulated Tier, which is `"Tourney"` when the run is and the
 * farming tier otherwise — and only then into `AY61`. And a UW Dissonance run
 * disables **both** Spotlight and Chrono Field, not just Spotlight.
 */
export function damageRunEffects(runType: DamageRunType): {
  /** Attack Dissonance stops the tower firing: `DI`, the crit and bullet columns. */
  towerFires: boolean
  /** No perks in a tournament — via `AX20` into `AY61`. */
  perksApply: boolean
  /** A UW Dissonance run turns off Spotlight (`BH33`) and Chrono Field (`BH36`). */
  ultimateWeaponUtilityApplies: boolean
  /** A Utility Dissonance run computes its own cash for Perfect Freeze (`DG`). */
  usesDissonanceCash: boolean
} {
  return {
    towerFires: runType !== 'Attack Disso',
    perksApply: runType !== 'Tourney',
    ultimateWeaponUtilityApplies: runType !== 'UW Disso',
    usesDissonanceCash: runType === 'Util Disso',
  }
}
