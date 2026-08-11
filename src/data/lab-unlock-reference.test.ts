import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MILESTONE_KEY_UNLOCK_ROWS } from './milestones'

/**
 * Checks which tier and wave unlocks each lab against the Effective Paths
 * reference.
 *
 * Our equivalent is MILESTONE_KEY_UNLOCK_ROWS, NOT labs-research's
 * `tierUnlock` / `milestoneUnlock`. Those two are raw indices out of the game
 * dump that read like a tier and a wave and are neither: Workshop Attack
 * Discount carries milestoneUnlock 3 where the wave is 40, because 3 indexes a
 * milestone row. Comparing them against the sheet produced 192 "mismatches"
 * that were nothing of the kind.
 */

interface UnlockReference {
  unlocks: Array<{ name: string; tier: number; wave: number }>
}

const reference = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'effective-paths-lab-unlocks.json'), 'utf8'),
) as UnlockReference

/**
 * Our milestone rewards use a third lab vocabulary, distinct from both the
 * research catalog slugs and the labs-static display names -- "Orb Speed" for
 * "Orbs Speed", "Super Crit Multiplier" for "Super Crit Multi", "Missile
 * Explosion" for "Missiles Explosion". Fold the plural and that one suffix so
 * the comparison is about tiers and waves rather than spelling.
 */
const matchKey = (value: string): string => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '')
  .replace(/multiplier$/, 'multi')
  .replace(/s$/, '')

/** A reward can appear on both tracks and at more than one tier, so keep them all. */
const oursByReward = new Map<string, Array<{ tier: number; wave: number; track: string }>>()
for (const row of MILESTONE_KEY_UNLOCK_ROWS) {
  if (row.kind !== 'unlock') continue
  const key = matchKey(row.reward)
  if (!oursByReward.has(key)) oursByReward.set(key, [])
  oursByReward.get(key)!.push({ tier: row.tier, wave: row.wave, track: row.track })
}

/**
 * Labs where we and the reference disagree on tier or wave.
 *
 * Not treated as defects to fix, because the sheet lists one tier per lab while
 * our rows carry a track -- Land Mine Decay is ours on *premium* -- so the
 * sheet may simply be describing the standard track. Recorded exactly so the
 * set cannot grow unnoticed and so a future answer has something to check
 * against. Changing milestone tiers moves rewards in a user-facing tracker, so
 * it wants better evidence than "the sheet says otherwise".
 */
const KNOWN_DISAGREEMENTS = [
  'Flame Bot - Burn Stack: reference=T10 W60, ours=T10 W50 [standard]',
  'Land Mine Decay: reference=T6 W30, ours=T4 W30 [premium]',
  'Max Interest: reference=T2 W80, ours=T1 W80 [standard]',
  'Swamp Rend - Additional Enemies: reference=T16 W60, ours=T16 W50 [standard]',
  'Thunder Bot - Linger Time: reference=T10 W60, ours=T10 W50 [standard]',
  'Wall Rebuild: reference=T8 W10, ours=T7 W10 [standard]',
]

describe('lab unlocks against the Effective Paths reference', () => {
  it('agrees on tier and wave for every lab it shares, bar the recorded few', () => {
    const disagreements: string[] = []
    let matched = 0

    for (const entry of reference.unlocks) {
      const ours = oursByReward.get(matchKey(entry.name))
      if (!ours) continue
      if (ours.some(row => row.tier === entry.tier && row.wave === entry.wave)) {
        matched += 1
        continue
      }
      const describe = ours.map(row => `T${row.tier} W${row.wave} [${row.track}]`).join(' / ')
      disagreements.push(`${entry.name}: reference=T${entry.tier} W${entry.wave}, ours=${describe}`)
    }

    expect(disagreements.sort()).toEqual(KNOWN_DISAGREEMENTS)
    expect(matched).toBeGreaterThanOrEqual(85)
  })

  it('records how much of the reference our milestone rows cover', () => {
    // 203 labs in the reference against 140 rewards in our milestone rows, and
    // the shortfall is real: Dissonant Echo, the Enhancement coin discounts and
    // the Death Wave labs have no milestone entry at all. Ratchet this up as
    // they are filled in; a drop means rows were lost.
    const covered = reference.unlocks.filter(entry => oursByReward.has(matchKey(entry.name))).length
    expect(covered).toBeGreaterThanOrEqual(94)
    expect(reference.unlocks.length).toBeGreaterThanOrEqual(203)
  })
})
