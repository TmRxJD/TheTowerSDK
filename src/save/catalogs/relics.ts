import {
  IMPORT_CATALOG_META,
  RELIC_IMPORT_CATALOG,
} from './indexes'

export interface RelicCatalogRow {
  index: number
  name: string | null
  label: string
  description: string | null
  benefit: string | number | null
  benefitType: string | number | null
  unlockDescription: string | null
  slug?: string
  saveFields: {
    profile: string
    unlocked: string
  }
}

const relicRows = (): readonly RelicCatalogRow[] =>
  RELIC_IMPORT_CATALOG as unknown as readonly RelicCatalogRow[]

export function resolveRelicCatalogRow(index: number): RelicCatalogRow | null {
  return relicRows()[index] ?? null
}

export function resolveRelicLabel(index: number): string | null {
  return resolveRelicCatalogRow(index)?.label ?? null
}

export function listRelicCatalogRows(): readonly RelicCatalogRow[] {
  return relicRows()
}

export function isRelicCatalogPopulated(): boolean {
  return IMPORT_CATALOG_META.populated.relics && relicRows().length > 0
}

export function buildRelicCatalogLookup(): ReadonlyMap<number, RelicCatalogRow> {
  return new Map(relicRows().map(row => [row.index, row]))
}
