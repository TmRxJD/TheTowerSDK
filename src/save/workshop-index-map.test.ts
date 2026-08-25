import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WORKSHOP_IMPORT_CATALOG } from './catalogs/indexes'

/**
 * Workshop upgrades, held to the game's own index order.
 *
 * This catalog is the most consumed one in the package — every Effective Paths
 * model reads workshop levels through it — and until this file existed nothing
 * asserted its index mapping at all. The cost of that was a missing row:
 * defense carried 17 upgrades where the game writes 18, so a player's
 * **Wall Rebuild** levels were read by nothing and reported as absent.
 *
 * A level is fetched by `saveField` + `categoryIndex`
 * (`shared-tool-inputs-from-save-extended.ts`), so those two are what must
 * agree with the game. The global `index` is ordering only.
 */

const FIXTURE = join(
  __dirname, '..', '..', 'fixtures', 'data', 'save-format', 'workshop_save_format.json',
)

interface WorkshopFormat {
  upgradeIndices: Record<string, Record<string, string> | string>
}

const format = JSON.parse(readFileSync(FIXTURE, 'utf8')) as WorkshopFormat

/** The game's `{ Attack: { '0': 'Damage' } }`, minus the prose key. */
const categories = Object.entries(format.upgradeIndices)
  .filter((entry): entry is [string, Record<string, string>] =>
    entry[0] !== 'description' && typeof entry[1] === 'object')

/**
 * Names the two sides spell differently for the same upgrade.
 *
 * Tolerated because the lookup is by index, not by name, and the SDK spellings
 * are load-bearing elsewhere — the cost tables answer to them. Listed so a new
 * divergence is visible rather than absorbed.
 */
const ACCEPTED_NAME_DIFFERENCES = new Map<string, string>([
  ['attack:4', 'Attack Range'],
  ['attack:13', 'Super Crit Chance'],
  ['attack:14', 'Super Crit Mult'],
  ['utility:2', 'Coins / Kill Bonus'],
  ['utility:3', 'Coins / Wave'],
  ['utility:9', 'Max Recovery'],
])

const loose = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

describe('workshop upgrade indices', () => {
  it('reads the game categories', () => {
    expect(categories.map(([name]) => name)).toEqual(['Attack', 'Defense', 'Utility'])
  })

  it.each(categories)('%s has a row at every index the game writes', (category, entries) => {
    const key = category.toLowerCase()
    const rows = new Map(
      WORKSHOP_IMPORT_CATALOG
        .filter(row => row.category === key)
        .map(row => [row.categoryIndex, row]),
    )

    const missing: string[] = []
    const differing: string[] = []

    for (const [index, gameName] of Object.entries(entries)) {
      const row = rows.get(Number(index))
      if (!row) { missing.push(`${index}: ${gameName}`); continue }

      const accepted = ACCEPTED_NAME_DIFFERENCES.get(`${key}:${index}`)
      if (accepted === row.name) continue
      if (loose(row.name) !== loose(gameName)) {
        differing.push(`${index}: game="${gameName}" sdk="${row.name}"`)
      }
    }

    expect(missing, 'the game writes an upgrade this catalog has no row for').toEqual([])
    expect(differing, 'name differs at an index not on the accepted list').toEqual([])
  })

  it.each(categories)('%s has no row past the game’s last index', (category, entries) => {
    // The other direction: a row the game does not write would read a level
    // out of a slot that belongs to something else, or to nothing.
    const key = category.toLowerCase()
    const highest = Math.max(...Object.keys(entries).map(Number))
    const extra = WORKSHOP_IMPORT_CATALOG
      .filter(row => row.category === key && row.categoryIndex > highest)
      .map(row => `${row.categoryIndex}: ${row.name}`)

    expect(extra).toEqual([])
  })

  it('gives every row a save field and a unique slot', () => {
    for (const [category] of categories) {
      const key = category.toLowerCase()
      const rows = WORKSHOP_IMPORT_CATALOG.filter(row => row.category === key)
      const slots = rows.map(row => row.categoryIndex)

      expect(new Set(slots).size, `${key}: two rows claim one slot`).toBe(slots.length)
      for (const row of rows) expect(row.saveField, `${key}[${row.categoryIndex}]`).toBeTruthy()
    }
  })
})
