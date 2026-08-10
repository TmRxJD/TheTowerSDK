import type { GameDropdownOptionEntry } from './types'
import type { UptimeResearchLabKind, UptimeResearchLabSpec } from './uptime-research-lab-keys'

export function buildUptimeResearchLabLevelEntries(
  spec: Pick<UptimeResearchLabSpec, 'minLevel' | 'maxLevel'>,
): readonly GameDropdownOptionEntry[] {
  const length = spec.maxLevel - spec.minLevel + 1
  return Array.from({ length }, (_, index) => {
    const value = spec.minLevel + index
    return { value, baseValue: value }
  })
}

export function buildUptimeResearchLabOptionLabel(
  kind: UptimeResearchLabKind,
  level: number,
): string {
  switch (kind) {
    case 'seconds_bonus':
      return `+${level}s`
    case 'bc_reduction_pct':
      return `${level * 2}%`
    case 'wave_count':
      return level === 1 ? '1 wave' : `${level} waves`
    default:
      return String(level)
  }
}
