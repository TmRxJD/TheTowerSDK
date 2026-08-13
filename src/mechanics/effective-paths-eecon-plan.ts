/**
 * Effective Paths — planning an eEcon path.
 *
 * Three paths across three currencies. The time and coin paths rank the same
 * 23 candidates priced two ways; the stone path ranks ultimate weapon upgrades;
 * the discount path is not comparable to either, because it maximises coins
 * saved rather than coins earned.
 *
 * As on the other two domains, every candidate is scored by what a level does
 * to the *whole* model rather than to its own stat — Golden Tower's duration
 * pays through the synchronisation term, not just through its own row.
 */

import { EFFECTIVE_ECONOMY_CANDIDATES } from './effective-paths-eecon-candidates'
import {
  ECONOMY_DISCOUNT_LEVEL_KEYS,
  ECONOMY_STONE_LEVEL_REFS,
  ECONOMY_TIME_LEVEL_KEYS,
} from './effective-paths-eecon-levels'
import type { EffectiveEconomyLevels } from './effective-paths-eecon-levels'
import { computeEffectiveEconomy } from './effective-paths-eecon-compute'
import type { EffectiveEconomyConfig } from './effective-paths-eecon-compute'
import {
  assistEfficiencyStoneCost,
  maxStoneLevel,
} from './effective-paths-assist-efficiency'
import {
  ultimateWeaponMaxLevel,
  ultimateWeaponStoneCost,
} from './effective-paths-edamage-costs'
import {
  MODULE_COIN_PATH_MAX_LEVEL,
  MODULE_COIN_PATH_MIN_LEVEL,
  moduleUpgradeCoinCost,
} from './effective-paths-coin-costs'
import {
  enhancementCoinCost,
  enhancementMaxLevel,
} from './effective-paths-enhancement-costs'
import type { WorkshopEnhancementDiscounts } from './effective-paths-enhancement-costs'
import {
  labCoinCostToReachLevel,
  labDurationDaysToReachLevel,
  labMaxCatalogLevel,
} from './effective-paths-lab-costs'
import type { LabCostModifiers } from './effective-paths-lab-costs'
import {
  appendSkipExclusions,
  assertPathVariant,
  type PathExclusion,
  type PathSkip,
  planPath,
} from './effective-paths-planner'
import type { PathStep, PathUpgrade } from './effective-paths-planner'

/** The paths the econ tabs publish. The time tab is priced two ways. */
export type EffectiveEconomyPlanVariant = 'time' | 'coin' | 'stone' | 'discount'

/**
 * Every variant this planner recognises, including the one it refuses.
 *
 * `discount` is in the list deliberately: it is a real path, planned by
 * {@link planEffectiveEconomyDiscountPath}, and it earns the message that says
 * so rather than being lumped in with a typo.
 */
export const ECONOMY_PLAN_VARIANTS: readonly EffectiveEconomyPlanVariant[] = [
  'time', 'coin', 'stone', 'discount',
]

/**
 * Why the discount path is planned elsewhere.
 *
 * The other three rank a candidate by what a level does to `effectiveEconomy`.
 * The discount tab does not: nothing on it moves coins per kill, so scoring it
 * that way gives every candidate a gain of exactly zero and a rank decided by
 * the tie-break. It has its own model and its own planner —
 * `planEffectiveEconomyDiscountPath` in `effective-paths-eecon-discount.ts`,
 * which ranks coins saved and takes the account totals that model needs.
 *
 * This one refuses rather than silently returning that table of zeroes.
 */
export const DISCOUNT_PATH_UNSUPPORTED
  = 'the discount path ranks coins saved rather than coins earned — call '
    + 'planEffectiveEconomyDiscountPath instead'

/** The two workshop enhancements the time path buys rather than labs. */
const ENHANCEMENT_STATS: Readonly<Record<string, string>> = {
  'Coin Bonus': 'Coin Bonus',
  'Free Upgrades': 'Free Upgrades',
}

