import { getWorkshopMaxLevelByKey } from '../../data/index'
import { getWorkshopEnhancementDefinitions } from '../../data/index'
import type { GameDropdownOptionEntry } from './types'

export const WORKSHOP_ENHANCEMENT_KEY_ALIASES: Readonly<Record<string, string>> = {
  cells_per_kill_bonus: 'WSP_CELLS_PER_KILL_BONUS',
}

export function resolveWorkshopEnhancementDataKey(enhancementKey: string): string {
  return WORKSHOP_ENHANCEMENT_KEY_ALIASES[enhancementKey] ?? enhancementKey
}

/** Achievable enhancement level — cost tables index 0…N−1 for upgrades through level N. */
export function resolveWorkshopEnhancementMaxLevel(enhancementKey: string): number {
  const dataKey = resolveWorkshopEnhancementDataKey(enhancementKey)
  const costMax = getWorkshopMaxLevelByKey(dataKey)
  if (costMax == null) return 200
  return costMax + 1
}

export function buildWorkshopEnhancementLevelEntries(
  enhancementKey: string,
): readonly GameDropdownOptionEntry[] {
  const maxLevel = resolveWorkshopEnhancementMaxLevel(enhancementKey)
  return Array.from({ length: maxLevel + 1 }, (_, value) => ({ value, baseValue: value }))
}

export function buildWorkshopEnhancementOptionLabel(level: number): string {
  return String(level)
}

/** Canonical field label shared by every workshop enhancement level dropdown. */
export function buildWorkshopEnhancementFieldLabel(enhancementKey: string): string {
  const dataKey = resolveWorkshopEnhancementDataKey(enhancementKey)
  const match = getWorkshopEnhancementDefinitions().find(stat => stat.key === dataKey)
  return match?.label ?? enhancementKey
}
