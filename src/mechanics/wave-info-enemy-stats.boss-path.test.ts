import { describe, expect, it } from 'vitest'
import { buildStandardTierBattleConditions } from './battle-condition-config'
import { bcCounterLabBenefitIncreaseAtLevel, computeEnemyStatLevelWithBcLabs } from './bc-counter-labs'
import { getBasicEnemyWaveStats } from '../internal/enemy-wave-stats'
import { getWaveInfoEnemyStatsUnfloored, WAVE_INFO_ENEMY_RULES } from './wave-info-enemy-stats'
import { getSharedToolLabs, computeLabValueAtLevel } from '../data/index'

describe('Boss hpFixedMult path', () => {
  it('Boss wave base × 20 uses boss_health lab, not common_enemy_health', () => {
    const bossRules = WAVE_INFO_ENEMY_RULES.Boss
    expect('hpFixedMult' in bossRules).toBe(true)
    expect(bossRules.hpFixedMult).toBe(20)

    const bcs = buildStandardTierBattleConditions(20)
    const bcLabs = { battle_condition_reduction: 10, enemy_level_skip_reduction: 10 }
    const hpLevel = computeEnemyStatLevelWithBcLabs(2649, null, 1884, bcLabs, 20, false, null, bcs, 'hp')
    const raw = getBasicEnemyWaveStats(20, hpLevel, false).hp
    const enemyLabBenefit = (slug: string, level: number) => {
      const lab = getSharedToolLabs().find(r => r.name === slug)
      return lab ? computeLabValueAtLevel(lab, level) : 0
    }
    const baseInput = {
      waveBaseHp: raw,
      waveBaseDamage: 1,
      wave: 2649,
      tier: 20,
      battleConditions: bcs,
      bcLabLevels: bcLabs,
      labBenefitIncreaseAtLevel: bcCounterLabBenefitIncreaseAtLevel,
      enemyLabBenefitAtLevel: enemyLabBenefit,
    }
    const sab = getWaveInfoEnemyStatsUnfloored({ ...baseInput, enemyType: 'Saboteur' as const, enemyLabLevels: {} })
    const bossNoLab = getWaveInfoEnemyStatsUnfloored({ ...baseInput, enemyType: 'Boss' as const, enemyLabLevels: {} })
    const bossL30 = getWaveInfoEnemyStatsUnfloored({
      ...baseInput,
      enemyType: 'Boss' as const,
      enemyLabLevels: { boss_health: 30, common_enemy_health: 1 },
    })

    expect(bossNoLab.hp).toBeCloseTo(sab.hp, -20)
    expect(bossL30.hp / bossNoLab.hp).toBeCloseTo(0.46, 2)
  })
})
