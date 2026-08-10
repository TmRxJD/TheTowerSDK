import { ULTIMATE_WEAPON_IMPORT_CATALOG } from './indexes'

export type UltimateWeaponCatalogRow = (typeof ULTIMATE_WEAPON_IMPORT_CATALOG)[number]

export function resolveUltimateWeaponCatalogRow(index: number): UltimateWeaponCatalogRow | null {
  return ULTIMATE_WEAPON_IMPORT_CATALOG[index] ?? null
}

export function resolveUltimateWeaponCatalogName(index: number): string | null {
  return resolveUltimateWeaponCatalogRow(index)?.name ?? null
}

export function listUltimateWeaponCatalogRows(): readonly UltimateWeaponCatalogRow[] {
  return ULTIMATE_WEAPON_IMPORT_CATALOG
}

export const UW_CATALOG_SLOT_COUNT = ULTIMATE_WEAPON_IMPORT_CATALOG.length
