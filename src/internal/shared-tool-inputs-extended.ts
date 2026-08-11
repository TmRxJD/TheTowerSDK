import { z } from 'zod'
import type { BattleConditionSelection } from '../mechanics/battle-condition-config'
import {
  BOT_MEDAL_SPLITTER_PRESET_COUNT,
  type BotMedalSplitterPreset,
  type BotMedalSplitterShRarity,
  normalizeBotMedalSplitterShRarity,
} from './bot-medal-splitter-local-state'
import {
  defaultDissonanceCalcsLocalState,
  type DissonanceCalcsLocalState,
  normalizeDissonanceCalcsLocalState,
} from './dissonance-calcs-local-state'
import {
  defaultEnemyStatsCalcsLocalState,
  type EnemyStatsCalcsElsFocus,
  type EnemyStatsCalcsLocalState,
  normalizeEnemyStatsCalcsLocalState,
} from './enemy-stats-calcs-local-state'
import {
  defaultSharedCardsProgressInputs,
  normalizeSharedCardsProgressInputs,
  type SharedCardsProgressInputs,
  sharedCardsProgressInputsSchema,
} from './cards-progress-inputs'
import {
  defaultSharedEnemyDropsInputs,
  normalizeSharedEnemyDropsInputs,
  type SharedEnemyDropsInputs,
  sharedEnemyDropsInputsSchema,
} from './enemy-drops-calcs-local-state'
import {
  type DamageReduxCalcsLocalState,
  defaultDamageReduxCalcsLocalState,
  defaultThornsCalcsSettings,
  normalizeDamageReduxCalcsLocalState,
  normalizeThornsCalcsLocalState,
  type ThornsCalcsSettings,
} from './calculator-local-state-schemas'
import {
  createDefaultShardSplitterSnapshot,
  type SplitterByType,
  splitterByTypeSchema,
  type SplitterData,
} from './shard-splitter-schema'
import { normalizeTierSelection, type TierSelectionInput } from '../data/tournaments'
import { type UwProgressLevels, uwProgressLevelsSchema } from './shared-uptime-inputs'

const numberRecordSchema = z.record(z.string(), z.number())
const labCalcRangeSchema = z.object({
  current: z.number().nullable(),
  target: z.number().nullable(),
})

export const sharedWorkshopStatLevelsSchema = z.object({
  levels: numberRecordSchema,
  targets: numberRecordSchema,
  enhancementLevels: numberRecordSchema,
  enhancementTargets: numberRecordSchema,
  coinCurrentLevels: numberRecordSchema,
  coinTargetLevels: numberRecordSchema,
  cashCurrentLevels: numberRecordSchema,
  cashTargetLevels: numberRecordSchema,
})

export type SharedWorkshopStatLevels = z.infer<typeof sharedWorkshopStatLevelsSchema>

export const defaultSharedWorkshopStatLevels: Readonly<SharedWorkshopStatLevels> = {
  levels: {},
  targets: {},
  enhancementLevels: {},
  enhancementTargets: {},
  coinCurrentLevels: {},
  coinTargetLevels: {},
  cashCurrentLevels: {},
  cashTargetLevels: {},
}

const battleConditionSelectionSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  level: z.number(),
})

export const sharedEnemyStatsCoreSchema = z.object({
  tierSelection: z.union([z.number(), z.string()]),
  wave: z.number(),
  healthSkipInput: z.string(),
  attackSkipInput: z.string(),
  reverseEnemyType: z.string(),
  targetHpVal: z.string(),
  targetDamageVal: z.string(),
  battleConditions: z.array(battleConditionSelectionSchema),
})

export type SharedEnemyStatsCore = z.infer<typeof sharedEnemyStatsCoreSchema>

export const defaultSharedEnemyStatsCore: Readonly<SharedEnemyStatsCore> = {
  tierSelection: 1,
  wave: 100,
  healthSkipInput: '',
  attackSkipInput: '',
  reverseEnemyType: 'Basic',
  targetHpVal: '',
  targetDamageVal: '',
  battleConditions: [],
}

export const sharedElsPlannerInputsSchema = z.object({
  elsAttackLevel: z.number(),
  elsHealthLevel: z.number(),
  elsEnhancementLevel: z.number(),
  elsReferenceWave: z.number(),
  elsUtilityDiscountPct: z.number(),
  elsEnhancementDiscountPct: z.number(),
  elsEnhancementVaultDiscountPct: z.number(),
  elsVaultAttackStars: z.number(),
  elsVaultHealthStars: z.number(),
  elsModulePrimaryAttackPct: z.number(),
  elsModuleAssistAttackPct: z.number(),
  elsModulePrimaryHealthPct: z.number(),
  elsModuleAssistHealthPct: z.number(),
  elsModulePrimaryAttackRarity: z.string(),
  elsModuleAssistAttackRarity: z.string(),
  elsModulePrimaryHealthRarity: z.string(),
  elsModuleAssistHealthRarity: z.string(),
  elsAssistSubstatEfficiency: z.number(),
  elsLabAttackLevel: z.number(),
  elsLabHealthLevel: z.number(),
  elsFocus: z.enum(['combined', 'attack', 'health']),
  elsMaxSteps: z.number(),
  elsCoinBudgetVal: z.string(),
})

export type SharedElsPlannerInputs = z.infer<typeof sharedElsPlannerInputsSchema>

export const defaultSharedElsPlannerInputs: Readonly<SharedElsPlannerInputs> = {
  elsAttackLevel: 0,
  elsHealthLevel: 0,
  elsEnhancementLevel: 0,
  elsReferenceWave: 1000,
  elsUtilityDiscountPct: 0,
  elsEnhancementDiscountPct: 0,
  elsEnhancementVaultDiscountPct: 0,
  elsVaultAttackStars: 0,
  elsVaultHealthStars: 0,
  elsModulePrimaryAttackPct: 0,
  elsModuleAssistAttackPct: 0,
  elsModulePrimaryHealthPct: 0,
  elsModuleAssistHealthPct: 0,
  elsModulePrimaryAttackRarity: 'None',
  elsModuleAssistAttackRarity: 'None',
  elsModulePrimaryHealthRarity: 'None',
  elsModuleAssistHealthRarity: 'None',
  elsAssistSubstatEfficiency: 0,
  elsLabAttackLevel: 0,
  elsLabHealthLevel: 0,
  elsFocus: 'combined',
  elsMaxSteps: 50,
  elsCoinBudgetVal: '',
}

