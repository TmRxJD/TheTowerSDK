import type { ModuleCategory, ModuleRarityLabel } from '../data/modules'
import { MODULE_TEMPLATES } from '../data/modules'
import { MODULE_RARITIES } from '../data/module-levels'
import { IMPORT_CATALOG_META } from './catalogs/indexes'
import { findModuleInfoIdentity } from '../data/module-info-catalog'
import { buildModuleEquippedSubstatsFromSave, buildModuleSaveSubstatSlotPreviews, decodeSingleModuleSaveSubstat } from './module-effects-ids'
import { coerceSaveNumber } from './read-values'

export type ModuleEquippedSlotKey =
  | 'primary:Cannon'
  | 'primary:Armor'
  | 'primary:Generator'
  | 'primary:Core'
  | 'assist:Cannon'
  | 'assist:Armor'
  | 'assist:Generator'
  | 'assist:Core'

export interface ModuleEquippedSlot {
  moduleId: string | null
  level: number | null
  rarity: string | null
  substats: import('./module-effects-ids').ModuleEquippedSubstat[]
}

export interface ModuleTrackerEntry {
  rarity: ModuleRarityLabel
  level: number
}

export const MODULE_SAVE_CANNON_SHARDS_KEY = 'moduleCannonShards'
export const MODULE_SAVE_ARMOR_SHARDS_KEY = 'moduleArmorShards'
export const MODULE_SAVE_GENERATOR_SHARDS_KEY = 'moduleGeneratorShards'
export const MODULE_SAVE_CORE_SHARDS_KEY = 'moduleCoreShards'
export const MODULE_SAVE_REROLL_CURRENCY_KEY = 'moduleRerollCurrency'
export const MODULE_SAVE_TICKETS_KEY = 'moduleTickets'
export const MODULE_SAVE_AUTO_SHATTER_KEY = 'moduleAutoShatter'
export const MODULE_SAVE_AUTO_SHATTER_RARE_KEY = 'moduleAutoShatterRare'
export const MODULE_SAVE_EQUIPPED_KEY = 'moduleEquipped'
export const MODULE_SAVE_ASSIST_SLOTS_KEY = 'assistModuleSlots'
/** Owned module instances (stash), not the moduleRecords collection log. */
export const MODULE_SAVE_INVENTORY_KEY = 'inventory'

/** Primary equipped array index → category (confirmed via equipped loadout, Jun 2026). */
export const MODULE_SAVE_PRIMARY_CATEGORY_ORDER: ModuleCategory[] = ['Cannon', 'Armor', 'Generator', 'Core']

/** Assist slot type enum → category (confirmed via equipped loadout, Jun 2026). */
export const MODULE_SAVE_ASSIST_TYPE_TO_CATEGORY: Record<number, ModuleCategory> = {
  0: 'Cannon',
  1: 'Armor',
  2: 'Generator',
  3: 'Core',
}

export const MODULE_SAVE_PRIMARY_SLOT_KEYS = [
  'primary:Cannon',
  'primary:Armor',
  'primary:Generator',
  'primary:Core',
] as const satisfies readonly ModuleEquippedSlotKey[]

export const MODULE_SAVE_ASSIST_SLOT_KEYS = [
  'assist:Cannon',
  'assist:Armor',
  'assist:Generator',
  'assist:Core',
] as const satisfies readonly ModuleEquippedSlotKey[]

export interface ModulesSaveShardBalances {
  cannon: number | null
  armor: number | null
  generator: number | null
  core: number | null
  rerollCurrency: number | null
  tickets: number | null
  autoShatter: boolean
  autoShatterRare: boolean
}

export interface ModulesSaveEquippedItem {
  slotKey: ModuleEquippedSlotKey
  role: 'primary' | 'assist'
  category: ModuleCategory
  infoIndex: number | null
  level: number | null
  rarityEnum: number | null
  rarityLabel: string | null
  effects: number[]
  effectLocked: boolean[]
  mappedInitials: string | null
  mappedName: string | null
}

