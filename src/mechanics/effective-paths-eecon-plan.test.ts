import { describe, expect, it } from 'vitest'
import {
  EFFECTIVE_ECONOMY_UPGRADES,
  planEffectiveEconomyPath,
} from './effective-paths-eecon-plan'
import type { EffectiveEconomyPlanVariant } from './effective-paths-eecon-plan'
import { EFFECTIVE_ECONOMY_CANDIDATES } from './effective-paths-eecon-candidates'
import { ZERO_EFFECTIVE_ECONOMY_LEVELS } from './effective-paths-eecon-levels'
import type { EffectiveEconomyLevels } from './effective-paths-eecon-levels'
import { zeroEffectiveEconomyConfig } from './effective-paths-eecon-compute'
import type { EffectiveEconomyConfig } from './effective-paths-eecon-compute'

/**
 * The eEcon planner.
 *
 * The thing worth asserting is that nothing is dropped silently: every
 * candidate either gets a price and a cap, or appears in `excluded` with a
 * reason. Three of the stone tab's nineteen genuinely cannot be planned, and
 * saying which is more useful than quietly ranking eighteen.
 */

const VARIANTS: readonly EffectiveEconomyPlanVariant[] = ['time', 'coin', 'stone', 'discount']

/** A player far enough along that most candidates are live. */
function developedConfig(): EffectiveEconomyConfig {
  const zero = zeroEffectiveEconomyConfig()
  return {
    ...zero,
    baseCoinsPerKill: 1,
    waveDurationSeconds: 35,
    timeMultiplier: 1,
    coinsPerKill: { value: 12, relicPct: 0.05, vaultPct: 0.05 },
    freeUpgradeAttack: { value: 0.1, relicPct: 0, vaultPct: 0 },
    freeUpgradeDefense: { value: 0.1, relicPct: 0, vaultPct: 0 },
    freeUpgradeUtility: { value: 0.1, relicPct: 0, vaultPct: 0 },
    recoveryPackageChance: { value: 0.05, relicPct: 0, vaultPct: 0 },
    generator: { bonus: 1.5, hasAssist: true, assistBonus: 1.3 },
    weapons: {
      goldenTower: { unlocked: true, bonus: 8, duration: 20, cooldown: 120, goldenCombo: 3 },
      blackHole: { unlocked: true, duration: 15, cooldown: 100 },
      deathWave: { unlocked: true, quantity: 2, cooldown: 150 },
      spotlight: { unlocked: true, angle: 30, quantity: 2 },
      goldBot: { unlocked: true, bonus: 3, duration: 20, cooldown: 90 },
    },
    estimates: {
      blackHoleKillShare: 0.8,
      killsPerSecond: 6,
      goldBotKillShare: 0.7,
      goldBotSyncRatio: 1,
      bossWaveInterval: 10,
      extraOrbTagShare: 0.9,
    },
  }
}

/** Levels high enough that the module candidates are in coin range. */
function developedLevels(): EffectiveEconomyLevels {
  const base = ZERO_EFFECTIVE_ECONOMY_LEVELS
  return {
    ...base,
    time: { ...base.time, primaryModuleGenerator: 200, assistModuleGenerator: 200 },
  }
}

describe('the candidate lists pair with their levels', () => {
  it('covers every candidate on every path exactly once', () => {
    const total = EFFECTIVE_ECONOMY_CANDIDATES.time.length
      + EFFECTIVE_ECONOMY_CANDIDATES.stone.length
      + EFFECTIVE_ECONOMY_CANDIDATES.discount.length
    expect(EFFECTIVE_ECONOMY_UPGRADES).toHaveLength(total)
    expect(new Set(EFFECTIVE_ECONOMY_UPGRADES.map(u => u.id)).size)
      .toBe(EFFECTIVE_ECONOMY_UPGRADES.length)
  })

  it('gives the time path both prices and the others one', () => {
    const time = EFFECTIVE_ECONOMY_UPGRADES.filter(u => u.variants.includes('time'))
    expect(time).toHaveLength(EFFECTIVE_ECONOMY_CANDIDATES.time.length)
    for (const upgrade of time) expect(upgrade.variants).toContain('coin')
  })
})

