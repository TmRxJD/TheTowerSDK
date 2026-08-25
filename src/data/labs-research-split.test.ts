import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  displayNameToLabSlug,
  findLabResearchByDisplayName,
  findLabResearchByIndex,
  findLabResearchByLooseName,
  findLabResearchBySlug,
  findLabResearchRecord,
  LAB_RESEARCH_BY_INDEX,
  LAB_RESEARCH_COUNT,
  LAB_RESEARCH_LEGACY_SLUG_ALIASES,
  LAB_RESEARCH_SLUG_TO_INDEX,
} from './labs-research'

/**
 * labs-research.ts is hand-owned; labs-research-data.ts is generated.
 *
 * They were one file until 2026-08-18, which meant `pnpm generate:lab-research-ts`
 * would destroy ~400 lines of hand-written logic and 22 hand-edited data fields.
 * Nobody ran it, so its input rotted for two months. These tests hold the split
 * in place and pin the hand-owned data that would otherwise be lost.
 */

describe('the generated/hand-owned split', () => {
  it('keeps the whole public surface on labs-research.ts', () => {
    expect(LAB_RESEARCH_COUNT).toBe(250)
    expect(LAB_RESEARCH_BY_INDEX).toHaveLength(250)
    expect(typeof displayNameToLabSlug).toBe('function')
    expect(Object.keys(LAB_RESEARCH_SLUG_TO_INDEX).length).toBeGreaterThan(200)
  })

  it('nothing but labs-research.ts imports the generated module', () => {
    const hand = readFileSync(new URL('./labs-research.ts', import.meta.url), 'utf-8')
    expect(hand).toContain("from './labs-research-data'")
  })

  it('the generated module carries data only, not resolution logic', () => {
    const data = readFileSync(new URL('./labs-research-data.ts', import.meta.url), 'utf-8')
    expect(data).toContain('GENERATED — do not edit')
    // Category enrichment and loose matching are decisions, not extractions.
    expect(data).not.toContain('enrichLabResearchCategory')
    expect(data).not.toContain('findLabResearchByLooseName')
    expect(data).not.toContain('labs-catalog')
  })
})

describe('hand-owned rows survive regeneration', () => {
  /**
   * Indices 242-249 are blank in the asset table. 242-245 are released labs
   * whose strings resolve through I2 at runtime; 246-249 are reserved padding.
   * All five overridden rows live in ROW_OVERRIDES in the generator.
   */
  const RELEASED_BLANK_ROWS = [
    [242, 'Overcharge Enemy Health'],
    [243, 'Overcharge Enemy Damage'],
    [244, 'Commander Enemy Health'],
    [245, 'Saboteur Enemy Health'],
  ] as const

  it.each(RELEASED_BLANK_ROWS)('index %i is %s with its real costs', (index, name) => {
    const row = findLabResearchByIndex(index)
    expect(row?.displayName).toBe(name)
    expect(row?.slug).toBe(displayNameToLabSlug(name))
    expect(row?.levelMax).toBe(30)
    expect(row?.baseCoinCost).toBe(250000000000000000)
    expect(row?.baseTime).toBe(933060)
    expect(row?.tierUnlock).toBe(22)
    expect(row?.milestoneUnlock).toBe(5)
  })

  it('leaves the reserved padding slots 246-249 unnamed', () => {
    for (const index of [246, 247, 248, 249]) {
      expect(findLabResearchByIndex(index)?.displayName, `index ${index}`).toBe('')
    }
  })

  /**
   * Swamp Rend - Additional Enemies caps at 11, not the 6 in the asset table.
   *
   * I first recorded this as unresolved and leaning wrong, because the asset
   * table and labs-catalog.ts both said 6. Both were stale. The Effective Paths
   * sheet lists 11 levels, and 11 is exactly the number of EnemyType values
   * other than Basic in v28.3.0 — the lab extends Swamp Rend to one further
   * enemy type per level, so its cap tracks the enemy roster. 6 was right when
   * there were six other types.
   *
   * labs-catalog.ts has been corrected to carry levels 7-9; 10-11 are unpriced
   * in the sheet and deliberately absent. lab-reference.test.ts holds both ends.
   */
  it('caps Swamp Rend - Additional Enemies at 11, one per non-Basic enemy type', () => {
    const row = findLabResearchByIndex(157)
    expect(row?.displayName).toBe('Swamp Rend - Additional Enemies')
    expect(row?.levelMax).toBe(11)
  })
})

describe('resolution still works through the hand-owned layer', () => {
  it('enriches categories from the site catalog', () => {
    const enriched = LAB_RESEARCH_BY_INDEX
      .map((_, i) => findLabResearchByIndex(i))
      .filter(row => row?.category)
    expect(enriched.length).toBe(221)
  })

  it('resolves by slug, display name, loose name and the combined resolver', () => {
    expect(findLabResearchBySlug('damage')?.index).toBe(0)
    expect(findLabResearchByDisplayName('Dissonant Echo - Utility')?.index).toBe(238)
    expect(findLabResearchByLooseName('Dissonant Echo Defense')?.index).toBe(240)
    expect(findLabResearchRecord('Assist Module Bonus Cannon')?.slug)
      .toBe('assist_module_bonus_cannon')
  })

  it('resolves every legacy alias to a real lab', () => {
    for (const [alias, target] of Object.entries(LAB_RESEARCH_LEGACY_SLUG_ALIASES)) {
      expect(findLabResearchBySlug(alias), `alias ${alias}`).toBeDefined()
      expect(findLabResearchBySlug(target), `target ${target}`).toBeDefined()
    }
  })

  it('returns undefined for an unknown name rather than a fallback', () => {
    expect(findLabResearchRecord('not a lab at all')).toBeUndefined()
    expect(findLabResearchBySlug('')).toBeUndefined()
  })
})
