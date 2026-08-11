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
  ASSIST_BONUS_MAX_LEVEL,
  ASSIST_SUBSTAT_MAX_LEVEL,
  assistUpgradeStoneCost,
} from './effective-paths-stone-costs'
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
export type EffectiveHealthPathVariant = 'lab-time' | 'lab-coins' | 'stone'

/**
 * How an upgrade is paid for.
 *
 * `other` covers upgrades that feed eHP but that no path buys — card masteries
 * and Dissonant Echo, bought with shards and relics. They are listed so the
 * model can value them and so a plan can say why it left them out, not because
 * a path can recommend them.
 */
export type EffectiveHealthCurrency = 'lab' | 'stone' | 'other'

/** One eHP upgrade: how it is named, keyed, and where its levels live. */
export interface EffectiveHealthUpgradeDefinition {
  /** Key in {@link EffectiveHealthLevels}. */
  key: keyof EffectiveHealthLevels
  /** As the spreadsheet labels it. */
  sheetName: string
  currency: EffectiveHealthCurrency
  /** Lab catalog / save-file key, when the upgrade is a lab. */
  saveKey?: string
  /** Cap, for upgrades with no catalog to read one from. */
  maxLevel?: number
}

/**
 * Every upgrade the eHP paths can buy, in the order the sheet lists them.
 *
 * Order matters: the planner breaks a tie by taking the earliest, matching the
 * sheet taking the leftmost column of a joint maximum.
 */
export const EFFECTIVE_HEALTH_UPGRADES: readonly EffectiveHealthUpgradeDefinition[] = [
  { key: 'health', sheetName: 'Health', currency: 'lab', saveKey: 'health' },
  { key: 'defenseAbsolute', sheetName: 'Defense Absolute', currency: 'lab', saveKey: 'defense_absolute' },
  { key: 'defensePercent', sheetName: 'Defense %', currency: 'lab', saveKey: 'defense' },
  { key: 'wallHealth', sheetName: 'Wall Health', currency: 'lab', saveKey: 'wall_health' },
  { key: 'wallFortification', sheetName: 'Wall Fortification', currency: 'lab', saveKey: 'wall_fortification' },
  { key: 'recoveryPackageMax', sheetName: 'Recovery Package Max', currency: 'lab', saveKey: 'recovery_package_max' },
  { key: 'standardPerksBonus', sheetName: 'Standard Perks Bonus', currency: 'lab', saveKey: 'standard_perks_bonus' },
  { key: 'improveTradeOffPerks', sheetName: 'Improve Trade-Off Perks', currency: 'lab', saveKey: 'improve_trade_off_perks' },
  { key: 'chronoFieldReduction', sheetName: 'Chrono Field Reduction %', currency: 'lab', saveKey: 'chrono_field_reduction' },
  { key: 'deathWaveHealth', sheetName: 'Death Wave Health', currency: 'lab', saveKey: 'death_wave_health' },
  { key: 'chainThunder', sheetName: 'Chain Thunder', currency: 'lab', saveKey: 'chain_thunder' },

  // The stone path's three candidates, capped where the sheet caps them.
  {
    key: 'assistSubstatArmor',
    sheetName: 'Assist Module Substats - Armor',
    currency: 'stone',
    maxLevel: ASSIST_SUBSTAT_MAX_LEVEL,
  },
  {
    key: 'assistSubstatGenerator',
    sheetName: 'Assist Module Substats - Generator',
    currency: 'stone',
    maxLevel: ASSIST_SUBSTAT_MAX_LEVEL,
  },
  {
    key: 'assistBonusArmor',
    sheetName: 'Assist Module Bonus - Armor',
    currency: 'stone',
    maxLevel: ASSIST_BONUS_MAX_LEVEL,
  },

  // Feed eHP, but no path buys them: shards and relics, not stones or labs.
  { key: 'healthMastery', sheetName: 'Health Mastery', currency: 'other', maxLevel: 9 },
  { key: 'extraDefenseMastery', sheetName: 'Extra Defense Mastery', currency: 'other', maxLevel: 9 },
  { key: 'dissonantEchoDefense', sheetName: 'Dissonant Echo - Defense', currency: 'other', maxLevel: 20 },
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

/** The currency each variant spends. */
const VARIANT_CURRENCY: Record<EffectiveHealthPathVariant, EffectiveHealthCurrency> = {
  'lab-time': 'lab',
  'lab-coins': 'lab',
  stone: 'stone',
}

/** The upgrades a variant is allowed to buy. */
function isEligible(
  upgrade: EffectiveHealthUpgradeDefinition,
  variant: EffectiveHealthPathVariant,
): boolean {
  return upgrade.currency === VARIANT_CURRENCY[variant]
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
    const maxLevel = declaredMax
      ?? upgrade.maxLevel
      ?? (catalogMax > 0 ? catalogMax : undefined)

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
      if (!upgrade) return Number.NaN

      if (variant === 'stone') return assistUpgradeStoneCost(nextLevel) ?? Number.NaN

      if (!upgrade.saveKey) return Number.NaN
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
