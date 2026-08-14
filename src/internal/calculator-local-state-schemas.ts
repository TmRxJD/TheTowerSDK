import { z } from 'zod'
import { MAX_CAMPAIGN_TIER } from '../data/campaign-tier'
import { clampAssistModuleSlotEfficiencyPct, MAX_ASSIST_MULTIPLIER_EFFICIENCY_PCT } from './assist-module-efficiency'
import {
  normalizeEnhancementSectionDiscountPercent,
  normalizeEnhancementVaultDiscountPercent,
  normalizeWorkshopSectionDiscountPercent,
} from '../data/workshop-discount-normalize'
import {
  buildDefaultShardSplitterSnapshot,
  type ModuleType,
  normalizeShardSplitterSnapshot,
  type SplitterByType,
} from './shard-splitter-schema'
import { buildNormalizerPersistenceSchema } from './local-persistence-types'

export type LabCalcRange = {
  current: number | null
  target: number | null
}

export type LabsCalcsLocalState = {
  selectedLabType: string
  selectedLabName: string | null
  calcSpeedLevel: number
  calcDiscountLevel: number
  calcRelic: number
  speedUp: number
  calcGemMultiplier: number | null
  hasCustomCalcSpeedLevel: boolean
  hasCustomCalcDiscountLevel: boolean
  hasCustomCalcRelic: boolean
  hasCustomSpeedUp: boolean
  hasCustomGemMultiplier: boolean
  calcByLab: Record<string, LabCalcRange>
}

export type SplitColumnKey =
  | 'curLevel' | 'curSpent' | 'curSpentTotal' | 'curRemain' | 'curRemainTotal' | 'curBonus' | 'curEffAssistBonus' | 'curTotalBonus'
  | 'tgtSpent' | 'tgtSpentTotal' | 'tgtRemain' | 'tgtRemainTotal' | 'tgtBonus' | 'tgtEffAssistBonus' | 'tgtTotalBonus'

export type DamagePathColumnKey =
  | 'step' | 'type' | 'eff' | 'stoneCost' | 'cumStoneCost' | 'primaryLevel' | 'assistLevel' | 'primaryMult' | 'assistMult' | 'cannonMult' | 'coreMult' | 'dmgPerStone' | 'dmgIncrease' | 'damagePctIncrease' | 'cumulativeDamage'

export type ShardSplitterColumns = {
  splitOrder: SplitColumnKey[]
  splitSelected: SplitColumnKey[]
  damagePathOrder: DamagePathColumnKey[]
  damagePathSelected: DamagePathColumnKey[]
}

export type ShardSplitterLocalState = {
  selectedModuleType: ModuleType
  splitterByType: SplitterByType
  costsAssistEffPctByType: Record<ModuleType, number>
  shardDiscount: number
  effMultiLabLevelCannon: number
  effMultiLabLevelCore: number
  damagePathCannonPrimaryLevel: number
  damagePathCannonSecondaryLevel: number
  damagePathCannonPrimaryRarity: string
  damagePathCannonSecondaryRarity: string
  damagePathCannonAssistEffPct: number
  damagePathCannonUnspentShards: number
  damagePathCorePrimaryLevel: number
  damagePathCoreSecondaryLevel: number
  damagePathCorePrimaryRarity: string
  damagePathCoreSecondaryRarity: string
  damagePathCoreAssistEffPct: number
  damagePathCoreUnspentShards: number
  shardSplitterTab: 'splitter' | 'damage-path'
  shardSplitterInputsExpanded: boolean
  shardSplitterDamagePathGlobalExpanded: boolean
  shardSplitterDamagePathValuesExpanded: boolean
  columns: ShardSplitterColumns
}

const labCalcRangeSchema = z.object({
  current: z.number().nullable(),
  target: z.number().nullable(),
})

export const labsCalcsLocalStateSchema = z.object({
  selectedLabType: z.string(),
  selectedLabName: z.string().nullable(),
  calcSpeedLevel: z.number(),
  calcDiscountLevel: z.number(),
  calcRelic: z.number(),
  speedUp: z.number(),
  calcGemMultiplier: z.number().nullable(),
  hasCustomCalcSpeedLevel: z.boolean(),
  hasCustomCalcDiscountLevel: z.boolean(),
  hasCustomCalcRelic: z.boolean(),
  hasCustomSpeedUp: z.boolean(),
  hasCustomGemMultiplier: z.boolean(),
  calcByLab: z.record(z.string(), labCalcRangeSchema),
})

export const defaultLabsCalcsLocalState: Readonly<LabsCalcsLocalState> = {
  selectedLabType: 'All',
  selectedLabName: null,
  calcSpeedLevel: 0,
  calcDiscountLevel: 0,
  calcRelic: 0,
  speedUp: 1,
  calcGemMultiplier: null,
  hasCustomCalcSpeedLevel: false,
  hasCustomCalcDiscountLevel: false,
  hasCustomCalcRelic: false,
  hasCustomSpeedUp: false,
  hasCustomGemMultiplier: false,
  calcByLab: {},
}

function asObjectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function normalizeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeLabCalcRange(value: unknown): LabCalcRange | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  const currentRaw = source.current
  const targetRaw = source.target
  const current = currentRaw === null || Number.isFinite(Number(currentRaw))
    ? (currentRaw === null ? null : Number(currentRaw))
    : null
  const target = targetRaw === null || Number.isFinite(Number(targetRaw))
    ? (targetRaw === null ? null : Number(targetRaw))
    : null
  return { current, target }
}

