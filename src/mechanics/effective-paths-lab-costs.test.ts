import { describe, expect, it } from 'vitest'
import fixtures from './effective-paths-lab-costs.fixtures.json'
import {
  EFFECTIVE_PATHS_LAB_KEYS,
  labCoinCostToReachLevel,
  labCoinDiscount,
  labDurationDaysToReachLevel,
  labMaxCatalogLevel,
  labSpeedTotal,
  resolveEffectivePathsLabKey,
} from './effective-paths-lab-costs'

describe('lab costs against the sheet', () => {
  it('agrees on every captured cost and duration', () => {
    const mismatches: string[] = []

    for (const testCase of fixtures.cases) {
      const key = resolveEffectivePathsLabKey(testCase.sheetName)
      if (key === null) {
        mismatches.push(`${testCase.sheetName}: no catalog key`)
        continue
      }
      const actual = testCase.kind === 'cost'
        ? labCoinCostToReachLevel(key, testCase.level)
        : labDurationDaysToReachLevel(key, testCase.level)

      if (actual === null) {
        mismatches.push(`${testCase.sheetName} L${testCase.level} ${testCase.kind}: no catalog row`)
        continue
      }
      const relative = Math.abs(actual - testCase.sheetValue)
        / Math.max(Math.abs(testCase.sheetValue), 1e-12)
      if (relative > 1e-9) {
        mismatches.push(
          `${testCase.sheetName} L${testCase.level} ${testCase.kind}: `
          + `sheet=${testCase.sheetValue} sdk=${actual}`,
        )
      }
    }

    expect(mismatches).toEqual([])
    expect(fixtures.cases.length).toBe(104)
  })

  it('maps "Chrono Field Reduction %" to the reduction lab, not the damage-reduction one', () => {
    // The catalog has both `chrono_field_reduction` and
    // `chrono_field_damage_reduction`; only the first matches the sheet's costs.
    expect(resolveEffectivePathsLabKey('Chrono Field Reduction %')).toBe('chrono_field_reduction')
  })

  it('accepts both spellings of the trade-off perks lab', () => {
    // The sheet writes it "Improve Trade-off Perks" in one place and
    // "Improve Trade-Off Perks" in another.
    expect(resolveEffectivePathsLabKey('Improve Trade-off Perks')).toBe('improve_trade_off_perks')
    expect(resolveEffectivePathsLabKey('Improve Trade-Off Perks')).toBe('improve_trade_off_perks')
  })

  it('returns null for something that is not a lab', () => {
    // Module substats are bought with stones, so they have no lab cost.
    expect(resolveEffectivePathsLabKey('Assist Module Substats - Armor')).toBeNull()
    expect(resolveEffectivePathsLabKey('nonsense')).toBeNull()
  })

  it('maps every key it claims to a lab the catalog actually has', () => {
    for (const [sheetName, key] of Object.entries(EFFECTIVE_PATHS_LAB_KEYS)) {
      expect(labMaxCatalogLevel(key), `${sheetName} -> ${key}`).toBeGreaterThan(0)
    }
  })
})

describe('lab cost modifiers', () => {
  it('takes 0.3% off the coin cost per discount level', () => {
    expect(labCoinDiscount(0)).toBe(0)
    expect(labCoinDiscount(10)).toBeCloseTo(0.03, 12)

    const base = labCoinCostToReachLevel('health', 1) as number
    const discounted = labCoinCostToReachLevel('health', 1, { coinDiscountLabLevel: 10 }) as number
    expect(discounted).toBeCloseTo(base * 0.97, 9)
  })

  it('stacks lab speed and the relic multiplicatively, not additively', () => {
    expect(labSpeedTotal(0)).toBe(1)
    expect(labSpeedTotal(10)).toBeCloseTo(1.2, 12)
    // 1.2 * 1.1 = 1.32, not 1 + 0.2 + 0.1 = 1.3
    expect(labSpeedTotal(10, 0.1)).toBeCloseTo(1.32, 12)
  })

  it('divides duration by lab speed', () => {
    const base = labDurationDaysToReachLevel('health', 2) as number
    const fast = labDurationDaysToReachLevel('health', 2, { labSpeedLabLevel: 10 }) as number
    expect(fast).toBeCloseTo(base / 1.2, 12)
  })

  it('refuses a level the catalog has no data for, rather than extrapolating', () => {
    const max = labMaxCatalogLevel('health')
    expect(max).toBeGreaterThan(0)
    expect(labCoinCostToReachLevel('health', max)).not.toBeNull()
    expect(labCoinCostToReachLevel('health', max + 1)).toBeNull()
    expect(labDurationDaysToReachLevel('health', max + 1)).toBeNull()
    expect(labCoinCostToReachLevel('health', 0)).toBeNull()
    expect(labCoinCostToReachLevel('not_a_lab', 1)).toBeNull()
  })
})