/** The two module levels it buys. */
const MODULE_CANDIDATES = new Set(['Primary Module - Generator', 'Assist Module - Generator'])

/**
 * The four time-path candidates that cost coins rather than research time.
 *
 * `eEcon!EO2`, `EP2`, `EQ2` and `ER2` — the hide rows for these four and no
 * others — each carry `NOT(O$3<>"DO")`, so all four leave the path when the
 * tab is counting days only. They are the only candidates in the list with no
 * research duration at all, which is why they are the only ones that clause
 * names: on a days-only ranking a purchase that takes no research time is free,
 * and free wins every step forever.
 */
const COIN_PRICED_TIME_CANDIDATES: ReadonlySet<string> = new Set([
  ...Object.keys(ENHANCEMENT_STATS),
  ...MODULE_CANDIDATES,
])

/**
 * `eEcon!E6`'s divisor, beside the coins-per-hour rate.
 *
 * Not hours in a day — the sheet prices a day of farming at 23 hours of it, and
 * the literal is `CpH * 23`. Kept as the sheet's number rather than 24, because
 * agreeing with it matters more than the rounding being explicable.
 */
const FARM_HOURS_PER_DAY = 23

/**
 * The rate the sheet ships, from `IDS_PS_PLAYERDATA("Coin / Hour")`.
 *
 * It is a real default rather than a placeholder — the tab renders a warning
 * beside it telling the player to replace it with their own figure — so a
 * caller that supplies nothing gets the same path the sheet would show.
 */
export const SHEET_DEFAULT_COINS_PER_HOUR = 100_000

/** Which ultimate weapon stat each stone candidate buys. */
const STONE_WEAPON_STATS: Readonly<Record<string, { weapon: string, stat: string }>> = {
  'GT Bonus': { weapon: 'Golden Tower', stat: 'Multiplier' },
  'GT Duration': { weapon: 'Golden Tower', stat: 'Duration' },
  'GT Cooldown': { weapon: 'Golden Tower', stat: 'Cooldown' },
  'GT Golden Combo': { weapon: 'Golden Tower', stat: 'Golden Combo' },
  'BH Duration': { weapon: 'Black Hole', stat: 'Duration' },
  'BH Cooldown': { weapon: 'Black Hole', stat: 'Cooldown' },
  'DW Quantity': { weapon: 'Death Wave', stat: 'Quantity' },
  'DW Cooldown': { weapon: 'Death Wave', stat: 'Cooldown' },
  'SL Angle': { weapon: 'Spotlight', stat: 'Angle' },
  'SL Quantity': { weapon: 'Spotlight', stat: 'Quantity' },
}

/**
 * Candidates the sheet hides when the weapon behind them is not owned.
 *
 * Read off `eEcon!DV2:DZ2`, the time band's hide row: the Golden Tower
 * candidates open with `NOT(BK15)`, and `BK15` is `IDS_UW_OWN("Golden Tower")`.
 *
 * Without this the planner does not *mis-price* them — a locked weapon
 * contributes nothing, so their gain is zero — but a zero-gain candidate still
 * fills the path in tie-break order, which is how an account owning no ultimate
 * weapons was being told to buy Golden Tower Bonus twenty-five times. Excluding
 * them leaves an empty path, which is the honest answer.
 */
const WEAPON_GATED_CANDIDATES: Readonly<Record<string, keyof EffectiveEconomyConfig['weapons']>> = {
  'Golden Tower Bonus': 'goldenTower',
  'Golden Tower Duration': 'goldenTower',
  'Black Hole Coin Bonus': 'blackHole',
  'Death Wave Coin Bonus': 'deathWave',
  'Spotlight Coin Bonus': 'spotlight',
  'Gold Bot Duration': 'goldBot',
}

