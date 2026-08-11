/**
 * Effective Paths — what a lab level costs, in coins and in time.
 *
 * These are the `cost` side of a path. The planner ranks upgrades by gain over
 * cost, so which upgrade the path recommends depends entirely on these numbers
 * being right.
 *
 * The spreadsheet reads them from its `DVT_Laboratory` table and adjusts:
 *
 * ```text
 * cost     = table cost     × (1 − labs coin discount)
 * duration = table duration ÷ lab speed
 * ```
 *
 * This package already carries the same table in `LAB_CATALOG`, verified
 * against the sheet, so these functions read that rather than duplicating it.
 * The sheet's own level indexing is offset differently for cost and duration —
 * `DVT_LAB_COST(name, level - 1)` against `DVT_LAB_DURATION(name, level)` — but
 * both land on the same catalog row, so this exposes one consistent
 * "to reach level L" for each.
 */

import { LAB_CATALOG } from '../data/labs-catalog'
import { parseDurationToHours } from '../formatting/numbers'

/** Hours in a day, for expressing lab time the way the paths score it. */
const HOURS_PER_DAY = 24

/**
 * The paths label labs the way players say them; the catalog keys them the way
 * the save file does. This maps the eHP path's upgrades to their catalog keys.
 *
 * Not every path upgrade is a lab — module substats and bonuses are bought with
 * stones, not coins and lab time — so those are absent here by design.
 */
export const EFFECTIVE_PATHS_LAB_KEYS: Readonly<Record<string, string>> = {
  'Health': 'health',
  'Health Regen': 'health_regen',
  'Defense Absolute': 'defense_absolute',
  'Defense %': 'defense',
  'Wall Health': 'wall_health',
  'Wall Regen': 'wall_regen',
  'Wall Fortification': 'wall_fortification',
  'Recovery Package Max': 'recovery_package_max',
  'Standard Perks Bonus': 'standard_perks_bonus',
  'Improve Trade-off Perks': 'improve_trade_off_perks',
  'Improve Trade-Off Perks': 'improve_trade_off_perks',
  'Chrono Field Reduction %': 'chrono_field_reduction',
  'Death Wave Health': 'death_wave_health',
  'Chain Thunder': 'chain_thunder',
} as const

/** Resolve a path's label to its catalog key, or `null` when it is not a lab. */
export function findEffectivePathsLabKey(name: string): string | null {
  return EFFECTIVE_PATHS_LAB_KEYS[name] ?? null
}

const CATALOG_BY_KEY = new Map(LAB_CATALOG.map(record => [record.name, record]))

/**
 * The catalog row for reaching `level`, or `null` when the lab or level is
 * unknown. Level 1 is the first row — reaching level 1 costs `levels[0]`.
 */
function levelRow(labKey: string, level: number) {
  const record = CATALOG_BY_KEY.get(labKey)
  if (!record) return null
  if (!Number.isInteger(level) || level < 1) return null
  return record.levels[level - 1] ?? null
}

export interface LabCostModifiers {
  /**
   * Labs Coin Discount lab level. Each level takes 0.3% off every lab's coin
   * cost.
   */
  coinDiscountLabLevel?: number
  /** Lab Speed lab level. Each level runs labs 2% faster. */
  labSpeedLabLevel?: number
  /** Lab speed from relics, as a fraction — 0.1 for +10%. */
  labSpeedRelicPct?: number
}

/** `LAB_COIN_DISCOUNT` — the fraction taken off every lab's coin cost. */
export function labCoinDiscount(coinDiscountLabLevel: number): number {
  return coinDiscountLabLevel * 0.003
}

/**
 * `LAB_SPEED_TOTAL` — the divisor on every lab's duration.
 *
 * The lab and the relic stack multiplicatively, not additively.
 */
export function labSpeedTotal(labSpeedLabLevel: number, labSpeedRelicPct = 0): number {
  return (1 + labSpeedLabLevel * 0.02) * (1 + labSpeedRelicPct)
}

/**
 * `LABCOST_SINGLE_ADJUSTED` — coins to take a lab from `level - 1` to `level`.
 *
 * Returns `null` when the lab is unknown or the level is past the end of the
 * table, which is the planner's signal to drop it as a candidate rather than
 * guess at an extrapolated cost.
 */
export function labCoinCostToReachLevel(
  labKey: string,
  level: number,
  modifiers: LabCostModifiers = {},
): number | null {
  const row = levelRow(labKey, level)
  if (!row) return null
  return row.cost * (1 - labCoinDiscount(modifiers.coinDiscountLabLevel ?? 0))
}

/**
 * `LABDURATION_SINGLE_ADJUSTED` — days of research to reach `level`.
 *
 * Days, because that is the unit the time paths score in: their ROI column is
 * gain per day of lab time.
 */
export function labDurationDaysToReachLevel(
  labKey: string,
  level: number,
  modifiers: LabCostModifiers = {},
): number | null {
  const row = levelRow(labKey, level)
  if (!row) return null
  const hours = parseDurationToHours(row.duration)
  if (!Number.isFinite(hours)) return null
  const speed = labSpeedTotal(modifiers.labSpeedLabLevel ?? 0, modifiers.labSpeedRelicPct ?? 0)
  if (speed <= 0) return null
  return hours / HOURS_PER_DAY / speed
}

/** The highest level the catalog has data for, or `0` for an unknown lab. */
export function labMaxCatalogLevel(labKey: string): number {
  return CATALOG_BY_KEY.get(labKey)?.levels.length ?? 0
}
