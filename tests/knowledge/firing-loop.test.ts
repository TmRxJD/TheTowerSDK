import { describe, expect, it } from 'vitest'
import { GAME_KNOWLEDGE } from '../../src/knowledge'
import {
  COOLDOWN_FIELD_SHAPES,
  RAPID_FIRE_FIELDS,
  TOWER_FIRING_INPUT_FIELDS,
} from '../../src/knowledge/compartments/tower'
import { ULTIMATE_WEAPONS_WITHOUT_COOLDOWN } from '../../src/knowledge/compartments/ultimate-weapons'

/**
 * The firing loop's fields, and the distinctions a simulation loses if it
 * flattens them.
 */

const node = GAME_KNOWLEDGE.compartments
  .flatMap(c => c.nodes)
  .find(n => n.id === 'tower.firingLoop')!
const claim = (predicate: string) =>
  node.assertions?.find(a => a.predicate === predicate)?.value

describe('firing rate is a pair, not a single stat', () => {
  it('reads attackSpeed and attackSpeedReducer together', () => {
    expect(TOWER_FIRING_INPUT_FIELDS).toContain('attackSpeed')
    expect(TOWER_FIRING_INPUT_FIELDS).toContain('attackSpeedReducer')
  })

  it('accumulates rather than scheduling a next-fire time', () => {
    expect(claim('firingIsAccumulated')).toBe(true)
    expect(Object.keys(COOLDOWN_FIELD_SHAPES)).toContain('accumulatedFireTime')
    // There is no nextFireTime field to fall back on.
    expect(Object.keys(COOLDOWN_FIELD_SHAPES).some(f => /nextFire/i.test(f))).toBe(false)
  })
})

describe('rapid fire is a window of absolute times', () => {
  it('carries both a start and an end, not a remaining duration', () => {
    expect(RAPID_FIRE_FIELDS).toContain('rapidFireStartTime')
    expect(RAPID_FIRE_FIELDS).toContain('rapidFireEndTime')
    expect(claim('rapidFireWindowIsAbsoluteTimes')).toBe(true)
  })

  it('is five fields, so a single "rapid fire" value cannot express it', () => {
    expect(claim('rapidFireFieldCount')).toBe(RAPID_FIRE_FIELDS.length)
    expect(RAPID_FIRE_FIELDS.length).toBe(5)
    expect(new Set(RAPID_FIRE_FIELDS).size).toBe(RAPID_FIRE_FIELDS.length)
  })
})

describe('cooldowns come in three shapes', () => {
  it('a weapon and its UW+ ability do not share one', () => {
    expect(COOLDOWN_FIELD_SHAPES.ultimateWeaponCooldown).toBe('double[]')
    expect(COOLDOWN_FIELD_SHAPES.ultimateWeaponPlusCooldown).toBe('double[]')
    expect(claim('ultimateWeaponAndPlusCooldownsAreSeparate')).toBe(true)
  })

  it('includes boolean-only cooldowns that record no remaining time', () => {
    const bools = Object.entries(COOLDOWN_FIELD_SHAPES)
      .filter(([, shape]) => shape === 'bool')
      .map(([field]) => field)
    expect(claim('booleanOnlyCooldowns')).toBe(bools.length)
    expect(bools.length).toBeGreaterThan(0)
    // Named, so a uniform "seconds remaining" model is visibly wrong for these.
    expect(bools.sort()).toEqual([
      'demonModeOffCooldown', 'missileBarrageOffCooldown', 'nukeOffCooldown',
    ])
  })

  it('has more than one shape, or the trap would be vacuous', () => {
    expect(claim('distinctCooldownShapes')).toBe(new Set(Object.values(COOLDOWN_FIELD_SHAPES)).size)
    expect(new Set(Object.values(COOLDOWN_FIELD_SHAPES)).size).toBeGreaterThanOrEqual(3)
  })
})

describe('the cooldown array agrees with the weapon compartment', () => {
  /**
   * Two weapons have no Cooldown STAT, which is a different claim from having
   * no cooldown FIELD: the array is indexed by weapon regardless. Holding both
   * facts together stops one being read as the other.
   */
  it('records weapons without a cooldown stat without denying the array', () => {
    expect(ULTIMATE_WEAPONS_WITHOUT_COOLDOWN.length).toBe(2)
    expect(COOLDOWN_FIELD_SHAPES.ultimateWeaponCooldown).toBe('double[]')
  })
})
