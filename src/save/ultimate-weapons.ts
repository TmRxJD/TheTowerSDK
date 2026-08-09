import { IMPORT_CATALOG_META } from './catalogs/indexes'
import { findUwWeaponByName, type UwWeaponValue } from '../data/ultimate-weapons'
import { uwStoneChartData } from '../data/ultimate-weapon-stones'
import { listUltimateWeaponCatalogRows, UW_CATALOG_SLOT_COUNT } from './catalogs/ultimate-weapons'
import { coerceSaveNumber, toNumberArray } from './read-values'

export interface UltimateWeaponStatLevel {
  levels: number
  value: string | number
  cost: number
}

export interface UltimateWeaponStat {
  name: string
  levels: UltimateWeaponStatLevel[]
}

export interface UltimateWeaponData {
  name: string
  label: string
  stats: UltimateWeaponStat[]
}

/** Re-export for save-import consumers that imported from the site shim. */
export { UW_CATALOG_SLOT_COUNT } from './catalogs/ultimate-weapons'

/** Base UW stats per weapon slot in flat ultimateWeaponLevel[] (plus is separate). */
export const UW_SAVE_BASE_STAT_LEVELS_PER_SLOT = 3

export const UW_SAVE_SYSTEM_UNLOCKED_KEY = 'ultimateWeaponsSystemUnlocked'
export const UW_SAVE_WEAPON_LEVEL_KEY = 'ultimateWeaponLevel'
export const UW_SAVE_WEAPON_UNLOCKED_KEY = 'ultimateWeaponUnlocked'
export const UW_SAVE_WEAPON_ON_KEY = 'ultimateWeaponOn'
export const UW_SAVE_PLUS_LEVEL_KEY = 'ultimateWeaponPlusLevel'
export const UW_SAVE_PLUS_UNLOCKED_KEY = 'ultimateWeaponPlusUnlocked'
export const UW_SAVE_PLUS_ON_KEY = 'ultimateWeaponPlusOn'
export const UW_SAVE_WEAPON_UNLOCKED_INDEX_KEY = 'ultimateWeaponUnlockedIndex'
export const UW_SAVE_TOGGLE_COUNT_KEY = 'ultimateToggleCount'

export function resolveUltimateWeaponSaveSlotNames(): readonly string[] {
  const catalog = listUltimateWeaponCatalogRows()
  if (catalog.length > 0) {
    return catalog.map(row => row.name).filter((name): name is Exclude<typeof name, null | undefined> => name != null)
  }
  return []
}

/** @deprecated Superseded by the ultimate weapon import catalog. */
export const UW_SAVE_SLOT_WEAPON_NAMES_LEGACY = [
  'Chain Lightning',
  'Smart Missiles',
  'Death Wave',
  'Chrono Field',
  'Inner Land Mines',
  'Golden Tower',
  'Poison Swamp',
  'Black Hole',
  'Spotlight',
] as const

export const UW_SAVE_SLOT_WEAPON_NAMES = (
  resolveUltimateWeaponSaveSlotNames().length > 0
    ? resolveUltimateWeaponSaveSlotNames()
    : UW_SAVE_SLOT_WEAPON_NAMES_LEGACY
) as readonly string[]

export interface UltimateWeaponsSaveSlot {
  slotIndex: number
  unlocked: boolean | null
  active: boolean | null
  plusLevel: number | null
  plusUnlocked: boolean | null
  plusOn: boolean | null
  /** First three base-stat levels when the flat array divides evenly into slots. */
  baseStatLevels: number[]
}

export interface UltimateWeaponsSaveMeta {
  systemUnlocked: boolean
  weaponUnlockedIndex: number | null
  toggleCount: number | null
}

export interface UltimateWeaponsSaveExtract {
  meta: UltimateWeaponsSaveMeta
  slots: UltimateWeaponsSaveSlot[]
  rawWeaponLevels: number[]
  warnings: string[]
  /** True when flat level array length matches slots × base stats per slot. */
  baseStatChunkingPlausible: boolean
}

