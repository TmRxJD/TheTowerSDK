import { describe, expect, it } from 'vitest'
import {
  DAMAGE_PLAN_VARIANTS,
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

describe('a weapon the player does not own, on the stone path', () => {
  it('is excluded rather than tied at zero', () => {
    // `eDamage Stone!EY2` gates the Poison Swamp stats on `NOT($BH$35)`, and
    // its neighbours gate Inner Land Mines on `NOT($BH$37)`. The stone cost
    // table prices them regardless, so nothing else stops the planner
    // recommending stones for a weapon that is not owned.
    const plan = planEffectiveDamagePath({
      config: zeroEffectiveDamageConfig(),
      levels: ZERO_EFFECTIVE_DAMAGE_LEVELS,
      variant: 'stone',
      steps: 25,
    })
    for (const step of plan.steps) {
      expect(step.name, `${step.name} needs a weapon nobody owns`).not.toMatch(/^(PS|ILM|DW|CL|SM|SL) /)
    }
    expect(plan.excluded.some(entry => /the weapon is not unlocked/.test(entry.reason))).toBe(true)
  })
})

describe('the Workshop Enhancements lab', () => {
  it('takes every enhancement off the coin path until it is bought', () => {
    // `eDamage Coins!EZ2` opens with `'Master Sheet'!$F$5 <> 1`. Without this
    // the coin path recommends "Damage +" to a player who cannot buy any
    // enhancement at all.
    const plan = planEffectiveDamagePath({
      config: zeroEffectiveDamageConfig(),
      levels: ZERO_EFFECTIVE_DAMAGE_LEVELS,
      variant: 'coin',
      steps: 25,
      workshopEnhancementsUnlocked: false,
    })
    for (const step of plan.steps) expect(step.name).not.toMatch(/ \+$/)
    expect(plan.excluded.some(entry => /Workshop Enhancements/.test(entry.reason))).toBe(true)
  })

  it('offers them once it is', () => {
    const plan = planEffectiveDamagePath({
      config: zeroEffectiveDamageConfig(),
      levels: ZERO_EFFECTIVE_DAMAGE_LEVELS,
      variant: 'coin',
      steps: 25,
      workshopEnhancementsUnlocked: true,
    })
    expect(plan.excluded.some(entry => /Workshop Enhancements/.test(entry.reason))).toBe(false)
  })
})

describe('lab candidates whose prerequisite is unmet', () => {
  const bare = () => zeroEffectiveDamageConfig()

  it('leaves out a mastery when cards are off, and the two perk labs when perks are', () => {
    // `eDamage!FW2` gates Damage Mastery on the cards switch, `FX2` gates
    // Standard Perks Bonus on the Damage perk and `FY2` gates Improve
    // Trade-off Perks on the Boss Health one. Each multiplies something that
    // has to exist first, so on a fresh account all three gain nothing — and a
    // zero gain still wins a tie-break.
    const plan = planEffectiveDamagePath({
      config: bare(), levels: ZERO_EFFECTIVE_DAMAGE_LEVELS, variant: 'lab-time', steps: 25,
    })
    const reasons = new Map(plan.excluded.map(entry => [entry.sheetName, entry.reason]))
    for (const name of [
      'Damage Mastery', 'Standard Perks Bonus', 'Improve Trade-off Perks',
      'Demon Mode Mastery', 'Shock Multiplier',
    ]) {
      expect(reasons.get(name), name).toMatch(/not taken yet/)
    }
    for (const step of plan.steps) {
      expect(['Damage Mastery', 'Standard Perks Bonus']).not.toContain(step.name)
    }
  })

  it('offers them once what they multiply is taken', () => {
    const config = {
      ...bare(),
      cardsEquipped: true,
      // `AY43` is the Damage Mastery *card*, not the cards switch, so turning
      // cards on is not enough — the card itself has to be equipped.
      cards: {
        ...bare().cards,
        'Damage Mastery': { ...bare().cards['Damage Mastery'], active: true },
        'Demon Mode Mastery': { ...bare().cards['Demon Mode Mastery'], active: true },
      },
      perksEquipped: true,
      perks: { ...bare().perks, 'Damage': true, 'Boss Health Trade-off': true },
      ultimateWeapons: {
        ...bare().ultimateWeapons,
        'Chain Lightning': { ...bare().ultimateWeapons['Chain Lightning'], unlocked: true },
      },
      // `AL75`'s F33 half — Chain Lightning Shock lab bought.
      shockMultiplierUnlocked: true,
    }
    const plan = planEffectiveDamagePath({
      config, levels: ZERO_EFFECTIVE_DAMAGE_LEVELS, variant: 'lab-time', steps: 5,
    })
    expect(plan.excluded.some(entry => /not taken yet/.test(entry.reason))).toBe(false)
  })

  it('keeps Shock Multiplier off when Chain Lightning Shock is not bought', () => {
    // Weapon half alone used to pass; `AL75` also needs Master Sheet F33 = 1.
    const config = {
      ...bare(),
      ultimateWeapons: {
        ...bare().ultimateWeapons,
        'Chain Lightning': { ...bare().ultimateWeapons['Chain Lightning'], unlocked: true },
      },
      shockMultiplierUnlocked: false,
    }
    const plan = planEffectiveDamagePath({
      config, levels: ZERO_EFFECTIVE_DAMAGE_LEVELS, variant: 'lab-time', steps: 25,
    })
    const reasons = new Map(plan.excluded.map(entry => [entry.sheetName, entry.reason]))
    expect(reasons.get('Shock Multiplier')).toMatch(/not taken yet/)
    expect(plan.steps.some(step => step.name === 'Shock Multiplier')).toBe(false)
  })
})

describe('every variant name plans something', () => {
  it('rejects a typo instead of silently planning nothing', () => {
    // Two of the tests above were written against `variant: 'lab'`, which is
    // not a variant — the lab band answers to `lab-time` and `lab-coins`. The
    // loop skips every candidate, the plan comes back empty, and an assertion
    // over "no bad steps" passes for the wrong reason. This is the guard.
    for (const variant of DAMAGE_PLAN_VARIANTS) {
      const plan = planEffectiveDamagePath({
        config: zeroEffectiveDamageConfig(),
        levels: ZERO_EFFECTIVE_DAMAGE_LEVELS,
        variant,
        steps: 3,
      })
      expect(plan.steps.length + plan.excluded.length, variant).toBeGreaterThan(0)
    }
  })
})

describe('the Damage Mastery lab needs its own card', () => {
  it('is not offered when cards are on but that card is not equipped', () => {
    // `AY43` is row 43 of the cards block, which `AT43` names Damage Mastery —
    // reading it as the cards master switch offers the lab to a player who has
    // cards but not this one.
    const plan = planEffectiveDamagePath({
      config: { ...zeroEffectiveDamageConfig(), cardsEquipped: true },
      levels: ZERO_EFFECTIVE_DAMAGE_LEVELS,
      variant: 'lab-time',
      steps: 10,
    })
    const reasons = new Map(plan.excluded.map(entry => [entry.sheetName, entry.reason]))
    expect(reasons.get('Damage Mastery')).toMatch(/not taken yet/)
  })
})
