import { getWorkshopEnhancementDefinitions } from '../../data/index'
import { getWorkshopStatDefinitions, type WorkshopCategory } from '../../data/index'
export type { WorkshopCategory } from '../../data/index'
import type { GameDropdownOptionEntry } from './types'

export type WorkshopCalcTab = 'workshop' | 'enhancements'
export type WorkshopDiscountProfile = 'workshop' | 'enhancement' | 'vault'

export const WORKSHOP_CALC_SECTIONS: readonly { label: string; value: WorkshopCategory }[] = [
  { label: 'Attack', value: 'attack' },
  { label: 'Defense', value: 'defense' },
  { label: 'Utility', value: 'utility' },
]

export function buildWorkshopCalcSectionEntries(): readonly GameDropdownOptionEntry[] {
  return WORKSHOP_CALC_SECTIONS.map((section, index) => ({
    value: index,
    baseValue: index,
    meta: { section: section.value },
  }))
}

export function buildWorkshopCalcSectionOptionLabel(index: number): string {
  const clamped = Math.max(0, Math.min(WORKSHOP_CALC_SECTIONS.length - 1, Math.floor(Number(index) || 0)))
  return WORKSHOP_CALC_SECTIONS[clamped]?.label ?? String(index)
}

export function resolveWorkshopCalcSectionIndex(section: WorkshopCategory | null | undefined): number {
  const idx = WORKSHOP_CALC_SECTIONS.findIndex(entry => entry.value === (section ?? 'attack'))
  return idx >= 0 ? idx : 0
}

export function resolveWorkshopCalcSectionByIndex(index: number): WorkshopCategory {
  const clamped = Math.max(0, Math.min(WORKSHOP_CALC_SECTIONS.length - 1, Math.floor(Number(index) || 0)))
  return WORKSHOP_CALC_SECTIONS[clamped]?.value ?? 'attack'
}

function workshopCalcStatOptions(tab: WorkshopCalcTab, section: WorkshopCategory): Array<{ label: string; key: string }> {
  if (tab === 'enhancements') {
    return getWorkshopEnhancementDefinitions()
      .filter(stat => stat.category === section)
      .map(stat => ({ label: stat.label, key: stat.key }))
  }
  return getWorkshopStatDefinitions()
    .filter(stat => stat.category === section)
    .map(stat => ({ label: stat.label, key: stat.key }))
}

export function buildWorkshopCalcStatEntries(
  tab: WorkshopCalcTab,
  section: WorkshopCategory,
): readonly GameDropdownOptionEntry[] {
  return workshopCalcStatOptions(tab, section).map((stat, index) => ({
    value: index,
    baseValue: index,
    meta: { statKey: stat.key },
  }))
}

export function buildWorkshopCalcStatOptionLabel(
  index: number,
  tab: WorkshopCalcTab,
  section: WorkshopCategory,
): string {
  const options = workshopCalcStatOptions(tab, section)
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.label ?? String(index)
}

export function resolveWorkshopCalcStatIndex(
  statKey: string | null | undefined,
  tab: WorkshopCalcTab,
  section: WorkshopCategory,
): number {
  const options = workshopCalcStatOptions(tab, section)
  const idx = options.findIndex(option => option.key === statKey)
  return idx >= 0 ? idx : 0
}

export function resolveWorkshopCalcStatByIndex(
  index: number,
  tab: WorkshopCalcTab,
  section: WorkshopCategory,
): string {
  const options = workshopCalcStatOptions(tab, section)
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.key ?? options[0]?.key ?? 'Damage'
}

export function buildWorkshopCalcDiscountEntries(profile: WorkshopDiscountProfile): readonly GameDropdownOptionEntry[] {
  if (profile === 'vault') {
    return [
      { value: 0, baseValue: 0 },
      ...Array.from({ length: 10 }, (_, index) => {
        const value = Number(((index + 1) * 2.5).toFixed(1))
        return { value, baseValue: value }
      }),
    ]
  }

  if (profile === 'enhancement') {
    return [
      { value: 0, baseValue: 0 },
      ...Array.from({ length: 100 }, (_, index) => {
        const value = Number(((index + 1) * 0.3).toFixed(1))
        return { value, baseValue: value }
      }),
    ]
  }

  return [
    { value: 0, baseValue: 0 },
    ...Array.from({ length: 99 }, (_, index) => {
      const value = Number(((index + 1) * 0.5).toFixed(1))
      return { value, baseValue: value }
    }),
  ]
}

export function buildWorkshopCalcDiscountOptionLabel(pct: number): string {
  return `${Number(pct).toFixed(1)}%`
}
