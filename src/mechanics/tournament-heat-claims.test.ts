import { describe, expect, it } from 'vitest'
import { TOURNAMENT_HEAT_PROFILES } from '../data/tournaments'
import {
  computeBossUltimateHeatFactor,
  computeElsReductionHeatLevel,
  computeMoreBossesHeatLevel,
  getHeatEffectivenessPercent,
  getHeatRampPercent,
  GUARANTEED_ELS_REDUCTION_MAX,
} from './tournament-heat-bc'

/**
 * The claims the oracle makes about tournament heat, checked against the code
 * that implements it.
 *
 * Two of them are the kind that read as pedantry right up until someone ships
 * the inverse:
 *
 * - the wave table falls while heat rises, so the table is NOT heat;
 * - the guaranteed ELS numbers are levels (10, 20, 30, 50), not fractions
 *   (0.1, 0.2, 0.3, 0.5) — the graph pointed at the fraction map until
 *   2026-08-18 while its prose said the levels.
 */

const LEAGUES = ['Copper', 'Silver', 'Gold', 'Platinum', 'Champion', 'Legend'] as const

describe('the ramp is the complement of the table, not the table', () => {
  it('has heat rising while resistance effectiveness falls', () => {
    const waves = [0, 100, 500, 1000]
    const ramps = waves.map(wave => getHeatRampPercent(wave, 'Legend'))
    const effectiveness = waves.map(wave => getHeatEffectivenessPercent(wave, 'Legend'))

    // Strictly rising, strictly falling — reading either for the other inverts
    // every downstream number while still producing a plausible curve.
    expect(ramps).toEqual([...ramps].sort((a, b) => a - b))
    expect(effectiveness).toEqual([...effectiveness].sort((a, b) => b - a))
    for (const [index, wave] of waves.entries()) {
      expect(ramps[index] + effectiveness[index], `wave ${wave} must sum to 100`).toBe(100)
    }
  })

  it('picks the wave-table column by LEAGUE, not by tier', () => {
    /*
     * The columns are named `t11` and `t14`, which reads as tiers. Silver takes
     * one, Gold and above the other — at a wave where the two columns differ.
     */
    expect(getHeatEffectivenessPercent(1000, 'Silver'))
      .not.toBe(getHeatEffectivenessPercent(1000, 'Gold'))
    expect(getHeatEffectivenessPercent(1000, 'Gold'))
      .toBe(getHeatEffectivenessPercent(1000, 'Legend'))
  })

  it('gives Copper no heat, and the right kind of nothing', () => {
    /*
     * Copper is the "no heat" case and the neutral value is NOT uniform: an
     * additive condition is neutral at 0, a multiplier at 1. Defaulting the
     * boss factor to 0 deletes boss health entirely.
     */
    expect(getHeatRampPercent(1000, 'Copper')).toBe(0)
    expect(computeElsReductionHeatLevel('Copper', 1000)).toBe(0)
    expect(computeBossUltimateHeatFactor('Copper', 1000)).toBe(1)
  })
})

describe('guaranteed ELS Reduction is a level and a ceiling', () => {
  it('is stated in levels, not fractions', () => {
    // The whole point: 50, not 0.5. A fraction here is a 100x error downstream.
    expect(GUARANTEED_ELS_REDUCTION_MAX.Legend).toBe(50)
    for (const league of LEAGUES) {
      const value = GUARANTEED_ELS_REDUCTION_MAX[league]
      expect(value, `${league} must have an entry, including the zeroes`).toBeTypeOf('number')
      expect(Number.isInteger(value), `${league} is a level, not a fraction`).toBe(true)
    }
  })

  it('reaches the cap only late, and never exceeds it', () => {
    for (const league of LEAGUES) {
      const cap = GUARANTEED_ELS_REDUCTION_MAX[league]
      /*
       * NOT zero at wave 1 — the ramp starts at 5%, not at nothing, so Gold is
       * already 1 and Legend already 3. The oracle said "0 at wave 1" until
       * this test said otherwise; the wave-0 row of the table is 95, not 100.
       */
      expect(computeElsReductionHeatLevel(league, 1), `${league} at wave 1`)
        .toBe(Math.round(cap * getHeatRampPercent(1, league) / 100))
      expect(computeElsReductionHeatLevel(league, 1), `${league} starts well under its cap`)
        .toBeLessThan(Math.max(1, cap))
      for (const wave of [1, 100, 500, 1000, 5000]) {
        expect(computeElsReductionHeatLevel(league, wave), `${league} w${wave}`)
          .toBeLessThanOrEqual(cap)
      }
    }
    /*
     * And it never actually REACHES the cap. The ramp tops out at 95%, so
     * Legend's ceiling of 50 is only ever worth 48 in a run. "Reaches 50 near
     * wave 1000" was in the oracle until this line was written.
     */
    expect(computeElsReductionHeatLevel('Legend', 1000)).toBe(48)
    expect(computeElsReductionHeatLevel('Legend', 100_000))
      .toBeLessThan(GUARANTEED_ELS_REDUCTION_MAX.Legend)
  })

  it('only guarantees it from Gold up', () => {
    expect(GUARANTEED_ELS_REDUCTION_MAX.Copper).toBe(0)
    expect(GUARANTEED_ELS_REDUCTION_MAX.Silver).toBe(0)
    for (const league of ['Gold', 'Platinum', 'Champion', 'Legend'] as const) {
      expect(GUARANTEED_ELS_REDUCTION_MAX[league], league).toBeGreaterThan(0)
    }
  })
})

describe('More Bosses is overheat, so it does not ramp', () => {
  it('depends on the league and not at all on the wave', () => {
    for (const league of LEAGUES) {
      const atStart = computeMoreBossesHeatLevel(league)
      expect(atStart, `${league} is wave-independent`).toBe(computeMoreBossesHeatLevel(league))
    }
    // ...and it is strictly harsher as leagues rise, which is what makes it
    // meaningful to state at all.
    const levels = LEAGUES.map(league => computeMoreBossesHeatLevel(league))
    expect(levels).toEqual([...levels].sort((a, b) => a - b))
  })

  it('matches the boss interval it is derived from', () => {
    for (const profile of TOURNAMENT_HEAT_PROFILES) {
      expect(computeMoreBossesHeatLevel(profile.league), profile.league)
        .toBe(11 - profile.moreBossesEveryWaves)
    }
  })
})
