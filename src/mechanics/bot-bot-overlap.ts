/** Bot range overlap flags and Bot-on-bot amplification helpers. */

import { botBotBoostedMultiplier } from './bot-hit-multiplier'

export interface EnemyBotRangeFlags {
  stunBotRange: boolean
  coinBotRange: boolean
  flameBotDamageReduction: boolean
  amplifyLightning: boolean
  swampPoison: boolean
}

export type EnemyBotRangeFlag = keyof EnemyBotRangeFlags

export const EMPTY_ENEMY_BOT_RANGE_FLAGS: EnemyBotRangeFlags = {
  stunBotRange: false,
  coinBotRange: false,
  flameBotDamageReduction: false,
  amplifyLightning: false,
  swampPoison: false,
}

export type EnemyBotRangeTriggerKind =
  | 'stunBot'
  | 'goldenBot'
  | 'amplifyBotEnemy'
  | 'flameBotDr'
  | 'swampPoison'

const ENTER_FLAG_BY_TRIGGER: Record<EnemyBotRangeTriggerKind, EnemyBotRangeFlag> = {
  stunBot: 'stunBotRange',
  goldenBot: 'coinBotRange',
  amplifyBotEnemy: 'amplifyLightning',
  flameBotDr: 'flameBotDamageReduction',
  swampPoison: 'swampPoison',
}

export function applyEnemyBotRangeEnter(
  flags: EnemyBotRangeFlags,
  trigger: EnemyBotRangeTriggerKind,
): EnemyBotRangeFlags {
  const key = ENTER_FLAG_BY_TRIGGER[trigger]
  return key ? { ...flags, [key]: true } : flags
}

export function applyEnemyBotRangeExit(
  flags: EnemyBotRangeFlags,
  trigger: EnemyBotRangeTriggerKind,
): EnemyBotRangeFlags {
  const key = ENTER_FLAG_BY_TRIGGER[trigger]
  return key ? { ...flags, [key]: false } : flags
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function computeAverageAmplifiedBotMetric(
  baseNumber: number,
  projectedNumber: number,
  uptimeFraction: number,
  overlapApplicationFraction: number,
): number {
  const baseAverage = Math.max(0, baseNumber) * clamp01(uptimeFraction)
  const overlapGain = Math.max(0, projectedNumber - baseNumber) * clamp01(overlapApplicationFraction)
  return baseAverage + overlapGain
}

export interface BotBotAmplificationInput {
  botBotBonus: number
  maximumPower?: number
  temporalOverlapFraction: number
  spatialOverlapFraction: number
}

export function botBotAmplificationApplicationFraction(input: BotBotAmplificationInput): number {
  const temporal = clamp01(input.temporalOverlapFraction)
  const spatial = clamp01(input.spatialOverlapFraction)
  return temporal * (spatial > 0 ? spatial : 1)
}

export function botBotPeakStatMultiplier(
  botBotBonus: number,
  maximumPower: number | undefined,
  overlapFraction: number,
): number {
  return botBotBoostedMultiplier(
    Math.max(1, botBotBonus),
    Math.max(1, maximumPower ?? 1),
    overlapFraction,
  )
}
