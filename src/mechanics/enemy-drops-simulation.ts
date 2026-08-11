import { MAX_CAMPAIGN_TIER } from '../data/index'
import { CARD_TEMPLATES, type CardTemplate } from '../data/index'
import {
  ELITE_CELL_TIER_FACTS,
  ELITE_CELL_TIER_ROWS,
} from '../data/currency'
import { ENEMY_BALANCE_MASTERY_ROWS } from '../data/chart-tables'
import { type FetchUpgrade, guardianUpgrades } from '../data/index'
import {
  FETCH_LOOT_OUTCOME_WEIGHTS,
  getExpectedBossRerollShardsPerKill,
  getFetchRerollShardCount,
  getShatterShards,
  getEnemyDropsLabBenefits,
} from './enemy-drops-game-data'
import { findLabResearchBySlug } from '../data/index'
import {
  buildLabProgressRows,
  getSharedToolLabs,
  type LabProgressModifiers,
} from '../data/index'
import {
  computeWorkshopCostTotal,
  computeWorkshopTotalDiscountPercent,
} from '../data/index'
import { getWorkshopCostsByKey } from '../data/index'
import { bossWaveIntervalForTier, DEFAULT_BOSS_WAVE_INTERVAL } from '../data/enemies'
import { clamp } from './math'
import { clampCardGameLevel, clampCardMasteryLevel } from './enemy-drops-context'
import { formatCompact } from '../internal/tool-formatting'
import { computeEconomyScaledRoiPct, computeRoiReferenceCost } from '../internal/roi-scaling'

/** Skipped-wave resource multiplier from Wave Skip card description. */
export const WAVE_SKIP_SKIPPED_WAVE_MULT = 1.10

export { DEFAULT_BOSS_WAVE_INTERVAL } from '../data/enemies'

export function computeBossWaveInterval(wavesPerBoss: number | null | undefined): number {
  const parsed = Math.floor(Number(wavesPerBoss))
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_BOSS_WAVE_INTERVAL
  return clamp(parsed, 1, 10)
}

/** Boss spawn interval by tier — see {@link BOSS_WAVE_SPAWN_ROWS} in `enemies.ts`. */
export function computeBossWaveIntervalFromTier(tier: number): number {
  return bossWaveIntervalForTier(tier)
}

/** Boss spawn interval (waves per boss) for tiers 1–24. */
export const BOSS_WAVE_INTERVAL_BY_TIER: readonly number[] = Array.from({ length: MAX_CAMPAIGN_TIER + 1 }, (_, tier) =>
  tier < 1 ? 0 : computeBossWaveIntervalFromTier(tier),
)

export interface EnemyDropsSimulationInput {
  tier: number
  targetWave: number
  /** Game card levels 1–7. */
  enemyBalanceCardLevel: number
  enemyBalanceMasteryLevel: number
  waveSkipCardLevel: number
  waveSkipMasteryLevel: number
  commonDropLabLevel: number
  rareDropLabLevel: number
  rerollShardsLabLevel: number
  shatterShardsLabLevel: number
  deathWaveCellsBonusLevel: number
  cellsPerKillBonusLevel: number
  shatterCommonModules: boolean
  shatterRareModules: boolean
  fetchCooldownLevel: number
  fetchFindChanceLevel: number
  fetchDoubleFindLevel: number
  /** Boss spawn interval (every N waves) — affects boss module/reroll yields only. */
  wavesPerBoss: number
  averageWaveSeconds: number
}

export interface EnemyDropsRoiBuildContext {
  labsEconomy?: LabProgressModifiers
  workshopUtilityDiscountPct?: number
  workshopVaultDiscountPct?: number
}

export interface EnemyDropsWaveContext {
  tier: number
  targetWave: number
  enemyBalanceMult: number
  waveSkipSkipChance: number
  waveSkipExpectedSkipsPerProc: number
  waveSkipMasteryDoubleChance: number
  avgEliteCellDropsPerKill: number
  avgEliteKillsPerWave: number
  cellsPerKillMult: number
  bossCount: number
  waveSkipResourceMult: number
}

