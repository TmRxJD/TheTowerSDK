/**
 * In-game suffix ladder after D: AA … AZ (1e36 … 1e111, ×1000 per letter).
 * Values that do not fit az use `toExponential(2)` — no BA/BB tier in the game UI.
 */
const TOWER_DOUBLE_LETTER_NOTATION_BASE_EXPONENT = 36
const TOWER_MAX_DOUBLE_LETTER_TIER = 25 // AZ

function buildTowerInGameDoubleLetterNotations(): Record<string, number> {
  const out: Record<string, number> = {}
  for (let tier = 0; tier <= TOWER_MAX_DOUBLE_LETTER_TIER; tier += 1) {
    const suffix = String.fromCharCode(65 + tier)
    const multiplier = 10 ** (TOWER_DOUBLE_LETTER_NOTATION_BASE_EXPONENT + tier * 3)
    out[`A${suffix}`] = multiplier
  }
  return out
}

function buildTowerInGameDoubleLetterUnitMultipliers(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [suffix, multiplier] of Object.entries(buildTowerInGameDoubleLetterNotations())) {
    out[suffix] = multiplier
    out[suffix.toLowerCase()] = multiplier
  }
  return out
}

export const unitMultipliers: Record<string, number> = {
  '': 1,
  k: 1e3,
  K: 1e3,
  m: 1e6,
  M: 1e6,
  b: 1e9,
  B: 1e9,
  t: 1e12,
  T: 1e12,
  q: 1e15,
  Q: 1e18,
  s: 1e21,
  S: 1e24,
  o: 1e27,
  O: 1e27,
  n: 1e30,
  N: 1e30,
  d: 1e33,
  D: 1e33,
  ...buildTowerInGameDoubleLetterUnitMultipliers(),
}

/** Matches in-game `formatValue`: divide by 1000 per suffix until coefficient < 1000. */
const COMPACT_NUMBER_SUFFIX_ORDER = [
  'K',
  'M',
  'B',
  'T',
  'q',
  'Q',
  's',
  'S',
  'O',
  'N',
  'D',
  ...Array.from({ length: 26 }, (_, tier) => `A${String.fromCharCode(65 + tier)}`),
] as const

type DecimalPreference = 'Period (.)' | 'Comma (,)'

type FormatMode = 'display' | 'compact' | 'grouped'
type SmallNumberStrategy = 'round' | 'preserve'

export interface FormatNumberForDisplayOptions {
  mode?: FormatMode
  smallNumberStrategy?: SmallNumberStrategy
  smallNumberMaxFractionDigits?: number
  notationMaxFractionDigits?: number
  useGrouping?: boolean
}

export interface FormatUnknownNumberForDisplayOptions extends FormatNumberForDisplayOptions {
  decimalPreference?: DecimalPreference
  invalidFallback?: string
  nullFallback?: string
}

export interface FormatDateTimeForDisplayOptions {
  invalidFallback?: string
}

export interface FormatSecondsAsHoursMinutesOptions {
  zeroFallback?: string
}

export interface FormatGroupedNumberOptions {
  locale?: string
  useGrouping?: boolean
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  invalidFallback?: string
}

export const SITE_MAX_DISPLAY_DECIMALS = 3

export function roundToDisplayPrecision(
  value: number,
  maxDecimals: number = SITE_MAX_DISPLAY_DECIMALS,
): number {
  if (!Number.isFinite(value)) return 0
  const safeDecimals = Math.max(0, Math.min(maxDecimals, 12))
  const factor = 10 ** safeDecimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function stripInsignificantDecimalZeros(value: string): string {
  if (!value.includes('.')) return value
  return value
    .replace(/(\.\d*?[1-9])0+$/u, '$1')
    .replace(/\.0+$/u, '')
    .replace(/\.$/u, '')
}

export function formatDecimalForDisplay(
  value: number | string | null | undefined,
  options: { maxDecimals?: number; invalidFallback?: string } = {},
): string {
  const maxDecimals = options.maxDecimals ?? SITE_MAX_DISPLAY_DECIMALS
  const invalidFallback = options.invalidFallback ?? ''
  if (value === null || value === undefined || value === '') return invalidFallback

  const numeric = typeof value === 'number'
    ? value
    : Number(normalizeDecimalSeparator(value))
  if (!Number.isFinite(numeric)) return invalidFallback

  const rounded = roundToDisplayPrecision(numeric, maxDecimals)
  const formatted = rounded.toLocaleString('en-US', {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0,
    useGrouping: false,
  })
  return stripInsignificantDecimalZeros(formatted)
}

export const normalizeNumericValue = (value: string) => value.replace(',', '.').replace('k', 'K')

export function normalizeDecimalSeparator(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).trim().replace(/\s+/g, '').replace(/,/g, '.')
}

