import { clampCampaignTier } from '../data/index'
import { evaluateDropdownOptions } from '../internal/game-input-data/dropdown-evaluator'
import { buildGuardianDefinitions } from '../data/index'
import { guardianUpgrades } from '../data/index'
import { findLabResearchBySlug } from '../data/index'
import { type LabProgressModifiers } from '../data/index'
import { computeResearchLabLevel } from '../data/index'
import type { SharedEnemyDropsInputs } from '../internal/enemy-drops-calcs-local-state'
import type { SharedLabsSettings } from '../internal/labs-persistence'
import type {
  SharedEnemyStatsCore,
  SharedLabsCalcByLab,
  SharedWorkshopStatLevels,
} from '../internal/shared-tool-inputs-extended'
import type { SharedUptimeInputs } from '../internal/shared-uptime-inputs'
import { getUptimeCoreStateFromSharedInputs } from '../internal/shared-uptime-inputs'
import {
  computeUptimeCycleWaveTimeSeconds,
  computeUptimePerWaveDurationSeconds,
} from './uptime-core'
import {
  computeBossWaveIntervalFromTier,
  type EnemyDropsSimulationInput,
} from './enemy-drops-simulation'

export function computeTierNumber(tierSelection: number | string): number {
  if (typeof tierSelection === 'number' && Number.isFinite(tierSelection)) {
    return clampCampaignTier(tierSelection)
  }
  const parsed = Number.parseInt(String(tierSelection).replace(/\D/g, ''), 10)
  return Number.isFinite(parsed) ? clampCampaignTier(parsed) : 1
}

const CELLS_PER_KILL_BONUS_KEY = 'cells_per_kill_bonus'

const ENEMY_DROPS_LAB_SLUGS = {
  commonDrop: 'common_drop_chance',
  rareDrop: 'rare_drop_chance',
  rerollShards: 'reroll_shards',
  shatterShards: 'shatter_shards',
  deathWaveCells: 'death_wave_cells_bonus',
} as const

export interface EnemyDropsCardLevels {
  enemyBalanceLevel: number
  enemyBalanceMastery: number
  waveSkipLevel: number
  waveSkipMastery: number
  waveAcceleratorLevel: number
  waveAcceleratorMastery: number
}

export interface EnemyDropsLinkedSources {
  enemyStatsCore: SharedEnemyStatsCore
  researchLabLevels: Record<string, number>
  labsCalcByLab: SharedLabsCalcByLab
  guardianLevels: Record<string, number[]>
  uptimeInputs: SharedUptimeInputs
  workshopStatLevels: SharedWorkshopStatLevels
  enemyDropsInputs: SharedEnemyDropsInputs
  cards?: Partial<EnemyDropsCardLevels>
}

export interface EnemyDropsRoiEconomyContext {
  labsEconomy: LabProgressModifiers
  workshopUtilityDiscountPct?: number
  workshopVaultDiscountPct?: number
}

function getGuardianSourceMinLevel(guardianKey: string): number {
  const upgrades = guardianUpgrades[guardianKey as keyof typeof guardianUpgrades]
  if (!upgrades?.length) return 0
  return Math.min(...upgrades.map(entry => Number(entry.level)).filter(Number.isFinite))
}

function normalizedGuardianLevelToSource(normalizedLevel: number | null | undefined, guardianKey: string): number | null {
  if (normalizedLevel == null || !Number.isFinite(normalizedLevel)) return null
  return Math.floor(Number(normalizedLevel) + getGuardianSourceMinLevel(guardianKey))
}

export function guardianSourceLevelToNormalized(sourceLevel: number, guardianKey: string): number {
  return Math.floor(sourceLevel - getGuardianSourceMinLevel(guardianKey))
}

function findGuardianStatIndex(guardianLabel: string, statName: string): number {
  const guardian = buildGuardianDefinitions().find(
    entry => entry.label === guardianLabel || entry.key === guardianLabel.toLowerCase(),
  )
  if (!guardian) return -1
  const normalizedTarget = statName.toLowerCase()
  return guardian.statOrder.findIndex(name => name.toLowerCase().includes(normalizedTarget))
}

function maxDefinedInt(...values: Array<number | null | undefined>): number {
  return values.reduce<number>((max, value) => {
    if (!Number.isFinite(value)) return max
    return Math.max(max, Math.floor(Number(value)))
  }, 0)
}

