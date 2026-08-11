import { CARD_TEMPLATES, type CardTemplate } from '../data/index'
import { MAX_CAMPAIGN_TIER } from '../data/index'
import { findLabResearchBySlug } from '../data/index'
import {
  getSharedToolLabs,
  computeLabValueAtLevel,
  type ToolLabRecord,
} from '../data/index'
import {
  buildUwStatLevelEntries,
  parseUwStatNumericValue,
  findUwStatSpec,
} from '../internal/game-input-data/uw-stat-dropdown-math'
import { BOT_UPGRADES_DATA } from '../data/index'
import { WORKSHOP_DATA } from '../data/index'
import { empiricalTierCoinMultiplier } from './wave-base-empirical-scaling'
import {
  buildWaveContext,
  type EnemyDropsSimulationInput,
  WAVE_SKIP_SKIPPED_WAVE_MULT,
  waveSkipResourceMultiplier,
} from './enemy-drops-simulation'
import { clamp } from './math'
import {
  computeUptimeRatio,
  computeDurations,
  computeEffectiveCooldowns,
  type UptimeCoreState,
} from '../internal/uptime-core'
import {
  enemySpawnRateCapFromWaveAcceleratorChart,
  findWaveAcceleratorMasteryForSpawnCap,
  waveAcceleratorSpawnRateChartColumn,
} from './wave-accelerator-spawn-rate-cap'
import { WAVE_ACCELERATOR_SPAWN_RATE_ROWS } from '../data/chart-tables'
import { computePackCoinMultFromIapToggles, type ResourceDropsCoinIapToggles } from './resource-drops-coin-iap'
import { allCoinBonusesPerkMult } from './resource-drops-coin-perks'
import {
  estimateFetchCoinsFromRunCpm,
  estimateRunDurationMinutes,
} from './resource-drops-coin-fetch'
import {
  introSprintZeroCoinFraction,
} from './resource-drops-coin-intro-sprint'
import { coinTradeOffPerkMult } from './resource-drops-coin-trade-off'

/** Approximate average enemy coin weight vs basic (fast/ranged 2×, tank 4× mix). */
export const RESOURCE_DROPS_AVG_ENEMY_COIN_WEIGHT = 1.15

export const COIN_BONUS_ENHANCEMENT_KEY = 'coin_bonus'
export const COINS_KILL_WORKSHOP_KEY = 'Coins / Kill Bonus'
export const COINS_WAVE_WORKSHOP_KEY = 'Coins / Wave'

export const RESOURCE_DROPS_COIN_LAB_SLUGS = {
  coinsKill: 'coins_kill_bonus',
  coinsWave: 'coins_per_wave',
  gtBonus: 'golden_tower_bonus',
  bhCoin: 'black_hole_coin_bonus',
  dwCoin: 'death_wave_coin_bonus',
  slCoin: 'spotlight_coin_bonus',
} as const

export interface ResourceDropsCoinEconomyInputs {
  coinsKillWorkshopLevel: number
  coinsWaveWorkshopLevel: number
  coinBonusEnhancementLevel: number
  coinsKillLabLevel: number
  coinsWaveLabLevel: number
  gtBonusLabLevel: number
  bhCoinLabLevel: number
  dwCoinLabLevel: number
  slCoinLabLevel: number
  coinsCardLevel: number
  coinsCardMastery: number
  /** Collective theme passive bonus % (additive in multiplier menu). */
  themeCoinBonusPct: number
  relicCoinBonusPct: number
  iapToggles: ResourceDropsCoinIapToggles
  moduleCoinsKillBonus: number
  vaultCoinskillLevel: number
  allCoinPerkLevel: number
  standardPerkBonusPct: number
  hasCoinTradeOffPerk: boolean
  improveTradeOffLabPct: number
  introSprintZeroCoinWaveCap: number
  /** BHD temporary CPK bonus % (already scaled by expected free upgrades). */
  bhdCpkBonusPct: number
  gtPlusLevel: number
  goldenBotCoverageFraction: number
  goldenBotBonusLevel: number
  useGoldenBotCoinBonus: boolean
  assumeSyncedUwCoinWindows: boolean
}

