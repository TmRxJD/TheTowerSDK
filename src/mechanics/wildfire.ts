import { WILDFIRE_DURATION_LEVEL_SCALE, WILDFIRE_DURATION_OFFSET } from './constants'

export function getWildfireDuration(botLevel: number): number {
  return Math.max(0, botLevel) * WILDFIRE_DURATION_LEVEL_SCALE + WILDFIRE_DURATION_OFFSET
}

export interface WildfireAmplificationInput {
  wildfireActive?: boolean
  statBase: number
  statMult?: number
}

export function getWildfireAmplification(input: WildfireAmplificationInput): number {
  if (input.wildfireActive && input.statMult != null) {
    return input.statBase * input.statMult
  }
  return input.statBase
}
