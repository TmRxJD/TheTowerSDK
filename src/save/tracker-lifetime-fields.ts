/**
 * What a lifetime-stats record holds, and how its values normalise.
 *
 * Field lists and normalisers. Nothing here knows about a database -- the save
 * reader needs these to turn a decoded save into a lifetime record, which is
 * why they sit beside it rather than beside the cloud write builders they were
 * filed with.
 */
import { normalizeTrackerDateText } from './tracker-run-fields'

export const TRACKER_LIFETIME_NUMERIC_FIELDS = [
  'coinsEarned',
  'recentCoinsPerHour',
  'cashEarned',
  'stonesEarned',
  'keysEarned',
  'cellsEarned',
  'rerollShardsEarned',
  'damageDealt',
  'enemiesDestroyed',
  'wavesCompleted',
  'upgradesBought',
  'workshopUpgrades',
  'workshopCoinsSpent',
  'researchCompleted',
  'labCoinsSpent',
  'freeUpgrades',
  'interestEarned',
  'orbKills',
  'deathRayKills',
  'thornDamage',
  'wavesSkipped',
] as const

export const TRACKER_LIFETIME_REQUIRED_KEYS = [
  'coinsEarned',
  'cashEarned',
  'stonesEarned',
  'keysEarned',
  'damageDealt',
  'enemiesDestroyed',
  'wavesCompleted',
  'upgradesBought',
  'workshopUpgrades',
  'workshopCoinsSpent',
  'researchCompleted',
  'labCoinsSpent',
  'freeUpgrades',
  'interestEarned',
  'orbKills',
  'deathRayKills',
  'thornDamage',
  'wavesSkipped',
  'userId',
  'date',
  'gameStarted',
] as const

export const TRACKER_LIFETIME_OPTIONAL_KEYS = [
  'username',
  'screenshotUrl',
  'verified',
  'blocked',
  'recentCoinsPerHour',
  'cellsEarned',
  'rerollShardsEarned',
] as const

export function normalizeTrackerLifetimeDateText(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''

  const isoTimestampMatch = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/)
  if (isoTimestampMatch) {
    return isoTimestampMatch[1]
  }

  const normalized = normalizeTrackerDateText(raw)
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized
  }

  return raw
}

export function normalizeTrackerLifetimeDate(value: unknown): string {
  const normalized = normalizeTrackerLifetimeDateText(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized
  }
  return new Date().toISOString().split('T')[0]
}

export function normalizeTrackerLifetimeEntryValues(
  entry: Record<string, unknown>,
  options?: {
    numericFields?: readonly string[]
    normalizeNumericValue?: (value: string) => string
  },
): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...entry }
  const numericFields = options?.numericFields ?? TRACKER_LIFETIME_NUMERIC_FIELDS
  const normalizeNumericValue = options?.normalizeNumericValue ?? ((value: string) => value.replace(',', '.'))

  for (const field of numericFields) {
    const value = normalized[field]
    if (value === undefined || value === null) {
      normalized[field] = '0'
      continue
    }
    normalized[field] = normalizeNumericValue(String(value))
  }

  return normalized
}