/**
 * Golden Combo needs more than eight ultimate weapons unlocked.
 *
 * `eEcon Stones!DP2` hides it on
 * `COUNTIF('_IDS'!$AA$2:$AA$37, "UW Unlocked") <= 8`. The stone cost table
 * still prices it, so nothing else stops the planner recommending a stat the
 * player has no way to buy.
 */
const GOLDEN_COMBO_MINIMUM_WEAPONS = 9

/** The three cooldowns `AZ17`, "Keep GT|BH|DW CD Synced", takes off the path. */
const SYNCED_COOLDOWN_CANDIDATES = new Set(['GT Cooldown', 'BH Cooldown', 'DW Cooldown'])

/** The weapon each stone candidate's name refers to, in the config's spelling. */
const WEAPON_KEYS: Readonly<Record<string, keyof EffectiveEconomyConfig['weapons']>> = {
  'Golden Tower': 'goldenTower',
  'Black Hole': 'blackHole',
  'Death Wave': 'deathWave',
  'Spotlight': 'spotlight',
}

/** The stone path's assist capacities, and which ladder each climbs. */
const STONE_ASSIST_KINDS: Readonly<Record<string, 'multiplier' | 'substat'>> = {
  'Assist Module Bonus - Generator': 'multiplier',
  'Assist Module Substats - Generator': 'substat',
  'Assist Module Substats - Core': 'substat',
}

/**
 * The five card masteries the stone tab ranks without pricing.
 *
 * Their ROI column reads a single cell — `eEcon Stones!$AX$32` — rather than
 * computing anything, so the sheet is asking the player what a mastery is
 * worth rather than working it out. A planner that spends stones on them would
 * be inventing a price.
 */
const STONE_UNPRICED = new Set([
  'Coins Mastery', 'Extra Orb Mastery', 'Wave Skip Mastery',
  'Intro Sprint Mastery', 'Wave Accelerator Mastery',
])

/**
 * `UW CD` — the one candidate that is not a single level.
 *
 * `eEcon Stones!CA5` is `MAX` of the three weapon cooldowns, and buying it
 * takes a cooldown level on *whichever* of Golden Tower, Black Hole and Death
 * Wave currently sit at that maximum — up to three purchases in one step. The
 * planner moves one level at a time, so it cannot express that, and the sheet
 * also skips the candidate entirely once the longest cooldown is under 110
 * seconds.
 */
const STONE_COMPOSITE = 'UW CD'

/** One candidate, resolved to the level it moves. */
export interface EffectiveEconomyUpgrade {
  id: string
  band: keyof EffectiveEconomyLevels
  key: string
  sheetName: string
  column: string
  variants: readonly EffectiveEconomyPlanVariant[]
}

const TIME_VARIANTS: readonly EffectiveEconomyPlanVariant[] = ['time', 'coin']

export const EFFECTIVE_ECONOMY_UPGRADES: readonly EffectiveEconomyUpgrade[] = [
  ...EFFECTIVE_ECONOMY_CANDIDATES.time.map((candidate, index) => ({
    id: `time.${ECONOMY_TIME_LEVEL_KEYS[index]}`,
    band: 'time' as const,
    key: ECONOMY_TIME_LEVEL_KEYS[index] as string,
    sheetName: candidate.sheetName,
    column: candidate.column,
    variants: TIME_VARIANTS,
  })),
  ...EFFECTIVE_ECONOMY_CANDIDATES.stone.map((candidate, index) => {
    const ref = ECONOMY_STONE_LEVEL_REFS[index]
    return {
      id: `stone:${ref.band}.${ref.key}`,
      band: ref.band,
      key: ref.key,
      sheetName: candidate.sheetName,
      column: candidate.column,
      variants: ['stone'] as const,
    }
  }),
  ...EFFECTIVE_ECONOMY_CANDIDATES.discount.map((candidate, index) => ({
    id: `discount.${ECONOMY_DISCOUNT_LEVEL_KEYS[index]}`,
    band: 'discount' as const,
    key: ECONOMY_DISCOUNT_LEVEL_KEYS[index] as string,
    sheetName: candidate.sheetName,
    column: candidate.column,
    variants: ['discount'] as const,
  })),
]

