import type { GameDropdownOptionEntry } from './types'

export function buildCardCopiesOwnedEntries(maxCopies = 80): readonly GameDropdownOptionEntry[] {
  const cap = Math.max(0, Math.floor(Number(maxCopies) || 80))
  return Array.from({ length: cap + 1 }, (_, value) => ({ value, baseValue: value }))
}

export function buildCardCopiesOwnedOptionLabel(copies: number): string {
  return String(Math.max(0, Math.min(80, Math.floor(Number(copies) || 0))))
}

export function buildCardEquippedSlotsEntries(maxSlots = 27): readonly GameDropdownOptionEntry[] {
  const cap = Math.max(0, Math.floor(Number(maxSlots) || 27))
  return Array.from({ length: cap + 1 }, (_, value) => ({ value, baseValue: value }))
}

export function buildCardEquippedSlotsOptionLabel(slots: number): string {
  return String(Math.max(0, Math.floor(Number(slots) || 0)))
}
