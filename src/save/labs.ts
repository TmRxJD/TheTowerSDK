import { estimateLabLevelRemainingSeconds } from './lab-remaining'
import { findLabResearchByIndex } from '../data/labs-research'
import {
  isLabsTrackerResearchLabName,
  TOOL_LAB_OVERVIEW_CATEGORY_ORDER,
} from '../data/labs'
import { normalizeLabsTrackerLabLevelMap } from '../internal/labs-persistence'
import { LAB_RESEARCH_IMPORT_CATALOG, RESEARCH_CATEGORY_ENUM } from '../data/player-stats'
import {
  resolveLabResearchCategory,
  resolveLabResearchDisplayName,
  resolveLabResearchSlug,
} from '../data/labs-display-overrides'
import { coerceSaveNumber, toNumberArray } from './read-values'

export const LABS_SAVE_UNLOCKED_KEY = 'labsUnlocked'
export const LABS_SAVE_RESEARCH_LEVEL_KEY = 'researchLevel'
export const LABS_SAVE_RESEARCH_PERCENT_KEY = 'researchPercentComplete'
export const LABS_SAVE_LAB_LEVEL_KEY = 'labLevel'
export const LABS_SAVE_LAB_RESEARCH_INT_KEY = 'labResearchInt'
export const LABS_SAVE_LAB_ACTIVE_KEY = 'labActiveBool'
export const LABS_SAVE_LAB_SPEED_UP_SPEED_KEY = 'labSpeedUpSpeed'
export const LABS_SAVE_LAB_SPEED_UP_REMAINING_KEY = 'labSpeedUpRemainingSeconds'
export const LABS_SAVE_RESEARCHES_COMPLETE_KEY = 'researchesComplete'
export const LABS_SAVE_COINS_SPENT_KEY = 'totalCoinsSpentOnResearch'

export interface LabResearchSaveRow {
  index: number
  level: number
  displayName: string | null
  slug: string | null
  category: string | null
  gameField: string | null
  percentComplete: number | null
  remainingSeconds: number | null
}

export interface LabQueueSaveRow {
  slotIndex: number
  labLevel: number | null
  researchInt: number | null
  active: boolean
  speedUp: number | null
  speedUpRemainingSeconds: number | null
  research: LabResearchSaveRow | null
}

export interface LabsSaveExtract {
  labsUnlocked: number | null
  researchesComplete: number | null
  totalCoinsSpentOnResearch: unknown
  speedUpSpeed: number[]
  speedUpRemainingSeconds: number[]
  activeQueue: LabQueueSaveRow[]
  researches: LabResearchSaveRow[]
  researchedCount: number
  maxedCount: number
  namedResearchCount: number
  hiddenUnnamedCount: number
  warnings: string[]
}

function readSaveBoolean(value: unknown): boolean {
  return value === true
}

export function resolveLabResearchLevelMax(index: number): number {
  return findLabResearchByIndex(index)?.levelMax ?? 99
}

export function isLabResearchMaxed(index: number, level: number): boolean {
  return level >= resolveLabResearchLevelMax(index)
}

function readResearchRow(
  index: number,
  level: number,
  percentComplete: number | null,
  labSpeedLevel = 0,
): LabResearchSaveRow {
  const catalog = LAB_RESEARCH_IMPORT_CATALOG[index]
  const displayName = resolveLabResearchDisplayName(index, catalog?.displayName ?? null)
  const slug = resolveLabResearchSlug(index, catalog?.slug ?? null)
  const category = resolveLabResearchCategory(index, displayName, catalog?.category ?? null)
  return {
    index,
    level,
    displayName,
    slug,
    category,
    gameField: catalog?.gameField ?? null,
    percentComplete,
    remainingSeconds: estimateLabLevelRemainingSeconds(displayName, level, percentComplete, labSpeedLevel),
  }
}

