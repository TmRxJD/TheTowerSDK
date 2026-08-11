import { describe, expect, it } from 'vitest'
import { readWorkshopDiscountsFromResearchLevels } from '../internal/shared-tool-inputs-from-research'
import {
  normalizeEnhancementSectionDiscountPercent,
  normalizeEnhancementVaultDiscountPercent,
  normalizeSharedWorkshopDiscounts,
  normalizeWorkshopSectionDiscountPercent,
  workshopLabLevelToSectionDiscountPercent,
} from './workshop-discount-normalize'

describe('workshop discount normalization', () => {
  it('converts legacy lab levels above max percent', () => {
    expect(normalizeWorkshopSectionDiscountPercent(99)).toBe(49.5)
    expect(normalizeWorkshopSectionDiscountPercent(10)).toBe(10)
    expect(normalizeWorkshopSectionDiscountPercent(5)).toBe(5)
  })

  it('snaps workshop percents to 0.5 steps', () => {
    expect(normalizeWorkshopSectionDiscountPercent(5.3)).toBe(5.5)
    expect(normalizeWorkshopSectionDiscountPercent(49.6)).toBe(49.5)
  })

  it('converts enhancement legacy lab levels', () => {
    expect(normalizeEnhancementSectionDiscountPercent(100)).toBe(30)
    expect(normalizeEnhancementVaultDiscountPercent(10)).toBe(10)
    expect(normalizeEnhancementVaultDiscountPercent(50)).toBe(25)
  })

  it('derives research lab levels as discount percents', () => {
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

  it('normalizes persisted shared workshop discounts', () => {
    const normalized = normalizeSharedWorkshopDiscounts({
      discountAttack: 99,
      discountDefense: 0,
      discountUtility: 12.5,
      enhancementDiscountAttack: 30,
      enhancementDiscountDefense: 0,
      enhancementDiscountUtility: 0,
      enhancementDiscountVault: 0,
    }, {
      discountAttack: 0,
      discountDefense: 0,
      discountUtility: 0,
      enhancementDiscountAttack: 0,
      enhancementDiscountDefense: 0,
      enhancementDiscountUtility: 0,
      enhancementDiscountVault: 0,
    })
    expect(normalized.discountAttack).toBe(49.5)
    expect(normalized.discountUtility).toBe(12.5)
    expect(normalized.enhancementDiscountAttack).toBe(30)
  })
})

describe('workshopLabLevelToSectionDiscountPercent', () => {
  it('maps max lab level to max discount percent', () => {
    expect(workshopLabLevelToSectionDiscountPercent(99)).toBe(49.5)
  })
})
