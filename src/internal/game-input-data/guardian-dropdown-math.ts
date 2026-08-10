import { guardianUpgrades } from '../../data/index'
import type { UptimeGuardianFieldMap } from '../shared-uptime-inputs'

export type GuardianGameInputKind = 'cd_level' | 'dur_level' | 'find_level' | 'double_find_level'

const GUARDIAN_KEY_PREFIX: Record<string, string> = {
  attack: 'atk',
  ally: 'ally',
  bounty: 'bty',
  summon: 'smn',
  fetch: 'ftc',
  scout: 'sct',
}

export function resolveGuardianGameInputPrefix(guardianKey: string): string {
  return GUARDIAN_KEY_PREFIX[guardianKey] ?? guardianKey
}

export function getGuardianSourceMinLevel(guardianKey: string): number {
  const upgrades = guardianUpgrades[guardianKey as keyof typeof guardianUpgrades]
  if (!upgrades?.length) return 0
  return Math.min(...upgrades.map(entry => Number(entry.level)).filter(Number.isFinite))
}

export function convertGuardianSourceLevelToNormalized(
  sourceLevel: number | null | undefined,
  guardianKey: string,
): number | null {
  if (sourceLevel == null) return null
  const min = getGuardianSourceMinLevel(guardianKey)
  return Math.max(0, Math.floor(Number(sourceLevel) - min))
}

export function convertGuardianNormalizedLevelToSource(
  normalizedLevel: number | null | undefined,
  guardianKey: string,
): number | null {
  if (normalizedLevel == null) return null
  const min = getGuardianSourceMinLevel(guardianKey)
  return Math.floor(Number(normalizedLevel) + min)
}

function readUpgradeField(
  row: Record<string, unknown>,
  kind: GuardianGameInputKind,
): string | number | null {
  const field = kind === 'cd_level'
    ? 'cooldown'
    : kind === 'dur_level'
      ? 'duration'
      : kind === 'find_level'
        ? 'findChance'
        : 'doubleFindChance'
  const value = row[field]
  if (value == null) return null
  const text = String(value).trim()
  return text.length > 0 ? value as string : null
}

function sliceGuardianUpgradeRows(
  guardianKey: string,
  kind: GuardianGameInputKind,
): Array<Record<string, unknown>> {
  const upgrades = guardianUpgrades[guardianKey as keyof typeof guardianUpgrades] as unknown as Array<Record<string, unknown>>
  if (!upgrades?.length) return []

  if (guardianKey === 'bounty' && kind === 'cd_level') {
    let lastIndexWithCooldown = -1
    for (let index = 0; index < upgrades.length; index += 1) {
      if (readUpgradeField(upgrades[index], kind) != null) {
        lastIndexWithCooldown = index
      }
    }
    if (lastIndexWithCooldown < 0) return []
    return upgrades.slice(0, lastIndexWithCooldown + 1)
  }

  return upgrades.filter(row => readUpgradeField(row, kind) != null)
}

export function buildGuardianGameInputLevelEntries(
  mapping: UptimeGuardianFieldMap,
  kind: GuardianGameInputKind,
): readonly { value: number; baseValue: number }[] {
  const rows = sliceGuardianUpgradeRows(mapping.guardianKey, kind)
  return rows.map(row => {
    const sourceLevel = Number(row.level)
    const display = readUpgradeField(row, kind)
    const baseValue = typeof display === 'number'
      ? display
      : Number.parseFloat(String(display ?? '').replace(/[^\d.-]/g, '')) || sourceLevel
    return { value: sourceLevel, baseValue }
  })
}

export function buildGuardianLevelOptionLabel(displayValue: string | number | null | undefined): string {
  const text = String(displayValue ?? '').trim()
  return text.length > 0 ? text : '—'
}

export function readGuardianUpgradeDisplayAtSourceLevel(
  mapping: UptimeGuardianFieldMap,
  kind: GuardianGameInputKind,
  sourceLevel: number,
): string | null {
  const rows = sliceGuardianUpgradeRows(mapping.guardianKey, kind)
  const row = rows.find(entry => Number(entry.level) === sourceLevel)
  const display = row ? readUpgradeField(row, kind) : null
  if (display == null) return null
  return String(display).trim()
}
