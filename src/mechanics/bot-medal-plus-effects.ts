import type { BotStatRow } from '../data/index'
import { getWildfireAmplification } from './wildfire'

function parseMultiplierValue(raw: string): number {
  const trimmed = String(raw || '').trim().toLowerCase()
  if (!trimmed || trimmed === '—') return 1
  if (trimmed.endsWith('x')) {
    const numeric = Number.parseFloat(trimmed.slice(0, -1))
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1
  }
  if (trimmed.endsWith('%')) {
    const numeric = Number.parseFloat(trimmed.slice(0, -1))
    return Number.isFinite(numeric) ? 1 + (numeric / 100) : 1
  }
  const numeric = Number.parseFloat(trimmed)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1
}

export function getBotPlusLevelMultiplier(stat: BotStatRow | undefined, level: number): number {
  if (!stat || level < 0) return 1
  const entry = stat.levels.find(row => row.level === level)
  if (!entry || entry.value === '') return 1
  return parseMultiplierValue(entry.value)
}

export function getFlameWildfireShDamageSupport(input: {
  plusLevel: number
  plusStat: BotStatRow | undefined
  flameCoverageFraction: number
  singularityHarnessActive: boolean
}): number {
  if (!input.singularityHarnessActive || input.plusLevel < 0 || !input.plusStat) return 0
  const statBase = getBotPlusLevelMultiplier(input.plusStat, 0)
  const statMult = getBotPlusLevelMultiplier(input.plusStat, input.plusLevel)
  const wildfireAmp = getWildfireAmplification({
    wildfireActive: input.plusLevel > 0,
    statBase,
    statMult,
  })
  return input.flameCoverageFraction * Math.max(0, wildfireAmp - statBase)
}

export function applyBotPlusCoreEffectiveMultiplier(input: {
  botLabel: string
  plusLevel: number
  plusStat: BotStatRow | undefined
  effectiveNumber: number
}): number {
  if (input.plusLevel < 0 || !input.plusStat) return input.effectiveNumber
  const mult = getBotPlusLevelMultiplier(input.plusStat, input.plusLevel)
  switch (input.botLabel) {
    case 'Golden Bot':
    case 'Amplify Bot':
    case 'Bot Bot':
      return input.effectiveNumber * mult
    case 'Thunder Bot':
      return input.effectiveNumber * mult
    case 'Flame Bot':
      return input.effectiveNumber * (1 + Math.max(0, mult - 1) * 0.35)
    default:
      return input.effectiveNumber
  }
}

export function getBotBotMaximumPowerMultiplier(plusLevel: number, plusStat: BotStatRow | undefined): number {
  if (plusLevel < 0 || !plusStat) return 1
  return getBotPlusLevelMultiplier(plusStat, plusLevel)
}