export function extractLabsFromSaveRoot(root: Record<string, unknown> | null): LabsSaveExtract | null {
  if (!root) return null

  const warnings: string[] = []
  const researchLevels = toNumberArray(root[LABS_SAVE_RESEARCH_LEVEL_KEY])
  const researchPercents = toNumberArray(root[LABS_SAVE_RESEARCH_PERCENT_KEY])
  if (researchLevels.length === 0) {
    warnings.push('No researchLevel array found in save.')
  }
  if (researchLevels.length > 0 && researchLevels.length !== LAB_RESEARCH_IMPORT_CATALOG.length) {
    warnings.push(
      `researchLevel has ${researchLevels.length} entries; catalog expects ${LAB_RESEARCH_IMPORT_CATALOG.length}.`,
    )
  }

  const researches = researchLevels.map((level, index) => readResearchRow(
    index,
    level,
    Number.isFinite(researchPercents[index]) ? researchPercents[index] : null,
  ))
  const researchedCount = researches.filter(row => row.level > 0).length
  const maxedCount = researches.filter(row => isLabResearchMaxed(row.index, row.level)).length
  const namedResearchCount = researches.filter(row => row.displayName).length
  const hiddenUnnamedCount = researches.filter(row => !row.displayName).length

  const labLevels = toNumberArray(root[LABS_SAVE_LAB_LEVEL_KEY])
  const labResearchInts = toNumberArray(root[LABS_SAVE_LAB_RESEARCH_INT_KEY])
  const labActive = Array.isArray(root[LABS_SAVE_LAB_ACTIVE_KEY])
    ? (root[LABS_SAVE_LAB_ACTIVE_KEY] as unknown[]).map(readSaveBoolean)
    : []
  const speedUpSpeed = toNumberArray(root[LABS_SAVE_LAB_SPEED_UP_SPEED_KEY])
  const speedUpRemainingSeconds = toNumberArray(root[LABS_SAVE_LAB_SPEED_UP_REMAINING_KEY])

  const slotCount = Math.max(labLevels.length, labResearchInts.length, labActive.length, speedUpSpeed.length)
  const activeQueue: LabQueueSaveRow[] = []
  for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
    const researchInt = Number.isFinite(labResearchInts[slotIndex]) ? labResearchInts[slotIndex] : null
    const slotSpeed = Number.isFinite(speedUpSpeed[slotIndex]) ? speedUpSpeed[slotIndex] : null
    activeQueue.push({
      slotIndex,
      labLevel: labLevels[slotIndex] ?? null,
      researchInt,
      active: labActive[slotIndex] ?? false,
      speedUp: slotSpeed,
      speedUpRemainingSeconds: Number.isFinite(speedUpRemainingSeconds[slotIndex])
        ? speedUpRemainingSeconds[slotIndex]
        : null,
      research: researchInt === null
        ? null
        : readResearchRow(
          researchInt,
          researchLevels[researchInt] ?? 0,
          Number.isFinite(researchPercents[researchInt]) ? researchPercents[researchInt] : null,
          slotSpeed ?? 0,
        ),
    })
  }

  return {
    labsUnlocked: coerceSaveNumber(root[LABS_SAVE_UNLOCKED_KEY]),
    researchesComplete: coerceSaveNumber(root[LABS_SAVE_RESEARCHES_COMPLETE_KEY]),
    totalCoinsSpentOnResearch: root[LABS_SAVE_COINS_SPENT_KEY] ?? null,
    speedUpSpeed,
    speedUpRemainingSeconds,
    activeQueue,
    researches,
    researchedCount,
    maxedCount,
    namedResearchCount,
    hiddenUnnamedCount,
    warnings,
  }
}

export function formatLabResearchLabel(row: LabResearchSaveRow): string {
  if (row.displayName) return row.displayName
  if (row.slug) return row.slug.replace(/_/g, ' ')
  if (row.gameField) return row.gameField
  return `Research #${row.index}`
}