export interface ModulesSaveInventoryItem {
  recordIndex: number
  category: ModuleCategory | null
  infoIndex: number | null
  level: number | null
  rarityEnum: number | null
  rarityLabel: string | null
  effects: number[]
  effectLocked: boolean[]
  mappedInitials: string | null
  mappedName: string | null
}

export interface ModulesSaveExtract {
  shards: ModulesSaveShardBalances
  equipped: ModulesSaveEquippedItem[]
  inventory: ModulesSaveInventoryItem[]
  warnings: string[]
}

export interface ModulesEquippedImportSubstatPreview {
  slot: number
  effectId: number
  label: string
  rarity: string | null
  displayValue: string | null
  trackerSubstatType: string | null
  matched?: boolean
}

export interface ModulesEquippedImportSlotPreview {
  slotKey: ModuleEquippedSlotKey
  role: 'primary' | 'assist'
  roleLabel: 'Primary' | 'Assist'
  category: ModuleCategory
  name: string | null
  initials: string | null
  moduleId: string | null
  level: number | null
  rarity: string | null
  substats: ModulesEquippedImportSubstatPreview[]
  importable: boolean
}

export interface ModulesInventoryImportPreview {
  recordIndex: number
  category: ModuleCategory | null
  name: string | null
  initials: string | null
  moduleId: string | null
  level: number | null
  rarity: string | null
  substats: ModulesEquippedImportSubstatPreview[]
  mapped: boolean
}

export interface ModulesTrackerEquippedImportPayload {
  presetId: string
  slots: Partial<Record<ModuleEquippedSlotKey, Pick<ModuleEquippedSlot, 'moduleId' | 'level' | 'rarity' | 'substats'>>>
}

export interface ModulesTrackerInventoryImportEntry {
  moduleId: string
  rarity: ModuleRarityLabel
  level: number
  quantity: number
}

export interface ModulesTrackerImportPayload {
  equipped: ModulesTrackerEquippedImportPayload | null
  inventory: ModulesTrackerInventoryImportEntry[]
}

interface ModuleTemplateLike {
  id: string
  initials: string
  type: ModuleCategory
  name: string
}

function readSaveEnumValue(raw: unknown): number | null {
  if (raw && typeof raw === 'object' && 'value__' in raw) {
    return coerceSaveNumber((raw as { value__: unknown }).value__)
  }
  return coerceSaveNumber(raw)
}

function readSaveBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw
  const numeric = coerceSaveNumber(raw)
  return numeric === 1
}

function mapModuleSaveRarityEnum(value: number | null): string | null {
  if (value === null || value <= 0) return null
  const index = value - 1
  if (index < 0 || index >= MODULE_RARITIES.length) return null
  return MODULE_RARITIES[index]
}

function readSaveModuleItem(raw: unknown): {
  infoIndex: number | null
  level: number | null
  rarityEnum: number | null
  rarityLabel: string | null
  effects: number[]
  effectLocked: boolean[]
} {
  if (!raw || typeof raw !== 'object') {
    return { infoIndex: null, level: null, rarityEnum: null, rarityLabel: null, effects: [], effectLocked: [] }
  }

  const item = raw as Record<string, unknown>
  const infoIndex = coerceSaveNumber(item.infoIndex)
  const level = coerceSaveNumber(item.level)
  const rarityEnum = readSaveEnumValue(item.currentRarity)
  const rarityLabel = mapModuleSaveRarityEnum(rarityEnum)
  const effects = Array.isArray(item.effects)
    ? item.effects.map(effect => coerceSaveNumber(effect) ?? 0)
    : []
  const effectLocked = Array.isArray(item.effectLocked)
    ? item.effectLocked.map(value => readSaveBoolean(value))
    : []

  return { infoIndex, level, rarityEnum, rarityLabel, effects, effectLocked }
}

/** @deprecated alias */
function readEquippedModuleItem(raw: unknown) {
  return readSaveModuleItem(raw)
}

function readSaveModuleList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== 'object') return []
  const list = raw as Record<string, unknown>
  if (Array.isArray(list._items)) return list._items
  if (Array.isArray(list.items)) return list.items
  return []
}

