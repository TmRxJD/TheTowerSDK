import { enemyHitMultiplier } from './bot-hit-multiplier'

export function botMedalAmplifyDamageHitSignal(input: {
  amplifyBonusMultiplier: number
  flameDebuffCoverageFraction?: number
}): number {
  const amplify = Math.max(1, input.amplifyBonusMultiplier)
  const coverage = Math.max(0, Math.min(1, input.flameDebuffCoverageFraction ?? 0))
  const baseHit = enemyHitMultiplier({
    amplifyBot: { active: true, amplifyBonusMultiplier: amplify },
  })
  const debuffedHit = enemyHitMultiplier({
    amplifyBot: { active: true, amplifyBonusMultiplier: amplify },
    flameModuleDebuff: { active: true },
  })
  return baseHit + ((debuffedHit - baseHit) * coverage)
}

export function resolveBotMedalRowDamageHitSignal(input: {
  botLabel: string
  baseNumber: number
  flameDebuffCoverageFraction?: number
}): number {
  if (input.botLabel === 'Amplify Bot') {
    return botMedalAmplifyDamageHitSignal({
      amplifyBonusMultiplier: input.baseNumber,
      flameDebuffCoverageFraction: input.flameDebuffCoverageFraction,
    })
  }
  return input.baseNumber
}