export interface EffectiveEconomyPlanOptions {
  config: EffectiveEconomyConfig
  levels: EffectiveEconomyLevels
  variant: EffectiveEconomyPlanVariant
  steps?: number
  maxLevels?: Readonly<Record<string, number>>
  targetLevels?: Readonly<Record<string, number>>
  excludeIds?: readonly string[]
  labModifiers?: LabCostModifiers
  moduleDiscountPercent?: number
  enhancementDiscounts?: WorkshopEnhancementDiscounts
  /**
   * `eEcon!AZ17` — "Keep GT|BH|DW CD Synced".
   *
   * Not a term in the synchronisation multiplier, which is where it looks like
   * it belongs: `EPC_SYNC` takes twelve arguments and none of them is this.
   * `eEcon Stones!DO2` shows what it really does — it hides the three
   * individual cooldown candidates, because keeping them synced means buying
   * them together, which is the `UW CD` composite this planner cannot express.
   */
  keepCooldownsSynced?: boolean
  /**
   * `eEcon!O3` — count research days only, rather than days plus farm time.
   *
   * The tab's cost mode, spelled `DO` against `D+FT` on the sheet, and read by
   * the hide rows of the four candidates that cost coins and no research time:
   * `NOT(O$3<>"DO")` drops all four when it is `DO`.
   *
   * Off is `D+FT`, where every candidate also carries the time to farm its
   * coins — see {@link costOf}. That is what the sheet ships, so an absent
   * value behaves as `D+FT` does.
   */
  daysOnly?: boolean
  /**
   * `IDS_PS_PLAYERDATA("Coin / Hour")` — coins the player farms in an hour.
   *
   * Turns a coin cost into days, at `cost / (rate * 23)`. Only read when
   * {@link daysOnly} is off, and defaults to
   * {@link SHEET_DEFAULT_COINS_PER_HOUR}, which is the sheet's own default.
   */
  coinsPerHour?: number
  /**
   * Whether the Workshop Enhancements lab is bought — `'Master Sheet'!$F$5`.
   * The coin path buys two enhancements and neither exists without it.
   */
  workshopEnhancementsUnlocked?: boolean
}

export interface EffectiveEconomyPlan {
  steps: PathStep[]
  /** Coins per kill before any of it. */
  startingEffectiveEconomy: number
  finalEffectiveEconomy: number
  excluded: PathExclusion[]
}

/** The highest level a candidate can reach, or `null` when nothing prices one. */
function resolveMaxLevel(upgrade: EffectiveEconomyUpgrade): number | null {
  if (upgrade.sheetName === STONE_COMPOSITE) return null
  if (STONE_UNPRICED.has(upgrade.sheetName) && upgrade.variants[0] === 'stone') return null

  const weaponStat = STONE_WEAPON_STATS[upgrade.sheetName]
  if (weaponStat) return ultimateWeaponMaxLevel(weaponStat.weapon, weaponStat.stat)

  const assist = STONE_ASSIST_KINDS[upgrade.sheetName]
  if (assist && upgrade.variants[0] === 'stone') return maxStoneLevel(assist)

  if (MODULE_CANDIDATES.has(upgrade.sheetName)) return MODULE_COIN_PATH_MAX_LEVEL

  const enhancement = ENHANCEMENT_STATS[upgrade.sheetName]
  if (enhancement) return enhancementMaxLevel(enhancement)

  const max = labMaxCatalogLevel(upgrade.sheetName)
  return max > 0 ? max : null
}

