/**
 * Effective Paths — what each eEcon path may buy.
 *
 * Transcribed from each tab's own "UPDATE MATRIX" header row, not inferred
 * from which currency a thing costs. Doing it the other way round on the eHP
 * side dropped six of seventeen candidates with no visible symptom, and the
 * econ tabs make the same mistake easy: the stone tab's matrix lists nineteen
 * candidates where its level columns hold only fourteen.
 *
 * The three tabs do not optimise the same quantity, which is the first thing
 * to know about them:
 *
 * - **eEcon** and **eEcon Stones** maximise average **coins per kill** — the
 *   sheet's `CPK` — with the run's length folded in.
 * - **eEcon Discount** maximises **coins saved**. It is a spending path rather
 *   than an earning one, and its six candidates are all discounts.
 *
 * Credit for the original lists belongs to the Effective Paths maintainers —
 * see `effective-paths-credits.ts`.
 */

export type EffectiveEconomyPathVariant = 'time' | 'stone' | 'discount'

export interface EffectiveEconomyCandidate {
  /** The sheet's own name for it. */
  sheetName: string
  /** The matrix column it occupies, kept so a reader can find it again. */
  column: string
}

/**
 * `eEcon!ET4:FP4` — the time and coin path's 23.
 *
 * One list priced two ways, as on the eHP and eDamage tabs: the same purchases
 * measured in research days or in coins. The last four are not labs — `Coin
 * Bonus` and `Free Upgrades` are workshop enhancements, and the two module
 * entries buy levels on the Generator.
 */
export const EFFECTIVE_ECONOMY_TIME_CANDIDATES: readonly EffectiveEconomyCandidate[] = [
  { column: 'ET', sheetName: 'Coins / Kill Bonus' },
  { column: 'EU', sheetName: 'Recovery Package Chance' },
  { column: 'EV', sheetName: 'Dissonant Echo - Utility' },
  { column: 'EW', sheetName: 'Golden Tower Bonus' },
  { column: 'EX', sheetName: 'Golden Tower Duration' },
  { column: 'EY', sheetName: 'Death Wave Coin Bonus' },
  { column: 'EZ', sheetName: 'Black Hole Coin Bonus' },
  { column: 'FA', sheetName: 'Spotlight Coin Bonus' },
  { column: 'FB', sheetName: 'Coins Mastery' },
  { column: 'FC', sheetName: 'Extra Orb Mastery' },
  { column: 'FD', sheetName: 'Wave Skip Mastery' },
  { column: 'FE', sheetName: 'Intro Sprint Mastery' },
  { column: 'FF', sheetName: 'Wave Accelerator Mastery' },
  { column: 'FG', sheetName: 'Standard Perks Bonus' },
  { column: 'FH', sheetName: 'Improve Trade-off Perks' },
  { column: 'FI', sheetName: 'Gold Bot - Duration' },
  { column: 'FJ', sheetName: 'Assist Module Substats - Generator' },
  { column: 'FK', sheetName: 'Assist Module Substats - Core' },
  { column: 'FL', sheetName: 'Assist Module Bonus - Generator' },
  { column: 'FM', sheetName: 'Coin Bonus' },
  { column: 'FN', sheetName: 'Free Upgrades' },
  { column: 'FO', sheetName: 'Primary Module - Generator' },
  { column: 'FP', sheetName: 'Assist Module - Generator' },
]

/**
 * `eEcon Stones!EG4:EY4` — the stone path's 19.
 *
 * Eleven ultimate weapon stats and three assist capacities, which is what a
 * stone actually buys — and then five card masteries, which it does not.
 *
 * Those five are not an error. Their ROI column reads a single cell, `$AX$32`,
 * rather than computing anything: the sheet lets a player say what a mastery is
 * worth so it can be weighed against a stone purchase in the same ranking. A
 * port has to carry that as an input, not derive it.
 */
export const EFFECTIVE_ECONOMY_STONE_CANDIDATES: readonly EffectiveEconomyCandidate[] = [
  { column: 'EG', sheetName: 'GT Bonus' },
  { column: 'EH', sheetName: 'GT Duration' },
  { column: 'EI', sheetName: 'GT Cooldown' },
  { column: 'EJ', sheetName: 'GT Golden Combo' },
  { column: 'EK', sheetName: 'BH Duration' },
  { column: 'EL', sheetName: 'BH Cooldown' },
  { column: 'EM', sheetName: 'DW Quantity' },
  { column: 'EN', sheetName: 'DW Cooldown' },
  { column: 'EO', sheetName: 'SL Angle' },
  { column: 'EP', sheetName: 'SL Quantity' },
  { column: 'EQ', sheetName: 'UW CD' },
  { column: 'ER', sheetName: 'Assist Module Bonus - Generator' },
  { column: 'ES', sheetName: 'Assist Module Substats - Generator' },
  { column: 'ET', sheetName: 'Assist Module Substats - Core' },
  { column: 'EU', sheetName: 'Coins Mastery' },
  { column: 'EV', sheetName: 'Extra Orb Mastery' },
  { column: 'EW', sheetName: 'Wave Skip Mastery' },
  { column: 'EX', sheetName: 'Intro Sprint Mastery' },
  { column: 'EY', sheetName: 'Wave Accelerator Mastery' },
]

/**
 * `eEcon Discount!CS4:CX4` — the discount path's 6.
 *
 * The one path that does not raise a stat. Every candidate makes something
 * cheaper, and the path maximises coins saved rather than coins earned — so it
 * cannot be ranked against the other two on their own terms.
 */
export const EFFECTIVE_ECONOMY_DISCOUNT_CANDIDATES: readonly EffectiveEconomyCandidate[] = [
  { column: 'CS', sheetName: 'Workshop Utility Discount' },
  { column: 'CT', sheetName: 'Labs Coin Discount' },
  { column: 'CU', sheetName: 'Enhancement Attack - Coin Discount' },
  { column: 'CV', sheetName: 'Enhancement Defense - Coin Discount' },
  { column: 'CW', sheetName: 'Enhancement Utility - Coin Discount' },
  { column: 'CX', sheetName: 'Module Coin Cost' },
]

export const EFFECTIVE_ECONOMY_CANDIDATES: Readonly<
  Record<EffectiveEconomyPathVariant, readonly EffectiveEconomyCandidate[]>
> = {
  time: EFFECTIVE_ECONOMY_TIME_CANDIDATES,
  stone: EFFECTIVE_ECONOMY_STONE_CANDIDATES,
  discount: EFFECTIVE_ECONOMY_DISCOUNT_CANDIDATES,
}

/**
 * The cell each eEcon tab computes its answer into.
 *
 * Recorded here because the three tabs put it in three different columns, and
 * because the discount tab's is a different quantity from the other two.
 */
export const EFFECTIVE_ECONOMY_OUTPUT_CELLS: Readonly<
  Record<EffectiveEconomyPathVariant, { tab: string, cell: string, metric: string }>
> = {
  time: { tab: 'eEcon', cell: 'DS5', metric: 'eEcon (average coins per kill)' },
  stone: { tab: 'eEcon Stones', cell: 'DJ5', metric: 'eEcon (average coins per kill)' },
  discount: { tab: 'eEcon Discount', cell: 'CD5', metric: 'coins saved' },
}
