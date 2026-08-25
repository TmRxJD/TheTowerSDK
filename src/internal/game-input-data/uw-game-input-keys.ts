import { evaluateDropdownOptions } from './dropdown-evaluator'
import type { StandardDropdownOption } from './types'
import {
  buildUwStatFieldLabel,
} from './uw-stat-dropdown-math'
import {
  computeDefaultUwStatStoneLevel,
  findUwStatSpec,
  type UwStatSpec,
} from '../../mechanics/uw-stat-values'

export type UwStatDropdownBinding = {
  dataKey: 'uw_stat_level'
  uwStatSpec: UwStatSpec
}

export function findUwStatDropdownBinding(
  weaponName: string,
  statDisplayName: string,
): UwStatDropdownBinding | null {
  const spec = findUwStatSpec(weaponName, statDisplayName)
  if (!spec) return null
  return { dataKey: 'uw_stat_level', uwStatSpec: spec }
}

/** Same options every UW stat dropdown uses (`GameSelect` / `UwStatLevelSelect`). */
export function evaluateUwStatDropdownOptions(
  weaponName: string,
  statDisplayName: string,
): StandardDropdownOption[] {
  const binding = findUwStatDropdownBinding(weaponName, statDisplayName)
  if (!binding) return []
  return evaluateDropdownOptions(binding.dataKey, { uwStatSpec: binding.uwStatSpec })
}

export {
  buildUwStatFieldLabel,
  computeDefaultUwStatStoneLevel,
  findUwStatSpec,
  type UwStatSpec,
}
