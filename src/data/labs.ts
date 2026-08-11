import { parseDurationToHours } from '../formatting/index'
// Local dataset, front-end owned. There is no lab API and no lab-data-api.ts;
// both were removed when this data moved into the front end.
import { LAB_CATALOG, type LabCatalogRecord } from './labs-catalog'
import {
  displayNameToLabSlug,
  findLabResearchByDisplayName,
  findLabResearchBySlug,
  LAB_RESEARCH_BY_INDEX,
  LAB_RESEARCH_LEGACY_SLUG_ALIASES,
  type LabResearchRecord,
} from './labs-research'
import { resolveSiteLabCategoryForSaveIndex } from './labs-categories'

export interface ToolLabLevel {
  level: number
  duration: string | number
  /** Absolute coins. There is no currency suffix to apply. */
  cost?: number
}

export interface ToolLabRecord {
  name: string
  type?: string
  base?: number
  value?: unknown
  levels?: ToolLabLevel[]
  saveIndex?: number
  displayName?: string
}

export interface ToolLabMenuOption {
  key: string
  name: string
  type: string
}

export interface LabProgressModifiers {
  labSpeed: number
  labRelic: number
  labDiscount: number
  speedUp: number
  gemDiscount?: number
}

export interface LabProgressRow {
  level: number
  value: number
  timeHours: number
  gems: number
  coins: number
  cumulativeTimeHours: number
  cumulativeGems: number
  cumulativeCoins: number
}

export const TOOL_LAB_OVERVIEW_CATEGORY_ORDER = [
  'Main',
  'Attack',
  'Defense',
  'Utility',
  'Ultimate Weapon',
  'Cards',
  'Card Masteries',
  'Perks',
  'Bots',
  'Enemies',
  'Modules',
  'Battle Conditions',
] as const

export const TOOL_LAB_SPEEDUP_OPTIONS = [1, 1.5, 2, 3, 4, 5, 6, 7, 8] as const

export function isToolLabOverviewCategoryLabel(name: string | null | undefined): boolean {
  const trimmed = String(name || '').trim()
  if (!trimmed) return false

  const normalized = normalizeToolLabLookupKey(trimmed)
  for (const category of TOOL_LAB_OVERVIEW_CATEGORY_ORDER) {
    if (normalizeToolLabLookupKey(category) === normalized) return true
  }

  const normalizedCategory = normalizeToolLabLookupKey(normalizeToolLabCategory(trimmed))
  for (const category of TOOL_LAB_OVERVIEW_CATEGORY_ORDER) {
    if (normalizeToolLabLookupKey(category) === normalizedCategory) return true
  }

  return false
}

/** True when the name maps to a save-file research lab (excludes overview categories and calculator-only artifacts). */
export function isLabsTrackerResearchLabName(name: string | null | undefined): boolean {
  const trimmed = String(name || '').trim()
  if (!trimmed) return false

  const bySlug = findLabResearchBySlug(trimmed)
  if (bySlug?.slug) return true

  const byDisplay = findLabResearchByDisplayName(trimmed)
  if (byDisplay?.slug) return true

  if (isToolLabOverviewCategoryLabel(trimmed)) return false

  const slugFromDisplay = displayNameToLabSlug(trimmed)
  if (slugFromDisplay) {
    const byConvertedSlug = findLabResearchBySlug(slugFromDisplay)
    if (byConvertedSlug?.slug) return true
  }

  return false
}

export function normalizeToolLabCategory(type: string | null | undefined): string {
  const raw = String(type || '').trim()
  if (!raw) return 'Other'

  const normalized = raw
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (normalized === 'main') return 'Main'
  if (normalized === 'attack') return 'Attack'
  if (normalized === 'defense') return 'Defense'
  if (normalized === 'utility') return 'Utility'
  if (normalized === 'ultimate weapon' || normalized === 'ultimate weapons') return 'Ultimate Weapon'
  if (normalized === 'cards') return 'Cards'
  if (normalized === 'card masteries' || normalized === 'card mastery') return 'Card Masteries'
  if (normalized === 'perks') return 'Perks'
  if (normalized === 'bots' || normalized === 'bot') return 'Bots'
  if (normalized === 'enemies' || normalized === 'enemy') return 'Enemies'
  if (normalized === 'modules' || normalized === 'module') return 'Modules'
  if (normalized === 'battle conditions' || normalized === 'battle condition') return 'Battle Conditions'
  if (normalized.startsWith('battle condition ')) return 'Battle Conditions'
  if (normalized.startsWith('battle condition (')) return 'Battle Conditions'

  return raw
}

