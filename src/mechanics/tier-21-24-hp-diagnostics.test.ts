import { describe, expect, it } from 'vitest'
import { getBasicEnemyWaveStats } from './enemy-wave-stats'
import { aggregateWorkshopTableFloat, buildStandardTierBattleConditions, workshopMultFromTableFloat } from './battle-condition-config'
import { bcCounterLabBenefitIncreaseAtLevel } from './bc-counter-labs'
import { CAMPAIGN_TIER_PRESSURE } from './wave-scaling-regression-profile'
import { computeWaveInfoDisplayStats } from './enemy-wave-info-pipeline'

describe('tier 21-24 HP diagnostics', () => {
  const wave = 1000
  const perks = {
    perkEnemyHpMinus50: false,
    perkBossHpX8: false,
    perkBossHpMinus70: false,
    perkEnemyDmgMinus50: false,
    perkEnemyDmgX25: false,
    perkRangedDmgX3: false,
  }

  it('tier pressure ladder stays ×1200 through T24 (not ×120000 jump at T22)', () => {
    for (let tier = 19; tier <= 23; tier += 1) {
      const ratio = CAMPAIGN_TIER_PRESSURE[tier + 1]! / CAMPAIGN_TIER_PRESSURE[tier]!
      expect(ratio).toBeGreaterThan(1000)
      expect(ratio).toBeLessThan(1500)
    }
  })

  it('workshop HP mult stays positive for standard tier BCs', () => {
    const bcLabs = {
      orb_resistance: 20,
      death_ray_resistance: 20,
      thorns_resistance: 20,
      knockback_resistance: 20,
      plasma_cannon_resistance: 20,
    }
    for (const tier of [20, 21, 22, 23, 24]) {
      const bcs = buildStandardTierBattleConditions(tier)
      const tableFloat = aggregateWorkshopTableFloat(
        0x1D8,
        bcs,
        bcLabs,
        bcCounterLabBenefitIncreaseAtLevel,
      )
      const mult = workshopMultFromTableFloat(tableFloat)
      expect(mult, `tier ${tier} workshop mult`).toBeGreaterThan(0)
      expect(mult, `tier ${tier} workshop mult`).toBeLessThan(100)
    }
  })

  it('Basic HP scales monotonically with tier at fixed wave', () => {
    const bcLabs = {
      orb_resistance: 20,
      death_ray_resistance: 20,
      thorns_resistance: 20,
      knockback_resistance: 20,
      plasma_cannon_resistance: 20,
    }
    let prev = 0
    for (const tier of [20, 21, 22, 23, 24]) {
      const base = getBasicEnemyWaveStats(tier, wave, false)
      const bcs = buildStandardTierBattleConditions(tier)
      const row = computeWaveInfoDisplayStats({
        waveBaseHp: base.hp,
        waveBaseDamage: base.damage,
        wave,
        tier,
        enemyType: 'Basic',
        battleConditions: bcs,
        bcLabLevels: bcLabs,
        labBenefitIncreaseAtLevel: bcCounterLabBenefitIncreaseAtLevel,
        perks,
      })
      expect(row.hp, `tier ${tier}`).toBeGreaterThan(prev)
      prev = row.hp
    }
  })
})
