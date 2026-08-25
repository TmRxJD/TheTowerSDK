import { ULTIMATE_WEAPON_IMPORT_CATALOG } from './indexes'

export type UltimateWeaponCatalogRow = (typeof ULTIMATE_WEAPON_IMPORT_CATALOG)[number]

/** By save index, not array position. See findBotCatalogRow for why. */
export function findUltimateWeaponCatalogRow(index: number): UltimateWeaponCatalogRow | null {
  return ULTIMATE_WEAPON_IMPORT_CATALOG.find(row => row.index === index) ?? null
}

export function findUltimateWeaponCatalogName(index: number): string | null {
  return findUltimateWeaponCatalogRow(index)?.name ?? null
}

export function listUltimateWeaponCatalogRows(): readonly UltimateWeaponCatalogRow[] {
  return ULTIMATE_WEAPON_IMPORT_CATALOG
}

export const UW_CATALOG_SLOT_COUNT = ULTIMATE_WEAPON_IMPORT_CATALOG.length
