import { CARDS_ASSET_TABLE } from '../data/assets'
import { LAB_RESEARCH_BY_INDEX } from '../data/labs-research'
import { CARD_TEMPLATES } from '../data/cards'
import { MAX_CAMPAIGN_TIER } from '../data/campaign-tier'
import {
  WORKSHOP_ENHANCEMENT_IMPORT_CATALOG,
  WORKSHOP_IMPORT_CATALOG,
} from './catalogs/indexes'
import {
  CARD_IMPORT_CATALOG,
  LAB_RESEARCH_IMPORT_CATALOG,
  VAULT_HARMONY_IMPORT_CATALOG,
  VAULT_POWER_IMPORT_CATALOG,
} from '../data/player-stats'
import {
  findLabResearchDisplayName,
  findLabResearchSlug,
} from '../data/labs-display-overrides'
import { MODULE_RARITIES } from '../data/module-levels'
import {
  GENERATOR_CPK_SUBSTAT_LABEL,
  type GeneratorCpkSubstatAdds,
  parseModuleSubstatMultiplierAdd,
} from '../mechanics/resource-drops-coin-module-cpk'
import { generatorUniqueTemplateFromEffectId } from '../mechanics/resource-drops-coin-generator-modules'
import { decodeModuleSaveEffect, type ModuleSaveSlotCategory } from './module-effects-decode'
import {
  ELS_ATTACK_MODULE_SUBSTAT_LABEL,
  ELS_HEALTH_MODULE_SUBSTAT_LABEL,
  parseModuleElsBonusPercent,
} from '../mechanics/els-module-cluster'
import { ELS_ATTACK_WORKSHOP_KEY, ELS_HEALTH_WORKSHOP_KEY } from '../mechanics/els-upgrade-path'
import { computeResearchLabLevel } from '../internal/shared-tool-inputs-from-research'
import {
  buildDefaultShardSplitterSnapshot,
  type ModuleType,
} from '../internal/shard-splitter-schema'
import {
  coerceSaveNumber,
  readIndexedNumberArray,
  readSaveBoolean,
  readSaveEnumValue,
  readSaveIntList,
  toNumberArray,
} from './read-values'
import {
  defaultDissonanceMaxFlags,
  defaultDissonanceWaveInputs,
  DISSONANCE_MAX_EFFECTIVE_WAVE,
  DISSONANCE_TYPE_KEYS,
  type DissonanceMaxFlags,
  type DissonanceTypeKey,
  type DissonanceWaveInputs,
} from '../internal/dissonance-calcs-local-state'
import {
  defaultExtendedSharedToolInputs,
  defaultSharedBotMedalSplitterPlanner,
  defaultSharedDissonanceCalculatorState,
  mergeExtendedSharedToolInputs,
  mergeShardSplitterInputs,
  type SharedBotMedalSplitterPlanner,
  type SharedBotsSynchronicity,
  type SharedDamageReduxCalculatorSettings,
  type SharedDissonanceCalculatorState,
  type SharedElsPlannerInputs,
  type SharedEnemyStatsCore,
  type SharedModuleProgressInputs,
  type SharedShardSplitterInputs,
  type SharedThornsCalculatorSettings,
  type SharedToolInputsExtended,
  type SharedVaultLevels,
  type SharedWorkshopStatLevels,
} from '../internal/shared-tool-inputs-extended'
import { enrichElsPlannerFromLinkedSources } from '../internal/shared-tool-inputs-field-sync'
import { formatCompact } from '../internal/tool-formatting'
import { listUltimateWeaponCatalogRows } from './catalogs/ultimate-weapons'
import { POWER_VAULT_SINGLE_PURCHASE_NODE_IDS } from './catalogs/vault-overrides'
import { CARDS_SAVE_UNLOCKED_KEY } from './cards'

const MODULE_PRIMARY_CATEGORIES: ModuleSaveSlotCategory[] = ['Cannon', 'Armor', 'Generator', 'Core']
const MODULE_ASSIST_TYPE_TO_CATEGORY: Record<number, ModuleSaveSlotCategory> = {
  0: 'Cannon',
  1: 'Armor',
  2: 'Generator',
  3: 'Core',
}
const MODULE_CATEGORY_TO_TYPE: Record<ModuleSaveSlotCategory, ModuleType> = {
  Cannon: 'cannon',
  Armor: 'defense',
  Generator: 'generator',
  Core: 'core',
}
const BOTRANGE_VAULT_NODE_IDS = ['botrange1', 'botrange2', 'botrange3', 'botrange4'] as const
const UW_STATS_PER_SLOT = 3
const ECHO_LABS_UNLOCK_TIER = 4
const ECHO_LABS_UNLOCK_WAVE = 90
/**
 * Dissonance covers every campaign tier, so it is read from the generated tier
 * count rather than restated.
 *
 * This was hardcoded to 21 and went stale when the game added tiers 22-24, so
 * the extraction loop stopped at 21 while the preview built its rows from
 * MAX_CAMPAIGN_TIER. The Dissonance tab showed 24 tiers and the calculator
 * could never hold the last three -- the numbers disagreed because only one of
 * them was derived from the game data.
 */
const DISSONANCE_TIER_COUNT = MAX_CAMPAIGN_TIER
/** In-game dissonance wave columns are stored per track in Unity `List<int>` arrays indexed by tier. */
export const DISSONANCE_BOOST_SAVE_FIELD_BY_TYPE: Record<DissonanceTypeKey, string> = {
  attack: 'dissonanceDamageBoost',
  defense: 'dissonanceHealthBoost',
  utility: 'dissonanceCoinBoost',
  uw: 'dissonanceUltDamageBoost',
}
/** Legacy event-cycle field; not the in-game dissonance wave table. */
const DISSONANCE_CYCLE_TYPES_PER_TIER = 4
/** Game save slot order differs from calculator column order (attack-first in UI). */
/** Matches in-game dissonance column order (sword → shield → star → triangle). */
const DISSONANCE_CYCLE_SAVE_TYPE_BY_SLOT: readonly DissonanceTypeKey[] = [
  'attack',
  'defense',
  'utility',
  'uw',
]
/** Type-major blocks: all attack tiers, then defense, utility, UW (21 slots each). */
const DISSONANCE_TYPE_MAJOR_BLOCK_START = [0, 21, 42, 63] as const

export type DissonanceCycleLayout = 'tier-major' | 'type-major'

function clampInt(value: number, min: number, max: number): number {
  return Math.floor(Math.min(max, Math.max(min, value)))
}

