import { computeResearchLabLevel } from '../data/research-lab-level'
import { DISSONANCE_ECHO_LAB_SLUG_BY_TYPE } from './game-input-data/dissonance-echo-lab-keys'
import { defaultSharedLabsSettings, type SharedLabsSettings } from './labs-persistence'
import {
  defaultSharedModuleEfficiencyLabs,
  defaultSharedNamedCalculatorLabs,
  defaultSharedWorkshopDiscounts,
  type SharedEchoLabLevels,
  type SharedModuleDiscounts,
  type SharedModuleEfficiencyLabs,
  type SharedNamedCalculatorLabs,
  type SharedWorkshopDiscounts,
} from './shared-tool-inputs'
import {
  enhancementLabLevelToSectionDiscountPercent,
  maxDefinedEnhancementSectionDiscountPercent,
  maxDefinedEnhancementVaultDiscountPercent,
  maxDefinedWorkshopSectionDiscountPercent,
  normalizeSharedWorkshopDiscounts,
  workshopLabLevelToSectionDiscountPercent,
} from '../data/workshop-discount-normalize'
import {
  mergeSharedUptimeInputs,
  type SharedUptimeInputs,
} from './shared-uptime-inputs'

export { computeResearchLabLevel } from '../data/research-lab-level'

function maxDefinedInt(...values: Array<number | undefined>): number {
  let max = 0
  for (const value of values) {
    if (value == null || !Number.isFinite(value)) continue
    max = Math.max(max, Math.floor(value))
  }
  return max
}

export function readLabsEconomyFromResearchLevels(
  researchLabLevels: Record<string, number>,
  existing: Partial<SharedLabsSettings> = {},
): SharedLabsSettings {
  const labSpeed = maxDefinedInt(
    existing.labSpeed,
    computeResearchLabLevel(researchLabLevels, 'labs_speed', 99),
  )
  const labDiscount = maxDefinedInt(
    existing.labDiscount,
    computeResearchLabLevel(researchLabLevels, 'labs_coin_discount', 99),
  )

  return {
    labSpeed,
    labRelic: Math.max(0, Number(existing.labRelic) || defaultSharedLabsSettings.labRelic),
    labDiscount,
    gemDiscount: Number.isFinite(existing.gemDiscount)
      ? Number(existing.gemDiscount)
      : defaultSharedLabsSettings.gemDiscount,
    speedUp: Math.max(1, Number(existing.speedUp) || defaultSharedLabsSettings.speedUp),
  }
}

export function readWorkshopDiscounts(
  researchLabLevels: Record<string, number>,
  existing: Partial<SharedWorkshopDiscounts> = {},
): SharedWorkshopDiscounts {
  return {
    discountAttack: maxDefinedWorkshopSectionDiscountPercent(
      existing.discountAttack,
      workshopLabLevelToSectionDiscountPercent(computeResearchLabLevel(researchLabLevels, 'workshop_attack_discount', 99)),
    ),
    discountDefense: maxDefinedWorkshopSectionDiscountPercent(
      existing.discountDefense,
      workshopLabLevelToSectionDiscountPercent(computeResearchLabLevel(researchLabLevels, 'workshop_defense_discount', 99)),
    ),
    discountUtility: maxDefinedWorkshopSectionDiscountPercent(
      existing.discountUtility,
      workshopLabLevelToSectionDiscountPercent(computeResearchLabLevel(researchLabLevels, 'workshop_utility_discount', 99)),
    ),
    enhancementDiscountAttack: maxDefinedEnhancementSectionDiscountPercent(
      existing.enhancementDiscountAttack,
      enhancementLabLevelToSectionDiscountPercent(computeResearchLabLevel(researchLabLevels, 'enhancement_attack_coin_discount', 99)),
    ),
    enhancementDiscountDefense: maxDefinedEnhancementSectionDiscountPercent(
      existing.enhancementDiscountDefense,
      enhancementLabLevelToSectionDiscountPercent(computeResearchLabLevel(researchLabLevels, 'enhancement_defense_coin_discount', 99)),
    ),
    enhancementDiscountUtility: maxDefinedEnhancementSectionDiscountPercent(
      existing.enhancementDiscountUtility,
      enhancementLabLevelToSectionDiscountPercent(computeResearchLabLevel(researchLabLevels, 'enhancement_utility_coin_discount', 99)),
    ),
    enhancementDiscountVault: maxDefinedEnhancementVaultDiscountPercent(
      existing.enhancementDiscountVault,
      defaultSharedWorkshopDiscounts.enhancementDiscountVault,
    ),
  }
}

