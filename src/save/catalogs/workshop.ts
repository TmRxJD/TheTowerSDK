import {
  WORKSHOP_ENHANCEMENT_IMPORT_CATALOG,
  WORKSHOP_IMPORT_CATALOG,
} from './indexes'

export type WorkshopCatalogRow = (typeof WORKSHOP_IMPORT_CATALOG)[number]
export type WorkshopEnhancementCatalogRow = (typeof WORKSHOP_ENHANCEMENT_IMPORT_CATALOG)[number]

/**
 * Resolve a workshop upgrade by its SAVE index, not by array position.
 *
 * These are NOT the same. `WORKSHOP_IMPORT_CATALOG` carries Wall Rebuild
 * (index 47) at array position 34, so positions 34-47 all held the wrong row:
 * asking for save index 34 (Cash Bonus) returned Wall Rebuild, 35 (Cash / Wave)
 * returned Cash Bonus, and so on for fourteen consecutive upgrades. Every one
 * of them is a plausible workshop upgrade with a plausible level, which is why
 * nothing looked wrong.
 *
 * The save decode path in shared-tool-inputs-from-save-extended.ts always
 * iterated rows and matched on `index`/`trackerKey`, so imports were never
 * affected. This function is public API of `thetowersdk/save` with no in-repo
 * caller, so the damage was confined to external consumers — which is worse to
 * leave, not better.
 */
export function findWorkshopCatalogRow(index: number): WorkshopCatalogRow | null {
  return WORKSHOP_IMPORT_CATALOG.find(row => row.index === index) ?? null
}

export function findWorkshopEnhancementCatalogRow(index: number): WorkshopEnhancementCatalogRow | null {
  return WORKSHOP_ENHANCEMENT_IMPORT_CATALOG.find(row => row.index === index) ?? null
}

export function listWorkshopCatalogRows(): readonly WorkshopCatalogRow[] {
  return WORKSHOP_IMPORT_CATALOG
}

export function listWorkshopEnhancementCatalogRows(): readonly WorkshopEnhancementCatalogRow[] {
  return WORKSHOP_ENHANCEMENT_IMPORT_CATALOG
}

export function workshopStatKeysByCategory(category: 'attack' | 'defense' | 'utility'): string[] {
  return WORKSHOP_IMPORT_CATALOG
    .filter(row => row.category === category)
    .map(row => row.trackerKey)
    .filter(value => value != null) as string[]
}

export function workshopEnhancementStatKeysByCategory(category: 'attack' | 'defense' | 'utility'): string[] {
  return WORKSHOP_ENHANCEMENT_IMPORT_CATALOG
    .filter(row => row.category === category)
    .map(row => row.trackerKey)
    .filter(value => value != null) as string[]
}
