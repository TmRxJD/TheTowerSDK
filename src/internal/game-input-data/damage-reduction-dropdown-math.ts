import { BOT_UPGRADES_DATA } from '../../data/index'
import { getModuleTemplate } from '../../data/index'
import {
  chainLightningPlusDamageFraction,
  resolveChainThunderMaxReductionPct,
  resolveChronoFieldReductionPctFromLab,
  resolveFlameBotEffectiveReductionPct,
} from '../../mechanics/damage-redux-layers'
import { SMITE_DAMAGE_BY_CL_PLUS_LEVEL } from '../../mechanics/damage-redux-constants'
import { resolveResearchLabMaxLevel } from './research-lab-dropdown-math'
import type { GameDropdownOptionEntry } from './types'

const CHRONO_FIELD_REDUCTION_LAB_SLUG = 'chrono_field_reduction'
const CHAIN_THUNDER_LAB_SLUG = 'chain_thunder'
const NMP_MODULE_ID = 'negative-mass-projector'
const PC_MODULE_ID = 'primordial-collapse'
const FLAME_BOT_DAMAGE_REDUCTION_STAT = 'Damage Reduction'

interface CatalogEntry extends GameDropdownOptionEntry {
  rawLabel?: string
  subtitle?: string
}

function parseNumericToken(raw: string): number {
  const parsed = Number.parseFloat(String(raw).replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function buildBotStatPctCatalog(botLabel: string, statName: string): readonly CatalogEntry[] {
  const bot = BOT_UPGRADES_DATA.find(entry => entry.label === botLabel)
  const statLevels = bot?.stats[statName]?.levels ?? {}

  return Object.entries(statLevels)
    .map(([levelKey, rawValue]) => {
      const level = Number(levelKey)
      const pct = parseNumericToken(String(rawValue))
      if (!Number.isFinite(level) || !Number.isFinite(pct)) return null
      return {
        value: pct,
        baseValue: level,
        rawLabel: String(rawValue),
      } as CatalogEntry
    })
    .filter((entry): entry is CatalogEntry => entry !== null)
    .sort((left, right) => left.baseValue - right.baseValue)
}

function buildModuleRarityBonusCatalog(moduleId: string): readonly CatalogEntry[] {
  const template = getModuleTemplate(moduleId)
  return (template?.rarityBonuses ?? []).map(bonus => ({
    value: bonus.value,
    baseValue: bonus.value,
    subtitle: bonus.rarity,
  }))
}

function buildBotBotBonusCatalog(): readonly CatalogEntry[] {
  const botBot = BOT_UPGRADES_DATA.find(bot => bot.label === 'Bot Bot')
  const bonusLevels = botBot?.stats.Bonus?.levels ?? {}

  const levelEntries = Object.entries(bonusLevels)
    .map(([levelKey, rawValue]) => {
      const level = Number(levelKey)
      const numericValue = parseNumericToken(String(rawValue))
      if (!Number.isFinite(level) || !Number.isFinite(numericValue)) return null
      return {
        value: numericValue,
        baseValue: level,
        rawLabel: String(rawValue),
      } as CatalogEntry
    })
    .filter((entry): entry is CatalogEntry => entry !== null)
    .sort((left, right) => left.baseValue - right.baseValue)

  return [
    { value: 0, baseValue: -1, rawLabel: '' },
    ...levelEntries,
  ]
}

const CHAIN_THUNDER_MAX_LEVEL = resolveResearchLabMaxLevel(CHAIN_THUNDER_LAB_SLUG)

let cfReductionEntriesCache: readonly GameDropdownOptionEntry[] | null = null
let flameBotEntriesCache: readonly GameDropdownOptionEntry[] | null = null
let botBonusEntriesCache: readonly GameDropdownOptionEntry[] | null = null
let nmpEntriesCache: readonly GameDropdownOptionEntry[] | null = null
let pcEntriesCache: readonly GameDropdownOptionEntry[] | null = null
let ctLevelEntriesCache: readonly GameDropdownOptionEntry[] | null = null
let clPlusEntriesCache: readonly GameDropdownOptionEntry[] | null = null
let botBotBonusCatalogCache: readonly CatalogEntry[] | null = null
let nmpCatalogCache: readonly CatalogEntry[] | null = null
let pcCatalogCache: readonly CatalogEntry[] | null = null

function getBotBotBonusCatalog(): readonly CatalogEntry[] {
  if (!botBotBonusCatalogCache) botBotBonusCatalogCache = buildBotBotBonusCatalog()
  return botBotBonusCatalogCache
}

function getNmpCatalog(): readonly CatalogEntry[] {
  if (!nmpCatalogCache) nmpCatalogCache = buildModuleRarityBonusCatalog(NMP_MODULE_ID)
  return nmpCatalogCache
}

function getPcCatalog(): readonly CatalogEntry[] {
  if (!pcCatalogCache) pcCatalogCache = buildModuleRarityBonusCatalog(PC_MODULE_ID)
  return pcCatalogCache
}

let flameBotStatCatalogCache: readonly CatalogEntry[] | null = null

function getFlameBotStatCatalog(): readonly CatalogEntry[] {
  if (!flameBotStatCatalogCache) {
    flameBotStatCatalogCache = buildBotStatPctCatalog('Flame Bot', FLAME_BOT_DAMAGE_REDUCTION_STAT)
  }
  return flameBotStatCatalogCache
}

export function buildDamageReductionCfReductionEntries(): readonly GameDropdownOptionEntry[] {
  if (cfReductionEntriesCache) return cfReductionEntriesCache

  const maxLevel = resolveResearchLabMaxLevel(CHRONO_FIELD_REDUCTION_LAB_SLUG)
  const entries: GameDropdownOptionEntry[] = []

  for (let level = 1; level <= maxLevel; level += 1) {
    const pct = resolveChronoFieldReductionPctFromLab(level)
    if (pct <= 0) continue
    entries.push({ value: pct, baseValue: level })
  }

  cfReductionEntriesCache = entries
  return entries
}

export function buildDamageReductionCfReductionOptionLabel(pct: number, _labLevel?: number): string {
  return `${Number(pct).toFixed(1)}%`
}

export function buildDamageReductionFlameBotEntries(_botBotBonusMultiplier = 0): readonly GameDropdownOptionEntry[] {
  if (!flameBotEntriesCache) {
    flameBotEntriesCache = getFlameBotStatCatalog().map(({ value, baseValue }) => ({ value, baseValue }))
  }
  return flameBotEntriesCache
}

export function buildDamageReductionFlameBotOptionLabel(
  pct: number,
  botBotBonusMultiplier = 0,
  _botLevel?: number,
): string {
  const value = Number(pct)
  const baseLabel = `${value}%`

  if (botBotBonusMultiplier <= 0) return baseLabel

  const effectiveReduction = resolveFlameBotEffectiveReductionPct({
    reductionPct: value,
    botBotBonusMultiplier,
  })
  return `${baseLabel} (${effectiveReduction.toFixed(2)}% eff)`
}

export function buildDamageReductionBotBonusEntries(): readonly GameDropdownOptionEntry[] {
  if (!botBonusEntriesCache) {
    botBonusEntriesCache = getBotBotBonusCatalog().map(({ value, baseValue }) => ({ value, baseValue }))
  }
  return botBonusEntriesCache
}

export function buildDamageReductionBotBonusOptionLabel(value: number): string {
  const match = getBotBotBonusCatalog().find(entry => entry.value === value)
  if (!match || match.value <= 0) return 'Disabled'
  return match.rawLabel ?? String(match.value)
}

export function buildDamageReductionNmpReductionEntries(): readonly GameDropdownOptionEntry[] {
  if (!nmpEntriesCache) {
    nmpEntriesCache = getNmpCatalog().map(({ value, baseValue }) => ({ value, baseValue }))
  }
  return nmpEntriesCache
}

export function buildDamageReductionNmpReductionOptionLabel(pct: number): string {
  return `${Number(pct)}%`
}

export function buildDamageReductionNmpOrbHitsEntries(): readonly GameDropdownOptionEntry[] {
  return Array.from({ length: 50 }, (_, index) => {
    const value = index + 1
    return { value, baseValue: value }
  })
}

export function buildDamageReductionNmpOrbHitsOptionLabel(hits: number): string {
  return String(Math.max(1, Math.min(50, Math.floor(Number(hits) || 1))))
}

export function buildDamageReductionPrimordialCollapseEntries(): readonly GameDropdownOptionEntry[] {
  if (!pcEntriesCache) {
    pcEntriesCache = getPcCatalog().map(({ value, baseValue }) => ({ value, baseValue }))
  }
  return pcEntriesCache
}

export function buildDamageReductionPrimordialCollapseOptionLabel(pct: number): string {
  return `${Number(pct)}%`
}

export function buildDamageReductionCtLevelEntries(): readonly GameDropdownOptionEntry[] {
  if (!ctLevelEntriesCache) {
    ctLevelEntriesCache = Array.from({ length: CHAIN_THUNDER_MAX_LEVEL }, (_, index) => {
      const level = index + 1
      return { value: level, baseValue: level }
    })
  }
  return ctLevelEntriesCache
}

export function buildDamageReductionCtLevelOptionLabel(level: number): string {
  const clamped = Math.max(1, Math.min(CHAIN_THUNDER_MAX_LEVEL, Math.floor(Number(level) || 1)))
  const maxPct = resolveChainThunderMaxReductionPct(clamped)
  const formatted = Number.isInteger(maxPct) ? String(maxPct) : maxPct.toFixed(1)
  return `${formatted}% max`
}

export function buildDamageReductionClPlusLevelEntries(): readonly GameDropdownOptionEntry[] {
  if (!clPlusEntriesCache) {
    clPlusEntriesCache = Array.from({ length: SMITE_DAMAGE_BY_CL_PLUS_LEVEL.length }, (_, level) => ({
      value: level,
      baseValue: level,
    }))
  }
  return clPlusEntriesCache
}

export function buildDamageReductionClPlusLevelOptionLabel(level: number): string {
  const maxLevel = SMITE_DAMAGE_BY_CL_PLUS_LEVEL.length - 1
  const clamped = Math.max(0, Math.min(maxLevel, Math.floor(Number(level) || 0)))
  const pct = chainLightningPlusDamageFraction(clamped) * 100
  return `${pct.toFixed(2)}%`
}

export function buildDamageReductionAvgClHitsEntries(): readonly GameDropdownOptionEntry[] {
  return Array.from({ length: 100 }, (_, index) => {
    const value = index + 1
    return { value, baseValue: value }
  })
}

export function buildDamageReductionAvgClHitsOptionLabel(hits: number): string {
  return String(Math.max(1, Math.min(100, Math.floor(Number(hits) || 1))))
}