/**
 * What it costs to take a candidate to `nextLevel`, in the path's currency.
 *
 * ## The time path spends two things at once
 *
 * A lab costs research time *and* coins, and four of the 23 candidates — the
 * two workshop enhancements and the two Generator module levels — cost only
 * coins. Ranking those against research days needs the two put in one unit,
 * and the sheet does it by asking how long farming the coins takes:
 *
 * ```text
 * eEcon!E6 = IF(AND(O3<>"DO", NOT(ISBLANK(CpH))),
 *              <that level's coin cost> / (UNFORMAT_NUMBER(CpH) * 23), )
 * eEcon!O6 = SCAN over MAP(Duration, FarmTime, (d, c) => d + c)
 * ```
 *
 * So a step's cost is its research duration plus its farm time, and `O3`
 * chooses whether the second half counts: `D+FT` for days plus farm time, `DO`
 * for days only. Under `DO` the four coin-only candidates leave the path
 * entirely — they would otherwise cost nothing at all, and nothing beats free.
 *
 * The `23` is the sheet's own literal, not hours in a day: it prices a day of
 * farming at 23 hours of it. Both halves come out in days, which is what
 * `ROI / Day` ranks by.
 */
function costOf(
  upgrade: EffectiveEconomyUpgrade,
  nextLevel: number,
  variant: EffectiveEconomyPlanVariant,
  options: EffectiveEconomyPlanOptions,
): number | null {
  if (variant === 'stone') {
    const weaponStat = STONE_WEAPON_STATS[upgrade.sheetName]
    if (weaponStat) {
      return ultimateWeaponStoneCost(weaponStat.weapon, weaponStat.stat, nextLevel)
    }
    const assist = STONE_ASSIST_KINDS[upgrade.sheetName]
    return assist ? assistEfficiencyStoneCost(assist, nextLevel) : null
  }

  const coins = coinCostOf(upgrade, nextLevel, options)

  if (variant === 'coin') return coins

  /*
   * The time path, in days.
   *
   * A lab contributes its research duration; the four coin-only candidates have
   * none, which is exactly why they leave the path under days-only rather than
   * ranking as free. Every candidate then contributes the time to farm its
   * coins. Both halves are days, which is what `ROI / Day` ranks by.
   */
  const research = COIN_PRICED_TIME_CANDIDATES.has(upgrade.sheetName)
    ? 0
    : labDurationDaysToReachLevel(upgrade.sheetName, nextLevel, options.labModifiers)

  // A duration the catalog cannot supply still drops the candidate, as before:
  // a lab with no known duration is not a lab that takes no time.
  if (research === null) return null
  if (options.daysOnly) return research

  return coins === null ? research : research + farmDays(coins, options)
}

/** What a candidate's next level costs in coins, whatever the path. */
function coinCostOf(
  upgrade: EffectiveEconomyUpgrade,
  nextLevel: number,
  options: EffectiveEconomyPlanOptions,
): number | null {
  if (MODULE_CANDIDATES.has(upgrade.sheetName)) {
    // The table is keyed by the level being left, not the one bought.
    return moduleUpgradeCoinCost(nextLevel - 1, {
      discountLabLevel: options.moduleDiscountPercent,
    })
  }

  const enhancement = ENHANCEMENT_STATS[upgrade.sheetName]
  if (enhancement) {
    return enhancementCoinCost(enhancement, nextLevel, options.enhancementDiscounts)
  }

  return labCoinCostToReachLevel(upgrade.sheetName, nextLevel, options.labModifiers)
}

/**
 * `eEcon!E6` — how long farming a coin cost takes, in days.
 *
 * ```text
 * =IF(AND(O3<>"DO", NOT(ISBLANK(CpH))),
 *      <that level's coin cost> / (UNFORMAT_NUMBER(CpH) * 23), )
 * ```
 *
 * The `23` is the sheet's own literal and is not hours in a day: it prices a
 * day of farming at 23 hours of it.
 *
 * Exported so it can be checked against the cell it comes from. Left as a
 * private helper it was only ever reachable through a planned step, and a test
 * that reproduces `cost / (rate * 23)` to check `cost / (rate * 23)` passes
 * whatever the constant says — which is how a `24` survived a green suite here.
 */
