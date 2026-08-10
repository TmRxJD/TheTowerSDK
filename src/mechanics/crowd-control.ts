export interface EnemyCcTimers {
  stunTime: number
  poisonTime: number
  poisonCount: number
  lingerTime: number
  fearedTime: number
  blackHoleTime: number
  shockwaveTime: number
  flameBotDamageReduction: number
  stunDebt: number
}

export function tickCcTimers(timers: EnemyCcTimers, deltaTime: number): EnemyCcTimers {
  return {
    ...timers,
    stunTime: Math.max(0, timers.stunTime - deltaTime),
    poisonTime: Math.max(0, timers.poisonTime - deltaTime),
    lingerTime: Math.max(0, timers.lingerTime - deltaTime),
    fearedTime: Math.max(0, timers.fearedTime - deltaTime),
    blackHoleTime: Math.max(0, timers.blackHoleTime - deltaTime),
    shockwaveTime: Math.max(0, timers.shockwaveTime - deltaTime),
  }
}

export function isStunned(timers: EnemyCcTimers): boolean {
  return timers.stunTime > 0
}

export function isPoisoned(timers: EnemyCcTimers): boolean {
  return timers.poisonTime > 0 || timers.poisonCount > 0
}

export function isSlowedByShockwave(timers: EnemyCcTimers): boolean {
  return timers.shockwaveTime > 0
}

export function titanShockAttackSpeedDivider(
  currentDivider: number,
  ccDuration: number,
  titanSlowFactor: number,
): number {
  const base = Math.max(ccDuration, 1)
  const tier = Math.floor(base)
  const stack = tier + 1
  const slow = titanSlowFactor * stack + 1
  return currentDivider * slow
}

export const CC_TIMER_FIELDS = [
  'stunTime',
  'poisonTime',
  'poisonCount',
  'lingerTime',
  'fearedTime',
  'blackHoleTime',
  'shockwaveTime',
] as const