function readWorkshopArray(root: Record<string, unknown>, saveField: string): number[] {
  return toNumberArray(root[saveField])
}

export function readWorkshopLevelByTrackerKey(
  root: Record<string, unknown>,
  trackerKey: string,
): number | null {
  const row = WORKSHOP_IMPORT_CATALOG.find(entry => entry.trackerKey === trackerKey)
  if (!row?.saveField || row.categoryIndex == null) return null
  const levels = readWorkshopArray(root, row.saveField)
  const level = levels[row.categoryIndex]
  return Number.isFinite(level) ? Math.max(0, Math.floor(level)) : null
}

export function readWorkshopEnhancementLevelByTrackerKey(
  root: Record<string, unknown>,
  trackerKey: string,
): number | null {
  const row = WORKSHOP_ENHANCEMENT_IMPORT_CATALOG.find(entry => entry.trackerKey === trackerKey)
  if (!row?.saveField || row.categoryIndex == null) return null
  const levels = readWorkshopArray(root, row.saveField)
  const level = levels[row.categoryIndex]
  return Number.isFinite(level) ? Math.max(0, Math.floor(level)) : null
}

export function mapModuleSaveRarityEnum(value: number | null): string | null {
  if (value === null || value <= 0) return null
  const index = value - 1
  if (index < 0 || index >= MODULE_RARITIES.length) return null
  return MODULE_RARITIES[index]
}

function readSaveModuleItem(raw: unknown): {
  level: number | null
  rarityLabel: string | null
  effects: number[]
} {
  if (!raw || typeof raw !== 'object') {
    return { level: null, rarityLabel: null, effects: [] }
  }
  const item = raw as Record<string, unknown>
  const level = coerceSaveNumber(item.level)
  const rarityEnum = readSaveEnumValue(item.currentRarity)
  const effects = Array.isArray(item.effects)
    ? item.effects.map(effect => coerceSaveNumber(effect) ?? 0)
    : []
  return {
    level,
    rarityLabel: mapModuleSaveRarityEnum(rarityEnum),
    effects,
  }
}

/**
 * A card's slot in the save arrays.
 *
 * `CARD_IMPORT_CATALOG.index` is the save slot now, so this is a lookup rather
 * than a translation. It was not always: the catalog numbered cards
 * consecutively while the save leaves nine placeholder slots in place, so a
 * catalog index read the wrong card once past the first gap.
 */
function resolveCardSaveIndex(slug: string): number | null {
  const row = CARD_IMPORT_CATALOG.find(entry => entry.slug === slug)
  return row ? row.index : null
}

/** How many slots the save's card arrays have, placeholders included. */
function cardSaveSlotCount(): number {
  return CARD_IMPORT_CATALOG.length
}

/**
 * A card's level, or 0 when the player does not have the card.
 *
 * `cardLevel` is over-allocated and pads with **1**, not 0, so reading it
 * without checking the unlock flag reports level 1 for every card never owned.
 * The package guide calls this out: use the unlock flag when one exists.
 */
function readCardLevelBySlug(root: Record<string, unknown>, slug: string): number {
  const cardIndex = resolveCardSaveIndex(slug)
  if (cardIndex == null) return 0

  const unlockedFlags = Array.isArray(root[CARDS_SAVE_UNLOCKED_KEY])
    ? (root[CARDS_SAVE_UNLOCKED_KEY] as unknown[]).map(readSaveBoolean)
    : null
  // Only trust the flags when the save actually carries them; a save without
  // the array must not have every card zeroed out.
  if (unlockedFlags && unlockedFlags[cardIndex] !== true) return 0

  // Sized to the save's own slot count, not the compacted catalog's 31, or
  // every card past the last gap would be truncated away.
  const levels = readIndexedNumberArray(root.cardLevel, cardSaveSlotCount())
  return Math.max(0, Math.floor(levels[cardIndex] ?? 0))
}

function readCardMasteryUnlockedBySlug(root: Record<string, unknown>, slug: string): boolean {
  const cardIndex = resolveCardSaveIndex(slug)
  if (cardIndex == null) return false
  const masteries = Array.isArray(root.cardMasteryUnlocked)
    ? root.cardMasteryUnlocked.map(readSaveBoolean)
    : []
  return masteries[cardIndex] ?? false
}