export function normalizeToolLabLookupKey(name: string): string {
  return name.trim().toLowerCase().replace(/[_\s]+/g, ' ')
}

function normalizeCatalogLab(lab: LabCatalogRecord): ToolLabRecord {
  return {
    name: lab.name,
    type: lab.category ?? undefined,
    base: lab.base,
    value: lab.value,
    levels: lab.levels.map(level => ({
      level: level.level,
      duration: level.duration,
      cost: level.cost,
    })),
  }
}

function resolveLabLookupName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return trimmed
  const lowered = trimmed.toLowerCase()
  const alias = LAB_RESEARCH_LEGACY_SLUG_ALIASES[lowered]
  if (alias) return alias

  const bySlug = findLabResearchBySlug(trimmed)
  if (bySlug?.slug) return bySlug.slug
  const byDisplay = findLabResearchByDisplayName(trimmed)
  if (byDisplay?.slug) return byDisplay.slug
  return displayNameToLabSlug(trimmed) || trimmed
}

function resolveLabResearchForSaveKey(saveKey: string): LabResearchRecord | undefined {
  const slug = resolveLabLookupName(saveKey)
  if (!slug) return undefined
  return findLabResearchBySlug(slug)
    ?? findLabResearchByDisplayName(saveKey)
    ?? findLabResearchBySlug(saveKey)
}

function toolLabOverviewCategorySortIndex(category: string | null | undefined): number {
  const normalized = normalizeToolLabCategory(category ?? 'Other')
  const index = TOOL_LAB_OVERVIEW_CATEGORY_ORDER.findIndex(label => (
    normalizeToolLabLookupKey(label) === normalizeToolLabLookupKey(normalized)
  ))
  return index >= 0 ? index : TOOL_LAB_OVERVIEW_CATEGORY_ORDER.length
}

/** Game order: category sequence, then catalog index within each category. */
export function compareToolLabSaveKeysForOverview(leftKey: string, rightKey: string): number {
  const leftResearch = resolveLabResearchForSaveKey(leftKey)
  const rightResearch = resolveLabResearchForSaveKey(rightKey)
  const leftCategory = leftResearch
    ? (resolveSiteLabCategoryForSaveIndex(leftResearch.index) ?? leftResearch.category)
    : null
  const rightCategory = rightResearch
    ? (resolveSiteLabCategoryForSaveIndex(rightResearch.index) ?? rightResearch.category)
    : null
  const categoryDiff = toolLabOverviewCategorySortIndex(leftCategory)
    - toolLabOverviewCategorySortIndex(rightCategory)
  if (categoryDiff !== 0) return categoryDiff
  const indexDiff = (leftResearch?.index ?? Number.MAX_SAFE_INTEGER)
    - (rightResearch?.index ?? Number.MAX_SAFE_INTEGER)
  if (indexDiff !== 0) return indexDiff
  return leftKey.localeCompare(rightKey)
}

export function sortToolLabLevelEntriesForOverview(
  entries: ReadonlyArray<readonly [string, number]>,
): ReadonlyArray<readonly [string, number]> {
  return [...entries].sort((left, right) => (
    compareToolLabSaveKeysForOverview(left[0], right[0])
  ))
}

export function isToolLabResearchAtMaxLevel(saveKey: string, level: number): boolean {
  if (!Number.isFinite(level) || level <= 0) return false
  const research = resolveLabResearchForSaveKey(saveKey)
  if (!research || research.levelMax <= 0) return false
  return level >= research.levelMax
}

export function getLabResearchCatalog(): readonly LabResearchRecord[] {
  return LAB_RESEARCH_BY_INDEX
}

function enrichLabFromResearch(record: ToolLabRecord, research: LabResearchRecord | undefined): ToolLabRecord {
  if (!research) return record
  return {
    ...record,
    displayName: record.displayName ?? research.displayName ?? undefined,
    type: record.type ?? research.category ?? undefined,
    saveIndex: research.index,
  }
}

