import { atIndex } from '../own-lookup'
import {
  buildLevelOptions,
  findRarityLabel,
  getLevelCapForRarity,
  MODULE_RARITIES,
  type ModuleRarity,
} from '../../data/index'
import { getModuleTemplate, type ModuleTemplate } from '../../data/index'
import { MODULE_SUBSTAT_BASE_RARITIES, type ModuleSubstatCanonicalRarity } from '../../data/index'
import type { GameDropdownOptionEntry } from './types'

export function computeModuleRarityIndex(rarity: string | null | undefined): number {
  if (!rarity) return 0
  const resolved = findRarityLabel(rarity)
  if (resolved) {
    const idx = MODULE_RARITIES.indexOf(resolved)
    if (idx >= 0) return idx
  }
  const directIdx = MODULE_RARITIES.indexOf(rarity as ModuleRarity)
  return directIdx >= 0 ? directIdx : 0
}

export function getModuleRarityByIndex(index: number): ModuleRarity {
  const clamped = Math.max(0, Math.min(MODULE_RARITIES.length - 1, Math.floor(Number(index) || 0)))
  return MODULE_RARITIES[clamped]
}

function moduleRarityRank(rarity: string | null | undefined): number {
  if (!rarity) return 0
  const resolved = findRarityLabel(rarity)
  if (resolved) return computeModuleRarityIndex(resolved)
  return computeModuleRarityIndex(rarity)
}

export function normalizeModuleSubstatRarity(
  rarity: string | null | undefined,
): ModuleSubstatCanonicalRarity | null {
  const resolved = findRarityLabel(rarity)
  if (!resolved) return null
  const base = MODULE_SUBSTAT_BASE_RARITIES.find(candidate => resolved.startsWith(candidate))
  return base ?? null
}

export function allowedModuleRaritiesForTemplate(template?: ModuleTemplate | null): readonly ModuleRarity[] {
  if (!template) return MODULE_RARITIES
  const minIndex = computeModuleRarityIndex(template.minRarity)
  const maxIndex = computeModuleRarityIndex(template.maxRarity)
  const allowed = MODULE_RARITIES.slice(minIndex, maxIndex + 1)
  const result: ModuleRarity[] = []

  if (template.maxRarity.startsWith('Ancestral')) {
    for (const rarity of allowed) {
      if (rarity === 'Ancestral') {
        const ancestralLevels: ModuleRarity[] = [
          'Ancestral',
          'Ancestral 1',
          'Ancestral 2',
          'Ancestral 3',
          'Ancestral 4',
          'Ancestral 5',
        ]
        const maxAncestralIndex = ancestralLevels.indexOf(template.maxRarity as ModuleRarity)
        if (maxAncestralIndex !== -1) {
          result.push(...ancestralLevels.slice(0, maxAncestralIndex + 1))
        }
        break
      }
      result.push(rarity)
    }
  } else {
    for (const rarity of allowed) {
      if (rarity === template.maxRarity && rarity !== 'Common' && !rarity.endsWith('+')) {
        result.push(rarity, `${rarity} +` as ModuleRarity)
      } else {
        result.push(rarity)
      }
    }
  }

  return result
}

export function buildAllModuleRarityLevelEntries(): readonly GameDropdownOptionEntry[] {
  return MODULE_RARITIES.map(rarity => ({
    value: computeModuleRarityIndex(rarity),
    baseValue: computeModuleRarityIndex(rarity),
  }))
}

export function buildModuleRarityLevelEntries(moduleTemplateId?: string | null): readonly GameDropdownOptionEntry[] {
  if (!moduleTemplateId) return buildAllModuleRarityLevelEntries()

  const template = getModuleTemplate(moduleTemplateId)
  if (!template) return buildAllModuleRarityLevelEntries()

  return allowedModuleRaritiesForTemplate(template).map(rarity => ({
    value: computeModuleRarityIndex(rarity),
    baseValue: computeModuleRarityIndex(rarity),
  }))
}

export function formatModuleRarityOptionLabel(rarityIndex: number): string {
  const rarity = getModuleRarityByIndex(rarityIndex)
  return rarity.startsWith('Ancestral ') && rarity !== 'Ancestral' ? `${rarity}★` : rarity
}

export function buildModuleLevelEntries(moduleRarity: string): readonly GameDropdownOptionEntry[] {
  const cap = getLevelCapForRarity(moduleRarity)
  return buildLevelOptions(cap, 1).map(level => ({ value: level, baseValue: level }))
}

export function formatModuleLevelOptionLabel(level: number): string {
  return String(level)
}

export function buildModuleQuantityEntries(): readonly GameDropdownOptionEntry[] {
  return Array.from({ length: 18 }, (_, index) => {
    const value = index + 1
    return { value, baseValue: value }
  })
}

export function formatModuleQuantityOptionLabel(quantity: number): string {
  return String(quantity)
}

export function buildModuleSubstatRarityEntries(
  maxModuleRarity: string | null | undefined,
): readonly GameDropdownOptionEntry[] {
  const maxRank = moduleRarityRank(maxModuleRarity)
  return MODULE_SUBSTAT_BASE_RARITIES
    .filter(rarity => moduleRarityRank(rarity) <= maxRank)
    .map((rarity, index) => ({ value: index, baseValue: index }))
}

export function formatModuleSubstatRarityOptionLabel(rarityIndex: number): string {
  return atIndex(MODULE_SUBSTAT_BASE_RARITIES, rarityIndex) ?? String(rarityIndex)
}

export function getModuleSubstatRarityByIndex(index: number): ModuleSubstatCanonicalRarity {
  const clamped = Math.max(0, Math.min(MODULE_SUBSTAT_BASE_RARITIES.length - 1, Math.floor(Number(index) || 0)))
  return MODULE_SUBSTAT_BASE_RARITIES[clamped]
}

export function computeModuleSubstatRarityIndex(rarity: string | null | undefined): number {
  const normalized = normalizeModuleSubstatRarity(rarity)
  if (!normalized) return 0
  const idx = MODULE_SUBSTAT_BASE_RARITIES.indexOf(normalized)
  return idx >= 0 ? idx : 0
}
