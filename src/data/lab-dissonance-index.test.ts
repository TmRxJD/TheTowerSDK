import { describe, expect, it } from 'vitest'
import { TOWER_ASSET_TABLES } from './assets'
import { LAB_RESEARCH_IMPORT_CATALOG } from './player-stats'
import { LAB_RESEARCH_DISPLAY_NAME_OVERRIDES } from './labs-display-overrides'
import { findLabResearchByIndex } from './labs-research'

/**
 * The four Dissonant Echo lab indices, and the three tables that must agree.
 *
 * This is not a shape check. 238 and 241 were swapped in two hand-written
 * tables for long enough to ship, and nothing caught it because every table
 * had four plausible names in it — only their PAIRING with an index was wrong.
 *
 * The authority is `DissonanceManager.Awake` (v28.3.0-arm64, RVA 0x21cd414),
 * which builds the boosts with research indices 239, 240, 238, 241 and stores
 * them into damageBoost, healthBoost, coinBoost, ultDamageBoost in that order.
 * Utility is the trade that pays out in coin, so 238 is Utility.
 */
const DISSONANCE_BY_INDEX: Readonly<Record<number, string>> = {
  238: 'Dissonant Echo - Utility',
  239: 'Dissonant Echo - Attack',
  240: 'Dissonant Echo - Defense',
  241: 'Dissonant Echo - Ultimate Weapons',
}

const researchNames = (TOWER_ASSET_TABLES as unknown as {
  labResearch: { researchNames: readonly string[] }
}).labResearch.researchNames

function importRow(index: number) {
  const matches = (LAB_RESEARCH_IMPORT_CATALOG as readonly { index: number }[])
    .filter(row => row.index === index)
  expect(matches, `expected exactly one import row for index ${index}`).toHaveLength(1)
  return matches[0] as { index: number, displayName: string | null, slug: string | null }
}

describe('Dissonant Echo lab indices', () => {
  it('the game asset table names each index as DissonanceManager.Awake implies', () => {
    for (const [index, name] of Object.entries(DISSONANCE_BY_INDEX)) {
      expect(researchNames[Number(index)], `researchNames[${index}]`).toBe(name)
    }
  })

  it('the import catalog agrees, in both displayName and slug', () => {
    for (const [index, name] of Object.entries(DISSONANCE_BY_INDEX)) {
      const row = importRow(Number(index))
      expect(row.displayName, `import displayName at ${index}`).toBe(name)
      expect(row.slug, `import slug at ${index}`).toBe(
        name.toLowerCase().replace(/ - /g, '_').replace(/ /g, '_'),
      )
    }
  })

  it('the display-name overrides agree', () => {
    expect(LAB_RESEARCH_DISPLAY_NAME_OVERRIDES).toEqual(DISSONANCE_BY_INDEX)
  })

  it('LAB_RESEARCH_BY_INDEX agrees', () => {
    for (const [index, name] of Object.entries(DISSONANCE_BY_INDEX)) {
      expect(findLabResearchByIndex(Number(index))?.displayName, `byIndex ${index}`).toBe(name)
    }
  })

  it('the four names are distinct, so a swap cannot hide behind a duplicate', () => {
    expect(new Set(Object.values(DISSONANCE_BY_INDEX)).size).toBe(4)
  })
})