export function standardizeNotation(value: string): string {
  if (!value) return value
  const normalizedValue = normalizeDecimalSeparator(value)
  const match = normalizedValue.match(/^([\d.]+)([a-zA-Z]*)$/)
  if (!match) return normalizedValue
  const number = match[1]
  let notation = match[2]
  if (notation) {
    notation = notation
      .split('')
      .map(c => (c === 'q' || c === 'Q' || c === 's' || c === 'S' ? c : c.toUpperCase()))
      .join('')
    return number + notation
  }
  return number
}

export function parseNumberInput(input: string): number {
  const normalized = normalizeDecimalSeparator(input)
  const match = normalized.match(/^(\d+|\d*\.\d+)([KMBTqQsSOND]|A[A-Z])?$/i)
  if (!match) {
    const fallback = parseFloat(normalized)
    return Number.isFinite(fallback) ? fallback : 0
  }
  const numberPart = parseFloat(match[1])
  const notationRaw = match[2]
  if (!notationRaw) return numberPart

  const notation = notationRaw.length === 1 && (notationRaw === 'q' || notationRaw === 'Q' || notationRaw === 's' || notationRaw === 'S')
    ? notationRaw
    : notationRaw.toUpperCase()

  const multiplier = unitMultipliers[notation] ?? unitMultipliers[notationRaw]
  return multiplier ? numberPart * multiplier : numberPart
}

export const parseValueWithUnit = (value: string | undefined | null) => {
  if (value == null) return { value: 0, unit: '' }

  const cleanedValue = value.replace(/^\$/, '')
  const match = cleanedValue.match(/^([\d,.]+)([a-zA-Z]+)?$/)
  if (match) {
    const numericPart = match[1].replace(',', '.')
    const unitPart = match[2] || ''
    const numericValue = parseFloat(numericPart)
    if (unitPart) return { value: numericValue, unit: unitPart }
  }

  return { value: parseFloat(cleanedValue.replace(',', '.')) / 1000, unit: 'K' }
}

export const convertToNumericValue = (value: number, unit: string): number => {
  return value * (unitMultipliers[unit] || 1)
}

export function parseDurationToHours(duration: string | number | null | undefined): number {
  if (duration === null || duration === undefined || duration === 'Unknown') return 0
  if (typeof duration === 'number' && Number.isFinite(duration)) return duration

  const normalized = String(duration).trim().replace(/,/g, '.').replace(/\s+/g, ' ').toLowerCase()
  if (!normalized) return 0

  const clock = normalized.match(/(\d+:\d{1,2}(?::\d{1,2}){0,2})/)
  if (clock) {
    const parts = clock[1].split(':').map(p => parseInt(p, 10) || 0)
    if (parts.length >= 4) {
      const len = parts.length
      const days = parts[len - 4]
      const hours = parts[len - 3]
      const minutes = parts[len - 2]
      const seconds = parts[len - 1]
      return (days * 24) + hours + minutes / 60 + seconds / 3600
    }
    if (parts.length === 3) return parts[0] + parts[1] / 60 + parts[2] / 3600
    if (parts.length === 2) return parts[0] + parts[1] / 60
  }

  let years = 0
  let days = 0
  let hours = 0
  let minutes = 0
  let seconds = 0
  let matched = false

  const tokenRegex = /(\d+(?:\.\d+)?)\s*(y|yr|yrs|year|years|d|day|days|h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)/gi
  let tokenMatch: RegExpExecArray | null
  while ((tokenMatch = tokenRegex.exec(normalized)) !== null) {
    matched = true
    const value = parseFloat(tokenMatch[1])
    const unit = tokenMatch[2][0]
    if (unit === 'y') years += value
    else if (unit === 'd') days += value
    else if (unit === 'h') hours += value
    else if (unit === 'm') minutes += value
    else if (unit === 's') seconds += value
  }

  if (!matched) {
    const compactRegex = /(\d+(?:\.\d+)?)([ydhms])/gi
    let compact: RegExpExecArray | null
    while ((compact = compactRegex.exec(normalized)) !== null) {
      matched = true
      const value = parseFloat(compact[1])
      const unit = compact[2]
      if (unit === 'y') years += value
      else if (unit === 'd') days += value
      else if (unit === 'h') hours += value
      else if (unit === 'm') minutes += value
      else if (unit === 's') seconds += value
    }
  }

  if (!matched) {
    const numeric = parseFloat(normalized)
    if (Number.isFinite(numeric)) return numeric
    return 0
  }

  const total = years * 24 * 365 + days * 24 + hours + minutes / 60 + seconds / 3600
  return Number.isFinite(total) ? total : 0
}