export interface EnemyDropsYieldBreakdown {
  cellsFromElites: number
  cellsFromWaveSkip: number
  totalCells: number
  moduleShardsFromDrops: number
  moduleShardsFromShatter: number
  totalModuleShards: number
  rerollShardsFromBosses: number
  commonModulesDropped: number
  rareModulesDropped: number
}

export interface FetchResourceBreakdown {
  expectedProcs: number
  gems: number
  medals: number
  rerollShards: number
  moduleShards: number
  cannonShards: number
  armorShards: number
  generatorShards: number
  coreShards: number
  commonModules: number
  rareModules: number
}

export interface EnemyDropsRoiRow {
  id: string
  label: string
  category: string
  level: number
  nextLevel: number
  costLabel: string
  marginalGain: number
  roi: number
  totalYieldAtLevel: number
}

export interface EnemyDropsSimulationResult {
  context: EnemyDropsWaveContext
  cells: EnemyDropsYieldBreakdown
  shards: EnemyDropsYieldBreakdown
  fetch: FetchResourceBreakdown
}

function findCard(cardId: string): CardTemplate | undefined {
  return CARD_TEMPLATES.find(entry => entry.id === cardId)
}

function cardLevelIndex(gameLevel: number): number {
  return clamp(Math.floor(gameLevel) - 1, 0, 6)
}

function cardLevelPercent(cardId: string, gameLevel: number): number {
  const card = findCard(cardId)
  if (!card || card.levelType !== 'percent') return 0
  const idx = cardLevelIndex(gameLevel)
  const raw = card.levelValues[idx]
  return typeof raw === 'number' ? raw / 100 : 0
}

function cardLevelMulti(cardId: string, gameLevel: number): number {
  const card = findCard(cardId)
  if (!card || card.levelType !== 'multi') return 1
  const idx = cardLevelIndex(gameLevel)
  const raw = card.levelValues[idx]
  return typeof raw === 'number' ? raw : 1
}

function cardMasteryPercent(cardId: string, masteryLevel: number): number {
  const card = findCard(cardId)
  if (!card?.masteryValues?.length) return 0
  const idx = clamp(Math.floor(masteryLevel), 0, card.masteryValues.length - 1)
  return card.masteryValues[idx] / 100
}

/** Normalized ROI % — relative yield gain per unit cost, economy-scaled by reference cost. */
export function computeEnemyDropsNormalizedRoiPct(
  marginalGain: number,
  currentTotal: number,
  cost: number,
  referenceCost: number,
): number {
  if (!Number.isFinite(marginalGain) || marginalGain <= 0) return 0
  const relativeImprovement = currentTotal > 0 ? marginalGain / currentTotal : marginalGain
  if (!Number.isFinite(cost) || cost <= 0) return relativeImprovement * 100
  return computeEconomyScaledRoiPct(relativeImprovement, cost, referenceCost)
}

type EnemyDropsRoiDraft = {
  id: string
  label: string
  category: string
  level: number
  nextLevel: number
  costLabel: string
  marginalGain: number
  cost: number
  currentTotal: number
  totalYieldAtLevel: number
}

function finalizeEnemyDropsRoiRows(drafts: EnemyDropsRoiDraft[]): EnemyDropsRoiRow[] {
  const referenceCost = computeRoiReferenceCost(drafts.map(draft => draft.cost))
  const rows = drafts.map(draft => ({
    id: draft.id,
    label: draft.label,
    category: draft.category,
    level: draft.level,
    nextLevel: draft.nextLevel,
    costLabel: draft.costLabel,
    marginalGain: draft.marginalGain,
    roi: computeEnemyDropsNormalizedRoiPct(
      draft.marginalGain,
      draft.currentTotal,
      draft.cost,
      referenceCost,
    ),
    totalYieldAtLevel: draft.totalYieldAtLevel,
  }))
  return rows.sort((a, b) => b.roi - a.roi)
}

const CARD_LEVEL_COPY_REQUIREMENTS = [0, 1, 3, 8, 16, 28, 48, 80] as const

