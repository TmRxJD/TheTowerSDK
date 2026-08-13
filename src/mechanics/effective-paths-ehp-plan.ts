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
  CARD_MASTERY_MAX_LEVEL,
  MODULE_COIN_PATH_MAX_LEVEL,
  MODULE_COIN_PATH_MIN_LEVEL,
  moduleUpgradeCoinCost,
} from './effective-paths-coin-costs'
import {
  ENHANCEMENT_SPEND_UNLOCKS,
  enhancementCoinCost,
  enhancementMaxLevel,
  type WorkshopEnhancementDiscounts,
  workshopEnhancementSpend,
} from './effective-paths-enhancement-costs'
import {
  ASSIST_BONUS_MAX_LEVEL,
  ASSIST_SUBSTAT_MAX_LEVEL,
  assistUpgradeStoneCost,
} from './effective-paths-stone-costs'
import {
  labCoinCostToReachLevel,
  type LabCostModifiers,
  labDurationDaysToReachLevel,
  labMaxCatalogLevel,
} from './effective-paths-lab-costs'
import {
  computeEffectiveHealth,
  type EffectiveHealthConfig,
  type EffectiveHealthLevels,
} from './effective-paths-ehp-model'
import { assertPathVariant, type PathStep, type PathUpgrade, planPath } from './effective-paths-planner'

/** Which currency the path spends, and therefore what it may buy. */
export type EffectiveHealthPathVariant = 'lab-time' | 'lab-coins' | 'stone' | 'coin'

/** Every variant this planner answers to. The lab band has two names. */
export const HEALTH_PATH_VARIANTS: readonly EffectiveHealthPathVariant[] = [
  'lab-time', 'lab-coins', 'stone', 'coin',
]

/**
 * How an upgrade is paid for.
 *
 * `other` covers upgrades that feed eHP but that no path buys — card masteries
 * and Dissonant Echo, bought with shards and relics. They are listed so the
 * model can value them and so a plan can say why it left them out, not because
 * a path can recommend them.
 */
export type EffectiveHealthCurrency =
  'lab' | 'stone' | 'enhancement' | 'mastery' | 'module' | 'other'


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
  /** Enhancement stat name, for upgrades bought with coins. */
  enhancementStat?: string
  /**
   * Which paths offer this upgrade.
   *
   * The sheet decides this per tab rather than per currency: its coin tab buys
   * card masteries and the Assist Module *labs* alongside workshop
   * enhancements, but not the other labs, and its stone tab buys only the three
   * slot upgrades. Deriving eligibility from the currency alone dropped six of
   * the lab paths' seventeen candidates.
   */
  variants: readonly EffectiveHealthPathVariant[]
}

/** The two lab paths, which always offer the same candidates. */
const LAB_PATHS = ['lab-time', 'lab-coins'] as const

/** Bought on a lab path, and again with coins on the Workshop+ path. */
const LAB_AND_COIN = ['lab-time', 'lab-coins', 'coin'] as const

/**
 * Every upgrade the eHP paths can buy, in the order the sheet lists them.
 *
 * Order matters: the planner breaks a tie by taking the earliest, matching the
 * sheet taking the leftmost column of a joint maximum.
 */
