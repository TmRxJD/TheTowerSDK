/**
 * Effective Paths — the economy stats, `EPC_*`.
 *
 * Coins per kill and the things that multiply it. Seventeen of the sheet's
 * twenty-four `EPC_*` functions are closed forms and are ported here; the rest
 * read tables or simulate cooldown overlap and are listed at the bottom.
 *
 * One idiom repeats in nearly every one of them and is worth naming once. The
 * sheet writes
 *
 * ```text
 * SAC,     (1 + stone_sac + lab_sac) * 0.01
 * SUBSTAT, prim_sub + ass_sub * SAC
 * ```
 *
 * which is `EPG_ASSIST_SUB_CAP` spelled out inline: how much of the assist
 * module's substat counts, given the stone-bought and lab-bought halves. It is
 * the same quantity the eHP and eDamage models already take from
 * `assistSubstatCap`, so this module calls that rather than writing a third
 * copy of it — the econ tabs simply never gate on whether an assist module is
 * equipped, so they always pass `true`.
 */

import { combinedSubstat } from './effective-paths-damage-substats'
import { assistSubstatCap } from './effective-paths-generics'

/**
 * `prim + ass × SAC` — a substat pair with the assist half weighted.
 *
 * The econ tabs never ask whether an assist module is equipped, so the share is
 * always computed; an empty slot arrives as a zero substat instead.
 */
function econSubstat(
  primary: number,
  assist: number,
  stoneCap: number,
  labCap: number,
): number {
  return combinedSubstat({ primary, assist }, assistSubstatCap(true, stoneCap, labCap))
}

export interface CoinsPerKillInput {
  /** The Coins / Kill Bonus workshop value. */
  workshopValue: number
  /** The Coins / Kill Bonus lab; 2% a level. */
  labLevel: number
  stoneCap: number
  labCap: number
  primarySubstat: number
  assistSubstat: number
  /**
   * The Coin Bonus workshop enhancement.
   *
   * **Squared.** The sheet writes `(1 + 0.01 × level)^2`, and it is the only
   * enhancement in any of the three domains that is — coins earn it twice,
   * once per kill and once per wave.
   */
  enhancementLevel: number
  hasCoinPerk: boolean
  standardPerksBonusLabLevel: number
  /** The coin trade-off perk, worth 1.8× raised by Improve Trade-off Perks. */
  hasCoinTradeOffPerk: boolean
  improveTradeOffPerksLabLevel: number
  vaultPct: number
}

/**
 * `EPC_CPK` — coins per kill.
 *
 * The substat is added *inside* the enhancement, perk and vault multipliers but
 * outside the workshop-times-lab product, which is the sheet's grouping and not
 * the obvious one. Attack speed's `EPD_ASPD` has the same shape.
 */
export function coinsPerKill(input: CoinsPerKillInput): number {
  const lab = 1 + 0.02 * input.labLevel
  const substat = econSubstat(
    input.primarySubstat, input.assistSubstat, input.stoneCap, input.labCap,
  )
  const enhancement = (1 + 0.01 * input.enhancementLevel) ** 2
  const perk = input.hasCoinPerk
    ? (1 + 0.15 * 5) * (1 + 0.01 * input.standardPerksBonusLabLevel)
    : 1
  const tradeOff = input.hasCoinTradeOffPerk
    ? 1.8 * (1 + 0.01 * input.improveTradeOffPerksLabLevel)
    : 1

  return (input.workshopValue * lab + substat)
    * enhancement * perk * tradeOff * (1 + input.vaultPct)
}

/**
 * `EPC_CARD_COINS` — the Coins card, and its mastery.
 *
 * Returns 1 without the card, because it multiplies.
 */
export function coinsCard(
  hasCard: boolean,
  cardValue: number,
  hasMastery: boolean,
  masteryLevel: number,
): number {
  if (!hasCard) return 1
  return cardValue * (hasMastery ? 1 + 0.03 * (1 + masteryLevel) : 1)
}

/**
 * `EPC_CARD_EOM` — the Extra Orb mastery.
 *
 * Worth 4% a level, but only over the share of enemies an orb actually reaches,
 * which the player estimates. The share is capped at 1 before it scales.
 */
export function extraOrbMastery(
  hasExtraOrb: boolean,
  masteryLevel: number,
  hitShare: number,
): number {
  if (!hasExtraOrb) return 1
  return 1 + 0.04 * (1 + masteryLevel) * Math.min(1, hitShare)
}

export interface FreeUpgradeInput {
  /** The Free Upgrades workshop value for this category. */
  workshopValue: number
  hasFreeUpgradesCard: boolean
  cardValue: number
  hasPerk: boolean
  standardPerksBonusLabLevel: number
  stoneCap: number
  labCap: number
  primarySubstat: number
  assistSubstat: number
  /** The Free Upgrades workshop enhancement; a point a level. */
  enhancementLevel: number
  relicPct: number
  vaultPct: number
}

