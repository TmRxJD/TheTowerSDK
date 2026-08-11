import {
  MODULE_SUBSTAT_BASE_RARITIES,
  MODULE_SUBSTAT_CANONICAL_DATA,
  type ModuleSubstatCanonicalCategory,
} from '../../data/index'
import { MODULE_RARITIES } from '../../data/index'
import {
  MODULE_TEMPLATES,
  type ModuleCategory,
  type ModuleRarityLabel,
  type ModuleTemplate,
} from '../../data/index'
import type { GameDropdownOptionEntry } from './types'

const CANONICAL_TO_MODULE_CATEGORY: Record<ModuleSubstatCanonicalCategory, ModuleCategory> = {
  Cannon: 'Cannon',
  Defense: 'Armor',
  Generator: 'Generator',
  Core: 'Core',
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildSubstatId(category: ModuleCategory, label: string, existing: Set<string>): string {
  const baseSlug = slugify(label) || 'substat'
  const baseId = `${category.toLowerCase()}-${baseSlug}`
  let candidate = baseId
  let counter = 2
  while (existing.has(candidate)) {
    candidate = `${baseId}-${counter}`
    counter += 1
  }
  existing.add(candidate)
  return candidate
}

export interface ModuleSubstatPickerEntry {
  id: string
  label: string
  category: ModuleCategory
  availableRarities: readonly ModuleRarityLabel[]
}

const SUBSTAT_PICKER_ENTRIES: ModuleSubstatPickerEntry[] = (() => {
  const entries: ModuleSubstatPickerEntry[] = []
  const usedIds = new Set<string>()
  for (const [rawCategory, categoryData] of Object.entries(MODULE_SUBSTAT_CANONICAL_DATA) as Array<[
    ModuleSubstatCanonicalCategory,
    (typeof MODULE_SUBSTAT_CANONICAL_DATA)[ModuleSubstatCanonicalCategory],
  ]>) {
    const category = CANONICAL_TO_MODULE_CATEGORY[rawCategory]
    for (const substatDef of categoryData.substats) {
      const id = buildSubstatId(category, substatDef.label, usedIds)
      entries.push({
        id,
        label: substatDef.label,
        category,
        availableRarities: [...substatDef.availableRarities],
      })
    }
  }
  return entries
})()

const SUBSTAT_PICKER_BY_CATEGORY = SUBSTAT_PICKER_ENTRIES.reduce((acc, entry) => {
  if (!acc[entry.category]) acc[entry.category] = []
  acc[entry.category].push(entry)
  return acc
}, {} as Record<ModuleCategory, ModuleSubstatPickerEntry[]>)

const rarityOrderMap = new Map<ModuleRarityLabel, number>(MODULE_RARITIES.map((rarity, index) => [rarity, index]))

function rarityRank(rarity: ModuleRarityLabel): number {
  return rarityOrderMap.get(rarity) ?? Number.MAX_SAFE_INTEGER
}

function normalizeSubstatRarity(rarity: string | null | undefined): ModuleRarityLabel | null {
  if (!rarity || typeof rarity !== 'string') return null
  const trimmed = rarity.trim()
  const base = MODULE_SUBSTAT_BASE_RARITIES.find(candidate => trimmed.startsWith(candidate))
  return (base as ModuleRarityLabel | undefined) ?? null
}

function sortEquippedModuleTemplates(templates: ModuleTemplate[]): ModuleTemplate[] {
  return templates.slice().sort((a, b) => {
    if (a.unique !== b.unique) return a.unique ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function filterEquippedModuleTemplates(
  category: ModuleCategory | undefined,
  excludeTemplateIds: readonly string[] = [],
): ModuleTemplate[] {
  if (!category) return []
  const excluded = new Set(excludeTemplateIds)
  return sortEquippedModuleTemplates(
    MODULE_TEMPLATES.filter(template => template.type === category && !excluded.has(template.id)),
  )
}

export function buildModuleEquippedPickerEntries(
  category: ModuleCategory | undefined,
  excludeTemplateIds: readonly string[] = [],
): readonly GameDropdownOptionEntry[] {
  return filterEquippedModuleTemplates(category, excludeTemplateIds).map((template, index) => ({
    value: index,
    baseValue: index,
    meta: {
      templateId: template.id,
      label: template.name,
      subtitle: template.initials,
    },
  }))
}

export function buildModuleEquippedPickerOptionLabel(
  index: number,
  category: ModuleCategory | undefined,
  excludeTemplateIds: readonly string[] = [],
): string {
  const templates = filterEquippedModuleTemplates(category, excludeTemplateIds)
  const clamped = Math.max(0, Math.min(templates.length - 1, Math.floor(Number(index) || 0)))
  return templates[clamped]?.name ?? String(index)
}

export function buildModuleEquippedPickerOptionSubtitle(
  index: number,
  category: ModuleCategory | undefined,
  excludeTemplateIds: readonly string[] = [],
): string | undefined {
  const templates = filterEquippedModuleTemplates(category, excludeTemplateIds)
  const clamped = Math.max(0, Math.min(templates.length - 1, Math.floor(Number(index) || 0)))
  return templates[clamped]?.initials
}

export function computeModuleEquippedPickerIndex(
  templateId: unknown,
  category: ModuleCategory | undefined,
  excludeTemplateIds: readonly string[] = [],
): number {
  if (typeof templateId !== 'string' || !templateId) return -1
  const templates = filterEquippedModuleTemplates(category, excludeTemplateIds)
  return templates.findIndex(template => template.id === templateId)
}

export function findModuleEquippedPickerByIndex(
  index: number,
  category: ModuleCategory | undefined,
  excludeTemplateIds: readonly string[] = [],
): string | null {
  const templates = filterEquippedModuleTemplates(category, excludeTemplateIds)
  const clamped = Math.max(0, Math.min(templates.length - 1, Math.floor(Number(index) || 0)))
  return templates[clamped]?.id ?? null
}

function filterSubstatPickerEntries(options: {
  category?: ModuleCategory
  excludeSubstatIds?: readonly string[]
  filterRarity?: string | null
  maxSubstatRarity?: string | null
}): ModuleSubstatPickerEntry[] {
  const { category, excludeSubstatIds = [], filterRarity, maxSubstatRarity } = options
  if (!category) return []
  const excluded = new Set(excludeSubstatIds)
  const normalizedFilter = filterRarity ? normalizeSubstatRarity(filterRarity) : null
  const normalizedMax = maxSubstatRarity ? normalizeSubstatRarity(maxSubstatRarity) : null
  const maxRank = normalizedMax ? rarityRank(normalizedMax) : Number.MAX_SAFE_INTEGER

  return (SUBSTAT_PICKER_BY_CATEGORY[category] ?? []).filter(entry => {
    if (excluded.has(entry.id)) return false
    if (normalizedFilter && !entry.availableRarities.includes(normalizedFilter)) return false
    if (normalizedMax) {
      const supportsCap = entry.availableRarities.some(rarity => rarityRank(rarity) <= maxRank)
      if (!supportsCap) return false
    }
    return true
  })
}

export function buildModuleSubstatTypePickerEntries(options: {
  category?: ModuleCategory
  excludeSubstatIds?: readonly string[]
  filterRarity?: string | null
  maxSubstatRarity?: string | null
}): readonly GameDropdownOptionEntry[] {
  return filterSubstatPickerEntries(options).map((entry, index) => ({
    value: index,
    baseValue: index,
    meta: {
      substatId: entry.id,
      label: entry.label,
    },
  }))
}

export function buildModuleSubstatTypePickerOptionLabel(
  index: number,
  options: {
    category?: ModuleCategory
    excludeSubstatIds?: readonly string[]
    filterRarity?: string | null
    maxSubstatRarity?: string | null
  },
): string {
  const entries = filterSubstatPickerEntries(options)
  const clamped = Math.max(0, Math.min(entries.length - 1, Math.floor(Number(index) || 0)))
  return entries[clamped]?.label ?? String(index)
}

export function computeModuleSubstatTypePickerIndex(
  substatId: unknown,
  options: {
    category?: ModuleCategory
    excludeSubstatIds?: readonly string[]
    filterRarity?: string | null
    maxSubstatRarity?: string | null
  },
): number {
  if (typeof substatId !== 'string' || !substatId) return -1
  const entries = filterSubstatPickerEntries(options)
  return entries.findIndex(entry => entry.id === substatId)
}

export function findModuleSubstatTypePickerByIndex(
  index: number,
  options: {
    category?: ModuleCategory
    excludeSubstatIds?: readonly string[]
    filterRarity?: string | null
    maxSubstatRarity?: string | null
  },
): string | null {
  const entries = filterSubstatPickerEntries(options)
  const clamped = Math.max(0, Math.min(entries.length - 1, Math.floor(Number(index) || 0)))
  return entries[clamped]?.id ?? null
}

export function findModuleSubstatPickerCategoryFromSlotKey(slotKey: string | undefined): ModuleCategory | undefined {
  if (!slotKey) return undefined
  const category = slotKey.split(':')[1]
  if (category === 'Cannon' || category === 'Armor' || category === 'Generator' || category === 'Core') {
    return category
  }
  return undefined
}

export function getModuleEquippedExcludeForSlot(
  slotKey: string | undefined,
  otherSlotSelection: string | null | undefined,
): string[] {
  return otherSlotSelection ? [otherSlotSelection] : []
}
