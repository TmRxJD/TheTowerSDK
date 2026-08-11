/**
 * Effective Paths — planning an eHP path.
 *
 * Ties the three pieces together: the model says what a state is worth, the
 * catalog says what an upgrade costs, and the planner walks the best return on
 * investment. This is the entry point a UI calls.
 *
 * ## Why a variant
 *
 * The sheet publishes several eHP paths that differ only in what "cost" means.
 * The lab paths spend research time or coins and can only buy labs; the stone
 * path spends stones on module substats and masteries. Passing the wrong
 * currency would silently rank against the wrong thing, so the variant chooses
 * both the cost function and which upgrades are even eligible.
 */

import {
  labCoinCostToReachLevel,
  labDurationDaysToReachLevel,
  labMaxCatalogLevel,
  type LabCostModifiers,
} from './effective-paths-lab-costs'
import {
  computeEffectiveHealth,
  type EffectiveHealthConfig,
  type EffectiveHealthLevels,
} from './effective-paths-ehp-model'
import { planPath, type PathStep, type PathUpgrade } from './effective-paths-planner'

/** Which currency the path spends, and therefore what it may buy. */
export type EffectiveHealthPathVariant = 'lab-time' | 'lab-coins'

/** One eHP upgrade: how it is named, keyed, and where its levels live. */
export interface EffectiveHealthUpgradeDefinition {
  /** Key in {@link EffectiveHealthLevels}. */
  key: keyof EffectiveHealthLevels
  /** As the spreadsheet labels it. */
  sheetName: string
  /** Lab catalog / save-file key, when the upgrade is a lab. */
  saveKey?: string
}

/**
 * Every upgrade the eHP paths can buy, in the order the sheet lists them.
 *
 * Order matters: the planner breaks a tie by taking the earliest, matching the
 * sheet taking the leftmost column of a joint maximum.
 */
export const EFFECTIVE_HEALTH_UPGRADES: readonly EffectiveHealthUpgradeDefinition[] = [
  { key: 'health', sheetName: 'Health', saveKey: 'health' },
  { key: 'defenseAbsolute', sheetName: 'Defense Absolute', saveKey: 'defense_absolute' },
  { key: 'defensePercent', sheetName: 'Defense %', saveKey: 'defense' },
  { key: 'wallHealth', sheetName: 'Wall Health', saveKey: 'wall_health' },
  { key: 'wallFortification', sheetName: 'Wall Fortification', saveKey: 'wall_fortification' },
  { key: 'recoveryPackageMax', sheetName: 'Recovery Package Max', saveKey: 'recovery_package_max' },
  { key: 'standardPerksBonus', sheetName: 'Standard Perks Bonus', saveKey: 'standard_perks_bonus' },
  { key: 'improveTradeOffPerks', sheetName: 'Improve Trade-Off Perks', saveKey: 'improve_trade_off_perks' },
  { key: 'chronoFieldReduction', sheetName: 'Chrono Field Reduction %', saveKey: 'chrono_field_reduction' },
  { key: 'deathWaveHealth', sheetName: 'Death Wave Health', saveKey: 'death_wave_health' },
  { key: 'chainThunder', sheetName: 'Chain Thunder', saveKey: 'chain_thunder' },
  // Bought with stones or card shards rather than coins and research time, so
  // they carry no lab key and sit out the lab paths.
  { key: 'healthMastery', sheetName: 'Health Mastery' },
  { key: 'extraDefenseMastery', sheetName: 'Extra Defense Mastery' },
  { key: 'assistSubstatArmor', sheetName: 'Assist Module Substats - Armor' },
  { key: 'assistSubstatGenerator', sheetName: 'Assist Module Substats - Generator' },
  { key: 'assistBonusArmor', sheetName: 'Assist Module Bonus - Armor' },
  { key: 'dissonantEchoDefense', sheetName: 'Dissonant Echo - Defense' },
]

