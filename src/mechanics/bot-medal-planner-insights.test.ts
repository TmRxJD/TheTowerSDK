import { describe, expect, it } from 'vitest'
import { describeBotMedalUpgradeInsight } from './bot-medal-planner-insights'

const baseMetrics = {
  effectiveNumber: 10,
  uptimeFraction: 0.4,
  avgOverlapFraction: 0.2,
  coverageScale: 1.05,
  coverageFraction: 0.5,
}

describe('describeBotMedalUpgradeInsight', () => {
  it('describes range coverage expansion', () => {
    const label = describeBotMedalUpgradeInsight({
      botLabel: 'Amplify Bot',
      statName: 'Range',
      upgradeKind: 'base',
      objectiveDelta: 1.2,
      before: baseMetrics,
      after: {
        ...baseMetrics,
        coverageScale: 1.18,
      },
    })
    expect(label).toContain('coverage')
    expect(label).toContain('1.05')
    expect(label).toContain('1.18')
  })

  it('describes cooldown overlap alignment', () => {
    const label = describeBotMedalUpgradeInsight({
      botLabel: 'Golden Bot',
      statName: 'Cooldown',
      upgradeKind: 'base',
      objectiveDelta: 0.8,
      before: baseMetrics,
      after: {
        ...baseMetrics,
        avgOverlapFraction: 0.31,
        uptimeFraction: 0.48,
      },
      botBotOverlapBefore: 0.18,
      botBotOverlapAfter: 0.27,
    })
    expect(label).toContain('Bot Bot')
    expect(label).toContain('overlap')
  })

  it('describes wildfire plus with Singularity Harness', () => {
    const label = describeBotMedalUpgradeInsight({
      botLabel: 'Flame Bot',
      statName: 'Wildfire+',
      upgradeKind: 'plus',
      objectiveDelta: 2,
      before: baseMetrics,
      after: { ...baseMetrics, effectiveNumber: 12.5 },
      singularityHarnessActive: true,
    })
    expect(label).toContain('Wildfire+')
    expect(label).toContain('Singularity Harness')
  })
})
