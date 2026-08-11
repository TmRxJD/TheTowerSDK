/**
 * Builds CustomizeGame workshop table floats (`LabCalculations`).
 *
 * Wave Info display reads these precomputed floats — never invents per-row lab math.
 */
import type { BattleConditionSelection } from './battle-condition-config'
import {
  LAB_WORKSHOP_ENEMY_EXTENDED_OFFSETS,
  LAB_WORKSHOP_META_OFFSETS,
  labWorkshopEnemyExtendedFloat,
  labWorkshopMetaSlots,
} from './lab-workshop-calculations'

export interface WorkshopTableBuildInput {
  tier: number
  labLevels: Readonly<Record<string, number>>
  battleConditions: readonly BattleConditionSelection[]
  /**
   * Main workshop lab factor — multiplied by labs speed slot for divisor s13.
   * Omit to use 1.
   */
  mainWorkshopLabFactor?: number
  /** Persisted CustomizeGame workshop meta slots before LabCalculations. */
  existingWorkshopMetaSlots?: Readonly<{
    labs_speed?: number
    labs_coin_discount?: number
  }>
}

export type WorkshopTableFloatMap = Map<number, number>

const F32 = Math.fround

export function computeMainWorkshopLabFactor(
  _tier: number,
  override?: number,
): number {
  if (override != null && Number.isFinite(override)) return F32(override)
  return 1
}

/** Merge enemy research labs with meta labs that seed workshop[0xAC]/[0xB0]. */
export function mergeWorkshopLabLevels(
  enemyLabLevels: Readonly<Record<string, number>> = {},
  metaLabs: Readonly<Record<string, number>> = {},
): Record<string, number> {
  return {
    ...enemyLabLevels,
    labs_coin_discount: Math.max(
      0,
      Math.floor(metaLabs.labs_coin_discount ?? enemyLabLevels.labs_coin_discount ?? 0),
    ),
    labs_speed: Math.max(
      0,
      Math.floor(metaLabs.labs_speed ?? enemyLabLevels.labs_speed ?? 0),
    ),
  }
}

/** Full workshop float table for Wave Info (CustomizeGame element offsets). */
export function buildWorkshopTableFloats(input: WorkshopTableBuildInput): WorkshopTableFloatMap {
  const table: WorkshopTableFloatMap = new Map()
  const mainFactor = computeMainWorkshopLabFactor(input.tier, input.mainWorkshopLabFactor)
  const meta = labWorkshopMetaSlots(input.labLevels, mainFactor, {
    existingLabsSpeedSlot: input.existingWorkshopMetaSlots?.labs_speed,
    existingCoinDiscountSlot: input.existingWorkshopMetaSlots?.labs_coin_discount,
  })

  table.set(LAB_WORKSHOP_META_OFFSETS.labs_coin_discount, meta.coinDiscount)
  table.set(LAB_WORKSHOP_META_OFFSETS.labs_speed, meta.labsSpeed)

  const existingCommonBaseline = table.get(LAB_WORKSHOP_ENEMY_EXTENDED_OFFSETS.common_enemy_health) ?? 0
  const enemyDivisorS13 = meta.divisorS13

  for (const [slug, offset] of Object.entries(LAB_WORKSHOP_ENEMY_EXTENDED_OFFSETS)) {
    const level = Math.max(0, Math.floor(input.labLevels[slug] ?? 0))
    if (level <= 0) continue
    const value = labWorkshopEnemyExtendedFloat(
      slug,
      level,
      existingCommonBaseline,
      enemyDivisorS13,
    )
    if (value != null) table.set(offset, value)
  }

  return table
}

export function workshopTableFloatFromBuild(
  offset: number,
  input: WorkshopTableBuildInput,
  cache?: WorkshopTableFloatMap,
): number {
  const map = cache ?? buildWorkshopTableFloats(input)
  return map.get(offset) ?? 0
}
