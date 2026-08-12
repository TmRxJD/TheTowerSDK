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
import { planPath } from './effective-paths-planner'
import type { PathStep, PathUpgrade } from './effective-paths-planner'

/** The paths the econ tabs publish. The time tab is priced two ways. */
export type EffectiveEconomyPlanVariant = 'time' | 'coin' | 'stone' | 'discount'

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
  excluded: Array<{ sheetName: string, reason: string }>
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

/** What it costs to take a candidate to `nextLevel`, in the path's currency. */
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

  return variant === 'time'
    ? labDurationDaysToReachLevel(upgrade.sheetName, nextLevel, options.labModifiers)
    : labCoinCostToReachLevel(upgrade.sheetName, nextLevel, options.labModifiers)
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
  })

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
