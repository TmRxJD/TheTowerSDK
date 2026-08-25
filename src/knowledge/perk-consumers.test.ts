import { describe, expect, it } from 'vitest'
import { GAME_KNOWLEDGE } from './index'
import { PERK_CONSUMER_METHODS, PERKS_APPLIED_TO_ENEMY_BASE } from './compartments/perks'
import { PERK_IMPORT_CATALOG, PERK_UW_INDICES } from '../save/catalogs/perks'

/**
 * The perk consumer map, checked against the catalog by NAME.
 *
 * An index scraped from the binary is indistinguishable from a loop counter
 * until something independent agrees with it. These tests are that something:
 * every consumer whose method names a specific system must reference a perk
 * whose catalog text names the same system.
 */

const name = (index: number) =>
  (PERK_IMPORT_CATALOG as readonly { index: number, name: string }[])
    .find(row => row.index === index)?.name ?? ''

const node = GAME_KNOWLEDGE.compartments
  .flatMap(c => c.nodes)
  .find(n => n.id === 'perk.consumers')!

describe('every consumed perk index resolves to a real perk', () => {
  it.each(Object.keys(PERK_CONSUMER_METHODS).map(Number))('perk %i is in the catalog', index => {
    expect(name(index), `perk ${index} missing from the catalog`).not.toBe('')
  })
})

describe('the consumer names match the perk text', () => {
  /**
   * The corroboration that makes this a reading rather than a guess. Each pair
   * is a method whose name states a system, and a perk whose text must mention
   * the same word.
   */
  const PAIRS: Array<[number, string, string]> = [
    [24, 'golden tower', 'goldentower'],
    [25, 'chain lightning', 'chainlightning'],
    [26, 'chrono field', 'chronofield'],
    [27, 'black hole', 'blackhole'],
    [28, 'spotlight', 'spotlight'],
    [22, 'death wave', 'deathwave'],
    [20, 'smart missiles', 'smartmissiles'],
    [12, 'game speed', 'gamemaxspeed'],
  ]

  it.each(PAIRS)('perk %i names %s and is read by a method naming %s', (index, perkWord, methodWord) => {
    expect(name(index).toLowerCase()).toContain(perkWord)
    expect(PERK_CONSUMER_METHODS[index].toLowerCase()).toContain(methodWord)
  })
})

describe('enemy-base perks are the enemy trade-offs', () => {
  it('every one names enemies or bosses', () => {
    for (const index of PERKS_APPLIED_TO_ENEMY_BASE) {
      const text = name(index).toLowerCase()
      expect(text, `perk ${index}: ${name(index)}`).toMatch(/enem|boss/)
    }
  })

  it('is read by an Enemy method, not a Main one', () => {
    for (const index of PERKS_APPLIED_TO_ENEMY_BASE) {
      expect(PERK_CONSUMER_METHODS[index]).toMatch(/^Enemy\./)
    }
  })

  it('does not overlap the ultimate weapon perks', () => {
    const uw = new Set<number>(PERK_UW_INDICES as readonly number[])
    const overlap = PERKS_APPLIED_TO_ENEMY_BASE.filter(i => uw.has(i))
    expect(overlap).toEqual([])
  })
})

describe('the ultimate weapon perks are read by their own weapon', () => {
  it('every UW-perk consumer is a Main getter for that weapon', () => {
    const uwConsumers = Object.entries(PERK_CONSUMER_METHODS)
      .filter(([index]) => (PERK_UW_INDICES as readonly number[]).includes(Number(index)))
    expect(uwConsumers.length).toBeGreaterThanOrEqual(7)
    for (const [, method] of uwConsumers) expect(method).toMatch(/^Main\.Get/)
  })

  it('records that there is no central perk loop', () => {
    const claim = node.assertions?.find(a => a.predicate === 'hasACentralPerkApplicationLoop')
    expect(claim?.value).toBe(false)
  })
})
