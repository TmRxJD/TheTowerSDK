import { findLabResearchBySlug } from './labs-research'
import { SITE_LAB_SLUG_ALIASES } from './labs-categories'

function clampInt(value: number, min: number, max: number): number {
  return Math.floor(Math.min(max, Math.max(min, value)))
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s]+/g, ' ')
}

/**
 * Resolve a research lab level from tracker display-name keyed levels.
 * Matches slug, canonical slug, catalog displayName, and fuzzy display-name equality.
 */
export function computeResearchLabLevel(
  researchLabLevels: Record<string, number>,
  slug: string,
  maxLevel = 99,
): number {
  const canonical = SITE_LAB_SLUG_ALIASES[slug] ?? slug
  const research = findLabResearchBySlug(canonical) ?? findLabResearchBySlug(slug)
  const candidateKeys = [
    slug,
    canonical,
    research?.displayName,
    research?.slug,
  ].filter((key): key is string => typeof key === 'string' && key.length > 0)

  for (const key of candidateKeys) {
    const value = researchLabLevels[key]
    if (Number.isFinite(value)) {
      return clampInt(value, 0, maxLevel)
    }
  }

  if (research?.displayName) {
    const target = normalizeLookupKey(research.displayName)
    for (const [key, value] of Object.entries(researchLabLevels)) {
      if (!Number.isFinite(value)) continue
      if (normalizeLookupKey(key) === target) {
        return clampInt(value, 0, maxLevel)
      }
    }
  }

  return 0
}
