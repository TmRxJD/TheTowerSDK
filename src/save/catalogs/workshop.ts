import {
  WORKSHOP_ENHANCEMENT_IMPORT_CATALOG,
  WORKSHOP_IMPORT_CATALOG,
} from './indexes'

export type WorkshopCatalogRow = (typeof WORKSHOP_IMPORT_CATALOG)[number]
export type WorkshopEnhancementCatalogRow = (typeof WORKSHOP_ENHANCEMENT_IMPORT_CATALOG)[number]

export function findWorkshopCatalogRow(index: number): WorkshopCatalogRow | null {
  return WORKSHOP_IMPORT_CATALOG[index] ?? null
}

export function findWorkshopEnhancementCatalogRow(index: number): WorkshopEnhancementCatalogRow | null {
  return WORKSHOP_ENHANCEMENT_IMPORT_CATALOG[index] ?? null
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