function cardLevelUpgradeGemCost(fromGameLevel: number, toGameLevel: number): number {
  const fromIdx = clamp(Math.floor(fromGameLevel), 0, 7)
  const toIdx = clamp(Math.floor(toGameLevel), 0, 7)
  const copies = Math.max(0, CARD_LEVEL_COPY_REQUIREMENTS[toIdx] - CARD_LEVEL_COPY_REQUIREMENTS[fromIdx])
  return copies * 20
}

function lookupLabRecord(slug: string) {
  const research = findLabResearchBySlug(slug)
  return getSharedToolLabs().find(
    lab => lab.name === slug || lab.displayName === research?.displayName,
  ) ?? { name: slug, displayName: research?.displayName ?? undefined }
}

function labLevelCoinCost(
  slug: string,
  fromLevel: number,
  toLevel: number,
  modifiers: LabProgressModifiers,
): number {
  const lab = lookupLabRecord(slug)
  const rows = buildLabProgressRows(lab, fromLevel, toLevel, modifiers)
  if (rows.length === 0) return 0
  return rows[rows.length - 1]?.coins ?? 0
}

function cellsPerKillUpgradeCoinCost(
  fromLevel: number,
  toLevel: number,
  utilityDiscountPct = 0,
  vaultDiscountPct = 0,
): number {
  const costs = getWorkshopCostsByKey('WSP_CELLS_PER_KILL_BONUS')
  if (!costs?.length) return 0
  const discount = computeWorkshopTotalDiscountPercent(utilityDiscountPct, vaultDiscountPct)
  return computeWorkshopCostTotal(costs, fromLevel, toLevel, discount)
}

/** Unconditional expected skips when Wave Skip procs (from chart @ 19% card). */
const WAVE_SKIP_EXPECTED_SKIPS_NO_MASTERY = 1.235
const WAVE_SKIP_EXPECTED_SKIPS_MAX_MASTERY = 2.85

export function waveSkipExpectedSkipsPerProc(masteryLevel: number): number {
  if (masteryLevel <= 0) return WAVE_SKIP_EXPECTED_SKIPS_NO_MASTERY
  if (masteryLevel >= 9) return WAVE_SKIP_EXPECTED_SKIPS_MAX_MASTERY
  const t = masteryLevel / 9
  return WAVE_SKIP_EXPECTED_SKIPS_NO_MASTERY + t * (WAVE_SKIP_EXPECTED_SKIPS_MAX_MASTERY - WAVE_SKIP_EXPECTED_SKIPS_NO_MASTERY)
}

export function averageEliteCellsPerKill(tier: number): number {
  const t = clamp(Math.floor(tier), 1, MAX_CAMPAIGN_TIER)
  if (t <= 13) {
    return (1 + t) / 2
  }
  const row = ELITE_CELL_TIER_ROWS.find(entry => entry.tier === t)
  if (row) return row.averageCells
  const last = ELITE_CELL_TIER_ROWS[ELITE_CELL_TIER_ROWS.length - 1]
  return last?.averageCells ?? (1 + t) / 2
}

export function avgEliteKillsPerWaveFromMastery(masteryLevel: number): number {
  const idx = clamp(Math.floor(masteryLevel), 0, ENEMY_BALANCE_MASTERY_ROWS.length - 1)
  const row = ENEMY_BALANCE_MASTERY_ROWS[idx]
  const rayVamp = Number.parseFloat(row?.rayVamp ?? '2')
  return Number.isFinite(rayVamp) ? rayVamp : 2
}

export function cellsPerKillBonusMult(level: number): number {
  const L = clamp(Math.floor(level), 0, 200)
  return 1 + L * 0.01
}

export function waveSkipResourceMultiplier(
  skipChance: number,
  expectedSkipsPerProc: number,
): number {
  const p = clamp(skipChance, 0, 1)
  const skips = Math.max(0, expectedSkipsPerProc)
  return 1 + p * skips * WAVE_SKIP_SKIPPED_WAVE_MULT
}

