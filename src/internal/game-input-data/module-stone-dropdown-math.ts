import { getStoneCostOptions, getStoneTargetOptions } from '../module-calculator-options'
import type { GameDropdownOptionEntry } from './types'

export type ModuleStoneCostProfile = 'current' | 'target'

export function buildModuleStoneCostEntries(profile: ModuleStoneCostProfile = 'current'): readonly GameDropdownOptionEntry[] {
  const options = profile === 'target' ? getStoneTargetOptions() : getStoneCostOptions()
  return options.map((option, index) => ({
    value: index,
    baseValue: index,
    meta: { level: option.level, stoneCost: option.value },
  }))
}

export function buildModuleStoneCostOptionLabel(index: number, profile: ModuleStoneCostProfile = 'current'): string {
  const options = profile === 'target' ? getStoneTargetOptions() : getStoneCostOptions()
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.title ?? String(index)
}

export function resolveModuleStoneCostIndex(
  level: number | null | undefined,
  profile: ModuleStoneCostProfile = 'current',
): number {
  const options = profile === 'target' ? getStoneTargetOptions() : getStoneCostOptions()
  const idx = options.findIndex(option => option.level === Math.floor(Number(level) || 0))
  return idx >= 0 ? idx : 0
}

export function resolveModuleStoneCostLevelByIndex(
  index: number,
  profile: ModuleStoneCostProfile = 'current',
): number {
  const options = profile === 'target' ? getStoneTargetOptions() : getStoneCostOptions()
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.level ?? 0
}
