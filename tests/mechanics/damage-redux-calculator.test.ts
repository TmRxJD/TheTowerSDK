import { describe, expect, it } from 'vitest'
import {
  applyDamageReduxLayerStack,
  effectiveRelativeDefenseReductionPct,
} from '../../src/mechanics/combat/damage-redux-calculator'
import { applyRelativeDefense } from '../../src/mechanics/combat/damage-reduction'

describe('damage-redux-calculator', () => {
  it('uses linear defense percent capped at 98%', () => {
    expect(applyRelativeDefense(100, 98)).toBeCloseTo(2, 8)
    expect(applyRelativeDefense(100, 50)).toBeCloseTo(50, 8)
    expect(effectiveRelativeDefenseReductionPct(98)).toBeCloseTo(98, 2)
    expect(effectiveRelativeDefenseReductionPct(120)).toBeCloseTo(98, 2)
  })

  it('applies layers in game order: rel → abs → chrono → CT → flame → PC → NMP', () => {
    const { final, steps } = applyDamageReduxLayerStack(1000, {
      useDefense: true,
      defenseRel: 98,
      useDefAbs: true,
      defenseAbsolute: 100,
      useChrono: true,
      chronoReductionPct: 25,
      useFlameBot: true,
      flameBotReductionPct: 95,
      useNmp: true,
      nmpTotalReductionPct: 50,
      usePc: true,
      pcReductionPct: 80,
      useChainThunder: true,
      chainThunderReductionPct: 30,
    })
    expect(steps.map(step => step.key)).toEqual([
      'defenseRel',
      'defenseAbsolute',
      'chrono',
      'chainThunder',
      'flameBot',
      'pc',
      'nmp',
    ])
    let expected = applyRelativeDefense(1000, 98)
    expected = Math.max(0, expected - 100)
    expected *= 0.75
    expected *= 0.70
    expected *= 0.05
    expected *= 0.20
    expected *= 0.50
    expect(final).toBeCloseTo(expected, 6)
  })
})
