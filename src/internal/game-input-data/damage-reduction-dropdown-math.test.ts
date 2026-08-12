import { describe, expect, it } from 'vitest'
import { evaluateDropdownOptions } from './dropdown-evaluator'
import {
  buildDamageReductionBotBonusEntries,
  buildDamageReductionCfReductionEntries,
  buildDamageReductionCfReductionOptionLabel,
  buildDamageReductionClPlusLevelEntries,
  buildDamageReductionCtLevelEntries,
  buildDamageReductionFlameBotEntries,
  buildDamageReductionFlameBotOptionLabel,
  buildDamageReductionNmpReductionEntries,
  buildDamageReductionPrimordialCollapseEntries,
  formatDamageReductionBotBonusOptionLabel,
} from './damage-reduction-dropdown-math'

describe('damage reduction dropdown math', () => {
  it('sources bot bot bonus from Bot Bot Bonus stat levels', () => {
    const entries = buildDamageReductionBotBonusEntries()

    expect(entries[0]).toEqual({ value: 0, baseValue: -1 })
    expect(entries[1]).toEqual({ value: 1.05, baseValue: 0 })
    expect(entries.at(-1)).toEqual({ value: 2, baseValue: 19 })
    expect(entries).toHaveLength(21)
    expect(formatDamageReductionBotBonusOptionLabel(1.05)).toBe('1.05x')
  })

  it('sources flame bot reduction from Flame Bot stat table', () => {
    const entries = buildDamageReductionFlameBotEntries()

    expect(entries[0]).toEqual({ value: 20, baseValue: 0 })
    expect(entries.at(-1)).toEqual({ value: 95, baseValue: 25 })
    expect(entries).toHaveLength(26)
    expect(buildDamageReductionFlameBotOptionLabel(20, 0, 0)).toBe('20%')
  })

  it('sources chrono field reduction from chrono_field_reduction lab math', () => {
    const entries = buildDamageReductionCfReductionEntries()

    expect(entries[0]).toEqual({ value: 10.5, baseValue: 1 })
    expect(entries.at(-1)).toEqual({ value: 25, baseValue: 30 })
    expect(buildDamageReductionCfReductionOptionLabel(10.5, 1)).toBe('10.5%')
  })

  it('sources NMP and PC from module rarity bonus tables', () => {
    expect(buildDamageReductionNmpReductionEntries().map(entry => entry.value)).toEqual([1, 1.5, 2, 2.5])
    expect(buildDamageReductionPrimordialCollapseEntries().map(entry => entry.value)).toEqual([60, 65, 75, 90])
  })

  it('sources chain thunder and CL+ level counts from game tables', () => {
    expect(buildDamageReductionCtLevelEntries()).toHaveLength(30)
    expect(buildDamageReductionClPlusLevelEntries()).toHaveLength(12)
  })

  it('evaluates registry keys with canonical labels', () => {
    expect(evaluateDropdownOptions('damage_reduction_bot_bonus', {})[1]).toEqual({
      value: 1.05,
      label: '1.05x',
    })
    expect(evaluateDropdownOptions('damage_reduction_flame_bot', {})[0]).toEqual({
      value: 20,
      label: '20%',
    })
    expect(evaluateDropdownOptions('damage_reduction_nmp_reduction', {})[3]).toEqual({
      value: 2.5,
      label: '2.5%',
    })
    expect(evaluateDropdownOptions('damage_reduction_primordial_collapse', {})[3]).toEqual({
      value: 90,
      label: '90%',
    })
  })

  it('evaluates all damage reduction registry keys quickly', () => {
    const keys = [
      'damage_reduction_cf_reduction',
      'damage_reduction_flame_bot',
      'damage_reduction_bot_bonus',
      'damage_reduction_nmp_reduction',
      'damage_reduction_nmp_orb_hits',
      'damage_reduction_primordial_collapse',
      'damage_reduction_ct_level',
      'damage_reduction_cl_plus_level',
      'damage_reduction_avg_cl_hits',
    ] as const

    const start = performance.now()
    for (let iteration = 0; iteration < 100; iteration += 1) {
      for (const key of keys) {
        evaluateDropdownOptions(key, {})
      }
    }
    const elapsedMs = performance.now() - start
    expect(elapsedMs).toBeLessThan(250)
  })
})
