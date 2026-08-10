/**
 * Poison Swamp — ultimate weapon index 6 (`SwampController`).
 *
 * ## Tick damage pipeline
 *
 *   baseDamage = Main.poisonSwampDamage
 *   moduleMult = GetModulePoisonMult(Main)              // ≥ 1
 *   globalMult = shared UW damage scalar
 *
 *   tickDamage = baseDamage
 *              × moduleMult
 *              × globalMult
 *              × Main[uwScalarA] × globalMult
 *              × (Main[uwScalarB] + 1)
 *              × (Main[uwScalarC] × globalMult + Main[uwScalarD] × globalMult + 1)
 *              × enemyFactors
 *              × getSwampRendMult(stackCount)
 *
 * ## Rend armor interaction
 *
 * When rend lab active and stackCount ≥ 1:
 *
 *   rendMult = (swampRendLabValue − 1) × stackCount + 1
 *
 * Otherwise rendMult = 1. Labs: swamp_rend_basic_enemies (156), swamp_rend_additional_enemies (157).
 *
 * ## Poison stack ramp (fractional — not +1 per hit)
 *
 *   poisonStack += 1 / poisonTickInterval
 *
 * Running stack stored on enemy swamp state; faster ticks ⇒ stacks climb faster.
 *
 * ## Pool linger
 *
 * Each active swamp overlap adds +10 s to enemy poison timer per refresh.
 *
 * ## Stun proc prerequisites
 *
 * - Lab 57 (`swamp_stun`) must be unlocked
 * - `PoisonSwampStunOff` save flag bypasses entire branch
 *
 * ## Stun chance weight
 *
 *   stunWeight = labLevel[swamp_stun_chance] × Main.uwStunModifier + 1.0
 *
 * Actual proc uses cumulative RNG gates (below), not flat percent.
 *
 * ## Stun duration before RNG
 *
 *   halfStun = (lab57Level + 1) × 0.5
 *   fullStun = (lab57Level + 1) × 2.5
 *
 * If lab 59 (`swamp_stun_time`) active:
 *
 *   extra = (lab59Level + 1) × 2 + 1
 *   halfStun ×= extra
 *   fullStun ×= extra
 *
 * Stun card/relic divider:
 *
 *   appliedFullStun = fullStun / (stunCardMult + 1)
 *
 * ## Stun RNG tiers (partial vs full vs none)
 *
 * Let durationBase = scaleSwampDuration(ccRating, labMult, inputMult):
 *
 *   partialGate = durationBase × 2.7 + enemy.stunDebt
 *   fullGate    = durationBase × 2.5 + durationBase × 2.7 + stunDebt
 *
 *   roll = Uniform(0, 1)
 *   if roll ≤ partialGate:     apply partial stun
 *   elif roll > fullGate:     apply full stun; refresh stunDebt = roll
 *   else:                     no stun this tick
 *
 * `stunDebt` on enemy makes repeated stuns within a window harder — not independent rolls.
 */

import {
  SWAMP_POISON_LINGER_SECONDS,
  SWAMP_STUN_FULL_GATE_MULT,
  SWAMP_STUN_FULL_MULT,
  SWAMP_STUN_HALF_MULT,
  SWAMP_STUN_PARTIAL_GATE_MULT,
} from './constants'
import { scaleSwampDuration } from './lab-research'

export interface SwampTickDamageInput {
  poisonSwampDamage: number
  modulePoisonMult: number
  globalUwMult: number
  uwScalarA: number
  uwScalarB: number
  uwScalarC: number
  uwScalarD: number
  enemyFactor?: number
  stackCount: number
  rendLabValue?: number
  rendLabActive?: boolean
}

export function getSwampRendMult(
  stackCount: number,
  rendLabValue: number,
  rendLabActive: boolean,
): number {
  if (!rendLabActive || stackCount < 1) return 1
  return (rendLabValue - 1) * stackCount + 1
}

export function poisonSwampTickDamage(input: SwampTickDamageInput): number {
  const enemyFactor = input.enemyFactor ?? 1
  const rendMult = getSwampRendMult(
    input.stackCount,
    input.rendLabValue ?? 1,
    input.rendLabActive ?? false,
  )

  const chain =
    input.modulePoisonMult
    * input.globalUwMult
    * input.uwScalarA
    * input.globalUwMult
    * (input.uwScalarB + 1)
    * (input.uwScalarC * input.globalUwMult + input.uwScalarD * input.globalUwMult + 1)

  return input.poisonSwampDamage * chain * enemyFactor * rendMult
}

/** Fractional stack increment per swamp tick. */
export function poisonStackIncrement(poisonTickInterval: number): number {
  if (poisonTickInterval <= 0) return 0
  return 1 / poisonTickInterval
}

export function refreshPoisonLinger(currentPoisonTime: number): number {
  return currentPoisonTime + SWAMP_POISON_LINGER_SECONDS
}

export interface SwampStunDurationInput {
  lab57Level: number
  lab59Level?: number
  lab59Active?: boolean
  stunCardMult?: number
}

export function swampStunDurations(input: SwampStunDurationInput): {
  halfStun: number
  fullStun: number
  appliedFullStun: number
} {
  let halfStun = (input.lab57Level + 1) * SWAMP_STUN_HALF_MULT
  let fullStun = (input.lab57Level + 1) * SWAMP_STUN_FULL_MULT

  if (input.lab59Active && input.lab59Level != null) {
    const extra = (input.lab59Level + 1) * 2 + 1
    halfStun *= extra
    fullStun *= extra
  }

  const cardDiv = (input.stunCardMult ?? 0) + 1
  return { halfStun, fullStun, appliedFullStun: fullStun / cardDiv }
}

export interface SwampStunRollInput {
  ccRating: number
  labMult: number
  inputMult: number
  stunDebt: number
  roll: number
}

export type SwampStunOutcome = 'partial' | 'full' | 'none'

export function swampStunRoll(input: SwampStunRollInput): {
  outcome: SwampStunOutcome
  partialGate: number
  fullGate: number
  newStunDebt: number
} {
  const durationBase = scaleSwampDuration(input.ccRating, input.labMult, input.inputMult)
  const partialGate = durationBase * SWAMP_STUN_PARTIAL_GATE_MULT + input.stunDebt
  const fullGate =
    durationBase * SWAMP_STUN_FULL_GATE_MULT + durationBase * SWAMP_STUN_PARTIAL_GATE_MULT + input.stunDebt

  if (input.roll <= partialGate) {
    return { outcome: 'partial', partialGate, fullGate, newStunDebt: input.stunDebt }
  }
  if (input.roll > fullGate) {
    return { outcome: 'full', partialGate, fullGate, newStunDebt: input.roll }
  }
  return { outcome: 'none', partialGate, fullGate, newStunDebt: input.stunDebt }
}

export function swampStunWeight(
  lab58Level: number,
  uwStunModifier: number,
): number {
  return lab58Level * uwStunModifier + 1
}