export interface ResourceDropsCoinUwLevels {
  gtMultiplierLevel: number
  gtCdLevel: number
  gtDurLevel: number
  gtCdLab: number
  gtDurLab: number
  bhCdLevel: number
  bhDurLevel: number
  bhCdLab: number
  bhDurLab: number
  dwCdLevel: number
  dwQtyLevel: number
  slCdLevel: number
  slQtyLevel: number
  slAngleLevel: number
}

export interface ResourceDropsCoinBotLevels {
  gbBonusLevel: number
  gbCdLevel: number
  gbDurLevel: number
  gbCdLab: number
  gbDurLab: number
}

export interface ResourceDropsCoinSimulationInput extends EnemyDropsSimulationInput, ResourceDropsCoinEconomyInputs {
  waveAcceleratorMasteryLevel: number
  uwLevels: ResourceDropsCoinUwLevels
  botLevels: ResourceDropsCoinBotLevels
  uptime: UptimeCoreState | null
}

export interface ResourceDropsCoinMultiplierBreakdown {
  tierCoinMult: number
  coinBonusEnhancementMult: number
  coinsCardMult: number
  themeMult: number
  relicMult: number
  packMult: number
  perkCoinMult: number
  tradeOffCoinMult: number
  introSprintCoinFraction: number
  bhdCpkBonusPct: number
  gtPlusMult: number
  goldenBotRangeFraction: number
  workshopCoinsKillMult: number
  coinsKillLabMult: number
  moduleCoinsKillBonus: number
  vaultCoinskillMult: number
  /** Kill-path global stack excluding timed UW/bot bursts. */
  baselineKillMult: number
  /** Flat per-wave payout multiplier (CPW path). */
  coinsPerWaveMult: number
  waveSkipMult: number
  goldenBotMult: number
  gtCoinMult: number
  bhCoinMult: number
  dwCoinMult: number
  slCoinMult: number
  gtUptimeRatio: number
  bhUptimeRatio: number
  dwUptimeRatio: number
  slUptimeRatio: number
  gbUptimeRatio: number
  /** Expected timed burst multiplier on kill coins. */
  expectedTimedKillMult: number
}

export interface ResourceDropsCoinYieldBreakdown {
  coinsFromKills: number
  coinsFromKillsWaveSkipBonus: number
  coinsFromWavePayout: number
  coinsFromWavePayoutWaveSkipBonus: number
  coinsFromFetch: number
  totalCoins: number
}

export interface ResourceDropsCoinSimulationResult {
  multipliers: ResourceDropsCoinMultiplierBreakdown
  coins: ResourceDropsCoinYieldBreakdown
  totalKillsEstimated: number
  averageCoinsPerKill: number
  averageCoinsPerWave: number
}

const EMPTY_RESOURCE_DROPS_COIN_MULTIPLIERS: ResourceDropsCoinMultiplierBreakdown = {
  tierCoinMult: 1,
  coinBonusEnhancementMult: 1,
  coinsCardMult: 1,
  themeMult: 1,
  relicMult: 1,
  packMult: 1,
  perkCoinMult: 1,
  tradeOffCoinMult: 1,
  introSprintCoinFraction: 1,
  bhdCpkBonusPct: 0,
  gtPlusMult: 1,
  goldenBotRangeFraction: 0,
  workshopCoinsKillMult: 1,
  coinsKillLabMult: 1,
  moduleCoinsKillBonus: 0,
  vaultCoinskillMult: 1,
  baselineKillMult: 1,
  coinsPerWaveMult: 0,
  waveSkipMult: 1,
  goldenBotMult: 1,
  gtCoinMult: 1,
  bhCoinMult: 1,
  dwCoinMult: 1,
  slCoinMult: 1,
  gtUptimeRatio: 0,
  bhUptimeRatio: 0,
  dwUptimeRatio: 0,
  slUptimeRatio: 0,
  gbUptimeRatio: 0,
  expectedTimedKillMult: 1,
}

