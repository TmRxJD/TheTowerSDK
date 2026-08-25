// Lab research identity — hand-owned.
//
// The catalog DATA is generated into labs-research-data.ts from the asset
// tables; this module owns everything that is a decision rather than an
// extraction: category enrichment from the site catalog, the legacy-alias aware
// finders, and loose-name matching.
//
// The two were one file until 2026-08-18, and that was the problem. The file
// was generated, then hand-extended, so `pnpm generate:lab-research-ts` would
// silently destroy ~400 lines of logic and four hand-written names. Nobody ran
// it, its input rotted unnoticed for two months, and the rot only surfaced when
// a stray `AssetsTools.NET.AssetTypeArrayInfo` was traced back to source.
//
// Keep the split: anything the extraction can answer belongs in the generated
// module, anything requiring judgement belongs here. Import lab data from THIS
// module — labs-research-data.ts is an implementation detail.

import { LAB_CATALOG } from './labs-catalog'
import {
  displayNameToLabSlug,
  LAB_RESEARCH_BY_INDEX,
  LAB_RESEARCH_COUNT,
  LAB_RESEARCH_LEGACY_SLUG_ALIASES,
  LAB_RESEARCH_SLUG_TO_INDEX,
} from './labs-research-data'
import type { LabResearchRecord } from './labs-research-data'

export type { LabResearchRecord }
export {
  LAB_RESEARCH_BY_INDEX,
  LAB_RESEARCH_COUNT,
  LAB_RESEARCH_LEGACY_SLUG_ALIASES,
  LAB_RESEARCH_SLUG_TO_INDEX,
  displayNameToLabSlug,
}

export function findLabResearchByIndex(index: number): LabResearchRecord | undefined {
  // Own keys only: save indices arrive as strings often enough that a plain lookup can
  // land on `Object.prototype` and return a function from a record-returning signature.
  if (!Object.prototype.hasOwnProperty.call(LAB_RESEARCH_BY_INDEX, index)) return undefined
  const record = LAB_RESEARCH_BY_INDEX[index]
  return record ? enrichLabResearchCategory(record) : undefined
}

function normalizeLabCategory(type: string | null | undefined): string {
  const raw = String(type || '').trim()
  if (!raw) return 'Other'

  const normalized = raw
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (normalized === 'main') return 'Main'
  if (normalized === 'attack') return 'Attack'
  if (normalized === 'defense') return 'Defense'
  if (normalized === 'utility') return 'Utility'
  if (normalized === 'ultimate weapon' || normalized === 'ultimate weapons') return 'Ultimate Weapon'
  if (normalized === 'cards') return 'Cards'
  if (normalized === 'card masteries' || normalized === 'card mastery') return 'Card Masteries'
  if (normalized === 'perks') return 'Perks'
  if (normalized === 'bots' || normalized === 'bot') return 'Bots'
  if (normalized === 'enemies' || normalized === 'enemy') return 'Enemies'
  if (normalized === 'modules' || normalized === 'module') return 'Modules'
  if (normalized === 'battle conditions' || normalized === 'battle condition') return 'Battle Conditions'
  if (normalized.startsWith('battle condition ')) return 'Battle Conditions'
  if (normalized.startsWith('battle condition (')) return 'Battle Conditions'

  return raw
}

const SITE_LAB_TYPE_BY_SLUG = (() => {
  const bySlug = new Map<string, string>()
  for (const lab of LAB_CATALOG) {
    if (!lab.category) continue
    bySlug.set(lab.slug, normalizeLabCategory(lab.category))
  }
  for (const [alias, target] of Object.entries(LAB_RESEARCH_LEGACY_SLUG_ALIASES)) {
    const category = bySlug.get(alias)
    if (category && category !== 'Other') {
      bySlug.set(target, category)
    }
  }
  return bySlug
})()