export function buildWaveContext(input: EnemyDropsSimulationInput): EnemyDropsWaveContext {
  const tier = clamp(Math.floor(input.tier), 1, MAX_CAMPAIGN_TIER)
  const targetWave = clamp(Math.floor(input.targetWave), 1, 1_000_000)
  const ebLevel = clampCardGameLevel(input.enemyBalanceCardLevel)
  const wsLevel = clampCardGameLevel(input.waveSkipCardLevel)
  const ebMastery = clampCardMasteryLevel(input.enemyBalanceMasteryLevel)
  const wsMastery = clampCardMasteryLevel(input.waveSkipMasteryLevel)
  const skipChance = cardLevelPercent('ws', wsLevel)
  const expectedSkips = waveSkipExpectedSkipsPerProc(wsMastery)
  const wsMult = waveSkipResourceMultiplier(skipChance, expectedSkips)
  const bossInterval = computeBossWaveInterval(input.wavesPerBoss)
  const bossCount = Math.floor(targetWave / bossInterval)

  return {
    tier,
    targetWave,
    enemyBalanceMult: cardLevelMulti('eb', ebLevel),
    waveSkipSkipChance: skipChance,
    waveSkipExpectedSkipsPerProc: expectedSkips,
    waveSkipMasteryDoubleChance: cardMasteryPercent('ws', wsMastery),
    avgEliteCellDropsPerKill: averageEliteCellsPerKill(tier),
    avgEliteKillsPerWave: avgEliteKillsPerWaveFromMastery(ebMastery),
    cellsPerKillMult: cellsPerKillBonusMult(input.cellsPerKillBonusLevel),
    bossCount,
    waveSkipResourceMult: wsMult,
  }
}

export function simulateEnemyDropYields(
  input: EnemyDropsSimulationInput,
): EnemyDropsYieldBreakdown {
  const ctx = buildWaveContext(input)
  const labs = getEnemyDropsLabBenefits(input)

  const eliteKills = ctx.targetWave * ctx.avgEliteKillsPerWave * ctx.enemyBalanceMult
  const baseCellsPerElite = ctx.avgEliteCellDropsPerKill * ctx.cellsPerKillMult + labs.deathWaveCellsBonus
  const cellsFromElites = eliteKills * baseCellsPerElite
  const cellsFromWaveSkip = cellsFromElites * (ctx.waveSkipResourceMult - 1)
  const totalCells = cellsFromElites + cellsFromWaveSkip

  const commonChance = labs.commonDropChance
  const rareChance = labs.rareDropChance
  const commonModulesDropped = ctx.bossCount * commonChance
  const rareModulesDropped = ctx.bossCount * rareChance

  const commonShatterYield = getShatterShards('common', labs.shatterBenefit)
  const rareShatterYield = getShatterShards('rare', labs.shatterBenefit)

  let moduleShardsFromShatter = 0
  if (input.shatterCommonModules) {
    moduleShardsFromShatter += commonModulesDropped * commonShatterYield
  }
  if (input.shatterRareModules) {
    moduleShardsFromShatter += rareModulesDropped * rareShatterYield
  }

  const rerollPerBoss = getExpectedBossRerollShardsPerKill(ctx.tier, labs.rerollShardsBenefit)
  const rerollShardsFromBosses = ctx.bossCount * rerollPerBoss * ctx.waveSkipResourceMult

  return {
    cellsFromElites,
    cellsFromWaveSkip,
    totalCells,
    moduleShardsFromDrops: 0,
    moduleShardsFromShatter,
    totalModuleShards: moduleShardsFromShatter,
    rerollShardsFromBosses,
    commonModulesDropped,
    rareModulesDropped,
  }
}

function parsePercent(value: string | null | undefined): number {
  if (!value) return 0
  const match = value.match(/([\d.]+)\s*%/)
  if (!match) return 0
  return Number.parseFloat(match[1]) / 100
}

function parseCooldownSeconds(value: string | null | undefined): number {
  if (!value) return 120
  const match = value.match(/([\d.]+)\s*s/)
  if (!match) return 120
  return Number.parseFloat(match[1])
}