export function parseDuration(duration: string): number {
  return parseDurationToHours(duration) * 3600
}

export const sortByUnit = (left: string, right: string) => {
  const leftValue = parseValueWithUnit(left)
  const rightValue = parseValueWithUnit(right)
  const leftMultiplier = unitMultipliers[leftValue.unit] || 1
  const rightMultiplier = unitMultipliers[rightValue.unit] || 1
  return (leftValue.value * leftMultiplier) - (rightValue.value * rightMultiplier)
}

export const sortByConvertedDuration = (left: string, right: string) =>
  parseDuration(left) - parseDuration(right)

function applyDecimalPreference(value: string, decimalPreference: DecimalPreference): string {
  if (decimalPreference === 'Comma (,)' && value.includes('.')) {
    return value.replace(/\./g, ',')
  }
  return value
}

function parseDisplayNumericValue(value: number | string): number | string {
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/,/g, ''))
    return Number.isNaN(parsed) ? value : parsed
  }
  return value
}

function formatGroupedValue(numericValue: number, maxFractionDigits: number, useGrouping: boolean, decimalPreference: DecimalPreference): string {
  const output = numericValue.toLocaleString('en-US', {
    maximumFractionDigits: maxFractionDigits,
    useGrouping,
  })
  return applyDecimalPreference(output, decimalPreference)
}

function formatSmallValue(
  numericValue: number,
  strategy: SmallNumberStrategy,
  maxFractionDigits: number,
  useGrouping: boolean,
  decimalPreference: DecimalPreference,
): string {
  if (strategy === 'round') {
    return applyDecimalPreference(Math.round(numericValue).toString(), decimalPreference)
  }

  const cappedFractionDigits = Math.min(maxFractionDigits, SITE_MAX_DISPLAY_DECIMALS)
  const rounded = roundToDisplayPrecision(numericValue, cappedFractionDigits)
  const formatted = rounded.toLocaleString('en-US', {
    maximumFractionDigits: cappedFractionDigits,
    minimumFractionDigits: 0,
    useGrouping,
  })

  return applyDecimalPreference(stripInsignificantDecimalZeros(formatted), decimalPreference)
}

function formatNotationValue(numericValue: number, notationMaxFractionDigits: number, decimalPreference: DecimalPreference): string {
  const maxFractionDigits = Math.min(notationMaxFractionDigits, SITE_MAX_DISPLAY_DECIMALS)
  let workingValue = Math.abs(numericValue)

  for (const notation of COMPACT_NUMBER_SUFFIX_ORDER) {
    workingValue /= 1000
    if (workingValue < 1000) {
      const signedValue = numericValue < 0 ? -workingValue : workingValue
      const output = formatDecimalForDisplay(signedValue, { maxDecimals: maxFractionDigits })
      return applyDecimalPreference(`${output}${notation}`, decimalPreference)
    }
  }

  return applyDecimalPreference(numericValue.toExponential(2), decimalPreference)
}

