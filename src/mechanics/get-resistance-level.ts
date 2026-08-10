/**
 * CustomizeGame.GetResistanceLevel.
 *
 *   1 + heatLevel[i] * (-0.01) * ((1 - perBcWorkshopBase) - workshopGlobalResistance)
 *
 * Per-BC workshop bases use resistance BC table offsets.
 */
import { LAB_WORKSHOP_SCALE } from './lab-workshop-constants'
import { LAB_WORKSHOP_RESISTANCE_BASE_OFFSETS } from './lab-workshop-constants'

const F32 = Math.fround

export type ResistanceBcName = keyof typeof LAB_WORKSHOP_RESISTANCE_BASE_OFFSETS

export interface GetResistanceLevelInput {
  /** heatLevel[conditionIndex] byte */
  heatLevel: number
  /** Global resistance workshop float (CustomizeGame workshop table). */
  workshopGlobal0x33C: number
  /** Per-BC base float already on workshop table (defaults 0 before merge). */
  perBcWorkshopBase: number
}

/** GetResistanceLevel return (f32). */
export function getResistanceLevel(input: GetResistanceLevelInput): number {
  const heat = Math.max(0, Math.floor(input.heatLevel))
  const perBc = F32(input.perBcWorkshopBase)
  const global33c = F32(input.workshopGlobal0x33C)
  const inner = F32(F32(1 - perBc) - global33c)
  const scaled = F32(F32(heat) * F32(LAB_WORKSHOP_SCALE) * inner)
  return F32(1 + scaled)
}

export function resistanceBcWorkshopBaseOffset(bcName: string): number | undefined {
  return LAB_WORKSHOP_RESISTANCE_BASE_OFFSETS[
    bcName as ResistanceBcName
  ]
}