function normalizeCalcByLab(value: unknown): Record<string, LabCalcRange> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, LabCalcRange> = {}
  for (const [labName, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!labName) continue
    const normalized = normalizeLabCalcRange(entry)
    if (!normalized) continue
    out[labName] = normalized
  }
  return out
}

export function normalizeLabsCalcsLocalState(input: unknown, base: LabsCalcsLocalState = defaultLabsCalcsLocalState): LabsCalcsLocalState {
  const data = asObjectRecord(input)
  const gemRaw = data.calcGemMultiplier
  return labsCalcsLocalStateSchema.parse({
    selectedLabType: typeof data.selectedLabType === 'string' && data.selectedLabType
      ? data.selectedLabType
      : base.selectedLabType,
    selectedLabName: data.selectedLabName === null || typeof data.selectedLabName === 'string'
      ? (data.selectedLabName as string | null)
      : base.selectedLabName,
    calcSpeedLevel: Math.max(0, Math.min(99, Math.floor(normalizeNumber(data.calcSpeedLevel, base.calcSpeedLevel)))),
    calcDiscountLevel: Math.max(0, Math.min(99, Math.floor(normalizeNumber(data.calcDiscountLevel, base.calcDiscountLevel)))),
    calcRelic: Math.max(0, normalizeNumber(data.calcRelic, base.calcRelic)),
    speedUp: Math.max(1, normalizeNumber(data.speedUp, base.speedUp)),
    calcGemMultiplier: gemRaw == null ? null : Math.max(1, normalizeNumber(gemRaw, base.calcGemMultiplier ?? 1)),
    hasCustomCalcSpeedLevel: data.hasCustomCalcSpeedLevel === true,
    hasCustomCalcDiscountLevel: data.hasCustomCalcDiscountLevel === true,
    hasCustomCalcRelic: data.hasCustomCalcRelic === true,
    hasCustomSpeedUp: data.hasCustomSpeedUp === true,
    hasCustomGemMultiplier: data.hasCustomGemMultiplier === true,
    calcByLab: normalizeCalcByLab(data.calcByLab),
  })
}

const DEFAULT_CORE_SNAPSHOT = buildDefaultShardSplitterSnapshot()

const DEFAULT_COLUMNS: ShardSplitterColumns = {
  splitOrder: [
    'tgtSpent', 'tgtSpentTotal', 'tgtRemain', 'tgtRemainTotal', 'tgtBonus', 'tgtEffAssistBonus', 'tgtTotalBonus',
  ],
  splitSelected: [
    'tgtSpent', 'tgtSpentTotal', 'tgtRemain', 'tgtRemainTotal', 'tgtBonus', 'tgtEffAssistBonus', 'tgtTotalBonus',
  ],
  damagePathOrder: [
    'step', 'type', 'eff', 'stoneCost', 'cumStoneCost', 'primaryLevel', 'assistLevel', 'primaryMult', 'assistMult', 'cannonMult',
    'coreMult', 'dmgPerStone', 'dmgIncrease', 'damagePctIncrease', 'cumulativeDamage',
  ],
  damagePathSelected: [
    'step', 'type', 'eff', 'stoneCost', 'cumStoneCost', 'primaryLevel', 'assistLevel', 'primaryMult', 'assistMult', 'cannonMult',
    'coreMult', 'dmgPerStone', 'dmgIncrease', 'damagePctIncrease', 'cumulativeDamage',
  ],
}

function clampInt(value: unknown, min: number, max: number): number {
  const parsed = Math.floor(Number(value) || 0)
  return Math.max(min, Math.min(max, parsed))
}

function normalizeColumns(data: Record<string, unknown> | undefined): ShardSplitterColumns {
  if (!data || typeof data !== 'object') return { ...DEFAULT_COLUMNS }
  return {
    splitOrder: Array.isArray(data.splitOrder) ? (data.splitOrder as SplitColumnKey[]) : [...DEFAULT_COLUMNS.splitOrder],
    splitSelected: Array.isArray(data.splitSelected) ? (data.splitSelected as SplitColumnKey[]) : [...DEFAULT_COLUMNS.splitSelected],
    damagePathOrder: Array.isArray(data.damagePathOrder) ? (data.damagePathOrder as DamagePathColumnKey[]) : [...DEFAULT_COLUMNS.damagePathOrder],
    damagePathSelected: Array.isArray(data.damagePathSelected) ? (data.damagePathSelected as DamagePathColumnKey[]) : [...DEFAULT_COLUMNS.damagePathSelected],
  }
}

export const defaultShardSplitterLocalState: Readonly<ShardSplitterLocalState> = {
  selectedModuleType: 'cannon',
  splitterByType: DEFAULT_CORE_SNAPSHOT.splitterByType,
  costsAssistEffPctByType: { ...DEFAULT_CORE_SNAPSHOT.costsAssistEffPctByType },
  shardDiscount: 0,
  effMultiLabLevelCannon: 0,
  effMultiLabLevelCore: 0,
  damagePathCannonPrimaryLevel: 1,
  damagePathCannonSecondaryLevel: 1,
  damagePathCannonPrimaryRarity: 'Common',
  damagePathCannonSecondaryRarity: 'Common',
  damagePathCannonAssistEffPct: 25,
  damagePathCannonUnspentShards: 0,
  damagePathCorePrimaryLevel: 1,
  damagePathCoreSecondaryLevel: 1,
  damagePathCorePrimaryRarity: 'Common',
  damagePathCoreSecondaryRarity: 'Common',
  damagePathCoreAssistEffPct: 25,
  damagePathCoreUnspentShards: 0,
  shardSplitterTab: 'splitter',
  shardSplitterInputsExpanded: true,
  shardSplitterDamagePathGlobalExpanded: false,
  shardSplitterDamagePathValuesExpanded: false,
  columns: { ...DEFAULT_COLUMNS },
}

