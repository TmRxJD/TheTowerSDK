/**
 * Effective Paths — the economy stats, `EPC_*`.
 *
 * Coins per kill and the things that multiply it. The tab's own family is
 * `EPC_*`, twenty-four of them — but it also calls two `EPU_*` functions for
 * Death Wave, so the layer is twenty-six. Nineteen are closed forms and are
 * ported here; the seven that read tables or simulate cooldown overlap are
 * named at the bottom with the reason.
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
import { assistSubstatCap, recoveryPackageTimeBoost } from './effective-paths-generics'

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
   * **Squared** — the sheet writes `(1 + 0.01 × level)^2`, where every other
   * enhancement in all three domains is applied once. It is applied nowhere
   * else on the tab: `CJ5` reads the level straight off the workshop block and
   * `CR5` is its only consumer, so the square is the whole of its effect.
   *
   * Why it is squared is not stated anywhere on the sheet. Reproduced rather
   * than explained.
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
 * Worth 4% a level, over the share of enemies an orb tags — `AZ26`, "Extra Orb
 * % enemies tagged", which the player estimates. The share is capped at 1
 * before it scales, so an estimate above 100% is treated as 100%.
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
 * Builds the package chance out of its four parts and hands it to
 * {@link recoveryPackageTimeBoost}, which the eDamage tab's `EC5` computes too
 * — same four lines, differently-shaped inputs.
 */
export function galaxyCompressorTimeBoost(input: GalaxyCompressorInput): number {
  const card = input.hasRecoveryCard ? input.cardValue : 0
  const substat = econSubstat(
    input.primarySubstat, input.assistSubstat, input.stoneCap, input.labCap,
  )
  const chance = input.workshopValue + 0.002 * input.labLevel + card + substat

  return recoveryPackageTimeBoost({
    chance,
    afterBoss: input.packageAfterBossLevel === 1,
    bossWaveInterval: input.bossWave,
    galaxyCompressorValue: input.galaxyCompressorValue,
    waveDurationSeconds: input.waveDurationSeconds,
  })
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
 * Zero without the weapon rather than its 300-second base, and the reason is
 * `EPC_MVN`: it averages the three cooldowns over `COUNTIF` of the *unlocked*
 * weapons. A locked weapon is missing from the divisor, so it has to be missing
 * from the sum too or the average comes out too high.
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
  /** `AZ20` — a player estimate, and the sheet notes it needs Golden Tower+. */
  killsPerSecond: number,
  goldenTowerDurationSeconds: number,
): number {
  if (!hasGoldenCombo) return 1
  return (1 + 0.0003 * (1 + stoneLevel)) ** (killsPerSecond * goldenTowerDurationSeconds)
}

/**
 * `EPC_BHCB` — Black Hole's coin bonus.
 *
 * `killShare` is `AZ19`, "% of Enemies that die in Black Hole" — a player
 * estimate, because the bonus only applies to what dies inside it.
 */
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

/** `EPC_BHCD` — Black Hole's cooldown. Zero when locked, for the same reason. */
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

/**
 * `EPU_DWCD` — Death Wave's cooldown. Zero when locked, as the other two.
 *
 * An `EPU_` rather than an `EPC_`: the econ tab borrows Death Wave's cooldown
 * and quantity from the shared ultimate weapon family instead of defining its
 * own, which is why enumerating `EPC_*` alone misses them.
 *
 * Named apart from `deathWaveCooldown` because the two take different inputs
 * for the same game stat. The damage side's takes the value the stone chart
 * already resolved; this derives it from the stone level with `300 - 10 × L`.
 * A test asserts the chart agrees with that line, since the moment it does not
 * the two halves of the port disagree about the same weapon.
 */
export function deathWaveCooldownFromStones(input: {
  hasDeathWave: boolean
  stoneLevel: number
  stoneCap: number
  labCap: number
  primarySubstat: number
  assistSubstat: number
}): number {
  if (!input.hasDeathWave) return 0
  return 300 - 10 * input.stoneLevel + econSubstat(
    input.primarySubstat, input.assistSubstat, input.stoneCap, input.labCap,
  )
}

/**
 * `EPU_DWQ` — how many Death Waves fire.
 *
 * The assist half of the substat is **floored on its own**, before the primary
 * is added — `prim_sub + FLOOR(ass_sub * SAC)`. Nothing else in either family
 * floors anything, and flooring the sum instead would be a different number
 * whenever the primary has a fractional part. Waves are whole things, so the
 * assist can only ever contribute a whole one.
 */
