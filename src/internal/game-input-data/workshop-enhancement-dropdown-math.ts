import { ownLookupOr } from '../own-lookup'
import { getWorkshopMaxLevelByKey } from '../../data/index'
import { getWorkshopEnhancementDefinitions } from '../../data/index'
import type { GameDropdownOptionEntry } from './types'

export const WORKSHOP_ENHANCEMENT_KEY_ALIASES: Readonly<Record<string, string>> = {
  cells_per_kill_bonus: 'WSP_CELLS_PER_KILL_BONUS',
}

export function getWorkshopEnhancementDataKey(enhancementKey: string): string {
  return ownLookupOr(WORKSHOP_ENHANCEMENT_KEY_ALIASES, enhancementKey, enhancementKey)
}

/** Achievable enhancement level — cost tables index 0…N−1 for upgrades through level N. */
export function computeWorkshopEnhancementMaxLevel(enhancementKey: string): number {
  const dataKey = getWorkshopEnhancementDataKey(enhancementKey)
  const costMax = getWorkshopMaxLevelByKey(dataKey)
  if (costMax == null) return 200
  return costMax + 1
}

export function buildWorkshopEnhancementLevelEntries(
  enhancementKey: string,
): readonly GameDropdownOptionEntry[] {
  const maxLevel = computeWorkshopEnhancementMaxLevel(enhancementKey)
  return Array.from({ length: maxLevel + 1 }, (_, value) => ({ value, baseValue: value }))
}

export function formatWorkshopEnhancementOptionLabel(level: number): string {
  return String(level)
}

/** Canonical field label shared by every workshop enhancement level dropdown. */
export function formatWorkshopEnhancementFieldLabel(enhancementKey: string): string {
  const dataKey = getWorkshopEnhancementDataKey(enhancementKey)
  const match = getWorkshopEnhancementDefinitions().find(stat => stat.key === dataKey)
  return match?.label ?? enhancementKey
}