export function isOwnedModuleSaveItem(
  parsed: ReturnType<typeof readSaveModuleItem>,
  mapping: ReturnType<typeof lookupInfoIndexMapping>,
): boolean {
  if (parsed.infoIndex === null || parsed.infoIndex <= 0) return false
  if (!mapping?.name || !mapping.category) return false
  if (!parsed.rarityLabel) return false
  const hasEffects = parsed.effects.some(effect => effect > 0)
  if ((parsed.level ?? 0) <= 0 && !hasEffects) return false
  return true
}

function lookupInfoIndexMapping(infoIndex: number | null): { initials: string; category: ModuleCategory; name: string } | null {
  if (infoIndex === null) return null
  return findModuleInfoIdentity(infoIndex)
}

export function readModulesFromSaveRoot(parsedRoot: unknown): ModulesSaveExtract | null {
  if (!parsedRoot || typeof parsedRoot !== 'object') return null

  const root = parsedRoot as Record<string, unknown>
  const warnings: string[] = []

  const shards: ModulesSaveShardBalances = {
    cannon: coerceSaveNumber(root[MODULE_SAVE_CANNON_SHARDS_KEY]),
    armor: coerceSaveNumber(root[MODULE_SAVE_ARMOR_SHARDS_KEY]),
    generator: coerceSaveNumber(root[MODULE_SAVE_GENERATOR_SHARDS_KEY]),
    core: coerceSaveNumber(root[MODULE_SAVE_CORE_SHARDS_KEY]),
    rerollCurrency: coerceSaveNumber(root[MODULE_SAVE_REROLL_CURRENCY_KEY]),
    tickets: coerceSaveNumber(root[MODULE_SAVE_TICKETS_KEY]),
    autoShatter: readSaveBoolean(root[MODULE_SAVE_AUTO_SHATTER_KEY]),
    autoShatterRare: readSaveBoolean(root[MODULE_SAVE_AUTO_SHATTER_RARE_KEY]),
  }

  const equipped: ModulesSaveEquippedItem[] = []

  const primaryRaw = root[MODULE_SAVE_EQUIPPED_KEY]
  if (Array.isArray(primaryRaw)) {
    primaryRaw.forEach((entry, index) => {
      const category = MODULE_SAVE_PRIMARY_CATEGORY_ORDER[index]
      const slotKey = MODULE_SAVE_PRIMARY_SLOT_KEYS[index]
      if (!category || !slotKey) {
        warnings.push(`moduleEquipped[${index}] has no mapped primary slot.`)
        return
      }

      const parsed = readEquippedModuleItem(entry)
      const mapping = lookupInfoIndexMapping(parsed.infoIndex)
      if (parsed.infoIndex !== null && !mapping) {
        warnings.push(`Unknown module infoIndex ${parsed.infoIndex} in primary ${category}.`)
      }
      if (mapping && mapping.category !== category) {
        warnings.push(
          `infoIndex ${parsed.infoIndex} (${mapping.name}) category ${mapping.category} does not match expected primary ${category}.`,
        )
      }

      equipped.push({
        slotKey,
        role: 'primary',
        category,
        infoIndex: parsed.infoIndex,
        level: parsed.level,
        rarityEnum: parsed.rarityEnum,
        rarityLabel: parsed.rarityLabel,
        effects: parsed.effects,
        effectLocked: parsed.effectLocked,
        mappedInitials: mapping?.initials ?? null,
        mappedName: mapping?.name ?? null,
      })
    })
  } else {
    warnings.push('moduleEquipped array missing from save.')
  }

  const assistRaw = root[MODULE_SAVE_ASSIST_SLOTS_KEY]
  if (Array.isArray(assistRaw)) {
    assistRaw.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        warnings.push(`assistModuleSlots[${index}] is not an object.`)
        return
      }

      const slot = entry as Record<string, unknown>
      const typeValue = readSaveEnumValue(slot.type)
      const category = typeValue === null ? null : MODULE_SAVE_ASSIST_TYPE_TO_CATEGORY[typeValue]
      const slotKey = typeValue === null ? null : MODULE_SAVE_ASSIST_SLOT_KEYS[typeValue]

      if (!category || !slotKey) {
        warnings.push(`assistModuleSlots[${index}] has unknown type ${String(typeValue)}.`)
        return
      }

      const parsed = readEquippedModuleItem(slot.equippedModule)
      const mapping = lookupInfoIndexMapping(parsed.infoIndex)
      if (parsed.infoIndex !== null && !mapping) {
        warnings.push(`Unknown module infoIndex ${parsed.infoIndex} in assist ${category}.`)
      }
      if (mapping && mapping.category !== category) {
        warnings.push(
          `infoIndex ${parsed.infoIndex} (${mapping.name}) category ${mapping.category} does not match assist type ${category}.`,
        )
      }

      equipped.push({
        slotKey,
        role: 'assist',
        category,
        infoIndex: parsed.infoIndex,
        level: parsed.level,
        rarityEnum: parsed.rarityEnum,
        rarityLabel: parsed.rarityLabel,
        effects: parsed.effects,
        effectLocked: parsed.effectLocked,
        mappedInitials: mapping?.initials ?? null,
        mappedName: mapping?.name ?? null,
      })
    })
  } else {
    warnings.push('assistModuleSlots array missing from save.')
  }

  const inventory: ModulesSaveInventoryItem[] = []
  let skippedUnknownInventory = 0
  const inventoryRaw = readSaveModuleList(root[MODULE_SAVE_INVENTORY_KEY])
  inventoryRaw.forEach((entry, recordIndex) => {
    const parsed = readSaveModuleItem(entry)
    const mapping = lookupInfoIndexMapping(parsed.infoIndex)
    if (!isOwnedModuleSaveItem(parsed, mapping)) {
      if (parsed.infoIndex !== null && parsed.infoIndex > 0 && !mapping) {
        skippedUnknownInventory += 1
      }
      return
    }

    inventory.push({
      recordIndex,
      category: mapping!.category,
      infoIndex: parsed.infoIndex,
      level: parsed.level,
      rarityEnum: parsed.rarityEnum,
      rarityLabel: parsed.rarityLabel,
      effects: parsed.effects,
      effectLocked: parsed.effectLocked,
      mappedInitials: mapping!.initials,
      mappedName: mapping!.name,
    })
  })

  if (skippedUnknownInventory > 0) {
    warnings.push(`Skipped ${skippedUnknownInventory} inventory modules with unknown infoIndex.`)
  }

  const hasData =
    equipped.length > 0
    || inventory.length > 0
    || shards.cannon !== null
    || shards.armor !== null
    || shards.generator !== null
    || shards.core !== null

  if (!IMPORT_CATALOG_META.populated.moduleCatalog) {
    warnings.push('Module infoIndex catalog is not imported from game data yet.')
  }

  if (!hasData) return null

  return { shards, equipped, inventory, warnings }
}