export function emptyResourceDropsCoinSimulationResult(): ResourceDropsCoinSimulationResult {
  return {
    multipliers: { ...EMPTY_RESOURCE_DROPS_COIN_MULTIPLIERS },
    coins: {
      coinsFromKills: 0,
      coinsFromKillsWaveSkipBonus: 0,
      coinsFromWavePayout: 0,
      coinsFromWavePayoutWaveSkipBonus: 0,
      coinsFromFetch: 0,
      totalCoins: 0,
    },
    totalKillsEstimated: 0,
    averageCoinsPerKill: 0,
    averageCoinsPerWave: 0,
  }
}

function findCard(cardId: string): CardTemplate | undefined {
  return CARD_TEMPLATES.find(entry => entry.id === cardId)
}

function cardLevelIndex(gameLevel: number): number {
  return clamp(Math.floor(gameLevel) - 1, 0, 6)
}

function cardLevelMulti(cardId: string, gameLevel: number): number {
  const card = findCard(cardId)
  if (!card || card.levelType !== 'multi') return 1
  const idx = cardLevelIndex(gameLevel)
  const raw = card.levelValues[idx]
  return typeof raw === 'number' ? raw : 1
}

function cardMasteryMulti(cardId: string, gameLevel: number, masteryLevel: number): number {
  const card = findCard(cardId)
  if (!card?.masteryValues?.length || gameLevel < 7) return 1
  const idx = clamp(Math.floor(masteryLevel), 0, card.masteryValues.length - 1)
  const raw = card.masteryValues[idx]
  return typeof raw === 'number' ? raw : 1
}

function cardLevelPercent(cardId: string, gameLevel: number): number {
  const card = findCard(cardId)
  if (!card || card.levelType !== 'percent') return 0
  const idx = cardLevelIndex(gameLevel)
  const raw = card.levelValues[idx]
  return typeof raw === 'number' ? raw / 100 : 0
}

function readWorkshopUtilityValue(key: string, level: number): number {
  const row = WORKSHOP_DATA[key]
  if (!row) return 1
  const clamped = Math.max(0, Math.floor(level))
  const keys = Object.keys(row).map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  const resolved = keys.reduce((chosen, candidate) => (candidate <= clamped ? candidate : chosen), keys[0] ?? 0)
  return row[String(resolved)]?.value ?? 1
}

export function coinBonusEnhancementMult(level: number): number {
  const L = clamp(Math.floor(level), 0, 200)
  return 1 + L * 0.01
}

export function vaultCoinskillMult(level: number): number {
  const L = clamp(Math.floor(level), 0, 3)
  return 1 + L * 0.05
}

export function themePassiveCoinMultFromBonusPct(themeCoinBonusPct: number): number {
  const pct = Math.max(0, Number(themeCoinBonusPct) || 0)
  return 1 + pct / 100
}

/** @deprecated Prefer {@link themePassiveCoinMultFromBonusPct}. Per-category counts for legacy tests. */
export function themePassiveCoinMult(input: Pick<
  ResourceDropsCoinEconomyInputs,
  'themeCoinBonusPct'
> & Partial<{
  towerThemesOwned: number
  backgroundThemesOwned: number
  menuThemesOwned: number
  guardianThemesOwned: number
}>): number {
  if (input.themeCoinBonusPct != null && Number.isFinite(input.themeCoinBonusPct)) {
    return themePassiveCoinMultFromBonusPct(input.themeCoinBonusPct)
  }
  const tower = Math.max(0, Math.floor(input.towerThemesOwned ?? 0))
  const background = Math.max(0, Math.floor(input.backgroundThemesOwned ?? 0))
  const menu = Math.max(0, Math.floor(input.menuThemesOwned ?? 0))
  const guardian = Math.max(0, Math.floor(input.guardianThemesOwned ?? 0))
  return 1 + tower * 0.004 + background * 0.008 + menu * 0.006 + guardian * 0.006
}

function findLabRecordBySlug(slug: string): ToolLabRecord | undefined {
  const research = findLabResearchBySlug(slug)
  if (!research) return undefined
  return getSharedToolLabs().find(lab => lab.name === slug || lab.name === research.slug)
}

