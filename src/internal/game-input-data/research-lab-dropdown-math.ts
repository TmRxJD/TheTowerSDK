import { ENEMY_STATS_BC_COUNTER_LAB_SLUGS } from '../../mechanics/battle-condition-config'
import { buildDissonanceEchoLabOptionLabel } from './dissonance-echo-lab-dropdown-math'
import { isDissonanceEchoResearchLabSlug } from './dissonance-echo-lab-keys'
import { findLabResearchByDisplayName, findLabResearchBySlug } from '../../data/index'
import { SITE_LAB_SLUG_ALIASES } from '../../data/index'
import {
  computeLabValueAtLevel,
  getLabMaxLevel,
  getSharedToolLabs,
  isLabsTrackerResearchLabName,
  type ToolLabRecord,
} from '../../data/index'
import type { GameDropdownOptionEntry } from './types'

export const IMPROVE_TRADE_OFF_LAB_SLUG = 'improve_trade_off_perks'

export const MAX_IMPROVE_TRADE_OFF_LAB_LEVEL = 10
export const MAX_BC_GLOBAL_REDUCTION_LAB_LEVEL = 10
export const MAX_BC_SPECIFIC_LAB_LEVEL = 20

let cachedLabs: ToolLabRecord[] | null = null

function getLabs(): ToolLabRecord[] {
  if (!cachedLabs) cachedLabs = getSharedToolLabs()
  return cachedLabs
}

export function isBcCounterResearchLabSlug(slug: string): boolean {
  return (ENEMY_STATS_BC_COUNTER_LAB_SLUGS as readonly string[]).includes(slug)
}

function findLabRecord(slug: string): ToolLabRecord | undefined {
  const labs = getLabs()
  const canonical = SITE_LAB_SLUG_ALIASES[slug] ?? slug
  const research = findLabResearchBySlug(canonical) ?? findLabResearchBySlug(slug)
  const displayName = research?.displayName

  return labs.find(lab =>
    lab.name === slug
    || lab.name === canonical
    || (displayName != null && (lab.displayName === displayName || lab.name === displayName))
    || (research?.index != null && lab.saveIndex === research.index),
  )
}

export function getResearchLabDisplayName(slug: string): string {
  const canonical = SITE_LAB_SLUG_ALIASES[slug] ?? slug
  const research = findLabResearchBySlug(canonical) ?? findLabResearchBySlug(slug)
  if (research?.displayName) return research.displayName
  return slug
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function resolvePlainResearchLabMaxLevel(slug: string): number {
  const canonical = SITE_LAB_SLUG_ALIASES[slug] ?? slug
  const research = findLabResearchBySlug(canonical) ?? findLabResearchBySlug(slug)
  const labRecord = findLabRecord(slug)
  if (labRecord) return getLabMaxLevel(labRecord)
  return research?.levelMax ?? 30
}

export function computeResearchLabMaxLevel(slug: string): number {
  if (slug === IMPROVE_TRADE_OFF_LAB_SLUG) return MAX_IMPROVE_TRADE_OFF_LAB_LEVEL
  if (slug === 'battle_condition_reduction') return MAX_BC_GLOBAL_REDUCTION_LAB_LEVEL
  if (isBcCounterResearchLabSlug(slug)) {
    return Math.min(resolvePlainResearchLabMaxLevel(slug), MAX_BC_SPECIFIC_LAB_LEVEL)
  }
  return resolvePlainResearchLabMaxLevel(slug)
}

export function buildResearchLabLevelEntries(slug: string): readonly GameDropdownOptionEntry[] {
  const maxLevel = computeResearchLabMaxLevel(slug)
  return Array.from({ length: maxLevel + 1 }, (_, value) => ({ value, baseValue: value }))
}

function formatBcCounterLabMitigationPct(slug: string, level: number): number {
  const lab = findLabRecord(slug)
  if (!lab || level <= 0) return 0
  const raw = computeLabValueAtLevel(lab, level)
  if (slug === 'battle_condition_reduction') return raw
  return raw < 1 ? raw : raw * 0.01
}

export function buildResearchLabOptionLabel(slug: string, level: number): string {
  if (level === 0) return '0'

  if (slug === IMPROVE_TRADE_OFF_LAB_SLUG) {
    const lab = findLabRecord(slug)
    const pct = lab ? computeLabValueAtLevel(lab, level) : level
    return `+${pct}%`
  }

  if (isBcCounterResearchLabSlug(slug)) {
    const pct = formatBcCounterLabMitigationPct(slug, level)
    const formatted = pct >= 1 ? pct.toFixed(0) : pct.toFixed(1)
    return `−${formatted}%`
  }

  if (isDissonanceEchoResearchLabSlug(slug)) {
    return buildDissonanceEchoLabOptionLabel(slug, level)
  }

  return String(level)
}

/** Resolve a labs-tracker lab name/display label to a research slug for parametric dropdowns. */
export function findResearchLabSlugFromLabName(labName: string | null | undefined): string | null {
  if (!labName || !labName.trim()) return null
  if (!isLabsTrackerResearchLabName(labName)) return null

  const trimmed = labName.trim()
  const canonical = SITE_LAB_SLUG_ALIASES[trimmed] ?? trimmed
  const research = findLabResearchBySlug(canonical) ?? findLabResearchBySlug(trimmed)
  if (research?.slug) return research.slug

  const byDisplay = findLabResearchByDisplayName(trimmed)
  if (byDisplay?.slug) return byDisplay.slug

  const labRecord = findLabRecord(trimmed)
  if (labRecord?.name && isLabsTrackerResearchLabName(labRecord.name)) {
    return SITE_LAB_SLUG_ALIASES[labRecord.name] ?? labRecord.name
  }

  return null
}
