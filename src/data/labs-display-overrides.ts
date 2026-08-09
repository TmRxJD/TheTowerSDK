import { labs as staticLabs } from './labs-static'
import { findLabResearchByIndex, findLabResearchBySlug } from './labs-research'
import { normalizeToolLabCategory, normalizeToolLabLookupKey } from './labs'
import {
  resolveSiteLabCategoryForSaveIndex,
  resolveSiteLabDisplayNameForSaveIndex,
  resolveSiteLabSlugForSaveIndex,
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
  staticLabs.map(lab => [
    normalizeToolLabLookupKey(lab.name),
    normalizeToolLabCategory(lab.category),
  ]),
)

export function resolveLabResearchDisplayName(
  saveIndex: number,
  extractedName: string | null | undefined,
): string | null {
  if (LAB_RESEARCH_DISPLAY_NAME_OVERRIDES[saveIndex]) {
    return LAB_RESEARCH_DISPLAY_NAME_OVERRIDES[saveIndex]
  }
  if (isUsableLabExtractedName(extractedName)) return extractedName as string
  const fromSite = resolveSiteLabDisplayNameForSaveIndex(saveIndex)
  if (fromSite) return fromSite
  return findLabResearchByIndex(saveIndex)?.displayName ?? null
}

export function resolveLabResearchSlug(
  saveIndex: number,
  extractedSlug: string | null | undefined,
): string | null {
  if (isUsableLabExtractedSlug(extractedSlug)) {
    return findLabResearchBySlug(extractedSlug!)?.slug ?? extractedSlug as string
  }
  const fromSite = resolveSiteLabSlugForSaveIndex(saveIndex)
  if (fromSite) {
    return findLabResearchBySlug(fromSite)?.slug ?? fromSite
  }
  return findLabResearchByIndex(saveIndex)?.slug ?? null
}

export function resolveLabResearchCategory(
  saveIndex: number,
  displayName: string | null,
  extractedCategory: string | null | undefined,
): string | null {
  if (displayName) {
    const fromStatic = STATIC_LAB_CATEGORY_BY_LOOKUP_KEY.get(normalizeToolLabLookupKey(displayName))
    if (fromStatic && fromStatic !== 'Other') return fromStatic
  }
  const fromSite = resolveSiteLabCategoryForSaveIndex(saveIndex)
  if (fromSite && fromSite !== 'Other') return fromSite
  if (extractedCategory) return normalizeToolLabCategory(extractedCategory)
  return null
}