export interface UltimateWeaponsImportStatPreview {
  name: string
  level: number | null
  displayValue: string
  isPlus: boolean
  /** Fourth stat when plus track is not unlocked in save. */
  advancedLocked: boolean
}

export interface UltimateWeaponsImportWeaponPreview {
  slotIndex: number
  name: string
  label: string
  unlocked: boolean
  advancedUnlocked: boolean
  stats: UltimateWeaponsImportStatPreview[]
}

export interface UltimateWeaponsTrackerSaveImportPayload {
  unlocked: Record<string, boolean>
  advancedEnabled: Record<string, boolean>
  statStarts: Record<string, Record<string, number>>
}

function toWeaponStatCost(cost: number | string): number {
  const numeric = Number(cost)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.floor(numeric))
}

export function mapUwWeaponValueToUltimateWeaponData(weapon: UwWeaponValue): UltimateWeaponData {
  return {
    name: weapon.name,
    label: weapon.label || weapon.name,
    stats: (weapon.stats || []).map(stat => ({
      name: stat.name,
      levels: (stat.levels || []).map(level => ({
        levels: level.level ?? level.levels ?? 0,
        value: level.value,
        cost: toWeaponStatCost(level.cost),
      })),
    })),
  }
}

/** Canonical weapon catalog for import previews and stat-name resolution. */
export function buildUltimateWeaponCatalogFromStoneChart(): UltimateWeaponData[] {
  return Object.values(uwStoneChartData).map(mapUwWeaponValueToUltimateWeaponData)
}

/** Stone-chart catalog when the UW tracker store has not hydrated weapon metadata yet. */
export function resolveUltimateWeaponCatalogForHubSync(
  storeWeapons: UltimateWeaponData[] = [],
): UltimateWeaponData[] {
  if (storeWeapons.length > 0) return storeWeapons
  const catalog = buildUltimateWeaponCatalogFromStoneChart()
  if (catalog.length > 0) return catalog
  return UW_SAVE_SLOT_WEAPON_NAMES.map(name => ({
    name,
    label: name,
    stats: [],
  })) as UltimateWeaponData[]
}

function resolveUltimateWeaponCatalogEntry(
  weaponName: string,
  storeWeapons: UltimateWeaponData[] = [],
): UltimateWeaponData | undefined {
  const fromStore = storeWeapons.find(item => item.name === weaponName)
  if (fromStore?.stats?.length) return fromStore

  const fromChart = findUwWeaponByName(uwStoneChartData, weaponName)
  if (fromChart) return mapUwWeaponValueToUltimateWeaponData(fromChart)

  return fromStore
}

function readBooleanArray(raw: unknown): Array<boolean | null> {
  if (!Array.isArray(raw)) return []
  return raw.map(item => (typeof item === 'boolean' ? item : null))
}

function chunkBaseStatLevels(levels: number[], slotCount: number): number[][] {
  const perSlot = UW_SAVE_BASE_STAT_LEVELS_PER_SLOT
  if (slotCount <= 0 || levels.length !== slotCount * perSlot) return []

  const chunks: number[][] = []
  for (let slot = 0; slot < slotCount; slot += 1) {
    chunks.push(levels.slice(slot * perSlot, slot * perSlot + perSlot))
  }
  return chunks
}

