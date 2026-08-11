import { MODULE_RARITIES } from '../../data/index'
import {
  MODULE_TEMPLATES,
  type ModuleCategory,
  type ModuleRarityLabel,
  type ModuleTemplate,
} from '../../data/index'
import { MODULE_TRACKER_CATEGORIES } from './tracker-ui-dropdown-math'
import type { GameDropdownOptionEntry } from './types'

const rarityOrderMap = new Map<ModuleRarityLabel, number>(MODULE_RARITIES.map((rarity, index) => [rarity, index]))
const typeOrderMap = new Map<ModuleCategory, number>(MODULE_TRACKER_CATEGORIES.map((type, index) => [type, index]))

function rarityRank(rarity: ModuleRarityLabel): number {
  return rarityOrderMap.get(rarity) ?? Number.MAX_SAFE_INTEGER
}

function typeRank(type?: ModuleCategory): number {
  if (!type) return Number.MAX_SAFE_INTEGER
  return typeOrderMap.get(type) ?? Number.MAX_SAFE_INTEGER
}

function sortModuleTemplates(templates: ModuleTemplate[], moduleTypeFilter: string): ModuleTemplate[] {
  return templates.slice().sort((a, b) => {
    if (moduleTypeFilter === 'All') {
      const rarityDiff = rarityRank(b.maxRarity) - rarityRank(a.maxRarity)
      if (rarityDiff !== 0) return rarityDiff
      const typeDiff = typeRank(a.type) - typeRank(b.type)
      if (typeDiff !== 0) return typeDiff
      return a.name.localeCompare(b.name)
    }
    if (a.unique !== b.unique) return a.unique ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function filterModuleTemplatesForPicker(moduleTypeFilter: string | undefined): ModuleTemplate[] {
  const filter = moduleTypeFilter ?? 'All'
  const filtered = MODULE_TEMPLATES.filter(template => filter === 'All' || template.type === filter)
  return sortModuleTemplates(filtered, filter)
}

export function buildModuleTemplatePickerEntries(moduleTypeFilter?: string): readonly GameDropdownOptionEntry[] {
  return filterModuleTemplatesForPicker(moduleTypeFilter).map((template, index) => ({
    value: index,
    baseValue: index,
    meta: {
      templateId: template.id,
      label: `${template.type} — ${template.name}`,
      subtitle: template.initials,
    },
  }))
}

export function buildModuleTemplatePickerOptionLabel(index: number, moduleTypeFilter?: string): string {
  const templates = filterModuleTemplatesForPicker(moduleTypeFilter)
  const clamped = Math.max(0, Math.min(templates.length - 1, Math.floor(Number(index) || 0)))
  const template = templates[clamped]
  return template ? `${template.type} — ${template.name}` : String(index)
}

export function buildModuleTemplatePickerOptionSubtitle(index: number, moduleTypeFilter?: string): string | undefined {
  const templates = filterModuleTemplatesForPicker(moduleTypeFilter)
  const clamped = Math.max(0, Math.min(templates.length - 1, Math.floor(Number(index) || 0)))
  return templates[clamped]?.initials
}

export function computeModuleTemplatePickerIndex(templateId: unknown, moduleTypeFilter?: string): number {
  if (typeof templateId !== 'string' || !templateId) return -1
  const templates = filterModuleTemplatesForPicker(moduleTypeFilter)
  return templates.findIndex(template => template.id === templateId)
}

export function findModuleTemplatePickerByIndex(index: number, moduleTypeFilter?: string): string | null {
  const templates = filterModuleTemplatesForPicker(moduleTypeFilter)
  const clamped = Math.max(0, Math.min(templates.length - 1, Math.floor(Number(index) || 0)))
  return templates[clamped]?.id ?? null
}
