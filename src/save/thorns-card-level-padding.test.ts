import { describe, expect, it } from 'vitest'
import { CARD_IMPORT_CATALOG } from '../data/player-stats'
import { deriveThornsCalculatorSettingsFromSaveRoot } from './shared-tool-inputs-from-save-extended'

/**
 * `cardLevel` is over-allocated and pads with 1, not 0. Reading it without
 * checking `cardUnlocked` reports level 1 for every card the player has never
 * owned -- a wrong input that looks entirely plausible, which is how it reached
 * the thorns calculator unnoticed.
 *
 * The package guide already said this: "the card level array pads with 1, not
 * 0. Use the unlock flag when one exists, not the level."
 */
const pcIndex = CARD_IMPORT_CATALOG.find(row => row.slug === 'pc')?.index ?? -1

/** A padded save: every card reads 1, and the player owns none of them. */
function paddedSave(overrides: Record<string, unknown> = {}) {
  return {
    cardLevel: Array.from({ length: CARD_IMPORT_CATALOG.length }, () => 1),
    cardUnlocked: Array.from({ length: CARD_IMPORT_CATALOG.length }, () => false),
    ...overrides,
  }
}

describe('thorns settings from a save', () => {
  it('does not import a card level for a card the player does not have', () => {
    const settings = deriveThornsCalculatorSettingsFromSaveRoot(paddedSave())
    expect(settings.pcLevel ?? 0).toBe(0)
  })

  it('imports the real level once the card is unlocked', () => {
    const unlocked = Array.from({ length: CARD_IMPORT_CATALOG.length }, () => false)
    unlocked[pcIndex] = true
    const levels = Array.from({ length: CARD_IMPORT_CATALOG.length }, () => 1)
    levels[pcIndex] = 5

    const settings = deriveThornsCalculatorSettingsFromSaveRoot(
      paddedSave({ cardUnlocked: unlocked, cardLevel: levels }),
    )
    expect(settings.pcLevel).toBe(5)
  })

  it('still reads levels from a save that has no unlock array', () => {
    // Older saves may not carry the flags. Zeroing every card in that case
    // would be a worse failure than trusting the level.
    const levels = Array.from({ length: CARD_IMPORT_CATALOG.length }, () => 0)
    levels[pcIndex] = 4
    const settings = deriveThornsCalculatorSettingsFromSaveRoot({ cardLevel: levels })
    expect(settings.pcLevel).toBe(4)
  })

  it('clamps to the levels the card actually has', () => {
    // Plasma Cannon has seven level values, so 7 is the ceiling.
    const unlocked = Array.from({ length: CARD_IMPORT_CATALOG.length }, () => false)
    unlocked[pcIndex] = true
    const levels = Array.from({ length: CARD_IMPORT_CATALOG.length }, () => 0)
    levels[pcIndex] = 99

    const settings = deriveThornsCalculatorSettingsFromSaveRoot(
      paddedSave({ cardUnlocked: unlocked, cardLevel: levels }),
    )
    expect(settings.pcLevel).toBe(7)
  })
})