function enrichLabResearchCategory(record: LabResearchRecord): LabResearchRecord {
  if (record.category) return record

  const slugCandidates = new Set<string>()
  if (record.slug) slugCandidates.add(record.slug)
  for (const [alias, target] of Object.entries(LAB_RESEARCH_LEGACY_SLUG_ALIASES)) {
    if (target === record.slug) slugCandidates.add(alias)
    if (alias === record.slug) slugCandidates.add(target)
  }

  for (const slug of slugCandidates) {
    const category = SITE_LAB_TYPE_BY_SLUG.get(slug)
    if (category && category !== 'Other') {
      return { ...record, category }
    }
  }

  return record
}

export function findLabResearchBySlug(slug: string): LabResearchRecord | undefined {
  const normalized = String(slug || '').trim().toLowerCase()
  if (!normalized) return undefined
  const resolved = LAB_RESEARCH_LEGACY_SLUG_ALIASES[normalized] ?? normalized
  const index = LAB_RESEARCH_SLUG_TO_INDEX[resolved] ?? LAB_RESEARCH_SLUG_TO_INDEX[normalized]
  const record = index === undefined ? undefined : LAB_RESEARCH_BY_INDEX[index]
  return record ? enrichLabResearchCategory(record) : undefined
}

export function findLabResearchByDisplayName(displayName: string): LabResearchRecord | undefined {
  const target = displayName.trim().toLowerCase()
  const record = LAB_RESEARCH_BY_INDEX.find(row => row.displayName?.trim().toLowerCase() === target)
  return record ? enrichLabResearchCategory(record) : undefined
}

/**
 * THE resolver for turning anything that names a lab — slug, display name, or a
 * punctuation variant of either — into its catalog record.
 *
 * Use this and nothing else. Lab identity previously had four competing
 * sources: a lazily-populated `labCache`, a 71-entry static level table, a
 * slug-to-display-name bridge, and the catalog. Each had a different idea of
 * which labs exist, so a lookup silently landed on whichever answered first and
 * a miss produced a bogus fallback cap rather than an error. That is how real
 * lab levels got clamped down to a wrong maximum.
 *
 * The catalog holds all 250 labs and every one carries a `levelMax`, so it is a
 * strict superset of every other source. There is no fallback here by design:
 * an unresolvable name returns undefined, and callers must treat that as "not a
 * lab" rather than substituting a default.
 */
export function findLabResearchRecord(nameOrSlug: string | null | undefined): LabResearchRecord | undefined {
  const raw = String(nameOrSlug || '').trim()
  if (!raw) return undefined
  return findLabResearchBySlug(raw) ?? findLabResearchByLooseName(raw)
}

/** Lowercase and drop every non-alphanumeric character. */
function looseLabKey(value: string): string {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

let looseNameIndex: Map<string, number> | null = null

/**
 * Finds a lab whose name matches ignoring punctuation and spacing.
 *
 * The catalog and the tracker disagree on separators — the catalog has
 * `Dissonant Echo - Defense` and `Assist Module Bonus - Cannon` where the
 * tracker shows `Dissonant Echo Defense` and `Assist Module Bonus Cannon`. An
 * exact match therefore found nothing, the max level fell through to a
 * fallback of 1, and the tracker displayed levels above their own cap.
 */
export function findLabResearchByLooseName(name: string): LabResearchRecord | undefined {
  const target = looseLabKey(name)
  if (!target) return undefined
  if (!looseNameIndex) {
    looseNameIndex = new Map()
    LAB_RESEARCH_BY_INDEX.forEach((row, index) => {
      const key = looseLabKey(row?.displayName ?? '')
      // First writer wins so an later duplicate cannot shadow the real entry.
      if (key && !looseNameIndex!.has(key)) looseNameIndex!.set(key, index)
    })
  }
  const index = looseNameIndex.get(target)
  const record = index === undefined ? undefined : LAB_RESEARCH_BY_INDEX[index]
  return record ? enrichLabResearchCategory(record) : undefined
}