export function computeLabCoinMultiplier(slug: string, level: number): number {
  const lab = findLabRecordBySlug(slug)
  if (!lab || level <= 0) return slug === RESOURCE_DROPS_COIN_LAB_SLUGS.gtBonus ? 0 : 1
  return computeLabValueAtLevel(lab, Math.floor(level))
}

function uwStoneStatMult(weaponName: string, statName: string, level: number): number {
  const spec = findUwStatSpec(weaponName, statName)
  if (!spec) return 1
  const entries = buildUwStatLevelEntries(spec)
  const clamped = Math.max(0, Math.floor(level))
  const match = entries.find(entry => entry.value === clamped)
  if (match) return Math.max(1, match.baseValue)
  const last = entries[entries.length - 1]
  return Math.max(1, last?.baseValue ?? 1)
}

export function computeGoldenTowerCoinMult(stoneMultiplierLevel: number, gtBonusLabLevel: number): number {
  const stoneMult = uwStoneStatMult('Golden Tower', 'Multiplier', stoneMultiplierLevel)
  const labBonus = computeLabCoinMultiplier(RESOURCE_DROPS_COIN_LAB_SLUGS.gtBonus, gtBonusLabLevel)
  return stoneMult + labBonus
}

export function computePackCoinMult(toggles: ResourceDropsCoinIapToggles): number {
  return computePackCoinMultFromIapToggles(toggles)
}

/** Golden Tower+ combo bonus — `(1 + 0.0003 × (level + 1))^kills − 1`, distributed as a run multiplier. */
export function goldenTowerPlusCoinMult(gtPlusLevel: number, avgKillsPerGtWindow: number): number {
  const level = Math.max(0, Math.floor(Number(gtPlusLevel) || 0))
  const kills = Math.max(0, Number(avgKillsPerGtWindow) || 0)
  if (level <= 0 || kills <= 0) return 1
  const rate = 0.0003 * (level + 1)
  return 1 + (Math.pow(1 + rate, kills) - 1)
}

export function goldenBotRangeCoverageFraction(towerRange: number, botRange: number): number {
  const tower = Math.max(0, Number(towerRange) || 0)
  const bot = Math.max(0, Number(botRange) || 0)
  if (tower <= 0 || bot <= 0) return 1
  return Math.min(1, bot / tower)
}

function parseBotStatMultiplier(botName: string, statName: string, level: number): number {
  const bot = BOT_UPGRADES_DATA.find(entry => entry.name === botName || entry.label === botName)
  if (!bot) return 1
  const stat = bot.stats[statName as keyof typeof bot.stats]
  if (!stat) return 1
  const raw = stat.levels[level as keyof typeof stat.levels] ?? stat.base
  const parsed = parseUwStatNumericValue(String(raw))
  return parsed > 0 ? parsed : 1
}

function parseBotStatSeconds(botName: string, statName: string, level: number): number {
  const bot = BOT_UPGRADES_DATA.find(entry => entry.name === botName || entry.label === botName)
  if (!bot) return 0
  const stat = bot.stats[statName as keyof typeof bot.stats]
  if (!stat) return 0
  const raw = stat.levels[level as keyof typeof stat.levels] ?? stat.base
  return parseUwStatNumericValue(String(raw))
}

function resolveUwUptimeRatios(
  uptime: UptimeCoreState | null,
): Pick<ResourceDropsCoinMultiplierBreakdown, 'gtUptimeRatio' | 'bhUptimeRatio' | 'dwUptimeRatio' | 'slUptimeRatio' | 'gbUptimeRatio'> {
  if (!uptime) {
    return {
      gtUptimeRatio: 0,
      bhUptimeRatio: 0,
      dwUptimeRatio: 0,
      slUptimeRatio: 0,
      gbUptimeRatio: 0,
    }
  }

  const cds = computeEffectiveCooldowns(uptime)
  const durations = computeDurations(uptime)

  const gtUptimeRatio = computeUptimeRatio(durations.gt, cds.gt)
  const bhUptimeRatio = computeUptimeRatio(durations.bh, cds.bh)
  const dwUptimeRatio = computeUptimeRatio(durations.dw, cds.dw)
  const slUptimeRatio = clamp(durations.sl / 100, 0, 1)
  const gbCd = parseBotStatSeconds('Golden Bot', 'Cooldown', uptime.gbCdLevel ?? 0)
  const gbDur = parseBotStatSeconds('Golden Bot', 'Duration', uptime.gbDurLevel ?? 0)
  const gbUptimeRatio = computeUptimeRatio(gbDur, gbCd)

  return {
    gtUptimeRatio,
    bhUptimeRatio,
    dwUptimeRatio,
    slUptimeRatio,
    gbUptimeRatio,
  }
}