export function normalizeShardSplitterLocalState(
  input: unknown,
  base: ShardSplitterLocalState = defaultShardSplitterLocalState,
): ShardSplitterLocalState {
  const snapshot = asObjectRecord(input)
  const normalizedCore = normalizeShardSplitterSnapshot(snapshot)
  const columnsData = (snapshot.columns && typeof snapshot.columns === 'object')
    ? (snapshot.columns as Record<string, unknown>)
    : undefined

  return {
    selectedModuleType: normalizedCore.selectedModuleType,
    splitterByType: normalizedCore.splitterByType,
    costsAssistEffPctByType: normalizedCore.costsAssistEffPctByType,
    shardDiscount: normalizedCore.shardDiscount,
    effMultiLabLevelCannon: typeof snapshot.effMultiLabLevelCannon === 'number'
      ? clampInt(snapshot.effMultiLabLevelCannon, 0, 30)
      : base.effMultiLabLevelCannon,
    effMultiLabLevelCore: typeof snapshot.effMultiLabLevelCore === 'number'
      ? clampInt(snapshot.effMultiLabLevelCore, 0, 30)
      : base.effMultiLabLevelCore,
    damagePathCannonPrimaryLevel: typeof snapshot.damagePathCannonPrimaryLevel === 'number'
      ? Math.max(1, Math.floor(snapshot.damagePathCannonPrimaryLevel))
      : base.damagePathCannonPrimaryLevel,
    damagePathCannonSecondaryLevel: typeof snapshot.damagePathCannonSecondaryLevel === 'number'
      ? Math.max(1, Math.floor(snapshot.damagePathCannonSecondaryLevel))
      : base.damagePathCannonSecondaryLevel,
    damagePathCannonPrimaryRarity: typeof snapshot.damagePathCannonPrimaryRarity === 'string'
      ? snapshot.damagePathCannonPrimaryRarity
      : base.damagePathCannonPrimaryRarity,
    damagePathCannonSecondaryRarity: typeof snapshot.damagePathCannonSecondaryRarity === 'string'
      ? snapshot.damagePathCannonSecondaryRarity
      : base.damagePathCannonSecondaryRarity,
    damagePathCannonAssistEffPct: typeof snapshot.damagePathCannonAssistEffPct === 'number'
      ? clampInt(snapshot.damagePathCannonAssistEffPct, 0, MAX_ASSIST_MULTIPLIER_EFFICIENCY_PCT)
      : base.damagePathCannonAssistEffPct,
    damagePathCannonUnspentShards: typeof snapshot.damagePathCannonUnspentShards === 'number'
      ? Math.max(0, Math.floor(snapshot.damagePathCannonUnspentShards))
      : base.damagePathCannonUnspentShards,
    damagePathCorePrimaryLevel: typeof snapshot.damagePathCorePrimaryLevel === 'number'
      ? Math.max(1, Math.floor(snapshot.damagePathCorePrimaryLevel))
      : base.damagePathCorePrimaryLevel,
    damagePathCoreSecondaryLevel: typeof snapshot.damagePathCoreSecondaryLevel === 'number'
      ? Math.max(1, Math.floor(snapshot.damagePathCoreSecondaryLevel))
      : base.damagePathCoreSecondaryLevel,
    damagePathCorePrimaryRarity: typeof snapshot.damagePathCorePrimaryRarity === 'string'
      ? snapshot.damagePathCorePrimaryRarity
      : base.damagePathCorePrimaryRarity,
    damagePathCoreSecondaryRarity: typeof snapshot.damagePathCoreSecondaryRarity === 'string'
      ? snapshot.damagePathCoreSecondaryRarity
      : base.damagePathCoreSecondaryRarity,
    damagePathCoreAssistEffPct: typeof snapshot.damagePathCoreAssistEffPct === 'number'
      ? clampInt(snapshot.damagePathCoreAssistEffPct, 0, MAX_ASSIST_MULTIPLIER_EFFICIENCY_PCT)
      : base.damagePathCoreAssistEffPct,
    damagePathCoreUnspentShards: typeof snapshot.damagePathCoreUnspentShards === 'number'
      ? Math.max(0, Math.floor(snapshot.damagePathCoreUnspentShards))
      : base.damagePathCoreUnspentShards,
    shardSplitterTab: snapshot.shardSplitterTab === 'splitter' || snapshot.shardSplitterTab === 'damage-path'
      ? snapshot.shardSplitterTab
      : base.shardSplitterTab,
    shardSplitterInputsExpanded: typeof snapshot.shardSplitterInputsExpanded === 'boolean'
      ? snapshot.shardSplitterInputsExpanded
      : base.shardSplitterInputsExpanded,
    shardSplitterDamagePathGlobalExpanded: typeof snapshot.shardSplitterDamagePathGlobalExpanded === 'boolean'
      ? snapshot.shardSplitterDamagePathGlobalExpanded
      : base.shardSplitterDamagePathGlobalExpanded,
    shardSplitterDamagePathValuesExpanded: typeof snapshot.shardSplitterDamagePathValuesExpanded === 'boolean'
      ? snapshot.shardSplitterDamagePathValuesExpanded
      : base.shardSplitterDamagePathValuesExpanded,
    columns: normalizeColumns(columnsData),
  }
}

