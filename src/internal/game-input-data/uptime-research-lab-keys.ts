import { getResearchLabDisplayName } from './research-lab-dropdown-math'

export type UptimeResearchLabKind = 'seconds_bonus' | 'bc_reduction_pct' | 'wave_count'

export type UptimeResearchLabDataKey =
  | 'gt_dur_lab'
  | 'cf_dur_lab'
  | 'bc_lab_level'
  | 'dw_base_waves_level'

export interface UptimeResearchLabSpec {
  key: UptimeResearchLabDataKey
  uptimeField: 'gtDurLab' | 'cfDurLab' | 'bcLabLevel' | 'dwBaseWavesLevel'
  researchSlug: string | null
  kind: UptimeResearchLabKind
  minLevel: number
  maxLevel: number
}

export const UPTIME_RESEARCH_LAB_SPECS = [
  {
    key: 'gt_dur_lab',
    uptimeField: 'gtDurLab',
    researchSlug: 'golden_tower_duration',
    kind: 'seconds_bonus',
    minLevel: 0,
    maxLevel: 20,
  },
  {
    key: 'cf_dur_lab',
    uptimeField: 'cfDurLab',
    researchSlug: 'chrono_field_duration',
    kind: 'seconds_bonus',
    minLevel: 0,
    maxLevel: 30,
  },
  {
    key: 'bc_lab_level',
    uptimeField: 'bcLabLevel',
    researchSlug: 'ultimate_weapon_durations',
    kind: 'bc_reduction_pct',
    minLevel: 0,
    maxLevel: 10,
  },
  {
    key: 'dw_base_waves_level',
    uptimeField: 'dwBaseWavesLevel',
    researchSlug: null,
    kind: 'wave_count',
    minLevel: 1,
    maxLevel: 10,
  },
] as const satisfies readonly UptimeResearchLabSpec[]

export const UPTIME_RESEARCH_LAB_SPEC_BY_KEY = Object.fromEntries(
  UPTIME_RESEARCH_LAB_SPECS.map(spec => [spec.key, spec]),
) as Record<UptimeResearchLabDataKey, UptimeResearchLabSpec>

export const UPTIME_RESEARCH_LAB_SPEC_BY_SLUG = Object.fromEntries(
  UPTIME_RESEARCH_LAB_SPECS
    .filter(spec => spec.researchSlug != null)
    .map(spec => [spec.researchSlug!, spec]),
) as Record<string, UptimeResearchLabSpec>

export function resolveUptimeResearchLabGameDataKey(slug: string): UptimeResearchLabDataKey | null {
  const spec = UPTIME_RESEARCH_LAB_SPEC_BY_SLUG[slug]
  return spec?.key ?? null
}

export function resolveUptimeResearchLabGameDataKeyByField(
  field: UptimeResearchLabSpec['uptimeField'],
): UptimeResearchLabDataKey | null {
  const spec = UPTIME_RESEARCH_LAB_SPECS.find(entry => entry.uptimeField === field)
  return spec?.key ?? null
}

/** Canonical field label shared by every uptime research-lab dropdown. */
export function buildUptimeResearchLabFieldLabel(dataKey: UptimeResearchLabDataKey): string {
  const spec = UPTIME_RESEARCH_LAB_SPEC_BY_KEY[dataKey]
  if (spec.researchSlug) return getResearchLabDisplayName(spec.researchSlug)
  if (dataKey === 'dw_base_waves_level') return 'Death Wave Quantity'
  return dataKey
}