/**
 * `EPC_FUP` — the free upgrade chance for one category.
 *
 * Called three times, once for attack, defence and utility, and the three are
 * summed by the caller. The perk is a flat 25% — `5% × 5` — before the Standard
 * Perks Bonus lab raises it.
 */
export function freeUpgradeChance(input: FreeUpgradeInput): number {
  const card = input.hasFreeUpgradesCard ? input.cardValue : 0
  const perk = input.hasPerk
    ? 0.05 * 5 * (1 + 0.01 * input.standardPerksBonusLabLevel)
    : 0
  const substat = econSubstat(
    input.primarySubstat, input.assistSubstat, input.stoneCap, input.labCap,
  )

  return (input.workshopValue + card + perk + substat)
    * (1 + 0.01 * input.enhancementLevel)
    * (1 + input.relicPct)
    * (1 + input.vaultPct)
}

export interface GalaxyCompressorInput {
  /** The Recovery Package Chance workshop value. */
  workshopValue: number
  /** The Recovery Package Chance lab, worth 0.2% a level. */
  labLevel: number
  hasRecoveryCard: boolean
  cardValue: number
  stoneCap: number
  labCap: number
  primarySubstat: number
  assistSubstat: number
  /** The Package After Boss workshop level — 1 means the boss variant applies. */
  packageAfterBossLevel: number
  bossWave: number
  /** The Galaxy Compressor's time saving. Zero without the module. */
  galaxyCompressorValue: number
  waveDurationSeconds: number
}

/**
 * `EPC_GCOMP` — what recovery packages do to the length of a wave.
 *
 * Shorter waves mean every cooldown fires more often, so this multiplies into
 * the weapons rather than into coins. The eDamage side has the same term under
 * its own name.
 */
export function galaxyCompressorTimeBoost(input: GalaxyCompressorInput): number {
  const card = input.hasRecoveryCard ? input.cardValue : 0
  const substat = econSubstat(
    input.primarySubstat, input.assistSubstat, input.stoneCap, input.labCap,
  )
  const chance = input.workshopValue + 0.002 * input.labLevel + card + substat

  const perWave = input.packageAfterBossLevel === 1
    ? (chance * (input.bossWave - 1) + 1) / input.bossWave
    : chance

  const gain = -(input.galaxyCompressorValue === 0 ? 0 : input.galaxyCompressorValue * perWave)
  return 1 - gain / (input.waveDurationSeconds + gain)
}

// ---------------------------------------------------------------------------
// The coin weapons
// ---------------------------------------------------------------------------

/** `EPC_GTB` — Golden Tower's bonus. The perk multiplies before the substat. */
export function goldenTowerBonus(input: {
  stoneLevel: number
  labLevel: number
  hasPerk: boolean
  stoneCap: number
  labCap: number
  primarySubstat: number
  assistSubstat: number
}): number {
  const base = 5 + 0.8 * input.stoneLevel + 0.15 * input.labLevel
  const substat = econSubstat(
    input.primarySubstat, input.assistSubstat, input.stoneCap, input.labCap,
  )
  return base * (input.hasPerk ? 1.5 : 1) + substat
}

/** `EPC_GTD` — Golden Tower's duration, in seconds. */
export function goldenTowerDuration(input: {
  stoneLevel: number
  labLevel: number
  stoneCap: number
  labCap: number
  primarySubstat: number
  assistSubstat: number
}): number {
  return 15 + input.stoneLevel + input.labLevel + econSubstat(
    input.primarySubstat, input.assistSubstat, input.stoneCap, input.labCap,
  )
}

/**
 * `EPC_GTCD` — Golden Tower's cooldown.
 *
 * Zero without the weapon, not the 300-second base: the caller divides by it,
 * and a locked weapon has no cycle at all.
 */
export function goldenTowerCooldown(input: {
  hasGoldenTower: boolean
  stoneLevel: number
  stoneCap: number
  labCap: number
  primarySubstat: number
  assistSubstat: number
}): number {
  if (!input.hasGoldenTower) return 0
  return 300 - 10 * input.stoneLevel + econSubstat(
    input.primarySubstat, input.assistSubstat, input.stoneCap, input.labCap,
  )
}

/**
 * `EPC_GTGC` — the Golden Combo.
 *
 * Compounds per kill for the whole of Golden Tower's duration, which is why it
 * is an exponent rather than a multiplier: `(1 + 0.03% × (1 + level))` raised to
 * kills-per-second times duration.
 */
export function goldenCombo(
  hasGoldenCombo: boolean,
  stoneLevel: number,
  killsPerSecond: number,
  goldenTowerDurationSeconds: number,
): number {
  if (!hasGoldenCombo) return 1
  return (1 + 0.0003 * (1 + stoneLevel)) ** (killsPerSecond * goldenTowerDurationSeconds)
}

