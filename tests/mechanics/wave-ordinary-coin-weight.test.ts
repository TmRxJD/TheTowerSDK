import { describe, expect, it } from 'vitest'
import { measuredAverageEnemyCoinWeight } from '../../src/mechanics/enemies/type-mix'
import {
  ordinaryCoinWeightAtWave,
} from '../../src/mechanics/resource-drops/wave-ordinary-coin-weight'
import { ordinarySpawnChancesForCoinMix } from '../../src/mechanics/waves/spawn-type-chances-coin-mix'

describe('wave-ordinary-coin-weight', () => {
  it('wave 1 tier 1 coin weight is in ordinary band', () => {
    const w = ordinaryCoinWeightAtWave(1, 1)
    expect(w).toBeGreaterThan(1)
    expect(w).toBeLessThan(4)
  })

  it('tier 21 coin mix keeps basic share positive', () => {
    const chances = ordinarySpawnChancesForCoinMix(21, 4875)
    expect(chances.Basic).toBeGreaterThan(0)
  })

  it('coin mix ignores absolute scene ints as tier-weight bases', () => {
    // Scene primary has fast=15; if used as a coeff, tier 21 basic would be 0.
    const chances = ordinarySpawnChancesForCoinMix(21, 4875)
    expect(chances.Basic).toBeGreaterThan(0)
    expect(chances.Fast).toBeLessThan(50)
  })

  it('tier 21 coin weight is near measured round average', () => {
    const w = ordinaryCoinWeightAtWave(21, 4875)
    const measured = measuredAverageEnemyCoinWeight()
    expect(Math.abs(w - measured)).toBeLessThan(0.2)
    expect(measured).toBeCloseTo(2.34, 2)
  })
})
