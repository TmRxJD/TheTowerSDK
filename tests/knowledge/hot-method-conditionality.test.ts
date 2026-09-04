import { describe, expect, it } from 'vitest'
import {
  HOT_METHOD_UNCONDITIONAL_CALLS,
  PER_WAVE_RANDOM_STREAMS,
  RANDOM_STREAMS_REBUILT_PER_WAVE,
} from '../../src/knowledge/compartments/enemies'

/**
 * Post-dominance over the eight largest gameplay methods.
 *
 * The headline is that almost nothing in this game runs unconditionally, which
 * matters to a simulation more than any single formula: a model that executes
 * its pipeline top to bottom every tick is running a path the game rarely
 * takes.
 */

describe('the hot methods are almost entirely branch-gated', () => {
  it('covers the methods a simulation actually spends its time in', () => {
    for (const method of [
      'Main.NewWave', 'Main.WaveUpdate', 'Main.TowerFireFunction', 'Enemy.Kill',
    ]) {
      expect(HOT_METHOD_UNCONDITIONAL_CALLS, method).toHaveProperty(method)
    }
  })

  it('finds no unconditional call at all in most of them', () => {
    const none = Object.entries(HOT_METHOD_UNCONDITIONAL_CALLS)
      .filter(([, count]) => count === 0)
      .map(([method]) => method)
    expect(none.length).toBeGreaterThanOrEqual(5)
    expect(none).toContain('Enemy.Kill')
    expect(none).toContain('Main.TowerFireFunction')
  })

  it('leaves NewWave as the one method with a real unconditional core', () => {
    const newWave = HOT_METHOD_UNCONDITIONAL_CALLS['Main.NewWave']
    expect(newWave).toBeGreaterThan(0)
    expect(newWave).toBe(Math.max(...Object.values(HOT_METHOD_UNCONDITIONAL_CALLS)))
  })
})

describe('the per-wave RNG count is corroborated twice over', () => {
  /**
   * The cross-check worth having. `PER_WAVE_RANDOM_STREAMS` was read from the
   * field table and flags which streams are rebuilt each wave; the CFG counted
   * unconditional `Random..ctor` calls in `NewWave`. Neither knew about the
   * other, and they agree on three.
   */
  it('the field table and the CFG agree on how many streams are rebuilt', () => {
    const flagged = PER_WAVE_RANDOM_STREAMS.filter(stream => stream.rebuiltEachWave).length
    expect(flagged).toBe(RANDOM_STREAMS_REBUILT_PER_WAVE)
  })

  it('NewWave has one get_WaveSeed and one ctor per rebuilt stream', () => {
    // Six unconditional calls: a seed read and a constructor, three times.
    expect(HOT_METHOD_UNCONDITIONAL_CALLS['Main.NewWave'])
      .toBe(RANDOM_STREAMS_REBUILT_PER_WAVE * 2)
  })

  it('names the streams that are NOT rebuilt, so the difference stays visible', () => {
    const persistent = PER_WAVE_RANDOM_STREAMS
      .filter(stream => !stream.rebuiltEachWave)
      .map(stream => stream.field)
      .sort()
    expect(persistent).toEqual(['attackSkipRandom', 'genericRandom', 'healthSkipRandom'])
  })
})
