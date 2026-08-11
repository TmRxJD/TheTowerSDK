import { z } from 'zod'
import { normalizeSharedWorkshopDiscounts } from '../data/workshop-discount-normalize'
import {
  defaultSharedLabsSettings,
  normalizeSharedLabsSettings,
  type SharedLabsSettings,
  sharedLabsSettingsSchema,
} from './labs-persistence'
import {
  defaultSharedPerkPreferences,
  normalizeSharedPerkPreferences,
  type SharedPerkPreferences,
  sharedPerkPreferencesSchema,
} from '../save/perks'
import {
  defaultExtendedSharedToolInputs,
  extendedSharedToolInputsSchema,
  normalizeExtendedSharedToolInputs,
  type SharedToolInputsExtended,
} from './shared-tool-inputs-extended'
import {
  defaultSharedUptimeInputs,
  readSharedUptimeInputs,
  migrateLegacyUptimeLabLevels,
  type SharedUptimeInputs,
  sharedUptimeInputsSchema,
  type UwProgressLevels,
  uwProgressLevelsSchema,
} from './shared-uptime-inputs'

export {
  compactSharedToolInputsForStorage,
  mergeSparseSharedToolInputs,
  getSharedToolInputs,
} from './shared-tool-inputs-storage'
export {
  diffChangedHubKeys,
  mergeEnemyStatsCoreHub,
  mergeHubField,
  mergeSharedUptimeInputsHub,
  SHARED_HUB_SITE_DEFAULTS,
} from './shared-tool-inputs-hub-merge'
export type {
  SharedBotMedalSplitterPlanner,
  SharedBotsSynchronicity,
  SharedCardsProgressInputs,
  SharedDamageReduxCalculatorSettings,
  SharedDissonanceCalculatorState,
  SharedElsPlannerInputs,
  SharedEnemyStatsCore,
  SharedEnemyDropsInputs,
  SharedLabsCalcByLab,
  SharedModuleProgressInputs,
  SharedShardSplitterInputs,
  SharedThornsCalculatorSettings,
  SharedToolInputsExtended,
  SharedVaultLevels,
  SharedWorkshopStatLevels,
} from './shared-tool-inputs-extended'
export {
  applySharedElsPlannerToEnemyStats,
  applySharedEnemyStatsCore,
  applySharedShardSplitterInputs,
  cardsProgressInputsToLinkedProgress,
  defaultExtendedSharedToolInputs,
  defaultSharedCardsProgressInputs,
  defaultSharedEnemyDropsInputs,
  readSharedBotMedalSplitterPlanner,
  readSharedDamageReduxCalculatorSettings,
  readSharedDissonanceCalculatorState,
  readSharedElsPlannerInputs,
  readSharedEnemyStatsCore,
  readSharedThornsCalculatorSettings,
  mergeExtendedSharedToolInputs,
  normalizeExtendedSharedToolInputs,
  normalizeSharedCardsProgressInputs,
  normalizeSharedEnemyDropsInputs,
} from './shared-tool-inputs-extended'
export {
  readElsPlannerLevelsFromWorkshopStats,
  readElsVaultStarsFromVaultLevels,
  enrichElsPlannerFromLinkedSources,
  syncVaultLevelsFromElsPlanner,
  syncWorkshopStatsFromElsPlanner,
} from './shared-tool-inputs-field-sync'

export type { SharedPerkPreferences } from '../save/perks'
export {
  defaultSharedPerkPreferences,
  readPerkPreferencesFromSaveRoot,
  computeUnbannedPerkIndices,
  normalizeSharedPerkPreferences,
} from '../save/perks'

const numberRecordSchema = z.record(z.string(), z.number())
const numberArrayRecordSchema = z.record(z.string(), z.array(z.number()))
const nestedNumberRecordSchema = z.record(z.string(), z.record(z.string(), z.number()))

export const sharedTradeOffPerksSchema = z.object({
  perkEnemyHpMinus50: z.boolean(),
  perkBossHpX8: z.boolean(),
  perkBossHpMinus70: z.boolean(),
  perkEnemyDmgMinus50: z.boolean(),
  perkEnemyDmgX25: z.boolean(),
  perkRangedDmgX3: z.boolean(),
})