export function formatNumberForDisplay(
  value: number | string,
  decimalPreference: DecimalPreference = 'Period (.)',
  options: FormatNumberForDisplayOptions = {},
): string {
  if (value === null || value === undefined || value === 'N/A') return 'N/A'
  if (typeof value === 'string' && value.trim() === '') return ''
  const mode = options.mode ?? 'display'
  const smallNumberStrategy = options.smallNumberStrategy ?? (mode === 'compact' || mode === 'grouped' ? 'preserve' : 'preserve')
  const smallNumberMaxFractionDigits = options.smallNumberMaxFractionDigits ?? SITE_MAX_DISPLAY_DECIMALS
  const notationMaxFractionDigits = options.notationMaxFractionDigits ?? SITE_MAX_DISPLAY_DECIMALS
  const useGrouping = options.useGrouping ?? (mode === 'compact' || mode === 'grouped')

  const numericValue = parseDisplayNumericValue(value)
  if (typeof numericValue !== 'number' || isNaN(numericValue)) return String(value)

  if (mode === 'grouped') {
    return formatGroupedValue(numericValue, smallNumberMaxFractionDigits, useGrouping, decimalPreference)
  }

  if (Math.abs(numericValue) < 1000) {
    return formatSmallValue(
      numericValue,
      smallNumberStrategy,
      smallNumberMaxFractionDigits,
      useGrouping,
      decimalPreference,
    )
  }

  return formatNotationValue(numericValue, notationMaxFractionDigits, decimalPreference)
}

export function formatUnknownNumberForDisplay(
  value: unknown,
  options: FormatUnknownNumberForDisplayOptions = {},
): string {
  const decimalPreference = options.decimalPreference ?? 'Period (.)'
  const invalidFallback = options.invalidFallback ?? 'N/A'
  const nullFallback = options.nullFallback ?? invalidFallback

  if (value === null || value === undefined || value === '') return nullFallback

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return invalidFallback
    return formatNumberForDisplay(value, decimalPreference, options)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return nullFallback
    const numeric = Number(trimmed)
    if (!Number.isFinite(numeric)) return invalidFallback
    return formatNumberForDisplay(numeric, decimalPreference, options)
  }

  return invalidFallback
}

const DOTNET_EPOCH_TICKS = 621355968000000000n
const DOTNET_TICKS_MASK = 0x3FFFFFFFFFFFFFFFn

function dotnetTicksToMs(ticks: bigint): number | null {
  const normalized = (ticks & DOTNET_TICKS_MASK) - DOTNET_EPOCH_TICKS
  if (normalized < 0n) return null
  const ms = Number(normalized / 10000n)
  return Number.isFinite(ms) ? ms : null
}

function parseNumericSaveDateTime(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null
  if (value >= 1e14) {
    try {
      return dotnetTicksToMs(BigInt(Math.trunc(value)))
    } catch {
      return null
    }
  }
  if (value < 10_000_000_000) return value * 1000
  return value
}

