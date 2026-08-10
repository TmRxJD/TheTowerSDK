import { extractDurationSecondsFromSave, formatBattleDurationFromSaveSeconds } from './battle-duration'
import { buildBattleReportStatFieldsFromSaveEntry } from './battle-report-fields'
import { normalizeBattleHistorySaveEntry } from './battle-history-normalize'
import { parseDurationToHours, parseSaveDateTimeToMs } from '../formatting/index'
import { listImportableBattleRuns } from './battle-history'
import { resolveKilledByFromSave } from './killed-by'
import { normalizeTrackerDateText, normalizeTrackerTimeText } from '../internal/tracker-cloud-schemas'
import { formatCompact } from '../internal/tool-formatting'

export function readBattleDateFromSave(raw: unknown): Date {
  const ms = parseSaveDateTimeToMs(raw)
  return ms != null ? new Date(ms) : new Date()
}

function readNumber(raw: unknown, fallback = 0): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw.trim())
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toTimeString(date: Date): string {
  return date.toTimeString().split(' ')[0] ?? '00:00:00'
}

/** Derive canonical UTC battle date/time parts from a save timestamp for import dedup. */
export function normalizeBattleRunDateTimeForDedup(value: unknown): { runDate: string; runTime: string } {
  const ms = typeof value === 'number' && Number.isFinite(value)
    ? value
    : parseSaveDateTimeToMs(value)
  if (ms == null) {
    return { runDate: '', runTime: '' }
  }
  const iso = new Date(ms).toISOString()
  return {
    runDate: iso.slice(0, 10),
    runTime: iso.slice(11, 19),
  }
}

function resolveBattleRunTimestampMsForDedup(run: Record<string, unknown>): number | null {
  return collectBattleRunTimestampMsCandidates(run)[0] ?? null
}

function buildBattleRunDedupKeyFromTimestampMs(
  tier: string | number | null | undefined,
  wave: string | number | null | undefined,
  timestampMs: number | null,
): string {
  const { runDate, runTime } = timestampMs != null
    ? normalizeBattleRunDateTimeForDedup(timestampMs)
    : { runDate: '', runTime: '' }

  return buildBattleRunDeduplicationKey({
    tier: tier != null ? String(tier) : '',
    wave: wave != null ? String(wave) : '',
    runDate,
    runTime,
  })
}

function readBattleRunTierWave(run: Record<string, unknown>): { tier: string; wave: string } {
  const tier = run.tier ?? run.tierDisplay
  return {
    tier: tier != null ? String(tier) : '',
    wave: run.wave != null ? String(run.wave) : '',
  }
}

function collectBattleRunTimestampMsCandidates(run: Record<string, unknown>): number[] {
  const candidates: number[] = []
  const pushUnique = (ms: number | null | undefined) => {
    if (ms == null || !Number.isFinite(ms)) return
    if (!candidates.includes(ms)) candidates.push(ms)
  }

  pushUnique(parseSaveDateTimeToMs(run.battleDate))
  pushUnique(parseSaveDateTimeToMs(run.reportTimestamp))

  const runDate = normalizeTrackerDateText(run.runDate ?? run.date)
  const runTime = normalizeTrackerTimeText(run.runTime ?? run.time)
  if (!runDate || !runTime) return candidates

  pushUnique(parseSaveDateTimeToMs(`${runDate}T${runTime}Z`))
  pushUnique(parseSaveDateTimeToMs(`${runDate}T${runTime}`))
  pushUnique(parseSaveDateTimeToMs(`${runDate} ${runTime}`))

  return candidates
}

/** All plausible dedup keys for a stored run (UTC + legacy local runTime interpretations). */
export function buildBattleRunDedupKeysFromStoredRun(run: Record<string, unknown>): string[] {
  const { tier, wave } = readBattleRunTierWave(run)
  const keys = new Set<string>()

  for (const timestampMs of collectBattleRunTimestampMsCandidates(run)) {
    keys.add(buildBattleRunDedupKeyFromTimestampMs(tier, wave, timestampMs))
  }

  if (keys.size === 0) {
    keys.add(buildBattleRunDedupKeyFromTimestampMs(tier, wave, null))
  }

  return [...keys]
}

export function buildBattleRunDeduplicationKey(run: {
  tier?: string | null
  wave?: string | null
  runDate?: string | null
  runTime?: string | null
}): string {
  return [
    run.tier?.toString() || '',
    run.wave?.toString() || '',
    run.runDate || '',
    run.runTime || '',
  ].join('|')
}

/** A dedup key is only usable when every part of it is present. */
export function isPopulatedBattleRunDedupKey(key: string): boolean {
  const [tier, wave, runDate, runTime] = key.split('|')
  return Boolean(tier && wave && runDate && runTime)
}

