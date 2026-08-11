import { describe, expect, it } from 'vitest'
import { LAB_CATALOG } from './labs-catalog'
import { LAB_RESEARCH_SLUG_TO_INDEX } from './labs-research'
import { isLabUnlockedAt, LAB_UNLOCKS, UNLOCKED_BY_ULTIMATE } from './labs-unlocks'

/**
 * The unlock table is ported from the Effective Paths sheet rather than from a
 * game dump, so the check that matters is that every name in it is a real lab.
 * A typo here would silently stop hiding a lab, which nothing else would catch.
 */
describe('lab unlock requirements', () => {
  it('names only labs the game actually has', () => {
    // The catalog punctuates differently from the sheet, and a handful of labs
    // exist only as research slugs with no display name, so this compares on
    // letters and digits across both tables.
    const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '')
    const known = new Set([
      ...LAB_CATALOG.map(entry => key(entry.name)),
      ...Object.keys(LAB_RESEARCH_SLUG_TO_INDEX).map(key),
    ])
    const unknown = Object.keys(LAB_UNLOCKS).filter(name => !known.has(key(name)))
    expect(unknown).toEqual([])
  })

  it('covers the labs the eHP path can buy', () => {
    // A missing entry silently makes a locked lab look available, so the ones
    // the path actually offers are worth naming.
    for (const lab of ['Chain Thunder', 'Wall Fortification', 'Death Wave Health']) {
      expect(LAB_UNLOCKS[lab], lab).toBeDefined()
    }
  })

  it('gates a lab on reaching its wave, on its tier', () => {
    // Chain Thunder unlocks at tier 16, wave 60.
    expect(LAB_UNLOCKS['Chain Thunder']).toEqual({ tier: 16, wave: 60 })
    expect(isLabUnlockedAt('Chain Thunder', 16, 59)).toBe(false)
    expect(isLabUnlockedAt('Chain Thunder', 16, 60)).toBe(true)
    expect(isLabUnlockedAt('Chain Thunder', 15, 5000)).toBe(false)
    expect(isLabUnlockedAt('Chain Thunder', 17, 1)).toBe(true)
  })

  it('treats a lab with no requirement as always available', () => {
    expect(LAB_UNLOCKS['Health']).toBeUndefined()
    expect(isLabUnlockedAt('Health', 1, 0)).toBe(true)
  })

  it('does not hide the one lab gated on an ultimate weapon', () => {
    expect(LAB_UNLOCKS['Inner Land Mine - Chrono Jump']).toBe(UNLOCKED_BY_ULTIMATE)
    expect(isLabUnlockedAt('Inner Land Mine - Chrono Jump', 1, 0)).toBe(true)
  })
})