export interface EffectiveHealthPlanOptions {
  config: EffectiveHealthConfig
  /** Where the player is now. */
  levels: EffectiveHealthLevels
  variant: EffectiveHealthPathVariant
  /** How many steps to plan. The sheet's grid tops out at 145. */
  steps?: number
  /**
   * Per-upgrade caps. Falls back to the catalog's last level for a lab, and
   * refuses to plan an upgrade with neither — guessing a cap would invent
   * upgrades a player cannot buy.
   */
  maxLevels?: Partial<Record<keyof EffectiveHealthLevels, number>>
  /** Player-imposed stops below the maximum. */
  targetLevels?: Partial<Record<keyof EffectiveHealthLevels, number>>
  /** Lab coin discount and lab speed. */
  labModifiers?: LabCostModifiers
}

export interface EffectiveHealthPlan {
  steps: PathStep[]
  /** eHP before any of it. */
  startingEffectiveHealth: number
  /** eHP after the last step. */
  finalEffectiveHealth: number
  /** Upgrades left out, and why — a path that silently ignores half the game is worse than one that says so. */
  excluded: Array<{ sheetName: string, reason: string }>
}

/** The upgrades a variant is allowed to buy. */
function isEligible(
  upgrade: EffectiveHealthUpgradeDefinition,
  variant: EffectiveHealthPathVariant,
): boolean {
  if (variant === 'lab-time' || variant === 'lab-coins') return upgrade.saveKey !== undefined
  return true
}

/**
 * Plan an eHP path.
 *
 * Every candidate is scored by what it does to the *whole* model, so upgrades
 * that only pay off through another — Wall Fortification through wall health,
 * assist substat capacity through four different stats — are valued correctly
 * rather than looking worthless in isolation.
 */
export function planEffectiveHealthPath(options: EffectiveHealthPlanOptions): EffectiveHealthPlan {
  const { config, levels, variant } = options
  const steps = options.steps ?? 145

  const upgrades: PathUpgrade[] = []
  const excluded: EffectiveHealthPlan['excluded'] = []

  for (const upgrade of EFFECTIVE_HEALTH_UPGRADES) {
    if (!isEligible(upgrade, variant)) {
      excluded.push({ sheetName: upgrade.sheetName, reason: `not bought with ${variant} currency` })
      continue
    }

    const declaredMax = options.maxLevels?.[upgrade.key]
    const catalogMax = upgrade.saveKey ? labMaxCatalogLevel(upgrade.saveKey) : 0
    const maxLevel = declaredMax ?? (catalogMax > 0 ? catalogMax : undefined)

    if (maxLevel === undefined) {
      excluded.push({ sheetName: upgrade.sheetName, reason: 'no maximum level known' })
      continue
    }

    upgrades.push({
      id: upgrade.key,
      name: upgrade.sheetName,
      level: levels[upgrade.key],
      maxLevel,
      targetLevel: options.targetLevels?.[upgrade.key],
    })
  }

  const byId = new Map(EFFECTIVE_HEALTH_UPGRADES.map(upgrade => [upgrade.key as string, upgrade]))

  const planned = planPath({
    upgrades,
    steps,
    evaluate: current => {
      const next = { ...levels }
      for (const [id, level] of current) next[id as keyof EffectiveHealthLevels] = level
      return computeEffectiveHealth(config, next).effectiveHealth
    },
    cost: (id, nextLevel) => {
      const upgrade = byId.get(id)
      if (!upgrade?.saveKey) return Number.NaN
      const cost = variant === 'lab-time'
        ? labDurationDaysToReachLevel(upgrade.saveKey, nextLevel, options.labModifiers)
        : labCoinCostToReachLevel(upgrade.saveKey, nextLevel, options.labModifiers)
      return cost ?? Number.NaN
    },
  })

  const startingEffectiveHealth = computeEffectiveHealth(config, levels).effectiveHealth

  return {
    steps: planned,
    startingEffectiveHealth,
    finalEffectiveHealth: planned.length
      ? planned[planned.length - 1].value
      : startingEffectiveHealth,
    excluded,
  }
}
