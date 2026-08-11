import { getWorkshopStatDefinitionByKey } from '../../data/index'
import { getWorkshopEnhancementDefinitions } from '../../data/index'
import { ELS_ATTACK_WORKSHOP_KEY, ELS_HEALTH_WORKSHOP_KEY } from '../../mechanics/els-upgrade-path'
import { WORKSHOP_ENHANCEMENT_KEY_ALIASES } from './workshop-enhancement-dropdown-math'
import type { GameDropdownOptionEntry } from './types'

/** Utility ELS workshop stats — players enter raw upgrade level (0–699), not skip-chance float. */
const WORKSHOP_STAT_LEVEL_NUMBER_LABEL_KEYS = new Set<string>([
  ELS_ATTACK_WORKSHOP_KEY,
  ELS_HEALTH_WORKSHOP_KEY,
])

export type WorkshopTierKind = 'coin' | 'cash'

export interface WorkshopStatSpec {
  statKey: string
}

export interface WorkshopTierSpec {
  statKey: string
  tierKind: WorkshopTierKind
  minimumLevel?: number
}

function getWorkshopStatDefinition(statKey: string) {
  return getWorkshopStatDefinitionByKey(statKey)
}

export function getWorkshopEnhancementKeyFromDataKey(dataKey: string): string {
  for (const [enhancementKey, mapped] of Object.entries(WORKSHOP_ENHANCEMENT_KEY_ALIASES)) {
    if (mapped === dataKey) return enhancementKey
  }
  return dataKey
}

export function findWorkshopEnhancementSpec(dataKey: string): { dataKey: string } | null {
  const match = getWorkshopEnhancementDefinitions().find(stat => stat.key === dataKey)
  return match ? { dataKey: match.key } : null
}

export function buildWorkshopStatLevelEntries(statKey: string): readonly GameDropdownOptionEntry[] {
  const stat = getWorkshopStatDefinition(statKey)
  if (!stat) return []

  return stat.levels.map(entry => ({
    value: entry.level,
    baseValue: entry.value,
  }))
}

export function buildWorkshopStatOptionLabel(statKey: string, level: number): string {
  if (WORKSHOP_STAT_LEVEL_NUMBER_LABEL_KEYS.has(statKey)) {
    return String(level)
  }
  const stat = getWorkshopStatDefinition(statKey)
  const row = stat?.levels.find(entry => entry.level === level)
  if (!row) return String(level)
  return String(row.value)
}

/** Canonical field label shared by every workshop stat level dropdown. */
export function buildWorkshopStatFieldLabel(statKey: string): string {
  const stat = getWorkshopStatDefinition(statKey)
  return stat?.label ?? statKey
}

/** Numeric workshop stat value (e.g. damage) at a given upgrade level. */
export function computeWorkshopStatNumericValueAtLevel(statKey: string, level: number): number {
  const stat = getWorkshopStatDefinition(statKey)
  if (!stat) return 0

  const clamped = Math.max(stat.minLevel, Math.min(stat.maxLevel, Math.floor(level)))
  const row = stat.levels.find(entry => entry.level === clamped)
    ?? stat.levels.find(entry => entry.level === stat.minLevel)
  return row?.value ?? 0
}

function uniqueSortedLevels(values: readonly number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b)
}

export function buildWorkshopTierLevelEntries(spec: WorkshopTierSpec): readonly GameDropdownOptionEntry[] {
  const stat = getWorkshopStatDefinition(spec.statKey)
  if (!stat) return []

  const rawLevels = spec.tierKind === 'coin'
    ? uniqueSortedLevels(stat.levels.map(entry => entry.coins))
    : uniqueSortedLevels(stat.levels.map(entry => entry.cash))

  const minLevel = spec.minimumLevel ?? Number.NEGATIVE_INFINITY
  return rawLevels
    .filter(level => level >= minLevel)
    .map(level => ({ value: level, baseValue: level }))
}

export function buildWorkshopTierOptionLabel(_spec: WorkshopTierSpec, level: number): string {
  return String(level)
}
