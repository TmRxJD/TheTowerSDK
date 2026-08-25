import { describe, expect, it } from 'vitest'
import {
  buildUwStatFieldLabel,
  buildUwStatOptionLabel,
} from './uw-stat-dropdown-math'
import {
  computeDefaultUwStatStoneLevel,
  findUwStatSpec,
} from '../../mechanics/uw-stat-values'
import { evaluateUwStatDropdownOptions, findUwStatDropdownBinding } from './uw-game-input-keys'

describe('uw stat dropdown helpers', () => {
  it('builds canonical field labels', () => {
    expect(buildUwStatFieldLabel('Golden Tower', 'Cooldown')).toBe('Golden Tower - Cooldown')
    expect(buildUwStatFieldLabel('Unknown Weapon', 'Cooldown')).toBe('Unknown Weapon - Cooldown')
  })

  it('resolves dropdown binding for known stats', () => {
    const binding = findUwStatDropdownBinding('Golden Tower', 'Cooldown')
    expect(binding).toEqual({
      dataKey: 'uw_stat_level',
      uwStatSpec: findUwStatSpec('Golden Tower', 'Cooldown'),
    })
  })

  it('returns identical options from the shared evaluator', () => {
    const options = evaluateUwStatDropdownOptions('Golden Tower', 'Cooldown')
    expect(options.length).toBeGreaterThan(0)
    const spec = findUwStatSpec('Golden Tower', 'Cooldown')!
    expect(options[0]?.label).toBe(buildUwStatOptionLabel(spec, options[0]!.value))
  })

  it('resolves default stone level from chart data', () => {
    expect(computeDefaultUwStatStoneLevel('Golden Tower', 'Cooldown')).toBeGreaterThanOrEqual(0)
  })
})
