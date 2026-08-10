import { evaluateDropdownOptions } from './dropdown-evaluator'
import type { StandardDropdownOption } from './types'
import {
  buildUwStatFieldLabel,
  resolveDefaultUwStatStoneLevel,
  resolveUwStatSpec,
  type UwStatSpec,
} from './uw-stat-dropdown-math'

export type UwStatDropdownBinding = {
  dataKey: 'uw_stat_level'
  uwStatSpec: UwStatSpec
}

export function resolveUwStatDropdownBinding(
  weaponName: string,
  statDisplayName: string,
): UwStatDropdownBinding | null {
  const spec = resolveUwStatSpec(weaponName, statDisplayName)
  if (!spec) return null
  return { dataKey: 'uw_stat_level', uwStatSpec: spec }
}

/** Same options every UW stat dropdown uses (`GameSelect` / `UwStatLevelSelect`). */
export function evaluateUwStatDropdownOptions(
  weaponName: string,
  statDisplayName: string,
): StandardDropdownOption[] {
  const binding = resolveUwStatDropdownBinding(weaponName, statDisplayName)
  if (!binding) return []
  return evaluateDropdownOptions(binding.dataKey, { uwStatSpec: binding.uwStatSpec })
}

export {
  buildUwStatFieldLabel,
  resolveDefaultUwStatStoneLevel,
  resolveUwStatSpec,
  type UwStatSpec,
}