function readWorkshopEnhancementLevel(workshop: SharedWorkshopStatLevels, key: string): number {
  const value = workshop.enhancementLevels[key]
  return Number.isFinite(value) ? Math.floor(value) : 0
}

function resolveLabLevelFromSources(
  researchLabLevels: Record<string, number>,
  labsCalcByLab: SharedLabsCalcByLab,
  slug: string,
): number {
  const research = findLabResearchBySlug(slug)
  const maxLevel = research?.levelMax ?? 100
  const fromResearch = computeResearchLabLevel(researchLabLevels, slug, maxLevel)
  const calcKeys = [slug, research?.displayName, research?.slug].filter(
    (key): key is string => typeof key === 'string' && key.length > 0,
  )

  let fromCalc = 0
  for (const key of calcKeys) {
    const current = labsCalcByLab[key]?.current
    if (Number.isFinite(current)) {
      fromCalc = Math.max(fromCalc, Math.floor(current as number))
    }
  }

  return maxDefinedInt(fromResearch, fromCalc)
}

function resolveFetchGuardianLevels(guardianLevels: Record<string, number[]>): {
  fetchCooldownLevel: number
  fetchFindChanceLevel: number
  fetchDoubleFindLevel: number
} {
  const fetchLevels = guardianLevels.Fetch ?? guardianLevels.fetch ?? []
  const cdIndex = findGuardianStatIndex('Fetch', 'Cooldown')
  const findIndex = buildGuardianDefinitions()
    .find(entry => entry.key === 'fetch')
    ?.statOrder.findIndex(name => {
      const lower = name.toLowerCase()
      return lower.includes('find') && !lower.includes('double')
    }) ?? -1
  const doubleIndex = findGuardianStatIndex('Fetch', 'Double Find')

  const cdFromGuardian = cdIndex >= 0
    ? normalizedGuardianLevelToSource(fetchLevels[cdIndex], 'fetch')
    : null
  const findFromGuardian = findIndex >= 0
    ? normalizedGuardianLevelToSource(fetchLevels[findIndex], 'fetch')
    : null
  const doubleFromGuardian = doubleIndex >= 0
    ? normalizedGuardianLevelToSource(fetchLevels[doubleIndex], 'fetch')
    : null

  return {
    fetchCooldownLevel: cdFromGuardian ?? 1,
    fetchFindChanceLevel: findFromGuardian ?? 1,
    fetchDoubleFindLevel: doubleFromGuardian ?? 1,
  }
}

/** Map Wave Accelerator card game level (1–7) to uptime WA tier (cooldown reduction index). */
export function computeWaLevelFromCardLevel(cardLevel: number): number {
  return Math.min(7, clampCardGameLevel(cardLevel, 1))
}

/** Per-wave cycle seconds for fetch timing — 26s combat + WA-reduced inter-wave cooldown. */
export function computeWaveTimeSecondsFromUptime(uptime: SharedUptimeInputs): number {
  const state = getUptimeCoreStateFromSharedInputs(uptime)
  return computeUptimePerWaveDurationSeconds(state)
}

/** Per-wave cycle seconds from Wave Accelerator card level only. */
export function computeWaveTimeSecondsFromWaCard(cardLevel: number): number {
  return computeWaveTimeSecondsFromUptime({ waLevel: computeWaLevelFromCardLevel(cardLevel) })
}

/** Uptime calculator cycle wave time (same as uptime table "Wave Time" column). */
export function computeUptimeWaveTime(uptime: SharedUptimeInputs): number {
  const state = getUptimeCoreStateFromSharedInputs(uptime)
  return computeUptimeCycleWaveTimeSeconds(state)
}

export function clampCardGameLevel(level: number | undefined, fallback = 1): number {
  const parsed = Number.isFinite(level) ? Math.floor(Number(level)) : fallback
  if (parsed <= 0) return 1
  return Math.min(7, Math.max(1, parsed))
}

export function clampCardMasteryLevel(level: number | undefined, fallback = 0): number {
  const parsed = Number.isFinite(level) ? Math.floor(Number(level)) : fallback
  return Math.min(9, Math.max(0, parsed))
}

export function buildCardLevelSelectItems(): Array<{ title: string; value: number }> {
  return evaluateDropdownOptions('card_game_level', {}).map(option => ({
    title: option.label,
    value: option.value,
  }))
}