export const sharedVaultLevelsSchema = z.object({
  levels: numberRecordSchema,
  spentKeys: z.number(),
})

export type SharedVaultLevels = z.infer<typeof sharedVaultLevelsSchema>

export const defaultSharedVaultLevels: Readonly<SharedVaultLevels> = {
  levels: {},
  spentKeys: 0,
}

export const sharedModuleProgressInputsSchema = z.object({
  currentLevel: numberRecordSchema,
  targetLevel: numberRecordSchema,
  assistCurrentLevel: numberRecordSchema,
  assistTargetLevel: numberRecordSchema,
  lastRarityByType: z.record(z.string(), z.string()),
  lastAssistRarityByType: z.record(z.string(), z.string()),
  costsAssistEffPct: z.number(),
  costsAssistEffPctByType: numberRecordSchema,
  generatorCpkPrimarySubstatAdd: z.number().nonnegative().optional(),
  generatorCpkAssistSubstatAdd: z.number().nonnegative().optional(),
  /** Equipped primary Generator unique template id (save-derived). */
  generatorEquippedUniqueId: z.string().optional(),
})

export type SharedModuleProgressInputs = z.infer<typeof sharedModuleProgressInputsSchema>

export const defaultSharedModuleProgressInputs: Readonly<SharedModuleProgressInputs> = {
  currentLevel: {},
  targetLevel: {},
  assistCurrentLevel: {},
  assistTargetLevel: {},
  lastRarityByType: {},
  lastAssistRarityByType: {},
  costsAssistEffPct: 25,
  costsAssistEffPctByType: {},
}

export const sharedShardSplitterInputsSchema = z.object({
  splitterByType: splitterByTypeSchema,
  costsAssistEffPctByType: z.object({
    cannon: z.number(),
    defense: z.number(),
    generator: z.number(),
    core: z.number(),
  }),
})

export type SharedShardSplitterInputs = z.infer<typeof sharedShardSplitterInputsSchema>

export const defaultSharedShardSplitterInputs: Readonly<SharedShardSplitterInputs> = {
  splitterByType: createDefaultShardSplitterSnapshot().splitterByType,
  costsAssistEffPctByType: createDefaultShardSplitterSnapshot().costsAssistEffPctByType,
}

export const sharedLabsCalcByLabSchema = z.record(z.string(), labCalcRangeSchema)

export type SharedLabsCalcByLab = z.infer<typeof sharedLabsCalcByLabSchema>

export const sharedThornsCalculatorSettingsSchema = z.object({
  baseThorns: z.number(),
  tier: z.number(),
  pcLevel: z.number(),
  pcMasteryLevel: z.number(),
  tournamentTier: z.enum(['none', 't11', 't14', 't17']),
  heatWave: z.number(),
  startWallThorns: z.number(),
})

export type SharedThornsCalculatorSettings = z.infer<typeof sharedThornsCalculatorSettingsSchema>

export const defaultSharedThornsCalculatorSettings: Readonly<SharedThornsCalculatorSettings> = {
  baseThorns: 0,
  tier: 1,
  pcLevel: 0,
  pcMasteryLevel: 0,
  tournamentTier: 'none',
  heatWave: 0,
  startWallThorns: 0,
}

export const sharedDamageReduxCalculatorSettingsSchema = z.object({
  baseVal: z.string(),
  maxTowerHealthVal: z.string(),
  useDefense: z.boolean(),
  defensePct: z.number(),
  useDefAbs: z.boolean(),
  defAbsVal: z.string(),
  useCF: z.boolean(),
  cfPct: z.number(),
  useFB: z.boolean(),
  fbPct: z.number(),
  useNMP: z.boolean(),
  nmpReduction: z.number(),
  nmpOrbHits: z.number(),
  usePC: z.boolean(),
  pcPct: z.number(),
  useCT: z.boolean(),
  ctLevel: z.number(),
  clPlusLevel: z.number(),
  avgClPlusHits: z.number(),
  enemyHpVal: z.string(),
  assumeMaxCtReduction: z.boolean(),
})

export type SharedDamageReduxCalculatorSettings = z.infer<typeof sharedDamageReduxCalculatorSettingsSchema>

export const defaultSharedDamageReduxCalculatorSettings: Readonly<SharedDamageReduxCalculatorSettings> = {
  baseVal: '500q',
  maxTowerHealthVal: '500q',
  useDefense: true,
  defensePct: 98,
  useDefAbs: true,
  defAbsVal: '500q',
  useCF: true,
  cfPct: 25,
  useFB: true,
  fbPct: 95,
  useNMP: true,
  nmpReduction: 2.5,
  nmpOrbHits: 50,
  usePC: true,
  pcPct: 80,
  useCT: true,
  ctLevel: 30,
  clPlusLevel: 11,
  avgClPlusHits: 100,
  enemyHpVal: '500q',
  assumeMaxCtReduction: false,
}

const dissonanceWaveInputsSchema = z.object({
  attack: z.number(),
  defense: z.number(),
  utility: z.number(),
  uw: z.number(),
})

const dissonanceMaxFlagsSchema = z.object({
  attack: z.boolean(),
  defense: z.boolean(),
  utility: z.boolean(),
  uw: z.boolean(),
})

export const sharedDissonanceCalculatorStateSchema = z.object({
  echoLabsLocked: z.boolean(),
  wavesByTier: z.record(z.string(), dissonanceWaveInputsSchema),
  maxByTier: z.record(z.string(), dissonanceMaxFlagsSchema),
})