export function findModuleIdFromSaveItem(
  item: Pick<ModulesSaveEquippedItem | ModulesSaveInventoryItem, 'mappedInitials' | 'category'>,
  templates: readonly ModuleTemplateLike[],
): string | null {
  if (!item.mappedInitials || !item.category) return null
  const initials = item.mappedInitials.trim().toUpperCase()
  const match = templates.find(
    template => template.initials.trim().toUpperCase() === initials && template.type === item.category,
  )
  return match?.id ?? null
}

function buildModuleImportSubstatPreviews(
  category: ModuleCategory | null,
  effects: number[],
): ModulesEquippedImportSubstatPreview[] {
  if (!category) return []
  return buildModuleSaveSubstatSlotPreviews(category, effects).map(substat => {
    const decoded = decodeSingleModuleSaveSubstat(category, substat.effectId)
    return {
      slot: substat.slot,
      effectId: substat.effectId,
      label: substat.label,
      rarity: substat.rarity,
      displayValue: substat.displayValue,
      trackerSubstatType: decoded?.trackerSubstatId ?? null,
    }
  })
}

export function buildModulesInventoryImportPreviews(
  extract: ModulesSaveExtract,
  templates: readonly ModuleTemplateLike[],
): ModulesInventoryImportPreview[] {
  const equippedInfoIndexes = new Set(
    extract.equipped.map(item => item.infoIndex).filter((value): value is number => value !== null),
  )

  return extract.inventory
    .filter(item => item.infoIndex === null || !equippedInfoIndexes.has(item.infoIndex))
    .map(item => {
      const moduleId = findModuleIdFromSaveItem(item, templates)
      return {
        recordIndex: item.recordIndex,
        category: item.category,
        name: item.mappedName,
        initials: item.mappedInitials,
        moduleId,
        level: item.level,
        rarity: item.rarityLabel,
        substats: buildModuleImportSubstatPreviews(item.category, item.effects),
        mapped: Boolean(moduleId && item.level && item.rarityLabel),
      }
    })
    .sort((a, b) => {
      const categoryOrder = MODULE_SAVE_PRIMARY_CATEGORY_ORDER
      const categoryA = a.category ? categoryOrder.indexOf(a.category) : categoryOrder.length
      const categoryB = b.category ? categoryOrder.indexOf(b.category) : categoryOrder.length
      if (categoryA !== categoryB) return categoryA - categoryB
      const nameA = a.name ?? ''
      const nameB = b.name ?? ''
      if (nameA !== nameB) return nameA.localeCompare(nameB)
      return (b.level ?? 0) - (a.level ?? 0)
    })
}

