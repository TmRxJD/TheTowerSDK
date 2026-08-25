import { uwStoneChartData } from '../../data/ultimate-weapon-stones'
import type { GameDropdownOptionEntry } from './types'
import { buildUwStatLevelEntries, findUwStatSpec, type UwStatSpec } from '../../mechanics/uw-stat-values'

export { buildUwStatLevelEntries }

export function buildUwStatFieldLabel(weaponName: string, statDisplayName: string): string {
  const spec = findUwStatSpec(weaponName, statDisplayName)
  if (!spec) return `${weaponName} - ${statDisplayName}`
  return `${weaponName} - ${spec.statName}`
}
export function buildUwStatOptionLabel(spec: UwStatSpec, level: number): string {
  const weapon = uwStoneChartData[spec.weaponKey]
  const stat = weapon?.stats.find(entry => entry.name === spec.statName)
  const row = stat?.levels.find(entry => entry.level === level)
  if (!row) return String(level)
  return String(row.value).trim()
}
