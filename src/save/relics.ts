import { RELIC_TEMPLATES } from '../data/relics'
import { IMPORT_CATALOG_META, RELIC_IMPORT_CATALOG } from './catalogs/indexes'
import { listRelicCatalogRows, resolveRelicLabel } from './catalogs/relics'
import {
  buildRelicTemplateIdLookup,
  resolveRelicTemplateIdFromSaveIndex,
} from './catalogs/relic-template-match'
import { extractCollectedThemeNamesFromSaveRoot } from './themes'
import { coerceSaveArray, toNumberArrayPreserveLength } from './workshop'
import { readSaveBoolean, readSaveEnumValue } from './read-values'
export const RELICS_SAVE_PROFILE_KEY = 'profileRelics'
export const RELICS_SAVE_UNLOCKED_KEY = 'relicsUnlocked'

/** Relics.RelicState enum: 0 = locked, 1+ = unlocked (2 = fully unlocked in some saves). */
export const RELIC_STATE_UNLOCKED_VALUE = 1

export interface RelicSaveRow {
  index: number
  name: string | null
  label: string
  description: string | null
  unlocked: boolean
  onProfile: boolean
}

export interface RelicsSaveExtract {
  relics: RelicSaveRow[]
  profileRelicIndices: number[]
  unlockedCount: number
  warnings: string[]
}

function isRelicStateUnlocked(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  const state = readSaveEnumValue(value)
  return state != null && state >= RELIC_STATE_UNLOCKED_VALUE
}

function readRelicUnlockedFlags(raw: unknown, catalogLength: number): boolean[] {
  const source = coerceSaveArray(raw)
  if (source.length === 0 && !Array.isArray(raw)) return []

  if (source.every(value => typeof value === 'boolean')) {
    return source.map(readSaveBoolean)
  }

  const flags = Array.from({ length: Math.max(catalogLength, source.length) }, () => false)
  for (let index = 0; index < source.length; index += 1) {
    const item = source[index]
    if (typeof item === 'boolean') {
      flags[index] = item
      continue
    }
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>
      if ('unlocked' in record) {
        flags[index] = readSaveBoolean(record.unlocked)
        continue
      }
      if ('typeName' in record && String(record.typeName).includes('RelicState')) {
        flags[index] = isRelicStateUnlocked(item)
        continue
      }
      if ('value__' in record) {
        flags[index] = isRelicStateUnlocked(item)
      }
    }
  }
  return flags
}

function buildUnlockedSet(profileIndices: number[], unlockedFlags: boolean[]): Set<number> {
  const unlocked = new Set<number>()
  for (const index of profileIndices) {
    if (index >= 0) unlocked.add(index)
  }
  unlockedFlags.forEach((flag, index) => {
    if (flag) unlocked.add(index)
  })
  return unlocked
}