function fetchUpgradeAtLevel(level: number): FetchUpgrade {
  const rows = guardianUpgrades.fetch
  const idx = clamp(Math.floor(level), 1, rows.length) - 1
  return rows[idx] ?? rows[0]
}

function cumulativeFetchStatCost(
  stat: 'cooldownCost' | 'findChanceCost' | 'doubleFindChanceCost',
  fromLevel: number,
  toLevel: number,
): number {
  let total = 0
  for (let level = fromLevel + 1; level <= toLevel; level += 1) {
    const row = fetchUpgradeAtLevel(level)
    const cost = row[stat]
    if (typeof cost === 'number' && Number.isFinite(cost)) total += cost
  }
  return total
}

/** Fetch find-chance proc model — each proc rolls one loot table entry. */
export function simulateFetchDrops(input: EnemyDropsSimulationInput): FetchResourceBreakdown {
  const ctx = buildWaveContext(input)
  const labs = getEnemyDropsLabBenefits(input)

  const cdRow = fetchUpgradeAtLevel(input.fetchCooldownLevel)
  const findRow = fetchUpgradeAtLevel(input.fetchFindChanceLevel)
  const doubleRow = fetchUpgradeAtLevel(input.fetchDoubleFindLevel)

  const cooldownSec = parseCooldownSeconds(cdRow.cooldown)
  const findChance = parsePercent(findRow.findChance)
  const doubleChance = parsePercent(doubleRow.doubleFindChance)

  const attempts = ctx.targetWave * clamp(input.averageWaveSeconds, 1, 600) / Math.max(1, cooldownSec)
  const expectedProcs = attempts * findChance * (1 + doubleChance)

  const commonModules = expectedProcs * FETCH_LOOT_OUTCOME_WEIGHTS.commonModule
  const rareModules = expectedProcs * FETCH_LOOT_OUTCOME_WEIGHTS.rareModule
  const cannonShards = expectedProcs * FETCH_LOOT_OUTCOME_WEIGHTS.cannonShard
  const armorShards = expectedProcs * FETCH_LOOT_OUTCOME_WEIGHTS.armorShard
  const generatorShards = expectedProcs * FETCH_LOOT_OUTCOME_WEIGHTS.generatorShard
  const coreShards = expectedProcs * FETCH_LOOT_OUTCOME_WEIGHTS.coreShard
  const directModuleShards = cannonShards + armorShards + generatorShards + coreShards

  const commonShatterYield = getShatterShards('common', labs.shatterBenefit)
  const rareShatterYield = getShatterShards('rare', labs.shatterBenefit)

  let moduleShards = directModuleShards
  if (input.shatterCommonModules) moduleShards += commonModules * commonShatterYield
  if (input.shatterRareModules) moduleShards += rareModules * rareShatterYield

  const fetchRerollPerProc = getFetchRerollShardCount(ctx.tier, labs.rerollShardsBenefit)

  return {
    expectedProcs,
    gems: expectedProcs * FETCH_LOOT_OUTCOME_WEIGHTS.gems,
    medals: expectedProcs * FETCH_LOOT_OUTCOME_WEIGHTS.medals,
    rerollShards: expectedProcs * FETCH_LOOT_OUTCOME_WEIGHTS.rerollShards * fetchRerollPerProc,
    moduleShards,
    cannonShards,
    armorShards,
    generatorShards,
    coreShards,
    commonModules,
    rareModules,
  }
}

export function simulateEnemyDrops(input: EnemyDropsSimulationInput): EnemyDropsSimulationResult {
  const context = buildWaveContext(input)
  const yieldBreakdown = simulateEnemyDropYields(input)
  const fetch = simulateFetchDrops(input)
  return {
    context,
    cells: yieldBreakdown,
    shards: yieldBreakdown,
    fetch,
  }
}

