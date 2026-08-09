/**
 * Framework-agnostic helpers for reading numeric/boolean fields from parsed save roots.
 */

export function coerceSaveNumber(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    if ('__value' in record) return coerceSaveNumber(record.__value)
    if ('value__' in record) return coerceSaveNumber(record.value__)
    if ('mantissa' in record && 'exponent' in record) {
      const mantissa = coerceSaveNumber(record.mantissa)
      const exponent = coerceSaveNumber(record.exponent)
      if (mantissa == null || exponent == null) return null
      return mantissa * Math.pow(10, exponent)
    }
  }
  return null
}

export function readSaveEnumValue(raw: unknown): number | null {
  if (raw && typeof raw === 'object' && 'value__' in raw) {
    return coerceSaveNumber((raw as { value__: unknown }).value__)
  }
  return coerceSaveNumber(raw)
}

export function toNumberArray(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(item => coerceSaveNumber(item))
    .filter((item): item is number => item != null)
}

export function readSaveNumberSource(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== 'object') return []

  const list = raw as Record<string, unknown>
  if (!Array.isArray(list._items)) return []

  const values = list._items
  const size = coerceSaveNumber(list._size)
  if (size == null) return values
  return values.slice(0, Math.max(0, Math.floor(size)))
}

export function readIndexedNumberArray(raw: unknown, length: number): number[] {
  const result = Array.from({ length }, () => 0)
  const source = readSaveNumberSource(raw)
  if (source.length === 0) return result

  const limit = Math.min(source.length, length)
  for (let index = 0; index < limit; index += 1) {
    result[index] = coerceSaveNumber(source[index]) ?? 0
  }
  return result
}

export function readSaveBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  const numeric = coerceSaveNumber(value)
  return numeric === 1
}

/** Unity `List<int>` or plain arrays from parsed save roots. */
export function readSaveIntList(raw: unknown): number[] {
  const source = readSaveNumberSource(raw)
  if (source.length === 0) return []
  return source.map(item => Math.max(0, Math.floor(coerceSaveNumber(item) ?? 0)))
}