export type SharedDissonanceCalculatorState = z.infer<typeof sharedDissonanceCalculatorStateSchema>

export const defaultSharedDissonanceCalculatorState: Readonly<SharedDissonanceCalculatorState> = {
  echoLabsLocked: false,
  wavesByTier: defaultDissonanceCalcsLocalState().wavesByTier,
  maxByTier: defaultDissonanceCalcsLocalState().maxByTier,
}

const botMedalSplitterTargetConfigSchema = z.object({
  enabled: z.boolean(),
  synced: z.boolean(),
  baseLocks: z.record(z.string(), z.boolean()),
  plusLocks: z.record(z.string(), z.boolean()),
})

export const sharedBotMedalSplitterPlannerSchema = z.object({
  activePreset: z.number(),
  plannerTab: z.enum(['allocation', 'inputs']),
  editorBotLabel: z.string(),
  presets: z.array(z.object({
    budget: z.number(),
    towerRange: z.number(),
    singularityHarnessRarity: z.enum(['none', 'Epic', 'Legendary', 'Mythic', 'Ancestral']),
    vaultBotRangeLevel: z.number(),
    useBotBotPlus: z.boolean(),
    botBotEnabled: z.boolean(),
    botBotSynced: z.boolean(),
    targetConfigs: z.record(z.string(), botMedalSplitterTargetConfigSchema),
    targetOrder: z.array(z.string()),
    plannerFocusOrder: z.array(z.string()),
    botBotBaseLocks: z.record(z.string(), z.boolean()),
    botBotPlusLocks: z.record(z.string(), z.boolean()),
  })),
})

export type SharedBotMedalSplitterPlanner = z.infer<typeof sharedBotMedalSplitterPlannerSchema>

export const defaultSharedBotMedalSplitterPlanner: Readonly<SharedBotMedalSplitterPlanner> = {
  activePreset: 0,
  plannerTab: 'allocation',
  editorBotLabel: '',
  presets: Array.from({ length: BOT_MEDAL_SPLITTER_PRESET_COUNT }, () => ({
    budget: 0,
    towerRange: 60,
    singularityHarnessRarity: 'none' as BotMedalSplitterShRarity,
    vaultBotRangeLevel: 0,
    useBotBotPlus: false,
    botBotEnabled: false,
    botBotSynced: false,
    targetConfigs: {},
    targetOrder: [],
    plannerFocusOrder: [],
    botBotBaseLocks: {},
    botBotPlusLocks: {},
  })),
}

export const sharedBotsSynchronicitySchema = z.object({
  enabled: z.boolean(),
  slotsOwned: z.number(),
  slotsTarget: z.number(),
  assignments: z.array(z.array(z.string())),
})

export type SharedBotsSynchronicity = z.infer<typeof sharedBotsSynchronicitySchema>

export const defaultSharedBotsSynchronicity: Readonly<SharedBotsSynchronicity> = {
  enabled: false,
  slotsOwned: 0,
  slotsTarget: 0,
  assignments: [],
}

export type { SharedCardsProgressInputs } from './cards-progress-inputs'
export {
  cardsProgressInputsToLinkedProgress,
  defaultSharedCardsProgressInputs,
  normalizeSharedCardsProgressInputs,
} from './cards-progress-inputs'

export type { SharedEnemyDropsInputs } from './enemy-drops-calcs-local-state'
export {
  defaultSharedEnemyDropsInputs,
  normalizeSharedEnemyDropsInputs,
} from './enemy-drops-calcs-local-state'

export interface SharedToolInputsExtended {
  workshopStatLevels: SharedWorkshopStatLevels
  enemyStatsCore: SharedEnemyStatsCore
  enemyDropsInputs: SharedEnemyDropsInputs
  cardsProgressInputs: SharedCardsProgressInputs
  elsPlannerInputs: SharedElsPlannerInputs
  vaultLevels: SharedVaultLevels
  moduleProgressInputs: SharedModuleProgressInputs
  shardSplitterInputs: SharedShardSplitterInputs
  uwCalcProgress: UwProgressLevels
  labsCalcByLab: SharedLabsCalcByLab
  thornsCalculatorSettings: SharedThornsCalculatorSettings
  damageReduxCalculatorSettings: SharedDamageReduxCalculatorSettings
  dissonanceCalculatorState: SharedDissonanceCalculatorState
  botMedalSplitterPlanner: SharedBotMedalSplitterPlanner
  botsSynchronicity: SharedBotsSynchronicity
}

export const extendedSharedToolInputsSchema = z.object({
  workshopStatLevels: sharedWorkshopStatLevelsSchema,
  enemyStatsCore: sharedEnemyStatsCoreSchema,
  enemyDropsInputs: sharedEnemyDropsInputsSchema,
  cardsProgressInputs: sharedCardsProgressInputsSchema,
  elsPlannerInputs: sharedElsPlannerInputsSchema,
  vaultLevels: sharedVaultLevelsSchema,
  moduleProgressInputs: sharedModuleProgressInputsSchema,
  shardSplitterInputs: sharedShardSplitterInputsSchema,
  uwCalcProgress: uwProgressLevelsSchema,
  labsCalcByLab: sharedLabsCalcByLabSchema,
  thornsCalculatorSettings: sharedThornsCalculatorSettingsSchema,
  damageReduxCalculatorSettings: sharedDamageReduxCalculatorSettingsSchema,
  dissonanceCalculatorState: sharedDissonanceCalculatorStateSchema,
  botMedalSplitterPlanner: sharedBotMedalSplitterPlannerSchema,
  botsSynchronicity: sharedBotsSynchronicitySchema,
})