export function buildCellsPerKillBonusRoiRows(
  input: EnemyDropsSimulationInput,
  context: EnemyDropsRoiBuildContext = {},
  maxLevel = 200,
): EnemyDropsRoiRow[] {
  const drafts: EnemyDropsRoiDraft[] = []
  const start = clamp(Math.floor(input.cellsPerKillBonusLevel), 0, maxLevel - 1)

  for (let level = start; level < maxLevel; level += 1) {
    const current = simulateEnemyDropYields({ ...input, cellsPerKillBonusLevel: level })
    const next = simulateEnemyDropYields({ ...input, cellsPerKillBonusLevel: level + 1 })
    const marginalGain = next.totalCells - current.totalCells
    const coinCost = cellsPerKillUpgradeCoinCost(
      level,
      level + 1,
      context.workshopUtilityDiscountPct,
      context.workshopVaultDiscountPct,
    )
    drafts.push({
      id: `cells-per-kill-${level + 1}`,
      label: 'Cells / Kill Bonus',
      category: 'Workshop Enhancement',
      level,
      nextLevel: level + 1,
      costLabel: coinCost > 0 ? `${formatCompact(Math.round(coinCost))} coins` : '—',
      marginalGain,
      cost: coinCost,
      currentTotal: current.totalCells,
      totalYieldAtLevel: next.totalCells,
    })
  }

  return finalizeEnemyDropsRoiRows(drafts)
}

export function buildWaveSkipCardRoiRows(
  input: EnemyDropsSimulationInput,
): EnemyDropsRoiRow[] {
  const drafts: EnemyDropsRoiDraft[] = []
  const start = clampCardGameLevel(input.waveSkipCardLevel)
  for (let gameLevel = start; gameLevel < 7; gameLevel += 1) {
    const current = simulateEnemyDropYields({ ...input, waveSkipCardLevel: gameLevel })
    const next = simulateEnemyDropYields({ ...input, waveSkipCardLevel: gameLevel + 1 })
    const marginalGain = next.totalCells - current.totalCells
    const gemCost = cardLevelUpgradeGemCost(gameLevel, gameLevel + 1)
    drafts.push({
      id: `wave-skip-card-${gameLevel + 1}`,
      label: 'Wave Skip Card',
      category: 'Card',
      level: gameLevel,
      nextLevel: gameLevel + 1,
      costLabel: gemCost > 0 ? `${formatCompact(gemCost)} gems` : '—',
      marginalGain,
      cost: gemCost,
      currentTotal: current.totalCells,
      totalYieldAtLevel: next.totalCells,
    })
  }
  return finalizeEnemyDropsRoiRows(drafts)
}

export function buildEnemyBalanceMasteryRoiRows(
  input: EnemyDropsSimulationInput,
): EnemyDropsRoiRow[] {
  const drafts: EnemyDropsRoiDraft[] = []
  const start = clampCardMasteryLevel(input.enemyBalanceMasteryLevel)
  for (let level = start; level < 9; level += 1) {
    const current = simulateEnemyDropYields({ ...input, enemyBalanceMasteryLevel: level })
    const next = simulateEnemyDropYields({ ...input, enemyBalanceMasteryLevel: level + 1 })
    const marginalGain = next.totalCells - current.totalCells
    drafts.push({
      id: `eb-mastery-${level + 1}`,
      label: 'Enemy Balance Mastery',
      category: 'Card Mastery',
      level,
      nextLevel: level + 1,
      costLabel: 'Mastery upgrade',
      marginalGain,
      cost: 1,
      currentTotal: current.totalCells,
      totalYieldAtLevel: next.totalCells,
    })
  }
  return finalizeEnemyDropsRoiRows(drafts)
}

