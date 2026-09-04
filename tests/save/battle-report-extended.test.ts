import { describe, expect, it } from 'vitest'

import {
  buildBattleReportExtendedFields,
  getBattleReportExtendedSaveKeysForTest,
} from '../../src/save/battle/report-extended'

describe('buildBattleReportExtendedFields', () => {
  it('maps save aliases onto extended tracker keys', () => {
    const mapped = buildBattleReportExtendedFields({
      highestCPM: 3_135_332_723_149_766_700,
      nukesUsed: 1,
      secondWindsUsed: 3,
      demonModesUsed: 1,
      energyShieldHitsAbsorbed: 97,
      largestWaveSkip: 12,
      enemiesHitByProjectilesThisRound: 581_510,
      attackLevelSkips: 4,
      coinsEarnedWaveSkip: 50_000_000,
    })

    expect(mapped.highestCoinsPerMinute).toBeTruthy()
    expect(mapped.nukeCount).toBe('1')
    expect(mapped.secondWindCount).toBe('3')
    expect(mapped.demonModeCount).toBe('1')
    expect(mapped.hitsAbsorbedByEnergyShield).toBe('97')
    expect(mapped.largestWaveSkip).toBeTruthy()
    expect(mapped.enemiesHitByProjectiles).toBeTruthy()
    expect(mapped.enemyAttackLevelsSkipped).toBeTruthy()
    expect(mapped.coinsFromWaveSkip).toBeTruthy()
  })

  it('resolves land mine hit alias', () => {
    expect(getBattleReportExtendedSaveKeysForTest('enemiesHitByLandMines')).toContain(
      'enemiesHitByLandMineThisRound',
    )
  })
})
