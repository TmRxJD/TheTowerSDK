import { describe, expect, it } from 'vitest'
import {
  EFFECTIVE_DAMAGE_UPGRADES,
  planEffectiveDamagePath,
} from './effective-paths-edamage-plan'
import type { EffectiveDamagePlanVariant } from './effective-paths-edamage-plan'
import { EFFECTIVE_DAMAGE_CANDIDATES } from './effective-paths-edamage-candidates'
import { ZERO_EFFECTIVE_DAMAGE_LEVELS } from './effective-paths-edamage-levels'
import type { EffectiveDamageLevels } from './effective-paths-edamage-levels'
import { zeroEffectiveDamageConfig } from './effective-paths-edamage-config'
import type { EffectiveDamageConfig } from './effective-paths-edamage-config'

/**
 * The eDamage planner.
 *
 * The load-bearing assumption is the positional pairing between each matrix
 * and its level interface — get it wrong and every path silently optimises the
 * wrong stat. So that is asserted first, name by name, before anything else.
 */

const VARIANTS: readonly EffectiveDamagePlanVariant[] = [
  'lab-time', 'lab-coins', 'stone', 'coin', 'keys',
]

/** A player far enough along that most candidates are live. */
function developedConfig(): EffectiveDamageConfig {
  const zero = zeroEffectiveDamageConfig()
  return {
    ...zero,
    runType: 'Regular',
    gameSpeed: 5,
    waveDurationSeconds: 35,
    enemySpawnsPerSecond: 4,
    ultimateWeaponAdditionalDamage: 1,
    towerDamageBase: 3,
    criticalFactorBase: 1.2,
    superCritMultiBase: 1.2,
    spotlightQuantity: 1,
    modules: {
      ...zero.modules,
      cannon: { ...zero.modules.cannon, primaryBonus: 1.5, hasAssist: true, assistBonus: 1.4 },
      core: { ...zero.modules.core, primaryBonus: 1.6, hasAssist: true, assistBonus: 1.3 },
    },
    ultimateWeapons: {
      ...zero.ultimateWeapons,
      'Death Wave': { unlocked: true, damage: 2, quantity: 1, cooldown: 300, plus: null },
      'Chain Lightning': { unlocked: true, damage: 2, quantity: 1, cooldown: 0.05, plus: null },
      'Smart Missiles': { unlocked: true, damage: 10, quantity: 5, cooldown: 180, plus: null },
      'Spotlight': { unlocked: true, damage: 8, quantity: 30, cooldown: 1, plus: null },
      'Poison Swamp': { unlocked: true, damage: 10, quantity: 30, cooldown: 125, plus: null },
      'Inner Land Mines': { unlocked: true, damage: 10, quantity: 3, cooldown: 200, plus: null },
      'Chrono Field': { unlocked: true, damage: 5, quantity: 0.2, cooldown: 180, plus: null },
    },
  }
}

/** Levels high enough that the coin path's module candidates are in range. */
function developedLevels(): EffectiveDamageLevels {
  const base = ZERO_EFFECTIVE_DAMAGE_LEVELS
  return {
    ...base,
    coin: {
      ...base.coin,
      primaryModuleCannon: 200,
      assistModuleCannon: 200,
      primaryModuleCore: 200,
      assistModuleCore: 200,
    },
  }
}

describe('the candidate matrices pair with their level interfaces', () => {
  it('covers every candidate on every path exactly once', () => {
    const total = EFFECTIVE_DAMAGE_CANDIDATES.lab.length
      + EFFECTIVE_DAMAGE_CANDIDATES.stone.length
      + EFFECTIVE_DAMAGE_CANDIDATES.coin.length
      + EFFECTIVE_DAMAGE_CANDIDATES.keys.length
    expect(EFFECTIVE_DAMAGE_UPGRADES).toHaveLength(total)
    expect(new Set(EFFECTIVE_DAMAGE_UPGRADES.map(u => u.id)).size).toBe(total)
  })

  it('gives every candidate a level key, with none left over', () => {
    // A blank key would mean the matrix and the interface fell out of step,
    // and every candidate after the gap would move the wrong level.
    for (const upgrade of EFFECTIVE_DAMAGE_UPGRADES) {
      expect(upgrade.key, upgrade.sheetName).toBeTruthy()
      expect(ZERO_EFFECTIVE_DAMAGE_LEVELS[upgrade.band], upgrade.id)
        .toHaveProperty(upgrade.key)
    }
  })

  it('pairs names that plainly belong together', () => {
    // Spot-checked at the boundaries, where a one-off slip would land.
    const at = (id: string) => EFFECTIVE_DAMAGE_UPGRADES.find(u => u.id === id)?.sheetName
    expect(at('lab.damage')).toBe('Damage')
    expect(at('lab.dissonantEchoUltimateWeapons')).toBe('Dissonant Echo - Ultimate Weapons')
    expect(at('stone.deathWaveDamage')).toBe('DW Damage')
    expect(at('stone.assistSubstatCoreStone')).toBe('Assist Module Substats - Core')
    expect(at('coin.enhancementDamage')).toBe('Damage +')
    expect(at('coin.dissonantEchoUltimateWeapons')).toBe('Dissonant Echo - Ultimate Weapons')
    expect(at('keys.damage')).toBe('Damage')
    expect(at('keys.ultimateWeaponDamage')).toBe('UW Damage')
  })
})

