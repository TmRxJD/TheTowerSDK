import {
  GUARDIAN_CHIP_IMPORT_CATALOG,
  GUARDIAN_CHIP_TYPE_ENUM,
} from '../../data/player-stats'
import {
  GUARDIAN_CHIP_CATALOG,
  GUARDIAN_CHIP_SLOT_CATALOG,
  GUARDIAN_SKIN_IMPORT_CATALOG,
  IMPORT_CATALOG_META,
} from './indexes'
import { GUARDIANS_ASSET_TABLE } from '../../data/assets'

export interface ActiveGuardianChipRow {
  index: number
  slotIndex?: number | null
  chipType: string
  trackerKey: string | null
  label: string
  description?: string | null
}

export type GuardianChipCatalogRow = ActiveGuardianChipRow

export interface GuardianSkinCatalogRow {
  index: number
  label: string
  saveFields: {
    unlocked: string
    selected: string
  }
}

function activeChipRows(): readonly ActiveGuardianChipRow[] {
  if (IMPORT_CATALOG_META.populated.guardians && GUARDIAN_CHIP_CATALOG.length > 0) {
    return GUARDIAN_CHIP_CATALOG as readonly ActiveGuardianChipRow[]
  }
  return GUARDIAN_CHIP_IMPORT_CATALOG as readonly ActiveGuardianChipRow[]
}

export function findGuardianChipCatalogRow(index: number): ActiveGuardianChipRow | null {
  return activeChipRows()[index] ?? null
}

export function getGuardianChipLabel(index: number): string {
  const catalog = findGuardianChipCatalogRow(index)
  if (!catalog) return `Chip ${index + 1}`

  if (catalog.label?.trim()) return catalog.label

  const assetTable = GUARDIANS_ASSET_TABLE as unknown as {
    chipNames?: readonly (string | null)[]
    modifierName?: readonly (string | null)[]
  } | null
  const assetNames = assetTable?.chipNames ?? assetTable?.modifierName
  const slotIndex = catalog.slotIndex ?? index
  const assetName = assetNames?.[slotIndex]
  if (assetName && assetName.trim()) return assetName

  return catalog.chipType ?? `Chip ${index + 1}`
}

export function findGuardianChipTrackerKey(index: number): string | null {
  return findGuardianChipCatalogRow(index)?.trackerKey ?? null
}

export function findGuardianSkinCatalogRow(index: number): GuardianSkinCatalogRow | null {
  const rows = GUARDIAN_SKIN_IMPORT_CATALOG as readonly GuardianSkinCatalogRow[]
  return rows[index] ?? null
}

export function getGuardianSkinLabel(index: number): string {
  return findGuardianSkinCatalogRow(index)?.label ?? `Skin ${index + 1}`
}

export function listGuardianChipCatalogRows(): readonly ActiveGuardianChipRow[] {
  return activeChipRows()
}

export function listGuardianChipSlotCatalogRows(): typeof GUARDIAN_CHIP_SLOT_CATALOG {
  return GUARDIAN_CHIP_SLOT_CATALOG
}

export function findGuardianChipCatalogRowBySlotIndex(slotIndex: number): ActiveGuardianChipRow | null {
  return listGuardianChipCatalogRows().find(row => row.slotIndex === slotIndex) ?? null
}

export function getGuardianChipSlotLabel(slotIndex: number): string {
  const slotRow = GUARDIAN_CHIP_SLOT_CATALOG[slotIndex]
  if (slotRow?.label?.trim()) return slotRow.label
  return findGuardianChipCatalogRowBySlotIndex(slotIndex)?.label ?? `Chip ${slotIndex + 1}`
}

export function findGuardianChipTrackerKeyBySlotIndex(slotIndex: number): string | null {
  return findGuardianChipCatalogRowBySlotIndex(slotIndex)?.trackerKey ?? null
}

export function listGuardianSkinCatalogRows(): readonly GuardianSkinCatalogRow[] {
  return GUARDIAN_SKIN_IMPORT_CATALOG as readonly GuardianSkinCatalogRow[]
}

export function listGuardianChipTypeEnum(): typeof GUARDIAN_CHIP_TYPE_ENUM {
  return GUARDIAN_CHIP_TYPE_ENUM
}

export function isGuardianCatalogPopulated(): boolean {
  return IMPORT_CATALOG_META.populated.guardians && GUARDIAN_CHIP_CATALOG.length > 0
}

export function isGuardianSkinCatalogPopulated(): boolean {
  return IMPORT_CATALOG_META.populated.guardianSkins && GUARDIAN_SKIN_IMPORT_CATALOG.length > 0
}
