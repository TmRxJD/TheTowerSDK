import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SITE_LAB_SLUG_ALIASES } from './labs-categories'
import { generatedLabs } from './labs-levels'
import { labs as staticLabs } from './labs-static'

/**
 * Checks our lab cost and duration tables against an independent authority.
 *
 * The reference is the DVT_Laboratory tab of the community Effective Paths
 * spreadsheet, pinned under fixtures/ and refreshed by
 * `node scripts/refresh-lab-reference.mjs`. Its author gets the numbers from
 * the developers, so it is the best cross-check available without re-extracting
 * the game -- and it earns its keep: it caught 25 corrupted levels in
 * super_tower_bonus, where our table dropped from 4.07e9 at L3 to 1.03e9 at L4.
 *
 * The reference is not the source. Nothing here is generated from it. When it
 * disagrees with us the answer is to look, not to copy.
 */

interface ReferenceLevel {
  level: number
  durationSeconds: number | null
  cost: number | null
}
interface ReferenceLab {
  name: string
  levels: ReferenceLevel[]
}

const reference = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'effective-paths-labs.json'), 'utf8'),
) as { labs: ReferenceLab[] }

/** Ignores case, separators and punctuation: `a_b_c` and "A B - C" are the same lab. */
const matchKey = (value: string): string => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '')

/**
 * labs-static stores costs pre-scaled with a currency suffix (`cost: 1.1` with
 * `currency: 'q'` is 1.1 quadrillion) while labs-levels stores absolute coins.
 * The reference is absolute, so scale before comparing.
 */
const CURRENCY_SCALE: Record<string, number> = { B: 1e9, T: 1e12, q: 1e15, Q: 1e18 }

/** "27:46:00" -> seconds. Hours are unbounded, not 0-23. "0s" is a level-0 placeholder. */
function toSeconds(value: string | number | undefined): number | null {
  const raw = String(value ?? '').trim()
  if (!raw || raw === '0s') return null
  const parts = raw.split(':')
  if (parts.length !== 3) return null
  const seconds = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])
  return Number.isFinite(seconds) ? Math.round(seconds) : null
}

interface NormalizedLab {
  name: string
  source: 'generated' | 'static'
  levels: Array<{ level: number; cost: number; seconds: number | null }>
}

const ourLabs: NormalizedLab[] = [
  ...generatedLabs.filter(lab => lab.levels?.length).map(lab => ({
    name: lab.name,
    source: 'generated' as const,
    levels: (lab.levels ?? []).map(level => ({
      level: Number(level.level),
      cost: Number(level.cost ?? Number.NaN),
      seconds: toSeconds(level.duration),
    })),
  })),
  ...staticLabs.filter(lab => lab.levels?.length).map(lab => ({
    name: lab.name,
    source: 'static' as const,
    // Level 0 is a baseline row with no purchase; the reference starts at 1.
    levels: lab.levels.filter(level => Number(level.level) >= 1).map(level => ({
      level: Number(level.level),
      cost: Number(level.cost ?? Number.NaN) * (CURRENCY_SCALE[lab.currency ?? ''] ?? 1),
      seconds: toSeconds(level.time),
    })),
  })),
]

const referenceByKey = new Map(reference.labs.map(lab => [matchKey(lab.name), lab]))
const canonicalByAlias = new Map(
  Object.entries(SITE_LAB_SLUG_ALIASES).map(([site, canonical]) => [matchKey(site), canonical]),
)

function referenceFor(name: string): ReferenceLab | undefined {
  const direct = referenceByKey.get(matchKey(name))
  if (direct) return direct
  const canonical = canonicalByAlias.get(matchKey(name))
  return canonical ? referenceByKey.get(matchKey(canonical)) : undefined
}

/**
 * The sheet carries three significant figures (3.38e18 where we have
 * 3.375e18), so exact equality would fail on rounding alone. Half a percent
 * admits that and nothing else: the super_tower_bonus errors were 5x.
 */
const TOLERANCE = 0.005
function agrees(ours: number, theirs: number): boolean {
  if (ours === theirs) return true
  if (!Number.isFinite(ours) || !Number.isFinite(theirs)) return false
  if (ours === 0 || theirs === 0) return false
  return Math.abs(ours - theirs) / Math.max(Math.abs(ours), Math.abs(theirs)) < TOLERANCE
}

describe('lab tables against the Effective Paths reference', () => {
  it('agrees on every cost the reference also has', () => {
    const mismatches: string[] = []
    for (const lab of ourLabs) {
      const ref = referenceFor(lab.name)
      if (!ref) continue
      const refByLevel = new Map(ref.levels.map(level => [level.level, level]))
      for (const level of lab.levels) {
        const theirs = refByLevel.get(level.level)
        if (!theirs || theirs.cost === null || !Number.isFinite(level.cost)) continue
        if (!agrees(level.cost, theirs.cost)) {
          mismatches.push(`${lab.name} L${level.level}: ours=${level.cost} reference=${theirs.cost}`)
        }
      }
    }
    expect(mismatches).toEqual([])
  })

  it('agrees on every duration the reference also has', () => {
    const mismatches: string[] = []
    for (const lab of ourLabs) {
      const ref = referenceFor(lab.name)
      if (!ref) continue
      const refByLevel = new Map(ref.levels.map(level => [level.level, level]))
      for (const level of lab.levels) {
        const theirs = refByLevel.get(level.level)
        if (!theirs || theirs.durationSeconds === null || level.seconds === null) continue
        if (!agrees(level.seconds, theirs.durationSeconds)) {
          mismatches.push(`${lab.name} L${level.level}: ours=${level.seconds}s reference=${theirs.durationSeconds}s`)
        }
      }
    }
    expect(mismatches).toEqual([])
  })

  it('covers most of the catalog, so the check is not vacuous', () => {
    const matched = ourLabs.filter(lab => referenceFor(lab.name)).length
    // 188 of 221 today. The unmatched remainder is mostly the 31 per-card
    // masteries, which the sheet models as a single shared "Card Mastery" row.
    expect(matched).toBeGreaterThanOrEqual(185)
  })

  it('never lets a lab get cheaper as it levels', () => {
    // Independent of the reference, and how the super_tower_bonus corruption
    // was pinned down: a cost that falls is always wrong.
    //
    // The single exception is a datum neither source can settle. Super Tower
    // Bonus grows by a steady x1.31-1.37 per level, except L7, which falls to
    // x0.889 and is followed by an over-correcting x1.522 -- drop L7 and the
    // curve is smooth. Our table and the reference carry the identical
    // 8230000000 there, so they are not independent on it and neither can say
    // what the real value is. Recorded exactly rather than guessed: if the
    // sheet ever corrects it, this assertion fails and we adopt the fix.
    const KNOWN_BAD = ['super_tower_bonus: L6=9260000000 -> L7=8230000000']
    const drops: string[] = []
    for (const lab of ourLabs) {
      const levels = [...lab.levels].sort((left, right) => left.level - right.level)
      for (let index = 1; index < levels.length; index += 1) {
        const previous = levels[index - 1]
        const current = levels[index]
        if (!Number.isFinite(previous.cost) || !Number.isFinite(current.cost)) continue
        if (current.cost < previous.cost) {
          drops.push(`${lab.name}: L${previous.level}=${previous.cost} -> L${current.level}=${current.cost}`)
        }
      }
    }
    expect(drops).toEqual(KNOWN_BAD)
  })
})
