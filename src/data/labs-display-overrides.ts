import { LAB_CATALOG } from './labs-catalog'
import { findLabResearchByIndex, findLabResearchBySlug } from './labs-research'
import { normalizeToolLabCategory, normalizeToolLabLookupKey } from './labs'
import {
  findSiteLabCategoryForSaveIndex,
  findSiteLabDisplayNameForSaveIndex,
  findSiteLabSlugForSaveIndex,
} from './labs-categories'

export const LAB_RESEARCH_DISPLAY_NAME_OVERRIDES: Readonly<Record<number, string>> = {
  238: 'Dissonant Echo - Ultimate Weapons',
  239: 'Dissonant Echo - Attack',
  240: 'Dissonant Echo - Defense',
  241: 'Dissonant Echo - Utility',
}

/**
 * Malformed lab keys that some older saves and settings blobs contain, mapped to
 * the display name they were meant to be. Used when resolving a persisted key.
 */
export const LAB_RESEARCH_LEGACY_LEVEL_KEYS: Readonly<Record<string, string>> = {
  'AssetsTools.NET.AssetTypeArrayInfo': 'Damage',
  'Labs Coin Discount': 'Lab Coin Discount',
  'Labs Speed': 'Lab Speed',
}

const GARBAGE_LAB_EXTRACTED_NAME = /AssetsTools\.NET|AssetType(ArrayInfo)?/i
const GARBAGE_LAB_EXTRACTED_SLUG = /assetstools/i

function isUsableLabExtractedName(name: string | null | undefined): boolean {
  if (!name || name === 'None') return false
  if (GARBAGE_LAB_EXTRACTED_NAME.test(name)) return false
  return true
}

function isUsableLabExtractedSlug(slug: string | null | undefined): boolean {
  if (!slug) return false
  if (GARBAGE_LAB_EXTRACTED_SLUG.test(slug)) return false
  return Boolean(findLabResearchBySlug(slug)?.slug)
}

const STATIC_LAB_CATEGORY_BY_LOOKUP_KEY = new Map(
  LAB_CATALOG.flatMap(lab => [
    [normalizeToolLabLookupKey(lab.name), normalizeToolLabCategory(lab.category)] as const,
    [normalizeToolLabLookupKey(lab.slug), normalizeToolLabCategory(lab.category)] as const,
  ]),
)

export function findLabResearchDisplayName(
  saveIndex: number,
  extractedName: string | null | undefined,
): string | null {
  if (LAB_RESEARCH_DISPLAY_NAME_OVERRIDES[saveIndex]) {
    return LAB_RESEARCH_DISPLAY_NAME_OVERRIDES[saveIndex]
  }
  if (isUsableLabExtractedName(extractedName)) return extractedName as string
  const fromSite = findSiteLabDisplayNameForSaveIndex(saveIndex)
  if (fromSite) return fromSite
  return findLabResearchByIndex(saveIndex)?.displayName ?? null
}

export function findLabResearchSlug(
  saveIndex: number,
  extractedSlug: string | null | undefined,
): string | null {
  if (isUsableLabExtractedSlug(extractedSlug)) {
    return findLabResearchBySlug(extractedSlug!)?.slug ?? extractedSlug as string
  }
  const fromSite = findSiteLabSlugForSaveIndex(saveIndex)
  if (fromSite) {
    return findLabResearchBySlug(fromSite)?.slug ?? fromSite
  }
  return findLabResearchByIndex(saveIndex)?.slug ?? null
}

export function findLabResearchCategory(
  saveIndex: number,
  displayName: string | null,
  extractedCategory: string | null | undefined,
): string | null {
  if (displayName) {
    const fromStatic = STATIC_LAB_CATEGORY_BY_LOOKUP_KEY.get(normalizeToolLabLookupKey(displayName))
    if (fromStatic && fromStatic !== 'Other') return fromStatic
  }
  const fromSite = findSiteLabCategoryForSaveIndex(saveIndex)
  if (fromSite && fromSite !== 'Other') return fromSite
  if (extractedCategory) return normalizeToolLabCategory(extractedCategory)
  return null
}