export const defaultExtendedSharedToolInputs: Readonly<SharedToolInputsExtended> = {
  workshopStatLevels: { ...defaultSharedWorkshopStatLevels },
  enemyStatsCore: { ...defaultSharedEnemyStatsCore },
  enemyDropsInputs: { ...defaultSharedEnemyDropsInputs },
  cardsProgressInputs: { ...defaultSharedCardsProgressInputs },
  elsPlannerInputs: { ...defaultSharedElsPlannerInputs },
  vaultLevels: { ...defaultSharedVaultLevels },
  moduleProgressInputs: { ...defaultSharedModuleProgressInputs },
  shardSplitterInputs: {
    splitterByType: { ...defaultSharedShardSplitterInputs.splitterByType },
    costsAssistEffPctByType: { ...defaultSharedShardSplitterInputs.costsAssistEffPctByType },
  },
  uwCalcProgress: {},
  labsCalcByLab: {},
  thornsCalculatorSettings: { ...defaultSharedThornsCalculatorSettings },
  damageReduxCalculatorSettings: { ...defaultSharedDamageReduxCalculatorSettings },
  dissonanceCalculatorState: {
    echoLabsLocked: defaultSharedDissonanceCalculatorState.echoLabsLocked,
    wavesByTier: { ...defaultSharedDissonanceCalculatorState.wavesByTier },
    maxByTier: { ...defaultSharedDissonanceCalculatorState.maxByTier },
  },
  botMedalSplitterPlanner: {
    ...defaultSharedBotMedalSplitterPlanner,
    presets: defaultSharedBotMedalSplitterPlanner.presets.map(preset => ({ ...preset })),
  },
  botsSynchronicity: { ...defaultSharedBotsSynchronicity },
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
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) out[key] = parsed
  }
  return out
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string') out[key] = raw
  }
  return out
}

function serializeTierSelection(value: TierSelectionInput): number | string {
  return typeof value === 'number' ? value : value
}

export function readSharedEnemyStatsCore(state: Pick<
  EnemyStatsCalcsLocalState,
  | 'tierSelection'
  | 'wave'
  | 'healthSkipInput'
  | 'attackSkipInput'
  | 'reverseEnemyType'
  | 'targetHpVal'
  | 'targetDamageVal'
  | 'battleConditions'
>): SharedEnemyStatsCore {
  return {
    tierSelection: serializeTierSelection(state.tierSelection),
    wave: state.wave,
    healthSkipInput: state.healthSkipInput,
    attackSkipInput: state.attackSkipInput,
    reverseEnemyType: state.reverseEnemyType,
    targetHpVal: state.targetHpVal,
    targetDamageVal: state.targetDamageVal,
    battleConditions: state.battleConditions.map(condition => ({ ...condition })),
  }
}

export function readSharedElsPlannerInputs(state: Pick<
  EnemyStatsCalcsLocalState,
  | 'elsAttackLevel'
  | 'elsHealthLevel'
  | 'elsEnhancementLevel'
  | 'elsReferenceWave'
  | 'elsUtilityDiscountPct'
  | 'elsEnhancementDiscountPct'
  | 'elsEnhancementVaultDiscountPct'
  | 'elsVaultAttackStars'
  | 'elsVaultHealthStars'
  | 'elsModulePrimaryAttackPct'
  | 'elsModuleAssistAttackPct'
  | 'elsModulePrimaryHealthPct'
  | 'elsModuleAssistHealthPct'
  | 'elsModulePrimaryAttackRarity'
  | 'elsModuleAssistAttackRarity'
  | 'elsModulePrimaryHealthRarity'
  | 'elsModuleAssistHealthRarity'
  | 'elsAssistSubstatEfficiency'
  | 'elsLabAttackLevel'
  | 'elsLabHealthLevel'
  | 'elsFocus'
  | 'elsMaxSteps'
  | 'elsCoinBudgetVal'
>): SharedElsPlannerInputs {
  return {
    elsAttackLevel: state.elsAttackLevel,
    elsHealthLevel: state.elsHealthLevel,
    elsEnhancementLevel: state.elsEnhancementLevel,
    elsReferenceWave: state.elsReferenceWave,
    elsUtilityDiscountPct: state.elsUtilityDiscountPct,
    elsEnhancementDiscountPct: state.elsEnhancementDiscountPct,
    elsEnhancementVaultDiscountPct: state.elsEnhancementVaultDiscountPct,
    elsVaultAttackStars: state.elsVaultAttackStars,
    elsVaultHealthStars: state.elsVaultHealthStars,
    elsModulePrimaryAttackPct: state.elsModulePrimaryAttackPct,
    elsModuleAssistAttackPct: state.elsModuleAssistAttackPct,
    elsModulePrimaryHealthPct: state.elsModulePrimaryHealthPct,
    elsModuleAssistHealthPct: state.elsModuleAssistHealthPct,
    elsModulePrimaryAttackRarity: state.elsModulePrimaryAttackRarity,
    elsModuleAssistAttackRarity: state.elsModuleAssistAttackRarity,
    elsModulePrimaryHealthRarity: state.elsModulePrimaryHealthRarity,
    elsModuleAssistHealthRarity: state.elsModuleAssistHealthRarity,
    elsAssistSubstatEfficiency: state.elsAssistSubstatEfficiency,
    elsLabAttackLevel: state.elsLabAttackLevel,
    elsLabHealthLevel: state.elsLabHealthLevel,
    elsFocus: state.elsFocus,
    elsMaxSteps: state.elsMaxSteps,
    elsCoinBudgetVal: state.elsCoinBudgetVal,
  }
}

export function readSharedThornsCalculatorSettings(settings: ThornsCalcsSettings): SharedThornsCalculatorSettings {
  return {
    baseThorns: settings.baseThorns,
    tier: settings.tier,
    pcLevel: settings.pcLevel,
    pcMasteryLevel: settings.pcMasteryLevel,
    tournamentTier: settings.tournamentTier,
    heatWave: settings.heatWave,
    startWallThorns: settings.startWallThorns,
  }
}