const MODULE_TYPES: ModuleType[] = ['cannon', 'defense', 'generator', 'core']

export const DEFAULT_MODULES_COSTS_PRIMARY_COLUMNS = [
  'bonus', 'bonusAssist', 'bonusAssistTarget', 'shard', 'coin', 'cumShard', 'invShard', 'cumCoin', 'invCoin',
] as const

export const DEFAULT_MODULES_COSTS_ASSIST_COLUMNS = [
  'baseBonus', 'effBonus', 'stones', 'shard', 'coin', 'cumStones', 'cumShard', 'invShard', 'cumCoin', 'invCoin',
] as const

export type ModulesCalcsLocalState = {
  moduleType: ModuleType
  rarity: string | null
  lastRarityByType: Record<string, string>
  lastAssistRarityByType: Record<string, string>
  coinDiscount: number
  shardDiscount: number
  currentLevel: Record<string, number>
  targetLevel: Record<string, number>
  assistCurrentLevel: Record<string, number>
  assistTargetLevel: Record<string, number>
  costsAssistEffPct: number
  costsAssistEffPctByType: Record<string, number>
  multiplierNextStoneLevel: Record<string, number>
  substatNextStoneLevel: Record<string, number>
  targetMultiplierStoneLevel: Record<string, number>
  targetSubstatStoneLevel: Record<string, number>
  costsAssistVisibleMultiplier: string[]
  costsAssistVisibleSubstat: string[]
  costsActiveTab: 'module-cost' | 'assist-module-cost'
  multiplierNextStoneCostByType: Record<string, number>
  substatNextStoneCostByType: Record<string, number>
  multiplierEfficiencyLabByType: Record<string, number>
  substatEfficiencyLabByType: Record<string, number>
  targetMultiplierEfficiencyByType: Record<string, number>
  targetSubstatEfficiencyByType: Record<string, number>
  multiplierNextStoneCost: number
  substatNextStoneCost: number
  multiplierEfficiencyLab: number
  substatEfficiencyLab: number
  targetMultiplierEfficiency: number
  targetSubstatEfficiency: number
  costsPrimaryColumnOrder: string[]
  costsPrimaryColumnSelected: string[]
  costsAssistColumnOrder: string[]
  costsAssistColumnSelected: string[]
}

export const defaultModulesCalcsLocalState: Readonly<ModulesCalcsLocalState> = {
  moduleType: 'cannon',
  rarity: null,
  lastRarityByType: {},
  lastAssistRarityByType: {},
  coinDiscount: 0,
  shardDiscount: 0,
  currentLevel: {},
  targetLevel: {},
  assistCurrentLevel: {},
  assistTargetLevel: {},
  costsAssistEffPct: 25,
  costsAssistEffPctByType: {},
  multiplierNextStoneLevel: {},
  substatNextStoneLevel: {},
  targetMultiplierStoneLevel: {},
  targetSubstatStoneLevel: {},
  costsAssistVisibleMultiplier: ['level', 'stones', 'cumulative', 'invested'],
  costsAssistVisibleSubstat: ['level', 'stones', 'cumulative', 'invested'],
  costsActiveTab: 'module-cost',
  multiplierNextStoneCostByType: {},
  substatNextStoneCostByType: {},
  multiplierEfficiencyLabByType: {},
  substatEfficiencyLabByType: {},
  targetMultiplierEfficiencyByType: {},
  targetSubstatEfficiencyByType: {},
  multiplierNextStoneCost: 0,
  substatNextStoneCost: 0,
  multiplierEfficiencyLab: 0,
  substatEfficiencyLab: 0,
  targetMultiplierEfficiency: 0,
  targetSubstatEfficiency: 0,
  costsPrimaryColumnOrder: [...DEFAULT_MODULES_COSTS_PRIMARY_COLUMNS],
  costsPrimaryColumnSelected: [...DEFAULT_MODULES_COSTS_PRIMARY_COLUMNS],
  costsAssistColumnOrder: [...DEFAULT_MODULES_COSTS_ASSIST_COLUMNS],
  costsAssistColumnSelected: [...DEFAULT_MODULES_COSTS_ASSIST_COLUMNS],
}

function normalizeRecordNumber(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const num = Number(entry)
    if (Number.isFinite(num)) out[key] = num
  }
  return out
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string') out[key] = entry
  }
  return out
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback]
  return value.filter(entry => typeof entry === 'string')
}

