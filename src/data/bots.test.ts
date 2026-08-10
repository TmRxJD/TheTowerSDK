import { describe, expect, it } from 'vitest'
import {
  BOT_UPGRADES_DATA,
  buildBotUnlockOrdinalByLabel,
  estimateBotUptimeFraction,
  estimateEffectiveAmplifiedBotMetricValue,
  getBotUnlockCostForEnabledBot,
  normalizeBotStats,
  sumBotUnlockCosts,
} from './bots'

function getBotByLabel(label: string) {
  return BOT_UPGRADES_DATA.find(bot => bot.label === label)
}

describe('bot lab normalization', () => {
  it('matches the documented max medal values for each bot stat family', () => {
    const expectationGroups = [
      {
        botLabel: 'Flame Bot',
        statChecks: [
          ['Damage Reduction', 25, '95%'],
          ['Damage', 30, '290x'],
          ['Range', 15, '90M'],
        ],
        plusChecks: [
          ['Wildfire', 20, '3.5x'],
        ],
      },
      {
        botLabel: 'Thunder Bot',
        statChecks: [
          ['Duration', 20, '15s'],
          ['Cooldown', 15, '75s'],
          ['Linger', 20, '80%'],
          ['Range', 15, '70M'],
        ],
        plusChecks: [
          ['Titan Shock', 20, '25%'],
        ],
      },
      {
        botLabel: 'Golden Bot',
        statChecks: [
          ['Duration', 30, '35s'],
          ['Cooldown', 15, '75s'],
          ['Bonus', 30, '8x'],
          ['Range', 20, '60M'],
        ],
        plusChecks: [
          ['Bonus Cell', 25, '2.50x'],
        ],
      },
      {
        botLabel: 'Amplify Bot',
        statChecks: [
          ['Duration', 30, '35s'],
          ['Cooldown', 15, '75s'],
          ['Bonus', 30, '15.5x'],
          ['Range', 18, '61M'],
        ],
        plusChecks: [
          ['Echoing Shot', 9, '12x'],
        ],
      },
      {
        botLabel: 'Bot Bot',
        statChecks: [
          ['Duration', 30, '35.0s'],
          ['Cooldown', 15, '75s'],
          ['Bonus', 0, '1.05x'],
          ['Bonus', 19, '2.00x'],
          ['Range', 0, '20M'],
          ['Range', 20, '60M'],
        ],
        baseChecks: [
          ['Bonus', '1.05x'],
        ],
        plusChecks: [
          ['Maximum Power', 20, '2.25x'],
        ],
      },
    ] as const

    for (const group of expectationGroups) {
      const bot = getBotByLabel(group.botLabel)
      expect(bot, `${group.botLabel} should exist`).toBeTruthy()

      for (const [statName, level, expected] of group.statChecks) {
        expect(bot?.stats[statName]?.levels[level]).toBe(expected)
      }

      if ('baseChecks' in group) {
        for (const [statName, expected] of group.baseChecks) {
          expect(bot?.stats[statName]?.base).toBe(expected)
        }
      }

      for (const [statName, level, expected] of group.plusChecks) {
        expect(bot?.plus?.stats[statName]?.levels[level]).toBe(expected)
      }
    }
  })

  it('applies Golden Bot duration labs at 0.5 seconds per level', () => {
    const goldenBot = BOT_UPGRADES_DATA.find(bot => bot.label === 'Golden Bot')
    expect(goldenBot).toBeTruthy()

    const stats = normalizeBotStats(goldenBot!, { Duration: 20 })
    const duration = stats.find(stat => stat.name === 'Duration')

    expect(duration?.levels[0]?.value).toBe('30s')
    expect(duration?.levels[30]?.value).toBe('45s')
  })

  it('applies Amplify Bot duration labs at 0.5 seconds per level', () => {
    const amplifyBot = BOT_UPGRADES_DATA.find(bot => bot.label === 'Amplify Bot')
    expect(amplifyBot).toBeTruthy()

    const stats = normalizeBotStats(amplifyBot!, { Duration: 10 })
    const duration = stats.find(stat => stat.name === 'Duration')

    expect(duration?.levels[0]?.value).toBe('25s')
    expect(duration?.levels[30]?.value).toBe('40s')
  })

  it('keeps cooldown labs at 1 second per level', () => {
    const goldenBot = BOT_UPGRADES_DATA.find(bot => bot.label === 'Golden Bot')
    expect(goldenBot).toBeTruthy()

    const stats = normalizeBotStats(goldenBot!, { Cooldown: 25 })
    const cooldown = stats.find(stat => stat.name === 'Cooldown')

    expect(cooldown?.levels[0]?.value).toBe('95s')
    expect(cooldown?.levels[15]?.value).toBe('50s')
  })

  it('calculates bot uptime fractions from duration and cooldown strings', () => {
    expect(estimateBotUptimeFraction('45s', '50s')).toBe(0.9)
    expect(estimateBotUptimeFraction('20s', '120s')).toBeCloseTo(1 / 6, 6)
  })

  it('weights amplified bot value by both bot and Bot Bot uptime', () => {
    expect(
      estimateEffectiveAmplifiedBotMetricValue('8x', '5x', undefined, 1, 0.5, 0.5),
    ).toBe('12x')
  })
})

describe('bot unlock medal costs', () => {
  it('assigns sequential unlock costs among enabled bots', () => {
    expect(getBotUnlockCostForEnabledBot('Golden Bot', ['Golden Bot'])).toBe(150)
    expect(getBotUnlockCostForEnabledBot('Bot Bot', ['Golden Bot', 'Bot Bot'])).toBe(300)
    expect(
      getBotUnlockCostForEnabledBot('Golden Bot', ['Golden Bot', 'Bot Bot'])
      + getBotUnlockCostForEnabledBot('Bot Bot', ['Golden Bot', 'Bot Bot']),
    ).toBe(450)
    expect(sumBotUnlockCosts(2)).toBe(450)

    const ordinals = buildBotUnlockOrdinalByLabel(['Golden Bot', 'Bot Bot'])
    expect(ordinals.get('Golden Bot')).toBe(1)
    expect(ordinals.get('Bot Bot')).toBe(2)
  })

  it('orders enabled bots by catalog order regardless of enable sequence', () => {
    expect(getBotUnlockCostForEnabledBot('Amplify Bot', ['Golden Bot', 'Amplify Bot'])).toBe(300)
    expect(getBotUnlockCostForEnabledBot('Golden Bot', ['Golden Bot', 'Amplify Bot'])).toBe(150)
  })
})
