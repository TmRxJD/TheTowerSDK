import { describe, expect, it } from 'vitest'
import { CARDS_ASSET_TABLE } from '../../src/data/assets/data'
import { CARD_IMPORT_CATALOG } from '../../src/data/player-stats/data'
import { readThornsCalculatorSettings } from '../../src/save/shared-tool-inputs/from-save-extended'

/**
 * `CARD_IMPORT_CATALOG.index` is the card's slot in the save arrays.
 *
 * It used to number the cards it knew about consecutively while the save leaves
 * nine placeholder slots in place, so an index read the wrong card once past
 * the first gap. Plasma Cannon was catalog 14 and save slot 18, and slot 14 is
 * a placeholder that `cardLevel` fills with 1 -- so a maxed card imported as
 * level 1.
 */
const assetNames = CARDS_ASSET_TABLE?.cardNames ?? []
const slotOf = (name: string) => assetNames.findIndex(n => String(n ?? '').trim() === name)

describe('card save index mapping', () => {
  it('indexes cards by their save slot, not consecutively', () => {
    const pc = CARD_IMPORT_CATALOG.find(row => row.slug === 'pc')
    expect(pc?.index).toBe(slotOf('Plasma Cannon'))
    expect(pc?.index).toBe(18)
  })

  it('covers all 32 shipped cards (CardID; Bastion omitted)', () => {
    const named = assetNames.filter(name => String(name ?? '').trim()).length
    const withSlug = CARD_IMPORT_CATALOG.filter(row => row.slug).length
    // v29 CardID adds Cells=37. Bastion=36 stays binary-only / not catalogued.
    expect(named).toBe(32)
    expect(withSlug).toBe(32)
    expect(CARD_IMPORT_CATALOG.find(row => row.slug === 'nuke')).toBeDefined()
    expect(CARD_IMPORT_CATALOG.find(row => row.slug === 'aoe')).toBeDefined()
    expect(CARD_IMPORT_CATALOG.find(row => row.slug === 'cells')?.index).toBe(37)
    expect(CARD_IMPORT_CATALOG.find(row => row.index === 36)?.slug).toBeNull()
  })

  it('marks the placeholder slots the game has not filled yet', () => {
    const placeholders = CARD_IMPORT_CATALOG.filter(row => !row.slug).map(row => row.index)
    // 36 = Bastion (pulled pre-release); 8/9/14/17/24/38/39 = unused gaps.
    expect(placeholders).toEqual([8, 9, 14, 17, 24, 36, 38, 39])
    for (const index of placeholders) {
      expect(String(assetNames[index] ?? '').trim()).toBe('')
    }
  })

  it('agrees with the asset table on every named slot', () => {
    for (const row of CARD_IMPORT_CATALOG) {
      const assetName = String(assetNames[row.index] ?? '').trim()
      if (!row.slug) continue
      expect(assetName, `slot ${row.index} (${row.slug})`).not.toBe('')
    }
  })

  it('reads a maxed Plasma Cannon from its real slot', () => {
    const slot = slotOf('Plasma Cannon')
    const levels = Array.from({ length: assetNames.length }, () => 1)
    const unlocked = Array.from({ length: assetNames.length }, () => false)
    levels[slot] = 7
    unlocked[slot] = true

    const settings = readThornsCalculatorSettings({
      cardLevel: levels,
      cardUnlocked: unlocked,
    })
    expect(settings.pcLevel).toBe(7)
  })

  it('does not read a placeholder slot as a card', () => {
    const levels = Array.from({ length: assetNames.length }, () => 0)
    const unlocked = Array.from({ length: assetNames.length }, () => false)
    // Slot 14 is a placeholder. Whatever is in it must never become a card level.
    levels[14] = 5
    unlocked[14] = true

    const settings = readThornsCalculatorSettings({
      cardLevel: levels,
      cardUnlocked: unlocked,
    })
    expect(settings.pcLevel ?? 0).toBe(0)
  })
})