export function buildModulesEquippedImportPreviews(
  extract: ModulesSaveExtract,
  templates: readonly ModuleTemplateLike[],
): ModulesEquippedImportSlotPreview[] {
  return extract.equipped.map(item => {
    const moduleId = findModuleIdFromSaveItem(item, templates)
    const substats = buildModuleImportSubstatPreviews(item.category, item.effects)
    return {
      slotKey: item.slotKey,
      role: item.role,
      roleLabel: item.role === 'primary' ? 'Primary' : 'Assist',
      category: item.category,
      name: item.mappedName,
      initials: item.mappedInitials,
      moduleId,
      level: item.level,
      rarity: item.rarityLabel,
      substats,
      importable: Boolean(moduleId && item.level && item.rarityLabel),
    }
  })
}

export function parseModuleTrackerEntryFields(
  rarityLabel: string | null,
): Pick<ModuleTrackerEntry, 'rarity' | 'level'> | null {
  if (!rarityLabel?.trim()) return null
  const trimmed = rarityLabel.trim()
  if (trimmed.endsWith(' +')) {
    const base = trimmed.slice(0, -2).trim() as ModuleRarityLabel
    return { rarity: base, level: 6 }
  }
  const ancestralLevel = /^Ancestral (\d+)$/.exec(trimmed)
  if (ancestralLevel) {
    return {
      rarity: trimmed as ModuleRarityLabel,
      level: Number(ancestralLevel[1]) + 1,
    }
  }
  return {
    rarity: trimmed as ModuleRarityLabel,
    level: 1,
  }
}

function compareModuleRarityRank(a: ModuleRarityLabel, b: ModuleRarityLabel): number {
  return (MODULE_RARITIES as readonly ModuleRarityLabel[]).indexOf(a)
    - (MODULE_RARITIES as readonly ModuleRarityLabel[]).indexOf(b)
}

const UNIQUE_EPIC_MINIMUM_THRESHOLDS = [
  { rarity: 'Epic', quantity: 1 },
  { rarity: 'Legendary', quantity: 1 },
  { rarity: 'Mythic', quantity: 1 },
  { rarity: 'Ancestral', quantity: 1 },
] as const

const rarityOrderMap = new Map<ModuleRarityLabel, number>(
  MODULE_RARITIES.map((rarity, index) => [rarity, index]),
)

