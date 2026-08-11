import type { GameDropdownOptionEntry } from './types'

export function buildModuleDiscountEntries(): readonly GameDropdownOptionEntry[] {
  return Array.from({ length: 31 }, (_, index) => ({
    value: index,
    baseValue: index,
  }))
}

export function formatModuleDiscountOptionLabel(pct: number): string {
  return `${Math.max(0, Math.min(30, Math.floor(Number(pct) || 0)))}%`
}