/** Normalize any stored/imported battle run date to `YYYY-MM-DD` for dedup keys. */
export function normalizeBattleRunDateForDedup(value: unknown): string {
  if (value == null) return ''
  const raw = String(value).trim()
  const dateOnlyMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (dateOnlyMatch) {
    return dateOnlyMatch[1]
  }
  const date = readBattleDateFromSave(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Normalize duration text or raw save values to the canonical battle-import format. */
export function normalizeBattleRunDurationForDedup(value: unknown): string {
  const secondsFromRaw = extractDurationSecondsFromSave(value)
  if (secondsFromRaw != null) {
    return formatBattleDurationFromSaveSeconds(secondsFromRaw)
  }
  const parsedSeconds = Math.max(0, Math.round(parseDurationToHours(String(value ?? '')) * 3600))
  return formatBattleDurationFromSaveSeconds(parsedSeconds)
}

/** Normalize compact economy strings so differently formatted values dedupe together. */
export function normalizeBattleRunCompactForDedup(value: unknown): string {
  if (value == null || String(value).trim() === '') return ''
  return formatCompact(parseCompactNumber(value))
}

/** Build a dedup key from a stitched/local/cloud run document. */
export function buildBattleRunDedupKeyFromStoredRun(run: Record<string, unknown>): string {
  const { tier, wave } = readBattleRunTierWave(run)
  return buildBattleRunDedupKeyFromTimestampMs(
    tier,
    wave,
    resolveBattleRunTimestampMsForDedup(run),
  )
}

/** Build a dedup key directly from a save-file battle history entry. */
export function buildBattleRunDedupKeyFromBattleEntry(entry: Record<string, unknown>): string {
  const normalizedEntry = normalizeBattleHistorySaveEntry(entry)
  return buildBattleRunDedupKeyFromTimestampMs(
    readNumber(normalizedEntry.tier, 1),
    readNumber(normalizedEntry.wave, 0),
    parseSaveDateTimeToMs(normalizedEntry.battleDate ?? normalizedEntry.runDate),
  )
}

export function buildTrackerRunDataFromBattleHistoryEntry(
  entry: Record<string, unknown>,
  context?: { notePrefix?: string },
): Record<string, unknown> {
  const normalizedEntry = normalizeBattleHistorySaveEntry(entry)
  const battleTimestampMs = parseSaveDateTimeToMs(normalizedEntry.battleDate ?? normalizedEntry.runDate)
  const { runDate, runTime } = normalizeBattleRunDateTimeForDedup(battleTimestampMs)
  const uploadDate = new Date()
  const durationSeconds = extractDurationSecondsFromSave(normalizedEntry.realTime) ?? 0
  const duration = formatBattleDurationFromSaveSeconds(durationSeconds)
  const isTournament = normalizedEntry.isTournament === true
  const notePrefix = context?.notePrefix ?? 'Imported from battle history'
  const selectedTower = readNumber(normalizedEntry.selectedTower, 0)

  return {
    tier: String(readNumber(normalizedEntry.tier, 1)),
    wave: String(readNumber(normalizedEntry.wave, 0)),
    duration,
    roundDuration: duration,
    time: toTimeString(uploadDate),
    coins: formatCompact(readNumber(normalizedEntry.coinsEarned)),
    totalCoins: formatCompact(readNumber(normalizedEntry.coinsEarned)),
    cells: formatCompact(readNumber(normalizedEntry.cellsEarned)),
    totalCells: formatCompact(readNumber(normalizedEntry.cellsEarned)),
    rerollShards: formatCompact(readNumber(normalizedEntry.rerollShardsEarned)),
    totalDice: formatCompact(readNumber(normalizedEntry.rerollShardsEarned)),
    dice: formatCompact(readNumber(normalizedEntry.rerollShardsEarned)),
    killedBy: resolveKilledByFromSave(normalizedEntry.killedBy).slice(0, 20),
    note: `${notePrefix} - ${isTournament ? 'Tournament' : 'Regular'} run - Tower: ${selectedTower}`,
    notes: `${notePrefix} - ${isTournament ? 'Tournament' : 'Regular'} run - Tower: ${selectedTower}`,
    date: toIsoDate(uploadDate),
    runDate,
    runTime,
    battleDate: normalizedEntry.battleDate ?? normalizedEntry.runDate,
    reportTimestamp: battleTimestampMs != null ? String(battleTimestampMs) : undefined,
    type: isTournament ? 'Tournament' : 'Farming',
    ...buildBattleReportStatFieldsFromSaveEntry(normalizedEntry),
    verified: true,
  }
}

export type BattleReportImportPlan = {
  importable: Record<string, unknown>[]
  skippedDuplicates: number
  totalInSave: number
}

export function planBattleReportImport(
  parsedRoot: unknown,
  existingRuns: Array<Record<string, unknown>>,
): BattleReportImportPlan {
  const entries = listImportableBattleRuns(parsedRoot)
  const existingKeys = new Set<string>()
  for (const run of existingRuns) {
    for (const key of buildBattleRunDedupKeysFromStoredRun(run)) {
      existingKeys.add(key)
    }
  }

  const importable: Record<string, unknown>[] = []
  let skippedDuplicates = 0

  for (const entry of entries) {
    const key = buildBattleRunDedupKeyFromBattleEntry(entry)
    if (existingKeys.has(key)) {
      skippedDuplicates += 1
      continue
    }
    existingKeys.add(key)
    importable.push(buildTrackerRunDataFromBattleHistoryEntry(entry))
  }

  return {
    importable,
    skippedDuplicates,
    totalInSave: entries.length,
  }
}

export type AveragedImportRunSummary = Record<string, unknown>

function averageNumbers(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function parseDurationToSeconds(duration: string): number {
  const normalized = duration.toLowerCase().replace(/\s+/g, '')
  const hoursMatch = normalized.match(/(\d+)h/)
  const minutesMatch = normalized.match(/(\d+)m/)
  const secondsMatch = normalized.match(/(\d+)s/)
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0
  const seconds = secondsMatch ? Number(secondsMatch[1]) : 0
  return hours * 3600 + minutes * 60 + seconds
}

function parseCompactNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return 0
  const suffix = raw.slice(-1)
  const multiplier = suffix === 'k' ? 1_000
    : suffix === 'm' ? 1_000_000
      : suffix === 'b' ? 1_000_000_000
        : suffix === 't' ? 1_000_000_000_000
          : suffix === 'q' ? 1_000_000_000_000_000
            : 1
  const numeric = multiplier === 1 ? Number(raw) : Number(raw.slice(0, -1))
  return Number.isFinite(numeric) ? numeric * multiplier : 0
}

/**
 * Builds a synthetic run record whose fields are averages across imported runs,
 * suitable for share embeds and per-hour charts.
 */
export function buildAveragedImportRunSummary(runs: Record<string, unknown>[]): AveragedImportRunSummary {
  if (!runs.length) {
    return { type: 'Farming', wave: '0', tier: '0', duration: '0h0m0s' }
  }

  const waves = runs.map(run => parseCompactNumber(run.wave))
  const tiers = runs.map(run => parseCompactNumber(run.tier))
  const durations = runs.map(run => parseDurationToSeconds(String(run.duration ?? run.roundDuration ?? '0h0m0s')))
  const coins = runs.map(run => parseCompactNumber(run.coins ?? run.totalCoins))
  const cells = runs.map(run => parseCompactNumber(run.cells ?? run.totalCells))
  const dice = runs.map(run => parseCompactNumber(run.rerollShards ?? run.totalDice ?? run.dice))
  const enemies = runs.map(run => parseCompactNumber(run.totalEnemies))
  const deathDefies = runs.map(run => parseCompactNumber(run.deathDefy))

  const avgDurationSeconds = averageNumbers(durations)
  const typeCounts = runs.reduce<Record<string, number>>((acc, run) => {
    const type = String(run.type ?? 'Farming')
    acc[type] = (acc[type] ?? 0) + 1
    return acc
  }, {})
  const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Farming'

  return {
    type: dominantType,
    tier: formatCompact(Math.round(averageNumbers(tiers))),
    tierDisplay: formatCompact(Math.round(averageNumbers(tiers))),
    wave: formatCompact(Math.round(averageNumbers(waves))),
    duration: formatBattleDurationFromSaveSeconds(avgDurationSeconds),
    roundDuration: formatBattleDurationFromSaveSeconds(avgDurationSeconds),
    coins: formatCompact(averageNumbers(coins)),
    totalCoins: formatCompact(averageNumbers(coins)),
    cells: formatCompact(averageNumbers(cells)),
    totalCells: formatCompact(averageNumbers(cells)),
    rerollShards: formatCompact(averageNumbers(dice)),
    totalDice: formatCompact(averageNumbers(dice)),
    dice: formatCompact(averageNumbers(dice)),
    totalEnemies: formatCompact(Math.round(averageNumbers(enemies))),
    deathDefy: String(Math.round(averageNumbers(deathDefies))),
    killedBy: 'Mixed',
    notes: `Average across ${runs.length} imported runs`,
    note: `Average across ${runs.length} imported runs`,
    importRunCount: runs.length,
  }
}