export function readSharedDamageReduxCalculatorSettings(
  state: DamageReduxCalcsLocalState,
): SharedDamageReduxCalculatorSettings {
  const {
    perkEnemyHpMinus50: _a,
    perkBossHpX8: _b,
    perkBossHpMinus70: _c,
    perkEnemyDmgMinus50: _d,
    perkEnemyDmgX25: _e,
    perkRangedDmgX3: _f,
    botBotBonusMultiplier: _g,
    damageReduxColumnOrder: _h,
    selectedDamageReduxColumnKeys: _i,
    reorderDamageReduxColumns: _j,
    openPanels: _k,
    perksPanel: _l,
    ...settings
  } = state
  return settings
}

export function readSharedDissonanceCalculatorState(
  state: Pick<DissonanceCalcsLocalState, 'echoLabsLocked' | 'wavesByTier' | 'maxByTier'>,
): SharedDissonanceCalculatorState {
  return {
    echoLabsLocked: state.echoLabsLocked,
    wavesByTier: Object.fromEntries(
      Object.entries(state.wavesByTier).map(([tier, waves]) => [tier, { ...waves }]),
    ),
    maxByTier: Object.fromEntries(
      Object.entries(state.maxByTier).map(([tier, flags]) => [tier, { ...flags }]),
    ),
  }
}

export function readSharedBotMedalSplitterPlanner(input: {
  activePreset: number
  plannerTab: 'allocation' | 'inputs'
  editorBotLabel: string
  presets: BotMedalSplitterPreset[]
}): SharedBotMedalSplitterPlanner {
  return {
    activePreset: input.activePreset,
    plannerTab: input.plannerTab === 'inputs' ? 'inputs' : 'allocation',
    editorBotLabel: input.editorBotLabel,
    presets: input.presets.map(preset => ({
      budget: preset.budget,
      towerRange: preset.towerRange,
      singularityHarnessRarity: preset.singularityHarnessRarity,
      vaultBotRangeLevel: preset.vaultBotRangeLevel,
      useBotBotPlus: preset.useBotBotPlus,
      botBotEnabled: preset.botBotEnabled,
      botBotSynced: preset.botBotSynced,
      targetConfigs: Object.fromEntries(
        Object.entries(preset.targetConfigs).map(([key, config]) => [key, { ...config, baseLocks: { ...config.baseLocks }, plusLocks: { ...config.plusLocks } }]),
      ),
      targetOrder: [...preset.targetOrder],
      plannerFocusOrder: [...preset.plannerFocusOrder],
      botBotBaseLocks: { ...preset.botBotBaseLocks },
      botBotPlusLocks: { ...preset.botBotPlusLocks },
    })),
  }
}

