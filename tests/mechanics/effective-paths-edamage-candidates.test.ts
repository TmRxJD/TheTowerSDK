import { describe, expect, it } from 'vitest'
import {
  EFFECTIVE_DAMAGE_CANDIDATES_BY_PATH,
  type EffectiveDamagePathVariant,
} from '../../src/mechanics/effective-paths/edamage-candidates'
import fixtures from '../../fixtures/mechanics/effective-paths-edamage-candidates.fixtures.json'

/**
 * The four eDamage candidate lists, against the sheet's own update matrices.
 *
 * A missing candidate is an upgrade a path silently never offers, which shows
 * up nowhere in the output — so the lists are pinned name by name and in the
 * sheet's own order, which is also the planner's tie-break order.
 */

const variants: EffectiveDamagePathVariant[] = ['lab', 'stone', 'coin', 'keys']

describe('the eDamage candidate lists', () => {
  for (const variant of variants) {
    it(`matches the sheet's ${variant} matrix, name for name and in order`, () => {
      const fromSheet = fixtures[variant].candidates
        .filter(entry => entry.sheetName !== null)
        .map(entry => ({ column: entry.column, sheetName: entry.sheetName as string }))

      expect(EFFECTIVE_DAMAGE_CANDIDATES_BY_PATH[variant]).toEqual(fromSheet)
    })
  }

  it('offers 33, 29, 25 and 11', () => {
    expect(EFFECTIVE_DAMAGE_CANDIDATES_BY_PATH.lab).toHaveLength(32)
    expect(EFFECTIVE_DAMAGE_CANDIDATES_BY_PATH.stone).toHaveLength(29)
    expect(EFFECTIVE_DAMAGE_CANDIDATES_BY_PATH.coin).toHaveLength(25)
    expect(EFFECTIVE_DAMAGE_CANDIDATES_BY_PATH.keys).toHaveLength(11)
    // 33 columns on the lab path, one of them deliberately blank.
    expect(fixtures.lab.candidates).toHaveLength(33)
    expect(fixtures.lab.candidates.filter(entry => entry.sheetName === null)).toHaveLength(1)
  })

  it('leaves the Generator substat column blank on the lab path', () => {
    // Not padding: the level exists, but the Generator substat feeds the
    // economy stats and no damage one, so the sheet declines to rank it.
    const blank = fixtures.lab.candidates.find(entry => entry.sheetName === null)
    expect(blank?.column).toBe('IF')
    for (const variant of variants) {
      expect(
        EFFECTIVE_DAMAGE_CANDIDATES_BY_PATH[variant].map(entry => entry.sheetName),
        variant,
      ).not.toContain('Assist Module Substats - Generator')
    }
  })

  it('gives the stone path the ultimate weapons, which no other path buys', () => {
    // The eHP stone path buys three assist capacities and stops; this one is
    // four stats apiece across six weapons plus Chrono Field.
    const stone = EFFECTIVE_DAMAGE_CANDIDATES_BY_PATH.stone.map(entry => entry.sheetName)
    for (const weapon of ['DW', 'CL', 'SM', 'SL', 'PS', 'ILM', 'CF']) {
      expect(stone.some(name => name.startsWith(`${weapon} `)), weapon).toBe(true)
    }
    const others = [...EFFECTIVE_DAMAGE_CANDIDATES_BY_PATH.lab, ...EFFECTIVE_DAMAGE_CANDIDATES_BY_PATH.coin]
      .map(entry => entry.sheetName)
    expect(others).not.toContain('DW Damage')
  })

  it('keeps every name distinct within a path', () => {
    for (const variant of variants) {
      const names = EFFECTIVE_DAMAGE_CANDIDATES_BY_PATH[variant].map(entry => entry.sheetName)
      expect(new Set(names).size, variant).toBe(names.length)
    }
  })
})
