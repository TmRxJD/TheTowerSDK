import { describe, expect, it } from 'vitest'
import { WORKSHOP_DATA } from '../data/workshop-table'
import { TOWER_STAT_RECOMPUTE_ORDER } from '../data/tower-stat-recompute-order'
import {
  GAME_STATS_WITHOUT_WORKSHOP_UPGRADE,
  WORKSHOP_UPGRADE_TO_GAME_STAT,
  WORKSHOP_UPGRADES_WITHOUT_GETTER,
} from './compartments/workshop'

const UPGRADES = Object.keys(WORKSHOP_DATA)
const GETTERS: readonly string[] = TOWER_STAT_RECOMPUTE_ORDER
const norm = (s: string): string => s.replace(/[^a-z]/gi, '').toLowerCase()
const BY_NORM = new Map(GETTERS.map(g => [norm(g), g]))

/** The naive join a tool would write: lowercase and strip punctuation. */
const naiveJoin = (upgrade: string): string | undefined => BY_NORM.get(norm(upgrade))

describe('the workshop-to-getter join is total and accounted for', () => {
  it('classifies every upgrade exactly once', () => {
    for (const upgrade of UPGRADES) {
      const buckets = [
        naiveJoin(upgrade) !== undefined,
        upgrade in WORKSHOP_UPGRADE_TO_GAME_STAT,
        (WORKSHOP_UPGRADES_WITHOUT_GETTER as readonly string[]).includes(upgrade),
      ].filter(Boolean)
      expect(buckets, `${upgrade} should be in exactly one bucket`).toHaveLength(1)
    }
  })

  it('classifies every getter exactly once', () => {
    const mapped = new Set(Object.values(WORKSHOP_UPGRADE_TO_GAME_STAT))
    for (const getter of GETTERS) {
      const buckets = [
        UPGRADES.some(u => naiveJoin(u) === getter),
        mapped.has(getter as never),
        (GAME_STATS_WITHOUT_WORKSHOP_UPGRADE as readonly string[]).includes(getter),
      ].filter(Boolean)
      expect(buckets, `${getter} should be in exactly one bucket`).toHaveLength(1)
    }
  })
})

describe('the naive join is the trap, not the solution', () => {
  it('leaves the mapped upgrades unresolved', () => {
    for (const upgrade of Object.keys(WORKSHOP_UPGRADE_TO_GAME_STAT)) {
      expect(naiveJoin(upgrade), `${upgrade} should NOT resolve naively`).toBeUndefined()
    }
  })

  it('still covers most of the table, which is why it ships', () => {
    const resolved = UPGRADES.filter(u => naiveJoin(u) !== undefined)
    expect(resolved.length / UPGRADES.length).toBeGreaterThan(0.6)
    expect(resolved.length).toBeLessThan(UPGRADES.length)
  })

  it('maps each upgrade onto a getter that really exists', () => {
    for (const [upgrade, getter] of Object.entries(WORKSHOP_UPGRADE_TO_GAME_STAT)) {
      expect(UPGRADES, upgrade).toContain(upgrade)
      expect(GETTERS, getter).toContain(getter)
    }
  })

  it('fails in three distinct ways, so one rule cannot fix it', () => {
    const entries = Object.entries(WORKSHOP_UPGRADE_TO_GAME_STAT)
    const slash = entries.filter(([u]) => u.includes('/'))
    const abbreviated = entries.filter(([u, g]) => !u.includes('/') && norm(g).startsWith(norm(u).slice(0, 5)))
    const renamed = entries.filter(([u, g]) => !u.includes('/') && !norm(g).includes(norm(u)))
    expect(slash.length).toBeGreaterThan(0)
    expect(abbreviated.length).toBeGreaterThan(0)
    expect(renamed.length).toBeGreaterThan(0)
  })
})

describe('the ends of the join', () => {
  it('has no getter named Damage at all', () => {
    expect(GETTERS.map(norm)).not.toContain('damage')
    expect(WORKSHOP_UPGRADES_WITHOUT_GETTER).toContain('Damage')
  })

  it('leaves EquippedArmorBenefit unreachable from the workshop', () => {
    expect(GETTERS).toContain('EquippedArmorBenefit')
    expect(UPGRADES.some(u => naiveJoin(u) === 'EquippedArmorBenefit')).toBe(false)
    expect(Object.values(WORKSHOP_UPGRADE_TO_GAME_STAT)).not.toContain('EquippedArmorBenefit')
  })
})
