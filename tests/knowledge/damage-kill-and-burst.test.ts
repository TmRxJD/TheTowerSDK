import { describe, expect, it } from 'vitest'
import { GAME_KNOWLEDGE } from '../../src/knowledge'
import {
  DAMAGE_APPLICATION_WRITES,
  KILL_DROP_CALLS,
  KILL_REWARD_BONUS_CALLS,
} from '../../src/knowledge/compartments/enemies'
import { FIRE_BURST_SHOT_CAP } from '../../src/knowledge/compartments/tower'
import { COINS_PER_KILL_CHAIN } from '../../src/knowledge/compartments/economy'

const nodes = GAME_KNOWLEDGE.compartments.flatMap(c => c.nodes)
const claim = (id: string, predicate: string) =>
  nodes.find(n => n.id === id)?.assertions?.find(a => a.predicate === predicate)?.value

describe('the firing accumulator', () => {
  it('caps a burst rather than the accumulator', () => {
    expect(claim('tower.firingLoop', 'burstShotCap')).toBe(FIRE_BURST_SHOT_CAP)
    expect(FIRE_BURST_SHOT_CAP).toBe(1000)
  })

  it('records that the remainder carries', () => {
    expect(claim('tower.firingLoop', 'accumulatorRemainderCarries')).toBe(true)
    expect(claim('tower.firingLoop', 'intervalIsReciprocalOfAttackSpeed')).toBe(true)
  })
})

describe('damage application touches more than health', () => {
  it('can lower the enemy wave level', () => {
    expect(claim('enemy.damageAndKill', 'damageCanReduceWaveLevel')).toBe(true)
    expect(DAMAGE_APPLICATION_WRITES).toContain('enemyWaveHealthLevel')
  })

  it('tracks reductions per enemy, which is what makes them diminish', () => {
    expect(claim('enemy.damageAndKill', 'levelReductionsDiminish')).toBe(true)
    expect(DAMAGE_APPLICATION_WRITES).toContain('enemyWaveHealthLevelReductionsCount')
  })

  it('rewrites armour, so armour is not fixed at spawn', () => {
    expect(DAMAGE_APPLICATION_WRITES).toContain('enemyArmor')
    expect(DAMAGE_APPLICATION_WRITES).toContain('renderArmorMultiplier')
  })
})

describe('the kill payout', () => {
  /**
   * The mapped call list and the hand-read chain in the economy compartment are
   * two independent readings of one method. Holding them together is what makes
   * either trustworthy — and it already paid: the chain lists IntroSprintCoins,
   * which lives on `Main` and is absent from every Enemy-only listing.
   */
  it('agrees with the coin chain recorded in the economy compartment', () => {
    const chainFns = COINS_PER_KILL_CHAIN
      .filter(term => term.endsWith('()'))
      .map(term => term.replace('()', ''))
    const mapped = new Set(KILL_REWARD_BONUS_CALLS.map(call => call.split('.').pop()!))
    const missing = chainFns.filter(fn => !mapped.has(fn))
    expect(missing, `in the coin chain but not in the mapped calls:\n  ${missing.join('\n  ')}`)
      .toEqual([])
  })

  it('includes a bonus that lives on Main rather than Enemy', () => {
    expect(claim('enemy.damageAndKill', 'killBonusesOnMainRatherThanEnemy')).toBe(1)
    expect(KILL_REWARD_BONUS_CALLS).toContain('Main.IntroSprintCoins')
  })

  it('rolls every drop on kill, not at wave end', () => {
    expect(claim('enemy.damageAndKill', 'dropRollsOnKill')).toBe(KILL_DROP_CALLS.length)
    expect(KILL_DROP_CALLS.every(call => call.startsWith('ModuleManager.Try'))).toBe(true)
  })
})
