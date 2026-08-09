import { uwStoneChartData } from '../../data/ultimate-weapon-stones'
import type { GameDropdownOptionEntry } from './types'

export interface UwStatSpec {
  weaponKey: string
  statName: string
}

const UW_WEAPON_NAME_TO_CHART_KEY: Readonly<Record<string, string>> = {
  'Golden Tower': 'golden_tower',
  'Death Wave': 'death_wave',
  'Black Hole': 'black_hole',
  'Poison Swamp': 'poison_swamp',
  'Chrono Field': 'chrono_field',
  'Smart Missiles': 'smart_missiles',
  'Inner Land Mines': 'inner_land_mines',
  'Spotlight': 'spotlight',
  'Chain Lightning': 'chain_lightning',
}

export function resolveUwChartKeyFromWeaponName(weaponName: string): string | null {
  return UW_WEAPON_NAME_TO_CHART_KEY[weaponName] ?? null
}

/** Canonical field label shared by every UW stat level dropdown (tracker, calculators, uptime). */
export function buildUwStatFieldLabel(weaponName: string, statDisplayName: string): string {
  const spec = resolveUwStatSpec(weaponName, statDisplayName)
  if (!spec) return `${weaponName} - ${statDisplayName}`
  return `${weaponName} - ${spec.statName}`
}

/** First stone level option for resets / empty-state defaults. */
export function resolveDefaultUwStatStoneLevel(weaponName: string, statDisplayName: string): number {
  const spec = resolveUwStatSpec(weaponName, statDisplayName)
  if (!spec) return 0
  const entries = buildUwStatLevelEntries(spec)
  return entries[0]?.value ?? 0
}

export function resolveUwStatSpec(weaponName: string, statDisplayName: string): UwStatSpec | null {
  const weaponKey = resolveUwChartKeyFromWeaponName(weaponName)
  if (!weaponKey) return null

  const weapon = uwStoneChartData[weaponKey]
  if (!weapon) return null

  const normalized = statDisplayName.trim().toLowerCase()
  const stat = weapon.stats.find(entry => entry.name.trim().toLowerCase() === normalized)
  if (!stat) return null

  return { weaponKey, statName: stat.name }
}

export function buildUwStatLevelEntries(spec: UwStatSpec): readonly GameDropdownOptionEntry[] {
  const weapon = uwStoneChartData[spec.weaponKey]
  if (!weapon) return []

  const stat = weapon.stats.find(entry => entry.name === spec.statName)
  if (!stat) return []

  return stat.levels.map(entry => ({
    value: entry.level,
    baseValue: typeof entry.value === 'number' ? entry.value : Number.parseFloat(String(entry.value).replace(/[^\d.-]/g, '')) || entry.level,
  }))
}

export function buildUwStatOptionLabel(spec: UwStatSpec, level: number): string {
  const weapon = uwStoneChartData[spec.weaponKey]
  const stat = weapon?.stats.find(entry => entry.name === spec.statName)
  const row = stat?.levels.find(entry => entry.level === level)
  if (!row) return String(level)
  return String(row.value).trim()
}

export function parseUwStatNumericValue(raw: string | number): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  const parsed = Number.parseFloat(String(raw).replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Uptime stores UW fields as stone level indices (tracker sync + unified dropdown).
 * Legacy saves may store the resolved stat value (seconds/qty/angle) directly.
 */
export function resolveUwStatStoredValue(
  spec: UwStatSpec,
  stored: number | null | undefined,
): number {
  const numericStored = Number(stored)
  if (!Number.isFinite(numericStored)) return 0

  const entries = buildUwStatLevelEntries(spec)
  if (!entries.length) return numericStored

  const byLevel = entries.find(entry => entry.value === numericStored)
  if (byLevel) return parseUwStatNumericValue(byLevel.baseValue)

  const byBaseValue = entries.find(
    entry => parseUwStatNumericValue(entry.baseValue) === numericStored,
  )
  if (byBaseValue) return numericStored

  return numericStored
}