export function extractRelicsFromSaveRoot(root: Record<string, unknown> | null): RelicsSaveExtract | null {
  if (!root) return null

  const warnings: string[] = []
  const catalog = listRelicCatalogRows()
  const catalogLength = Math.max(catalog.length, RELIC_IMPORT_CATALOG.length)

  if (catalogLength === 0) {
    warnings.push('Relic catalog is not imported from game data yet.')
  }

  const profileRelicIndices = toNumberArrayPreserveLength(root[RELICS_SAVE_PROFILE_KEY])
    .filter(index => index >= 0)
  const unlockedFlags = readRelicUnlockedFlags(root[RELICS_SAVE_UNLOCKED_KEY], catalogLength)
  const unlockedSet = buildUnlockedSet(profileRelicIndices, unlockedFlags)

  if (profileRelicIndices.length === 0 && unlockedFlags.length === 0) {
    warnings.push('No relic unlock arrays found (profileRelics, relicsUnlocked).')
  }

  if (!IMPORT_CATALOG_META.populated.relics) {
    warnings.push('Relic names are not mapped yet; showing index labels only.')
  }

  // A save written by an older game version has fewer relic slots than the
  // catalog. Those trailing relics are absent from the save, not locked — say so,
  // otherwise the result looks like the player is missing relics they never had
  // the chance to earn. The labs extractor reports the same situation.
  const savedSlotCount = coerceSaveArray(root[RELICS_SAVE_UNLOCKED_KEY]).length
  if (savedSlotCount > 0 && savedSlotCount < catalogLength) {
    warnings.push(
      `relicsUnlocked has ${savedSlotCount} entries; catalog has ${catalogLength}. `
      + `Relics ${savedSlotCount}-${catalogLength - 1} are absent from this save, not locked.`,
    )
  }

  const slotCount = Math.max(catalogLength, profileRelicIndices.length, unlockedFlags.length)
  const relics: RelicSaveRow[] = Array.from({ length: slotCount }, (_, index) => ({
    index,
    name: catalog[index]?.name ?? null,
    label: resolveRelicLabel(index) ?? `Relic ${index + 1}`,
    description: catalog[index]?.description ?? null,
    unlocked: unlockedSet.has(index),
    onProfile: profileRelicIndices.includes(index),
  }))

  return {
    relics,
    profileRelicIndices,
    unlockedCount: relics.filter(relic => relic.unlocked).length,
    warnings,
  }
}

export function listUnlockedRelics(extract: RelicsSaveExtract): RelicSaveRow[] {
  return extract.relics.filter(relic => relic.unlocked)
}

const RELIC_TEMPLATE_ID_LOOKUP = buildRelicTemplateIdLookup(RELIC_TEMPLATES)

export function resolveRelicTemplateIdForSaveIndex(saveIndex: number): string | null {
  return resolveRelicTemplateIdFromSaveIndex(saveIndex, RELIC_TEMPLATES, RELIC_TEMPLATE_ID_LOOKUP)
}

export interface RelicsTrackerSaveImportPayload {
  collectedRelicIds: string[]
  collectedThemeNames: string[]
  unmatchedSaveIndices: number[]
}

export function buildRelicsTrackerImportPayload(extract: RelicsSaveExtract): RelicsTrackerSaveImportPayload | null {
  const unlockedRelics = listUnlockedRelics(extract)
  if (unlockedRelics.length === 0) return null

  const collectedRelicIds: string[] = []
  const unmatchedSaveIndices: number[] = []
  const seen = new Set<string>()

  for (const relic of unlockedRelics) {
    const templateId = resolveRelicTemplateIdForSaveIndex(relic.index)
    if (!templateId) {
      unmatchedSaveIndices.push(relic.index)
      continue
    }
    if (seen.has(templateId)) continue
    seen.add(templateId)
    collectedRelicIds.push(templateId)
  }

  if (collectedRelicIds.length === 0) return null

  return { collectedRelicIds, collectedThemeNames: [], unmatchedSaveIndices }
}

export function buildRelicsTrackerImportPayloadFromSaveRoot(
  root: Record<string, unknown> | null,
): RelicsTrackerSaveImportPayload | null {
  const extract = extractRelicsFromSaveRoot(root)
  const relicPart = extract ? buildRelicsTrackerImportPayload(extract) : null
  const collectedThemeNames = extractCollectedThemeNamesFromSaveRoot(root)
  if (!relicPart && collectedThemeNames.length === 0) return null
  return {
    collectedRelicIds: relicPart?.collectedRelicIds ?? [],
    collectedThemeNames,
    unmatchedSaveIndices: relicPart?.unmatchedSaveIndices ?? [],
  }
}

export function canImportRelicsToTracker(
  extract: RelicsSaveExtract | null,
  root: Record<string, unknown> | null = null,
): boolean {
  if (extract && buildRelicsTrackerImportPayload(extract)) return true
  return extractCollectedThemeNamesFromSaveRoot(root).length > 0
}
