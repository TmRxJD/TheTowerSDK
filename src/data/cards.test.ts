import { describe, expect, it } from 'vitest'
import { CARD_TEMPLATES } from './cards'

/**
 * Card level values, checked against the curves the Effective Paths sheet
 * publishes for the same cards.
 *
 * The catalog stores one number per level, which makes a single mistyped digit
 * invisible — Fortress carried `0.75` where `1.75` belongs for long enough that
 * nothing noticed. The sheet writes these as formulas instead, so where it has
 * one, the whole column can be regenerated and compared.
 */

const card = (id: string) => {
  const template = CARD_TEMPLATES.find(entry => entry.id === id)
  if (!template) throw new Error(`no card template "${id}"`)
  return template
}

describe('card level values against the Effective Paths sheet', () => {
  it('Fortress follows 1.15 + 0.15 × level', () => {
    // eHP!AV25 = 1.15 + 0.15 * AU25, where AU25 is the card level. The sheet
    // reports 1.2999999999999998 for level 1, so this compares to precision
    // rather than exactly.
    const values = card('fort').levelValues
    values.forEach((value, index) => {
      expect(value, `level ${index + 1}`).toBeCloseTo(1.15 + 0.15 * (index + 1), 12)
    })
  })

  it('Extra Defense follows 4% + 1% × level', () => {
    // eHP!AV23 = 4% + 1% * AU23. The catalog stores percents as whole numbers.
    expect(card('def').levelValues)
      .toEqual([1, 2, 3, 4, 5, 6, 7].map(level => 4 + level))
  })

  it('Health keeps the sheet\'s own table, which is not linear', () => {
    // eHP!AV19 is a SWITCH, not a formula — the step drops after level 2.
    expect(card('hp').levelValues).toEqual([1.5, 2, 2.4, 2.8, 3.2, 3.6, 4])
  })

  it('gives every card seven levels', () => {
    for (const template of CARD_TEMPLATES) {
      expect(template.levelValues, template.id).toHaveLength(7)
    }
  })
})