export type SharedTradeOffPerks = z.infer<typeof sharedTradeOffPerksSchema>

export const defaultSharedTradeOffPerks: Readonly<SharedTradeOffPerks> = {
  perkEnemyHpMinus50: false,
  perkBossHpX8: false,
  perkBossHpMinus70: false,
  perkEnemyDmgMinus50: false,
  perkEnemyDmgX25: false,
  perkRangedDmgX3: false,
}

export const sharedWorkshopDiscountsSchema = z.object({
  discountAttack: z.number(),
  discountDefense: z.number(),
  discountUtility: z.number(),
  enhancementDiscountAttack: z.number(),
  enhancementDiscountDefense: z.number(),
  enhancementDiscountUtility: z.number(),
  enhancementDiscountVault: z.number(),
})

export type SharedWorkshopDiscounts = z.infer<typeof sharedWorkshopDiscountsSchema>

export const defaultSharedWorkshopDiscounts: Readonly<SharedWorkshopDiscounts> = {
  discountAttack: 0,
  discountDefense: 0,
  discountUtility: 0,
  enhancementDiscountAttack: 0,
  enhancementDiscountDefense: 0,
  enhancementDiscountUtility: 0,
  enhancementDiscountVault: 0,
}

export const sharedModuleDiscountsSchema = z.object({
  coinDiscount: z.number(),
  shardDiscount: z.number(),
})

export type SharedModuleDiscounts = z.infer<typeof sharedModuleDiscountsSchema>

export const defaultSharedModuleDiscounts: Readonly<SharedModuleDiscounts> = {
  coinDiscount: 0,
  shardDiscount: 0,
}

export const sharedModuleEfficiencyLabsSchema = z.object({
  multiplierEfficiencyLab: z.number(),
  substatEfficiencyLab: z.number(),
  multiplierEfficiencyLabByType: numberRecordSchema,
  substatEfficiencyLabByType: numberRecordSchema,
  effMultiLabLevelCannon: z.number(),
  effMultiLabLevelCore: z.number(),
})

export type SharedModuleEfficiencyLabs = z.infer<typeof sharedModuleEfficiencyLabsSchema>

export const defaultSharedModuleEfficiencyLabs: Readonly<SharedModuleEfficiencyLabs> = {
  multiplierEfficiencyLab: 0,
  substatEfficiencyLab: 0,
  multiplierEfficiencyLabByType: {},
  substatEfficiencyLabByType: {},
  effMultiLabLevelCannon: 0,
  effMultiLabLevelCore: 0,
}

export const sharedEchoLabLevelsSchema = z.object({
  attack: z.number(),
  defense: z.number(),
  utility: z.number(),
  uw: z.number(),
})

export type SharedEchoLabLevels = z.infer<typeof sharedEchoLabLevelsSchema>

export const defaultSharedEchoLabLevels: Readonly<SharedEchoLabLevels> = {
  attack: 0,
  defense: 0,
  utility: 0,
  uw: 0,
}

export const sharedNamedCalculatorLabsSchema = z.object({
  improveTradeOffLabLevel: z.number(),
  bcLabLevel: z.number(),
  bcReductionLabLevel: z.number(),
  pcReductionLabLevel: z.number(),
  botBotBonusMultiplier: z.number(),
  echoLabLevels: sharedEchoLabLevelsSchema,
})

export type SharedNamedCalculatorLabs = z.infer<typeof sharedNamedCalculatorLabsSchema>

export const defaultSharedNamedCalculatorLabs: Readonly<SharedNamedCalculatorLabs> = {
  improveTradeOffLabLevel: 0,
  bcLabLevel: 0,
  bcReductionLabLevel: 0,
  pcReductionLabLevel: 0,
  botBotBonusMultiplier: 0,
  echoLabLevels: { ...defaultSharedEchoLabLevels },
}

