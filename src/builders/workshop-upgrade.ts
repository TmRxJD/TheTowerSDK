/**
 * Workshop upgrades: coins to take one stat from where it is to where you want it.
 *
 * The discount is a single percentage applied per level and rounded per level, not once at
 * the end — rounding the total instead drifts by a coin per level, which is invisible on a
 * short run and wrong by thousands across a full upgrade path.
 */
import {
  buildWorkshopLevelCostRows,
  computeWorkshopTotalDiscountPercent,
  getWorkshopCostLevelsByKey,
  workshopCostMaxLevel,
  WSP_WORKSHOP_COST_LEVELS,
} from '../data/index'
import { type CalculatorBuilder, type CalculatorResultBase, clampNumber } from './types'

export interface WorkshopUpgradeInput {
  /** Which cost curve this stat uses. */
  costKey: string
  currentLevel: number
  targetLevel: number
  /** Discount for this stat's section, as a percentage. */
  sectionDiscountPercent: number
  /** Vault discount, as a percentage. Added to the section discount and capped at 100. */
  vaultDiscountPercent: number
}

export interface WorkshopUpgradeLevel {
  readonly level: number
  readonly baseCost: number
  readonly discountedCost: number
  readonly cumulativeCost: number
  /** The stat multiplier at this level, as the game shows it. */
  readonly bonusMultiplier: number
}

export interface WorkshopUpgradeResult extends CalculatorResultBase {
  readonly levels: readonly WorkshopUpgradeLevel[]
  readonly totalCost: number
  /** The combined discount actually applied, after capping. */
  readonly appliedDiscountPercent: number
}

// Derived from the cost table itself, so a curve added there appears in the picker.
const COST_KEYS: readonly string[] = Object.keys(WSP_WORKSHOP_COST_LEVELS)

const defaults: WorkshopUpgradeInput = {
  costKey: COST_KEYS[0] ?? '',
  currentLevel: 0,
  targetLevel: 10,
  sectionDiscountPercent: 0,
  vaultDiscountPercent: 0,
}

export const workshopUpgradeCalculator: CalculatorBuilder<WorkshopUpgradeInput, WorkshopUpgradeResult> = {
  id: 'workshop.upgrade',
  title: 'Workshop upgrade',
  summary: 'Coins to move one workshop stat between two levels, with discounts applied.',

  fields: [
    {
      key: 'costKey',
      label: 'Cost curve',
      kind: 'select',
      options: COST_KEYS.map(key => ({ value: key, label: key })),
      help: 'Workshop stats share a handful of cost curves; pick the one this stat uses.',
    },
    { key: 'currentLevel', label: 'Current level', kind: 'number', min: 0 },
    { key: 'targetLevel', label: 'Target level', kind: 'number', min: 0 },
    { key: 'sectionDiscountPercent', label: 'Section discount', kind: 'number', unit: 'percent', min: 0, max: 100 },
    { key: 'vaultDiscountPercent', label: 'Vault discount', kind: 'number', unit: 'percent', min: 0, max: 100 },
  ],

  defaults,

  normalize(input = {}) {
    const costKey = typeof input.costKey === 'string' && COST_KEYS.includes(input.costKey)
      ? input.costKey
      : defaults.costKey
    const curve = getWorkshopCostLevelsByKey(costKey)
    const cap = curve ? workshopCostMaxLevel(curve) : 0
    return {
      costKey,
      /*
       * Clamped to what this stat's curve actually prices, not to a shared constant: the
       * curves differ in length, so the ceiling depends on which one was picked. An
       * uncapped level here is not merely wrong — it asks for a row per level and will
       * happily allocate until the tab dies.
       */
      currentLevel: Math.floor(clampNumber(input.currentLevel, 0, cap, 0)),
      targetLevel: Math.floor(clampNumber(input.targetLevel, 0, cap, Math.min(defaults.targetLevel, cap))),
      sectionDiscountPercent: clampNumber(input.sectionDiscountPercent, 0, 100, 0),
      vaultDiscountPercent: clampNumber(input.vaultDiscountPercent, 0, 100, 0),
    }
  },

  compute(rawInput = {}) {
    const input = this.normalize(rawInput)
    const notes: string[] = []

    /*
     * Normalisation falls back to a real curve so a form never breaks, but silently pricing
     * against a DIFFERENT stat is the wrong kind of resilience — the number looks fine and
     * is for something else. Say which curve was actually used.
     */
    if (typeof rawInput.costKey === 'string' && rawInput.costKey && rawInput.costKey !== input.costKey) {
      notes.push(`No cost curve named "${rawInput.costKey}"; priced against ${input.costKey} instead.`)
    }

    const costs = getWorkshopCostLevelsByKey(input.costKey)
    if (!costs) {
      return {
        levels: [],
        totalCost: 0,
        appliedDiscountPercent: 0,
        notes: [`No workshop cost curve named "${input.costKey}".`],
      }
    }

    const appliedDiscountPercent = computeWorkshopTotalDiscountPercent(
      input.sectionDiscountPercent,
      input.vaultDiscountPercent,
    )
    if (input.sectionDiscountPercent + input.vaultDiscountPercent > 100) {
      notes.push('Combined discount exceeds 100% and was capped.')
    }
    const maxLevel = workshopCostMaxLevel(costs)
    if (typeof rawInput.targetLevel === 'number' && rawInput.targetLevel > maxLevel) {
      notes.push(`${input.costKey} is priced to level ${maxLevel}; the target was clamped there.`)
    }
    if (input.targetLevel <= input.currentLevel) {
      notes.push('Target level is not above the current level, so there is nothing to buy.')
      return { levels: [], totalCost: 0, appliedDiscountPercent, notes }
    }

    const rows = buildWorkshopLevelCostRows(
      costs,
      input.currentLevel,
      input.targetLevel,
      appliedDiscountPercent,
    )

    const levels = rows.map(row => ({
      level: row.level,
      baseCost: row.baseCost,
      discountedCost: row.discountedCost,
      cumulativeCost: row.cumulativeCost,
      bonusMultiplier: row.bonusMultiplier,
    }))

    return {
      levels,
      totalCost: levels.at(-1)?.cumulativeCost ?? 0,
      appliedDiscountPercent,
      notes,
    }
  },
}
