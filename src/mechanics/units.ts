/**
 * Unit conversions between internal combat storage and UI display.
 *
 * Combat code stores distances in **decimeters** (tenths of a meter).
 * Workshop/HUD divides by 10 for meters. Impetus stores raw float; UI shows ÷100.
 */

/** Internal dm → display meters. */
export function internalDistanceToMeters(internal: number): number {
  return internal * 10
}

/** Display meters → internal dm (used at some call sites, e.g. impetus). */
export function metersToInternalDistance(meters: number): number {
  return meters / 10
}

/** Raw impetus stat → UI "×/m" label. */
export function impetusToDisplayPerMeter(impetus: number): number {
  return impetus / 100
}

/** UI "×/m" → raw impetus stat. */
export function displayPerMeterToImpetus(display: number): number {
  return display * 100
}

/** Squared distance guard used in distance cache when center positions coincide. */
export const DISTANCE_EPSILON_SQ = 1e-4
