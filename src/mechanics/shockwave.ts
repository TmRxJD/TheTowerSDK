export const SHOCKWAVE_MIN_FREQUENCY_SECONDS = 7
export const SHOCKWAVE_ENHANCEMENT_BASE = 20
export const SHOCKWAVE_ENHANCEMENT_STEP = -0.15
export const SHOCKWAVE_MODULE_STAT_INDEX = 45
export const SHOCKWAVE_LEVEL_LINEAR_MULT = 10
export const SHOCKWAVE_LEVEL_LINEAR_BASE = 100

export function shockwaveFrequencySeconds(input: {
  workshopBase: number
  moduleBonus: number
  enhancementLevel: number
}): number {
  const enhancement =
    input.enhancementLevel * SHOCKWAVE_ENHANCEMENT_STEP + SHOCKWAVE_ENHANCEMENT_BASE
  const raw = enhancement - input.workshopBase - input.moduleBonus
  return Math.max(SHOCKWAVE_MIN_FREQUENCY_SECONDS, raw)
}

export function shockwaveSize(input: {
  cardSize: number
  cardUtilityLevel: number
  workshopSize: number
  enhancementLevel: number
  moduleScale: number
}): number {
  return (
    input.cardSize * input.cardUtilityLevel
    + input.workshopSize
    + input.enhancementLevel * input.moduleScale
  )
}

export function shockwavePulseDamage(input: {
  workshopDamage: number
  utilityLevel: number
  globalMult: number
}): number {
  const levelTerm = input.utilityLevel * SHOCKWAVE_LEVEL_LINEAR_MULT + SHOCKWAVE_LEVEL_LINEAR_BASE
  return (input.workshopDamage + levelTerm) * input.globalMult
}

export function tickShockwaveTimer(shockwaveTime: number, deltaTime: number): number {
  return Math.max(0, shockwaveTime - deltaTime)
}