export function buildCardMasterySelectItems(): Array<{ title: string; value: number }> {
  return evaluateDropdownOptions('card_mastery', {}).map(option => ({
    title: option.label,
    value: option.value,
  }))
}

export function buildEnemyDropsLabLevelSelectItems(slug: string): Array<{ title: string; value: number }> {
  return evaluateDropdownOptions('research_lab_level', { researchLabSlug: slug }).map(option => ({
    title: option.label,
    value: option.value,
  }))
}

export function buildWorkshopEnhancementLevelSelectItems(enhancementKey: string): Array<{ title: string; value: number }> {
  return evaluateDropdownOptions('workshop_enhancement_level', { workshopEnhancementKey: enhancementKey }).map(option => ({
    title: option.label,
    value: option.value,
  }))
}

export function labsEconomyToProgressModifiers(settings: SharedLabsSettings): LabProgressModifiers {
  return {
    labSpeed: Number(settings.labSpeed) || 0,
    labRelic: Number(settings.labRelic) || 0,
    labDiscount: Number(settings.labDiscount) || 0,
    speedUp: Math.max(1, Number(settings.speedUp) || 1),
    gemDiscount: Number(settings.gemDiscount) || 0,
  }
}

export function assembleEnemyDropsSimulationInput(sources: EnemyDropsLinkedSources): EnemyDropsSimulationInput {
  const {
    enemyStatsCore,
    researchLabLevels,
    labsCalcByLab,
    guardianLevels,
    workshopStatLevels,
    enemyDropsInputs,
    cards,
  } = sources

  const fetchLevels = resolveFetchGuardianLevels(guardianLevels)
  const tier = computeTierNumber(enemyStatsCore.tierSelection)
  const waCardLevel = clampCardGameLevel(cards?.waveAcceleratorLevel, 1)

  return {
    tier,
    targetWave: maxDefinedInt(enemyStatsCore.wave, 1) || 1,
    enemyBalanceCardLevel: clampCardGameLevel(cards?.enemyBalanceLevel, 1),
    enemyBalanceMasteryLevel: clampCardMasteryLevel(cards?.enemyBalanceMastery, 0),
    waveSkipCardLevel: clampCardGameLevel(cards?.waveSkipLevel, 1),
    waveSkipMasteryLevel: clampCardMasteryLevel(cards?.waveSkipMastery, 0),
    commonDropLabLevel: resolveLabLevelFromSources(researchLabLevels, labsCalcByLab, ENEMY_DROPS_LAB_SLUGS.commonDrop),
    rareDropLabLevel: resolveLabLevelFromSources(researchLabLevels, labsCalcByLab, ENEMY_DROPS_LAB_SLUGS.rareDrop),
    rerollShardsLabLevel: resolveLabLevelFromSources(researchLabLevels, labsCalcByLab, ENEMY_DROPS_LAB_SLUGS.rerollShards),
    shatterShardsLabLevel: resolveLabLevelFromSources(researchLabLevels, labsCalcByLab, ENEMY_DROPS_LAB_SLUGS.shatterShards),
    deathWaveCellsBonusLevel: resolveLabLevelFromSources(researchLabLevels, labsCalcByLab, ENEMY_DROPS_LAB_SLUGS.deathWaveCells),
    cellsPerKillBonusLevel: readWorkshopEnhancementLevel(workshopStatLevels, CELLS_PER_KILL_BONUS_KEY),
    shatterCommonModules: enemyDropsInputs.shatterCommonModules,
    shatterRareModules: enemyDropsInputs.shatterRareModules,
    fetchCooldownLevel: fetchLevels.fetchCooldownLevel,
    fetchFindChanceLevel: fetchLevels.fetchFindChanceLevel,
    fetchDoubleFindLevel: fetchLevels.fetchDoubleFindLevel,
    wavesPerBoss: computeBossWaveIntervalFromTier(tier),
    averageWaveSeconds: computeWaveTimeSecondsFromWaCard(waCardLevel),
  }
}

export function getEnemyDropsLabSlugKeys() {
  return { ...ENEMY_DROPS_LAB_SLUGS }
}

export {
  CELLS_PER_KILL_BONUS_KEY,
  getGuardianSourceMinLevel,
  normalizedGuardianLevelToSource,
}