export function extractUltimateWeaponsFromSaveRoot(parsedRoot: unknown): UltimateWeaponsSaveExtract | null {
  if (!parsedRoot || typeof parsedRoot !== 'object') return null

  const root = parsedRoot as Record<string, unknown>
  const warnings: string[] = []

  const unlocked = readBooleanArray(root[UW_SAVE_WEAPON_UNLOCKED_KEY])
  const active = readBooleanArray(root[UW_SAVE_WEAPON_ON_KEY])
  const plusUnlocked = readBooleanArray(root[UW_SAVE_PLUS_UNLOCKED_KEY])
  const plusOn = readBooleanArray(root[UW_SAVE_PLUS_ON_KEY])
  const plusLevels = toNumberArray(root[UW_SAVE_PLUS_LEVEL_KEY])
  const rawWeaponLevels = toNumberArray(root[UW_SAVE_WEAPON_LEVEL_KEY])

  const parallelLengths = new Set(
    [unlocked.length, active.length, plusUnlocked.length, plusOn.length, plusLevels.length].filter(len => len > 0),
  )
  if (parallelLengths.size > 1) {
    warnings.push(
      `Ultimate weapon slot arrays have mismatched lengths (${[...parallelLengths].join(', ')}); slot rows may be incomplete.`,
    )
  }

  const slotCount = Math.max(unlocked.length, active.length, plusLevels.length, plusUnlocked.length, plusOn.length, 0)
  if (slotCount > 0 && slotCount !== UW_CATALOG_SLOT_COUNT) {
    warnings.push(`Expected ${UW_CATALOG_SLOT_COUNT} weapon slots; save has ${slotCount}.`)
  }
  if (!IMPORT_CATALOG_META.populated.ultimateWeapons) {
    warnings.push('Ultimate weapon slot catalog is not imported from game data yet.')
  }

  const baseStatChunkingPlausible =
    slotCount > 0 && rawWeaponLevels.length === slotCount * UW_SAVE_BASE_STAT_LEVELS_PER_SLOT
  if (rawWeaponLevels.length > 0 && !baseStatChunkingPlausible) {
    warnings.push(
      `${UW_SAVE_WEAPON_LEVEL_KEY} has ${rawWeaponLevels.length} values; expected ${slotCount * UW_SAVE_BASE_STAT_LEVELS_PER_SLOT} for ${slotCount} slots × ${UW_SAVE_BASE_STAT_LEVELS_PER_SLOT} base stats. Stat level import is unavailable.`,
    )
  }

  const levelChunks = baseStatChunkingPlausible ? chunkBaseStatLevels(rawWeaponLevels, slotCount) : []
  const slots: UltimateWeaponsSaveSlot[] = []

  for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
    slots.push({
      slotIndex,
      unlocked: unlocked[slotIndex] ?? null,
      active: active[slotIndex] ?? null,
      plusLevel: plusLevels[slotIndex] ?? null,
      plusUnlocked: plusUnlocked[slotIndex] ?? null,
      plusOn: plusOn[slotIndex] ?? null,
      baseStatLevels: levelChunks[slotIndex] ?? [],
    })
  }

  return {
    meta: {
      systemUnlocked: Boolean(root[UW_SAVE_SYSTEM_UNLOCKED_KEY]),
      weaponUnlockedIndex: coerceSaveNumber(root[UW_SAVE_WEAPON_UNLOCKED_INDEX_KEY]),
      toggleCount: coerceSaveNumber(root[UW_SAVE_TOGGLE_COUNT_KEY]),
    },
    slots,
    rawWeaponLevels,
    warnings,
    baseStatChunkingPlausible,
  }
}

function statLevelNumber(levelRow: UltimateWeaponData['stats'][number]['levels'][number]): number {
  const raw = levelRow as { level?: number; levels?: number }
  if (typeof raw.level === 'number') return raw.level
  if (typeof raw.levels === 'number') return raw.levels
  return 0
}

function displayValueForStatLevel(
  stat: UltimateWeaponData['stats'][number],
  level: number | null,
): string {
  if (level === null) return '—'
  const row = (stat.levels || []).find(entry => statLevelNumber(entry) === level)
  if (!row) return '—'
  return String(row.value ?? '—')
}

