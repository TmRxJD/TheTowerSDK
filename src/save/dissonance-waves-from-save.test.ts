import { describe, expect, it } from 'vitest'
import { MAX_CAMPAIGN_TIER } from '../data/campaign-tier'
import { readDissonanceCalculatorStateFromSaveRoot } from './shared-tool-inputs-from-save-extended'

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

    const state = readDissonanceCalculatorStateFromSaveRoot(root)

    expect(state.wavesByTier, 'no wave data was extracted at all').toBeDefined()
    expect(state.wavesByTier?.['1']).toEqual({ attack: 100, defense: 110, utility: 120, uw: 130 })
    expect(state.wavesByTier?.['3']).toEqual({ attack: 300, defense: 310, utility: 320, uw: 330 })
  })

  it('marks a maxed tier rather than dropping it', () => {
    const root = { dissonanceDamageBoost: trackWaves([5000]) }
    const state = readDissonanceCalculatorStateFromSaveRoot(root)
    expect(state.wavesByTier?.['1']?.attack).toBeGreaterThan(0)
    expect(state.maxByTier?.['1']?.attack).toBe(true)
  })

  it('reads a plain array too, in case the save is already unwrapped', () => {
    const root = { dissonanceDamageBoost: [0, 400, 500] }
    const state = readDissonanceCalculatorStateFromSaveRoot(root)
    expect(state.wavesByTier?.['2']?.attack).toBe(500)
  })

  it('reports no wave data for a save with none, instead of inventing zeros', () => {
    const state = readDissonanceCalculatorStateFromSaveRoot({})
    expect(state.wavesByTier).toBeUndefined()
  })

  /**
   * The tier count was hardcoded to 21 and went stale when the game added
   * 22-24, so the last three tiers were unreachable: extraction stopped short
   * and the store clamped them away. The preview built its rows from
   * MAX_CAMPAIGN_TIER, so the tab showed tiers the calculator could not hold.
   */
  it('reads every campaign tier, including the ones added after 21', () => {
    const perTier = Array.from({ length: MAX_CAMPAIGN_TIER }, (_, index) => (index + 1) * 10)
    const state = readDissonanceCalculatorStateFromSaveRoot({
      dissonanceDamageBoost: trackWaves(perTier),
    })

    expect(state.wavesByTier?.[String(MAX_CAMPAIGN_TIER)]?.attack).toBe(MAX_CAMPAIGN_TIER * 10)
    expect(state.wavesByTier?.['22']?.attack).toBe(220)
    expect(state.wavesByTier?.['24']?.attack).toBe(240)
  })

  it('tracks the generated tier count rather than a copy of it', () => {
    // If the game adds tier 25, this file should need no edit at all.
    expect(MAX_CAMPAIGN_TIER).toBeGreaterThanOrEqual(24)
  })
})