export function buildRerollShardsLabRoiRows(
  input: EnemyDropsSimulationInput,
  context: EnemyDropsRoiBuildContext = {},
  maxLevel = 100,
): EnemyDropsRoiRow[] {
  const drafts: EnemyDropsRoiDraft[] = []
  const ctx = buildWaveContext(input)
  const modifiers = context.labsEconomy ?? {
    labSpeed: 0,
    labRelic: 0,
    labDiscount: 0,
    speedUp: 1,
    gemDiscount: 0,
  }
  const start = clamp(Math.floor(input.rerollShardsLabLevel), 0, maxLevel - 1)

  for (let level = start; level < maxLevel; level += 1) {
    const currentPerBoss = getExpectedBossRerollShardsPerKill(
      ctx.tier,
      getEnemyDropsLabBenefits({ ...input, rerollShardsLabLevel: level }).rerollShardsBenefit,
    )
    const nextPerBoss = getExpectedBossRerollShardsPerKill(
      ctx.tier,
      getEnemyDropsLabBenefits({ ...input, rerollShardsLabLevel: level + 1 }).rerollShardsBenefit,
    )
    const currentTotal = ctx.bossCount * currentPerBoss * ctx.waveSkipResourceMult
    const marginalGain = ctx.bossCount * (nextPerBoss - currentPerBoss) * ctx.waveSkipResourceMult
    const coinCost = labLevelCoinCost('reroll_shards', level, level + 1, modifiers)
    drafts.push({
      id: `reroll-shards-lab-${level + 1}`,
      label: 'Reroll Shards Lab',
      category: 'Lab',
      level,
      nextLevel: level + 1,
      costLabel: coinCost > 0 ? `${formatCompact(Math.round(coinCost))} coins` : '—',
      marginalGain,
      cost: coinCost,
      currentTotal,
      totalYieldAtLevel: ctx.bossCount * nextPerBoss * ctx.waveSkipResourceMult,
    })
  }
  return finalizeEnemyDropsRoiRows(drafts)
}

export function buildFetchUpgradeRoiRows(input: EnemyDropsSimulationInput): EnemyDropsRoiRow[] {
  const drafts: EnemyDropsRoiDraft[] = []
  const metrics: Array<{
    key: 'fetchCooldownLevel' | 'fetchFindChanceLevel' | 'fetchDoubleFindLevel'
    label: string
    stat: 'cooldownCost' | 'findChanceCost' | 'doubleFindChanceCost'
    max: number
  }> = [
    { key: 'fetchCooldownLevel', label: 'Fetch Cooldown', stat: 'cooldownCost', max: 60 },
    { key: 'fetchFindChanceLevel', label: 'Fetch Find Chance', stat: 'findChanceCost', max: 41 },
    { key: 'fetchDoubleFindLevel', label: 'Fetch Double Find', stat: 'doubleFindChanceCost', max: 49 },
  ]

  for (const metric of metrics) {
    const currentLevel = input[metric.key]
    for (let level = currentLevel; level < metric.max; level += 1) {
      const current = simulateFetchDrops({ ...input, [metric.key]: level } as EnemyDropsSimulationInput)
      const next = simulateFetchDrops({ ...input, [metric.key]: level + 1 } as EnemyDropsSimulationInput)
      const marginalGain = next.expectedProcs - current.expectedProcs
      const cost = cumulativeFetchStatCost(metric.stat, level, level + 1)
      drafts.push({
        id: `${metric.key}-${level + 1}`,
        label: metric.label,
        category: 'Fetch Guardian',
        level,
        nextLevel: level + 1,
        costLabel: cost > 0 ? `${formatCompact(cost)} bits` : '—',
        marginalGain,
        cost,
        currentTotal: current.expectedProcs,
        totalYieldAtLevel: next.expectedProcs,
      })
    }
  }

  return finalizeEnemyDropsRoiRows(drafts)
}

export const ENEMY_DROPS_MECHANICS_NOTES = [
  ...ELITE_CELL_TIER_FACTS,
  'Module drop chances: common/rare drop formulas (labBenefit × 0.01 + base).',
  'Boss reroll shards: 15% proc × (tier table + round(reroll_shards lab)) reroll shard drop rules.',
  'Shatter yields: floor(shatter_shards lab / 100 × scale) + constant per GetShatterShards rarity branch.',
  'Wave Skip grants skipped-wave enemy value at ×1.10; multi-skip distribution from community chart data.',
  'Fetch loot weights from in-game Drop Table UI (GiveFetchReward); daily caps not modeled in EV sim yet.',
] as const


export {
  getShatterShards,
  getCommonModuleDropChance,
  getRareModuleDropChance,
} from './enemy-drops-game-data'

export { computeTierNumber } from './enemy-drops-context'