export function normalizeExtendedSharedToolInputs(value: unknown): SharedToolInputsExtended {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const workshop = source.workshopStatLevels && typeof source.workshopStatLevels === 'object'
    ? source.workshopStatLevels as Record<string, unknown>
    : {}
  const enemyCore = source.enemyStatsCore && typeof source.enemyStatsCore === 'object'
    ? source.enemyStatsCore as Record<string, unknown>
    : {}
  const els = source.elsPlannerInputs && typeof source.elsPlannerInputs === 'object'
    ? source.elsPlannerInputs as Record<string, unknown>
    : {}
  const vault = source.vaultLevels && typeof source.vaultLevels === 'object'
    ? source.vaultLevels as Record<string, unknown>
    : {}
  const moduleProgress = source.moduleProgressInputs && typeof source.moduleProgressInputs === 'object'
    ? source.moduleProgressInputs as Record<string, unknown>
    : {}
  const shardSplitter = source.shardSplitterInputs && typeof source.shardSplitterInputs === 'object'
    ? source.shardSplitterInputs as Record<string, unknown>
    : {}
  const thorns = source.thornsCalculatorSettings && typeof source.thornsCalculatorSettings === 'object'
    ? source.thornsCalculatorSettings as Record<string, unknown>
    : {}
  const damageRedux = source.damageReduxCalculatorSettings && typeof source.damageReduxCalculatorSettings === 'object'
    ? source.damageReduxCalculatorSettings as Record<string, unknown>
    : {}
  const dissonance = source.dissonanceCalculatorState && typeof source.dissonanceCalculatorState === 'object'
    ? source.dissonanceCalculatorState as Record<string, unknown>
    : {}
  const medalPlanner = source.botMedalSplitterPlanner && typeof source.botMedalSplitterPlanner === 'object'
    ? source.botMedalSplitterPlanner as Record<string, unknown>
    : {}
  const synchronicity = source.botsSynchronicity && typeof source.botsSynchronicity === 'object'
    ? source.botsSynchronicity as Record<string, unknown>
    : {}
  const enemyDrops = source.enemyDropsInputs && typeof source.enemyDropsInputs === 'object'
    ? source.enemyDropsInputs as Record<string, unknown>
    : {}
  const cardsProgress = source.cardsProgressInputs && typeof source.cardsProgressInputs === 'object'
    ? source.cardsProgressInputs as Record<string, unknown>
    : {}

  const normalizedEnemy = normalizeEnemyStatsCalcsLocalState({
    ...defaultEnemyStatsCalcsLocalState(),
    tierSelection: normalizeTierSelection(enemyCore.tierSelection),
    wave: enemyCore.wave,
    healthSkipInput: enemyCore.healthSkipInput,
    attackSkipInput: enemyCore.attackSkipInput,
    reverseEnemyType: enemyCore.reverseEnemyType,
    targetHpVal: enemyCore.targetHpVal,
    targetDamageVal: enemyCore.targetDamageVal,
    battleConditions: enemyCore.battleConditions,
    ...els,
  })

  const normalizedThorns = normalizeThornsCalcsLocalState({
    settings: {
      ...defaultThornsCalcsSettings(),
      ...thorns,
    },
  }).settings

  const normalizedDamageRedux = normalizeDamageReduxCalcsLocalState({
    ...defaultDamageReduxCalcsLocalState,
    ...damageRedux,
  })

  const normalizedDissonance = normalizeDissonanceCalcsLocalState({
    ...defaultDissonanceCalcsLocalState(),
    echoLabsLocked: dissonance.echoLabsLocked,
    wavesByTier: dissonance.wavesByTier,
    maxByTier: dissonance.maxByTier,
  })

  const normalized = {
    workshopStatLevels: {
      levels: normalizeNumberRecord(workshop.levels),
      targets: normalizeNumberRecord(workshop.targets),
      enhancementLevels: normalizeNumberRecord(workshop.enhancementLevels),
      enhancementTargets: normalizeNumberRecord(workshop.enhancementTargets),
      coinCurrentLevels: normalizeNumberRecord(workshop.coinCurrentLevels),
      coinTargetLevels: normalizeNumberRecord(workshop.coinTargetLevels),
      cashCurrentLevels: normalizeNumberRecord(workshop.cashCurrentLevels),
      cashTargetLevels: normalizeNumberRecord(workshop.cashTargetLevels),
    },
    enemyStatsCore: readSharedEnemyStatsCore(normalizedEnemy),
    enemyDropsInputs: normalizeSharedEnemyDropsInputs(enemyDrops),
    cardsProgressInputs: normalizeSharedCardsProgressInputs(cardsProgress),
    elsPlannerInputs: readSharedElsPlannerInputs(normalizedEnemy),
    vaultLevels: {
      levels: normalizeNumberRecord(vault.levels),
      spentKeys: clampInt(vault.spentKeys, 0, 0, 999999),
    },
    moduleProgressInputs: {
      currentLevel: normalizeNumberRecord(moduleProgress.currentLevel),
      targetLevel: normalizeNumberRecord(moduleProgress.targetLevel),
      assistCurrentLevel: normalizeNumberRecord(moduleProgress.assistCurrentLevel),
      assistTargetLevel: normalizeNumberRecord(moduleProgress.assistTargetLevel),
      lastRarityByType: normalizeStringRecord(moduleProgress.lastRarityByType),
      lastAssistRarityByType: normalizeStringRecord(moduleProgress.lastAssistRarityByType),
      costsAssistEffPct: clampInt(moduleProgress.costsAssistEffPct, 25, 0, 100),
      costsAssistEffPctByType: normalizeNumberRecord(moduleProgress.costsAssistEffPctByType),
      ...(typeof moduleProgress.generatorEquippedUniqueId === 'string' && moduleProgress.generatorEquippedUniqueId.length > 0
        ? { generatorEquippedUniqueId: moduleProgress.generatorEquippedUniqueId }
        : {}),
    },
    shardSplitterInputs: {
      splitterByType: createDefaultShardSplitterSnapshot().splitterByType,
      costsAssistEffPctByType: createDefaultShardSplitterSnapshot().costsAssistEffPctByType,
    },
    uwCalcProgress: normalizeNestedNumberRecord(source.uwCalcProgress),
    labsCalcByLab: sharedLabsCalcByLabSchema.catch({}).parse(source.labsCalcByLab ?? {}),
    thornsCalculatorSettings: readSharedThornsCalculatorSettings(normalizedThorns),
    damageReduxCalculatorSettings: readSharedDamageReduxCalculatorSettings(normalizedDamageRedux),
    dissonanceCalculatorState: readSharedDissonanceCalculatorState(normalizedDissonance),
    botMedalSplitterPlanner: defaultSharedBotMedalSplitterPlanner,
    botsSynchronicity: {
      enabled: synchronicity.enabled === true,
      slotsOwned: clampInt(synchronicity.slotsOwned, 0, 0, 12),
      slotsTarget: clampInt(synchronicity.slotsTarget, 0, 0, 12),
      assignments: Array.isArray(synchronicity.assignments)
        ? synchronicity.assignments.map(slot => Array.isArray(slot) ? slot.filter(label => typeof label === 'string') : [])
        : [],
    },
  }

  if (shardSplitter.splitterByType) {
    const parsed = splitterByTypeSchema.safeParse(shardSplitter.splitterByType)
    if (parsed.success) normalized.shardSplitterInputs.splitterByType = parsed.data
  }
  if (shardSplitter.costsAssistEffPctByType && typeof shardSplitter.costsAssistEffPctByType === 'object') {
    const costs = shardSplitter.costsAssistEffPctByType as Record<string, unknown>
    normalized.shardSplitterInputs.costsAssistEffPctByType = {
      cannon: clampInt(costs.cannon, 25, 0, 100),
      defense: clampInt(costs.defense, 25, 0, 100),
      generator: clampInt(costs.generator, 25, 0, 100),
      core: clampInt(costs.core, 25, 0, 100),
    }
  }

  if (Array.isArray(medalPlanner.presets)) {
    normalized.botMedalSplitterPlanner = {
      activePreset: clampInt(medalPlanner.activePreset, 0, 0, BOT_MEDAL_SPLITTER_PRESET_COUNT - 1),
      plannerTab: medalPlanner.plannerTab === 'inputs' ? 'inputs' : 'allocation',
      editorBotLabel: typeof medalPlanner.editorBotLabel === 'string' ? medalPlanner.editorBotLabel : defaultSharedBotMedalSplitterPlanner.editorBotLabel,
      presets: medalPlanner.presets.slice(0, BOT_MEDAL_SPLITTER_PRESET_COUNT).map((preset, index) => {
        const sourcePreset = preset && typeof preset === 'object' ? preset as Record<string, unknown> : {}
        const fallback = defaultSharedBotMedalSplitterPlanner.presets[index] ?? defaultSharedBotMedalSplitterPlanner.presets[0]
        return {
          budget: clampInt(sourcePreset.budget, fallback.budget, 0, 999999999),
          towerRange: clampInt(sourcePreset.towerRange, fallback.towerRange, 0, 1000),
          singularityHarnessRarity: normalizeBotMedalSplitterShRarity(sourcePreset.singularityHarnessRarity),
          vaultBotRangeLevel: clampInt(sourcePreset.vaultBotRangeLevel, fallback.vaultBotRangeLevel, 0, 99),
          useBotBotPlus: sourcePreset.useBotBotPlus === true,
          botBotEnabled: sourcePreset.botBotEnabled === true,
          botBotSynced: sourcePreset.botBotSynced === true,
          targetConfigs: {},
          targetOrder: Array.isArray(sourcePreset.targetOrder)
            ? sourcePreset.targetOrder.filter(entry => typeof entry === 'string')
            : [...fallback.targetOrder],
          plannerFocusOrder: Array.isArray(sourcePreset.plannerFocusOrder)
            ? sourcePreset.plannerFocusOrder.filter(entry => typeof entry === 'string')
            : [...fallback.plannerFocusOrder],
          botBotBaseLocks: {},
          botBotPlusLocks: {},
        }
      }),
    }
  }

  return extendedSharedToolInputsSchema.parse(normalized)
}

