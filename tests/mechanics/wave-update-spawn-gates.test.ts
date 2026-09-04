import { describe, expect, it } from 'vitest'
import {
  WAVE_UPDATE_SPAWN_BASIC_BL_SITES_V29,
  WAVE_UPDATE_SPAWN_BASIC_GATE_KINDS_V29,
  WAVE_UPDATE_SPAWN_BASIC_TICK_CAP_GATE_SITE_V29,
} from '../../src/mechanics/waves/wave-update-spawn-gates-constants'

describe('wave-update-spawn-gates', () => {
  it('pins three SpawnRandomBasicEnemy BL sites from v29 WaveUpdate trace', () => {
    expect(WAVE_UPDATE_SPAWN_BASIC_BL_SITES_V29).toHaveLength(3)
    expect(WAVE_UPDATE_SPAWN_BASIC_BL_SITES_V29[0]).toBe(0x01_fccaec)
  })

  it('gate kinds are heterogeneous — not all tick-cap compares', () => {
    expect(WAVE_UPDATE_SPAWN_BASIC_GATE_KINDS_V29).toEqual([
      'enemySpawnChance_vs_random0_100',
      'random0_100_le_0x4f',
      'random_float_lt_complement',
    ])
    expect(WAVE_UPDATE_SPAWN_BASIC_TICK_CAP_GATE_SITE_V29).toBe(0x01_fccaec)
  })
})