/**
 * Expected multiplicative boost from timed coin sources (UW + Golden Bot).
 * When `assumeSynced`, overlapping uptime uses the product of active mults in the overlap window.
 */
export function expectedTimedCoinKillMult(
  mults: Pick<ResourceDropsCoinMultiplierBreakdown,
    | 'gtCoinMult'
    | 'bhCoinMult'
    | 'dwCoinMult'
    | 'slCoinMult'
    | 'goldenBotMult'
    | 'gtUptimeRatio'
    | 'bhUptimeRatio'
    | 'dwUptimeRatio'
    | 'slUptimeRatio'
    | 'gbUptimeRatio'
  >,
  assumeSynced: boolean,
): number {
  const entries = [
    { mult: mults.gtCoinMult, uptime: mults.gtUptimeRatio },
    { mult: mults.bhCoinMult, uptime: mults.bhUptimeRatio },
    { mult: mults.dwCoinMult, uptime: mults.dwUptimeRatio },
    { mult: mults.slCoinMult, uptime: mults.slUptimeRatio },
    { mult: mults.goldenBotMult, uptime: mults.gbUptimeRatio },
  ].filter(entry => entry.mult > 1 && entry.uptime > 0)

  if (entries.length === 0) return 1

  if (assumeSynced) {
    const overlap = entries.reduce((min, entry) => Math.min(min, entry.uptime), 1)
    const unsyncedContribution = entries.reduce((sum, entry) => {
      const solo = Math.max(0, entry.uptime - overlap)
      return sum + solo * (entry.mult - 1)
    }, 0)
    const overlapMult = entries.reduce((product, entry) => product * entry.mult, 1)
    return 1 + overlap * (overlapMult - 1) + unsyncedContribution
  }

  return entries.reduce((total, entry) => total + entry.uptime * (entry.mult - 1), 1)
}