export function normalizeModulesCalcsLocalState(
  input: unknown,
  base: ModulesCalcsLocalState = defaultModulesCalcsLocalState,
): ModulesCalcsLocalState {
  const data = asObjectRecord(input)
  const moduleType = MODULE_TYPES.includes(data.moduleType as ModuleType)
    ? data.moduleType as ModuleType
    : base.moduleType

  return {
    moduleType,
    rarity: data.rarity === null || typeof data.rarity === 'string'
      ? (data.rarity as string | null)
      : base.rarity,
    lastRarityByType: normalizeStringRecord(data.lastRarityByType),
    lastAssistRarityByType: normalizeStringRecord(data.lastAssistRarityByType),
    coinDiscount: Math.max(0, Math.min(100, Math.floor(normalizeNumber(data.coinDiscount, base.coinDiscount)))),
    shardDiscount: Math.max(0, Math.min(100, Math.floor(normalizeNumber(data.shardDiscount, base.shardDiscount)))),
    currentLevel: normalizeRecordNumber(data.currentLevel),
    targetLevel: normalizeRecordNumber(data.targetLevel),
    assistCurrentLevel: normalizeRecordNumber(data.assistCurrentLevel),
    assistTargetLevel: normalizeRecordNumber(data.assistTargetLevel),
    costsAssistEffPct: clampAssistModuleSlotEfficiencyPct(
      normalizeNumber(data.costsAssistEffPct, base.costsAssistEffPct),
    ),
    costsAssistEffPctByType: normalizeRecordNumber(data.costsAssistEffPctByType),
    multiplierNextStoneLevel: normalizeRecordNumber(data.multiplierNextStoneLevel),
    substatNextStoneLevel: normalizeRecordNumber(data.substatNextStoneLevel),
    targetMultiplierStoneLevel: normalizeRecordNumber(data.targetMultiplierStoneLevel),
    targetSubstatStoneLevel: normalizeRecordNumber(data.targetSubstatStoneLevel),
    costsAssistVisibleMultiplier: normalizeStringArray(data.costsAssistVisibleMultiplier, base.costsAssistVisibleMultiplier),
    costsAssistVisibleSubstat: normalizeStringArray(data.costsAssistVisibleSubstat, base.costsAssistVisibleSubstat),
    costsActiveTab: data.costsActiveTab === 'module-cost' || data.costsActiveTab === 'assist-module-cost'
      ? data.costsActiveTab
      : base.costsActiveTab,
    multiplierNextStoneCostByType: normalizeRecordNumber(data.multiplierNextStoneCostByType),
    substatNextStoneCostByType: normalizeRecordNumber(data.substatNextStoneCostByType),
    multiplierEfficiencyLabByType: normalizeRecordNumber(data.multiplierEfficiencyLabByType),
    substatEfficiencyLabByType: normalizeRecordNumber(data.substatEfficiencyLabByType),
    targetMultiplierEfficiencyByType: normalizeRecordNumber(data.targetMultiplierEfficiencyByType),
    targetSubstatEfficiencyByType: normalizeRecordNumber(data.targetSubstatEfficiencyByType),
    multiplierNextStoneCost: Math.max(0, normalizeNumber(data.multiplierNextStoneCost, base.multiplierNextStoneCost)),
    substatNextStoneCost: Math.max(0, normalizeNumber(data.substatNextStoneCost, base.substatNextStoneCost)),
    multiplierEfficiencyLab: Math.max(0, normalizeNumber(data.multiplierEfficiencyLab, base.multiplierEfficiencyLab)),
    substatEfficiencyLab: Math.max(0, normalizeNumber(data.substatEfficiencyLab, base.substatEfficiencyLab)),
    targetMultiplierEfficiency: Math.max(0, normalizeNumber(data.targetMultiplierEfficiency, base.targetMultiplierEfficiency)),
    targetSubstatEfficiency: Math.max(0, normalizeNumber(data.targetSubstatEfficiency, base.targetSubstatEfficiency)),
    costsPrimaryColumnOrder: normalizeStringArray(data.costsPrimaryColumnOrder, [...DEFAULT_MODULES_COSTS_PRIMARY_COLUMNS]),
    costsPrimaryColumnSelected: normalizeStringArray(data.costsPrimaryColumnSelected, [...DEFAULT_MODULES_COSTS_PRIMARY_COLUMNS]),
    costsAssistColumnOrder: normalizeStringArray(data.costsAssistColumnOrder, [...DEFAULT_MODULES_COSTS_ASSIST_COLUMNS]),
    costsAssistColumnSelected: normalizeStringArray(data.costsAssistColumnSelected, [...DEFAULT_MODULES_COSTS_ASSIST_COLUMNS]),
  }
}

export type DamageReduxColumnKey =
  | 'baseHp' | 'baseDmg' | 'adjustedHp' | 'adjustedDmg'
  | 'hpAfterReduction' | 'dmgAfterReduction'
  | 'totalHpReductionPct' | 'totalDmgReductionPct' | 'maxHits'

export const DEFAULT_DAMAGE_REDUX_SELECTED_COLUMNS: DamageReduxColumnKey[] = [
  'baseHp', 'baseDmg', 'adjustedHp', 'adjustedDmg',
  'hpAfterReduction', 'dmgAfterReduction',
  'totalHpReductionPct', 'totalDmgReductionPct', 'maxHits',
]

export const DEFAULT_DAMAGE_REDUX_COLUMN_ORDER: DamageReduxColumnKey[] = [...DEFAULT_DAMAGE_REDUX_SELECTED_COLUMNS]

export type DamageReduxCalcsLocalState = {
  baseVal: string
  maxTowerHealthVal: string
  useDefense: boolean
  defensePct: number
  useDefAbs: boolean
  defAbsVal: string
  useCF: boolean
  cfPct: number
  useFB: boolean
  fbPct: number
  botBotBonusMultiplier: number
  useNMP: boolean
  nmpReduction: number
  nmpOrbHits: number
  usePC: boolean
  pcPct: number
  useCT: boolean
  ctLevel: number
  clPlusLevel: number
  avgClPlusHits: number
  enemyHpVal: string
  assumeMaxCtReduction: boolean
  perkEnemyDmgMinus50: boolean
  perkEnemyDmgX25: boolean
  perkRangedDmgX3: boolean
  perkEnemyHpMinus50: boolean
  perkBossHpX8: boolean
  perkBossHpMinus70: boolean
  damageReduxColumnOrder: DamageReduxColumnKey[]
  selectedDamageReduxColumnKeys: DamageReduxColumnKey[]
  reorderDamageReduxColumns: boolean
  openPanels: number[]
  perksPanel: number | null
}

