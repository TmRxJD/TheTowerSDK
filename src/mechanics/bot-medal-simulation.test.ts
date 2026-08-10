import { describe, expect, it } from 'vitest'
import {
  BOT_MEDAL_DEFAULT_TOWER_RANGE_METERS,
  botDisplayRangeToEffectiveRadiusMeters,
  botMedalCoverageFraction,
  circleOverlapFractionOfTarget,
  sharedPathBotBotOverlapFraction,
  simulateBotMedalActivationTiming,
  simulateBotMedalInteraction,
} from './bot-medal-simulation'
import { botTowerFactor } from './bots'

describe('botDisplayRangeToEffectiveRadiusMeters', () => {
  it('matches Bot.UpdateSize at the 60 m tower anchor', () => {
    const displayRange = 60
    const towerRange = 60
    const expected = (displayRange * 10 / 10) * botTowerFactor(towerRange / 10)
    expect(botDisplayRangeToEffectiveRadiusMeters(displayRange, towerRange)).toBeCloseTo(expected, 8)
  })

  it('differs from the legacy towerRange/60 linear scale at 60 m', () => {
    const legacy = 60 * (60 / 60)
    const game = botDisplayRangeToEffectiveRadiusMeters(60, 60)
    expect(game).not.toBeCloseTo(legacy, 8)
    expect(game).toBeCloseTo(60 * 0.9, 8)
  })
})

describe('sharedPathBotBotOverlapFraction', () => {
  it('returns full overlap when Bot Bot radius covers the other bot', () => {
    expect(sharedPathBotBotOverlapFraction(20, 40)).toBe(1)
  })

  it('returns radius-ratio squared for partial coverage', () => {
    expect(sharedPathBotBotOverlapFraction(40, 20)).toBeCloseTo(0.25, 8)
  })
})

describe('circleOverlapFractionOfTarget', () => {
  it('returns 1 for concentric equal radii', () => {
    expect(circleOverlapFractionOfTarget(30, 30, 0)).toBeCloseTo(1, 8)
  })

  it('returns 0 when circles do not touch', () => {
    expect(circleOverlapFractionOfTarget(10, 10, 25)).toBe(0)
  })
})

describe('simulateBotMedalActivationTiming', () => {
  it('returns full overlap for identical duration/cooldown cycles', () => {
    const result = simulateBotMedalActivationTiming(10, 20, 10, 20, {
      stepSeconds: 1,
      durationSeconds: 200,
    })
    expect(result.overlapOfTotalTimeFraction).toBeCloseTo(0.5, 2)
    expect(result.overlapOfBotUptimeFraction).toBeCloseTo(1, 2)
    expect(result.overlapOfBotBotUptimeFraction).toBeCloseTo(1, 2)
  })
})

describe('simulateBotMedalInteraction', () => {
  it('is deterministic for independent-path sampling', () => {
    const args = {
      otherBotLabel: 'Flame Bot',
      otherDurationSeconds: 10,
      otherCooldownSeconds: 20,
      otherRangeMeters: 45,
      botBotDurationSeconds: 10,
      botBotCooldownSeconds: 20,
      botBotRangeMeters: 30,
      sharedPath: false,
      arenaRadiusMeters: BOT_MEDAL_DEFAULT_TOWER_RANGE_METERS,
      stepSeconds: 1,
      durationSeconds: 400,
    }
    const first = simulateBotMedalInteraction(args)
    const second = simulateBotMedalInteraction(args)
    expect(first).toEqual(second)
    expect(first.overlapOfTotalTimeFraction).toBeGreaterThan(0)
    expect(first.overlapOfTotalTimeFraction).toBeLessThan(0.5)
  })

  it('uses co-located centers on shared path', () => {
    const result = simulateBotMedalInteraction({
      otherBotLabel: 'Golden Bot',
      otherDurationSeconds: 35,
      otherCooldownSeconds: 75,
      otherRangeMeters: 60,
      botBotDurationSeconds: 35,
      botBotCooldownSeconds: 75,
      botBotRangeMeters: 30,
      sharedPath: true,
      stepSeconds: 1,
      durationSeconds: 300,
    })
    expect(result.conditionedSpatialOverlapFraction).toBeCloseTo(0.25, 8)
    expect(result.overlapOfTotalTimeFraction).toBeGreaterThan(0)
  })
})

describe('botMedalCoverageFraction', () => {
  it('uses effective radius squared over arena radius squared', () => {
    const coverage = botMedalCoverageFraction(60, 60)
    expect(coverage).toBeCloseTo(0.81, 2)
  })
})