export function buildResourceDropsCoinMultipliers(
  input: ResourceDropsCoinSimulationInput,
): ResourceDropsCoinMultiplierBreakdown {
  const tier = clamp(Math.floor(input.tier), 1, MAX_CAMPAIGN_TIER)
  const tierCoinMult = empiricalTierCoinMultiplier(tier)
  const coinBonusEnhancement = coinBonusEnhancementMult(input.coinBonusEnhancementLevel)
  const coinsCardMult = cardLevelMulti('coins', input.coinsCardLevel)
    * cardMasteryMulti('coins', input.coinsCardLevel, input.coinsCardMastery)
  const themeMult = themePassiveCoinMult(input)
  const relicMult = 1 + Math.max(0, Number(input.relicCoinBonusPct) || 0) / 100
  const packMult = computePackCoinMult(input.iapToggles)
  const tradeOffCoinMult = coinTradeOffPerkMult(input.hasCoinTradeOffPerk, input.improveTradeOffLabPct)
  const perkCoinMult = allCoinBonusesPerkMult(input.allCoinPerkLevel, input.standardPerkBonusPct)
  const workshopCoinsKillMult = readWorkshopUtilityValue(COINS_KILL_WORKSHOP_KEY, input.coinsKillWorkshopLevel)
  const coinsKillLabMult = computeLabCoinMultiplier(RESOURCE_DROPS_COIN_LAB_SLUGS.coinsKill, input.coinsKillLabLevel)
  const moduleBonus = Math.max(0, Number(input.moduleCoinsKillBonus) || 0)
  const bhdBonusPct = Math.max(0, Number(input.bhdCpkBonusPct) || 0)
  const vaultMult = vaultCoinskillMult(input.vaultCoinskillLevel)

  const globalMult = tierCoinMult
    * coinBonusEnhancement
    * coinsCardMult
    * themeMult
    * relicMult
    * packMult
    * perkCoinMult
    * tradeOffCoinMult

  const cpkCore = (workshopCoinsKillMult * coinsKillLabMult + moduleBonus) * vaultMult
  const bhdMult = bhdBonusPct > 0 ? 1 + bhdBonusPct / 100 : 1
  const baselineKillMult = globalMult * coinBonusEnhancement * cpkCore * bhdMult

  const coinsWaveLabMult = computeLabCoinMultiplier(RESOURCE_DROPS_COIN_LAB_SLUGS.coinsWave, input.coinsWaveLabLevel)
  const cpwWorkshop = readWorkshopUtilityValue(COINS_WAVE_WORKSHOP_KEY, input.coinsWaveWorkshopLevel)
  const coinsPerWaveMult = cpwWorkshop * globalMult * coinsWaveLabMult

  const skipChance = cardLevelPercent('ws', input.waveSkipCardLevel)
  const waveSkipMult = waveSkipResourceMultiplier(skipChance, buildWaveContext(input).waveSkipExpectedSkipsPerProc)
  const introSprintCoinFraction = 1 - introSprintZeroCoinFraction(
    input.introSprintZeroCoinWaveCap,
    input.targetWave,
  )

  const gtCoinMult = computeGoldenTowerCoinMult(input.uwLevels.gtMultiplierLevel, input.gtBonusLabLevel)
  const bhCoinMult = computeLabCoinMultiplier(RESOURCE_DROPS_COIN_LAB_SLUGS.bhCoin, input.bhCoinLabLevel)
  const dwCoinMult = computeLabCoinMultiplier(RESOURCE_DROPS_COIN_LAB_SLUGS.dwCoin, input.dwCoinLabLevel)
  const slCoinMult = computeLabCoinMultiplier(RESOURCE_DROPS_COIN_LAB_SLUGS.slCoin, input.slCoinLabLevel)

  const goldenBotBase = input.useGoldenBotCoinBonus
    ? parseBotStatMultiplier('Golden Bot', 'Bonus', input.goldenBotBonusLevel)
    : 1
  const gbRangeFraction = Math.min(1, Math.max(0, Number(input.goldenBotCoverageFraction) || 0))
  const goldenBotMult = gbRangeFraction > 0 && goldenBotBase > 1
    ? 1 + gbRangeFraction * (goldenBotBase - 1)
    : 1

  const uptimeRatios = resolveUwUptimeRatios(input.uptime)
  const avgKillsPerGt = estimateKillsDuringGoldenTowerWindow(input, uptimeRatios.gtUptimeRatio)
  const gtPlusMult = goldenTowerPlusCoinMult(input.gtPlusLevel, avgKillsPerGt)
  const expectedTimedKillMult = expectedTimedCoinKillMult(
    {
      gtCoinMult,
      bhCoinMult,
      dwCoinMult,
      slCoinMult,
      goldenBotMult,
      ...uptimeRatios,
    },
    input.assumeSyncedUwCoinWindows,
  ) * gtPlusMult

  return {
    tierCoinMult,
    coinBonusEnhancementMult: coinBonusEnhancement,
    coinsCardMult,
    themeMult,
    relicMult,
    packMult,
    perkCoinMult,
    tradeOffCoinMult,
    introSprintCoinFraction,
    bhdCpkBonusPct: bhdBonusPct,
    gtPlusMult,
    goldenBotRangeFraction: gbRangeFraction,
    workshopCoinsKillMult,
    coinsKillLabMult,
    moduleCoinsKillBonus: moduleBonus,
    vaultCoinskillMult: vaultMult,
    baselineKillMult,
    coinsPerWaveMult,
    waveSkipMult,
    goldenBotMult,
    gtCoinMult,
    bhCoinMult,
    dwCoinMult,
    slCoinMult,
    ...uptimeRatios,
    expectedTimedKillMult,
  }
}