export const defaultDamageReduxCalcsLocalState: Readonly<DamageReduxCalcsLocalState> = {
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
  botBotBonusMultiplier: 0,
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
  perkEnemyDmgMinus50: true,
  perkEnemyDmgX25: true,
  perkRangedDmgX3: true,
  perkEnemyHpMinus50: true,
  perkBossHpX8: true,
  perkBossHpMinus70: true,
  damageReduxColumnOrder: [...DEFAULT_DAMAGE_REDUX_COLUMN_ORDER],
  selectedDamageReduxColumnKeys: [...DEFAULT_DAMAGE_REDUX_SELECTED_COLUMNS],
  reorderDamageReduxColumns: false,
  openPanels: [0],
  perksPanel: null,
}

function clampBoundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return fallback
  return Math.min(max, Math.max(min, numberValue))
}

function normalizeDamageReduxColumnKey(value: unknown): DamageReduxColumnKey | null {
  return DEFAULT_DAMAGE_REDUX_COLUMN_ORDER.includes(value as DamageReduxColumnKey)
    ? (value as DamageReduxColumnKey)
    : null
}

function normalizeDamageReduxColumnArray(value: unknown, fallback: DamageReduxColumnKey[]): DamageReduxColumnKey[] {
  if (!Array.isArray(value)) return [...fallback]
  const normalized = value
    .map(item => normalizeDamageReduxColumnKey(item))
    .filter((item): item is DamageReduxColumnKey => item !== null)
  if (!normalized.length) return [...fallback]
  return Array.from(new Set(normalized))
}

function normalizeNumberArray(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return [...fallback]
  const normalized = value
    .map(item => Number(item))
    .filter(item => Number.isFinite(item))
    .map(item => Math.floor(item))
  return normalized.length ? normalized : [...fallback]
}

export function normalizeDamageReduxCalcsLocalState(
  input: unknown,
  base: DamageReduxCalcsLocalState = defaultDamageReduxCalcsLocalState,
): DamageReduxCalcsLocalState {
  const data = asObjectRecord(input)

  let perksPanel = base.perksPanel
  if (typeof data.perksPanel === 'number' && Number.isFinite(data.perksPanel)) {
    perksPanel = Math.floor(data.perksPanel)
  } else if (typeof data.perksPanel === 'boolean') {
    perksPanel = data.perksPanel ? 0 : null
  }

  return {
    baseVal: typeof data.baseVal === 'string' ? data.baseVal : base.baseVal,
    maxTowerHealthVal: typeof data.maxTowerHealthVal === 'string' ? data.maxTowerHealthVal : base.maxTowerHealthVal,
    useDefense: typeof data.useDefense === 'boolean' ? data.useDefense : base.useDefense,
    defensePct: clampBoundedNumber(data.defensePct, base.defensePct, 0, 98),
    useDefAbs: typeof data.useDefAbs === 'boolean' ? data.useDefAbs : base.useDefAbs,
    defAbsVal: typeof data.defAbsVal === 'string' ? data.defAbsVal : base.defAbsVal,
    useCF: typeof data.useCF === 'boolean' ? data.useCF : base.useCF,
    cfPct: clampBoundedNumber(data.cfPct, base.cfPct, 10, 25),
    useFB: typeof data.useFB === 'boolean' ? data.useFB : base.useFB,
    fbPct: clampBoundedNumber(data.fbPct, base.fbPct, 20, 95),
    botBotBonusMultiplier: clampBoundedNumber(data.botBotBonusMultiplier, base.botBotBonusMultiplier, 0, 100),
    useNMP: typeof data.useNMP === 'boolean' ? data.useNMP : base.useNMP,
    nmpReduction: clampBoundedNumber(data.nmpReduction, base.nmpReduction, 1, 2.5),
    nmpOrbHits: clampBoundedNumber(data.nmpOrbHits, base.nmpOrbHits, 1, 50),
    usePC: typeof data.usePC === 'boolean' ? data.usePC : base.usePC,
    pcPct: clampBoundedNumber(data.pcPct, base.pcPct, 50, 80),
    useCT: typeof data.useCT === 'boolean' ? data.useCT : base.useCT,
    ctLevel: clampBoundedNumber(data.ctLevel, base.ctLevel, 1, 30),
    clPlusLevel: clampBoundedNumber(data.clPlusLevel, base.clPlusLevel, 0, 11),
    avgClPlusHits: clampBoundedNumber(data.avgClPlusHits, base.avgClPlusHits, 1, 100),
    enemyHpVal: typeof data.enemyHpVal === 'string' ? data.enemyHpVal : base.enemyHpVal,
    assumeMaxCtReduction: typeof data.assumeMaxCtReduction === 'boolean' ? data.assumeMaxCtReduction : base.assumeMaxCtReduction,
    perkEnemyDmgMinus50: typeof data.perkEnemyDmgMinus50 === 'boolean' ? data.perkEnemyDmgMinus50 : base.perkEnemyDmgMinus50,
    perkEnemyDmgX25: typeof data.perkEnemyDmgX25 === 'boolean' ? data.perkEnemyDmgX25 : base.perkEnemyDmgX25,
    perkRangedDmgX3: typeof data.perkRangedDmgX3 === 'boolean' ? data.perkRangedDmgX3 : base.perkRangedDmgX3,
    perkEnemyHpMinus50: typeof data.perkEnemyHpMinus50 === 'boolean' ? data.perkEnemyHpMinus50 : base.perkEnemyHpMinus50,
    perkBossHpX8: typeof data.perkBossHpX8 === 'boolean' ? data.perkBossHpX8 : base.perkBossHpX8,
    perkBossHpMinus70: typeof data.perkBossHpMinus70 === 'boolean' ? data.perkBossHpMinus70 : base.perkBossHpMinus70,
    damageReduxColumnOrder: normalizeDamageReduxColumnArray(data.damageReduxColumnOrder, DEFAULT_DAMAGE_REDUX_COLUMN_ORDER),
    selectedDamageReduxColumnKeys: normalizeDamageReduxColumnArray(data.selectedDamageReduxColumnKeys, DEFAULT_DAMAGE_REDUX_SELECTED_COLUMNS),
    reorderDamageReduxColumns: typeof data.reorderDamageReduxColumns === 'boolean' ? data.reorderDamageReduxColumns : base.reorderDamageReduxColumns,
    openPanels: normalizeNumberArray(data.openPanels, base.openPanels),
    perksPanel,
  }
}

