import { describe, expect, it } from 'vitest'
import {
  averageEliteCellsPerKill,
  BOSS_WAVE_INTERVAL_BY_TIER,
  buildWaveContext,
  computeBossWaveIntervalFromTier,
  simulateEnemyDrops,
  WAVE_SKIP_SKIPPED_WAVE_MULT,
  waveSkipExpectedSkipsPerProc,
  waveSkipResourceMultiplier,
} from './enemy-drops-simulation'
import { assembleEnemyDropsSimulationInput } from './enemy-drops-context'
import { defaultSharedEnemyDropsInputs } from '../internal/enemy-drops-calcs-local-state'

describe('enemy-drops-simulation', () => {
  it('uses tier-scaled elite cell averages for low tiers', () => {
    expect(averageEliteCellsPerKill(10)).toBe(5.5)
    expect(averageEliteCellsPerKill(1)).toBe(1)
  })

  it('increases expected yield with wave skip and cells/kill bonus', () => {
    const base = simulateEnemyDrops(assembleEnemyDropsSimulationInput({
      enemyStatsCore: {
        tierSelection: 10,
        wave: 500,
        healthSkipInput: 0,
        attackSkipInput: 0,
        reverseEnemyType: false,
        targetHpVal: 0,
        targetDamageVal: 0,
        battleConditions: [],
      },
      researchLabLevels: {},
      labsCalcByLab: {},
      guardianLevels: {},
      uptimeInputs: {},
      workshopStatLevels: { levels: {}, targets: {}, enhancementLevels: {}, enhancementTargets: {}, coinCurrentLevels: {}, coinTargetLevels: {}, cashCurrentLevels: {}, cashTargetLevels: {} },
      enemyDropsInputs: defaultSharedEnemyDropsInputs,
      cards: { waveSkipLevel: 1, enemyBalanceLevel: 1 },
    }))
    const boosted = simulateEnemyDrops(assembleEnemyDropsSimulationInput({
      enemyStatsCore: {
        tierSelection: 10,
        wave: 500,
        healthSkipInput: 0,
        attackSkipInput: 0,
        reverseEnemyType: false,
        targetHpVal: 0,
        targetDamageVal: 0,
        battleConditions: [],
      },
      researchLabLevels: {},
      labsCalcByLab: {},
      guardianLevels: {},
      uptimeInputs: {},
      workshopStatLevels: { levels: {}, targets: {}, enhancementLevels: { cells_per_kill_bonus: 50 }, enhancementTargets: {}, coinCurrentLevels: {}, coinTargetLevels: {}, cashCurrentLevels: {}, cashTargetLevels: {} },
      enemyDropsInputs: defaultSharedEnemyDropsInputs,
      cards: { waveSkipLevel: 7, waveSkipMastery: 9, enemyBalanceLevel: 1 },
    }))
    expect(boosted.cells.totalCells).toBeGreaterThan(base.cells.totalCells)
    expect(boosted.cells.cellsFromWaveSkip).toBeGreaterThan(0)
  })

  it('wave skip resource multiplier grows with skip chance', () => {
    const low = waveSkipResourceMultiplier(0.09, waveSkipExpectedSkipsPerProc(0))
    const high = waveSkipResourceMultiplier(0.19, waveSkipExpectedSkipsPerProc(9))
    expect(high).toBeGreaterThan(low)
    expect(low).toBeCloseTo(1 + 0.09 * waveSkipExpectedSkipsPerProc(0) * WAVE_SKIP_SKIPPED_WAVE_MULT, 5)
    expect(high).toBeGreaterThan(1 + 0.19 * WAVE_SKIP_SKIPPED_WAVE_MULT * 0.5)
  })

  it('boss spawn interval decreases as tier increases (more frequent bosses)', () => {
    const spotChecks: Record<number, number> = {
      1: 10,
      13: 10,
      14: 9,
      15: 8,
      16: 7,
      17: 6,
      18: 5,
      19: 5,
      20: 5,
      21: 5,
      22: 5,
      23: 5,
      24: 5,
    }
    for (let tier = 1; tier <= 24; tier += 1) {
      const interval = computeBossWaveIntervalFromTier(tier)
      expect(BOSS_WAVE_INTERVAL_BY_TIER[tier]).toBe(interval)
      if (spotChecks[tier] != null) {
        expect(interval).toBe(spotChecks[tier])
      } else {
        expect(interval).toBe(10)
      }
      if (tier > 1) {
        expect(interval).toBeLessThanOrEqual(computeBossWaveIntervalFromTier(tier - 1))
      }
    }
  })

  it('buildWaveContext counts bosses from tier More Bosses BC', () => {
    const ctx = buildWaveContext(assembleEnemyDropsSimulationInput({
      enemyStatsCore: {
        tierSelection: 12,
        wave: 105,
        healthSkipInput: 0,
        attackSkipInput: 0,
        reverseEnemyType: false,
        targetHpVal: 0,
        targetDamageVal: 0,
        battleConditions: [],
      },
      researchLabLevels: {},
      labsCalcByLab: {},
      guardianLevels: {},
      uptimeInputs: {},
      workshopStatLevels: { levels: {}, targets: {}, enhancementLevels: {}, enhancementTargets: {}, coinCurrentLevels: {}, coinTargetLevels: {}, cashCurrentLevels: {}, cashTargetLevels: {} },
      enemyDropsInputs: defaultSharedEnemyDropsInputs,
    }))
    expect(ctx.bossCount).toBe(10)
    expect(ctx.tier).toBe(12)

    const moreBosses = buildWaveContext(assembleEnemyDropsSimulationInput({
      enemyStatsCore: {
        tierSelection: 18,
        wave: 100,
        healthSkipInput: 0,
        attackSkipInput: 0,
        reverseEnemyType: false,
        targetHpVal: 0,
        targetDamageVal: 0,
        battleConditions: [],
      },
      researchLabLevels: {},
      labsCalcByLab: {},
      guardianLevels: {},
      uptimeInputs: {},
      workshopStatLevels: { levels: {}, targets: {}, enhancementLevels: {}, enhancementTargets: {}, coinCurrentLevels: {}, coinTargetLevels: {}, cashCurrentLevels: {}, cashTargetLevels: {} },
      enemyDropsInputs: defaultSharedEnemyDropsInputs,
    }))
    expect(moreBosses.bossCount).toBe(20)
  })
})