function estimateKillsDuringGoldenTowerWindow(
  input: ResourceDropsCoinSimulationInput,
  gtUptimeRatio: number,
): number {
  if (!input.uptime || gtUptimeRatio <= 0) return 0
  const ctx = buildWaveContext(input)
  const waMastery = findWaveAcceleratorMasteryForSpawnCap(input.waveAcceleratorMasteryLevel)
  const midWave = Math.max(1, Math.floor(ctx.targetWave / 2))
  const killsPerWave = killsPerWaveAt(midWave, ctx.enemyBalanceMult, waMastery)
  const gtDur = computeDurations(input.uptime).gt
  const waveSeconds = Math.max(1, Number(input.averageWaveSeconds) || 30)
  return killsPerWave * (gtDur / waveSeconds)
}

function killsPerWaveAt(
  wave: number,
  enemyBalanceMult: number,
  waveAcceleratorMastery: number | null,
): number {
  const cap = enemySpawnRateCapFromWaveAcceleratorChart({
    wave,
    waveAcceleratorMastery,
  })
  return cap * enemyBalanceMult
}

function sumWaveIndexRange(wStart: number, wEnd: number): number {
  if (wEnd < wStart) return 0
  const count = wEnd - wStart + 1
  return ((wStart + wEnd) * count) / 2
}

function spawnRateThresholdForRow(
  row: (typeof WAVE_ACCELERATOR_SPAWN_RATE_ROWS)[number],
  column: ReturnType<typeof waveAcceleratorSpawnRateChartColumn>,
): number {
  const value = row[column]
  return typeof value === 'number' ? value : Number.POSITIVE_INFINITY
}

/** Segment-wise kill/coin totals — O(chart rows) instead of O(targetWave). */
export function accumulateResourceDropsKillYields(input: {
  targetWave: number
  enemyBalanceMult: number
  waveAcceleratorMastery: number | null
  introSprintZeroCoinWaveCap: number
}): { totalKills: number; rawKillCoins: number } {
  const targetWave = Math.max(1, Math.floor(Number(input.targetWave) || 1))
  const enemyBalanceMult = Math.max(0, Number(input.enemyBalanceMult) || 0)
  const waMastery = input.waveAcceleratorMastery
  const introCap = Math.max(0, Math.floor(Number(input.introSprintZeroCoinWaveCap) || 0))

  let totalKills = 0
  let rawKillCoins = 0

  const column = waveAcceleratorSpawnRateChartColumn(waMastery)
  const rows = WAVE_ACCELERATOR_SPAWN_RATE_ROWS
  const firstRow = rows[0]
  const firstThreshold = firstRow ? spawnRateThresholdForRow(firstRow, column) : 1

  const linearEnd = Math.min(targetWave, Math.max(0, firstThreshold - 1))
  for (let wave = 1; wave <= linearEnd; wave += 1) {
    const kills = killsPerWaveAt(wave, enemyBalanceMult, waMastery)
    totalKills += kills
    if (wave <= introCap) continue
    rawKillCoins += kills * wave * RESOURCE_DROPS_AVG_ENEMY_COIN_WEIGHT
  }

  if (targetWave <= linearEnd || !rows.length) {
    return { totalKills, rawKillCoins }
  }

  const accumulateSegment = (wStart: number, wEnd: number, spawnCap: number) => {
    if (wEnd < wStart) return
    const killsPerWave = spawnCap * enemyBalanceMult
    const waveCount = wEnd - wStart + 1
    totalKills += killsPerWave * waveCount
    const coinStart = Math.max(wStart, introCap + 1)
    if (coinStart > wEnd) return
    rawKillCoins += killsPerWave * RESOURCE_DROPS_AVG_ENEMY_COIN_WEIGHT * sumWaveIndexRange(coinStart, wEnd)
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    const threshold = spawnRateThresholdForRow(row, column)
    const nextThreshold = index + 1 < rows.length
      ? spawnRateThresholdForRow(rows[index + 1], column)
      : Number.POSITIVE_INFINITY
    const segStart = Math.max(threshold, linearEnd + 1)
    const segEnd = Math.min(targetWave, nextThreshold - 1)
    accumulateSegment(segStart, segEnd, row.spawnCount)
    if (targetWave < nextThreshold) {
      return { totalKills, rawKillCoins }
    }
  }

  const lastRow = rows[rows.length - 1]
  const lastThreshold = spawnRateThresholdForRow(lastRow, column)
  accumulateSegment(Math.max(lastThreshold, linearEnd + 1), targetWave, lastRow.spawnCount)

  return { totalKills, rawKillCoins }
}

