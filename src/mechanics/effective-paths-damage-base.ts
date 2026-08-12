/**
 * Effective Paths — the `Base` half of the eDamage composition.
 *
 * `eDamage!DI5` is one of the two things the whole composition multiplies:
 *
 * ```text
 * Base = DMG × PerkDMG × TODMG × Shock × CardDMMastery × CannonAssist
 *        × Acp × PF × AmpStrike
 * ```
 *
 * …except when the run is Attack Dissonance, where all of that collapses to
 * `Acp × AmpStrike` — the tower stops shooting, so only the shockwave and Amp
 * Strike still land.
 *
 * The Perfect Freeze term is the subtle one; see {@link perfectFreeze}.
 *
 * Credit for the original formulas belongs to the Effective Paths maintainers —
 * see `effective-paths-credits.ts`.
 */

import { standardPerksBonusScale } from './effective-paths-generics'

/** The run being simulated — `eDamage!$AX$19`. */
export type DamageRunType = 'Regular' | 'Tourney' | 'Attack Disso' | 'UW Disso' | 'Util Disso'

/**
 * `eDamage!CZ5` — tower damage before the perks and multipliers on top.
 *
 * The base arrives already divided by Perfect Freeze, and {@link damageBase}
 * multiplies it back in. That is not a redundancy: the observed damage figure
 * the sheet starts from already has the player's current Perfect Freeze baked
 * in, so it is divided out here and the *modelled* one re-applied — which lets
 * Starting Cash move it as the path buys levels.
 */
export function towerDamage(input: {
  /** Observed tower damage, with the current Perfect Freeze divided out. */
  baseDamage: number
  /** Damage lab level; 2% a level. */
  labLevel: number
  /** Workshop enhancement multiplier, already resolved. */
  enhancementMultiplier: number
  hasDamageCard: boolean
  /** The Damage card's value at its level. */
  cardValue: number
  hasCardMastery: boolean
  /** Damage card mastery level; 40% a level over the card's own value. */
  masteryLevel: number
  /** The Attack dissonance boost. */
  dissonance: number
}): number {
  const lab = 1 + 0.02 * input.labLevel
  const card = input.hasDamageCard
    ? input.cardValue * (input.hasCardMastery ? 1 + 0.4 * (1 + input.masteryLevel) : 1)
    : 1

  return input.baseDamage * lab * input.enhancementMultiplier * card * input.dissonance
}

/** `eDamage!DB5` — the Improve Trade-off Perks lab on the damage trade-off. */
export function tradeOffDamagePerk(hasPerk: boolean, labLevel: number): number {
  return hasPerk ? 1.5 * (1 + 0.01 * labLevel) : 1
}

/**
 * `eDamage!DC5` — the Shock multiplier.
 *
 * Chain Lightning's Shock amplifies everything the shocked enemy takes. Death
 * Chain doubles the amplification and scales it by the module substat, so the
 * substat enters twice when it is present.
 */
export function shockMultiplier(input: {
  /** Chain Lightning owned, and Shock unlocked. */
  hasShock: boolean
  /** Shock Multiplier lab level; 4 points a level over a 10% base. */
  labLevel: number
  /** The combined Death Chain substat; zero when the module does not have it. */
  deathChainSubstat: number
}): number {
  if (!input.hasShock) return 1
  const amplification = 0.1 + 0.04 * input.labLevel
  const deathChain = input.deathChainSubstat > 0 ? 2 * input.deathChainSubstat : 1
  return 1 + amplification * deathChain
}

/** `eDamage!DD5` — the Demon Mode card mastery, worth half again a level. */
export function demonModeMastery(hasMastery: boolean, masteryLevel: number): number {
  return hasMastery ? 1 + 0.5 * (1 + masteryLevel) : 1
}

/**
 * `eDamage!DG5` — Perfect Freeze.
 *
 * Worth a share of the base-ten logarithm of your cash, so it grows with
 * Starting Cash rather than with a level. A Utility Dissonance run replaces the
 * observed cash with `80 + 5 × level`, because the run's own cash is what the
 * path is buying.
 *
 * With no Perfect Freeze substat the term is 1 — `log10` is never taken of a
 * cash figure that would not be used.
 */
export function perfectFreeze(input: {
  /** The combined Perfect Freeze substat. */
  substat: number
  /** Observed cash, or the Utility Dissonance level when that is the run. */
  cash: number
}): number {
  if (input.substat === 0) return 1
  return 1 + input.substat * Math.log10(input.cash)
}

/** `eDamage!DG5`'s cash, which a Utility Dissonance run computes instead. */
export function perfectFreezeCash(
  runType: DamageRunType,
  startingCashLevel: number,
  observedCash: number,
): number {
  return runType === 'Util Disso' ? 80 + 5 * startingCashLevel : observedCash
}

/**
 * `eDamage!DH5` — Amp Strike.
 *
 * Worth up to five times damage, ramping with how much of the enemy's health
 * the strike is set against. The share is capped at 1 before the multiplier, so
 * the term never passes 5.
 */
export function ampStrike(input: {
  /** The player's estimate of how often Amp Strike lands. */
  share: number
  /** The combined Amp Strike substat. */
  substat: number
  /** The constant the sheet divides by — `eDamage!$CX$7`. */
  divisor: number
}): number {
  if (input.divisor === 0) return 1
  return 1 + 4 * Math.min(1, input.share * input.substat / input.divisor)
}

export interface DamageBaseInput {
  runType: DamageRunType
  /** `CZ5`. */
  towerDamage: number
  /** `DA5` — the standard damage perk. */
  damagePerk: number
  /** `DB5` — the trade-off damage perk. */
  tradeOffPerk: number
  /** `DC5`. */
  shock: number
  /** `DD5`. */
  demonModeMastery: number
  /** `DE5` — the Cannon module pair. */
  cannonAssist: number
  /** `DF5` — the shockwave, which the sheet calls Acp. */
  shockwave: number
  /** `DG5`. */
  perfectFreeze: number
  /** `DH5`. */
  ampStrike: number
}

/**
 * `eDamage!DI5` — the `Base` factor.
 *
 * An Attack Dissonance run keeps only the shockwave and Amp Strike: the tower
 * itself does not fire, so nothing that multiplies bullet damage applies.
 */
export function damageBase(input: DamageBaseInput): number {
  if (input.runType === 'Attack Disso') return input.shockwave * input.ampStrike

  return input.towerDamage
    * input.damagePerk
    * input.tradeOffPerk
    * input.shock
    * input.demonModeMastery
    * input.cannonAssist
    * input.shockwave
    * input.perfectFreeze
    * input.ampStrike
}

/** `eDamage!DA5` — `EPD_SPB` under the sheet's own name for it. */
export function standardDamagePerk(
  hasPerk: boolean,
  standardPerksBonusLabLevel: number,
  quantity: number,
): number {
  return hasPerk
    ? (1 + 0.15 * quantity) * standardPerksBonusScale(standardPerksBonusLabLevel)
    : 1
}