export interface SharedToolInputs extends SharedToolInputsExtended {
  labsEconomy: SharedLabsSettings
  researchLabLevels: Record<string, number>
  enemyStatLabLevels: Record<string, number>
  bcCounterLabLevels: Record<string, number>
  botLevels: Record<string, number[]>
  botTargets: Record<string, number[]>
  botPlusLevels: Record<string, number[]>
  botPlusTargets: Record<string, number[]>
  botLabLevels: Record<string, Record<string, number>>
  towerRange: number
  tradeOffPerks: SharedTradeOffPerks
  workshopDiscounts: SharedWorkshopDiscounts
  moduleDiscounts: SharedModuleDiscounts
  moduleEfficiencyLabs: SharedModuleEfficiencyLabs
  guardianLevels: Record<string, number[]>
  guardianTargets: Record<string, number[]>
  namedCalculatorLabs: SharedNamedCalculatorLabs
  uptimeInputs: SharedUptimeInputs
  uwProgressLevels: UwProgressLevels
  perkPreferences: SharedPerkPreferences
}

export const sharedToolInputsSchema = z.object({
  labsEconomy: sharedLabsSettingsSchema,
  researchLabLevels: numberRecordSchema,
  enemyStatLabLevels: numberRecordSchema,
  bcCounterLabLevels: numberRecordSchema,
  botLevels: numberArrayRecordSchema,
  botTargets: numberArrayRecordSchema,
  botPlusLevels: numberArrayRecordSchema,
  botPlusTargets: numberArrayRecordSchema,
  botLabLevels: nestedNumberRecordSchema,
  towerRange: z.number(),
  tradeOffPerks: sharedTradeOffPerksSchema,
  workshopDiscounts: sharedWorkshopDiscountsSchema,
  moduleDiscounts: sharedModuleDiscountsSchema,
  moduleEfficiencyLabs: sharedModuleEfficiencyLabsSchema,
  guardianLevels: numberArrayRecordSchema,
  guardianTargets: numberArrayRecordSchema,
  namedCalculatorLabs: sharedNamedCalculatorLabsSchema,
  uptimeInputs: sharedUptimeInputsSchema,
  uwProgressLevels: uwProgressLevelsSchema,
  perkPreferences: sharedPerkPreferencesSchema,
}).merge(extendedSharedToolInputsSchema)

export const defaultSharedToolInputs: Readonly<SharedToolInputs> = {
  labsEconomy: { ...defaultSharedLabsSettings },
  researchLabLevels: {},
  enemyStatLabLevels: {},
  bcCounterLabLevels: {},
  botLevels: {},
  botTargets: {},
  botPlusLevels: {},
  botPlusTargets: {},
  botLabLevels: {},
  towerRange: 0,
  tradeOffPerks: { ...defaultSharedTradeOffPerks },
  workshopDiscounts: { ...defaultSharedWorkshopDiscounts },
  moduleDiscounts: { ...defaultSharedModuleDiscounts },
  moduleEfficiencyLabs: { ...defaultSharedModuleEfficiencyLabs },
  guardianLevels: {},
  guardianTargets: {},
  namedCalculatorLabs: { ...defaultSharedNamedCalculatorLabs },
  uptimeInputs: { ...defaultSharedUptimeInputs },
  uwProgressLevels: {},
  perkPreferences: { ...defaultSharedPerkPreferences },
  ...defaultExtendedSharedToolInputs,
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.floor(Math.min(max, Math.max(min, parsed)))
}

function normalizeNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!key) continue
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) out[key] = parsed
  }
  return out
}

function normalizeNumberArrayRecord(value: unknown): Record<string, number[]> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, number[]> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!key || !Array.isArray(raw)) continue
    const levels = raw
      .map(item => Number(item))
      .filter(item => Number.isFinite(item))
      .map(item => Math.floor(item))
    if (levels.length) out[key] = levels
  }
  return out
}

function normalizeNestedNumberRecord(value: unknown): Record<string, Record<string, number>> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, Record<string, number>> = {}
  for (const [outerKey, inner] of Object.entries(value as Record<string, unknown>)) {
    if (!outerKey || !inner || typeof inner !== 'object') continue
    const nested = normalizeNumberRecord(inner)
    if (Object.keys(nested).length) out[outerKey] = nested
  }
  return out
}