function lookupResearchForLab(record: ToolLabRecord): LabResearchRecord | undefined {
  const bySlug = findLabResearchBySlug(record.name)
  if (bySlug) return bySlug
  if (record.displayName) {
    const byDisplay = findLabResearchByDisplayName(record.displayName)
    if (byDisplay) return byDisplay
  }
  const slugFromName = displayNameToLabSlug(record.name)
  if (slugFromName && slugFromName !== record.name) {
    return findLabResearchBySlug(slugFromName)
  }
  return undefined
}

export function getSharedToolLabs(): ToolLabRecord[] {
  // One catalog, one pass. This used to merge two files whose entries could
  // collide and whose costs were in different units; they are one file now, and
  // the names are asserted unique by labs-catalog.test.ts.
  return LAB_CATALOG.map(lab => {
    const record = normalizeCatalogLab(lab)
    return enrichLabFromResearch(record, lookupResearchForLab(record))
  })
}

export function formatLabDisplayName(input: string): string {
  const raw = String(input || '').trim()
  if (!raw) return ''

  const research = findLabResearchBySlug(raw) ?? findLabResearchByDisplayName(raw)
  if (research?.displayName) return research.displayName

  const resolved = resolveLabLookupName(raw)
  const byResolved = findLabResearchBySlug(resolved)
  if (byResolved?.displayName) return byResolved.displayName

  return raw.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

export function isLabSpeedLab(lab: ToolLabRecord): boolean {
  const type = (lab.type ?? '').toLowerCase()
  const name = lab.name.toLowerCase()
  const displayName = (lab.displayName ?? '').toLowerCase()
  return (type === 'main' && /labs?\s*speed|labs?_speed/.test(`${name} ${displayName}`))
    || /labs?\s*speed|labs?_speed/.test(`${name} ${displayName}`)
}

export function getLabMaxLevel(lab: ToolLabRecord | null | undefined): number {
  if (!lab || !Array.isArray(lab.levels) || lab.levels.length === 0) {
    const research = findLabResearchBySlug(lab?.name ?? '') ?? findLabResearchByDisplayName(lab?.displayName ?? '')
    return research?.levelMax ?? 0
  }
  return Math.max(...lab.levels.map(level => Number(level.level || 0)))
}

export function resolveLabValueAtLevel(lab: ToolLabRecord, level: number): number {
  const rawValue = lab.value
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    const base = Number(lab.base ?? 0)
    return base + rawValue * level
  }

  // The effect keyed by level. The catalog stores this as a plain object; it
  // used to be wrapped in a single-element array and repeated on every level.
  if (rawValue && typeof rawValue === 'object') {
    const record = (Array.isArray(rawValue) ? rawValue[0] : rawValue) as Record<string, unknown> | undefined
    if (record && typeof record === 'object') {
      const exact = Number(record[String(level)])
      if (Number.isFinite(exact)) return exact
    }
  }

  return 0
}

export function computeLabGems(timeHours: number): number {
  const time = timeHours / 24
  const secs = time * 86400
  return Math.ceil(
    secs > 31104000 ? 25000
      : secs > 7776000 ? (17000 / 23328000) * (secs - 7776000) + 8000
        : secs > 2592000 ? (4450 / 5184000) * (secs - 2592000) + 3550
          : secs > 604800 ? (2550 / 1987200) * (secs - 604800) + 1000
            : secs > 86400 ? (837 / 518400) * (secs - 86400) + 163
              : secs > 3600 ? (155.5 / 82800) * (secs - 3600) + 7.5
                : secs > 60 ? (7.375 / 3540) * (secs - 60) + 0.125
                  : secs > 1 ? (0.122917 / 59) * (secs - 1) + 0.002083
                    : 0,
  )
}

export function clampLabRange(
  lab: ToolLabRecord | null | undefined,
  startLevel: number,
  targetLevel: number,
): { startLevel: number; targetLevel: number } {
  const maxLevel = getLabMaxLevel(lab)
  const minLevel = 0
  const start = Math.max(minLevel, Math.min(maxLevel, Math.floor(Number(startLevel) || 0)))
  const target = Math.max(start + 1, Math.min(maxLevel, Math.floor(Number(targetLevel) || maxLevel)))
  return { startLevel: start, targetLevel: target }
}

