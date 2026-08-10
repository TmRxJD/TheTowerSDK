import { describe, expect, it } from 'vitest'
import {
  aggregateWorkshopTableFloat,
  buildStandardTierBattleConditions,
  WAVE_INFO_RESISTANCE_BATTLE_CONDITION_NAMES,
  workshopMultFromTableFloat,
} from './battle-condition-config'
import { MAX_CAMPAIGN_TIER } from '../data/index'

/**
 * Resistance battle conditions must not affect enemy HP.
 *
 * Verified against libil2cpp.so (v28.3 arm64) rather than against captured
 * display values: every gameplay call site of CustomizeGame$$GetResistanceLevel
 * is a damage or knockback path — Enemy$$ThornDamage,
 * Enemy$$TotalLightshotDamage, Enemy$$ProjectileDamage, Enemy$$AddKnockback,
 * Enemy$$OnTriggerEnter2D, Main$$BossProjectileHit, Main$$TowerBossFire and
 * Main$$WaveUpdate, plus BattleConditionTile$$Set for the UI label. Nothing
 * that computes enemy health consults it.
 *
 * They were previously summed into the HP workshop offset, making the
 * multiplier `1 - 0.0022216 * sum(resistance levels)`. That reaches zero once
 * the levels total 450, so tier 21+ reported every enemy at 0 HP and tier 20 at
 * 2.25% of its true value. The tests that used to live here pinned those
 * numbers as goldens, which is why the defect survived.
 */
describe('resistance battle conditions and the enemy HP workshop table', () => {
  const HP_OFFSET = 0x1D8
  const noLabs: Record<string, number> = {}
  const noBenefit = () => 0

  function resistanceOnly(tier: number) {
    const names = new Set<string>(WAVE_INFO_RESISTANCE_BATTLE_CONDITION_NAMES)
    return buildStandardTierBattleConditions(tier).filter(bc => names.has(bc.name))
  }

  it('has resistance BCs at the tiers this regression showed up on', () => {
    // Guards the test itself: if the tier tables stop carrying resistances the
    // assertions below would pass vacuously.
    expect(resistanceOnly(21).length).toBeGreaterThan(0)
    expect(resistanceOnly(24).length).toBeGreaterThan(0)
  })

  it('ignores resistance BCs entirely when aggregating the HP offset', () => {
    for (let tier = 1; tier <= MAX_CAMPAIGN_TIER; tier += 1) {
      const tableFloat = aggregateWorkshopTableFloat(HP_OFFSET, resistanceOnly(tier), noLabs, noBenefit)
      expect(tableFloat, `tier ${tier} resistance-only HP table float`).toBe(0)
      expect(workshopMultFromTableFloat(tableFloat), `tier ${tier} resistance-only HP mult`).toBe(1)
    }
  })

  it('never produces a zero or negative enemy HP multiplier on any tier', () => {
    // The saturating `Math.max(0, 1 + scaled)` is what turned an over-large
    // reduction into 0 HP rather than a visibly wrong number.
    for (let tier = 1; tier <= MAX_CAMPAIGN_TIER; tier += 1) {
      const tableFloat = aggregateWorkshopTableFloat(
        HP_OFFSET,
        buildStandardTierBattleConditions(tier),
        noLabs,
        noBenefit,
      )
      expect(workshopMultFromTableFloat(tableFloat), `tier ${tier} HP mult`).toBeGreaterThan(0)
    }
  })
})
