import { z } from 'zod'
import { MAX_ASSIST_MULTIPLIER_EFFICIENCY_PCT } from '../mechanics/assist-module-efficiency'

export type ModuleType = 'cannon' | 'defense' | 'generator' | 'core'

export const moduleTypes: ModuleType[] = ['cannon', 'defense', 'generator', 'core']

export const moduleTypeSchema = z.enum(['cannon', 'defense', 'generator', 'core'])

export type SplitterData = {
  budget: number | null
  unspentShards: number | null
  assistEffPct: number
  primaryLevel: number
  secondaryLevel: number
  primaryRarity: string
  secondaryRarity: string
}

export type SplitterByType = Record<ModuleType, SplitterData>

export const splitterDataSchema = z.object({
  budget: z.number().nullable(),
  unspentShards: z.number().int().nonnegative().nullable(),
  assistEffPct: z.number().int().min(0).max(MAX_ASSIST_MULTIPLIER_EFFICIENCY_PCT),
  primaryLevel: z.number().int().min(1).max(300),
  secondaryLevel: z.number().int().min(1).max(300),
  primaryRarity: z.string(),
  secondaryRarity: z.string(),
})

export const splitterByTypeSchema = z.object({
  cannon: splitterDataSchema,
  defense: splitterDataSchema,
  generator: splitterDataSchema,
  core: splitterDataSchema,
})

export const shardSplitterSnapshotSchema = z.object({
  selectedModuleType: moduleTypeSchema,
  splitterByType: splitterByTypeSchema,
  costsAssistEffPctByType: z.object({
    cannon: z.number().int().min(0).max(MAX_ASSIST_MULTIPLIER_EFFICIENCY_PCT),
    defense: z.number().int().min(0).max(MAX_ASSIST_MULTIPLIER_EFFICIENCY_PCT),
    generator: z.number().int().min(0).max(MAX_ASSIST_MULTIPLIER_EFFICIENCY_PCT),
    core: z.number().int().min(0).max(MAX_ASSIST_MULTIPLIER_EFFICIENCY_PCT),
  }),
  shardDiscount: z.number().int().min(0).max(30),
})

export type ShardSplitterSnapshot = {
  selectedModuleType: ModuleType
  splitterByType: SplitterByType
  costsAssistEffPctByType: Record<ModuleType, number>
  shardDiscount: number
}


const defaultSplitterData: SplitterData = {
  budget: null,
  unspentShards: null,
  assistEffPct: 25,
  primaryLevel: 1,
  secondaryLevel: 1,
  primaryRarity: 'Common',
  secondaryRarity: 'Common',
}

function clampInt(value: unknown, min: number, max: number): number {
  const numeric = Math.floor(Number(value) || 0)
  return Math.max(min, Math.min(max, numeric))
}

export function buildDefaultShardSplitterSnapshot(): ShardSplitterSnapshot {
  return {
    selectedModuleType: 'cannon',
    splitterByType: {
      cannon: { ...defaultSplitterData },
      defense: { ...defaultSplitterData },
      generator: { ...defaultSplitterData },
      core: { ...defaultSplitterData },
    },
    costsAssistEffPctByType: {
      cannon: 25,
      defense: 25,
      generator: 25,
      core: 25,
    },
    shardDiscount: 0,
  }
}

export function normalizeShardSplitterSnapshot(input: Record<string, unknown>): ShardSplitterSnapshot {
  const defaults = buildDefaultShardSplitterSnapshot()

  const selectedModuleType = typeof input.selectedModuleType === 'string' && moduleTypes.includes(input.selectedModuleType as ModuleType)
    ? input.selectedModuleType as ModuleType
    : defaults.selectedModuleType

  const shardDiscount = clampInt(input.shardDiscount, 0, 30)

  const splitterByType = { ...defaults.splitterByType }
  const rawByType = input.splitterByType && typeof input.splitterByType === 'object'
    ? input.splitterByType as Record<string, unknown>
    : {}

  for (const moduleType of moduleTypes) {
    const candidate = rawByType[moduleType]
    if (!candidate || typeof candidate !== 'object') continue
    const record = candidate as Record<string, unknown>
    splitterByType[moduleType] = {
      budget: Number.isFinite(Number(record.budget)) ? Number(record.budget) : null,
      unspentShards: Number.isFinite(Number(record.unspentShards)) ? Math.max(0, Math.floor(Number(record.unspentShards))) : null,
      assistEffPct: clampInt(record.assistEffPct, 0, MAX_ASSIST_MULTIPLIER_EFFICIENCY_PCT),
      primaryLevel: Math.max(1, clampInt(record.primaryLevel, 1, 300)),
      secondaryLevel: Math.max(1, clampInt(record.secondaryLevel, 1, 300)),
      primaryRarity: typeof record.primaryRarity === 'string' ? record.primaryRarity : defaultSplitterData.primaryRarity,
      secondaryRarity: typeof record.secondaryRarity === 'string' ? record.secondaryRarity : defaultSplitterData.secondaryRarity,
    }
  }

  const costsAssistEffPctByType = { ...defaults.costsAssistEffPctByType }
  const rawAssistByType = input.costsAssistEffPctByType && typeof input.costsAssistEffPctByType === 'object'
    ? input.costsAssistEffPctByType as Record<string, unknown>
    : {}

  for (const moduleType of moduleTypes) {
    costsAssistEffPctByType[moduleType] = clampInt(rawAssistByType[moduleType], 0, MAX_ASSIST_MULTIPLIER_EFFICIENCY_PCT)
  }

  shardSplitterSnapshotSchema.parse({
    selectedModuleType,
    splitterByType,
    costsAssistEffPctByType,
    shardDiscount,
  })

  return {
    selectedModuleType,
    splitterByType,
    costsAssistEffPctByType,
    shardDiscount,
  }
}
