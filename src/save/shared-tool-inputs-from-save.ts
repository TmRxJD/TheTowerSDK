import { roundToDisplayPrecision } from '../formatting/numbers'
import { BOT_UPGRADES_DATA } from '../data/bots'
import { BOT_IMPORT_CATALOG } from './catalogs/indexes'
import { listRelicCatalogRows } from './catalogs/relics'
import { listUltimateWeaponCatalogRows } from './catalogs/ultimate-weapons'
import { getSharedToolLabs, resolveLabValueAtLevel } from '../data/labs'
import { decodeModuleSaveEffect, type ModuleSaveSlotCategory } from './module-effects-decode'
import { MODULE_RARITIES } from '../data/module-levels'
import {
  coerceSaveNumber,
  readIndexedNumberArray,
  readSaveBoolean,
  readSaveEnumValue,
  toNumberArray,
} from './read-values'
import { readPerkPreferencesFromSaveRoot } from './perks'
import {
  readResearchLabLevelsFromSaveRoot,
  readExtendedSharedToolInputsFromSaveRoot,
  mergeSaveDerivedExtendedSharedToolInputs,
} from './shared-tool-inputs-from-save-extended'
import { enrichSharedToolInputsFromResearchLevels } from '../internal/shared-tool-inputs-from-research'
import {
  defaultSharedToolInputs,
  mergeNumberRecords,
  normalizeSharedToolInputs,
  type SharedToolInputs,
  type SharedTradeOffPerks,
} from '../internal/shared-tool-inputs'
import {
  mergeSharedUptimeInputs,
  type SharedUptimeInputs,
  type SharedUptimeRarityPick,
  UPTIME_UW_FIELD_MAP,
} from '../internal/shared-uptime-inputs'
import { getOutOfRoundMaxDistance } from '../mechanics/tower-range'
import { RANGE_WORKSHOP_UPGRADE_INDEX } from '../mechanics/constants'

const LAB_SPEED_RELIC_BENEFIT_TYPE = 25
const GEM_DISCOUNT_PER_COMPLETED_RESEARCH = 0.015


const TRADE_OFF_PERK_LEVEL_INDICES = {
  perkEnemyHpMinus50: 42,
  perkEnemyDmgMinus50: 43,
  perkRangedDmgX3: 44,
  perkEnemyDmgX25: 45,
  perkBossHpMinus70: 40,
  perkBossHpX8: 48,
} as const

const MODULE_PRIMARY_CATEGORIES: ModuleSaveSlotCategory[] = ['Cannon', 'Armor', 'Generator', 'Core']
const MODULE_ASSIST_TYPE_TO_CATEGORY: Record<number, ModuleSaveSlotCategory> = {
  0: 'Cannon',
  1: 'Armor',
  2: 'Generator',
  3: 'Core',
}

function clampInt(value: number, min: number, max: number): number {
  return Math.floor(Math.min(max, Math.max(min, value)))
}