export function researchCategoryLabel(category: string | null | undefined): string {
  if (!category) return 'Other'
  const normalized = category.trim()
  const match = RESEARCH_CATEGORY_ENUM.find(
    entry => entry.name.toLowerCase() === normalized.toLowerCase(),
  )
  return match?.name ?? normalized
}

export interface LabImportDisplayRow {
  saveIndex: number
  category: string
  label: string
  researchName: string
  level: number
  levelMax: number
  isMaxed: boolean
}

/**
 * Group mapped researches by category (site category order) while preserving
 * save-index order within each category — later Main labs stay after the first Main block.
 */
export function buildCategoryGroupedLabImportRows(researches: LabResearchSaveRow[]): LabImportDisplayRow[] {
  const byCategory = new Map<string, LabImportDisplayRow[]>()

  for (const row of researches) {
    if (!row.displayName) continue
    const category = researchCategoryLabel(row.category)
    const levelMax = resolveLabResearchLevelMax(row.index)
    const displayRow: LabImportDisplayRow = {
      saveIndex: row.index,
      category,
      label: formatLabResearchLabel(row),
      researchName: row.displayName,
      level: row.level,
      levelMax,
      isMaxed: row.level >= levelMax,
    }
    const bucket = byCategory.get(category)
    if (bucket) bucket.push(displayRow)
    else byCategory.set(category, [displayRow])
  }

  const categoryOrder = [
    ...TOOL_LAB_OVERVIEW_CATEGORY_ORDER.filter(category => byCategory.has(category)),
    ...[...byCategory.keys()].filter(category => !TOOL_LAB_OVERVIEW_CATEGORY_ORDER.includes(
      category as typeof TOOL_LAB_OVERVIEW_CATEGORY_ORDER[number],
    )),
  ]

  return categoryOrder.flatMap(category => byCategory.get(category) ?? [])
}

export interface LabsTrackerSaveImportPayload {
  currentLabLevels: Record<string, number>
  activeSlots: Array<{
    name: string | null
    progressSeconds: number
    running: boolean
    speedUp: number
    lastUpdated: number | null
    startedAt: number | null
  }>
  labSpeedUps: Record<string, number>
}

export function buildLabsTrackerImportPayload(extract: LabsSaveExtract): LabsTrackerSaveImportPayload {
  const rawLabLevels: Record<string, number> = {}
  for (const row of extract.researches) {
    if (!row.slug || row.level <= 0) continue
    if (!isLabsTrackerResearchLabName(row.slug)) continue
    rawLabLevels[row.slug] = row.level
  }
  const currentLabLevels = normalizeLabsTrackerLabLevelMap(rawLabLevels)

  const activeSlots = Array.from({ length: 5 }, (_, slotIndex) => {
    const slot = extract.activeQueue.find(entry => entry.slotIndex === slotIndex)
    const researchSlug = slot?.research?.slug ?? null
    if (!researchSlug || !isLabsTrackerResearchLabName(researchSlug)) {
      return {
        name: null,
        progressSeconds: 0,
        running: false,
        speedUp: 1,
        lastUpdated: null,
        startedAt: null,
      }
    }

    const remainingSeconds = slot?.speedUpRemainingSeconds ?? slot?.research?.remainingSeconds ?? 0
    return {
      name: researchSlug,
      progressSeconds: Math.max(0, Math.floor(Number(remainingSeconds) || 0)),
      running: slot?.active === true,
      speedUp: Math.max(1, Number(slot?.speedUp) || 1),
      lastUpdated: Date.now(),
      startedAt: slot?.active ? Date.now() : null,
    }
  })

  const labSpeedUps: Record<string, number> = {}
  for (const slot of extract.activeQueue) {
    const researchSlug = slot.research?.slug
    if (!researchSlug || !isLabsTrackerResearchLabName(researchSlug) || !slot.speedUp) continue
    labSpeedUps[researchSlug] = Math.max(1, Number(slot.speedUp) || 1)
  }

  return {
    currentLabLevels,
    activeSlots,
    labSpeedUps,
  }
}