function normalizeTradeOffPerks(value: unknown): SharedTradeOffPerks {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    perkEnemyHpMinus50: source['perkEnemyHpMinus50'] === true,
    perkBossHpX8: source['perkBossHpX8'] === true,
    perkBossHpMinus70: source['perkBossHpMinus70'] === true,
    perkEnemyDmgMinus50: source['perkEnemyDmgMinus50'] === true,
    perkEnemyDmgX25: source['perkEnemyDmgX25'] === true,
    perkRangedDmgX3: source['perkRangedDmgX3'] === true,
  }
}

function normalizeWorkshopDiscounts(value: unknown): SharedWorkshopDiscounts {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const defaults = defaultSharedWorkshopDiscounts
  return normalizeSharedWorkshopDiscounts({
    discountAttack: Number(source['discountAttack'] ?? source['discountDamage'] ?? defaults.discountAttack),
    discountDefense: Number(source['discountDefense'] ?? defaults.discountDefense),
    discountUtility: Number(source['discountUtility'] ?? defaults.discountUtility),
    enhancementDiscountAttack: Number(source['enhancementDiscountAttack'] ?? source['discountDamage'] ?? defaults.enhancementDiscountAttack),
    enhancementDiscountDefense: Number(source['enhancementDiscountDefense'] ?? defaults.enhancementDiscountDefense),
    enhancementDiscountUtility: Number(source['enhancementDiscountUtility'] ?? defaults.enhancementDiscountUtility),
    enhancementDiscountVault: Number(source['enhancementDiscountVault'] ?? source['discountVault'] ?? defaults.enhancementDiscountVault),
  }, defaults)
}

function normalizeEchoLabLevels(value: unknown): SharedEchoLabLevels {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    attack: clampInt(source['attack'], 0, 0, 20),
    defense: clampInt(source['defense'], 0, 0, 20),
    utility: clampInt(source['utility'], 0, 0, 20),
    uw: clampInt(source['uw'], 0, 0, 20),
  }
}

function normalizeNamedCalculatorLabs(value: unknown): SharedNamedCalculatorLabs {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    improveTradeOffLabLevel: clampInt(source['improveTradeOffLabLevel'], 0, 0, 20),
    bcLabLevel: clampInt(source['bcLabLevel'], 0, 0, 10),
    bcReductionLabLevel: clampInt(source['bcReductionLabLevel'], 0, 0, 20),
    pcReductionLabLevel: clampInt(source['pcReductionLabLevel'], 0, 0, 20),
    botBotBonusMultiplier: clampInt(source['botBotBonusMultiplier'], 0, 0, 100),
    echoLabLevels: normalizeEchoLabLevels(source['echoLabLevels']),
  }
}