export function coinFarmDays(coins: number, coinsPerHour = SHEET_DEFAULT_COINS_PER_HOUR): number {
  if (!(coinsPerHour > 0) || !Number.isFinite(coins)) return 0
  /*
   * Never negative. A fully discounted cost can come back at or below zero, and
   * farm time is added to a research duration — so a negative would pay the
   * player back time and could drag a step's cost to zero, where the planner
   * skips it silently for having no price at all.
   */
  return Math.max(0, coins) / (coinsPerHour * FARM_HOURS_PER_DAY)
}

function farmDays(coins: number, options: EffectiveEconomyPlanOptions): number {
  return coinFarmDays(coins, options.coinsPerHour ?? SHEET_DEFAULT_COINS_PER_HOUR)
}

/** A candidate's current level. */
function levelOf(levels: EffectiveEconomyLevels, upgrade: EffectiveEconomyUpgrade): number {
  return (levels[upgrade.band] as unknown as Record<string, number>)[upgrade.key] ?? 0
}

/** The player's levels with a step's purchases applied. */
function withLevels(
  levels: EffectiveEconomyLevels,
  current: ReadonlyMap<string, number>,
): EffectiveEconomyLevels {
  const next: EffectiveEconomyLevels = {
    time: { ...levels.time },
    stone: { ...levels.stone },
    discount: { ...levels.discount },
  }
  for (const [id, level] of current) {
    const upgrade = EFFECTIVE_ECONOMY_UPGRADES.find(entry => entry.id === id)
    if (!upgrade) continue
    ;(next[upgrade.band] as unknown as Record<string, number>)[upgrade.key] = level
  }
  return next
}

/**
 * Plan an eEcon path.
 *
 * Candidates keep their matrix order, because the planner breaks a tie by
 * taking the earliest — which is the sheet taking the leftmost column.
 */
