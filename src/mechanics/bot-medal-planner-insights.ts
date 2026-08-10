/**
 * Human-readable upgrade rationale from simulated metric deltas (not hardcoded bot priority).
 */

export interface BotMedalUpgradeInsightMetrics {
  effectiveNumber: number
  uptimeFraction: number
  avgOverlapFraction: number
  coverageScale: number
  coverageFraction: number
}

export interface BotMedalUpgradeInsightInput {
  botLabel: string
  statName: string
  upgradeKind: 'base' | 'plus'
  objectiveDelta: number
  before: BotMedalUpgradeInsightMetrics
  after: BotMedalUpgradeInsightMetrics
  botBotOverlapBefore?: number
  botBotOverlapAfter?: number
  singularityHarnessActive?: boolean
}

function formatPercent(value: number): string {
  return `${(Math.max(0, value) * 100).toFixed(1)}%`
}

function formatCoverageScale(value: number): string {
  return value.toFixed(2)
}

function pickDominantSignal(input: BotMedalUpgradeInsightInput): string | null {
  const { before, after, statName, upgradeKind, botLabel } = input
  const overlapGain = after.avgOverlapFraction - before.avgOverlapFraction
  const coverageScaleGain = after.coverageScale - before.coverageScale
  const uptimeGain = after.uptimeFraction - before.uptimeFraction
  const effectiveGain = after.effectiveNumber - before.effectiveNumber
  const botBotOverlapGain = (input.botBotOverlapAfter ?? 0) - (input.botBotOverlapBefore ?? 0)

  if (upgradeKind === 'plus') {
    if (botLabel === 'Flame Bot' && input.singularityHarnessActive) {
      return `Wildfire+ raises Singularity Harness burn support (effective ${effectiveGain >= 0 ? '+' : ''}${effectiveGain.toFixed(2)})`
    }
    if (botLabel === 'Golden Bot') {
      return `Bonus Cell+ scales coin multiplier (${formatPercent(before.uptimeFraction)} uptime window)`
    }
    if (botLabel === 'Bot Bot') {
      return 'Maximum Power+ raises Bot Bot amplification ceiling'
    }
    if (botLabel === 'Amplify Bot') {
      return 'Amplify+ strengthens core bonus multiplier'
    }
    if (effectiveGain > 0.01) {
      return `${statName} improves simulated output (+${effectiveGain.toFixed(2)} effective)`
    }
    return `${statName} unlocks stronger Bot+ scaling`
  }

  if (statName.includes('Range') && coverageScaleGain > 0.008) {
    return `Range expands coverage ${formatCoverageScale(before.coverageScale)}→${formatCoverageScale(after.coverageScale)}`
  }

  if ((statName === 'Cooldown' || statName === 'Duration') && overlapGain > 0.004) {
    const overlapLabel = formatPercent(after.avgOverlapFraction)
    const priorLabel = formatPercent(before.avgOverlapFraction)
    if (botBotOverlapGain > 0.004) {
      return `${statName} aligns activation with Bot Bot (${priorLabel}→${overlapLabel} overlap)`
    }
    return `${statName} improves overlap duty (${priorLabel}→${overlapLabel})`
  }

  if (statName === 'Cooldown' && uptimeGain > 0.006) {
    return `Cooldown shortens cycle (${formatPercent(before.uptimeFraction)}→${formatPercent(after.uptimeFraction)} uptime)`
  }

  if (statName === 'Duration' && uptimeGain > 0.006) {
    return `Duration lengthens active window (${formatPercent(before.uptimeFraction)}→${formatPercent(after.uptimeFraction)} uptime)`
  }

  if (statName === 'Bonus' && effectiveGain > 0.01) {
    return `Bonus raises effective output (+${effectiveGain.toFixed(2)})`
  }

  if (coverageScaleGain > 0.008) {
    return `Coverage reach improves ${formatCoverageScale(before.coverageScale)}→${formatCoverageScale(after.coverageScale)}`
  }

  if (overlapGain > 0.004) {
    return `Overlap quality improves ${formatPercent(before.avgOverlapFraction)}→${formatPercent(after.avgOverlapFraction)}`
  }

  if (effectiveGain > 0.01) {
    return `Effective output +${effectiveGain.toFixed(2)} from ${statName}`
  }

  return null
}

export function describeBotMedalUpgradeInsight(input: BotMedalUpgradeInsightInput): string {
  const dominant = pickDominantSignal(input)
  if (dominant) return dominant
  if (input.objectiveDelta > 0.0001) {
    return `Plan objective +${input.objectiveDelta.toFixed(3)}`
  }
  return 'Marginal plan improvement'
}
