import { buildTierSelectItems } from '../../data/index'
import type { TierSelectionInput } from '../../data/index'
import type { GameDropdownOptionEntry } from './types'

export function buildEnemyTierSelectionEntries(): readonly GameDropdownOptionEntry[] {
  return buildTierSelectItems().map((option, index) => ({
    value: index,
    baseValue: index,
    meta: { selection: option.value },
  }))
}

export function formatEnemyTierSelectionOptionLabel(index: number): string {
  const options = buildTierSelectItems()
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.title ?? String(index)
}

export function computeEnemyTierSelectionIndex(selection: TierSelectionInput | null | undefined): number {
  const options = buildTierSelectItems()
  const idx = options.findIndex(option => option.value === (selection ?? 1))
  return idx >= 0 ? idx : 0
}

export function getEnemyTierSelectionByIndex(index: number): TierSelectionInput {
  const options = buildTierSelectItems()
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.value ?? 1
}

export const ELS_FOCUS_OPTIONS = [
  { title: 'Combined (Attack + Health)', value: 'combined' },
  { title: 'Attack only', value: 'attack' },
  { title: 'Health only', value: 'health' },
] as const

export type ElsFocusValue = typeof ELS_FOCUS_OPTIONS[number]['value']

export function buildElsFocusEntries(): readonly GameDropdownOptionEntry[] {
  return ELS_FOCUS_OPTIONS.map((option, index) => ({
    value: index,
    baseValue: index,
    meta: { focus: option.value },
  }))
}

export function formatElsFocusOptionLabel(index: number): string {
  const clamped = Math.max(0, Math.min(ELS_FOCUS_OPTIONS.length - 1, Math.floor(Number(index) || 0)))
  return ELS_FOCUS_OPTIONS[clamped]?.title ?? String(index)
}

export function computeElsFocusIndex(focus: ElsFocusValue | null | undefined): number {
  const idx = ELS_FOCUS_OPTIONS.findIndex(option => option.value === (focus ?? 'combined'))
  return idx >= 0 ? idx : 0
}

export function getElsFocusByIndex(index: number): ElsFocusValue {
  const clamped = Math.max(0, Math.min(ELS_FOCUS_OPTIONS.length - 1, Math.floor(Number(index) || 0)))
  return ELS_FOCUS_OPTIONS[clamped]?.value ?? 'combined'
}
