import { describe, expect, it } from 'vitest'
import { CARDS_ASSET_TABLE } from '../data/assets'
import { CARD_IMPORT_CATALOG } from '../data/player-stats'
import { deriveThornsCalculatorSettingsFromSaveRoot } from './shared-tool-inputs-from-save-extended'

/**
 * The save's card arrays use the game's slot numbering, which has gaps.
 * CARD_IMPORT_CATALOG is a compacted list with none. Indexing the save with a
 * catalog index therefore reads the wrong card once past the first gap.
 *
 * Plasma Cannon: catalog 14, save slot 18, and slot 14 is empty. Since
 * `cardLevel` pads with 1, the thorns calculator reported "Plasma Cannon level
 * 1" for a player holding it maxed at 7.
 */
const assetNames = CARDS_ASSET_TABLE?.cardNames ?? []
const slotOf = (name: string) => assetNames.findIndex(n => String(n ?? '').trim() === name)

describe('card save index mapping', () => {
  it('knows the save layout has gaps the catalog does not', () => {
    // Both arrays are 40 long, but the catalog numbers cards consecutively
    // while the asset table leaves the game's empty slots in place, so the same
    // card ends up with two different indices.
    expect(String(assetNames[14] ?? '').trim()).toBe('')
    expect(slotOf('Plasma Cannon')).toBe(18)
    expect(CARD_IMPORT_CATALOG.find(r => r.slug === 'pc')?.index).toBe(14)
  })

  it('reads a maxed Plasma Cannon from its real slot', () => {
    const slot = slotOf('Plasma Cannon')
    const levels = Array.from({ length: assetNames.length }, () => 1)
    const unlocked = Array.from({ length: assetNames.length }, () => false)
    // Level 7 at the real slot; the catalog index stays at the padding value.
    levels[slot] = 7
    unlocked[slot] = true

    const settings = deriveThornsCalculatorSettingsFromSaveRoot({
      cardLevel: levels,
      cardUnlocked: unlocked,
    })

    expect(settings.pcLevel).toBe(7)
  })

  it('does not read the empty slot the catalog index points at', () => {
    const levels = Array.from({ length: assetNames.length }, () => 0)
    const unlocked = Array.from({ length: assetNames.length }, () => false)
    // Something at catalog index 14 (an unused slot) must not become pcLevel.
    levels[14] = 5
    unlocked[14] = true

    const settings = deriveThornsCalculatorSettingsFromSaveRoot({
      cardLevel: levels,
      cardUnlocked: unlocked,
    })

    expect(settings.pcLevel ?? 0).toBe(0)
  })

  it('reads mastery from the real slot too', () => {
    const slot = slotOf('Plasma Cannon')
    const unlocked = Array.from({ length: assetNames.length }, () => false)
    const mastery = Array.from({ length: assetNames.length }, () => false)
    unlocked[slot] = true
    mastery[slot] = true
    const levels = Array.from({ length: assetNames.length }, () => 0)
    levels[slot] = 7

    const settings = deriveThornsCalculatorSettingsFromSaveRoot({
      cardLevel: levels,
      cardUnlocked: unlocked,
      cardMasteryUnlocked: mastery,
    })

    expect(settings.pcMasteryLevel).toBe(1)
  })
})
