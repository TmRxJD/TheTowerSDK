import { clampAssistMultiplierEfficiencyPct } from '../../mechanics/assist-module-efficiency'
import type { RarityPick } from '../../mechanics/uptime-core'
import type { GameDropdownOptionEntry } from './types'

export type UptimeSubstatPickKind =
  | 'gt_cd'
  | 'bh_cd'
  | 'dw_cd'
  | 'ps_cd'
  | 'cf_cd'
  | 'sm_cd'
  | 'ilm_cd'
  | 'gt_dur'
  | 'bh_dur'
  | 'ps_dur'
  | 'cf_dur'
  | 'dw_qty'
  | 'sm_qty'
  | 'sl_angle'

export type UptimeSubstatPickRole = 'primary' | 'assist'

export type UptimeSubstatStatKind = 'cd_reduction' | 'duration' | 'quantity' | 'angle'

export interface UptimeSubstatPickSpec {
  kind: UptimeSubstatPickKind
  picks: readonly RarityPick[]
  baseValues: Partial<Record<RarityPick, number>>
  statKind: UptimeSubstatStatKind
}

export const UPTIME_SUBSTAT_PICK_SPECS: Record<UptimeSubstatPickKind, UptimeSubstatPickSpec> = {
  gt_cd: {
    kind: 'gt_cd',
    picks: ['None', 'Legendary', 'Mythic', 'Ancestral'],
    baseValues: { None: 0, Legendary: 6, Mythic: 8, Ancestral: 12 },
    statKind: 'cd_reduction',
  },
  bh_cd: {
    kind: 'bh_cd',
    picks: ['None', 'Legendary', 'Mythic', 'Ancestral'],
    baseValues: { None: 0, Legendary: 2, Mythic: 3, Ancestral: 4 },
    statKind: 'cd_reduction',
  },
  dw_cd: {
    kind: 'dw_cd',
    picks: ['None', 'Legendary', 'Mythic', 'Ancestral'],
    baseValues: { None: 0, Legendary: 6, Mythic: 10, Ancestral: 13 },
    statKind: 'cd_reduction',
  },
  ps_cd: {
    kind: 'ps_cd',
    picks: ['None', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Ancestral'],
    baseValues: { None: 0, Rare: 2, Epic: 4, Legendary: 6, Mythic: 8, Ancestral: 10 },
    statKind: 'cd_reduction',
  },
  cf_cd: {
    kind: 'cf_cd',
    picks: ['None', 'Legendary', 'Mythic', 'Ancestral'],
    baseValues: { None: 0, Legendary: 4, Mythic: 7, Ancestral: 10 },
    statKind: 'cd_reduction',
  },
  sm_cd: {
    kind: 'sm_cd',
    picks: ['None', 'Legendary', 'Mythic', 'Ancestral'],
    baseValues: { None: 0, Legendary: 2, Mythic: 4, Ancestral: 6 },
    statKind: 'cd_reduction',
  },
  ilm_cd: {
    kind: 'ilm_cd',
    picks: ['None', 'Epic', 'Legendary', 'Mythic', 'Ancestral'],
    baseValues: { None: 0, Epic: 5, Legendary: 8, Mythic: 10, Ancestral: 13 },
    statKind: 'cd_reduction',
  },
  gt_dur: {
    kind: 'gt_dur',
    picks: ['None', 'Legendary', 'Mythic', 'Ancestral'],
    baseValues: { None: 0, Legendary: 2, Mythic: 4, Ancestral: 7 },
    statKind: 'duration',
  },
  bh_dur: {
    kind: 'bh_dur',
    picks: ['None', 'Legendary', 'Mythic', 'Ancestral'],
    baseValues: { None: 0, Legendary: 2, Mythic: 3, Ancestral: 4 },
    statKind: 'duration',
  },
  ps_dur: {
    kind: 'ps_dur',
    picks: ['None', 'Legendary', 'Mythic', 'Ancestral'],
    baseValues: { None: 0, Legendary: 2, Mythic: 5, Ancestral: 10 },
    statKind: 'duration',
  },
  cf_dur: {
    kind: 'cf_dur',
    picks: ['None', 'Legendary', 'Mythic', 'Ancestral'],
    baseValues: { None: 0, Legendary: 4, Mythic: 7, Ancestral: 10 },
    statKind: 'duration',
  },
  dw_qty: {
    kind: 'dw_qty',
    picks: ['None', 'Legendary', 'Mythic', 'Ancestral'],
    baseValues: { None: 0, Legendary: 1, Mythic: 2, Ancestral: 3 },
    statKind: 'quantity',
  },
  sm_qty: {
    kind: 'sm_qty',
    picks: ['None', 'Epic', 'Legendary', 'Mythic', 'Ancestral'],
    baseValues: { None: 0, Epic: 1, Legendary: 2, Mythic: 4, Ancestral: 5 },
    statKind: 'quantity',
  },
  sl_angle: {
    kind: 'sl_angle',
    picks: ['None', 'Epic', 'Legendary', 'Mythic', 'Ancestral'],
    baseValues: { None: 0, Epic: 3, Legendary: 6, Mythic: 11, Ancestral: 15 },
    statKind: 'angle',
  },
}

function clampAssistPct(efficiency: number): number {
  return clampAssistMultiplierEfficiencyPct(efficiency)
}

function formatPrimaryLabel(spec: UptimeSubstatPickSpec, pick: RarityPick): string {
  if (pick === 'None') return 'None'
  const magnitude = spec.baseValues[pick] ?? 0
  switch (spec.statKind) {
    case 'cd_reduction': return `−${magnitude}s`
    case 'duration': return `+${magnitude}s`
    case 'quantity': return `+${magnitude}`
    case 'angle': return `${magnitude}°`
    default: return pick
  }
}

function formatAssistLabel(
  spec: UptimeSubstatPickSpec,
  pick: RarityPick,
  assistEffPct: number,
): string {
  if (pick === 'None') return 'None'

  const eff = clampAssistPct(assistEffPct) / 100
  const effVal = Math.floor((spec.baseValues[pick] ?? 0) * eff)
  const atText = ` at ${clampAssistPct(assistEffPct)}%`

  switch (spec.statKind) {
    case 'cd_reduction': return `−${effVal}s${atText}`
    case 'duration': return `+${effVal}s${atText}`
    case 'quantity': return `+${effVal}${atText}`
    case 'angle': return `${effVal}°${atText}`
    default: return pick
  }
}

export function buildUptimeSubstatPickEntries(
  kind: UptimeSubstatPickKind,
  options?: { role?: UptimeSubstatPickRole; assistEffPct?: number },
): readonly GameDropdownOptionEntry[] {
  const spec = UPTIME_SUBSTAT_PICK_SPECS[kind]
  const role = options?.role ?? 'primary'
  const assistEffPct = options?.assistEffPct ?? 100

  return spec.picks.map((pick, index) => ({
    value: index,
    baseValue: index,
    meta: { pick, role, assistEffPct },
  }))
}

export function buildUptimeSubstatPickOptionLabel(
  kind: UptimeSubstatPickKind,
  index: number,
  options?: { role?: UptimeSubstatPickRole; assistEffPct?: number },
): string {
  const spec = UPTIME_SUBSTAT_PICK_SPECS[kind]
  const role = options?.role ?? 'primary'
  const assistEffPct = options?.assistEffPct ?? 100
  const pick = spec.picks[Math.max(0, Math.min(spec.picks.length - 1, Math.floor(Number(index) || 0)))] ?? 'None'

  return role === 'assist'
    ? formatAssistLabel(spec, pick, assistEffPct)
    : formatPrimaryLabel(spec, pick)
}

export function computeUptimeSubstatPickIndex(kind: UptimeSubstatPickKind, pick: RarityPick | null | undefined): number {
  const spec = UPTIME_SUBSTAT_PICK_SPECS[kind]
  const idx = spec.picks.indexOf(pick ?? 'None')
  return idx >= 0 ? idx : 0
}

export function getUptimeSubstatPickByIndex(kind: UptimeSubstatPickKind, index: number): RarityPick {
  const spec = UPTIME_SUBSTAT_PICK_SPECS[kind]
  const clamped = Math.max(0, Math.min(spec.picks.length - 1, Math.floor(Number(index) || 0)))
  return spec.picks[clamped] ?? 'None'
}
