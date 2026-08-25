import { computeLabValueAtLevel, findToolLabBySlug } from '../../data/index'
import {
  computeDissonanceEchoBenefitFractionAtLabLevel,
  type DissonanceEchoLabSpec,
} from './dissonance-echo-lab-keys'
import type { GameDropdownOptionEntry } from './types'

export function computeDissonanceEchoLabBenefitFraction(researchSlug: string, level: number): number {
  if (level < 0) return 0
  const lab = findToolLabBySlug(researchSlug)
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