export const EFFECTIVE_HEALTH_UPGRADES: readonly EffectiveHealthUpgradeDefinition[] = [
  { key: 'health', sheetName: 'Health', currency: 'lab', saveKey: 'health', variants: LAB_PATHS },
  { key: 'defenseAbsolute', sheetName: 'Defense Absolute', currency: 'lab', saveKey: 'defense_absolute', variants: LAB_PATHS },
  { key: 'defensePercent', sheetName: 'Defense %', currency: 'lab', saveKey: 'defense', variants: LAB_PATHS },
  { key: 'wallHealth', sheetName: 'Wall Health', currency: 'lab', saveKey: 'wall_health', variants: LAB_PATHS },
  { key: 'wallFortification', sheetName: 'Wall Fortification', currency: 'lab', saveKey: 'wall_fortification', variants: LAB_PATHS },
  { key: 'recoveryPackageMax', sheetName: 'Recovery Package Max', currency: 'lab', saveKey: 'recovery_package_max', variants: LAB_PATHS },
  { key: 'standardPerksBonus', sheetName: 'Standard Perks Bonus', currency: 'lab', saveKey: 'standard_perks_bonus', variants: LAB_PATHS },
  { key: 'improveTradeOffPerks', sheetName: 'Improve Trade-Off Perks', currency: 'lab', saveKey: 'improve_trade_off_perks', variants: LAB_PATHS },
  { key: 'chronoFieldReduction', sheetName: 'Chrono Field Reduction %', currency: 'lab', saveKey: 'chrono_field_reduction', variants: LAB_PATHS },
  { key: 'deathWaveHealth', sheetName: 'Death Wave Health', currency: 'lab', saveKey: 'death_wave_health', variants: LAB_PATHS },
  { key: 'chainThunder', sheetName: 'Chain Thunder', currency: 'lab', saveKey: 'chain_thunder', variants: LAB_PATHS },

  /*
   * Card masteries are labs, and both the lab and coin paths buy them —
   * `eHP!BZ:CA` and `eHP Coins!BS:BT`. The cap is declared rather than read
   * from the catalog: the sheet's own Max column (`BE19`) stops at
   * {@link CARD_MASTERY_MAX_LEVEL} while the catalog carries one row more.
   */
  {
    key: 'healthMastery',
    sheetName: 'Health Mastery',
    currency: 'lab',
    saveKey: 'health_mastery',
    maxLevel: CARD_MASTERY_MAX_LEVEL,
    variants: LAB_AND_COIN,
  },
  {
    key: 'extraDefenseMastery',
    sheetName: 'Extra Defense Mastery',
    currency: 'lab',
    saveKey: 'extra_defense_mastery',
    maxLevel: CARD_MASTERY_MAX_LEVEL,
    variants: LAB_AND_COIN,
  },

  /*
   * Assist module capacity comes from two places, and the sheet buys each on
   * its own path: an Assist Module lab (`eHP!CB:CD`, capped at 30) and a
   * stone-bought slot upgrade (`eHP Stone!BO:BQ`, capped at 69 and 99). They
   * add together inside every stat, so both have to be candidates or the lab
   * paths silently drop three upgrades.
   */
  {
    key: 'assistSubstatArmorLab',
    sheetName: 'Assist Module Substats - Armor',
    currency: 'lab',
    saveKey: 'assist_module_substats_armor',
    variants: LAB_AND_COIN,
  },
  {
    key: 'assistSubstatGeneratorLab',
    sheetName: 'Assist Module Substats - Generator',
    currency: 'lab',
    saveKey: 'assist_module_substats_generator',
    variants: LAB_AND_COIN,
  },
  {
    key: 'assistBonusArmorLab',
    sheetName: 'Assist Module Bonus - Armor',
    currency: 'lab',
    saveKey: 'assist_module_bonus_armor',
    variants: LAB_AND_COIN,
  },

  {
    key: 'dissonantEchoDefense',
    sheetName: 'Dissonant Echo - Defense',
    currency: 'lab',
    saveKey: 'dissonant_echo_defense',
    variants: LAB_AND_COIN,
  },

  // Module levels, which only the coin path buys.
  {
    key: 'primaryModuleArmor',
    sheetName: 'Primary Module - Armor',
    currency: 'module',
    maxLevel: MODULE_COIN_PATH_MAX_LEVEL,
    variants: ['coin'],
  },
  {
    key: 'assistModuleArmor',
    sheetName: 'Assist Module - Armor',
    currency: 'module',
    maxLevel: MODULE_COIN_PATH_MAX_LEVEL,
    variants: ['coin'],
  },

  {
    key: 'assistSubstatArmor',
    sheetName: 'Assist Module Substats - Armor',
    currency: 'stone',
    maxLevel: ASSIST_SUBSTAT_MAX_LEVEL,
    variants: ['stone'],
  },
  {
    key: 'assistSubstatGenerator',
    sheetName: 'Assist Module Substats - Generator',
    currency: 'stone',
    maxLevel: ASSIST_SUBSTAT_MAX_LEVEL,
    variants: ['stone'],
  },
  {
    key: 'assistBonusArmor',
    sheetName: 'Assist Module Bonus - Armor',
    currency: 'stone',
    maxLevel: ASSIST_BONUS_MAX_LEVEL,
    variants: ['stone'],
  },

  // The coin path's workshop enhancements. Each level is worth 1% of its stat,
  // and defense percent has none, which is why there are four rather than five.
  {
    key: 'enhancementHealth',
    sheetName: 'Health +',
    currency: 'enhancement',
    enhancementStat: 'Health',
    variants: ['coin'],
  },
  {
    key: 'enhancementDefenseAbsolute',
    sheetName: 'Defense Absolute +',
    currency: 'enhancement',
    enhancementStat: 'Defense Absolute',
    variants: ['coin'],
  },
  {
    key: 'enhancementWallHealth',
    sheetName: 'Wall Health +',
    currency: 'enhancement',
    enhancementStat: 'Wall Health',
    variants: ['coin'],
  },
  {
    key: 'enhancementRecoveryPackage',
    sheetName: 'Recovery Package +',
    currency: 'enhancement',
    enhancementStat: 'Recovery Package',
    variants: ['coin'],
  },

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
  /**
   * Upgrades to leave out entirely, by key — the sheet's "Hide Non-unlocked
   * Labs". They appear in `excluded` with a reason rather than vanishing.
   */
  excludeKeys?: readonly (keyof EffectiveHealthLevels)[]
  /** Lab coin discount and lab speed. */
  labModifiers?: LabCostModifiers
  /** Module upgrade coin discount, as a percentage — the sheet's `F73`. */
  moduleDiscountPercent?: number
  /** Workshop discount labs and the vault discount, for the coin path. */
  enhancementDiscounts?: WorkshopEnhancementDiscounts
  /**
   * Every workshop enhancement level the player has, by the stat's own name.
   *
   * The coin path's later enhancements unlock on total coins already spent
   * across all six defensive enhancements — including three that do nothing
   * for eHP — so the gate cannot be worked out from `levels` alone.
   */
  enhancementLevels?: Readonly<Record<string, number>>
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
/**
 * What each variant may spend on. The coin path buys two different kinds of
 * upgrade, which is why this is a list rather than one currency.
 */
/** A spend threshold, in the short scale the game uses. */
function formatSpend(value: number): string {
  if (value >= 1e12) return `${value / 1e12}T`
  if (value >= 1e9) return `${value / 1e9}B`
  return String(value)
}

/** The upgrades a variant is allowed to buy. */
function isEligible(
  upgrade: EffectiveHealthUpgradeDefinition,
  variant: EffectiveHealthPathVariant,
): boolean {
  return upgrade.variants.includes(variant)
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

  // A variant no upgrade claims plans nothing and says nothing — see the same
  // guard in `planEffectiveDamagePath`, where a band name reaching a variant
  // argument produced an empty path indistinguishable from a finished account.
  assertPathVariant(variant, HEALTH_PATH_VARIANTS, 'eHP')

  const upgrades: PathUpgrade[] = []
  const excluded: EffectiveHealthPlan['excluded'] = []

  const skipped = new Set<string>(options.excludeKeys ?? [])

  /**
   * `eHP Coins!CQ` — what the player has already spent on enhancements, which
   * is what unlocks the later ones. Without the levels there is nothing to
   * measure, so the gate stays open rather than locking everything out.
   */
  const spent = options.enhancementLevels
    ? workshopEnhancementSpend(options.enhancementLevels, options.enhancementDiscounts)
    : Number.POSITIVE_INFINITY

  for (const upgrade of EFFECTIVE_HEALTH_UPGRADES) {
    if (skipped.has(upgrade.key)) {
      excluded.push({ sheetName: upgrade.sheetName, reason: 'not unlocked yet' })
      continue
    }
    if (!isEligible(upgrade, variant)) {
      excluded.push({ sheetName: upgrade.sheetName, reason: `not bought with ${variant} currency` })
      continue
    }

    if (upgrade.currency === 'module' && levels[upgrade.key] < MODULE_COIN_PATH_MIN_LEVEL) {
      excluded.push({
        sheetName: upgrade.sheetName,
        reason: `below level ${MODULE_COIN_PATH_MIN_LEVEL}, where shards are cheaper`,
      })
      continue
    }

    const unlockAt = upgrade.enhancementStat
      ? ENHANCEMENT_SPEND_UNLOCKS[upgrade.enhancementStat]
      : undefined
    if (unlockAt !== undefined && spent < unlockAt) {
      excluded.push({
        sheetName: upgrade.sheetName,
        reason: `locked until ${formatSpend(unlockAt)} coins are spent on enhancements`,
      })
      continue
    }

    const declaredMax = options.maxLevels?.[upgrade.key]
    const catalogMax = upgrade.saveKey ? labMaxCatalogLevel(upgrade.saveKey) : 0
    const enhancementMax = upgrade.enhancementStat
      ? enhancementMaxLevel(upgrade.enhancementStat)
      : null
    const maxLevel = declaredMax
      ?? upgrade.maxLevel
      ?? enhancementMax
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

      if (upgrade.currency === 'module') {
        // The table is keyed by the level being left, not the one bought.
        return moduleUpgradeCoinCost(nextLevel - 1, {
          discountLabLevel: options.moduleDiscountPercent,
        }) ?? Number.NaN
      }

      if (variant === 'coin' && upgrade.currency === 'enhancement') {
        // Keyed by the level being left, not the one bought.
        if (!upgrade.enhancementStat) return Number.NaN
        return enhancementCoinCost(
          upgrade.enhancementStat, nextLevel, options.enhancementDiscounts,
        ) ?? Number.NaN
      }

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
