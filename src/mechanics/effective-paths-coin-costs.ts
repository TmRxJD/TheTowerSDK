/**
 * Effective Paths — the coin costs beyond workshop enhancements.
 *
 * The coin path also buys card masteries and module levels, and neither is
 * priced like anything else in this package: masteries sit in the lab table
 * under a column the game does not treat as a lab, and module upgrades come
 * from a column of the sheet's data tables.
 *
 * Both are indexed by **the level you are leaving**, not the one you are
 * buying — the sheet passes the current level and compares against the level
 * above it. The functions here take the current level for the same reason, so
 * a reader can line them up against the sheet without an off-by-one to hold in
 * their head.
 *
 * ## A quirk worth knowing about
 *
 * The sheet looks module costs up with `INDEX(Data_Val_Tables!$EV$4:$EV150,
 * level)`. That end row is *relative*, so it drifts as the formula is copied
 * down the path grid: on the first row the range covers 147 entries and a
 * module at level 160 returns an error, while further down the same lookup
 * succeeds. Whether a module upgrade is considered therefore depends on how
 * far into the path you are, which is almost certainly not intended. This uses
 * the whole table at every step; the difference is that a module upgrade is
 * offered consistently rather than only after row 18.
 */

import coinCosts from '../data/effective-paths-coin-costs.json'

interface CoinCostData {
  cardMastery: number[]
  moduleUpgrade: number[]
}

const COSTS = coinCosts as CoinCostData

/** Card masteries run 0 to 9. */
export const CARD_MASTERY_MAX_LEVEL = COSTS.cardMastery.length

/**
 * The eHP coin path only considers module levels in this range: below 160 an
 * upgrade is not worth costing out, and 300 is the ceiling.
 */
export const MODULE_COIN_PATH_MIN_LEVEL = 160
export const MODULE_COIN_PATH_MAX_LEVEL = 300

/**
 * Coins to take a card mastery from `fromLevel` to the next level.
 *
 * Returns `null` past the last mastery level, rather than pricing a level that
 * does not exist.
 */
export function cardMasteryCoinCost(fromLevel: number): number | null {
  if (!Number.isInteger(fromLevel) || fromLevel < 0) return null
  return COSTS.cardMastery[fromLevel] ?? null
}

export interface ModuleCoinDiscount {
  /**
   * Module coin discount lab level; each level takes 1% off. The sheet reads
   * this straight from the Master Sheet.
   */
  discountLabLevel?: number
}

/**
 * Coins to take a module from `fromLevel` to the next level.
 *
 * Returns `null` outside the table. Note the table runs from level 1, while
 * the eHP path only ever asks about 160 and above — the rest is priced here
 * because the table has it, not because this path uses it.
 */
export function moduleUpgradeCoinCost(
  fromLevel: number,
  discount: ModuleCoinDiscount = {},
): number | null {
  if (!Number.isInteger(fromLevel) || fromLevel < 1) return null
  const base = COSTS.moduleUpgrade[fromLevel - 1]
  if (base === undefined) return null
  return base * (1 - 0.01 * (discount.discountLabLevel ?? 0))
}

/** The highest module level the table prices a step out of. */
export function moduleUpgradeMaxFromLevel(): number {
  return COSTS.moduleUpgrade.length
}

/** Whether the eHP coin path would consider a module at this level at all. */
export function isModuleCoinPathCandidate(level: number): boolean {
  return level >= MODULE_COIN_PATH_MIN_LEVEL && level < MODULE_COIN_PATH_MAX_LEVEL
}

/**
 * Module levels are priced here but not yet bought by any path.
 *
 * What a module level is *worth* comes from `computeModuleStat`, which agrees
 * with the sheet's `MODSTAT_ARMOR` exactly for Common through plain Ancestral,
 * checked at levels 1, 50, 160, 200 and 299.
 *
 * It does **not** agree for the ancestral steps. This package multiplies by
 * `1 + 0.04 × steps`, so Ancestral 5 armor at level 200 is 19.288; the sheet
 * treats "Ancestral 5" exactly like plain "Ancestral" and answers 16.24 — an
 * 18% difference for a player who has one. Wiring module levels into the coin
 * path means choosing which of those is right, and that is a question for the
 * sheet's maintainers rather than something to settle here, so the path leaves
 * module levels out for now and says so.
 */
export const MODULE_STAT_ANCESTRAL_DISAGREEMENT = {
  agreesFor: ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Ancestral'],
  disagreesFor: ['Ancestral 1', 'Ancestral 2', 'Ancestral 3', 'Ancestral 4', 'Ancestral 5'],
  note: 'This package applies a 1 + 0.04 x steps ancestral bonus; the sheet does not.',
} as const