export function simulateResourceDropsCoins(
  input: ResourceDropsCoinSimulationInput,
): ResourceDropsCoinSimulationResult {
  const ctx = buildWaveContext(input)
  const multipliers = buildResourceDropsCoinMultipliers(input)
  const targetWave = ctx.targetWave
  const waMastery = findWaveAcceleratorMasteryForSpawnCap(input.waveAcceleratorMasteryLevel)

  const introCap = Math.max(0, Math.floor(Number(input.introSprintZeroCoinWaveCap) || 0))
  const { totalKills, rawKillCoins } = accumulateResourceDropsKillYields({
    targetWave,
    enemyBalanceMult: ctx.enemyBalanceMult,
    waveAcceleratorMastery: waMastery,
    introSprintZeroCoinWaveCap: introCap,
  })

  const killStack = multipliers.baselineKillMult * multipliers.expectedTimedKillMult
  const coinsFromKills = rawKillCoins * killStack
  const coinsFromKillsWaveSkipBonus = coinsFromKills * (multipliers.waveSkipMult - 1)

  const coinableWaves = Math.max(0, targetWave - introCap)
  const rawWavePayout = coinableWaves * multipliers.coinsPerWaveMult
  const coinsFromWavePayout = rawWavePayout
  const coinsFromWavePayoutWaveSkipBonus = rawWavePayout * (multipliers.waveSkipMult - 1)

  const preFetchTotal = (coinsFromKills + coinsFromKillsWaveSkipBonus)
    + (coinsFromWavePayout + coinsFromWavePayoutWaveSkipBonus)

  const runMinutes = estimateRunDurationMinutes(targetWave, input.averageWaveSeconds)
  const coinsFromFetch = estimateFetchCoinsFromRunCpm({
    enemyDrops: input,
    runCoinTotalBeforeFetch: preFetchTotal,
    runDurationMinutes: runMinutes,
  })

  const totalCoins = preFetchTotal + coinsFromFetch

  return {
    multipliers,
    coins: {
      coinsFromKills,
      coinsFromKillsWaveSkipBonus,
      coinsFromWavePayout,
      coinsFromWavePayoutWaveSkipBonus,
      coinsFromFetch,
      totalCoins,
    },
    totalKillsEstimated: totalKills * multipliers.waveSkipMult,
    averageCoinsPerKill: totalKills > 0 ? (coinsFromKills + coinsFromKillsWaveSkipBonus) / (totalKills * multipliers.waveSkipMult) : 0,
    averageCoinsPerWave: targetWave > 0 ? totalCoins / (targetWave * multipliers.waveSkipMult) : 0,
  }
}

export const RESOURCE_DROPS_COIN_APPROXIMATION_NOTES = [
  'Kill coins use wave × enemy-type weight (≈1.15× basic) × spawn-rate cap × Enemy Balance per wave, then apply account multipliers.',
  'Timed Ultimate Weapon and Golden Bot boosts use uptime-calculator durations/cooldowns; Galaxy Compressor pkg CD reduction flows through the same compressor model.',
  'Singularity Harness extends Golden Bot range coverage; Black Hole Digestor adds temporary CPK % from expected free upgrades per wave.',
  'Wave Skip adds skipped-wave income at 1.10× via the same skip model as cells/shards.',
  'Fetch coin procs (~86.5% of finds) use 0.2% × run CPM × expected coin procs; daily caps not modeled.',
  'Intro Sprint zero-coin waves and x1.80 coin trade-off perk (+ Improve Trade-Off lab) are optional toggles.',
  'Golden Combo post-GT kill scaling beyond the GT+ approximation is not modeled.',
] as const

export { WAVE_SKIP_SKIPPED_WAVE_MULT }
