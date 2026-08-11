import type { GameDropdownOptionEntry } from './types'

export interface UiDynamicDropdownOption {
  value: string
  label: string
  subtitle?: string
}

export function buildUiDynamicDropdownEntries(
  options: readonly UiDynamicDropdownOption[] = [],
): readonly GameDropdownOptionEntry[] {
  return options.map((option, index) => ({
    value: index,
    baseValue: index,
    meta: {
      stringValue: option.value,
      label: option.label,
      subtitle: option.subtitle,
    },
  }))
}

export function buildUiDynamicDropdownOptionLabel(
  index: number,
  options: readonly UiDynamicDropdownOption[] = [],
): string {
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.label ?? String(index)
}

export function buildUiDynamicDropdownOptionSubtitle(
  index: number,
  options: readonly UiDynamicDropdownOption[] = [],
): string | undefined {
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.subtitle
}

export function computeUiDynamicDropdownIndex(
  value: unknown,
  options: readonly UiDynamicDropdownOption[] = [],
): number {
  if (typeof value !== 'string' && typeof value !== 'number') return -1
  const normalized = String(value)
  return options.findIndex(option => option.value === normalized)
}

export function findUiDynamicDropdownByIndex(
  index: number,
  options: readonly UiDynamicDropdownOption[] = [],
): string | null {
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.value ?? null
}