export function normalizeSharedToolInputs(value: unknown): SharedToolInputs {
  if (!value || typeof value !== 'object') {
    return sharedToolInputsSchema.parse({
      ...defaultSharedToolInputs,
      labsEconomy: { ...defaultSharedLabsSettings },
      tradeOffPerks: { ...defaultSharedTradeOffPerks },
      workshopDiscounts: { ...defaultSharedWorkshopDiscounts },
      moduleDiscounts: { ...defaultSharedModuleDiscounts },
      moduleEfficiencyLabs: { ...defaultSharedModuleEfficiencyLabs },
      namedCalculatorLabs: {
        ...defaultSharedNamedCalculatorLabs,
        echoLabLevels: { ...defaultSharedEchoLabLevels },
      },
    })
  }

  const source = value as Record<string, unknown>
  const normalized = {
    labsEconomy: normalizeSharedLabsSettings(source['labsEconomy']),
    researchLabLevels: normalizeNumberRecord(source['researchLabLevels']),
    enemyStatLabLevels: normalizeNumberRecord(source['enemyStatLabLevels']),
    bcCounterLabLevels: normalizeNumberRecord(source['bcCounterLabLevels']),
    botLevels: normalizeNumberArrayRecord(source['botLevels']),
    botTargets: normalizeNumberArrayRecord(source['botTargets']),
    botPlusLevels: normalizeNumberArrayRecord(source['botPlusLevels']),
    botPlusTargets: normalizeNumberArrayRecord(source['botPlusTargets']),
    botLabLevels: normalizeNestedNumberRecord(source['botLabLevels']),
    towerRange: clampInt(source['towerRange'], 0, 0, 1000),
    tradeOffPerks: normalizeTradeOffPerks(source['tradeOffPerks']),
    workshopDiscounts: normalizeWorkshopDiscounts(source['workshopDiscounts']),
    moduleDiscounts: {
      coinDiscount: clampInt(
        (source['moduleDiscounts'] as Record<string, unknown> | undefined)?.['coinDiscount'],
        0,
        0,
        100,
      ),
      shardDiscount: clampInt(
        (source['moduleDiscounts'] as Record<string, unknown> | undefined)?.['shardDiscount'],
        0,
        0,
        100,
      ),
    },
    moduleEfficiencyLabs: {
      multiplierEfficiencyLab: clampInt(
        (source['moduleEfficiencyLabs'] as Record<string, unknown> | undefined)?.['multiplierEfficiencyLab'],
        0,
        0,
        30,
      ),
      substatEfficiencyLab: clampInt(
        (source['moduleEfficiencyLabs'] as Record<string, unknown> | undefined)?.['substatEfficiencyLab'],
        0,
        0,
        30,
      ),
      multiplierEfficiencyLabByType: normalizeNumberRecord(
        (source['moduleEfficiencyLabs'] as Record<string, unknown> | undefined)?.['multiplierEfficiencyLabByType'],
      ),
      substatEfficiencyLabByType: normalizeNumberRecord(
        (source['moduleEfficiencyLabs'] as Record<string, unknown> | undefined)?.['substatEfficiencyLabByType'],
      ),
      effMultiLabLevelCannon: clampInt(
        (source['moduleEfficiencyLabs'] as Record<string, unknown> | undefined)?.['effMultiLabLevelCannon'],
        0,
        0,
        30,
      ),
      effMultiLabLevelCore: clampInt(
        (source['moduleEfficiencyLabs'] as Record<string, unknown> | undefined)?.['effMultiLabLevelCore'],
        0,
        0,
        30,
      ),
    },
    guardianLevels: normalizeNumberArrayRecord(source['guardianLevels']),
    guardianTargets: normalizeNumberArrayRecord(source['guardianTargets']),
    namedCalculatorLabs: normalizeNamedCalculatorLabs(source['namedCalculatorLabs']),
    uptimeInputs: source['uptimeInputs']
      ? readSharedUptimeInputs(source['uptimeInputs'] as Record<string, unknown>)
      : migrateLegacyUptimeLabLevels(normalizeNumberRecord(source['uptimeLabLevels'])),
    uwProgressLevels: normalizeNestedNumberRecord(source['uwProgressLevels']),
    perkPreferences: normalizeSharedPerkPreferences(source['perkPreferences']),
    ...normalizeExtendedSharedToolInputs(source),
  }

  return sharedToolInputsSchema.parse(normalized)
}

export function mergeNumberRecords(
  ...sources: Array<Record<string, number> | undefined>
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const source of sources) {
    if (!source) continue
    for (const [key, value] of Object.entries(source)) {
      if (!Number.isFinite(value)) continue
      const existing = out[key]
      if (existing == null || value > existing) {
        out[key] = value
      }
    }
  }
  return out
}

export function mergeNumberArrayRecords(
  ...sources: Array<Record<string, number[]> | undefined>
): Record<string, number[]> {
  const out: Record<string, number[]> = {}
  for (const source of sources) {
    if (!source) continue
    for (const [key, values] of Object.entries(source)) {
      if (!Array.isArray(values) || !values.length) continue
      const existing = out[key]
      if (!existing || values.some((value, index) => (existing[index] ?? 0) < value)) {
        out[key] = [...values]
      }
    }
  }
  return out
}

export function mergeNestedNumberRecords(
  ...sources: Array<Record<string, Record<string, number>> | undefined>
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {}
  for (const source of sources) {
    if (!source) continue
    for (const [outerKey, inner] of Object.entries(source)) {
      out[outerKey] = mergeNumberRecords(out[outerKey], inner)
    }
  }
  return out
}