function readCardPercentBySlug(root: Record<string, unknown>, slug: string): number | null {
  const level = readCardLevelBySlug(root, slug)
  if (level <= 0) return null
  const template = CARD_TEMPLATES.find(card => card.id === slug)
  if (!template || template.levelType !== 'percent') return null
  const value = template.levelValues[level - 1]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readUwSlotIndex(weaponName: string): number {
  return listUltimateWeaponCatalogRows().findIndex(row => row.name === weaponName)
}

function readUwPlusLevel(root: Record<string, unknown>, weaponName: string): number | null {
  const slotIndex = readUwSlotIndex(weaponName)
  if (slotIndex < 0) return null
  const plusLevels = readIndexedNumberArray(root.ultimateWeaponPlusLevel, listUltimateWeaponCatalogRows().length)
  const level = plusLevels[slotIndex]
  return Number.isFinite(level) && level > 0 ? Math.floor(level) : null
}

function normalizeVaultPowerNodeLevel(input: {
  nodeId: string
  saveLevel: number
  unlocked: boolean
  tier2Unlock: boolean
  tier3Unlock: boolean
}): number {
  if (input.nodeId === 'tier2') return input.tier2Unlock ? 1 : 0
  if (input.nodeId === 'tier3') return input.tier3Unlock ? 1 : 0
  if (POWER_VAULT_SINGLE_PURCHASE_NODE_IDS.has(input.nodeId)) {
    const raw = Math.floor(Number(input.saveLevel) || 0)
    return raw > 0 || input.unlocked ? 1 : 0
  }
  const raw = Math.floor(Number(input.saveLevel) || 0)
  if (raw <= 0) return input.unlocked ? 1 : 0
  return Math.min(3, raw + 1)
}

export function readResearchLabLevelsFromSaveRoot(
  root: Record<string, unknown>,
): Record<string, number> {
  const levels = readIndexedNumberArray(root.researchLevel, LAB_RESEARCH_IMPORT_CATALOG.length)
  const out: Record<string, number> = {}
  levels.forEach((level, index) => {
    if (!Number.isFinite(level) || level <= 0) return
    const catalog = LAB_RESEARCH_IMPORT_CATALOG[index]
    const displayName = findLabResearchDisplayName(index, catalog?.displayName ?? null)
    const slug = findLabResearchSlug(index, catalog?.slug ?? null)
    const normalized = Math.max(0, Math.floor(level))
    if (displayName) out[displayName] = normalized
    if (slug) out[slug] = normalized
  })
  return out
}

export function readWorkshopStatLevelsFromSaveRoot(
  root: Record<string, unknown>,
): SharedWorkshopStatLevels {
  const levels: Record<string, number> = {}
  const enhancementLevels: Record<string, number> = {}

  for (const row of WORKSHOP_IMPORT_CATALOG) {
    if (!row.trackerKey || row.categoryIndex == null || !row.saveField) continue
    const saveLevels = readWorkshopArray(root, row.saveField)
    const level = saveLevels[row.categoryIndex]
    if (!Number.isFinite(level) || level <= 0) continue
    levels[row.trackerKey] = Math.floor(level)
  }

  for (const row of WORKSHOP_ENHANCEMENT_IMPORT_CATALOG) {
    if (!row.trackerKey || row.categoryIndex == null || !row.saveField) continue
    const saveLevels = readWorkshopArray(root, row.saveField)
    const level = saveLevels[row.categoryIndex]
    if (!Number.isFinite(level) || level <= 0) continue
    enhancementLevels[row.trackerKey] = Math.floor(level)
  }

  return {
    levels,
    targets: { ...levels },
    enhancementLevels,
    enhancementTargets: { ...enhancementLevels },
    coinCurrentLevels: {},
    coinTargetLevels: {},
    cashCurrentLevels: {},
    cashTargetLevels: {},
  }
}

export function readVaultLevelsFromSaveRoot(root: Record<string, unknown>): SharedVaultLevels {
  const powerLevels = toNumberArray(root.powerNodesLevel)
  const powerUnlocked = Array.isArray(root.powerNodesUnlocked)
    ? root.powerNodesUnlocked.map(readSaveBoolean)
    : []
  const harmonyUnlocked = Array.isArray(root.harmonyNodesUnlocked)
    ? root.harmonyNodesUnlocked.map(readSaveBoolean)
    : []
  const tier2Unlock = readSaveBoolean(root.tier2Unlock)
  const tier3Unlock = readSaveBoolean(root.tier3Unlock)
  const levels: Record<string, number> = {}

  for (const catalog of VAULT_POWER_IMPORT_CATALOG) {
    const saveIndex = catalog.saveIndex
    const nodeId = catalog.id
    if (!nodeId) continue
    const level = normalizeVaultPowerNodeLevel({
      nodeId,
      saveLevel: powerLevels[saveIndex] ?? 0,
      unlocked: powerUnlocked[saveIndex] ?? false,
      tier2Unlock,
      tier3Unlock,
    })
    if (level > 0) levels[nodeId] = level
  }

  for (const catalog of VAULT_HARMONY_IMPORT_CATALOG) {
    const saveIndex = catalog.saveIndex
    const nodeId = catalog.id
    if (!nodeId) continue
    if (harmonyUnlocked[saveIndex]) levels[nodeId] = 1
  }

  const spentKeys = coerceSaveNumber(root.keys)
  return {
    levels,
    spentKeys: spentKeys != null ? Math.max(0, Math.floor(spentKeys)) : 0,
  }
}

export function readEnemyStatsCoreFromSaveRoot(
  root: Record<string, unknown>,
): Partial<SharedEnemyStatsCore> {
  const currentTier = coerceSaveNumber(root.currentTier)
  const highestWaveThisTier = toNumberArray(root.highestWaveThisTier)
  const tier = currentTier != null ? Math.max(1, Math.floor(currentTier)) : null
  const wave = tier != null && highestWaveThisTier.length >= tier
    ? Math.max(0, Math.floor(highestWaveThisTier[tier - 1] ?? 0))
    : null

  const partial: Partial<SharedEnemyStatsCore> = {}
  if (tier != null) partial.tierSelection = tier
  if (wave != null && wave > 0) partial.wave = wave
  return partial
}

function readEquippedElsModulePct(
  root: Record<string, unknown>,
  label: string,
  role: 'primary' | 'assist',
): { pct: number; rarity: string } {
  let pct = 0
  let rarity = 'None'

  const applyDecoded = (category: ModuleSaveSlotCategory, effects: number[]) => {
    for (const effectId of effects) {
      if (!effectId) continue
      const decoded = decodeModuleSaveEffect(effectId, category)
      if (!decoded || decoded.label !== label) continue
      pct = Math.max(pct, parseModuleElsBonusPercent(decoded.displayValue))
      if (decoded.rarity) rarity = decoded.rarity
    }
  }

  const primaryRaw = root.moduleEquipped
  if (Array.isArray(primaryRaw)) {
    primaryRaw.forEach((entry, index) => {
      const category = MODULE_PRIMARY_CATEGORIES[index]
      if (!category) return
      const parsed = readSaveModuleItem(entry)
      if (role === 'primary') applyDecoded(category, parsed.effects)
    })
  }

  const assistRaw = root.assistModuleSlots
  if (Array.isArray(assistRaw)) {
    assistRaw.forEach(entry => {
      if (!entry || typeof entry !== 'object') return
      const slot = entry as Record<string, unknown>
      const typeValue = readSaveEnumValue(slot.type)
      const category = typeValue == null ? null : MODULE_ASSIST_TYPE_TO_CATEGORY[typeValue]
      if (!category) return
      const parsed = readSaveModuleItem(slot.equippedModule)
      if (role === 'assist') applyDecoded(category, parsed.effects)
    })
  }

  return { pct, rarity }
}

export function readGeneratorCpkSubstatAdds(
  root: Record<string, unknown>,
): GeneratorCpkSubstatAdds {
  let primaryAdd = 0
  let assistAdd = 0

  const applyDecoded = (category: ModuleSaveSlotCategory, effects: number[], role: 'primary' | 'assist') => {
    for (const effectId of effects) {
      if (!effectId) continue
      const decoded = decodeModuleSaveEffect(effectId, category)
      if (!decoded || decoded.label !== GENERATOR_CPK_SUBSTAT_LABEL) continue
      const add = parseModuleSubstatMultiplierAdd(decoded.displayValue)
      if (role === 'primary') primaryAdd = Math.max(primaryAdd, add)
      else assistAdd = Math.max(assistAdd, add)
    }
  }

  const primaryRaw = root.moduleEquipped
  if (Array.isArray(primaryRaw)) {
    primaryRaw.forEach((entry, index) => {
      const category = MODULE_PRIMARY_CATEGORIES[index]
      if (category !== 'Generator') return
      const parsed = readSaveModuleItem(entry)
      applyDecoded(category, parsed.effects, 'primary')
    })
  }

  const assistRaw = root.assistModuleSlots
  if (Array.isArray(assistRaw)) {
    assistRaw.forEach(entry => {
      if (!entry || typeof entry !== 'object') return
      const slot = entry as Record<string, unknown>
      const typeValue = readSaveEnumValue(slot.type)
      const category = typeValue == null ? null : MODULE_ASSIST_TYPE_TO_CATEGORY[typeValue]
      if (category !== 'Generator') return
      const parsed = readSaveModuleItem(slot.equippedModule)
      applyDecoded(category, parsed.effects, 'assist')
    })
  }

  return { primaryAdd, assistAdd }
}

export function readEquippedGeneratorUnique(
  root: Record<string, unknown>,
): string | null {
  const primaryRaw = root.moduleEquipped
  if (!Array.isArray(primaryRaw)) return null
  const generatorIndex = MODULE_PRIMARY_CATEGORIES.indexOf('Generator')
  if (generatorIndex < 0) return null
  const entry = primaryRaw[generatorIndex]
  const parsed = readSaveModuleItem(entry)
  for (const effectId of parsed.effects) {
    const templateId = generatorUniqueTemplateFromEffectId(effectId)
    if (templateId) return templateId
  }
  return null
}

export function readElsPlannerInputsFromSaveRoot(
  root: Record<string, unknown>,
  researchLabLevels: Record<string, number> = {},
): Partial<SharedElsPlannerInputs> {
  const coins = coerceSaveNumber(root.coins)
  const currentTier = coerceSaveNumber(root.currentTier)
  const highestWaveThisTier = toNumberArray(root.highestWaveThisTier)
  const attackSkip = readWorkshopLevelByTrackerKey(root, ELS_ATTACK_WORKSHOP_KEY)
  const healthSkip = readWorkshopLevelByTrackerKey(root, ELS_HEALTH_WORKSHOP_KEY)

  const primaryAttack = readEquippedElsModulePct(root, ELS_ATTACK_MODULE_SUBSTAT_LABEL, 'primary')
  const assistAttack = readEquippedElsModulePct(root, ELS_ATTACK_MODULE_SUBSTAT_LABEL, 'assist')
  const primaryHealth = readEquippedElsModulePct(root, ELS_HEALTH_MODULE_SUBSTAT_LABEL, 'primary')
  const assistHealth = readEquippedElsModulePct(root, ELS_HEALTH_MODULE_SUBSTAT_LABEL, 'assist')

  const tier = currentTier != null ? Math.max(1, Math.floor(currentTier)) : null
  const referenceWave = tier != null && highestWaveThisTier.length >= tier
    ? Math.max(0, Math.floor(highestWaveThisTier[tier - 1] ?? 0))
    : null

  const partial: Partial<SharedElsPlannerInputs> = {
    elsLabAttackLevel: computeResearchLabLevel(researchLabLevels, 'enemy_attack_level_skip', 20),
    elsLabHealthLevel: computeResearchLabLevel(researchLabLevels, 'enemy_health_level_skip', 20),
    elsModulePrimaryAttackPct: primaryAttack.pct,
    elsModuleAssistAttackPct: assistAttack.pct,
    elsModulePrimaryHealthPct: primaryHealth.pct,
    elsModuleAssistHealthPct: assistHealth.pct,
    elsModulePrimaryAttackRarity: primaryAttack.rarity,
    elsModuleAssistAttackRarity: assistAttack.rarity,
    elsModulePrimaryHealthRarity: primaryHealth.rarity,
    elsModuleAssistHealthRarity: assistHealth.rarity,
  }

  if (attackSkip != null) partial.elsAttackLevel = attackSkip
  if (healthSkip != null) partial.elsHealthLevel = healthSkip
  if (referenceWave != null && referenceWave > 0) partial.elsReferenceWave = referenceWave
  if (coins != null && coins > 0) partial.elsCoinBudgetVal = formatCompact(coins)

  return partial
}

export function readModuleProgressFromSaveRoot(
  root: Record<string, unknown>,
): Partial<SharedModuleProgressInputs> {
  const currentLevel: Record<string, number> = {}
  const assistCurrentLevel: Record<string, number> = {}
  const lastRarityByType: Record<string, string> = {}
  const lastAssistRarityByType: Record<string, string> = {}

  const primaryRaw = root.moduleEquipped
  if (Array.isArray(primaryRaw)) {
    primaryRaw.forEach((entry, index) => {
      const category = MODULE_PRIMARY_CATEGORIES[index]
      if (!category) return
      const moduleType = MODULE_CATEGORY_TO_TYPE[category]
      const parsed = readSaveModuleItem(entry)
      if (parsed.level != null && parsed.level > 0) {
        currentLevel[moduleType] = Math.floor(parsed.level)
      }
      if (parsed.rarityLabel) lastRarityByType[moduleType] = parsed.rarityLabel
    })
  }

  const assistRaw = root.assistModuleSlots
  if (Array.isArray(assistRaw)) {
    assistRaw.forEach(entry => {
      if (!entry || typeof entry !== 'object') return
      const slot = entry as Record<string, unknown>
      const typeValue = readSaveEnumValue(slot.type)
      const category = typeValue == null ? null : MODULE_ASSIST_TYPE_TO_CATEGORY[typeValue]
      if (!category) return
      const moduleType = MODULE_CATEGORY_TO_TYPE[category]
      const parsed = readSaveModuleItem(slot.equippedModule)
      if (parsed.level != null && parsed.level > 0) {
        assistCurrentLevel[moduleType] = Math.floor(parsed.level)
      }
      if (parsed.rarityLabel) lastAssistRarityByType[moduleType] = parsed.rarityLabel
    })
  }

  if (
    Object.keys(currentLevel).length === 0
    && Object.keys(assistCurrentLevel).length === 0
    && Object.keys(lastRarityByType).length === 0
    && Object.keys(lastAssistRarityByType).length === 0
  ) {
    return {}
  }

  const cpkSubstats = readGeneratorCpkSubstatAdds(root)
  const generatorEquippedUniqueId = readEquippedGeneratorUnique(root)

  return {
    currentLevel,
    targetLevel: { ...currentLevel },
    assistCurrentLevel,
    assistTargetLevel: { ...assistCurrentLevel },
    lastRarityByType,
    lastAssistRarityByType,
    ...(cpkSubstats.primaryAdd > 0 ? { generatorCpkPrimarySubstatAdd: cpkSubstats.primaryAdd } : {}),
    ...(cpkSubstats.assistAdd > 0 ? { generatorCpkAssistSubstatAdd: cpkSubstats.assistAdd } : {}),
    ...(generatorEquippedUniqueId ? { generatorEquippedUniqueId } : {}),
  }
}

export function readShardSplitterInputsFromSaveRoot(
  root: Record<string, unknown>,
  moduleProgress: Partial<SharedModuleProgressInputs> = {},
): Partial<SharedShardSplitterInputs> {
  const shardKeys = {
    cannon: 'moduleCannonShards',
    defense: 'moduleArmorShards',
    generator: 'moduleGeneratorShards',
    core: 'moduleCoreShards',
  } as const

  const splitterByType = buildDefaultShardSplitterSnapshot().splitterByType
  let hasShardData = false

  for (const moduleType of ['cannon', 'defense', 'generator', 'core'] as const) {
    const shards = coerceSaveNumber(root[shardKeys[moduleType]])
    const primaryLevel = moduleProgress.currentLevel?.[moduleType]
    const assistLevel = moduleProgress.assistCurrentLevel?.[moduleType]
    const primaryRarity = moduleProgress.lastRarityByType?.[moduleType] ?? 'Common'
    const assistRarity = moduleProgress.lastAssistRarityByType?.[moduleType] ?? 'Common'
    const assistEffPct = moduleProgress.costsAssistEffPctByType?.[moduleType]
      ?? moduleProgress.costsAssistEffPct
      ?? 25

    const entry = splitterByType[moduleType]
    if (shards != null && shards >= 0) {
      entry.unspentShards = Math.floor(shards)
      hasShardData = true
    }
    if (primaryLevel != null && primaryLevel > 0) {
      entry.primaryLevel = clampInt(primaryLevel, 1, 300)
      entry.primaryRarity = primaryRarity
      hasShardData = true
    }
    if (assistLevel != null && assistLevel > 0) {
      entry.secondaryLevel = clampInt(assistLevel, 1, 300)
      entry.secondaryRarity = assistRarity
      hasShardData = true
    }
    entry.assistEffPct = clampInt(assistEffPct, 0, 100)
  }

  if (!hasShardData) return {}

  const costsAssistEffPctByType = buildDefaultShardSplitterSnapshot().costsAssistEffPctByType
  for (const moduleType of ['cannon', 'defense', 'generator', 'core'] as const) {
    costsAssistEffPctByType[moduleType] = splitterByType[moduleType].assistEffPct
  }

  return { splitterByType, costsAssistEffPctByType }
}

/** A research lab's level straight off the save, by catalog slug. */
function readResearchLevelBySlug(root: Record<string, unknown>, slug: string): number {
  const record = LAB_RESEARCH_BY_INDEX.find(entry => entry.slug === slug)
  if (!record) return 0
  const levels = readIndexedNumberArray(root.researchLevel, LAB_RESEARCH_BY_INDEX.length)
  return Math.max(0, Math.floor(levels[record.index] ?? 0))
}

/**
 * A card's mastery level, which is a lab, not a flag.
 *
 * `cardMasteryUnlocked` only says the player has unlocked mastery for that
 * card. The level then comes from that card's mastery research -- there is one
 * per card, named "<Card> Mastery" in the catalog, so the pairing is derived
 * from the card's own name rather than written down.
 *
 * This used to report 1 for "unlocked" and 0 otherwise, so a player with
 * Plasma Cannon Mastery at 9 of 9 fed the thorns calculator a 1.
 */
function readCardMasteryLevelBySlug(root: Record<string, unknown>, slug: string): number {
  if (!readCardMasteryUnlockedBySlug(root, slug)) return 0

  const cardName = CARD_IMPORT_CATALOG.find(entry => entry.slug === slug)?.name
  if (!cardName) return 0

  const wanted = `${cardName} Mastery`.trim().toLowerCase()
  const record = LAB_RESEARCH_BY_INDEX.find(
    entry => String(entry.displayName ?? '').trim().toLowerCase() === wanted,
  )
  if (!record) return 0

  const levels = readIndexedNumberArray(root.researchLevel, LAB_RESEARCH_BY_INDEX.length)
  const level = levels[record.index] ?? 0
  return Math.max(0, Math.floor(level))
}

export function readThornsCalculatorSettings(
  root: Record<string, unknown>,
): Partial<SharedThornsCalculatorSettings> {
  const thornLevel = readWorkshopLevelByTrackerKey(root, 'Thorn Damage')
    ?? readWorkshopLevelByTrackerKey(root, 'Thorns')
  const currentTier = coerceSaveNumber(root.currentTier)
  const pcLevel = readCardLevelBySlug(root, 'pc')
  const pcMasteryUnlocked = readCardMasteryUnlockedBySlug(root, 'pc')
  const tournamentJoined = readSaveBoolean(root.tournamentJoined)
  const tierBeforeTournament = coerceSaveNumber(root.tierBeforeTournament)

  const partial: Partial<SharedThornsCalculatorSettings> = {}
  if (thornLevel != null && thornLevel > 0) partial.baseThorns = thornLevel
  if (currentTier != null) partial.tier = Math.max(1, Math.floor(currentTier))
  if (pcLevel > 0) partial.pcLevel = clampInt(pcLevel, 0, 7)
  if (pcMasteryUnlocked) partial.pcMasteryLevel = readCardMasteryLevelBySlug(root, 'pc')

  // Wall Thorns is a lab, and the calculator's field takes the lab's level
  // directly -- both run 1..20. Nothing derived it, so a player with it maxed
  // still started at 1.
  const wallThorns = readResearchLevelBySlug(root, 'wall_thorns')
  if (wallThorns > 0) partial.startWallThorns = clampInt(wallThorns, 1, 20)

  if (tournamentJoined && tierBeforeTournament != null) {
    const tier = Math.floor(tierBeforeTournament)
    if (tier === 11) partial.tournamentTier = 't11'
    else if (tier === 14) partial.tournamentTier = 't14'
    else if (tier === 17) partial.tournamentTier = 't17'
  }

  return partial
}

export function readDamageReduxCalculatorSettings(
  root: Record<string, unknown>,
  researchLabLevels: Record<string, number> = {},
): Partial<SharedDamageReduxCalculatorSettings> {
  const chainThunderLab = computeResearchLabLevel(researchLabLevels, 'chain_thunder', 30)
  const clPlusLevel = readUwPlusLevel(root, 'Chain Lightning')
  const pcPct = readCardPercentBySlug(root, 'pc')
  const pcLevel = readCardLevelBySlug(root, 'pc')

  const partial: Partial<SharedDamageReduxCalculatorSettings> = {}
  if (chainThunderLab > 0) {
    partial.useCT = true
    partial.ctLevel = chainThunderLab
  }
  if (clPlusLevel != null) {
    partial.clPlusLevel = clampInt(clPlusLevel, 0, 30)
  }
  if (pcLevel > 0) {
    partial.usePC = true
    if (pcPct != null) partial.pcPct = clampInt(pcPct, 0, 100)
  }

  return partial
}

export function readBotMedalSplitterPlanner(
  root: Record<string, unknown>,
  towerRange: number | null,
): Partial<SharedBotMedalSplitterPlanner> {
  const vault = readVaultLevelsFromSaveRoot(root)
  const vaultBotRangeLevel = BOTRANGE_VAULT_NODE_IDS.filter(id => (vault.levels[id] ?? 0) > 0).length
  if (vaultBotRangeLevel <= 0 && (towerRange == null || towerRange <= 0)) return {}

  const presets = defaultSharedBotMedalSplitterPlanner.presets.map((preset, index) => ({
    ...preset,
    ...(index === 0
      ? {
        ...(towerRange != null && towerRange > 0 ? { towerRange } : {}),
        ...(vaultBotRangeLevel > 0 ? { vaultBotRangeLevel } : {}),
      }
      : {}),
  }))

  return { activePreset: 0, presets }
}

export function readUwCalcProgressFromSaveRoot(
  root: Record<string, unknown>,
): SharedToolInputsExtended['uwCalcProgress'] {
  const catalog = listUltimateWeaponCatalogRows()
  if (catalog.length === 0) return {}

  const weaponLevels = readIndexedNumberArray(root.ultimateWeaponLevel, catalog.length * UW_STATS_PER_SLOT)
  if (weaponLevels.every(level => level === 0)) return {}

  const out: SharedToolInputsExtended['uwCalcProgress'] = {}
  catalog.forEach((weapon, slotIndex) => {
    if (!weapon.name) return
    const baseIndex = slotIndex * UW_STATS_PER_SLOT
    const slice = weaponLevels.slice(baseIndex, baseIndex + UW_STATS_PER_SLOT)
    if (slice.every(level => level <= 0)) return

    const statLevels: Record<string, number> = {}
    const statNames = ['Damage', 'Duration', 'Quantity']
    slice.forEach((level, statIndex) => {
      if (level <= 0) return
      const statName = statNames[statIndex]
      if (statName) statLevels[statName] = Math.floor(level)
    })
    if (Object.keys(statLevels).length > 0) out[weapon.name] = statLevels
  })

  return out
}

function isEchoLabsUnlockedInSave(root: Record<string, unknown>): boolean {
  const currentTier = coerceSaveNumber(root.currentTier)
  const highestWaveThisTier = readSaveIntList(root.highestWaveThisTier)

  if (currentTier != null && currentTier > ECHO_LABS_UNLOCK_TIER) return true
  if (currentTier === ECHO_LABS_UNLOCK_TIER) {
    const wave = Math.max(0, Math.floor(highestWaveThisTier[ECHO_LABS_UNLOCK_TIER - 1] ?? 0))
    return wave >= ECHO_LABS_UNLOCK_WAVE
  }

  for (let tier = ECHO_LABS_UNLOCK_TIER + 1; tier <= highestWaveThisTier.length; tier += 1) {
    if ((highestWaveThisTier[tier - 1] ?? 0) > 0) return true
  }

  return false
}

export function readDissonanceCycleWaveForTierType(
  cycleWaves: number[],
  tier: number,
  typeIndex: number,
  layout: DissonanceCycleLayout = 'tier-major',
): number {
  const safeTier = Math.max(1, Math.min(DISSONANCE_TIER_COUNT, Math.floor(tier)))
  const safeTypeIndex = Math.max(0, Math.min(DISSONANCE_CYCLE_TYPES_PER_TIER - 1, Math.floor(typeIndex)))
  const index = layout === 'type-major'
    ? DISSONANCE_TYPE_MAJOR_BLOCK_START[safeTypeIndex] + (safeTier - 1)
    : (safeTier - 1) * DISSONANCE_CYCLE_TYPES_PER_TIER + safeTypeIndex
  if (index < 0 || index >= cycleWaves.length) return 0
  const wave = cycleWaves[index]
  return Number.isFinite(wave) ? Math.max(0, Math.floor(wave)) : 0
}

function countNonZeroBlock(cycleWaves: number[], start: number, end: number): number {
  let count = 0
  for (let index = start; index < end && index < cycleWaves.length; index += 1) {
    if ((cycleWaves[index] ?? 0) > 0) count += 1
  }
  return count
}

export function detectDissonanceCycleLayout(cycleWaves: number[]): DissonanceCycleLayout {
  const attackBlockCount = countNonZeroBlock(cycleWaves, 0, 21)
  const defenseBlockCount = countNonZeroBlock(cycleWaves, 21, 42)
  const utilityBlockCount = countNonZeroBlock(cycleWaves, 42, 63)
  const uwBlockCount = countNonZeroBlock(cycleWaves, 63, 84)

  const hasPopulatedTypeBlocks = defenseBlockCount > 0
    && utilityBlockCount > 0
    && uwBlockCount > 0
    && attackBlockCount > 0

  if (hasPopulatedTypeBlocks) {
    const blockCounts = [attackBlockCount, defenseBlockCount, utilityBlockCount, uwBlockCount]
    const minBlock = Math.min(...blockCounts)
    const maxBlock = Math.max(...blockCounts)
    if (maxBlock - minBlock <= 2) return 'type-major'
  }

  return 'tier-major'
}

export function readDissonanceCycleWavesFromSaveRoot(
  root: Record<string, unknown>,
): { cycleWaves: number[], layout: DissonanceCycleLayout } {
  const cycleWaves = readIndexedNumberArray(
    root.highestWavePerTierThisCycle,
    DISSONANCE_TIER_COUNT * DISSONANCE_CYCLE_TYPES_PER_TIER,
  )
  const layout: DissonanceCycleLayout = 'tier-major'
  return { cycleWaves, layout }
}

export function readDissonanceBoostWavesByType(
  root: Record<string, unknown>,
): Record<DissonanceTypeKey, number[]> {
  const wavesByType = {} as Record<DissonanceTypeKey, number[]>
  for (const type of DISSONANCE_TYPE_KEYS) {
    wavesByType[type] = readSaveIntList(root[DISSONANCE_BOOST_SAVE_FIELD_BY_TYPE[type]])
  }
  return wavesByType
}

export function readDissonanceBoostWaveForTierType(
  boostWavesByType: Record<DissonanceTypeKey, number[]>,
  tier: number,
  type: DissonanceTypeKey,
): number {
  const safeTier = Math.max(1, Math.min(DISSONANCE_TIER_COUNT, Math.floor(tier)))
  const wave = boostWavesByType[type][safeTier] ?? 0
  return Number.isFinite(wave) ? Math.max(0, Math.floor(wave)) : 0
}

export function countNonZeroDissonanceBoostWaves(
  boostWavesByType: Record<DissonanceTypeKey, number[]>,
): number {
  let count = 0
  for (const type of DISSONANCE_TYPE_KEYS) {
    for (const wave of boostWavesByType[type]) {
      if (wave > 0) count += 1
    }
  }
  return count
}

function applyDissonanceRawWave(
  waves: DissonanceWaveInputs,
  maxFlags: DissonanceMaxFlags,
  type: DissonanceTypeKey,
  rawWave: number,
): boolean {
  if (rawWave <= 0) return false
  const isMax = rawWave >= DISSONANCE_MAX_EFFECTIVE_WAVE
  waves[type] = isMax ? DISSONANCE_MAX_EFFECTIVE_WAVE : rawWave
  maxFlags[type] = isMax
  return true
}

/** Per-track waves from dissonance boost lists (matches in-game dissonance UI). */
export function buildDissonanceWaveInputsFromBoostWaves(
  tier: number,
  boostWavesByType: Record<DissonanceTypeKey, number[]>,
): {
    waves: DissonanceWaveInputs
    maxFlags: DissonanceMaxFlags
    hasData: boolean
  } {
  const waves = defaultDissonanceWaveInputs()
  const maxFlags = defaultDissonanceMaxFlags()
  let hasData = false

  for (const type of DISSONANCE_TYPE_KEYS) {
    const rawWave = readDissonanceBoostWaveForTierType(boostWavesByType, tier, type)
    if (applyDissonanceRawWave(waves, maxFlags, type, rawWave)) {
      hasData = true
    }
  }

  return { waves, maxFlags, hasData }
}

/** Legacy event-cycle stride-4 layout (`highestWavePerTierThisCycle`). */
export function buildDissonanceWaveInputsFromCycleWaves(
  tier: number,
  cycleWaves: number[],
  layout: DissonanceCycleLayout = 'tier-major',
): {
    waves: DissonanceWaveInputs
    maxFlags: DissonanceMaxFlags
    hasData: boolean
  } {
  const waves = defaultDissonanceWaveInputs()
  const maxFlags = defaultDissonanceMaxFlags()
  let hasData = false

  DISSONANCE_CYCLE_SAVE_TYPE_BY_SLOT.forEach((type, slotIndex) => {
    const rawCycleWave = readDissonanceCycleWaveForTierType(cycleWaves, tier, slotIndex, layout)
    if (applyDissonanceRawWave(waves, maxFlags, type, rawCycleWave)) {
      hasData = true
    }
  })

  return { waves, maxFlags, hasData }
}

export function readDissonanceCalculatorState(
  root: Record<string, unknown>,
): Partial<SharedDissonanceCalculatorState> {
  const boostWavesByType = readDissonanceBoostWavesByType(root)
  const wavesByTier: Record<string, DissonanceWaveInputs> = {}
  const maxByTier: Record<string, DissonanceMaxFlags> = {}
  let hasWaveData = false

  for (let tier = 1; tier <= DISSONANCE_TIER_COUNT; tier += 1) {
    const mapped = buildDissonanceWaveInputsFromBoostWaves(tier, boostWavesByType)
    if (!mapped.hasData) continue
    hasWaveData = true
    const key = String(tier)
    wavesByTier[key] = mapped.waves
    maxByTier[key] = mapped.maxFlags
  }

  const partial: Partial<SharedDissonanceCalculatorState> = {
    echoLabsLocked: !isEchoLabsUnlockedInSave(root),
  }
  if (hasWaveData) {
    partial.wavesByTier = wavesByTier
    partial.maxByTier = maxByTier
  }

  return partial
}

/**
 * Bot synchronicity (slot ownership, targets, assignments) is tracker-local today.
 * No synchronicity fields are present in `player-data-catalog.ts` or test saves.
 */
export function readBotsSynchronicityFromSaveRoot(
  _root: Record<string, unknown>,
): Partial<SharedBotsSynchronicity> {
  return {}
}

export function mergeSaveDerivedDissonanceCalculatorState(
  base: SharedDissonanceCalculatorState,
  incoming?: Partial<SharedDissonanceCalculatorState>,
): SharedDissonanceCalculatorState {
  if (!incoming) return base

  const wavesByTier = { ...base.wavesByTier }
  const maxByTier = { ...base.maxByTier }

  if (incoming.wavesByTier) {
    for (const [tier, waves] of Object.entries(incoming.wavesByTier)) {
      wavesByTier[tier] = {
        ...(wavesByTier[tier] ?? defaultDissonanceWaveInputs()),
        ...waves,
      }
    }
  }

  if (incoming.maxByTier) {
    for (const [tier, flags] of Object.entries(incoming.maxByTier)) {
      maxByTier[tier] = {
        ...(maxByTier[tier] ?? defaultDissonanceMaxFlags()),
        ...flags,
      }
    }
  }

  return {
    echoLabsLocked: incoming.echoLabsLocked ?? base.echoLabsLocked,
    wavesByTier,
    maxByTier,
  }
}

export function mergeSaveDerivedBotsSynchronicity(
  base: SharedBotsSynchronicity,
  incoming?: Partial<SharedBotsSynchronicity>,
): SharedBotsSynchronicity {
  if (!incoming || Object.keys(incoming).length === 0) return base
  return {
    enabled: incoming.enabled ?? base.enabled,
    slotsOwned: incoming.slotsOwned ?? base.slotsOwned,
    slotsTarget: incoming.slotsTarget ?? base.slotsTarget,
    assignments: incoming.assignments ?? base.assignments,
  }
}

export function readLabsCalcByLabFromResearchLevels(
  researchLabLevels: Record<string, number>,
): SharedToolInputsExtended['labsCalcByLab'] {
  const out: SharedToolInputsExtended['labsCalcByLab'] = {}
  for (const [labName, current] of Object.entries(researchLabLevels)) {
    if (!Number.isFinite(current) || current <= 0) continue
    out[labName] = { current: Math.floor(current), target: null }
  }
  return out
}

export function readExtendedSharedToolInputs(
  root: Record<string, unknown> | null | undefined,
  options?: { towerRangeMeters?: number | null },
): Partial<SharedToolInputsExtended> {
  if (!root) return {}

  const researchLabLevels = readResearchLabLevelsFromSaveRoot(root)
  const workshopStatLevels = readWorkshopStatLevelsFromSaveRoot(root)
  const vaultLevels = readVaultLevelsFromSaveRoot(root)
  const moduleProgress = readModuleProgressFromSaveRoot(root)

  let elsPlannerInputs = {
    ...defaultExtendedSharedToolInputs.elsPlannerInputs,
    ...readElsPlannerInputsFromSaveRoot(root, researchLabLevels),
  }
  elsPlannerInputs = enrichElsPlannerFromLinkedSources(elsPlannerInputs, workshopStatLevels, vaultLevels)

  const shardSplitter = readShardSplitterInputsFromSaveRoot(root, moduleProgress)
  const thornsCalculatorSettings = {
    ...defaultExtendedSharedToolInputs.thornsCalculatorSettings,
    ...readThornsCalculatorSettings(root),
  }
  const damageReduxCalculatorSettings = {
    ...defaultExtendedSharedToolInputs.damageReduxCalculatorSettings,
    ...readDamageReduxCalculatorSettings(root, researchLabLevels),
  }

  const botMedalSplitter = readBotMedalSplitterPlanner(root, options?.towerRangeMeters ?? null)
  const uwCalcProgress = readUwCalcProgressFromSaveRoot(root)
  const labsCalcByLab = readLabsCalcByLabFromResearchLevels(researchLabLevels)
  const dissonanceDerived = readDissonanceCalculatorState(root)
  const botsSynchronicityDerived = readBotsSynchronicityFromSaveRoot(root)

  const enemyStatsCore = {
    ...defaultExtendedSharedToolInputs.enemyStatsCore,
    ...readEnemyStatsCoreFromSaveRoot(root),
  }

  const moduleProgressInputs = {
    ...defaultExtendedSharedToolInputs.moduleProgressInputs,
    ...moduleProgress,
  }

  const shardSplitterInputs: SharedShardSplitterInputs = mergeShardSplitterInputs(
    defaultExtendedSharedToolInputs.shardSplitterInputs,
    shardSplitter,
  )

  const partial: Partial<SharedToolInputsExtended> = {
    workshopStatLevels,
    enemyStatsCore,
    elsPlannerInputs,
    vaultLevels,
    moduleProgressInputs,
    shardSplitterInputs,
    thornsCalculatorSettings,
    damageReduxCalculatorSettings,
    uwCalcProgress,
    labsCalcByLab,
  }

  if (botMedalSplitter.presets) {
    partial.botMedalSplitterPlanner = {
      ...defaultSharedBotMedalSplitterPlanner,
      ...botMedalSplitter,
      presets: botMedalSplitter.presets,
    }
  }

  if (Object.keys(dissonanceDerived).length > 0) {
    partial.dissonanceCalculatorState = mergeSaveDerivedDissonanceCalculatorState(
      defaultSharedDissonanceCalculatorState,
      dissonanceDerived,
    )
  }

  if (Object.keys(botsSynchronicityDerived).length > 0) {
    partial.botsSynchronicity = botsSynchronicityDerived as SharedBotsSynchronicity
  }

  return partial
}

export function mergeSaveDerivedExtendedSharedToolInputs(
  base: SharedToolInputsExtended,
  saveDerived: Partial<SharedToolInputsExtended>,
  researchLabLevels: Record<string, number> = {},
): SharedToolInputsExtended {
  const normalizedIncoming: SharedToolInputsExtended = {
    workshopStatLevels: saveDerived.workshopStatLevels ?? base.workshopStatLevels,
    enemyStatsCore: {
      ...base.enemyStatsCore,
      ...(saveDerived.enemyStatsCore ?? {}),
      battleConditions: base.enemyStatsCore.battleConditions,
    },
    enemyDropsInputs: saveDerived.enemyDropsInputs ?? base.enemyDropsInputs,
    cardsProgressInputs: saveDerived.cardsProgressInputs ?? base.cardsProgressInputs,
    elsPlannerInputs: saveDerived.elsPlannerInputs ?? base.elsPlannerInputs,
    vaultLevels: saveDerived.vaultLevels ?? base.vaultLevels,
    moduleProgressInputs: saveDerived.moduleProgressInputs ?? base.moduleProgressInputs,
    shardSplitterInputs: saveDerived.shardSplitterInputs
      ? mergeShardSplitterInputs(base.shardSplitterInputs, saveDerived.shardSplitterInputs)
      : base.shardSplitterInputs,
    uwCalcProgress: saveDerived.uwCalcProgress ?? base.uwCalcProgress,
    labsCalcByLab: saveDerived.labsCalcByLab ?? base.labsCalcByLab,
    thornsCalculatorSettings: saveDerived.thornsCalculatorSettings ?? base.thornsCalculatorSettings,
    damageReduxCalculatorSettings: saveDerived.damageReduxCalculatorSettings ?? base.damageReduxCalculatorSettings,
    dissonanceCalculatorState: mergeSaveDerivedDissonanceCalculatorState(
      base.dissonanceCalculatorState,
      saveDerived.dissonanceCalculatorState,
    ),
    botMedalSplitterPlanner: saveDerived.botMedalSplitterPlanner ?? base.botMedalSplitterPlanner,
    botsSynchronicity: mergeSaveDerivedBotsSynchronicity(
      base.botsSynchronicity,
      saveDerived.botsSynchronicity,
    ),
  }

  const merged = mergeExtendedSharedToolInputs(base, normalizedIncoming)

  if (Object.keys(researchLabLevels).length > 0) {
    merged.labsCalcByLab = {
      ...merged.labsCalcByLab,
      ...readLabsCalcByLabFromResearchLevels(researchLabLevels),
    }
  }

  merged.elsPlannerInputs = enrichElsPlannerFromLinkedSources(
    merged.elsPlannerInputs,
    merged.workshopStatLevels,
    merged.vaultLevels,
  )

  return merged
}