export type WorkshopDiscountsLocalState = {
  discountDamage: number
  discountDefense: number
  discountUtility: number
}

export type EnhancementDiscountsLocalState = WorkshopDiscountsLocalState & {
  discountVault: number
}

export type WorkshopFormLocalState = {
  section: string
  stat: string
  currentLevel: number
  targetLevel: number
  currentLevelCoin: number
  targetLevelCoin: number
  currentLevelCash: number
  targetLevelCash: number
  discount: number
  discountCategory: string
  workshopDiscounts: WorkshopDiscountsLocalState
  enhancementDiscounts: EnhancementDiscountsLocalState
}

export type WorkshopCalcsLocalState = {
  form: WorkshopFormLocalState
  activeTab: 'workshop' | 'enhancements'
  showCoin: boolean
  showCash: boolean
  itemsPerPage: number
  currentPage: number
}

export type ThornsCalcsTournamentTier = 'none' | 't11' | 't14' | 't17'

export type ThornsCalcsSettings = {
  baseThorns: number
  tier: number
  pcLevel: number
  pcMasteryLevel: number
  bcLabLevel: number
  bcReductionLabLevel: number
  pcReductionLabLevel: number
  tournamentTier: ThornsCalcsTournamentTier
  heatWave: number
  startWallThorns: number
  compareMode: boolean
}

export type ThornsCalcsLocalState = {
  settings: ThornsCalcsSettings
  compareSettings: ThornsCalcsSettings
  comparisonPanel: string | null
}

function defaultWorkshopFormLocalState(): WorkshopFormLocalState {
  return {
    section: 'attack',
    stat: 'Attack Speed',
    currentLevel: 1,
    targetLevel: 5,
    currentLevelCoin: 0,
    targetLevelCoin: 5,
    currentLevelCash: 5,
    targetLevelCash: 10,
    discount: 0,
    discountCategory: 'damage',
    workshopDiscounts: {
      discountDamage: 0,
      discountDefense: 0,
      discountUtility: 0,
    },
    enhancementDiscounts: {
      discountDamage: 0,
      discountDefense: 0,
      discountUtility: 0,
      discountVault: 0,
    },
  }
}

export const defaultWorkshopCalcsLocalState = (): WorkshopCalcsLocalState => ({
  form: defaultWorkshopFormLocalState(),
  activeTab: 'workshop',
  showCoin: true,
  showCash: true,
  itemsPerPage: 25,
  currentPage: 1,
})

function normalizeWorkshopDiscounts(value: unknown, fallback: WorkshopDiscountsLocalState): WorkshopDiscountsLocalState {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    discountDamage: normalizeWorkshopSectionDiscountPercent(source.discountDamage, fallback.discountDamage),
    discountDefense: normalizeWorkshopSectionDiscountPercent(source.discountDefense, fallback.discountDefense),
    discountUtility: normalizeWorkshopSectionDiscountPercent(source.discountUtility, fallback.discountUtility),
  }
}

function normalizeEnhancementDiscounts(value: unknown, fallback: EnhancementDiscountsLocalState): EnhancementDiscountsLocalState {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    discountDamage: normalizeEnhancementSectionDiscountPercent(source.discountDamage, fallback.discountDamage),
    discountDefense: normalizeEnhancementSectionDiscountPercent(source.discountDefense, fallback.discountDefense),
    discountUtility: normalizeEnhancementSectionDiscountPercent(source.discountUtility, fallback.discountUtility),
    discountVault: normalizeEnhancementVaultDiscountPercent(source.discountVault, fallback.discountVault),
  }
}

function normalizeWorkshopFormLocalState(value: unknown, fallback: WorkshopFormLocalState): WorkshopFormLocalState {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    section: typeof source.section === 'string' ? source.section : fallback.section,
    stat: typeof source.stat === 'string' ? source.stat : fallback.stat,
    currentLevel: clampBoundedNumber(source.currentLevel, fallback.currentLevel, 0, 9999),
    targetLevel: clampBoundedNumber(source.targetLevel, fallback.targetLevel, 0, 9999),
    currentLevelCoin: clampBoundedNumber(source.currentLevelCoin, fallback.currentLevelCoin, 0, 9999),
    targetLevelCoin: clampBoundedNumber(source.targetLevelCoin, fallback.targetLevelCoin, 0, 9999),
    currentLevelCash: clampBoundedNumber(source.currentLevelCash, fallback.currentLevelCash, 0, 9999),
    targetLevelCash: clampBoundedNumber(source.targetLevelCash, fallback.targetLevelCash, 0, 9999),
    discount: clampBoundedNumber(source.discount, fallback.discount, 0, 100),
    discountCategory: typeof source.discountCategory === 'string' ? source.discountCategory : fallback.discountCategory,
    workshopDiscounts: normalizeWorkshopDiscounts(source.workshopDiscounts, fallback.workshopDiscounts),
    enhancementDiscounts: normalizeEnhancementDiscounts(source.enhancementDiscounts, fallback.enhancementDiscounts),
  }
}