export function buildUltimateWeaponsImportWeaponPreviews(
  extract: UltimateWeaponsSaveExtract,
  storeWeapons: UltimateWeaponData[] = [],
): UltimateWeaponsImportWeaponPreview[] {
  const catalog = buildUltimateWeaponCatalogFromStoneChart()
  const weapons = catalog.length ? catalog : storeWeapons

  return extract.slots.map(slot => {
    const name = UW_SAVE_SLOT_WEAPON_NAMES[slot.slotIndex] ?? `Slot ${slot.slotIndex + 1}`
    const weapon = resolveUltimateWeaponCatalogEntry(name, weapons)
    const label = weapon?.label || weapon?.name || name
    const unlocked = slot.unlocked ?? false
    const advancedUnlocked = slot.plusUnlocked ?? false
    const stats: UltimateWeaponsImportStatPreview[] = []

    if (weapon) {
      for (let index = 0; index < UW_SAVE_BASE_STAT_LEVELS_PER_SLOT; index += 1) {
        const stat = weapon.stats[index]
        if (!stat) continue
        const level = slot.baseStatLevels[index] ?? null
        stats.push({
          name: stat.name,
          level,
          displayValue: displayValueForStatLevel(stat, level),
          isPlus: false,
          advancedLocked: false,
        })
      }

      const plusStat = weapon.stats[UW_SAVE_BASE_STAT_LEVELS_PER_SLOT]
      if (plusStat) {
        const plusLevel = slot.plusLevel ?? null
        stats.push({
          name: plusStat.name,
          level: plusLevel,
          displayValue: displayValueForStatLevel(plusStat, plusLevel),
          isPlus: true,
          advancedLocked: !advancedUnlocked,
        })
      }
    }

    return {
      slotIndex: slot.slotIndex,
      name,
      label,
      unlocked,
      advancedUnlocked,
      stats,
    }
  })
}

export function canImportUltimateWeaponsToTracker(extract: UltimateWeaponsSaveExtract | null): boolean {
  if (!extract?.meta.systemUnlocked || extract.slots.length === 0) return false
  if (!extract.baseStatChunkingPlausible) return false
  if (UW_SAVE_SLOT_WEAPON_NAMES.length !== extract.slots.length) return false
  if (!IMPORT_CATALOG_META.populated.ultimateWeapons) return false
  return true
}

export function buildUltimateWeaponsTrackerImportPayload(
  extract: UltimateWeaponsSaveExtract,
  weapons: UltimateWeaponData[],
): UltimateWeaponsTrackerSaveImportPayload | null {
  const slotNames = UW_SAVE_SLOT_WEAPON_NAMES
  if (slotNames.length !== extract.slots.length) return null

  const unlocked: Record<string, boolean> = {}
  const advancedEnabled: Record<string, boolean> = {}
  const statStarts: Record<string, Record<string, number>> = {}

  for (const slot of extract.slots) {
    const weaponName = slotNames[slot.slotIndex]
    if (!weaponName) continue

    if (slot.unlocked !== null) unlocked[weaponName] = slot.unlocked
    if (slot.plusUnlocked !== null) advancedEnabled[weaponName] = slot.plusUnlocked

    const weapon = resolveUltimateWeaponCatalogEntry(weaponName, weapons)
    if (!weapon || !extract.baseStatChunkingPlausible) continue

    const statNames = (weapon.stats || []).map(stat => stat.name)
    const starts: Record<string, number> = {}

    for (let statIndex = 0; statIndex < UW_SAVE_BASE_STAT_LEVELS_PER_SLOT; statIndex += 1) {
      const level = slot.baseStatLevels[statIndex]
      const statName = statNames[statIndex]
      if (typeof level === 'number' && statName) starts[statName] = level
    }

    const plusStatName = statNames[UW_SAVE_BASE_STAT_LEVELS_PER_SLOT]
    if (typeof slot.plusLevel === 'number' && plusStatName) {
      starts[plusStatName] = slot.plusLevel
    }

    if (Object.keys(starts).length) statStarts[weaponName] = starts
  }

  return { unlocked, advancedEnabled, statStarts }
}