export function readModuleEconomyFromResearchLevels(
  researchLabLevels: Record<string, number>,
  existing: {
    moduleDiscounts?: Partial<SharedModuleDiscounts>
    moduleEfficiencyLabs?: Partial<SharedModuleEfficiencyLabs>
  } = {},
): {
    moduleDiscounts: SharedModuleDiscounts
    moduleEfficiencyLabs: SharedModuleEfficiencyLabs
  } {
  const moduleDiscounts: SharedModuleDiscounts = {
    coinDiscount: maxDefinedInt(
      existing.moduleDiscounts?.coinDiscount,
      computeResearchLabLevel(researchLabLevels, 'module_coin_cost', 99),
    ),
    shardDiscount: maxDefinedInt(
      existing.moduleDiscounts?.shardDiscount,
      computeResearchLabLevel(researchLabLevels, 'module_shard_cost', 99),
    ),
  }

  const multiplierEfficiencyLabByType: Record<string, number> = {
    ...defaultSharedModuleEfficiencyLabs.multiplierEfficiencyLabByType,
    ...(existing.moduleEfficiencyLabs?.multiplierEfficiencyLabByType ?? {}),
  }
  const substatEfficiencyLabByType: Record<string, number> = {
    ...defaultSharedModuleEfficiencyLabs.substatEfficiencyLabByType,
    ...(existing.moduleEfficiencyLabs?.substatEfficiencyLabByType ?? {}),
  }

  const moduleTypeBonusSlugs: Array<{ type: string; slug: string }> = [
    { type: 'cannon', slug: 'assist_module_bonus_cannon' },
    { type: 'armor', slug: 'assist_module_bonus_armor' },
    { type: 'generator', slug: 'assist_module_bonus_generator' },
    { type: 'core', slug: 'assist_module_bonus_core' },
  ]
  const moduleTypeSubstatSlugs: Array<{ type: string; slug: string }> = [
    { type: 'cannon', slug: 'assist_module_substats_cannon' },
    { type: 'armor', slug: 'assist_module_substats_armor' },
    { type: 'generator', slug: 'assist_module_substats_generator' },
    { type: 'core', slug: 'assist_module_substats_core' },
  ]

  for (const entry of moduleTypeBonusSlugs) {
    const level = computeResearchLabLevel(researchLabLevels, entry.slug, 30)
    if (level > 0) {
      multiplierEfficiencyLabByType[entry.type] = Math.max(multiplierEfficiencyLabByType[entry.type] ?? 0, level)
    }
  }
  for (const entry of moduleTypeSubstatSlugs) {
    const level = computeResearchLabLevel(researchLabLevels, entry.slug, 30)
    if (level > 0) {
      substatEfficiencyLabByType[entry.type] = Math.max(substatEfficiencyLabByType[entry.type] ?? 0, level)
    }
  }

  const effMultiLabLevelCannon = maxDefinedInt(
    existing.moduleEfficiencyLabs?.effMultiLabLevelCannon,
    multiplierEfficiencyLabByType.cannon,
    computeResearchLabLevel(researchLabLevels, 'assist_module_bonus_cannon', 30),
  )
  const effMultiLabLevelCore = maxDefinedInt(
    existing.moduleEfficiencyLabs?.effMultiLabLevelCore,
    multiplierEfficiencyLabByType.core,
    computeResearchLabLevel(researchLabLevels, 'assist_module_bonus_core', 30),
  )

  return {
    moduleDiscounts,
    moduleEfficiencyLabs: {
      multiplierEfficiencyLab: maxDefinedInt(
        existing.moduleEfficiencyLabs?.multiplierEfficiencyLab,
        effMultiLabLevelCannon,
      ),
      substatEfficiencyLab: maxDefinedInt(
        existing.moduleEfficiencyLabs?.substatEfficiencyLab,
        substatEfficiencyLabByType.cannon ?? 0,
        substatEfficiencyLabByType.armor ?? 0,
        substatEfficiencyLabByType.generator ?? 0,
        substatEfficiencyLabByType.core ?? 0,
      ),
      multiplierEfficiencyLabByType,
      substatEfficiencyLabByType,
      effMultiLabLevelCannon,
      effMultiLabLevelCore,
    },
  }
}

export function readEchoLabLevelsFromResearchLevels(
  researchLabLevels: Record<string, number>,
  existing: Partial<SharedEchoLabLevels> = {},
): SharedEchoLabLevels {
  return {
    attack: maxDefinedInt(
      existing.attack,
      computeResearchLabLevel(researchLabLevels, DISSONANCE_ECHO_LAB_SLUG_BY_TYPE.attack, 20),
    ),
    defense: maxDefinedInt(
      existing.defense,
      computeResearchLabLevel(researchLabLevels, DISSONANCE_ECHO_LAB_SLUG_BY_TYPE.defense, 20),
    ),
    utility: maxDefinedInt(
      existing.utility,
      computeResearchLabLevel(researchLabLevels, DISSONANCE_ECHO_LAB_SLUG_BY_TYPE.utility, 20),
    ),
    uw: maxDefinedInt(
      existing.uw,
      computeResearchLabLevel(researchLabLevels, DISSONANCE_ECHO_LAB_SLUG_BY_TYPE.uw, 20),
    ),
  }
}

