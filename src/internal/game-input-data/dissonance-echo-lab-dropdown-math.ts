import { findLabResearchBySlug } from '../../data/index'
import { SITE_LAB_SLUG_ALIASES } from '../../data/index'
import { computeLabValueAtLevel, getSharedToolLabs, type ToolLabRecord } from '../../data/index'
import {
  computeDissonanceEchoBenefitFractionAtLabLevel,
  type DissonanceEchoLabSpec,
} from './dissonance-echo-lab-keys'
import type { GameDropdownOptionEntry } from './types'

function findLabRecordByResearchSlug(slug: string): ToolLabRecord | undefined {
  const labs = getSharedToolLabs()
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

export function computeDissonanceEchoLabBenefitFraction(researchSlug: string, level: number): number {
  if (level < 0) return 0
  const lab = findLabRecordByResearchSlug(researchSlug)
  if (!lab) return computeDissonanceEchoBenefitFractionAtLabLevel(level)
  const fromCatalog = computeLabValueAtLevel(lab, level)
  if (fromCatalog > 0 || level === 0) return fromCatalog
  return computeDissonanceEchoBenefitFractionAtLabLevel(level)
}

export function computeDissonanceEchoLabBenefitPct(researchSlug: string, level: number): number {
  return computeDissonanceEchoLabBenefitFraction(researchSlug, level) * 100
}

export function buildDissonanceEchoLabLevelEntries(
  spec: Pick<DissonanceEchoLabSpec, 'minLevel' | 'maxLevel'>,
): readonly GameDropdownOptionEntry[] {
  const length = spec.maxLevel - spec.minLevel + 1
  return Array.from({ length }, (_, index) => {
    const value = spec.minLevel + index
    return { value, baseValue: value }
  })
}

export function buildDissonanceEchoLabOptionLabel(researchSlug: string, level: number): string {
  if (level < 0) return '0'
  const pct = computeDissonanceEchoLabBenefitPct(researchSlug, level)
  const formatted = pct.toFixed(1)
  return `${level} - ${formatted}%`
}