export function buildLabProgressRows(
  lab: ToolLabRecord,
  currentLevel: number,
  targetLevel: number,
  modifiers: LabProgressModifiers,
): LabProgressRow[] {
  if (!Array.isArray(lab.levels) || lab.levels.length === 0) {
    return []
  }

  const relicMultiplier = 1 + modifiers.labRelic / 100
  const speedMultiplier = isLabSpeedLab(lab) ? 1 : 1 + modifiers.labSpeed * 0.02
  const finalMultiplier = 1 / (relicMultiplier * speedMultiplier)
  const coinDiscountMultiplier = Math.max(0, 1 - modifiers.labDiscount * 0.003)

  const levelsByNumber = new Map<number, ToolLabLevel>()
  for (const level of lab.levels) {
    if (Number.isFinite(level.level)) {
      levelsByNumber.set(level.level, level)
    }
  }

  let cumulativeTimeHours = 0
  let cumulativeGems = 0
  let cumulativeCoins = 0
  const rows: LabProgressRow[] = []

  for (let level = currentLevel + 1; level <= targetLevel; level += 1) {
    const levelData = levelsByNumber.get(level)
    if (!levelData) continue

    const baseTimeHours = parseDurationToHours(levelData.duration)
    if (!Number.isFinite(baseTimeHours) || baseTimeHours <= 0) continue

    const adjustedNoSpeedup = baseTimeHours * finalMultiplier
    const adjustedTimeHours = adjustedNoSpeedup / Math.max(1, modifiers.speedUp)
    const gems = computeLabGems(adjustedNoSpeedup)
    // Absolute coins throughout, so there is no longer a lab whose cost has to
    // be kept to two decimals because it was really a count of quadrillions.
    const coins = Math.round(Number(levelData.cost ?? 0) * coinDiscountMultiplier)
    const value = resolveLabValueAtLevel(lab, level)

    cumulativeTimeHours += adjustedTimeHours
    cumulativeGems += gems
    cumulativeCoins += coins

    rows.push({
      level,
      value,
      timeHours: adjustedTimeHours,
      gems,
      coins,
      cumulativeTimeHours,
      cumulativeGems,
      cumulativeCoins,
    })
  }

  return rows
}

export function getLabCategories(labs: readonly ToolLabRecord[]): Array<{ label: string; value: string }> {
  const typeMap = new Map<string, string>()
  for (const lab of labs) {
    const normalizedType = normalizeToolLabCategory(lab.type)
    typeMap.set(normalizedType.toLowerCase(), normalizedType)
  }

  const categories = [...typeMap.entries()].map(([value, label]) => ({ value, label }))
  const ordered = TOOL_LAB_OVERVIEW_CATEGORY_ORDER
    .map(label => categories.find(category => category.label === label))
    .filter((category): category is { label: string; value: string } => Boolean(category))
  const remaining = categories.filter(category => !TOOL_LAB_OVERVIEW_CATEGORY_ORDER.includes(category.label as typeof TOOL_LAB_OVERVIEW_CATEGORY_ORDER[number]))
  return [...ordered, ...remaining]
}

export function getLabTypeFilterOptions(types: readonly (string | null | undefined)[]): string[] {
  const typeMap = new Map<string, string>()
  for (const raw of types) {
    const normalized = normalizeToolLabCategory(raw)
    if (!normalized || normalized === 'Other') continue
    typeMap.set(normalized.toLowerCase(), normalized)
  }

  const labels = [...typeMap.values()]
  const ordered = TOOL_LAB_OVERVIEW_CATEGORY_ORDER.filter(label => labels.includes(label))
  const remaining = labels.filter(label => !TOOL_LAB_OVERVIEW_CATEGORY_ORDER.includes(label as typeof TOOL_LAB_OVERVIEW_CATEGORY_ORDER[number]))
  return ['All', ...ordered, ...remaining]
}

export function getLabsByCategory(
  labs: readonly ToolLabRecord[],
  category: string,
): ToolLabMenuOption[] {
  const normalizedCategory = normalizeToolLabCategory(category)
  return labs
    .filter(lab => isLabsTrackerResearchLabName(lab.name) || isLabsTrackerResearchLabName(lab.displayName))
    .filter(lab => normalizeToolLabCategory(lab.type) === normalizedCategory)
    .map(lab => ({
      key: lab.name,
      name: formatLabDisplayName(String(lab.displayName ?? lab.name ?? '')),
      type: normalizeToolLabCategory(lab.type),
    }))
}