export function readNamedCalculatorLabs(
  researchLabLevels: Record<string, number>,
  existing: Partial<SharedNamedCalculatorLabs> = {},
): SharedNamedCalculatorLabs {
  const echoLabLevels = readEchoLabLevelsFromResearchLevels(
    researchLabLevels,
    existing.echoLabLevels,
  )

  return {
    improveTradeOffLabLevel: maxDefinedInt(
      existing.improveTradeOffLabLevel,
      computeResearchLabLevel(researchLabLevels, 'improve_trade_off_perks', 10),
    ),
    // The thorns calculator labels this "BC Reduction Lab Level" and clamps it
    // 0..10, which is exactly Battle Condition Reduction's range. It was reading
    // Ultimate Weapon Durations, an unrelated lab, so a player with BC Reduction
    // maxed at 10 saw whatever their UW durations happened to be.
    bcLabLevel: maxDefinedInt(
      existing.bcLabLevel,
      computeResearchLabLevel(researchLabLevels, 'battle_condition_reduction', 10),
    ),
    bcReductionLabLevel: maxDefinedInt(
      existing.bcReductionLabLevel,
      computeResearchLabLevel(researchLabLevels, 'battle_condition_reduction', 20),
    ),
    pcReductionLabLevel: maxDefinedInt(
      existing.pcReductionLabLevel,
      computeResearchLabLevel(researchLabLevels, 'plasma_cannon_resistance', 20),
    ),
    botBotBonusMultiplier: maxDefinedInt(
      existing.botBotBonusMultiplier,
      defaultSharedNamedCalculatorLabs.botBotBonusMultiplier,
    ),
    echoLabLevels,
  }
}

export function syncUptimeResearchLabsFromTracker(
  researchLabLevels: Record<string, number>,
  existing: SharedUptimeInputs = {},
): SharedUptimeInputs {
  const derived: Record<string, number> = {}

  const waLevel = computeResearchLabLevel(researchLabLevels, 'wave_accelerator_mastery', 7)
  if (waLevel > 0) derived.waLevel = waLevel

  const gtDurLab = computeResearchLabLevel(researchLabLevels, 'golden_tower_duration', 20)
  if (gtDurLab > 0) derived.gtDurLab = gtDurLab

  const cfDurLab = computeResearchLabLevel(researchLabLevels, 'chrono_field_duration', 30)
  if (cfDurLab > 0) derived.cfDurLab = cfDurLab

  const bcLabLevel = computeResearchLabLevel(researchLabLevels, 'ultimate_weapon_durations', 10)
  if (bcLabLevel > 0) derived.bcLabLevel = bcLabLevel

  return mergeSharedUptimeInputs(existing, derived)
}

export type EnrichSharedToolInputsFromResearchOptions = {
  /**
   * When true, keep explicit workshop/enhancement discount percents from the payload
   * instead of merging them with max() against research lab levels.
   * Use for live tool-store sync; save import should leave this false.
   */
  preserveExplicitWorkshopDiscounts?: boolean
}

export function enrichSharedToolInputs<
  T extends {
    researchLabLevels: Record<string, number>
    labsEconomy: SharedLabsSettings
    workshopDiscounts: SharedWorkshopDiscounts
    moduleDiscounts: SharedModuleDiscounts
    moduleEfficiencyLabs: SharedModuleEfficiencyLabs
    namedCalculatorLabs: SharedNamedCalculatorLabs
    uptimeInputs: SharedUptimeInputs
  },
>(payload: T, options?: EnrichSharedToolInputsFromResearchOptions): T {
  const { researchLabLevels } = payload
  const moduleEconomy = readModuleEconomyFromResearchLevels(researchLabLevels, {
    moduleDiscounts: payload.moduleDiscounts,
    moduleEfficiencyLabs: payload.moduleEfficiencyLabs,
  })

  const workshopDiscounts = options?.preserveExplicitWorkshopDiscounts
    ? normalizeSharedWorkshopDiscounts(payload.workshopDiscounts, defaultSharedWorkshopDiscounts)
    : readWorkshopDiscounts(researchLabLevels, payload.workshopDiscounts)

  return {
    ...payload,
    labsEconomy: readLabsEconomyFromResearchLevels(researchLabLevels, payload.labsEconomy),
    workshopDiscounts,
    moduleDiscounts: moduleEconomy.moduleDiscounts,
    moduleEfficiencyLabs: moduleEconomy.moduleEfficiencyLabs,
    namedCalculatorLabs: readNamedCalculatorLabs(researchLabLevels, payload.namedCalculatorLabs),
    uptimeInputs: syncUptimeResearchLabsFromTracker(researchLabLevels, payload.uptimeInputs),
  }
}
