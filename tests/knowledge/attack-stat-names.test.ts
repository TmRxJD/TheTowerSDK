import { describe, expect, it } from 'vitest'
import { TOWER_STAT_RECOMPUTE_ORDER } from '../../src/data/player-stats/recompute-order'
import { WORKSHOP_DATA } from '../../src/data/workshop/table'
import {
  ATTACK_BLOCK_LAST_INDEX,
  ATTACK_ENTRIES_NOT_TOWER_STATS,
  ATTACK_KNOWLEDGE_NODES,
  ATTACK_STAT_GAME_NAMES,
  ATTACK_STAT_NAME_DISAGREEMENTS,
  ATTACK_STAT_RECOMPUTE_INDEX,
} from '../../src/knowledge/compartments/attack'

const ORDER: readonly string[] = TOWER_STAT_RECOMPUTE_ORDER

describe('attack stats against the game enumeration', () => {
  it('resolves every getter the compartment names', () => {
    for (const [mechanic, getters] of Object.entries(ATTACK_STAT_GAME_NAMES)) {
      for (const getter of getters) {
        expect(ORDER, `${mechanic} -> ${getter}`).toContain(getter)
        expect(ATTACK_STAT_RECOMPUTE_INDEX[getter]).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('puts every attack getter in the leading block', () => {
    for (const getter of Object.values(ATTACK_STAT_GAME_NAMES).flat()) {
      expect(ORDER.indexOf(getter), getter).toBeLessThanOrEqual(ATTACK_BLOCK_LAST_INDEX)
    }
    // And the block genuinely ends there — the next entry is not an attack stat.
    expect(ORDER[ATTACK_BLOCK_LAST_INDEX + 1]).toBe('HealthBoost')
  })

  it('gives four of the five mechanics more than one getter', () => {
    const multi = Object.values(ATTACK_STAT_GAME_NAMES).filter(g => g.length > 1)
    expect(multi).toHaveLength(4)
  })
})

describe('the one name the wiki and the game disagree on', () => {
  it('is Damage per Meter, and the display name resolves to nothing', () => {
    expect(Object.keys(ATTACK_STAT_NAME_DISAGREEMENTS)).toEqual(['Damage per Meter'])
    for (const display of Object.keys(ATTACK_STAT_NAME_DISAGREEMENTS)) {
      expect(ORDER, display).not.toContain(display)
      expect(ORDER, display).not.toContain(display.replace(/\s+/g, ''))
    }
  })

  it('resolves under the game name', () => {
    for (const gameName of Object.values(ATTACK_STAT_NAME_DISAGREEMENTS)) {
      expect(ORDER).toContain(gameName)
    }
  })

  it('is the ONLY disagreement — the other mechanics match by construction', () => {
    const matching = Object.entries(ATTACK_STAT_GAME_NAMES)
      .filter(([mechanic, getters]) =>
        getters.some(g => g.toLowerCase().startsWith(mechanic.toLowerCase().slice(0, 5))))
    expect(matching).toHaveLength(Object.keys(ATTACK_STAT_GAME_NAMES).length - 1)
  })
})

describe('slow aura is not a tower stat', () => {
  it('appears in no entry of the enumeration, under any spelling', () => {
    for (const stat of ORDER) {
      expect(stat.toLowerCase(), stat).not.toContain('slow')
      expect(stat.toLowerCase(), stat).not.toContain('aura')
    }
  })

  it('is recorded as an entry that is not a tower stat', () => {
    expect(ATTACK_ENTRIES_NOT_TOWER_STATS).toEqual(['slowAura'])
    // And it really is a node in this compartment, so the exclusion is meaningful.
    expect(ATTACK_KNOWLEDGE_NODES.map(n => n.id)).toContain('slowAura')
  })

  it('is absent from the workshop table too, unlike the real attack stats', () => {
    const workshopNames = Object.keys(WORKSHOP_DATA).map(n => n.toLowerCase())
    expect(workshopNames.some(n => n.includes('slow aura'))).toBe(false)
  })
})
