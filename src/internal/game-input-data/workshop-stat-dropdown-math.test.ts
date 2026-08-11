import { describe, expect, it } from 'vitest'
import { evaluateDropdownOptions } from './dropdown-evaluator'
import { computeWorkshopEnhancementMaxLevel } from './workshop-enhancement-dropdown-math'
import { buildWorkshopStatOptionLabel } from './workshop-stat-dropdown-math'
import { ELS_ATTACK_WORKSHOP_KEY, ELS_ENHANCEMENT_KEY } from '../../mechanics/els-upgrade-path'

describe('workshop stat dropdown labels', () => {
  it('shows raw level for utility ELS workshop stats', () => {
    expect(buildWorkshopStatOptionLabel(ELS_ATTACK_WORKSHOP_KEY, 680)).toBe('680')
    expect(buildWorkshopStatOptionLabel(ELS_ATTACK_WORKSHOP_KEY, 0)).toBe('0')
    expect(buildWorkshopStatOptionLabel('Damage', 100)).not.toBe('100')
  })

  it('builds ELS utility level options as integers 0–699', () => {
    const options = evaluateDropdownOptions('workshop_stat_level', {
      workshopStatKey: ELS_ATTACK_WORKSHOP_KEY,
    })
    expect(options[0]?.label).toBe('0')
    expect(options[699]?.label).toBe('699')
    expect(options[699]?.value).toBe(699)
    expect(options[680]?.label).toBe('680')
  })
})

describe('workshop enhancement max level', () => {
  it('includes level 60 for Enemy Level Skip enhancement', () => {
    expect(computeWorkshopEnhancementMaxLevel(ELS_ENHANCEMENT_KEY)).toBe(60)
    const options = evaluateDropdownOptions('workshop_enhancement_level', {
      workshopEnhancementKey: ELS_ENHANCEMENT_KEY,
    })
    expect(options.at(-1)?.value).toBe(60)
    expect(options.at(-1)?.label).toBe('60')
  })
})
