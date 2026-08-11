import { IMPORT_CATALOG_META } from './catalogs/indexes'
import {
  listGuardianChipCatalogRows,
  listGuardianChipSlotCatalogRows,
  listGuardianSkinCatalogRows,
  findGuardianChipCatalogRowBySlotIndex,
  getGuardianChipSlotLabel,
  findGuardianChipTrackerKeyBySlotIndex,
  getGuardianSkinLabel,
} from './catalogs/guardians'
import {
  buildGuardianDefinitions,
  getGuardianStatBounds,
  getGuardianStatNames,
} from '../data/guardians'
import { coerceSaveNumber, readSaveBoolean, readSaveEnumValue, toNumberArray } from './read-values'

export const GUARDIANS_SAVE_UNLOCKED_KEY = 'guardianUnlocked'
export const GUARDIANS_SAVE_SLOTS_UNLOCKED_KEY = 'guardianSlotsUnlocked'
export const GUARDIANS_SAVE_CHIP_SLOT_KEY = 'guardianChipSlot'
export const GUARDIANS_SAVE_CHIP_UNLOCKED_KEY = 'guardianChipUnlocked'
export const GUARDIANS_SAVE_CHIP_LEVEL_KEY = 'guardianChipLevel'
export const GUARDIANS_SAVE_SKIN_INDEX_KEY = 'guardianSkinIndex'
export const GUARDIANS_SAVE_SKIN_UNLOCKED_KEY = 'guardianSkinUnlocked'
export const GUARDIANS_SAVE_DAMAGE_KEY = 'totalDamageByGuardian'
export const GUARDIANS_SAVE_COINS_KEY = 'totalCoinsByGuardian'
export const GUARDIANS_SAVE_CATCHES_KEY = 'totalCatchesByGuardian'

export const GUARDIAN_CHIP_STATS_PER_SLOT = 3

export const GUARDIAN_CHIP_SAVE_SLOT_COUNT = listGuardianChipSlotCatalogRows().length

export interface GuardianChipSaveRow {
  slotIndex: number
  chipType: string | null
  trackerKey: string | null
  label: string
  unlocked: boolean
  statLevels: number[]
  equippedSlot: number | null
}

export interface GuardianEquippedChipRow {
  equipSlot: number
  slotIndex: number
  label: string
  trackerKey: string | null
  statLevels: number[]
}

export interface GuardianSkinSaveRow {
  index: number
  label: string
  unlocked: boolean
  selected: boolean
}

export interface GuardiansSaveExtract {
  guardianUnlocked: boolean
  chips: GuardianChipSaveRow[]
  equippedChips: GuardianEquippedChipRow[]
  skins: GuardianSkinSaveRow[]
  slotsUnlocked: number | null
  skinIndex: number | null
  totalDamage: unknown
  totalCoins: unknown
  totalCatches: unknown
  warnings: string[]
}

function readEquippedChipSlotIndices(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  return raw.map(item => readSaveEnumValue(item) ?? -1)
}

function sliceChipStatLevels(chipLevels: number[], slotIndex: number): number[] {
  const start = slotIndex * GUARDIAN_CHIP_STATS_PER_SLOT
  return chipLevels.slice(start, start + GUARDIAN_CHIP_STATS_PER_SLOT)
}

function buildChipRow(
  slotIndex: number,
  chipUnlocked: boolean[],
  chipLevels: number[],
  equippedSlotByChipIndex: Map<number, number>,
): GuardianChipSaveRow {
  const catalog = findGuardianChipCatalogRowBySlotIndex(slotIndex)
  const statLevels = sliceChipStatLevels(chipLevels, slotIndex)
  const hasProgress = statLevels.some(level => level > 0)
  return {
    slotIndex,
    chipType: catalog?.chipType ?? null,
    trackerKey: findGuardianChipTrackerKeyBySlotIndex(slotIndex),
    label: getGuardianChipSlotLabel(slotIndex),
    unlocked: chipUnlocked[slotIndex] === true || hasProgress,
    statLevels,
    equippedSlot: equippedSlotByChipIndex.get(slotIndex) ?? null,
  }
}

function buildEquippedChipRows(
  equippedSlotIndices: number[],
  chipLevels: number[],
): GuardianEquippedChipRow[] {
  return equippedSlotIndices.flatMap((slotIndex, equipSlot) => {
    if (slotIndex < 0) return []
    return [{
      equipSlot,
      slotIndex,
      label: getGuardianChipSlotLabel(slotIndex),
      trackerKey: findGuardianChipTrackerKeyBySlotIndex(slotIndex),
      statLevels: sliceChipStatLevels(chipLevels, slotIndex),
    }]
  })
}

function buildSkinRows(skinUnlocked: boolean[], skinIndex: number | null): GuardianSkinSaveRow[] {
  const slotCount = Math.max(
    skinUnlocked.length,
    listGuardianSkinCatalogRows().length,
    skinIndex != null ? skinIndex + 1 : 0,
  )
  return Array.from({ length: slotCount }, (_, index) => ({
    index,
    label: getGuardianSkinLabel(index),
    unlocked: skinUnlocked[index] ?? false,
    selected: skinIndex === index,
  }))
}