/** `EPC_BHCB` — Black Hole's coin bonus, over the share of kills it takes. */
export function blackHoleCoinBonus(labLevel: number, killShare: number): number {
  return ((1 + 0.5 * labLevel) - 1) * killShare + 1
}

/** `EPC_BHD` — Black Hole's duration. The perk is a flat twelve seconds. */
export function blackHoleDuration(input: {
  stoneLevel: number
  hasPerk: boolean
  stoneCap: number
  labCap: number
  primarySubstat: number
  assistSubstat: number
}): number {
  return 15 + input.stoneLevel + (input.hasPerk ? 12 : 0) + econSubstat(
    input.primarySubstat, input.assistSubstat, input.stoneCap, input.labCap,
  )
}

/** `EPC_BHCD` — Black Hole's cooldown, or zero when it is not unlocked. */
export function blackHoleCooldown(input: {
  hasBlackHole: boolean
  stoneLevel: number
  stoneCap: number
  labCap: number
  primarySubstat: number
  assistSubstat: number
}): number {
  if (!input.hasBlackHole) return 0
  return 200 - 10 * input.stoneLevel + econSubstat(
    input.primarySubstat, input.assistSubstat, input.stoneCap, input.labCap,
  )
}

/** `EPC_DWCB` — Death Wave's coin bonus. */
export function deathWaveCoinBonus(labLevel: number): number {
  return 1.5 + 0.05 * labLevel
}

/** `EPC_SLCB` — Spotlight's coin bonus. */
export function spotlightCoinBonus(labLevel: number): number {
  return 1 + 0.1 * labLevel
}

/**
 * `EPC_SLA` — Spotlight's angle, with the enemy's own width added.
 *
 * The four degrees are how wide an enemy is, so a spotlight covers a little
 * more than its stated arc. `EP_UW_SL_COVERAGE` adds the same four.
 */
export function spotlightCoverageAngle(input: {
  stoneLevel: number
  stoneCap: number
  labCap: number
  primarySubstat: number
  assistSubstat: number
}): number {
  const ENEMY_MIN_SIZE = 4
  return 30 + input.stoneLevel + econSubstat(
    input.primarySubstat, input.assistSubstat, input.stoneCap, input.labCap,
  ) + ENEMY_MIN_SIZE
}

/** `EPC_SLQ` — how many spotlights are on the field. */
export function spotlightQuantity(stoneLevel: number): number {
  return 1 + stoneLevel
}

/**
 * `EPC_MVN` — the Max Value Nuke cooldown.
 *
 * The average of the three weapon cooldowns plus the module's own, rounded to
 * the nearest whole second — and **half rounds to even**, which the sheet
 * writes out longhand rather than using `ROUND`. Zero without the module.
 */
export function maxValueNukeCooldown(input: {
  primaryModuleValue: number
  assistModuleValue: number
  goldenTowerCooldown: number
  blackHoleCooldown: number
  deathWaveCooldown: number
  ultimateWeaponCount: number
}): number {
  if (input.primaryModuleValue + input.assistModuleValue === 0) return 0

  const average = (input.goldenTowerCooldown + input.blackHoleCooldown + input.deathWaveCooldown)
    / input.ultimateWeaponCount
    + (input.primaryModuleValue !== 0 ? input.primaryModuleValue : input.assistModuleValue)

  const floor = Math.floor(average)
  if (average - floor === 0.5) return floor % 2 === 0 ? floor : Math.ceil(average)
  // `ROUND` is half-away-from-zero, which is not `Math.round` for negatives —
  // a cooldown is never negative, so the difference cannot arise here.
  return Math.round(average)
}

/**
 * The seven `EPC_*` functions this module does not port yet, and why.
 *
 * Recorded rather than left to be rediscovered: each needs something beyond
 * arithmetic, and guessing at any of them would produce a plausible number.
 */
export const UNPORTED_ECONOMY_FUNCTIONS = [
  {
    name: 'EPC_SYNC',
    reason: 'simulates every second of each weapon’s cooldown cycle with array '
      + 'formulas to find how often their windows overlap',
  },
  {
    name: 'EPC_SYNC_OLD',
    reason: 'the previous version of the same, kept on the sheet and unused',
  },
  {
    name: 'EPC_CARD_WS',
    reason: 'looks a wave-skip count up in the EP_HELPER table, which is data '
      + 'rather than a formula',
  },
  { name: 'EPC_WSM', reason: 'sums EPC_CARD_WS over every skip' },
  { name: 'EPC_WS_FUP', reason: 'the same sum, for free upgrades' },
  {
    name: 'EPC_LAB_DISCOUNT',
    reason: 'totals the cost of every lab in a chosen category from '
      + 'DVT_Laboratory_Unlock',
  },
  {
    name: 'EPC_MOD_DISCOUNT',
    reason: 'totals module upgrade costs from Data_Val_Tables by reading the '
      + 'player’s equipped modules',
  },
] as const