function overlayNestedNumberRecords(
  base: Record<string, Record<string, number>>,
  overlay: Record<string, Record<string, number>>,
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = { ...base }
  for (const [outerKey, inner] of Object.entries(overlay)) {
    out[outerKey] = { ...out[outerKey], ...inner }
  }
  return out
}

/** Deep-merge shared inputs where `overlay` wins on conflicts (used when localStorage bootstrap is fresher than RxDB). */
export function overlaySharedToolInputs(
  base: SharedToolInputs,
  overlay: SharedToolInputs,
): SharedToolInputs {
  const b = normalizeSharedToolInputs(base)
  const o = normalizeSharedToolInputs(overlay)

  return normalizeSharedToolInputs({
    ...b,
    ...o,
    labsEconomy: { ...b.labsEconomy, ...o.labsEconomy },
    researchLabLevels: { ...b.researchLabLevels, ...o.researchLabLevels },
    enemyStatLabLevels: { ...b.enemyStatLabLevels, ...o.enemyStatLabLevels },
    bcCounterLabLevels: { ...b.bcCounterLabLevels, ...o.bcCounterLabLevels },
    botLevels: { ...b.botLevels, ...o.botLevels },
    botTargets: { ...b.botTargets, ...o.botTargets },
    botPlusLevels: { ...b.botPlusLevels, ...o.botPlusLevels },
    botPlusTargets: { ...b.botPlusTargets, ...o.botPlusTargets },
    botLabLevels: overlayNestedNumberRecords(b.botLabLevels, o.botLabLevels),
    tradeOffPerks: { ...b.tradeOffPerks, ...o.tradeOffPerks },
    perkPreferences: { ...b.perkPreferences, ...o.perkPreferences },
    workshopDiscounts: { ...b.workshopDiscounts, ...o.workshopDiscounts },
    moduleDiscounts: { ...b.moduleDiscounts, ...o.moduleDiscounts },
    moduleEfficiencyLabs: {
      ...b.moduleEfficiencyLabs,
      ...o.moduleEfficiencyLabs,
      multiplierEfficiencyLabByType: {
        ...b.moduleEfficiencyLabs.multiplierEfficiencyLabByType,
        ...o.moduleEfficiencyLabs.multiplierEfficiencyLabByType,
      },
      substatEfficiencyLabByType: {
        ...b.moduleEfficiencyLabs.substatEfficiencyLabByType,
        ...o.moduleEfficiencyLabs.substatEfficiencyLabByType,
      },
    },
    guardianLevels: { ...b.guardianLevels, ...o.guardianLevels },
    guardianTargets: { ...b.guardianTargets, ...o.guardianTargets },
    namedCalculatorLabs: {
      ...b.namedCalculatorLabs,
      ...o.namedCalculatorLabs,
      echoLabLevels: {
        ...b.namedCalculatorLabs.echoLabLevels,
        ...o.namedCalculatorLabs.echoLabLevels,
      },
    },
    uptimeInputs: { ...b.uptimeInputs, ...o.uptimeInputs },
    uwProgressLevels: overlayNestedNumberRecords(b.uwProgressLevels, o.uwProgressLevels),
    workshopStatLevels: {
      levels: { ...b.workshopStatLevels.levels, ...o.workshopStatLevels.levels },
      targets: { ...b.workshopStatLevels.targets, ...o.workshopStatLevels.targets },
      enhancementLevels: {
        ...b.workshopStatLevels.enhancementLevels,
        ...o.workshopStatLevels.enhancementLevels,
      },
      enhancementTargets: {
        ...b.workshopStatLevels.enhancementTargets,
        ...o.workshopStatLevels.enhancementTargets,
      },
      coinCurrentLevels: {
        ...b.workshopStatLevels.coinCurrentLevels,
        ...o.workshopStatLevels.coinCurrentLevels,
      },
      coinTargetLevels: {
        ...b.workshopStatLevels.coinTargetLevels,
        ...o.workshopStatLevels.coinTargetLevels,
      },
      cashCurrentLevels: {
        ...b.workshopStatLevels.cashCurrentLevels,
        ...o.workshopStatLevels.cashCurrentLevels,
      },
      cashTargetLevels: {
        ...b.workshopStatLevels.cashTargetLevels,
        ...o.workshopStatLevels.cashTargetLevels,
      },
    },
    enemyStatsCore: { ...b.enemyStatsCore, ...o.enemyStatsCore },
    enemyDropsInputs: { ...b.enemyDropsInputs, ...o.enemyDropsInputs },
    cardsProgressInputs: { ...b.cardsProgressInputs, ...o.cardsProgressInputs },
    elsPlannerInputs: { ...b.elsPlannerInputs, ...o.elsPlannerInputs },
    vaultLevels: {
      levels: { ...b.vaultLevels.levels, ...o.vaultLevels.levels },
      spentKeys: o.vaultLevels.spentKeys || b.vaultLevels.spentKeys,
    },
    moduleProgressInputs: {
      currentLevel: {
        ...b.moduleProgressInputs.currentLevel,
        ...o.moduleProgressInputs.currentLevel,
      },
      targetLevel: {
        ...b.moduleProgressInputs.targetLevel,
        ...o.moduleProgressInputs.targetLevel,
      },
      assistCurrentLevel: {
        ...b.moduleProgressInputs.assistCurrentLevel,
        ...o.moduleProgressInputs.assistCurrentLevel,
      },
      assistTargetLevel: {
        ...b.moduleProgressInputs.assistTargetLevel,
        ...o.moduleProgressInputs.assistTargetLevel,
      },
      lastRarityByType: {
        ...b.moduleProgressInputs.lastRarityByType,
        ...o.moduleProgressInputs.lastRarityByType,
      },
      lastAssistRarityByType: {
        ...b.moduleProgressInputs.lastAssistRarityByType,
        ...o.moduleProgressInputs.lastAssistRarityByType,
      },
      costsAssistEffPct: o.moduleProgressInputs.costsAssistEffPct || b.moduleProgressInputs.costsAssistEffPct,
      costsAssistEffPctByType: {
        ...b.moduleProgressInputs.costsAssistEffPctByType,
        ...o.moduleProgressInputs.costsAssistEffPctByType,
      },
    },
    shardSplitterInputs: {
      splitterByType: {
        cannon: { ...b.shardSplitterInputs.splitterByType.cannon, ...o.shardSplitterInputs.splitterByType.cannon },
        defense: { ...b.shardSplitterInputs.splitterByType.defense, ...o.shardSplitterInputs.splitterByType.defense },
        generator: { ...b.shardSplitterInputs.splitterByType.generator, ...o.shardSplitterInputs.splitterByType.generator },
        core: { ...b.shardSplitterInputs.splitterByType.core, ...o.shardSplitterInputs.splitterByType.core },
      },
      costsAssistEffPctByType: {
        ...b.shardSplitterInputs.costsAssistEffPctByType,
        ...o.shardSplitterInputs.costsAssistEffPctByType,
      },
    },
    uwCalcProgress: overlayNestedNumberRecords(b.uwCalcProgress, o.uwCalcProgress),
    labsCalcByLab: { ...b.labsCalcByLab, ...o.labsCalcByLab },
    thornsCalculatorSettings: { ...b.thornsCalculatorSettings, ...o.thornsCalculatorSettings },
    damageReduxCalculatorSettings: {
      ...b.damageReduxCalculatorSettings,
      ...o.damageReduxCalculatorSettings,
    },
    dissonanceCalculatorState: {
      ...b.dissonanceCalculatorState,
      ...o.dissonanceCalculatorState,
      wavesByTier: {
        ...b.dissonanceCalculatorState.wavesByTier,
        ...o.dissonanceCalculatorState.wavesByTier,
      },
      maxByTier: {
        ...b.dissonanceCalculatorState.maxByTier,
        ...o.dissonanceCalculatorState.maxByTier,
      },
    },
    botMedalSplitterPlanner: { ...b.botMedalSplitterPlanner, ...o.botMedalSplitterPlanner },
    botsSynchronicity: { ...b.botsSynchronicity, ...o.botsSynchronicity },
  })
}
