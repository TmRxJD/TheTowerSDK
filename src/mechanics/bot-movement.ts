/** Bot wander movement and activation destination selection. */

import { UnityRandom } from './unity-random'

export const BOT_MOVEMENT_ARRIVAL_THRESHOLD_SQ = 0.25

export interface BotMovementState {
  x: number
  y: number
  destinationX: number
  destinationY: number
  finalSpeed: number
  active: boolean
}

export function botRandomDestinationScalar(rng: UnityRandom, radius: number): number {
  return rng.value() * Math.max(0, radius)
}

export function pickBotActivationDestination(
  rng: UnityRandom,
  maxDistanceDisplayMeters: number,
  radiusPercentage: number,
): { x: number, y: number } {
  const radial = Math.sqrt(Math.max(0, maxDistanceDisplayMeters)) * Math.max(0, radiusPercentage)
  const randomScale = rng.value()
  const angle = rng.value() * Math.PI * 2
  const distance = radial * randomScale
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
  }
}

export function stepBotMovementTowardDestination(
  state: BotMovementState,
  targetX: number,
  targetY: number,
  deltaSeconds: number,
): BotMovementState {
  if (!state.active) return state

  const dx = targetX - state.x
  const dy = targetY - state.y
  const distSq = dx * dx + dy * dy
  if (distSq <= BOT_MOVEMENT_ARRIVAL_THRESHOLD_SQ) {
    return { ...state, x: targetX, y: targetY }
  }

  const dist = Math.sqrt(distSq)
  const step = Math.max(0, state.finalSpeed) * Math.max(0, deltaSeconds)
  if (step >= dist) {
    return { ...state, x: targetX, y: targetY }
  }

  return {
    ...state,
    x: state.x + (dx / dist) * step,
    y: state.y + (dy / dist) * step,
  }
}

export function buildInitialBotMovementState(
  rng: UnityRandom,
  maxDistanceDisplayMeters: number,
  radiusPercentage: number,
  finalSpeed: number,
  active: boolean,
): BotMovementState {
  const dest = pickBotActivationDestination(rng, maxDistanceDisplayMeters, radiusPercentage)
  return {
    x: dest.x,
    y: dest.y,
    destinationX: dest.x,
    destinationY: dest.y,
    finalSpeed,
    active,
  }
}
