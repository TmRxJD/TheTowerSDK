import { describe, expect, it } from 'vitest'
import {
  buildBotLevelOptionLabel,
  computeBotCooldownSecondsAtLevel,
  computeBotDurationSecondsAtLevel,
} from './bot-dropdown-math'
import { BOT_GAME_INPUT_SPECS } from './bot-game-input-keys'
import { evaluateDropdownOptions } from './dropdown-evaluator'

describe('bot dropdown math', () => {
  it('matches uptime golden bot cooldown formula', () => {
    expect(computeBotCooldownSecondsAtLevel('gb', 10, 0)).toBe(90)
    expect(computeBotCooldownSecondsAtLevel('gb', 10, 5)).toBe(85)
    expect(buildBotLevelOptionLabel('cd_level', 'gb', 10, 0)).toBe('90s')
  })

  it('matches flame bot cooldown floor', () => {
    expect(computeBotCooldownSecondsAtLevel('fb', 15, 25)).toBe(5)
  })

  it('matches thunder bot duration cap', () => {
    expect(computeBotDurationSecondsAtLevel('tb', 10, 0)).toBe(15)
    expect(buildBotLevelOptionLabel('dur_level', 'tb', 10, 0)).toBe('15s')
  })
})

describe('bot game input registry', () => {
  it('registers all uptime-linked bot keys', () => {
    expect(BOT_GAME_INPUT_SPECS.map(spec => spec.key)).toEqual(expect.arrayContaining([
      'gb_cd_level',
      'gb_dur_level',
      'gb_cd_lab',
      'ab_cd_level',
      'fb_cd_level',
      'tb_dur_level',
    ]))
  })

  it('keeps gold_bot_cooldown alias aligned with gb_cd_level', () => {
    const context = { uptimeInputs: { gbCdLab: 4 }, botLabLevels: { 'Golden Bot': { Cooldown: 4 } } }
    expect(evaluateDropdownOptions('gold_bot_cooldown', context)).toEqual(
      evaluateDropdownOptions('gb_cd_level', context),
    )
  })
})