function mergeNumberRecords(
  ...sources: Array<Record<string, number> | undefined>
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const source of sources) {
    if (!source) continue
    for (const [key, value] of Object.entries(source)) {
      if (!Number.isFinite(value)) continue
      const existing = out[key]
      if (existing == null || value > existing) out[key] = value
    }
  }
  return out
}

function mergeNestedNumberRecords(
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

export function mergeExtendedSharedToolInputs(
  existing: SharedToolInputsExtended,
  incoming: SharedToolInputsExtended,
): SharedToolInputsExtended {
  return normalizeExtendedSharedToolInputs({
    workshopStatLevels: {
      levels: mergeNumberRecords(existing.workshopStatLevels.levels, incoming.workshopStatLevels.levels),
      targets: mergeNumberRecords(existing.workshopStatLevels.targets, incoming.workshopStatLevels.targets),
      enhancementLevels: mergeNumberRecords(existing.workshopStatLevels.enhancementLevels, incoming.workshopStatLevels.enhancementLevels),
      enhancementTargets: mergeNumberRecords(existing.workshopStatLevels.enhancementTargets, incoming.workshopStatLevels.enhancementTargets),
      coinCurrentLevels: mergeNumberRecords(existing.workshopStatLevels.coinCurrentLevels, incoming.workshopStatLevels.coinCurrentLevels),
      coinTargetLevels: mergeNumberRecords(existing.workshopStatLevels.coinTargetLevels, incoming.workshopStatLevels.coinTargetLevels),
      cashCurrentLevels: mergeNumberRecords(existing.workshopStatLevels.cashCurrentLevels, incoming.workshopStatLevels.cashCurrentLevels),
      cashTargetLevels: mergeNumberRecords(existing.workshopStatLevels.cashTargetLevels, incoming.workshopStatLevels.cashTargetLevels),
    },
    enemyStatsCore: {
      ...existing.enemyStatsCore,
      tierSelection: incoming.enemyStatsCore.tierSelection ?? existing.enemyStatsCore.tierSelection,
      wave: incoming.enemyStatsCore.wave ?? existing.enemyStatsCore.wave,
      healthSkipInput: incoming.enemyStatsCore.healthSkipInput ?? existing.enemyStatsCore.healthSkipInput,
      attackSkipInput: incoming.enemyStatsCore.attackSkipInput ?? existing.enemyStatsCore.attackSkipInput,
      reverseEnemyType: incoming.enemyStatsCore.reverseEnemyType ?? existing.enemyStatsCore.reverseEnemyType,
      targetHpVal: incoming.enemyStatsCore.targetHpVal ?? existing.enemyStatsCore.targetHpVal,
      targetDamageVal: incoming.enemyStatsCore.targetDamageVal ?? existing.enemyStatsCore.targetDamageVal,
      battleConditions: incoming.enemyStatsCore.battleConditions.length
        ? incoming.enemyStatsCore.battleConditions
        : existing.enemyStatsCore.battleConditions,
    },
    enemyDropsInputs: normalizeSharedEnemyDropsInputs({
      ...existing.enemyDropsInputs,
      ...incoming.enemyDropsInputs,
    }),
    cardsProgressInputs: normalizeSharedCardsProgressInputs({
      ...existing.cardsProgressInputs,
      ...incoming.cardsProgressInputs,
    }),
    elsPlannerInputs: incoming.elsPlannerInputs,
    vaultLevels: {
      levels: mergeNumberRecords(existing.vaultLevels.levels, incoming.vaultLevels.levels),
      spentKeys: incoming.vaultLevels.spentKeys || existing.vaultLevels.spentKeys,
    },
    moduleProgressInputs: {
      currentLevel: mergeNumberRecords(existing.moduleProgressInputs.currentLevel, incoming.moduleProgressInputs.currentLevel),
      targetLevel: mergeNumberRecords(existing.moduleProgressInputs.targetLevel, incoming.moduleProgressInputs.targetLevel),
      assistCurrentLevel: mergeNumberRecords(existing.moduleProgressInputs.assistCurrentLevel, incoming.moduleProgressInputs.assistCurrentLevel),
      assistTargetLevel: mergeNumberRecords(existing.moduleProgressInputs.assistTargetLevel, incoming.moduleProgressInputs.assistTargetLevel),
      lastRarityByType: { ...existing.moduleProgressInputs.lastRarityByType, ...incoming.moduleProgressInputs.lastRarityByType },
      lastAssistRarityByType: { ...existing.moduleProgressInputs.lastAssistRarityByType, ...incoming.moduleProgressInputs.lastAssistRarityByType },
      costsAssistEffPct: incoming.moduleProgressInputs.costsAssistEffPct || existing.moduleProgressInputs.costsAssistEffPct,
      costsAssistEffPctByType: mergeNumberRecords(
        existing.moduleProgressInputs.costsAssistEffPctByType,
        incoming.moduleProgressInputs.costsAssistEffPctByType,
      ),
    },
    shardSplitterInputs: mergeShardSplitterInputs(existing.shardSplitterInputs, incoming.shardSplitterInputs),
    uwCalcProgress: mergeNestedNumberRecords(existing.uwCalcProgress, incoming.uwCalcProgress),
    labsCalcByLab: { ...existing.labsCalcByLab, ...incoming.labsCalcByLab },
    thornsCalculatorSettings: incoming.thornsCalculatorSettings,
    damageReduxCalculatorSettings: incoming.damageReduxCalculatorSettings,
    dissonanceCalculatorState: incoming.dissonanceCalculatorState,
    botMedalSplitterPlanner: incoming.botMedalSplitterPlanner,
    botsSynchronicity: incoming.botsSynchronicity,
  })
}

export function applySharedElsPlannerToEnemyStats(
  state: EnemyStatsCalcsLocalState,
  els: SharedElsPlannerInputs,
): void {
  state.elsAttackLevel = els.elsAttackLevel
  state.elsHealthLevel = els.elsHealthLevel
  state.elsEnhancementLevel = els.elsEnhancementLevel
  state.elsReferenceWave = els.elsReferenceWave
  state.elsUtilityDiscountPct = els.elsUtilityDiscountPct
  state.elsEnhancementDiscountPct = els.elsEnhancementDiscountPct
  state.elsEnhancementVaultDiscountPct = els.elsEnhancementVaultDiscountPct
  state.elsVaultAttackStars = els.elsVaultAttackStars
  state.elsVaultHealthStars = els.elsVaultHealthStars
  state.elsModulePrimaryAttackPct = els.elsModulePrimaryAttackPct
  state.elsModuleAssistAttackPct = els.elsModuleAssistAttackPct
  state.elsModulePrimaryHealthPct = els.elsModulePrimaryHealthPct
  state.elsModuleAssistHealthPct = els.elsModuleAssistHealthPct
  state.elsModulePrimaryAttackRarity = els.elsModulePrimaryAttackRarity as EnemyStatsCalcsLocalState['elsModulePrimaryAttackRarity']
  state.elsModuleAssistAttackRarity = els.elsModuleAssistAttackRarity as EnemyStatsCalcsLocalState['elsModuleAssistAttackRarity']
  state.elsModulePrimaryHealthRarity = els.elsModulePrimaryHealthRarity as EnemyStatsCalcsLocalState['elsModulePrimaryHealthRarity']
  state.elsModuleAssistHealthRarity = els.elsModuleAssistHealthRarity as EnemyStatsCalcsLocalState['elsModuleAssistHealthRarity']
  state.elsAssistSubstatEfficiency = els.elsAssistSubstatEfficiency
  state.elsLabAttackLevel = els.elsLabAttackLevel
  state.elsLabHealthLevel = els.elsLabHealthLevel
  state.elsFocus = els.elsFocus as EnemyStatsCalcsElsFocus
  state.elsMaxSteps = els.elsMaxSteps
  state.elsCoinBudgetVal = els.elsCoinBudgetVal
}

export function applySharedEnemyStatsCore(
  state: EnemyStatsCalcsLocalState,
  core: SharedEnemyStatsCore,
): void {
  state.tierSelection = normalizeTierSelection(core.tierSelection)
  state.wave = core.wave
  state.healthSkipInput = core.healthSkipInput
  state.attackSkipInput = core.attackSkipInput
  state.reverseEnemyType = core.reverseEnemyType as EnemyStatsCalcsLocalState['reverseEnemyType']
  state.targetHpVal = core.targetHpVal
  state.targetDamageVal = core.targetDamageVal
  state.battleConditions = core.battleConditions.map(condition => ({ ...condition })) as BattleConditionSelection[]
}

function mergeSplitterData(existing: SplitterData, incoming: SplitterData): SplitterData {
  return {
    budget: incoming.budget ?? existing.budget,
    unspentShards: incoming.unspentShards ?? existing.unspentShards,
    assistEffPct: incoming.assistEffPct ?? existing.assistEffPct,
    primaryLevel: incoming.primaryLevel ?? existing.primaryLevel,
    secondaryLevel: incoming.secondaryLevel ?? existing.secondaryLevel,
    primaryRarity: incoming.primaryRarity || existing.primaryRarity,
    secondaryRarity: incoming.secondaryRarity || existing.secondaryRarity,
  }
}

/** Merge save-derived shard splitter rows over existing hub/tool state (per module type). */
export function mergeShardSplitterInputs(
  existing: SharedShardSplitterInputs,
  incoming: Partial<SharedShardSplitterInputs>,
): SharedShardSplitterInputs {
  const moduleTypes = ['cannon', 'defense', 'generator', 'core'] as const
  const splitterByType = { ...existing.splitterByType } as SplitterByType
  for (const moduleType of moduleTypes) {
    const incomingEntry = incoming.splitterByType?.[moduleType]
    if (!incomingEntry) continue
    splitterByType[moduleType] = mergeSplitterData(existing.splitterByType[moduleType], incomingEntry)
  }

  const costsAssistEffPctByType = { ...existing.costsAssistEffPctByType }
  for (const moduleType of moduleTypes) {
    const incomingPct = incoming.costsAssistEffPctByType?.[moduleType]
    if (incomingPct != null) costsAssistEffPctByType[moduleType] = incomingPct
    else if (incoming.splitterByType?.[moduleType]?.assistEffPct != null) {
      costsAssistEffPctByType[moduleType] = incoming.splitterByType[moduleType].assistEffPct
    }
  }

  return { splitterByType, costsAssistEffPctByType }
}

export function applySharedShardSplitterInputs(
  splitterByType: SplitterByType,
  costsAssistEffPctByType: Record<'cannon' | 'defense' | 'generator' | 'core', number>,
  shared: SharedShardSplitterInputs,
): void {
  for (const moduleType of ['cannon', 'defense', 'generator', 'core'] as const) {
    splitterByType[moduleType] = { ...shared.splitterByType[moduleType] }
    costsAssistEffPctByType[moduleType] = shared.costsAssistEffPctByType[moduleType]
  }
}
