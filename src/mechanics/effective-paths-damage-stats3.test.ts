import { describe, expect, it } from 'vitest'
import {
  shockwaveDamage,
  spotlightCoverage,
  superTowerBonus,
  superTowerCooldown,
  superTowerEffectiveBonus,
  superTowerEffectiveUltimateBonus,
} from './effective-paths-damage-stats'
import fixtures from './effective-paths-damage-stats3.fixtures.json'

/**
 * Super Tower, Spotlight coverage and the shockwave, against the live sheet.
 *
 * `EPD_SUPERTOWER_EFFECTIVE_BONUS` is captured on both branches of the
 * Spotlight gate. That took toggling `eDamage!$BH$33` on the working copy and
 * putting the formula back, because the function reads that cell rather than
 * the `has_sl` parameter it declares — see the test that pins the difference.
 */

const close = (ours: number, sheet: number, digits = 12) =>
  expect(Math.abs(ours / sheet - 1)).toBeLessThan(10 ** -digits)

describe('EPD_SUPERTOWER_BONUS', () => {
  for (const s of fixtures.superTowerBonus) {
    it(`matches the sheet at card level ${s.level}, lab ${s.lab}`, () => {
      close(superTowerBonus(s.level, s.lab), s.sheet)
    })
  }

  it('gives level 7 a tenth more than the line would', () => {
    // The sheet writes this as a string comparison against "Lvl 7"; it fires.
    expect(superTowerBonus(6, 0)).toBeCloseTo(4.5, 12)
    expect(superTowerBonus(7, 0)).toBeCloseTo(5, 12)
    expect(superTowerBonus(7, 0)).not.toBeCloseTo(2.1 + 7 * 0.4, 12)
  })
})

describe('EPD_SUPERTOWER_COOLDOWN', () => {
  for (const s of fixtures.superTowerCooldown) {
    it(`matches the sheet with mastery ${s.has} at level ${s.level}`, () => {
      expect(superTowerCooldown(s.has, s.level)).toBeCloseTo(s.sheet, 12)
    })
  }

  it('starts at 45 seconds and drops 3 a mastery level', () => {
    expect(superTowerCooldown(false, 9)).toBe(45)
    expect(superTowerCooldown(true, 0)).toBe(42)
  })
})

describe('EP_UW_SL_COVERAGE', () => {
  for (const [index, c] of fixtures.spotlightCoverage.entries()) {
    it(`matches the sheet on state ${index}`, () => {
      expect(spotlightCoverage(c.quant, c.angle)).toBeCloseTo(c.sheet, 12)
    })
  }

  it('counts the smallest enemy\u2019s own width, and stops at the full circle', () => {
    // A zero-degree spotlight still covers something: enemies have width.
    expect(spotlightCoverage(1, 0)).toBeCloseTo(4 / 360, 12)
    expect(spotlightCoverage(20, 90)).toBe(1)
  })
})

describe('EPD_SUPERTOWER_EFFECTIVE_BONUS', () => {
  for (const [index, e] of fixtures.superTowerEffective.entries()) {
    it(`matches the sheet on state ${index}, spotlight off`, () => {
      close(superTowerEffectiveBonus({
        hasCard: e.hasCard,
        hasMastery: e.hasMastery,
        bonus: e.bonus,
        cooldownSeconds: e.cooldown,
        hasSpotlight: false,
        spotlightQuantity: e.slQuant,
        spotlightAngleDegrees: e.slAngle,
      }), e.sheet)
    })

    it(`matches the sheet on state ${index}, spotlight on`, () => {
      close(superTowerEffectiveBonus({
        hasCard: e.hasCard,
        hasMastery: e.hasMastery,
        bonus: e.bonus,
        cooldownSeconds: e.cooldown,
        hasSpotlight: true,
        spotlightQuantity: e.slQuant,
        spotlightAngleDegrees: e.slAngle,
      }), e.sheetWithSpotlight)
    })
  }

  it('takes its own hasSpotlight, where the sheet ignores the parameter', () => {
    // The sheet reads `eDamage!$BH$33` instead of `has_sl`, so a row with the
    // parameter false still picked up coverage when the cell was true. Seven
    // of the sixteen fixture rows differ between the branches, and some of
    // those have `hasSl` false — proof the parameter does nothing there.
    const ignored = fixtures.superTowerEffective
      .filter(e => e.sheet !== e.sheetWithSpotlight && !e.hasSl)
    expect(ignored.length).toBeGreaterThan(0)
  })

  it('is one without the card, whatever else is set', () => {
    expect(superTowerEffectiveBonus({
      hasCard: false,
      hasMastery: true,
      bonus: 5,
      cooldownSeconds: 30,
      hasSpotlight: true,
      spotlightQuantity: 8,
      spotlightAngleDegrees: 60,
    })).toBe(1)
  })
})