function getMinimumQuantityForRarity(rarity: string): number {
  const thresholds = UNIQUE_EPIC_MINIMUM_THRESHOLDS
  const exactMatch = thresholds.find(t => t.rarity === rarity)
  if (exactMatch) return exactMatch.quantity
  const rarityRank = rarityOrderMap.get(rarity as ModuleRarityLabel) ?? Number.MAX_SAFE_INTEGER
  for (let i = thresholds.length - 1; i >= 0; i -= 1) {
    const threshold = thresholds[i]
    const thresholdRarityRank = rarityOrderMap.get(threshold.rarity as ModuleRarityLabel) ?? -1
    if (thresholdRarityRank <= rarityRank) return threshold.quantity
  }
  return 0
}

export function buildModulesTrackerInventoryImportPayload(
  extract: ModulesSaveExtract,
  templates: readonly ModuleTemplateLike[],
): ModulesTrackerInventoryImportEntry[] {
  const grouped = new Map<string, { rarity: ModuleRarityLabel; level: number; count: number }>()

  for (const item of extract.inventory) {
    const moduleId = findModuleIdFromSaveItem(item, templates)
    if (!moduleId || !item.rarityLabel) continue

    const parsed = parseModuleTrackerEntryFields(item.rarityLabel)
    if (!parsed) continue

    const existing = grouped.get(moduleId)
    if (!existing) {
      grouped.set(moduleId, { ...parsed, count: 1 })
      continue
    }

    const rankDelta = compareModuleRarityRank(parsed.rarity, existing.rarity)
    if (rankDelta > 0) {
      grouped.set(moduleId, { ...parsed, count: 1 })
    } else if (rankDelta === 0) {
      existing.count += 1
    }
  }

  return Array.from(grouped.entries()).map(([moduleId, row]) => ({
    moduleId,
    rarity: row.rarity,
    level: row.level,
    quantity: Math.max(getMinimumQuantityForRarity(row.rarity), row.count),
  }))
}

export function canImportModulesEquippedToTracker(
  extract: ModulesSaveExtract | null,
  templates: readonly ModuleTemplateLike[] = MODULE_TEMPLATES,
): boolean {
  if (!extract) return false
  const previews = buildModulesEquippedImportPreviews(extract, templates)
  return previews.some(slot => slot.importable)
}

export function canImportModulesToTracker(
  extract: ModulesSaveExtract | null,
  templates: readonly ModuleTemplateLike[] = MODULE_TEMPLATES,
): boolean {
  if (!extract) return false
  return canImportModulesEquippedToTracker(extract, templates)
    || buildModulesTrackerInventoryImportPayload(extract, templates).length > 0
}

export function buildModulesTrackerEquippedImportPayload(
  extract: ModulesSaveExtract,
  templates: readonly ModuleTemplateLike[] = MODULE_TEMPLATES,
  presetId = 'preset-1',
): ModulesTrackerEquippedImportPayload | null {
  const previews = buildModulesEquippedImportPreviews(extract, templates)
  const importable = previews.filter(slot => slot.importable)
  if (!importable.length) return null

  const slots: ModulesTrackerEquippedImportPayload['slots'] = {}
  for (const slot of importable) {
    const source = extract.equipped.find(item => item.slotKey === slot.slotKey)
    const substats = source
      ? buildModuleEquippedSubstatsFromSave(source.category, source.effects, source.effectLocked, {
        role: source.role,
      })
      : []

    slots[slot.slotKey] = {
      moduleId: slot.moduleId,
      level: slot.level,
      rarity: slot.rarity,
      substats,
    }
  }

  return { presetId, slots }
}

export function buildModulesTrackerImportPayload(
  extract: ModulesSaveExtract,
  templates: readonly ModuleTemplateLike[] = MODULE_TEMPLATES,
  presetId = 'preset-1',
): ModulesTrackerImportPayload | null {
  const equipped = buildModulesTrackerEquippedImportPayload(extract, templates, presetId)
  const inventory = buildModulesTrackerInventoryImportPayload(extract, templates)
  if (!equipped && inventory.length === 0) return null
  return { equipped, inventory }
}