export function normalizeWorkshopCalcsLocalState(
  input: unknown,
  base: WorkshopCalcsLocalState = defaultWorkshopCalcsLocalState(),
): WorkshopCalcsLocalState {
  const data = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const activeTab = data.activeTab
  return {
    form: normalizeWorkshopFormLocalState(data.form, base.form),
    activeTab: activeTab === 'enhancements' ? 'enhancements' : 'workshop',
    showCoin: typeof data.showCoin === 'boolean' ? data.showCoin : base.showCoin,
    showCash: typeof data.showCash === 'boolean' ? data.showCash : base.showCash,
    itemsPerPage: clampBoundedNumber(data.itemsPerPage, base.itemsPerPage, -1, 100),
    currentPage: clampBoundedNumber(data.currentPage, base.currentPage, 1, 9999),
  }
}

export const defaultThornsCalcsSettings = (): ThornsCalcsSettings => ({
  baseThorns: 100,
  tier: 1,
  pcLevel: 0,
  pcMasteryLevel: 0,
  bcLabLevel: 0,
  bcReductionLabLevel: 0,
  pcReductionLabLevel: 0,
  tournamentTier: 'none',
  heatWave: 0,
  startWallThorns: 1,
  compareMode: false,
})

function normalizeThornsCalcsTournamentTier(value: unknown): ThornsCalcsTournamentTier {
  return value === 't11' || value === 't14' || value === 't17' ? value : 'none'
}

function clampThornsInt(value: unknown, min: number, max: number): number {
  const numberValue = Math.round(Number(value))
  if (!Number.isFinite(numberValue)) return min
  return Math.min(max, Math.max(min, numberValue))
}

export function normalizeThornsCalcsSettings(value: unknown, fallback: ThornsCalcsSettings): ThornsCalcsSettings {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    baseThorns: clampThornsInt(source.baseThorns, 0, 600),
    tier: clampThornsInt(source.tier, 1, MAX_CAMPAIGN_TIER),
    pcLevel: clampThornsInt(source.pcLevel, 0, 7),
    pcMasteryLevel: clampThornsInt(source.pcMasteryLevel, 0, 9),
    bcLabLevel: clampThornsInt(source.bcLabLevel, 0, 10),
    bcReductionLabLevel: clampThornsInt(source.bcReductionLabLevel, 0, 20),
    pcReductionLabLevel: clampThornsInt(source.pcReductionLabLevel, 0, 20),
    tournamentTier: normalizeThornsCalcsTournamentTier(source.tournamentTier),
    heatWave: clampThornsInt(source.heatWave, 0, 1000),
    startWallThorns: clampThornsInt(source.startWallThorns, 1, 20),
    compareMode: typeof source.compareMode === 'boolean' ? source.compareMode : fallback.compareMode,
  }
}

export function ensureThornsCalcsSettingsRules(settings: ThornsCalcsSettings): void {
  if (settings.pcLevel < 7 && settings.pcMasteryLevel > 0) {
    settings.pcMasteryLevel = 0
  }
  if (settings.pcMasteryLevel > 0 && settings.pcLevel < 7) {
    settings.pcLevel = 7
  }
}

export function normalizeThornsCalcsLocalState(
  input: unknown,
  base?: Partial<ThornsCalcsLocalState>,
): ThornsCalcsLocalState {
  const mainDefaults = base?.settings ?? defaultThornsCalcsSettings()
  const data = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const settings = normalizeThornsCalcsSettings(data.settings, mainDefaults)
  ensureThornsCalcsSettingsRules(settings)
  const compareSettings = normalizeThornsCalcsSettings(data.compareSettings, settings)
  ensureThornsCalcsSettingsRules(compareSettings)
  const panel = data.comparisonPanel
  return {
    settings,
    compareSettings,
    comparisonPanel: typeof panel === 'string' || panel === null ? panel : (base?.comparisonPanel ?? null),
  }
}

export const labsCalcsLocalPersistenceSchema = buildNormalizerPersistenceSchema(normalizeLabsCalcsLocalState)
export const shardSplitterLocalPersistenceSchema = buildNormalizerPersistenceSchema(normalizeShardSplitterLocalState)
export const modulesCalcsLocalPersistenceSchema = buildNormalizerPersistenceSchema(normalizeModulesCalcsLocalState)
export const damageReduxCalcsLocalPersistenceSchema = buildNormalizerPersistenceSchema(normalizeDamageReduxCalcsLocalState)
export const workshopCalcsLocalPersistenceSchema = buildNormalizerPersistenceSchema(normalizeWorkshopCalcsLocalState)
export const thornsCalcsLocalPersistenceSchema = buildNormalizerPersistenceSchema(normalizeThornsCalcsLocalState)

export * from './bot-medal-splitter-local-state'
export * from './bot-medal-planner-focus'
export * from './bots-calcs-local-state'
export * from './dissonance-calcs-local-state'
export * from './enemy-drops-calcs-local-state'
export * from './enemy-stats-calcs-local-state'
export * from './guardians-calcs-local-state'
export * from './tournament-performance-local-state'
export * from './uptime-chart-local-state'