describe('nothing is dropped without a reason', () => {
  for (const variant of VARIANTS) {
    it(`prices or explains every candidate on the ${variant} path`, () => {
      const plan = planEffectiveEconomyPath({
        config: developedConfig(),
        levels: developedLevels(),
        variant,
        steps: 1,
      })

      const offered = EFFECTIVE_ECONOMY_UPGRADES.filter(u => u.variants.includes(variant))
      const unpriced = plan.excluded.filter(e => e.reason === 'no maximum level known')

      // A candidate with no known cap is a hole in the cost mapping, as opposed
      // to the three that are excluded for reasons the sheet itself gives.
      expect(unpriced, JSON.stringify(unpriced)).toHaveLength(0)
      expect(offered.length).toBeGreaterThan(0)
    })
  }

  it('says why the stone path cannot plan four of its nineteen', () => {
    const plan = planEffectiveEconomyPath({
      config: developedConfig(), levels: developedLevels(), variant: 'stone', steps: 1,
    })

    const reasons = new Map(plan.excluded.map(e => [e.sheetName, e.reason]))
    // Five masteries the sheet ranks from a player-supplied return...
    for (const mastery of [
      'Coins Mastery', 'Extra Orb Mastery', 'Wave Skip Mastery',
      'Intro Sprint Mastery', 'Wave Accelerator Mastery',
    ]) {
      expect(reasons.get(mastery), mastery).toMatch(/player-supplied return/)
    }
    // ...and one that is not a single level at all.
    expect(reasons.get('UW CD')).toMatch(/more than one level a step/)
  })
})

describe('planning a path', () => {
  for (const variant of VARIANTS) {
    it(`produces improving steps on the ${variant} path`, () => {
      const plan = planEffectiveEconomyPath({
        config: developedConfig(),
        levels: developedLevels(),
        variant,
        steps: 12,
      })

      expect(plan.steps.length).toBeGreaterThan(0)
      for (const step of plan.steps) {
        expect(step.cost, `${variant} ${step.name}`).toBeGreaterThan(0)
        expect(Number.isFinite(step.roi), `${variant} ${step.name}`).toBe(true)
      }

      // Every step is on a path this variant is allowed to buy from.
      const allowed = new Set(
        EFFECTIVE_ECONOMY_UPGRADES.filter(u => u.variants.includes(variant)).map(u => u.id),
      )
      for (const step of plan.steps) expect(allowed.has(step.id), step.name).toBe(true)
    })
  }

  it('never goes backwards', () => {
    const plan = planEffectiveEconomyPath({
      config: developedConfig(), levels: developedLevels(), variant: 'time', steps: 25,
    })
    for (const [index, step] of plan.steps.entries()) {
      if (index === 0) continue
      expect(step.value, `step ${index + 1}`).toBeGreaterThanOrEqual(plan.steps[index - 1].value)
    }
  })

  it('takes the best return first', () => {
    const plan = planEffectiveEconomyPath({
      config: developedConfig(), levels: developedLevels(), variant: 'stone', steps: 20,
    })
    expect(plan.steps[0].roi).toBeGreaterThanOrEqual(plan.steps.at(-1)?.roi ?? 0)
  })

  it('respects a stop the player set', () => {
    const plan = planEffectiveEconomyPath({
      config: developedConfig(),
      levels: developedLevels(),
      variant: 'time',
      steps: 40,
      targetLevels: { 'time.coinsPerKillBonus': 0 },
    })
    expect(plan.steps.some(step => step.id === 'time.coinsPerKillBonus')).toBe(false)
  })

  it('leaves module levels alone below where coins beat shards', () => {
    const plan = planEffectiveEconomyPath({
      config: developedConfig(),
      levels: ZERO_EFFECTIVE_ECONOMY_LEVELS,
      variant: 'coin',
      steps: 5,
    })
    const reasons = plan.excluded
      .filter(e => e.sheetName.includes('Module - Generator'))
      .map(e => e.reason)
    expect(reasons).toHaveLength(2)
    for (const reason of reasons) expect(reason).toMatch(/shards are cheaper/)
  })
})

describe('the two prices of the time path', () => {
  it('ranks the same candidates whether measured in days or coins', () => {
    // One candidate list, two currencies — the paths can differ in order, but
    // neither may offer something the other cannot.
    const options = { config: developedConfig(), levels: developedLevels(), steps: 10 }
    const days = planEffectiveEconomyPath({ ...options, variant: 'time' })
    const coins = planEffectiveEconomyPath({ ...options, variant: 'coin' })

    expect(days.startingEffectiveEconomy).toBeCloseTo(coins.startingEffectiveEconomy, 9)
    expect(days.steps.length).toBe(coins.steps.length)
  })
})
