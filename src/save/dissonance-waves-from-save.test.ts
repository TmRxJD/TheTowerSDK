import { describe, expect, it } from 'vitest'
import { deriveDissonanceCalculatorStateFromSaveRoot } from './shared-tool-inputs-from-save-extended'

/**
 * Tier/type wave values were reported as 0 on the dissonance calculator for a
 * player with most tiers maxed, while the echo lab levels came through.
 *
 * The save layout is documented in the-tower-save-index-map.json: each track is
 * a Unity List<int> of length 22, index 0 unused, index N = tier N (1-based),
 * and 5000 means maxed.
 */
function unityList(values: number[]): Record<string, unknown> {
  return { _items: values, _size: values.length }
}

/** Index 0 unused, then one wave per tier. */
function trackWaves(perTier: number[]): Record<string, unknown> {
  return unityList([0, ...perTier])
}

describe('dissonance waves from a save', () => {
  it('reads the documented Unity List<int> layout', () => {
    const root = {
      dissonanceDamageBoost: trackWaves([100, 200, 300]),
      dissonanceHealthBoost: trackWaves([110, 210, 310]),
      dissonanceCoinBoost: trackWaves([120, 220, 320]),
      dissonanceUltDamageBoost: trackWaves([130, 230, 330]),
    }

    const state = deriveDissonanceCalculatorStateFromSaveRoot(root)

    expect(state.wavesByTier, 'no wave data was extracted at all').toBeDefined()
    expect(state.wavesByTier?.['1']).toEqual({ attack: 100, defense: 110, utility: 120, uw: 130 })
    expect(state.wavesByTier?.['3']).toEqual({ attack: 300, defense: 310, utility: 320, uw: 330 })
  })

  it('marks a maxed tier rather than dropping it', () => {
    const root = { dissonanceDamageBoost: trackWaves([5000]) }
    const state = deriveDissonanceCalculatorStateFromSaveRoot(root)
    expect(state.wavesByTier?.['1']?.attack).toBeGreaterThan(0)
    expect(state.maxByTier?.['1']?.attack).toBe(true)
  })

  it('reads a plain array too, in case the save is already unwrapped', () => {
    const root = { dissonanceDamageBoost: [0, 400, 500] }
    const state = deriveDissonanceCalculatorStateFromSaveRoot(root)
    expect(state.wavesByTier?.['2']?.attack).toBe(500)
  })

  it('reports no wave data for a save with none, instead of inventing zeros', () => {
    const state = deriveDissonanceCalculatorStateFromSaveRoot({})
    expect(state.wavesByTier).toBeUndefined()
  })
})
