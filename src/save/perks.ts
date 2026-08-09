import { z } from 'zod'
import {
  listActivePerkIndices,
  resolvePerkCatalogRow,
  resolvePerkNameByIndex,
} from './catalogs/perks'
import {
  coerceSaveNumber,
  readSaveBoolean,
  readSaveIntList,
  readSaveNumberSource,
  toNumberArray,
} from './read-values'

export const sharedPerkPreferencesSchema = z.object({
  bannedIndices: z.array(z.number().int().min(0)),
  unbannedIndices: z.array(z.number().int().min(0)),
  bannedPerkNames: z.array(z.string()),
  unbannedPerkNames: z.array(z.string()),
  firstPerkIndex: z.number().int().min(-1).nullable(),
  firstPerkName: z.string().nullable(),
  firstTradeOffPerkIndex: z.number().int().min(-1).nullable(),
  firstTradeOffPerkName: z.string().nullable(),
  autoPickPerk: z.boolean(),
  autoPickOrder: z.array(z.number().int().min(0)),
})

export type SharedPerkPreferences = z.infer<typeof sharedPerkPreferencesSchema>

export const defaultSharedPerkPreferences: Readonly<SharedPerkPreferences> = {
  bannedIndices: [],
  unbannedIndices: [...listActivePerkIndices()],
  bannedPerkNames: [],
  unbannedPerkNames: listActivePerkIndices()
    .map(index => resolvePerkNameByIndex(index))
    .filter((name): name is string => Boolean(name)),
  firstPerkIndex: null,
  firstPerkName: null,
  firstTradeOffPerkIndex: null,
  firstTradeOffPerkName: null,
  autoPickPerk: false,
  autoPickOrder: [],
}

function normalizePerkIndex(value: unknown): number | null {
  const parsed = coerceSaveNumber(value)
  if (parsed == null) return null
  return Math.floor(parsed)
}

function uniqueSortedIndices(indices: Iterable<number>): number[] {
  return [...new Set(indices)].sort((left, right) => left - right)
}

function resolvePerkNames(indices: readonly number[]): string[] {
  return indices
    .map(index => resolvePerkNameByIndex(index))
    .filter((name): name is string => Boolean(name))
}

export function deriveUnbannedPerkIndices(
  bannedIndices: readonly number[],
  activeIndices: readonly number[] = listActivePerkIndices(),
): number[] {
  const banned = new Set(bannedIndices)
  return activeIndices.filter(index => !banned.has(index))
}

export function normalizeSharedPerkPreferences(value: unknown): SharedPerkPreferences {
  if (!value || typeof value !== 'object') {
    return { ...defaultSharedPerkPreferences }
  }

  const source = value as Record<string, unknown>
  const bannedIndices = uniqueSortedIndices(
    toNumberArray(source.bannedIndices).map(index => Math.max(0, Math.floor(index))),
  )
  const activeIndices = listActivePerkIndices()
  const unbannedIndices = uniqueSortedIndices(
    Array.isArray(source.unbannedIndices) && source.unbannedIndices.length
      ? toNumberArray(source.unbannedIndices).map(index => Math.max(0, Math.floor(index)))
      : deriveUnbannedPerkIndices(bannedIndices, activeIndices),
  )

  const firstPerkRaw = normalizePerkIndex(source.firstPerkIndex)
  const firstTradeOffRaw = normalizePerkIndex(source.firstTradeOffPerkIndex)

  const normalized = {
    bannedIndices,
    unbannedIndices,
    bannedPerkNames: resolvePerkNames(bannedIndices),
    unbannedPerkNames: resolvePerkNames(unbannedIndices),
    firstPerkIndex: firstPerkRaw == null || firstPerkRaw < 0 ? null : firstPerkRaw,
    firstPerkName: firstPerkRaw != null && firstPerkRaw >= 0
      ? resolvePerkNameByIndex(firstPerkRaw)
      : null,
    firstTradeOffPerkIndex: firstTradeOffRaw == null || firstTradeOffRaw < 0 ? null : firstTradeOffRaw,
    firstTradeOffPerkName: firstTradeOffRaw != null && firstTradeOffRaw >= 0
      ? resolvePerkNameByIndex(firstTradeOffRaw)
      : null,
    autoPickPerk: source.autoPickPerk === true,
    autoPickOrder: Array.isArray(source.autoPickOrder)
      ? readSavePerkOrderList(source.autoPickOrder)
      : [],
  }

  return sharedPerkPreferencesSchema.parse(normalized)
}

/** Unity perk order lists may use -1 for empty slots; do not coerce those to index 0. */
export function readSavePerkOrderList(raw: unknown): number[] {
  const out: number[] = []
  for (const item of readSaveNumberSource(raw)) {
    const parsed = coerceSaveNumber(item)
    if (parsed == null || parsed < 0) continue
    out.push(Math.floor(parsed))
  }
  return out
}

const ACTIVE_PERK_INDEX_SET = new Set(listActivePerkIndices())

export function resolveOverviewAutopickPerkIndices(
  preferences: Pick<SharedPerkPreferences, 'autoPickPerk' | 'autoPickOrder' | 'bannedIndices'>,
): number[] {
  if (preferences.autoPickPerk !== true) return []

  const banned = new Set(preferences.bannedIndices)
  const seen = new Set<number>()
  const indices: number[] = []

  for (const rawIndex of preferences.autoPickOrder) {
    const perkIndex = Math.floor(Number(rawIndex))
    if (!Number.isFinite(perkIndex) || perkIndex < 0) continue
    if (!ACTIVE_PERK_INDEX_SET.has(perkIndex)) continue
    if (banned.has(perkIndex)) continue
    if (seen.has(perkIndex)) continue
    if (!resolvePerkCatalogRow(perkIndex)) continue
    seen.add(perkIndex)
    indices.push(perkIndex)
  }

  return indices
}

export function derivePerkPreferencesFromSaveRoot(
  root: Record<string, unknown> | null | undefined,
): SharedPerkPreferences {
  if (!root) return { ...defaultSharedPerkPreferences }

  const bannedIndices = uniqueSortedIndices(toNumberArray(root.bannedPerksIndex))
  const unbannedIndices = deriveUnbannedPerkIndices(bannedIndices)

  const firstPerkRaw = normalizePerkIndex(root.firstPerkIndex)
  const firstTradeOffRaw = normalizePerkIndex(root.firstTradeOffPerkIndex)

  return normalizeSharedPerkPreferences({
    bannedIndices,
    unbannedIndices,
    firstPerkIndex: firstPerkRaw,
    firstTradeOffPerkIndex: firstTradeOffRaw,
    autoPickPerk: readSaveBoolean(root.autoPickPerk),
    autoPickOrder: readSavePerkOrderList(root.autoPickOrder),
  })
}
