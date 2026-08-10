import {
  normalizeTrackerDateText,
  parseTrackerLifetimeCloudWrite,
  type TrackerLifetimeCloudWrite,
} from './tracker-cloud-schemas'

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

export type TrackerLifetimeCloudWriteOptions = {
  existing?: Record<string, unknown> | null
  strictMinimal?: boolean
  normalizeNumericValue?: (value: string) => string
}

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

export function buildTrackerLifetimeCloudWritePayload(
  entry: Record<string, unknown>,
  userId: string,
  username: string,
  options?: TrackerLifetimeCloudWriteOptions,
): TrackerLifetimeCloudWrite {
  const resolvedUsername = String(
    username || entry.username || options?.existing?.username || 'Anonymous',
  ).trim() || 'Anonymous'

  const normalized: Record<string, unknown> = normalizeTrackerLifetimeEntryValues({
    ...entry,
    userId,
    username: resolvedUsername,
    date: normalizeTrackerLifetimeDate(entry.date),
    blocked: Boolean(entry.blocked),
  }, {
    normalizeNumericValue: options?.normalizeNumericValue,
  })

  const payload: Record<string, unknown> = {}
  for (const key of TRACKER_LIFETIME_REQUIRED_KEYS) {
    payload[key] = String(normalized[key] ?? '')
  }

  payload.username = resolvedUsername

  const extraKeys = options?.strictMinimal
    ? []
    : [...TRACKER_LIFETIME_OPTIONAL_KEYS]

  for (const key of extraKeys) {
    if (TRACKER_LIFETIME_REQUIRED_KEYS.includes(key as (typeof TRACKER_LIFETIME_REQUIRED_KEYS)[number])) continue
    if (key === 'username') continue
    const value = normalized[key] ?? options?.existing?.[key]
    if (value !== undefined) payload[key] = value
  }

  return parseTrackerLifetimeCloudWrite(payload)
}

export function buildTrackerLifetimeCloudPatch(
  localEntry: Record<string, unknown>,
  remoteEntry: Record<string, unknown>,
): Record<string, unknown> | null {
  const userId = String(localEntry.userId ?? remoteEntry.userId ?? '')
  const username = String(localEntry.username ?? remoteEntry.username ?? '')
  if (!userId || !username) return null

  const payload = buildTrackerLifetimeCloudWritePayload(localEntry, userId, username, { existing: remoteEntry })
  const patch: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(payload)) {
    if (remoteEntry[key] !== value) {
      patch[key] = value
    }
  }

  return Object.keys(patch).length > 0 ? patch : null
}