/** Parse save-file date/time values (ISO, unix ms/s, .NET ticks, `{ __value }` wrappers) to epoch ms. */
export function parseSaveDateTimeToMs(value: unknown): number | null {
  if (value == null) return null
  if (value instanceof Date) {
    const ms = value.getTime()
    return Number.isFinite(ms) ? ms : null
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    if ('__value' in record) return parseSaveDateTimeToMs(record.__value)
    if ('__ticks' in record) return parseSaveDateTimeToMs(record.__ticks)
  }
  if (typeof value === 'number') return parseNumericSaveDateTime(value)
  if (typeof value === 'bigint') return dotnetTicksToMs(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (/^\d+$/.test(trimmed)) {
      try {
        if (trimmed.length >= 16) return dotnetTicksToMs(BigInt(trimmed))
        return parseNumericSaveDateTime(Number(trimmed))
      } catch {
        return null
      }
    }
    const parsed = Date.parse(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function formatDateTimeForDisplay(
  value: unknown,
  options: FormatDateTimeForDisplayOptions = {},
): string {
  const invalidFallback = options.invalidFallback ?? 'N/A'
  if (value == null || value === '') return invalidFallback
  const ms = parseSaveDateTimeToMs(value)
  if (ms == null) return invalidFallback
  return new Date(ms).toLocaleString()
}

export function formatSecondsAsHoursMinutes(
  seconds: number | undefined | null,
  options: FormatSecondsAsHoursMinutesOptions = {},
): string {
  const zeroFallback = options.zeroFallback ?? '0m'
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return zeroFallback
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function formatGroupedNumber(
  value: unknown,
  options: FormatGroupedNumberOptions = {},
): string {
  const invalidFallback = options.invalidFallback ?? '0'
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return invalidFallback
  return numeric.toLocaleString(options.locale, {
    useGrouping: options.useGrouping,
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
  })
}

export function formatRateWithNotation(amount: number, hours: number): string {
  if (!Number.isFinite(amount) || hours <= 0) return '0'
  const rate = amount / hours
  if (Math.abs(rate) < 1000) return formatNumberForDisplay(rate)

  let workingValue = Math.abs(rate)
  for (const notation of COMPACT_NUMBER_SUFFIX_ORDER) {
    workingValue /= 1000
    if (workingValue < 1000) {
      const signedRate = rate < 0 ? -workingValue : workingValue
      const output = formatDecimalForDisplay(signedRate, { maxDecimals: SITE_MAX_DISPLAY_DECIMALS })
      if (output.startsWith('0.')) {
        return `${formatDecimalForDisplay(rate * 1000, { maxDecimals: SITE_MAX_DISPLAY_DECIMALS })}K`
      }
      return `${output}${notation}`
    }
  }

  return rate.toExponential(2)
}

export function parseResource(raw: string | null | undefined): { error?: true; value?: number } {
  if (!raw) return { error: true }
  const cleaned = normalizeDecimalSeparator(raw)
  if (!cleaned) return { error: true }
  const standardized = standardizeNotation(cleaned)
  const value = parseNumberInput(standardized)
  if (!Number.isFinite(value) || value < 0) return { error: true }
  return { value }
}

export function calculateHourlyRate(value: unknown, duration?: string | null): string | null {
  const hours = parseDurationToHours(duration)
  if (!hours || hours <= 0) return null
  const numeric = parseNumberInput(standardizeNotation(String(value ?? '0')))
  if (numeric === undefined || numeric === null || Number.isNaN(Number(numeric))) return null
  return formatNumberForDisplay(Number(numeric) / hours)
}

export function formatDateToISO(dateStr?: string | null): string {
  const today = new Date().toISOString().split('T')[0]
  if (!dateStr || typeof dateStr !== 'string') return today
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const parts = dateStr.split(/[/-]/)
  if (parts.length === 3) {
    const [firstPart, secondPart, yearPart] = parts
    if (yearPart.length === 4) {
      const first = parseInt(firstPart, 10)
      const second = parseInt(secondPart, 10)
      const month = first > 12 ? second : first
      const day = first > 12 ? first : second
      return `${yearPart}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
    const year = `20${yearPart}`
    const first = parseInt(firstPart, 10)
    const second = parseInt(secondPart, 10)
    const month = first > 12 ? second : first
    const day = first > 12 ? first : second
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  return dateStr
}

export function formatTimeTo24h(timeStr?: string | null): string {
  const now = new Date().toISOString().split('T')[1]?.slice(0, 8) ?? '00:00:00'
  if (!timeStr || typeof timeStr !== 'string') return now
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return timeStr
  const match = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)/i)
  if (match) {
    let hour = parseInt(match[1], 10)
    const minute = match[2]
    const second = match[3] || '00'
    const ampm = match[4].toUpperCase()
    if (ampm === 'PM' && hour < 12) hour += 12
    if (ampm === 'AM' && hour === 12) hour = 0
    return `${hour.toString().padStart(2, '0')}:${minute}:${second}`
  }
  return timeStr
}

export function normalizeDecimalSeparators<T>(data: T): T {
  const normalizeValue = (value: unknown, key?: string): unknown => {
    if (value === null || value === undefined) return value

    if (typeof value === 'string') {
      const lowerKey = key?.toLowerCase() ?? ''
      if (lowerKey.includes('date') || lowerKey.includes('time')) return value.trim()
      let normalizedValue = value.replace(/(\d),(\d)/g, '$1.$2')
      normalizedValue = standardizeNotation(normalizedValue)
      return normalizedValue
    }

    if (Array.isArray(value)) return value.map(entry => normalizeValue(entry))

    if (typeof value === 'object') {
      const output: Record<string, unknown> = {}
      for (const [entryKey, entryValue] of Object.entries(value)) {
        output[entryKey] = normalizeValue(entryValue, entryKey)
      }
      return output
    }

    return value
  }

  return normalizeValue(data) as T
}