export function readGuardiansFromSaveRoot(root: Record<string, unknown> | null): GuardiansSaveExtract | null {
  if (!root) return null

  const warnings: string[] = []
  const guardianUnlocked = readSaveBoolean(root[GUARDIANS_SAVE_UNLOCKED_KEY])
  const chipUnlocked = Array.isArray(root[GUARDIANS_SAVE_CHIP_UNLOCKED_KEY])
    ? (root[GUARDIANS_SAVE_CHIP_UNLOCKED_KEY] as unknown[]).map(readSaveBoolean)
    : []
  const chipLevels = toNumberArray(root[GUARDIANS_SAVE_CHIP_LEVEL_KEY])
  const skinUnlocked = Array.isArray(root[GUARDIANS_SAVE_SKIN_UNLOCKED_KEY])
    ? (root[GUARDIANS_SAVE_SKIN_UNLOCKED_KEY] as unknown[]).map(readSaveBoolean)
    : []
  const equippedSlotIndices = readEquippedChipSlotIndices(root[GUARDIANS_SAVE_CHIP_SLOT_KEY])

  const equippedSlotByChipIndex = new Map<number, number>()
  equippedSlotIndices.forEach((slotIndex, equipSlot) => {
    if (slotIndex >= 0) equippedSlotByChipIndex.set(slotIndex, equipSlot)
  })

  if (!guardianUnlocked && chipUnlocked.length === 0) {
    warnings.push('No guardian unlock data found in save.')
  }

  if (chipUnlocked.length > 0 && chipUnlocked.length !== GUARDIAN_CHIP_SAVE_SLOT_COUNT) {
    warnings.push(
      `guardianChipUnlocked has ${chipUnlocked.length} entries; catalog expects ${GUARDIAN_CHIP_SAVE_SLOT_COUNT}.`,
    )
  }

  if (!IMPORT_CATALOG_META.populated.guardians) {
    warnings.push('Guardian chip names are not imported from native yet.')
  }

  const skinIndex = coerceSaveNumber(root[GUARDIANS_SAVE_SKIN_INDEX_KEY])
  const slotCount = Math.max(
    chipUnlocked.length,
    Math.ceil(chipLevels.length / GUARDIAN_CHIP_STATS_PER_SLOT),
    GUARDIAN_CHIP_SAVE_SLOT_COUNT,
  )
  const chips = Array.from({ length: slotCount }, (_, slotIndex) => buildChipRow(
    slotIndex,
    chipUnlocked,
    chipLevels,
    equippedSlotByChipIndex,
  ))
  const equippedChips = buildEquippedChipRows(equippedSlotIndices, chipLevels)
  const skins = buildSkinRows(skinUnlocked, skinIndex)

  return {
    guardianUnlocked,
    chips,
    equippedChips,
    skins,
    slotsUnlocked: coerceSaveNumber(root[GUARDIANS_SAVE_SLOTS_UNLOCKED_KEY]),
    skinIndex,
    totalDamage: root[GUARDIANS_SAVE_DAMAGE_KEY] ?? null,
    totalCoins: root[GUARDIANS_SAVE_COINS_KEY] ?? null,
    totalCatches: root[GUARDIANS_SAVE_CATCHES_KEY] ?? null,
    warnings,
  }
}

export interface GuardiansTrackerSaveImportPayload {
  levels: Record<string, number[]>
  disabled: Record<string, boolean>
}

export function buildGuardiansTrackerImportPayload(
  extract: GuardiansSaveExtract,
): GuardiansTrackerSaveImportPayload | null {
  if (!extract.guardianUnlocked && extract.chips.every(chip => !chip.unlocked)) return null

  const guardianDefs = buildGuardianDefinitions()
  const guardianLabels = guardianDefs.map(def => def.label)
  const guardianKeys = guardianDefs.map(def => def.key)
  const getStatCount = (label: string) => {
    const guardian = guardianDefs.find(def => def.label === label)
    return guardian ? getGuardianStatNames(guardian).length : 0
  }
  const clampStatLevel = (label: string, statIndex: number, level: number) => {
    const guardian = guardianDefs.find(def => def.label === label)
    if (!guardian) return Math.max(0, Math.floor(level))
    const bounds = getGuardianStatBounds(guardian, statIndex)
    return Math.min(bounds.max, Math.max(bounds.min, Math.floor(level)))
  }

  const levels: Record<string, number[]> = {}
  const disabled: Record<string, boolean> = {}
  const chipByTrackerKey = new Map(
    extract.chips
      .filter(chip => chip.trackerKey)
      .map(chip => [chip.trackerKey as string, chip]),
  )

  guardianLabels.forEach((label, index) => {
    const trackerKey = guardianKeys[index]
    const chip = trackerKey ? chipByTrackerKey.get(trackerKey) : null
    const baseUnlocked = trackerKey === 'bounty'
      ? extract.guardianUnlocked || chip?.unlocked === true
      : chip?.unlocked === true
    const statLevels = chip?.statLevels ?? []
    const importLevel = statLevels.find(level => level > 0) ?? statLevels[0] ?? 0

    disabled[label] = !baseUnlocked && !statLevels.some(level => level > 0)
    if (baseUnlocked || statLevels.some(level => level > 0)) {
      const statCount = getStatCount(label)
      levels[label] = Array.from({ length: statCount }, (_, statIndex) => (
        clampStatLevel(label, statIndex, statLevels[statIndex] ?? importLevel)
      ))
    }
  })

  return { levels, disabled }
}

export function listReleasedGuardianChipCatalogRows() {
  return listGuardianChipCatalogRows()
}