describe('EPD_SUPERTOWER_EFFECTIVE_UWBONUS', () => {
  for (const [index, e] of fixtures.superTowerEffectiveUw.entries()) {
    it(`matches the sheet on state ${index}`, () => {
      close(superTowerEffectiveUltimateBonus({
        hasCard: e.hasCard,
        hasMastery: e.hasMastery,
        bonus: e.bonus,
        cooldownSeconds: e.cooldown,
      }), e.sheet)
    })
  }

  it('needs both the card and the mastery', () => {
    const base = { bonus: 5, cooldownSeconds: 30 }
    expect(superTowerEffectiveUltimateBonus({ ...base, hasCard: true, hasMastery: false })).toBe(1)
    expect(superTowerEffectiveUltimateBonus({ ...base, hasCard: false, hasMastery: true })).toBe(1)
    expect(superTowerEffectiveUltimateBonus({ ...base, hasCard: true, hasMastery: true }))
      .not.toBe(1)
  })
})

describe('EPD_SHOCKWAVE_DAMAGE', () => {
  for (const [index, s] of fixtures.shockwave.entries()) {
    it(`matches the sheet on state ${index}`, () => {
      close(shockwaveDamage({
        cannonBonus: s.acp,
        sizeWorkshopLevel: s.sizeWs,
        sizeLabLevel: s.sizeLab,
        frequencyWorkshopLevel: s.freqWs,
        frequencyVault: s.freqVault,
        frequencySubstat: s.freqSub,
      }), s.sheet)
    })
  }

  it('is one with no cannon bonus to spread', () => {
    expect(shockwaveDamage({
      cannonBonus: 0,
      sizeWorkshopLevel: 30,
      sizeLabLevel: 20,
      frequencyWorkshopLevel: 80,
      frequencyVault: -3,
      frequencySubstat: -4,
    })).toBe(1)
  })

  it('floors the frequency at seven seconds before adding the wave\u2019s size', () => {
    const fast = shockwaveDamage({
      cannonBonus: 3,
      sizeWorkshopLevel: 0,
      sizeLabLevel: 0,
      frequencyWorkshopLevel: 999,
      frequencyVault: -50,
      frequencySubstat: -50,
    })
    // Floored at 7, plus half the 0.6s base size.
    expect(fast).toBeCloseTo(1 + 2 * (7 / 7.3), 12)
  })
})

describe('the Super Tower ultimate-weapon share, which looks wrong', () => {
  /**
   * `EPD_SUPERTOWER_EFFECTIVE_UWBONUS` writes `35% × bonus − 1` where its own
   * sibling writes `1 + 35% × (bonus − 1)`. These pin the consequence so it
   * stays deliberate: parity with the sheet, not agreement with the card.
   */
  const at = (bonus: number, cooldown = 45) => superTowerEffectiveUltimateBonus({
    hasCard: true, hasMastery: true, bonus, cooldownSeconds: cooldown,
  })

  it('turns into a penalty below a card bonus of 1 / 0.35', () => {
    const breakEven = 1 / 0.35
    expect(at(breakEven)).toBeCloseTo(1, 12)
    expect(at(breakEven - 0.1)).toBeLessThan(1)
    expect(at(breakEven + 0.1)).toBeGreaterThan(1)
  })

  it('makes a level 1 Super Tower card weaken every ultimate weapon', () => {
    // 2.1 + 0.4 × 1 = 2.5, and 0.35 × 2.5 − 1 is negative.
    expect(at(superTowerBonus(1, 0))).toBeLessThan(1)
    // Its sibling, given the same bonus, is above 1 as a bonus should be.
    expect(superTowerEffectiveBonus({
      hasCard: true,
      hasMastery: true,
      bonus: superTowerBonus(1, 0),
      cooldownSeconds: 45,
      hasSpotlight: false,
      spotlightQuantity: 0,
      spotlightAngleDegrees: 0,
    })).toBeGreaterThan(1)
  })

  it('differs from its sibling\u2019s reading by a constant 0.65 of the bonus', () => {
    for (const bonus of [1.5, 2.5, 5, 7.3]) {
      const sheetShare = 0.35 * bonus - 1
      const siblingShare = 0.35 * (bonus - 1)
      expect(siblingShare - sheetShare).toBeCloseTo(0.65, 12)
    }
  })

  it('still matches the sheet, penalty and all', () => {
    // The fixture rows below 1 are the sheet's own answers, not ours.
    const penalties = fixtures.superTowerEffectiveUw
      .filter(e => e.hasCard && e.hasMastery && e.sheet < 1)
    expect(penalties.length).toBeGreaterThan(0)
    for (const e of penalties) {
      expect(superTowerEffectiveUltimateBonus({
        hasCard: e.hasCard,
        hasMastery: e.hasMastery,
        bonus: e.bonus,
        cooldownSeconds: e.cooldown,
      })).toBeCloseTo(e.sheet, 12)
    }
  })
})
