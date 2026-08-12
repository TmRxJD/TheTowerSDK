import { describe, expect, it } from 'vitest'
import {
  allBotPlusUnlockedForSync,
  BOT_PLUS_LEVEL_LOCKED,
  getBotMedalPlannerFocusWeights,
  normalizeBotMedalPlannerFocusOrder,
} from './bot-medal-planner-focus'

describe('bot medal planner focus', () => {
  it('normalizes focus order with defaults', () => {
    expect(normalizeBotMedalPlannerFocusOrder(undefined)).toEqual(['farming', 'overlap', 'uptime'])
    expect(normalizeBotMedalPlannerFocusOrder(['range', 'coins', 'range'])).toEqual(['range', 'coins'])
  })

  it('boosts range weight when range is top priority', () => {
    const weights = getBotMedalPlannerFocusWeights(['range', 'overlap'])
    expect(weights.range).toBeGreaterThan(weights.uptime)
    expect(weights.range).toBeGreaterThan(1)
  })

  it('tracks locked bot+ levels for sync eligibility', () => {
    expect(allBotPlusUnlockedForSync({ 'Golden Bot': [0], 'Flame Bot': [BOT_PLUS_LEVEL_LOCKED] })).toBe(false)
    expect(allBotPlusUnlockedForSync({ 'Golden Bot': [0], 'Flame Bot': [0] })).toBe(true)
  })
})
