import { moduleTypeItems } from '../module-calculator-options'
import type { ModuleType } from '../shard-splitter-schema'
import type { GameDropdownOptionEntry } from './types'

export function buildModuleTypeCategoryEntries(): readonly GameDropdownOptionEntry[] {
  return moduleTypeItems.map((option, index) => ({
    value: index,
    baseValue: index,
    meta: { moduleType: option.value },
  }))
}

export function buildModuleTypeCategoryOptionLabel(index: number): string {
  const clamped = Math.max(0, Math.min(moduleTypeItems.length - 1, Math.floor(Number(index) || 0)))
  return moduleTypeItems[clamped]?.title ?? String(index)
}

export function resolveModuleTypeCategoryIndex(moduleType: ModuleType | null | undefined): number {
  const idx = moduleTypeItems.findIndex(option => option.value === (moduleType ?? 'cannon'))
  return idx >= 0 ? idx : 0
}

export function resolveModuleTypeCategoryByIndex(index: number): ModuleType {
  const clamped = Math.max(0, Math.min(moduleTypeItems.length - 1, Math.floor(Number(index) || 0)))
  return moduleTypeItems[clamped]?.value ?? 'cannon'
}

export function buildModuleLabEfficiencyEntries(): readonly GameDropdownOptionEntry[] {
  return Array.from({ length: 31 }, (_, value) => ({ value, baseValue: value }))
}

export function buildModuleLabEfficiencyOptionLabel(level: number): string {
  return `${Math.max(0, Math.min(30, Math.floor(Number(level) || 0)))}%`
}

export function buildGenericLabLevelEntries(maxLevel: number): readonly GameDropdownOptionEntry[] {
  const cap = Math.max(0, Math.floor(Number(maxLevel) || 0))
  return Array.from({ length: cap + 1 }, (_, value) => ({ value, baseValue: value }))
}

export function buildGenericLabLevelOptionLabel(level: number, maxLevel: number): string {
  const cap = Math.max(0, Math.floor(Number(maxLevel) || 0))
  const clamped = Math.max(0, Math.min(cap, Math.floor(Number(level) || 0)))
  return String(clamped)
}
