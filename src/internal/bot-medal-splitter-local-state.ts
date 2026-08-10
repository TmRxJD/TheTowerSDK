import {
  BOT_UPGRADES_DATA,
  type BotData,
  getBotPlusStatBoundsByIndex,
  getBotStatBoundsByIndex,
  normalizeBotPlusStats,
  normalizeBotStats,
} from '../data/bots'
import {
  BOT_PLUS_LEVEL_LOCKED,
  type BotMedalPlannerFocusGoal,
  normalizeBotMedalPlannerFocusOrder,
} from './bot-medal-planner-focus'
import { createNormalizerPersistenceSchema } from './local-persistence-types'

export const BOT_MEDAL_SPLITTER_PRESET_COUNT = 3
export const DEFAULT_BOT_MEDAL_SPLITTER_TOWER_RANGE = 60

export type BotMedalSplitterTargetConfig = {
  enabled: boolean
  synced: boolean
  baseLocks: Record<string, boolean>
  plusLocks: Record<string, boolean>
}

export type BotMedalSplitterShRarity = 'none' | 'Epic' | 'Legendary' | 'Mythic' | 'Ancestral'

export type BotMedalSplitterPreset = {
  name: string
  budget: number
  towerRange: number
  singularityHarnessRarity: BotMedalSplitterShRarity
  vaultBotRangeLevel: number
  useBotBotPlus: boolean
  botBotEnabled: boolean
  botBotSynced: boolean
  levels: Record<string, number[]>
  plusLevels: Record<string, number[]>
  labLevels: Record<string, Record<string, number>>
  targetConfigs: Record<string, BotMedalSplitterTargetConfig>
  targetOrder: string[]
  plannerFocusOrder: BotMedalPlannerFocusGoal[]
  botBotBaseLocks: Record<string, boolean>
  botBotPlusLocks: Record<string, boolean>
}

export type BotMedalSplitterLocalState = {
  activePreset: number
  plannerTab: 'allocation' | 'inputs'
  editorBotLabel: string
  presets: BotMedalSplitterPreset[]
}

const bots: BotData[] = BOT_UPGRADES_DATA

export function targetBotMedalSplitterBotLabels(): string[] {
  return bots.filter(bot => bot.label !== 'Bot Bot').map(bot => bot.label)
}