function parseMultiplierValue(raw: string): number {
  const parsed = Number.parseFloat(String(raw).replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

/** Game save bot stat order → tracker stat order. */
function remapBotLevelsFromGameSaveOrder(saveLevels: number[]): number[] {
  const padded = readIndexedNumberArray(saveLevels, 4)
  return [
    padded[0] ?? 0,
    padded[2] ?? 0,
    padded[3] ?? 0,
    padded[1] ?? 0,
  ]
}

function isPerkActive(perkLevels: number[], index: number): boolean {
  return (perkLevels[index] ?? 0) >= 1
}

export function readTradeOffPerksFromSaveRoot(root: Record<string, unknown>): SharedTradeOffPerks {
  const perkLevels = readIndexedNumberArray(root.perkLevel, 64)
  return {
    perkEnemyHpMinus50: isPerkActive(perkLevels, TRADE_OFF_PERK_LEVEL_INDICES.perkEnemyHpMinus50),
    perkEnemyDmgMinus50: isPerkActive(perkLevels, TRADE_OFF_PERK_LEVEL_INDICES.perkEnemyDmgMinus50),
    perkRangedDmgX3: isPerkActive(perkLevels, TRADE_OFF_PERK_LEVEL_INDICES.perkRangedDmgX3),
    perkEnemyDmgX25: isPerkActive(perkLevels, TRADE_OFF_PERK_LEVEL_INDICES.perkEnemyDmgX25),
    perkBossHpMinus70: isPerkActive(perkLevels, TRADE_OFF_PERK_LEVEL_INDICES.perkBossHpMinus70),
    perkBossHpX8: isPerkActive(perkLevels, TRADE_OFF_PERK_LEVEL_INDICES.perkBossHpX8),
  }
}

export function readLabRelicPctFromSaveRoot(root: Record<string, unknown>): number {
  const profileIndices = new Set(
    toNumberArray(root.profileRelics).filter(index => index >= 0),
  )
  if (profileIndices.size === 0) return 0

  let total = 0
  for (const relic of listRelicCatalogRows()) {
    if (!profileIndices.has(relic.index)) continue
    if (Number(relic.benefitType) !== LAB_SPEED_RELIC_BENEFIT_TYPE) continue
    const benefit = Number(relic.benefit)
    if (!Number.isFinite(benefit)) continue
    total += benefit * 100
  }
  return Math.max(0, total)
}

export function readGemDiscountMultiplierFromSaveRoot(root: Record<string, unknown>): number {
  const completed = coerceSaveNumber(root.researchesComplete)
  const count = Math.max(0, Math.floor(completed ?? 0))
  return roundToDisplayPrecision(1 + count * GEM_DISCOUNT_PER_COMPLETED_RESEARCH) || 1
}

export function readLabSpeedUpFromSaveRoot(root: Record<string, unknown>): number {
  const speeds = toNumberArray(root.labSpeedUpSpeed)
  if (speeds.length === 0) return 1
  return Math.max(1, ...speeds.map(value => Math.floor(value)))
}

export function readTowerRangeMetersFromSaveRoot(root: Record<string, unknown>): number | null {
  const workshopLevels = readIndexedNumberArray(root.upgradeWorkshopLevel, 32)
  const workshopRangeLevel = workshopLevels[RANGE_WORKSHOP_UPGRADE_INDEX] ?? 0
  const rangeLevelSelected = Math.max(0, Math.floor(coerceSaveNumber(root.rangeLevelSelected) ?? 0))

  const rangeLab = getSharedToolLabs().find(lab => lab.name === 'range')
  if (!rangeLab) return null

  const rangeLabBenefit = resolveLabValueAtLevel(rangeLab, rangeLevelSelected)
  if (!Number.isFinite(rangeLabBenefit) || rangeLabBenefit <= 0) return null

  const internal = getOutOfRoundMaxDistance({
    rangeLabBenefit,
    workshopRangeLevel: Math.max(0, workshopRangeLevel),
  })
  return clampInt(Math.round(internal * 10), 0, 1000)
}

export function readBotBotBonusMultiplierFromSaveRoot(root: Record<string, unknown>): number {
  const botBotIndex = BOT_IMPORT_CATALOG.findIndex(row => row.name === 'Bot Bot')
  if (botBotIndex < 0) return 0

  const flatLevels = readIndexedNumberArray(root.botsLevel, 20)
  const stride = 4
  const start = botBotIndex * stride
  const saveSlice = flatLevels.slice(start, start + stride)
  if (saveSlice.every(level => level === 0)) return 0

  const trackerLevels = remapBotLevelsFromGameSaveOrder(saveSlice)
  const bonusLevel = trackerLevels[2] ?? 0
  if (bonusLevel <= 0) return 0

  const botBot = BOT_UPGRADES_DATA.find(bot => bot.label === 'Bot Bot')
  const bonusChart = botBot?.stats.Bonus?.levels ?? {}
  const rawValue = bonusChart[bonusLevel]
  if (rawValue == null) return 0
  return parseMultiplierValue(String(rawValue))
}

export function readDeathWaveBaseWavesFromSaveRoot(root: Record<string, unknown>): number | null {
  const catalog = listUltimateWeaponCatalogRows()
  const deathWaveSlot = catalog.findIndex(row => row.name === 'Death Wave')
  if (deathWaveSlot < 0) return null

  const weaponLevels = readIndexedNumberArray(root.ultimateWeaponLevel, 27)
  const perSlot = 3
  const baseIndex = deathWaveSlot * perSlot
  const quantityLevel = weaponLevels[baseIndex + 1]
  if (!Number.isFinite(quantityLevel) || quantityLevel <= 0) return null
  return Math.max(1, Math.floor(quantityLevel))
}

function toUptimeRarity(tier: string | null | undefined): SharedUptimeRarityPick {
  if (!tier) return 'None'
  return (MODULE_RARITIES as readonly string[]).includes(tier)
    ? (tier as SharedUptimeRarityPick)
    : 'None'
}

function readEquippedModuleEffects(raw: unknown): number[] {
  if (!raw || typeof raw !== 'object') return []
  const item = raw as Record<string, unknown>
  if (!Array.isArray(item.effects)) return []
  return item.effects.map(effect => coerceSaveNumber(effect) ?? 0)
}

function collectEquippedModuleSubstats(root: Record<string, unknown>): Array<{
  role: 'primary' | 'assist'
  category: ModuleSaveSlotCategory
  label: string
  rarity: SharedUptimeRarityPick
}> {
  const rows: Array<{
    role: 'primary' | 'assist'
    category: ModuleSaveSlotCategory
    label: string
    rarity: SharedUptimeRarityPick
  }> = []

  const primaryRaw = root.moduleEquipped
  if (Array.isArray(primaryRaw)) {
    primaryRaw.forEach((entry, index) => {
      const category = MODULE_PRIMARY_CATEGORIES[index]
      if (!category) return
      for (const effectId of readEquippedModuleEffects(entry)) {
        if (!effectId) continue
        const decoded = decodeModuleSaveEffect(effectId, category)
        if (!decoded?.label) continue
        rows.push({
          role: 'primary',
          category,
          label: decoded.label,
          rarity: toUptimeRarity(decoded.rarity),
        })
      }
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
      for (const effectId of readEquippedModuleEffects(slot.equippedModule)) {
        if (!effectId) continue
        const decoded = decodeModuleSaveEffect(effectId, category)
        if (!decoded?.label) continue
        rows.push({
          role: 'assist',
          category,
          label: decoded.label,
          rarity: toUptimeRarity(decoded.rarity),
        })
      }
    })
  }

  return rows
}

export function readUptimeModuleRaritiesFromSaveRoot(root: Record<string, unknown>): Partial<SharedUptimeInputs> {
  const substats = collectEquippedModuleSubstats(root)
  const derived: Partial<SharedUptimeInputs> = {}

  for (const map of UPTIME_UW_FIELD_MAP) {
    const statLabel = map.cdStatName
    const durLabel = map.durStatName
    const qtyLabel = map.qtyStatName
    const angleLabel = map.angleStatName

    const primaryCd = substats.find(row => row.role === 'primary' && row.label === statLabel)
    const assistCd = substats.find(row => row.role === 'assist' && row.label === statLabel)
    const d = derived as Record<string, unknown>
    if (primaryCd && map.cdStatKey) {
      d[map.cdStatKey] = primaryCd.rarity
    }
    if (assistCd && map.cdAssistKey) {
      d[map.cdAssistKey] = assistCd.rarity
    }

    if (durLabel) {
      const primaryDur = substats.find(row => row.role === 'primary' && row.label === durLabel)
      const assistDur = substats.find(row => row.role === 'assist' && row.label === durLabel)
      if (primaryDur && map.durStatKey) {
        d[map.durStatKey] = primaryDur.rarity
      }
      if (assistDur && map.durAssistKey) {
        d[map.durAssistKey] = assistDur.rarity
      }
    }

    if (qtyLabel) {
      const primaryQty = substats.find(row => row.role === 'primary' && row.label === qtyLabel)
      const assistQty = substats.find(row => row.role === 'assist' && row.label === qtyLabel)
      if (primaryQty && map.qtyStatKey) {
        d[map.qtyStatKey] = primaryQty.rarity
      }
      if (assistQty && map.qtyAssistKey) {
        d[map.qtyAssistKey] = assistQty.rarity
      }
    }

    if (angleLabel) {
      const primaryAngle = substats.find(row => row.role === 'primary' && row.label === angleLabel)
      const assistAngle = substats.find(row => row.role === 'assist' && row.label === angleLabel)
      if (primaryAngle && map.angleStatKey) {
        d[map.angleStatKey] = primaryAngle.rarity
      }
      if (assistAngle && map.angleAssistKey) {
        d[map.angleAssistKey] = assistAngle.rarity
      }
    }
  }

  return derived
}

function cloneLevelTargets(levels: Record<string, number[]>): Record<string, number[]> {
  return Object.fromEntries(
    Object.entries(levels).map(([key, values]) => [key, [...values]]),
  )
}

export function readSharedToolInputsFromSaveRoot(
  root: Record<string, unknown> | null | undefined,
): Partial<SharedToolInputs> {
  if (!root) return {}

  const labsEconomy = {
    labRelic: readLabRelicPctFromSaveRoot(root),
    gemDiscount: readGemDiscountMultiplierFromSaveRoot(root),
    speedUp: readLabSpeedUpFromSaveRoot(root),
  }

  const towerRange = readTowerRangeMetersFromSaveRoot(root)
  const dwBaseWavesLevel = readDeathWaveBaseWavesFromSaveRoot(root)
  const uptimeModuleRarities = readUptimeModuleRaritiesFromSaveRoot(root)
  const researchLabLevels = readResearchLabLevelsFromSaveRoot(root)
  const extended = readExtendedSharedToolInputsFromSaveRoot(root, { towerRangeMeters: towerRange })

  const uptimeInputs: Partial<SharedUptimeInputs> = {
    ...uptimeModuleRarities,
    ...(dwBaseWavesLevel != null ? { dwBaseWavesLevel } : {}),
    ...(readSaveBoolean(root.tournamentJoined) ? { tournament: true } : {}),
  }

  return {
    labsEconomy: {
      ...defaultSharedToolInputs.labsEconomy,
      ...labsEconomy,
    },
    researchLabLevels,
    tradeOffPerks: readTradeOffPerksFromSaveRoot(root),
    towerRange: towerRange ?? 0,
    namedCalculatorLabs: {
      ...defaultSharedToolInputs.namedCalculatorLabs,
      botBotBonusMultiplier: readBotBotBonusMultiplierFromSaveRoot(root),
    },
    uptimeInputs,
    perkPreferences: readPerkPreferencesFromSaveRoot(root),
    ...extended,
  }
}

export function mergeSaveDerivedSharedToolInputs(
  base: SharedToolInputs,
  saveDerived: Partial<SharedToolInputs>,
): SharedToolInputs {
  const mergedBotLevels = { ...base.botLevels }
  const mergedBotTargets = Object.keys(mergedBotLevels).length > 0
    ? cloneLevelTargets(mergedBotLevels)
    : { ...base.botTargets }
  const mergedBotPlusLevels = { ...base.botPlusLevels }
  const mergedBotPlusTargets = Object.keys(mergedBotPlusLevels).length > 0
    ? cloneLevelTargets(mergedBotPlusLevels)
    : { ...base.botPlusTargets }
  const mergedGuardianLevels = { ...base.guardianLevels }
  const mergedGuardianTargets = Object.keys(mergedGuardianLevels).length > 0
    ? cloneLevelTargets(mergedGuardianLevels)
    : { ...base.guardianTargets }

  const mergedExtended = mergeSaveDerivedExtendedSharedToolInputs(
    {
      workshopStatLevels: base.workshopStatLevels,
      enemyStatsCore: base.enemyStatsCore,
      enemyDropsInputs: base.enemyDropsInputs,
      cardsProgressInputs: base.cardsProgressInputs,
      elsPlannerInputs: base.elsPlannerInputs,
      vaultLevels: base.vaultLevels,
      moduleProgressInputs: base.moduleProgressInputs,
      shardSplitterInputs: base.shardSplitterInputs,
      uwCalcProgress: base.uwCalcProgress,
      labsCalcByLab: base.labsCalcByLab,
      thornsCalculatorSettings: base.thornsCalculatorSettings,
      damageReduxCalculatorSettings: base.damageReduxCalculatorSettings,
      dissonanceCalculatorState: base.dissonanceCalculatorState,
      botMedalSplitterPlanner: base.botMedalSplitterPlanner,
      botsSynchronicity: base.botsSynchronicity,
    },
    {
      workshopStatLevels: saveDerived.workshopStatLevels,
      enemyStatsCore: saveDerived.enemyStatsCore,
      elsPlannerInputs: saveDerived.elsPlannerInputs,
      vaultLevels: saveDerived.vaultLevels,
      moduleProgressInputs: saveDerived.moduleProgressInputs,
      shardSplitterInputs: saveDerived.shardSplitterInputs,
      uwCalcProgress: saveDerived.uwCalcProgress,
      labsCalcByLab: saveDerived.labsCalcByLab,
      thornsCalculatorSettings: saveDerived.thornsCalculatorSettings,
      damageReduxCalculatorSettings: saveDerived.damageReduxCalculatorSettings,
      dissonanceCalculatorState: saveDerived.dissonanceCalculatorState,
      botMedalSplitterPlanner: saveDerived.botMedalSplitterPlanner,
      botsSynchronicity: saveDerived.botsSynchronicity,
    },
    saveDerived.researchLabLevels ?? {},
  )

  const merged: SharedToolInputs = normalizeSharedToolInputs({
    ...base,
    ...mergedExtended,
    researchLabLevels: mergeNumberRecords(base.researchLabLevels, saveDerived.researchLabLevels),
    labsEconomy: {
      ...base.labsEconomy,
      ...(saveDerived.labsEconomy ?? {}),
      labSpeed: Math.max(base.labsEconomy.labSpeed, saveDerived.labsEconomy?.labSpeed ?? 0),
      labDiscount: Math.max(base.labsEconomy.labDiscount, saveDerived.labsEconomy?.labDiscount ?? 0),
      labRelic: Math.max(base.labsEconomy.labRelic, saveDerived.labsEconomy?.labRelic ?? 0),
      gemDiscount: saveDerived.labsEconomy?.gemDiscount ?? base.labsEconomy.gemDiscount,
      speedUp: Math.max(base.labsEconomy.speedUp, saveDerived.labsEconomy?.speedUp ?? 1),
    },
    botLevels: mergedBotLevels,
    botTargets: mergedBotTargets,
    botPlusLevels: mergedBotPlusLevels,
    botPlusTargets: mergedBotPlusTargets,
    guardianLevels: mergedGuardianLevels,
    guardianTargets: mergedGuardianTargets,
    towerRange: saveDerived.towerRange || base.towerRange,
    tradeOffPerks: saveDerived.tradeOffPerks ?? base.tradeOffPerks,
    namedCalculatorLabs: {
      ...base.namedCalculatorLabs,
      ...(saveDerived.namedCalculatorLabs ?? {}),
      botBotBonusMultiplier: saveDerived.namedCalculatorLabs?.botBotBonusMultiplier
        ?? base.namedCalculatorLabs.botBotBonusMultiplier,
      echoLabLevels: {
        ...base.namedCalculatorLabs.echoLabLevels,
        ...(saveDerived.namedCalculatorLabs?.echoLabLevels ?? {}),
      },
    },
    uptimeInputs: mergeSharedUptimeInputs(base.uptimeInputs, saveDerived.uptimeInputs ?? {}),
    perkPreferences: saveDerived.perkPreferences ?? base.perkPreferences,
  })

  return enrichSharedToolInputsFromResearchLevels(merged)
}
