import { describe, expect, it } from 'vitest'
import { BOT_BENEFIT_COOLDOWN_LAB_INDICES, computeBotGetBenefit } from './bot-get-benefit'
import { coinBotBonusMultiplier } from './bot-coin-bonus'
import { botBotBoostedMultiplier, chainLightningShockMultiplier, enemyHitMultiplier } from './bot-hit-multiplier'
import { pickBotActivationDestination } from './bot-movement'
import { UnityRandom } from '../internal/unity-random'

describe('computeBotGetBenefit', () => {
  it('applies base + perLevel', () => {
    expect(computeBotGetBenefit({
      baseBenefit: 50,
      benefitPerLevel: 8,
      level: 3,
      statIndex: 0,
    })).toBe(74)
  })

  it('subtracts cooldown lab for flame index 8', () => {
    expect(computeBotGetBenefit({
      baseBenefit: 75,
      benefitPerLevel: -3,
      level: 5,
      statIndex: BOT_BENEFIT_COOLDOWN_LAB_INDICES.flame,
      cooldownLab: { researchBase: 0, researchPerLevel: 1, selectedLevel: 10 },
    })).toBe(50)
  })
})

describe('enemyHitMultiplier', () => {
  it('multiplies amplify bot bonus when in range', () => {
    expect(enemyHitMultiplier({
      amplifyBot: { active: true, amplifyBonusMultiplier: 5 },
    })).toBe(5)
  })

  it('doubles for flame module debuff', () => {
    expect(enemyHitMultiplier({
      flameModuleDebuff: { active: true },
    })).toBe(2)
  })

  it('applies chain lightning shock baseline and stacks with flame debuff', () => {
    expect(chainLightningShockMultiplier(3, 2)).toBe(5)
    expect(enemyHitMultiplier({
      chainLightningShock: { active: true, shockMultiplier: 3, shockStack: 2 },
      flameModuleDebuff: { active: true },
    })).toBe(10)
  })
})

describe('coinBotBonusMultiplier', () => {
  it('returns golden bot bonus when in range', () => {
    expect(coinBotBonusMultiplier(true, 4)).toBe(4)
    expect(coinBotBonusMultiplier(true, 0.5)).toBe(1)
  })
})

describe('botBotBoostedMultiplier', () => {
  it('includes maximum power in peak boost', () => {
    expect(botBotBoostedMultiplier(2, 2, 1)).toBe(4)
    expect(botBotBoostedMultiplier(2, 2, 0.5)).toBe(2.5)
  })
})

describe('pickBotActivationDestination', () => {
  it('is deterministic for a fixed seed', () => {
    const rng = UnityRandom.fromSeed(42)
    const first = pickBotActivationDestination(rng, 60, 1)
    const rng2 = UnityRandom.fromSeed(42)
    const second = pickBotActivationDestination(rng2, 60, 1)
    expect(first).toEqual(second)
  })
})
