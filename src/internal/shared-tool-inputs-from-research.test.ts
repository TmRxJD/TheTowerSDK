import { describe, expect, it } from 'vitest'
import {
  readLabsEconomyFromResearchLevels,
  readModuleEconomyFromResearchLevels,
  readNamedCalculatorLabsFromResearchLevels,
  readWorkshopDiscountsFromResearchLevels,
  enrichSharedToolInputsFromResearchLevels,
  resolveResearchLabLevel,
  syncUptimeResearchLabsFromTracker,
} from './shared-tool-inputs-from-research'
import { defaultSharedToolInputs } from './shared-tool-inputs'

describe('resolveResearchLabLevel', () => {
  it('matches catalog display names and site aliases', () => {
    const levels = {
      'Labs Speed': 12,
      'Labs Coin Discount': 8,
      'Workshop Attack Discount': 5,
    }
    expect(resolveResearchLabLevel(levels, 'labs_speed')).toBe(12)
    expect(resolveResearchLabLevel(levels, 'labs_coin_discount')).toBe(8)
    expect(resolveResearchLabLevel(levels, 'workshop_attack_discount')).toBe(5)
  })

  it('matches dissonant echo slugs by display-name override keys', () => {
    const levels = {
      'Dissonant Echo - Attack': 3,
      'Dissonant Echo - Defense': 4,
      'Dissonant Echo - Utility': 2,
      'Dissonant Echo - Ultimate Weapons': 1,
    }
    const named = readNamedCalculatorLabsFromResearchLevels(levels)
    expect(named.echoLabLevels.attack).toBe(3)
    expect(named.echoLabLevels.defense).toBe(4)
    expect(named.echoLabLevels.utility).toBe(2)
    expect(named.echoLabLevels.uw).toBe(1)
  })
})

describe('readLabsEconomyFromResearchLevels', () => {
  it('maps lab speed and coin discount without clobbering relic settings', () => {
    const result = readLabsEconomyFromResearchLevels(
      { 'Labs Speed': 15, 'Labs Coin Discount': 6 },
      { labRelic: 4, speedUp: 2, gemDiscount: 1.5 },
    )
    expect(result.labSpeed).toBe(15)
    expect(result.labDiscount).toBe(6)
    expect(result.labRelic).toBe(4)
    expect(result.speedUp).toBe(2)
    expect(result.gemDiscount).toBe(1.5)
  })
})

describe('readModuleEconomyFromResearchLevels', () => {
  it('maps module coin/shard discounts and assist efficiency labs', () => {
    const result = readModuleEconomyFromResearchLevels({
      'Module Coin Cost': 12,
      'Module Shard Cost': 8,
      'Assist Module Bonus - Cannon': 5,
      'Assist Module Substats - Core': 3,
    })
    expect(result.moduleDiscounts.coinDiscount).toBe(12)
    expect(result.moduleDiscounts.shardDiscount).toBe(8)
    expect(result.moduleEfficiencyLabs.multiplierEfficiencyLabByType.cannon).toBe(5)
    expect(result.moduleEfficiencyLabs.substatEfficiencyLabByType.core).toBe(3)
    expect(result.moduleEfficiencyLabs.effMultiLabLevelCannon).toBe(5)
    expect(result.moduleEfficiencyLabs.effMultiLabLevelCore).toBe(0)
  })
})

describe('readWorkshopDiscountsFromResearchLevels', () => {
  it('maps workshop and enhancement discount researches', () => {
    const result = readWorkshopDiscountsFromResearchLevels({
      'Workshop Attack Discount': 10,
      'Workshop Defense Discount': 11,
      'Workshop Utility Discount': 12,
      'Enhancement Attack - Coin Discount': 3,
      'Enhancement Defense - Coin Discount': 4,
      'Enhancement Utility - Coin Discount': 5,
    })
    expect(result.discountAttack).toBe(5)
    expect(result.discountDefense).toBe(5.5)
    expect(result.discountUtility).toBe(6)
    expect(result.enhancementDiscountAttack).toBe(0.9)
    expect(result.enhancementDiscountDefense).toBe(1.2)
    expect(result.enhancementDiscountUtility).toBe(1.5)
  })
})

describe('syncUptimeResearchLabsFromTracker', () => {
  it('maps uptime research lab fields from tracker levels', () => {
    const uptime = syncUptimeResearchLabsFromTracker({
      'Wave Accelerator Mastery': 5,
      'Golden Tower Duration': 9,
      'Chrono Field Duration': 7,
      'Ultimate Weapon Durations': 6,
    })
    expect(uptime.waLevel).toBe(5)
    expect(uptime.gtDurLab).toBe(9)
    expect(uptime.cfDurLab).toBe(7)
    expect(uptime.bcLabLevel).toBe(6)
  })
})

describe('enrichSharedToolInputsFromResearchLevels', () => {
  it('preserves explicit workshop discounts when preserveExplicitWorkshopDiscounts is set', () => {
    const enriched = enrichSharedToolInputsFromResearchLevels({
      ...defaultSharedToolInputs,
      workshopDiscounts: {
        ...defaultSharedToolInputs.workshopDiscounts,
        discountAttack: 10,
        discountDefense: 12.5,
        enhancementDiscountAttack: 3,
      },
      researchLabLevels: {
        'Workshop Attack Discount': 99,
        'Workshop Defense Discount': 99,
        'Enhancement Attack - Coin Discount': 99,
      },
    }, { preserveExplicitWorkshopDiscounts: true })

    expect(enriched.workshopDiscounts.discountAttack).toBe(10)
    expect(enriched.workshopDiscounts.discountDefense).toBe(12.5)
    expect(enriched.workshopDiscounts.enhancementDiscountAttack).toBe(3)
  })

  it('fills economy and named calculator labs from researchLabLevels', () => {
    const enriched = enrichSharedToolInputsFromResearchLevels({
      ...defaultSharedToolInputs,
      researchLabLevels: {
        'Labs Speed': 20,
        'Labs Coin Discount': 9,
        'Improve Trade-off Perks': 4,
        'Battle Condition Reduction': 7,
        'Ultimate Weapon Durations': 8,
      },
    })

    expect(enriched.labsEconomy.labSpeed).toBe(20)
    expect(enriched.labsEconomy.labDiscount).toBe(9)
    expect(enriched.namedCalculatorLabs.improveTradeOffLabLevel).toBe(4)
    expect(enriched.namedCalculatorLabs.bcReductionLabLevel).toBe(7)
    // The thorns calculator's "BC Reduction Lab Level" is Battle Condition
    // Reduction. It used to read Ultimate Weapon Durations, so a player with BC
    // Reduction maxed saw their UW durations instead.
    expect(enriched.namedCalculatorLabs.bcLabLevel).toBe(7)
    // Uptime derives its own bcLabLevel and still reads Ultimate Weapon
    // Durations -- a different field that happens to share a name.
    expect(enriched.uptimeInputs.bcLabLevel).toBe(8)
  })
})
