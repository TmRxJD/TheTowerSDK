import { describe, expect, it } from 'vitest'
import { GAME_KNOWLEDGE } from '../../src/knowledge'
import {
  BASIC_ULTIMATE_SPAWN_CHANCES,
  BATTLE_CONDITION_MODIFIER_SLOTS,
} from '../../src/knowledge/compartments/enemies'

/**
 * Spawn composition, and the one fact that limits what a simulation can claim.
 *
 * Elite chances are not compiled into the binary — `MiniBossController` fetches
 * them from Firebase Remote Config and parses JSON. So a simulator can be exact
 * about wave scaling and the firing loop while being only as current as its
 * last config fetch about which elites appear.
 */

const node = GAME_KNOWLEDGE.compartments
  .flatMap(c => c.nodes)
  .find(n => n.id === 'enemy.spawnComposition')!
const claim = (predicate: string) =>
  node.assertions?.find(a => a.predicate === predicate)?.value

describe('spawn composition is recorded with its limits', () => {
  it('exists and is game-sourced', () => {
    expect(node).toBeDefined()
    expect(node.sources.some(s => s.origin === 'game')).toBe(true)
  })

  it('says plainly that elite chances are not in the binary', () => {
    expect(claim('eliteChancesAreRemoteConfigured')).toBe(true)
    expect(node.traps?.some(t => t.includes('NOT IN THE BINARY'))).toBe(true)
  })

  it('records that mini-boss spawns are seeded, so a run is reproducible', () => {
    expect(claim('miniBossSpawnsAreSeeded')).toBe(true)
  })

  it('carries the binary spawn chances that DO exist', () => {
    expect(claim('basicUltimateSpawnChanceCount')).toBe(BASIC_ULTIMATE_SPAWN_CHANCES.length)
    expect(claim('lowestBasicUltimateChance')).toBe(0.01)
    expect(claim('highestBasicUltimateChance')).toBe(0.1)
  })

  /**
   * Accessors outnumber slots because 212 is read by two of them. Asserting
   * both numbers is what makes the overlap visible — counting accessors to
   * count conditions overcounts, and nothing else in the graph would say so.
   */
  it('distinguishes accessor count from distinct battle-condition slots', () => {
    const accessors = Object.keys(BATTLE_CONDITION_MODIFIER_SLOTS).length
    const slots = new Set(Object.values(BATTLE_CONDITION_MODIFIER_SLOTS)).size
    expect(claim('battleConditionAccessorCount')).toBe(accessors)
    expect(claim('distinctBattleConditionSlots')).toBe(slots)
    expect(accessors).toBeGreaterThan(slots)
  })

  it('names the two accessors that share slot 212', () => {
    const sharing = Object.entries(BATTLE_CONDITION_MODIFIER_SLOTS)
      .filter(([, slot]) => slot === 212)
      .map(([name]) => name)
      .sort()
    expect(sharing).toEqual(['GetBossesUltimateDuration', 'GetUltimateBossModifier'])
  })

  it('keeps the slot indices contiguous, so a gap would be a missed accessor', () => {
    const slots = [...new Set(Object.values(BATTLE_CONDITION_MODIFIER_SLOTS))].sort((a, b) => a - b)
    expect(slots[0]).toBe(207)
    expect(slots[slots.length - 1]).toBe(219)
    for (let i = 1; i < slots.length; i += 1) expect(slots[i] - slots[i - 1]).toBe(1)
  })
})
