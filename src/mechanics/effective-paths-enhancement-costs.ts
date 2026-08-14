/**
 * Effective Paths — what a workshop enhancement costs.
 *
 * The coin path buys workshop enhancements — "WS+" — rather than labs or base
 * workshop levels. Each level is worth 1% of its stat, and the sheet prices
 * them from a table of eighteen stats at up to six hundred levels.
 *
 * Two discounts apply, and they stack multiplicatively rather than adding:
 *
 * ```text
 * cost = table[level] × (1 − vaultDiscount) × (1 − 0.003 × categoryDiscountLab)
 * ```
 *
 * The category lab is the Workshop Attack, Defense or Utility Discount lab, and
 * which one applies depends on the stat — the sheet picks it by where the stat
 * sits among its columns, which is why the grouping is written out here rather
 * than inferred from the name.
 */

import enhancementCosts from '../data/workshop-enhancement-costs.json'

interface EnhancementCostData {
  costs: Record<string, number[]>
}

const COSTS = (enhancementCosts as EnhancementCostData).costs

/** Which discount lab applies to an enhancement. */
export type WorkshopEnhancementCategory = 'attack' | 'defense' | 'utility'

/**
 * The eighteen enhancements, in the sheet's own column order, grouped by the
 * discount lab that applies to them.
 */
export const WORKSHOP_ENHANCEMENT_CATEGORIES: Readonly<Record<string, WorkshopEnhancementCategory>> = {
  'Damage': 'attack',
  'Rend Armor': 'attack',
  'Critical Factor': 'attack',
  'Damage/Meter': 'attack',
  'Super Crit Mult': 'attack',
  'Attack Speed': 'attack',

  'Health': 'defense',
  'Health Regen': 'defense',
  'Defense Absolute': 'defense',
  'Land Mine Damage': 'defense',
  'Wall Health': 'defense',
  'Orb Size': 'defense',

  'Cash Bonus': 'utility',
  'Coin Bonus': 'utility',
  'Cells / Kill Bonus': 'utility',
  'Free Upgrades': 'utility',
  'Recovery Package': 'utility',
  'Enemy Level Skips': 'utility',
}

export interface WorkshopEnhancementDiscounts {
  /** Workshop Attack Discount lab level; 0.3% off attack enhancements a level. */
  attackDiscountLabLevel?: number
  /** Workshop Defense Discount lab level. */
  defenseDiscountLabLevel?: number
  /** Workshop Utility Discount lab level. */
  utilityDiscountLabLevel?: number
  /**
   * A flat discount on every enhancement, as a fraction — the sheet reads this
   * from the vault.
   */
  globalDiscountPct?: number
}

/** Each level of a category discount lab takes this much off. */
const CATEGORY_DISCOUNT_PER_LEVEL = 0.003

function categoryDiscountLevel(
  category: WorkshopEnhancementCategory,
  discounts: WorkshopEnhancementDiscounts,
): number {
  if (category === 'attack') return discounts.attackDiscountLabLevel ?? 0
  if (category === 'defense') return discounts.defenseDiscountLabLevel ?? 0
  return discounts.utilityDiscountLabLevel ?? 0
}

/**
 * `WSPCOST_SINGLE_ADJUSTED` — coins to take an enhancement to `level`.
 *
 * Returns `null` for an unknown enhancement or a level past the table, rather
 * than extrapolating a price for something that cannot be bought.
 */
export function enhancementCoinCost(
  stat: string,
  level: number,
  discounts: WorkshopEnhancementDiscounts = {},
): number | null {
  const table = COSTS[stat]
  if (!table) return null
  if (!Number.isInteger(level) || level < 1 || level > table.length) return null

  const category = WORKSHOP_ENHANCEMENT_CATEGORIES[stat]
  if (!category) return null

  const base = table[level - 1]
  const categoryDiscount = 1 - CATEGORY_DISCOUNT_PER_LEVEL * categoryDiscountLevel(category, discounts)
  const globalDiscount = 1 - (discounts.globalDiscountPct ?? 0)

  return base * globalDiscount * categoryDiscount
}

/** The highest enhancement level the table covers, or `null` if unknown. */
export function enhancementMaxLevel(stat: string): number | null {
  return COSTS[stat]?.length ?? null
}

/** Every enhancement the table prices. */
export function enhancementStats(): string[] {
  return Object.keys(COSTS)
}

/**
 * The four enhancements the eHP coin path buys, keyed as the model names their
 * levels.
 *
 * Defense percent has no enhancement, which is why there are four rather than
 * five.
 */
export const EFFECTIVE_HEALTH_ENHANCEMENTS = {
  enhancementHealth: 'Health',
  enhancementDefenseAbsolute: 'Defense Absolute',
  enhancementWallHealth: 'Wall Health',
  enhancementRecoveryPackage: 'Recovery Package',
} as const

/**
 * The six defensive enhancements whose spend unlocks the later ones.
 *
 * `eHP Coins!CQ` sums cumulative spend across exactly these, in this order.
 * Three of them — Health Regen, Land Mine Damage and Orb Size — do nothing for
 * eHP; they are in the sum because the game's unlock ladder counts every
 * defensive enhancement, not because the path wants them.
 */
export const WORKSHOP_ENHANCEMENT_SPEND_STATS = [
  'Health',
  'Health Regen',
  'Defense Absolute',
  'Land Mine Damage',
  'Wall Health',
  'Orb Size',
] as const

/**
 * `WSPCOST_SINGLE_ADJUSTED_CUMULATIVE` — coins already spent taking one
 * enhancement to its current level.
 *
 * Only the vault discount applies. The sheet's cumulative variant deliberately
 * leaves the category lab discount out, unlike its single-level twin, which is
 * why this cannot be a loop over {@link enhancementCoinCost}.
 */
export function enhancementCoinSpend(
  stat: string,
  currentLevel: number,
  discounts: WorkshopEnhancementDiscounts = {},
): number {
  const table = COSTS[stat]
  if (!table) return 0
  const levels = Math.max(0, Math.min(table.length, Math.floor(currentLevel) || 0))

  let total = 0
  for (let level = 0; level < levels; level++) total += table[level]
  return total * (1 - (discounts.globalDiscountPct ?? 0))
}

/**
 * Total workshop-enhancement coins spent, which is what gates the later
 * defensive enhancements.
 */
export function workshopEnhancementSpend(
  levels: Readonly<Record<string, number>>,
  discounts: WorkshopEnhancementDiscounts = {},
): number {
  return WORKSHOP_ENHANCEMENT_SPEND_STATS.reduce(
    (total, stat) => total + enhancementCoinSpend(stat, levels[stat] ?? 0, discounts),
    0,
  )
}

/**
 * How much has to have been spent on enhancements before one unlocks.
 *
 * `eHP Coins!CR` and `CS` gate Defense Absolute + and Wall Health + on the
 * running total; the other two eHP enhancements have no gate.
 */
export const ENHANCEMENT_SPEND_UNLOCKS: Readonly<Record<string, number>> = {
  'Defense Absolute': 500_000_000_000,
  'Wall Health': 50_000_000_000_000,
}
