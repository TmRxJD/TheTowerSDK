import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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
} from '../../src/data/labs/research'
import { SRC } from '../helpers/paths'

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
    expect(LAB_RESEARCH_COUNT).toBe(260)
    expect(LAB_RESEARCH_BY_INDEX).toHaveLength(260)
    expect(typeof displayNameToLabSlug).toBe('function')
    expect(Object.keys(LAB_RESEARCH_SLUG_TO_INDEX).length).toBeGreaterThan(200)
  })

  it('nothing but labs-research.ts imports the generated module', () => {
    const hand = readFileSync(join(SRC, 'data', 'labs', 'research.ts'), 'utf-8')
    /*
     * The specifier as `research.ts` writes it — a relative path from its own folder, not from
     * this test's. An import-repair sweep rewrote this string twice, because a quoted relative
     * path inside an assertion looks exactly like one inside an import.
     */
    expect(hand).toContain("from '../generated/labs-research.generated'")
  })

  it('the generated module carries data only, not resolution logic', () => {
    const data = readFileSync(join(SRC, 'data', 'generated', 'labs-research.generated.ts'), 'utf-8')
    expect(data).toContain('GENERATED — do not edit')
    // Category enrichment and loose matching are decisions, not extractions.
    expect(data).not.toContain('enrichLabResearchCategory')
    expect(data).not.toContain('findLabResearchByLooseName')
    expect(data).not.toContain('labs-catalog')
  })
})

describe('hand-owned rows survive regeneration', () => {
  /**
   * Indices 242-252 named via I2/Initialize. 242-245 enemy labs
   * whose strings resolve through I2 at runtime; 249 is an empty pad (Bastion Mastery cut from final v29).
   * All five overridden rows live in ROW_OVERRIDES in the generator.
   */
  const RELEASED_ENEMY_LABS = [
    [242, 'Overcharge Enemy Health', 5],
    [243, 'Overcharge Enemy Damage', 5],
    [244, 'Commander Enemy Health', 4],
    [245, 'Saboteur Enemy Health', 3],
  ] as const

  it.each(RELEASED_ENEMY_LABS)('index %i is %s with Lab.Initialize costs', (index, name, mile) => {
    const row = findLabResearchByIndex(index)
    expect(row?.displayName).toBe(name)
    expect(row?.slug).toBe(displayNameToLabSlug(name))
    expect(row?.levelMax).toBe(30)
    expect(row?.baseCoinCost).toBe(1e18)
    expect(row?.baseTime).toBe(1260000)
    expect(row?.tierUnlock).toBe(23)
    expect(row?.milestoneUnlock).toBe(mile)
  })

  it('names fleet labs 246-248 and presets 250-252 from Lab.Initialize + LanguageUpdate', () => {
    expect(findLabResearchByIndex(246)?.displayName).toBe('Overcharge Exponent Reducer')
    expect(findLabResearchByIndex(246)?.baseCoinCost).toBe(1e21)
    expect(findLabResearchByIndex(250)?.tierUnlock).toBe(14)
    expect(findLabResearchByIndex(250)?.milestoneUnlock).toBe(5)
    expect(findLabResearchByIndex(252)?.displayName).toBe('Global Presets')
    expect(findLabResearchByIndex(252)?.levelMax).toBe(1)
    expect(findLabResearchByIndex(252)?.tierUnlock).toBe(11)
    expect(findLabResearchByIndex(252)?.milestoneUnlock).toBe(5)
  })

  it('keeps indices 249 and 253-259 as empty pads (Initialize defaults, null names)', () => {
    for (const index of [249, 253, 254, 255, 256, 257, 258, 259]) {
      const row = findLabResearchByIndex(index)
      expect(row?.displayName, `index ${index}`).toBeNull()
      expect(row?.baseCoinCost).toBe(30)
      expect(row?.baseTime).toBe(15)
      expect(row?.levelMax).toBe(99)
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
  it('enriches categories from the site catalog and the game hierarchy', () => {
    const enriched = LAB_RESEARCH_BY_INDEX
      .map((_, i) => findLabResearchByIndex(i))
      .filter(row => row?.category)
    // Was 227, when the hand-owned catalog was the only source and covered 231 of the
    // game's 253 labs. Categories now fall back to the game's own UI hierarchy
    // (labs-categories.generated.ts), which is why this rose: the labs it closed were
    // resolvable by index yet had no category, so a category-keyed page could not render
    // them. `lab-catalog-covers-the-game.test.ts` is the guard on that; this number is a
    // count, and a count is not a coverage claim — do not treat it as one.
    expect(enriched.length).toBe(248)
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
