export const REND_WORKSHOP_SLOT_PRIMARY = 0x18
export const REND_WORKSHOP_SLOT_SECONDARY = 0x12
export const REND_MODULE_SLOT = 0x2b

export interface RendArmorMultiplierInput {
  workshopUpgrade18: number
  workshopUpgrade12: number
  rendArmorStat?: number
  rendLabActive?: boolean
  rendRoll?: number
  rendThreshold?: number
}

export function rendArmorMultiplier(input: RendArmorMultiplierInput): number {
  let mult = 1
  mult *= input.workshopUpgrade18 + 1
  mult *= input.workshopUpgrade12 + 1

  if (
    input.rendLabActive
    && input.rendArmorStat != null
    && input.rendRoll != null
    && input.rendThreshold != null
    && input.rendRoll < input.rendThreshold
  ) {
    mult *= input.rendArmorStat
  }

  return mult
}

/** Effective damage after rend reduction term. */
export function applyRendReduction(rawDamage: number, rendMult: number): number {
  const reduction = rawDamage * (rendMult - 1) / Math.max(rendMult, 1e-12)
  return Math.max(0, rawDamage - reduction)
}