export function planEffectiveEconomyPath(
  options: EffectiveEconomyPlanOptions,
): EffectiveEconomyPlan {
  const { config, levels, variant } = options
  // Order matters: a real path routed to the wrong planner deserves the message
  // that names the right one, not "unknown variant".
  assertPathVariant(variant, ECONOMY_PLAN_VARIANTS, 'eEcon')
  if (variant === 'discount') throw new Error(DISCOUNT_PATH_UNSUPPORTED)

  const steps = options.steps ?? 145
  const skipped = new Set(options.excludeIds ?? [])

  const upgrades: PathUpgrade[] = []
  const excluded: EffectiveEconomyPlan['excluded'] = []
  const byId = new Map(EFFECTIVE_ECONOMY_UPGRADES.map(upgrade => [upgrade.id, upgrade]))

  for (const upgrade of EFFECTIVE_ECONOMY_UPGRADES) {
    if (!upgrade.variants.includes(variant)) continue

    if (skipped.has(upgrade.id)) {
      excluded.push({ sheetName: upgrade.sheetName, reason: 'not unlocked yet' })
      continue
    }

    if (upgrade.sheetName === STONE_COMPOSITE) {
      excluded.push({
        sheetName: upgrade.sheetName,
        reason: 'buys a cooldown level on every weapon at the longest cooldown, '
          + 'which is more than one level a step',
      })
      continue
    }

    if (options.daysOnly && COIN_PRICED_TIME_CANDIDATES.has(upgrade.sheetName)) {
      excluded.push({
        sheetName: upgrade.sheetName,
        reason: 'costs coins rather than research time, and the path is counting days only',
      })
      continue
    }

    if (variant === 'stone' && STONE_UNPRICED.has(upgrade.sheetName)) {
      excluded.push({
        sheetName: upgrade.sheetName,
        reason: 'the sheet ranks it from a player-supplied return rather than a stone price',
      })
      continue
    }

    // The weapon behind a candidate has to be owned. The stone band buys
    // weapon stats outright, so its gate is the weapon it names; the time band
    // names five coin-bonus labs that need theirs.
    const gatedWeapon = STONE_WEAPON_STATS[upgrade.sheetName]
      ? WEAPON_KEYS[STONE_WEAPON_STATS[upgrade.sheetName].weapon]
      : WEAPON_GATED_CANDIDATES[upgrade.sheetName]
    if (gatedWeapon && !config.weapons[gatedWeapon]?.unlocked) {
      excluded.push({ sheetName: upgrade.sheetName, reason: 'the weapon is not unlocked' })
      continue
    }

    if (options.workshopEnhancementsUnlocked === false
      && ENHANCEMENT_STATS[upgrade.sheetName]) {
      excluded.push({
        sheetName: upgrade.sheetName,
        reason: 'the Workshop Enhancements lab is not bought yet',
      })
      continue
    }

    if (upgrade.sheetName === 'GT Golden Combo'
      && config.unlockedUltimateWeaponCount < GOLDEN_COMBO_MINIMUM_WEAPONS) {
      excluded.push({
        sheetName: upgrade.sheetName,
        reason: `needs ${GOLDEN_COMBO_MINIMUM_WEAPONS} ultimate weapons unlocked`,
      })
      continue
    }

    if (options.keepCooldownsSynced && SYNCED_COOLDOWN_CANDIDATES.has(upgrade.sheetName)) {
      excluded.push({
        sheetName: upgrade.sheetName,
        reason: 'cooldowns are being kept synced, which buys them together',
      })
      continue
    }

    const level = levelOf(levels, upgrade)

    if (MODULE_CANDIDATES.has(upgrade.sheetName) && level < MODULE_COIN_PATH_MIN_LEVEL) {
      excluded.push({
        sheetName: upgrade.sheetName,
        reason: `below level ${MODULE_COIN_PATH_MIN_LEVEL}, where shards are cheaper`,
      })
      continue
    }

    const maxLevel = options.maxLevels?.[upgrade.id] ?? resolveMaxLevel(upgrade)
    if (maxLevel === null) {
      excluded.push({ sheetName: upgrade.sheetName, reason: 'no maximum level known' })
      continue
    }

    upgrades.push({
      id: upgrade.id,
      name: upgrade.sheetName,
      level,
      maxLevel,
      targetLevel: options.targetLevels?.[upgrade.id],
    })
  }

  const skips: PathSkip[] = []
  const planned = planPath({
    upgrades,
    steps,
    evaluate: current =>
      computeEffectiveEconomy(config, withLevels(levels, current)).effectiveEconomy,
    cost: (id, nextLevel) => {
      const upgrade = byId.get(id)
      if (!upgrade) return Number.NaN
      return costOf(upgrade, nextLevel, variant, options) ?? Number.NaN
    },
    onSkip: skip => skips.push(skip),
  })

  /*
   * Everything the loop passed over on the first step and that never made it
   * into the path, said out loud.
   *
   * Without this a candidate that is capped or unpriced appears nowhere at all
   * — not in the steps, not in `excluded` — so a path that stops after one step
   * offers no way to find out why. That is not hypothetical: a real account
   * planned a module level nine orders of magnitude worse per day than a lab
   * whose next level simply never appeared, and there was nothing to read. It
   * turned out every lab was at its cap, which the path can now say.
   */
  appendSkipExclusions(excluded, planned, skips)

  const startingEffectiveEconomy = computeEffectiveEconomy(config, levels).effectiveEconomy

  return {
    steps: planned,
    startingEffectiveEconomy,
    finalEffectiveEconomy: planned.length
      ? planned[planned.length - 1].value
      : startingEffectiveEconomy,
    excluded,
  }
}
