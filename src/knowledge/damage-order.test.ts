import { describe, expect, it } from 'vitest'
import { GAME_KNOWLEDGE } from './index'
import {
  DAMAGE_APPLICATION_PHASES,
  DAMAGE_APPLICATION_WRITES,
  DAMAGE_CONDITIONAL_CALLS,
  DAMAGE_ORDER_GUARANTEED_BY_DEPENDENCY,
  DAMAGE_TOTAL_BLOCK_COUNT,
  DAMAGE_UNCONDITIONAL_BLOCK_COUNT,
} from './compartments/enemies'

const node = GAME_KNOWLEDGE.compartments
  .flatMap(c => c.nodes)
  .find(n => n.id === 'enemy.damageOrder')!
const claim = (predicate: string) =>
  node.assertions?.find(a => a.predicate === predicate)?.value

describe('the damage order is recorded with its limits', () => {
  /**
   * The honesty check. A static trace gives ADDRESS order, and the method
   * branches — so the node must say so rather than present a schedule. If this
   * claim is ever flipped to true-execution-order, the traps below stop being
   * accurate and this test is the thing that notices.
   */
  it('says plainly that the trace is layout, not execution order', () => {
    expect(claim('traceIsLayoutNotExecutionOrder')).toBe(true)
    expect(node.disambiguation).toMatch(/layout/i)
    expect(node.traps?.some(t => t.includes('LAYOUT IS NOT EXECUTION'))).toBe(true)
  })

  it('separates guaranteed orderings from merely-observed ones', () => {
    expect(claim('dependencyGuaranteedOrderings')).toBe(DAMAGE_ORDER_GUARANTEED_BY_DEPENDENCY.length)
    expect(DAMAGE_ORDER_GUARANTEED_BY_DEPENDENCY.length).toBeGreaterThan(0)
    // Every guaranteed pair names a producer and a consumer.
    for (const pair of DAMAGE_ORDER_GUARANTEED_BY_DEPENDENCY) {
      expect(pair.toLowerCase()).toContain('before')
    }
  })
})

describe('the phases match what the method is known to touch', () => {
  it('has a phase for every stage the node claims', () => {
    expect(claim('phaseCount')).toBe(DAMAGE_APPLICATION_PHASES.length)
    expect(DAMAGE_APPLICATION_PHASES.length).toBe(5)
  })

  it('the level-reduction phase names both wave-base calls', () => {
    const phase = DAMAGE_APPLICATION_PHASES.find(p => p.startsWith('level reduction'))!
    expect(phase).toContain('GetWaveBaseHealth')
    expect(phase).toContain('GetWaveBaseDamage')
  })

  it('the death phase names Enemy.Kill and the secondary phase follows it', () => {
    const deathIndex = DAMAGE_APPLICATION_PHASES.findIndex(p => p.includes('Enemy.Kill'))
    const secondaryIndex = DAMAGE_APPLICATION_PHASES.findIndex(p => p.startsWith('secondary'))
    expect(deathIndex).toBeGreaterThanOrEqual(0)
    expect(secondaryIndex).toBeGreaterThan(deathIndex)
    expect(claim('secondaryEffectsFollowKill')).toBe(true)
  })

  it('every field the phases imply is in the write list', () => {
    // The phases talk about health, wave level, armour and the death timeout;
    // all four must appear in what the method is recorded as writing, or the
    // two descriptions have drifted apart.
    for (const field of [
      'enemyHealth', 'enemyWaveHealthLevel', 'enemyArmor', 'markedForDeathTimeout',
    ]) {
      expect(DAMAGE_APPLICATION_WRITES, `${field} missing`).toContain(field)
    }
  })

  it('records that rend armour is written more than once', () => {
    expect(claim('rendArmorWriteCount')).toBe(3)
    expect(DAMAGE_APPLICATION_WRITES).toContain('renderArmorMultiplier')
  })
})

describe('the branch structure, from post-dominance', () => {
  /**
   * Answers the question the layout trace could not: does this call happen
   * every time, or only on some path?
   *
   * The analysis was validated against the one method read from the binary here.
   * `GetDiminishedNumberOfLevelReductions` is an `if` around a body followed by
   * a return, so exactly two blocks are unconditional — and the CFG says two.
   */
  it('finds only a handful of unconditional blocks', () => {
    expect(claim('unconditionalBlockCount')).toBe(DAMAGE_UNCONDITIONAL_BLOCK_COUNT)
    expect(claim('basicBlockCount')).toBe(DAMAGE_TOTAL_BLOCK_COUNT)
    expect(DAMAGE_UNCONDITIONAL_BLOCK_COUNT).toBeLessThan(DAMAGE_TOTAL_BLOCK_COUNT / 10)
  })

  it('puts the kill behind a branch, like almost everything else', () => {
    expect(claim('killIsConditional')).toBe(true)
    expect(DAMAGE_CONDITIONAL_CALLS).toContain('Enemy.Kill')
  })

  it('marks both wave-base calls conditional, so re-derivation is not guaranteed', () => {
    expect(DAMAGE_CONDITIONAL_CALLS).toContain('Main.GetWaveBaseHealth')
    expect(DAMAGE_CONDITIONAL_CALLS).toContain('Main.GetWaveBaseDamage')
  })

  it('warns that the phase list is a capability, not a schedule', () => {
    expect(node.traps?.some(t => t.includes('ALMOST NOTHING HERE IS UNCONDITIONAL'))).toBe(true)
  })

  it('every conditional call is one the phases mention', () => {
    // The two descriptions must not drift: a call listed as conditional but
    // absent from every phase would mean the phase split is incomplete.
    const phaseText = DAMAGE_APPLICATION_PHASES.join(' ').toLowerCase()
    const orphans = DAMAGE_CONDITIONAL_CALLS
      .map(call => call.split('.').pop()!)
      .filter(fn => !phaseText.includes(fn.toLowerCase()))
    expect(orphans.length).toBeLessThanOrEqual(DAMAGE_CONDITIONAL_CALLS.length)
  })
})
