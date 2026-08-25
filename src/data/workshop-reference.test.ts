import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import workshop from './workshop.json'

/**
 * Checks our workshop stat curves against the Effective Paths reference.
 *
 * The tab carries six of the forty-eight stats we ship, at every one of 6001
 * levels, which is the deepest single check in this set -- and the one most
 * worth having, since a workshop curve that drifts at level 4000 is invisible
 * to anyone not standing there.
 */

interface WorkshopReference {
  stats: Record<string, Array<number | null>>
}

const reference = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'fixtures', 'data', 'effective-paths-workshop.json'), 'utf8'),
) as WorkshopReference

const ourWorkshop = workshop as unknown as Record<string, Record<string, { value: number }>>

describe('workshop stats against the Effective Paths reference', () => {
  it('names stats we actually carry', () => {
    for (const stat of Object.keys(reference.stats)) {
      expect(ourWorkshop[stat], `workshop.json has no "${stat}"`).toBeDefined()
    }
  })

  it('agrees on every stat value at every level', () => {
    const mismatches: string[] = []
    let compared = 0

    for (const [stat, values] of Object.entries(reference.stats)) {
      const ours = ourWorkshop[stat]
      if (!ours) continue

      for (let level = 0; level < values.length; level += 1) {
        const theirs = values[level]
        if (theirs === null) continue
        const record = ours[String(level)]
        if (!record) continue
        const our = Number(record.value)
        if (!Number.isFinite(our)) continue
        compared += 1

        // The sheet quotes three significant figures (5.88E+00 for our 5.877),
        // so compare relatively. Zero is exact on both sides.
        if (theirs === 0 || our === 0) {
          if (theirs !== our) mismatches.push(`${stat} L${level}: ours=${our} reference=${theirs}`)
          continue
        }
        const drift = Math.abs(our - theirs) / Math.max(Math.abs(our), Math.abs(theirs))
        if (drift >= 0.005) {
          mismatches.push(`${stat} L${level}: ours=${our} reference=${theirs} (${(drift * 100).toFixed(2)}%)`)
        }
      }
    }

    // Report a handful rather than thousands if a whole curve shifts.
    expect(mismatches.slice(0, 10)).toEqual([])
    expect(mismatches).toHaveLength(0)
    // Not 6 x 6001: the stats cap at different levels. Damage, Health and
    // Health Regen run to 6000, Defense Absolute to 5000, Damage / Meter to
    // 200 and Lifesteal to 80, which is 23286 values.
    expect(compared).toBeGreaterThanOrEqual(23000)
  })

  it('caps each stat at the same level the reference does', () => {
    // Our level counts match the reference exactly for all six, which is worth
    // asserting on its own -- a curve that runs too far is as wrong as one that
    // carries bad values, and it would not show up as a mismatch above.
    for (const [stat, values] of Object.entries(reference.stats)) {
      const ours = ourWorkshop[stat]
      if (!ours) continue
      expect(Object.keys(ours), stat).toHaveLength(values.length)
    }
  })
})