export function normalizeBotMedalSplitterSynced(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeBotMedalSplitterShRarity(value: unknown): BotMedalSplitterShRarity {
  switch (value) {
    case 'Epic':
    case 'Legendary':
    case 'Mythic':
    case 'Ancestral':
      return value
    default:
      return 'none'
  }
}

export function createBotMedalSplitterBaseLocks(botLabel: string): Record<string, boolean> {
  const bot = bots.find(entry => entry.label === botLabel)
  if (!bot) return {}

  return Object.fromEntries(
    normalizeBotStats(bot).map(stat => [stat.name, false]),
  ) as Record<string, boolean>
}

export function createBotMedalSplitterPlusLocks(botLabel: string): Record<string, boolean> {
  const bot = bots.find(entry => entry.label === botLabel)
  if (!bot) return {}

  return Object.fromEntries(
    normalizeBotPlusStats(bot).map(stat => [stat.name, false]),
  ) as Record<string, boolean>
}

export function createDefaultBotMedalSplitterLevels(): Record<string, number[]> {
  return Object.fromEntries(
    bots.map(bot => [bot.label, normalizeBotStats(bot).map((_, statIndex) => getBotStatBoundsByIndex(bot, statIndex).min)]),
  ) as Record<string, number[]>
}

export function createDefaultBotMedalSplitterPlusLevels(): Record<string, number[]> {
  return Object.fromEntries(
    bots.map(bot => [bot.label, normalizeBotPlusStats(bot).map((_, statIndex) => getBotPlusStatBoundsByIndex(bot, statIndex).min)]),
  ) as Record<string, number[]>
}

function createDefaultLabLevels(): Record<string, Record<string, number>> {
  return Object.fromEntries(
    bots.map(bot => [bot.label, Object.fromEntries(bot.labInfo.map(lab => [lab.name, 0]))]),
  ) as Record<string, Record<string, number>>
}

function createDefaultTargetConfigs(enabledLabel?: string): Record<string, BotMedalSplitterTargetConfig> {
  const defaultEnabledLabel = enabledLabel
    ?? bots.find(bot => bot.label === 'Golden Bot')?.label
    ?? targetBotMedalSplitterBotLabels()[0]
    ?? ''

  return Object.fromEntries(
    targetBotMedalSplitterBotLabels().map(label => [label, {
      enabled: label === defaultEnabledLabel,
      synced: false,
      baseLocks: createBotMedalSplitterBaseLocks(label),
      plusLocks: createBotMedalSplitterPlusLocks(label),
    }]),
  ) as Record<string, BotMedalSplitterTargetConfig>
}

function createDefaultTargetOrder(): string[] {
  return [...targetBotMedalSplitterBotLabels()]
}

export function createDefaultBotMedalSplitterPreset(index: number): BotMedalSplitterPreset {
  return {
    name: `Preset ${index + 1}`,
    budget: 0,
    towerRange: DEFAULT_BOT_MEDAL_SPLITTER_TOWER_RANGE,
    singularityHarnessRarity: 'none',
    vaultBotRangeLevel: 0,
    useBotBotPlus: true,
    botBotEnabled: true,
    botBotSynced: false,
    levels: createDefaultBotMedalSplitterLevels(),
    plusLevels: createDefaultBotMedalSplitterPlusLevels(),
    labLevels: createDefaultLabLevels(),
    targetConfigs: createDefaultTargetConfigs(),
    targetOrder: createDefaultTargetOrder(),
    plannerFocusOrder: normalizeBotMedalPlannerFocusOrder(undefined),
    botBotBaseLocks: createBotMedalSplitterBaseLocks('Bot Bot'),
    botBotPlusLocks: createBotMedalSplitterPlusLocks('Bot Bot'),
  }
}

export function createDefaultBotMedalSplitterPresets(): BotMedalSplitterPreset[] {
  return Array.from({ length: BOT_MEDAL_SPLITTER_PRESET_COUNT }, (_, index) => createDefaultBotMedalSplitterPreset(index))
}

export function clampBotMedalSplitterBudget(value: unknown): number {
  const numeric = Math.floor(Number(value) || 0)
  return Math.max(0, Math.min(100000000, numeric))
}

export function clampBotMedalSplitterInt(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = Math.floor(Number(value))
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

export function normalizeBotMedalSplitterTargetOrder(
  value: unknown,
  fallback: string[],
  targetConfigs?: Record<string, BotMedalSplitterTargetConfig>,
): string[] {
  const validLabels = new Set(targetBotMedalSplitterBotLabels())
  const next = Array.isArray(value)
    ? value.map(item => String(item)).filter(label => validLabels.has(label))
    : [...fallback]

  const unique: string[] = []
  for (const label of next) {
    if (!unique.includes(label)) unique.push(label)
  }

  for (const label of targetBotMedalSplitterBotLabels()) {
    if (!unique.includes(label)) unique.push(label)
  }

  if (targetConfigs) {
    unique.sort((left, right) => {
      const leftEnabled = targetConfigs[left]?.enabled ? 1 : 0
      const rightEnabled = targetConfigs[right]?.enabled ? 1 : 0
      return rightEnabled - leftEnabled
    })
  }

  return unique
}

function normalizeBaseLocks(value: unknown, fallback: Record<string, boolean>): Record<string, boolean> {
  const normalized = { ...fallback }
  if (!value || typeof value !== 'object') return normalized

  const source = value as Record<string, unknown>
  for (const statName of Object.keys(normalized)) {
    if (typeof source[statName] === 'boolean') {
      normalized[statName] = source[statName] as boolean
    }
  }

  return normalized
}

function normalizeTargetConfigs(
  value: unknown,
  fallback: Record<string, BotMedalSplitterTargetConfig>,
  legacyEnabledLabel?: string,
  legacySync = false,
): Record<string, BotMedalSplitterTargetConfig> {
  const normalized = createDefaultTargetConfigs(legacyEnabledLabel)
  for (const label of Object.keys(normalized)) {
    normalized[label] = {
      ...fallback[label],
      ...normalized[label],
      synced: label === legacyEnabledLabel && legacySync ? true : (fallback[label]?.synced ?? normalized[label].synced),
      baseLocks: {
        ...normalized[label].baseLocks,
        ...fallback[label]?.baseLocks,
      },
      plusLocks: {
        ...normalized[label].plusLocks,
        ...fallback[label]?.plusLocks,
      },
    }
  }

  if (!value || typeof value !== 'object') return normalized

  const source = value as Record<string, unknown>
  for (const label of Object.keys(normalized)) {
    const rawConfig = source[label]
    if (!rawConfig || typeof rawConfig !== 'object') continue
    const config = rawConfig as Record<string, unknown>
    normalized[label] = {
      enabled: typeof config.enabled === 'boolean' ? config.enabled : normalized[label].enabled,
      synced: normalizeBotMedalSplitterSynced(
        config.synced ?? config.syncWithBotBot ?? config.syncTargetLabel != null,
        normalized[label].synced,
      ),
      baseLocks: normalizeBaseLocks(config.baseLocks, normalized[label].baseLocks),
      plusLocks: normalizeBaseLocks(config.plusLocks, normalized[label].plusLocks),
    }
  }

  return normalized
}

function normalizeLevels(value: unknown, fallback: Record<string, number[]>): Record<string, number[]> {
  const normalized = Object.fromEntries(
    Object.entries(fallback).map(([botLabel, levels]) => [botLabel, [...levels]]),
  ) as Record<string, number[]>
  if (!value || typeof value !== 'object') return normalized

  const source = value as Record<string, unknown>
  for (const bot of bots) {
    const rawLevels = source[bot.label]
    if (!Array.isArray(rawLevels)) continue
    const nextLevels = [...normalized[bot.label]]
    for (let statIndex = 0; statIndex < nextLevels.length; statIndex += 1) {
      const bounds = getBotStatBoundsByIndex(bot, statIndex)
      nextLevels[statIndex] = clampBotMedalSplitterInt(rawLevels[statIndex], nextLevels[statIndex] ?? bounds.min, bounds.min, bounds.max)
    }
    normalized[bot.label] = nextLevels
  }

  return normalized
}

function normalizePlusLevels(value: unknown, fallback: Record<string, number[]>): Record<string, number[]> {
  const normalized = Object.fromEntries(
    Object.entries(fallback).map(([botLabel, levels]) => [botLabel, [...levels]]),
  ) as Record<string, number[]>
  if (!value || typeof value !== 'object') return normalized

  const source = value as Record<string, unknown>
  for (const bot of bots) {
    const rawLevels = source[bot.label]
    if (!Array.isArray(rawLevels)) continue
    const nextLevels = [...normalized[bot.label]]
    for (let statIndex = 0; statIndex < nextLevels.length; statIndex += 1) {
      const bounds = getBotPlusStatBoundsByIndex(bot, statIndex)
      const rawLevel = Math.floor(Number(rawLevels[statIndex]))
      if (rawLevel === BOT_PLUS_LEVEL_LOCKED) {
        nextLevels[statIndex] = BOT_PLUS_LEVEL_LOCKED
        continue
      }
      nextLevels[statIndex] = clampBotMedalSplitterInt(rawLevel, nextLevels[statIndex] ?? bounds.min, bounds.min, bounds.max)
    }
    normalized[bot.label] = nextLevels
  }

  return normalized
}

function normalizeLabLevels(value: unknown, fallback: Record<string, Record<string, number>>): Record<string, Record<string, number>> {
  const normalized = Object.fromEntries(
    Object.entries(fallback).map(([botLabel, labs]) => [botLabel, { ...labs }]),
  ) as Record<string, Record<string, number>>
  if (!value || typeof value !== 'object') return normalized

  const source = value as Record<string, unknown>
  for (const bot of bots) {
    const rawLabs = source[bot.label]
    if (!rawLabs || typeof rawLabs !== 'object') continue
    const nextLabs = { ...normalized[bot.label] }
    const labRecord = rawLabs as Record<string, unknown>
    for (const lab of bot.labInfo) {
      nextLabs[lab.name] = clampBotMedalSplitterInt(labRecord[lab.name], nextLabs[lab.name] ?? 0, 0, Number(lab.maxLevel) || 0)
    }
    normalized[bot.label] = nextLabs
  }

  return normalized
}

function normalizePreset(value: unknown, fallback: BotMedalSplitterPreset): BotMedalSplitterPreset {
  if (!value || typeof value !== 'object') return fallback
  const source = value as Record<string, unknown>
  const targetBotLabel = String(source.targetBotLabel || '').trim()
  const validTargetLabels = new Set(targetBotMedalSplitterBotLabels())
  const legacyEnabledLabel = validTargetLabels.has(targetBotLabel) ? targetBotLabel : undefined
  const legacySync = typeof source.syncWithBotBot === 'boolean' ? source.syncWithBotBot : false
  const targetConfigs = normalizeTargetConfigs(source.targetConfigs, fallback.targetConfigs, legacyEnabledLabel, legacySync)

  const legacyOrder = Array.isArray(source.targetOrder) ? source.targetOrder : createDefaultTargetOrder()

  return {
    name: typeof source.name === 'string' && source.name.trim().length > 0 ? source.name.trim() : fallback.name,
    budget: clampBotMedalSplitterBudget(source.budget),
    towerRange: Math.max(0, Math.min(1000, Math.floor(Number(source.towerRange) || fallback.towerRange))),
    singularityHarnessRarity: normalizeBotMedalSplitterShRarity(source.singularityHarnessRarity),
    vaultBotRangeLevel: clampBotMedalSplitterInt(source.vaultBotRangeLevel, fallback.vaultBotRangeLevel, 0, 5),
    useBotBotPlus: typeof source.useBotBotPlus === 'boolean' ? source.useBotBotPlus : fallback.useBotBotPlus,
    botBotEnabled: typeof source.botBotEnabled === 'boolean' ? source.botBotEnabled : fallback.botBotEnabled,
    botBotSynced: normalizeBotMedalSplitterSynced(
      source.botBotSynced ?? source.botBotSyncTargetLabel != null,
      fallback.botBotSynced,
    ),
    levels: normalizeLevels(source.levels, fallback.levels),
    plusLevels: normalizePlusLevels(source.plusLevels, fallback.plusLevels),
    labLevels: normalizeLabLevels(source.labLevels, fallback.labLevels),
    targetConfigs,
    targetOrder: normalizeBotMedalSplitterTargetOrder(legacyOrder, fallback.targetOrder, targetConfigs),
    plannerFocusOrder: normalizeBotMedalPlannerFocusOrder(source.plannerFocusOrder ?? fallback.plannerFocusOrder),
    botBotBaseLocks: normalizeBaseLocks(source.botBotBaseLocks, fallback.botBotBaseLocks),
    botBotPlusLocks: normalizeBaseLocks(source.botBotPlusLocks, fallback.botBotPlusLocks),
  }
}

export const defaultBotMedalSplitterLocalState = (): BotMedalSplitterLocalState => ({
  activePreset: 0,
  plannerTab: 'allocation',
  editorBotLabel: bots[0]?.label || '',
  presets: createDefaultBotMedalSplitterPresets(),
})

export function normalizeBotMedalSplitterLocalState(
  input: unknown,
  base: BotMedalSplitterLocalState = defaultBotMedalSplitterLocalState(),
): BotMedalSplitterLocalState {
  const defaults = createDefaultBotMedalSplitterPresets()
  const data = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const activePreset = Math.max(0, Math.min(BOT_MEDAL_SPLITTER_PRESET_COUNT - 1, Math.floor(Number(data.activePreset) || 0)))
  const rawPresets = Array.isArray(data.presets) ? data.presets : []

  return {
    activePreset,
    plannerTab: data.plannerTab === 'inputs' ? 'inputs' : 'allocation',
    editorBotLabel: typeof data.editorBotLabel === 'string' && bots.some(bot => bot.label === data.editorBotLabel)
      ? data.editorBotLabel
      : base.editorBotLabel,
    presets: defaults.map((preset, index) => normalizePreset(rawPresets[index], preset)),
  }
}

export const botMedalSplitterLocalPersistenceSchema = createNormalizerPersistenceSchema(normalizeBotMedalSplitterLocalState)
