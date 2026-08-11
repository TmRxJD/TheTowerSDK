import { describe, expect, it } from 'vitest'
import {
  DISSONANCE_ECHO_LAB_SLUG_BY_TYPE,
  computeEffectiveEchoLabLevel,
  getEffectiveEchoLabLevels,
} from './dissonance-echo-lab-keys'
import {
  buildDissonanceEchoLabOptionLabel,
  computeDissonanceEchoLabBenefitPct,
} from './dissonance-echo-lab-dropdown-math'
import { evaluateDropdownOptions } from './dropdown-evaluator'

describe('dissonance-echo-lab-keys', () => {
  it('maps dissonance tracks to research lab slugs', () => {
    expect(DISSONANCE_ECHO_LAB_SLUG_BY_TYPE.attack).toBe('dissonant_echo_attack')
    expect(DISSONANCE_ECHO_LAB_SLUG_BY_TYPE.uw).toBe('dissonant_echo_ultimate_weapons')
  })

  it('prefers the higher of store and research lab levels', () => {
    expect(computeEffectiveEchoLabLevel('attack', { attack: 2 }, { dissonant_echo_attack: 5 })).toBe(5)
    expect(computeEffectiveEchoLabLevel('defense', { defense: 8 }, { dissonant_echo_defense: 3 })).toBe(8)
  })

  it('clamps echo lab levels to 0–20', () => {
    expect(getEffectiveEchoLabLevels(
      { attack: 99, defense: -3, utility: 4, uw: 1 },
      { dissonant_echo_attack: 0, dissonant_echo_defense: 21 },
    )).toEqual({
      attack: 20,
      defense: 20,
      utility: 4,
      uw: 1,
    })
  })
})

describe('dissonance echo lab dropdown labels', () => {
  it('shows level and echo benefit percent from lab catalog', () => {
    expect(buildDissonanceEchoLabOptionLabel('dissonant_echo_attack', 0)).toBe('0 - 0.5%')
    expect(buildDissonanceEchoLabOptionLabel('dissonant_echo_attack', 1)).toBe('1 - 1.0%')
    expect(buildDissonanceEchoLabOptionLabel('dissonant_echo_attack', 10)).toBe('10 - 5.5%')
    expect(buildDissonanceEchoLabOptionLabel('dissonant_echo_attack', 20)).toBe('20 - 10.5%')
    expect(computeDissonanceEchoLabBenefitPct('dissonant_echo_attack', 0)).toBeCloseTo(0.5, 6)
    expect(computeDissonanceEchoLabBenefitPct('dissonant_echo_attack', 20)).toBeCloseTo(10.5, 6)
  })

  it('registers dedicated game-input keys with dynamic labels', () => {
    const options = evaluateDropdownOptions('dissonance_echo_attack_lab', {})
    expect(options).toHaveLength(21)
    expect(options[0]?.label).toBe('0 - 0.5%')
    expect(options[1]?.label).toBe('1 - 1.0%')
    expect(options[20]?.label).toBe('20 - 10.5%')
  })
})