describe('every candidate can be priced', () => {
  for (const variant of VARIANTS) {
    it(`leaves nothing unpriced on the ${variant} path`, () => {
      // An upgrade with no known maximum is excluded rather than guessed at —
      // which is right, but if it happens the cost mapping has a hole in it.
      const plan = planEffectiveDamagePath({
        config: developedConfig(),
        levels: developedLevels(),
        variant,
        steps: 1,
      })
      const unpriced = plan.excluded.filter(e => e.reason === 'no maximum level known')
      expect(unpriced, JSON.stringify(unpriced)).toHaveLength(0)
    })
  }
})

describe('planning a path', () => {
  for (const variant of VARIANTS) {
    it(`produces improving steps on the ${variant} path`, () => {
      const plan = planEffectiveDamagePath({
        config: developedConfig(),
        levels: developedLevels(),
        variant,
        steps: 12,
      })

      expect(plan.steps.length).toBeGreaterThan(0)
      expect(plan.finalEffectiveDamage).toBeGreaterThan(plan.startingEffectiveDamage)

      for (const step of plan.steps) {
        expect(step.cost, `${variant} ${step.name}`).toBeGreaterThan(0)
        expect(Number.isFinite(step.roi), `${variant} ${step.name}`).toBe(true)
      }

      // Every step is on a path this variant is allowed to buy from.
      const ids = new Map(EFFECTIVE_DAMAGE_UPGRADES.map(u => [u.id, u.band]))
      const allowed = variant.startsWith('lab') ? 'lab' : variant
      for (const step of plan.steps) expect(ids.get(step.id)).toBe(allowed)
    })
  }

  it('takes the best return first', () => {
    // The greedy rule the sheet uses: relative return per unit spent, never
    // increasing as the path goes on for a fixed set of candidates.
    const plan = planEffectiveDamagePath({
      config: developedConfig(),
      levels: developedLevels(),
      variant: 'stone',
      steps: 20,
    })
    expect(plan.steps[0].roi).toBeGreaterThanOrEqual(plan.steps.at(-1)?.roi ?? 0)
  })

  it('respects a target level the player set', () => {
    const options = {
      config: developedConfig(),
      levels: developedLevels(),
      variant: 'lab-time' as const,
      steps: 40,
    }
    const capped = planEffectiveDamagePath({
      ...options,
      targetLevels: { 'lab.damage': 0 },
    })
    expect(capped.steps.some(step => step.id === 'lab.damage')).toBe(false)
  })

  it('leaves module levels alone below where coins beat shards', () => {
    const plan = planEffectiveDamagePath({
      config: developedConfig(),
      levels: ZERO_EFFECTIVE_DAMAGE_LEVELS,
      variant: 'coin',
      steps: 5,
    })
    const reasons = plan.excluded
      .filter(e => e.sheetName.includes('Module - '))
      .map(e => e.reason)
    expect(reasons).toHaveLength(4)
    for (const reason of reasons) expect(reason).toMatch(/shards are cheaper/)
  })

  it('says why it dropped an upgrade rather than dropping it quietly', () => {
    const plan = planEffectiveDamagePath({
      config: developedConfig(),
      levels: developedLevels(),
      variant: 'keys',
      steps: 5,
      excludeIds: ['keys.damage'],
    })
    expect(plan.excluded).toContainEqual({ sheetName: 'Damage', reason: 'not unlocked yet' })
    expect(plan.steps.some(step => step.id === 'keys.damage')).toBe(false)
  })
})

describe('what the paths actually pick', () => {
  it('ranks Chain Lightning’s bullet-driven stats on the lab path', () => {
    // Attack Speed pays three ways at once — bullets per second, Rapid Fire,
    // and Chain Lightning's proc rate. A per-stat score would underrate it.
    const plan = planEffectiveDamagePath({
      config: developedConfig(),
      levels: developedLevels(),
      variant: 'lab-time',
      steps: 60,
    })
    expect(plan.steps.map(step => step.name)).toContain('Attack Speed')
  })

  it('buys ultimate weapon upgrades on the stone path and nothing else', () => {
    const plan = planEffectiveDamagePath({
      config: developedConfig(),
      levels: developedLevels(),
      variant: 'stone',
      steps: 15,
    })
    // The stone path is the one with no eHP equivalent: almost all of it is
    // ultimate weapons, plus the five assist capacities.
    expect(plan.steps.length).toBeGreaterThan(0)
    for (const step of plan.steps) {
      expect(step.id.startsWith('stone.')).toBe(true)
    }
  })
})