export function deathWaveQuantityFromStones(input: {
  stoneLevel: number
  hasPerk: boolean
  stoneCap: number
  labCap: number
  primarySubstat: number
  assistSubstat: number
}): number {
  const assist = Math.floor(
    input.assistSubstat * assistSubstatCap(true, input.stoneCap, input.labCap),
  )
  return 1 + input.stoneLevel + (input.hasPerk ? 1 : 0) + input.primarySubstat + assist
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
 * `EPC_SLA` — Spotlight's angle, with the enemy's own width already added.
 *
 * The four degrees are how wide an enemy is, so a spotlight lights a little
 * more than its stated arc. The damage side keeps the two apart —
 * `STAT_UW_SL_FINAL_ANGLE` returns the bare angle and `EP_UW_SL_COVERAGE` adds
 * the four — but the econ tab folds them together here and then computes
 * coverage inline as `MIN(1, angle × quantity / 360)`. Adding four again on top
 * of this would count an enemy's width twice.
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
 * The three weapon cooldowns averaged over how many are *unlocked* — the call
 * site passes `COUNTIF($BK$15:$BK$17, TRUE)` — plus the module's own value, and
 * then rounded to a whole second with **half going to even**. The sheet writes
 * that rounding out longhand rather than calling `ROUND`, which rounds half
 * away from zero.
 *
 * Zero without the module, and the primary is preferred over the assist when
 * both carry one.
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
 * The six functions this module does not port yet, and why.
 *
 * Recorded rather than left to be rediscovered: each needs something beyond
 * arithmetic, and guessing at any of them would produce a plausible number.
 */
export const ECONOMY_FUNCTIONS_PORTED = [
  'EPC_CPK', 'EPC_CARD_COINS', 'EPC_CARD_EOM', 'EPC_FUP', 'EPC_GCOMP',
  'EPC_GTB', 'EPC_GTD', 'EPC_GTCD', 'EPC_GTGC',
  'EPC_BHCB', 'EPC_BHD', 'EPC_BHCD',
  'EPC_DWCB', 'EPC_SLCB', 'EPC_SLA', 'EPC_SLQ', 'EPC_MVN',
  'EPU_DWCD', 'EPU_DWQ',
  'EPC_SYNC',
] as const

export const UNPORTED_ECONOMY_FUNCTIONS = [
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

// ---------------------------------------------------------------------------
// Synchronisation
// ---------------------------------------------------------------------------

/** One coin weapon's cycle, as `EPC_SYNC` reads it. */
export interface SyncWeaponCycle {
  active: boolean
  /** The multiplier while it is up. */
  multiplier: number
  /** How many seconds of the cycle it is up for. */
  duration: number
  /** The whole cycle, in seconds. */
  cooldown: number
}

const INACTIVE_CYCLE: SyncWeaponCycle = {
  active: false, multiplier: 1, duration: 0, cooldown: 1,
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/**
 * One weapon's cycle as a value per second: 1 while down, its multiplier while
 * up. The uptime sits at the end of the cycle, which is where the sheet's
 * `IF(r <= n - d, 1, m)` puts it.
 */
function cycleValues(cycle: SyncWeaponCycle): number[] {
  const length = Math.max(1, Math.floor(cycle.cooldown))
  const up = Math.floor(cycle.duration)
  return Array.from({ length }, (_, index) =>
    (index + 1 <= length - up ? 1 : cycle.multiplier))
}

/**
 * Average the cycle by phase.
 *
 * `WRAPCOLS(values, width)` fills column by column, so row `r` collects every
 * entry `width` apart — `r`, `r + width`, `r + 2 × width` — and `BYROW`
 * averages it. What comes back is what this weapon is worth at each phase of
 * the shortest cycle it shares with any other, which is the whole point: two
 * weapons on cooldowns of 200 and 300 line up every 100 seconds, not every
 * 600.
 */
function phaseAverages(values: number[], width: number): number[] {
  const size = Math.max(1, width)
  return Array.from({ length: size }, (_, phase) => {
    let total = 0
    let count = 0
    for (let index = phase; index < values.length; index += size) {
      total += values[index]
      count++
    }
    return count === 0 ? 1 : total / count
  })
}

/**
 * `EPC_SYNC` — what the coin weapons are worth once their cycles interleave.
 *
 * Four weapons on different cooldowns are rarely all up at once, and the sheet
 * does not approximate that: it lays out each one's cycle second by second,
 * folds each to its per-phase average, then averages the product across the
 * combined period. A weapon that is off contributes a flat 1.
 *
 * The width each cycle folds to is the largest common divisor it shares with
 * any *other* active weapon — how often the two can line up at all.
 */
export function syncMultiplier(weapons: {
  goldenTower?: SyncWeaponCycle
  blackHole?: SyncWeaponCycle
  deathWave?: SyncWeaponCycle
  goldBot?: SyncWeaponCycle
}): number {
  const cycles = [
    weapons.goldenTower ?? INACTIVE_CYCLE,
    weapons.blackHole ?? INACTIVE_CYCLE,
    weapons.deathWave ?? INACTIVE_CYCLE,
    weapons.goldBot ?? INACTIVE_CYCLE,
  ]

  const lengths = cycles.map(cycle =>
    (cycle.active ? Math.max(1, Math.floor(cycle.cooldown)) : 1))

  const blocks = cycles.map((cycle, index) => {
    if (!cycle.active) return [1]

    const others = cycles
      .map((other, position) => (other.active && position !== index ? lengths[position] : null))
      .filter((length): length is number => length !== null)
    const width = others.length
      ? Math.max(...others.map(length => gcd(lengths[index], length)), 1)
      : 1

    return phaseAverages(cycleValues(cycle), width)
  })

  const lcm = (a: number, b: number): number => (a * b) / gcd(a, b)
  const period = blocks.map(block => block.length).reduce(lcm, 1)

  let total = 0
  for (let step = 0; step < period; step++) {
    total += blocks.reduce((product, block) => product * block[step % block.length], 1)
  }
  return total / period
}
