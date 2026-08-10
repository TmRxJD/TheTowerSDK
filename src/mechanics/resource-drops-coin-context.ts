import { normalizeSharedCardsProgressInputs, type SharedCardsProgressInputs } from '../internal/cards-progress-inputs'
import { findLabResearchBySlug, resolveResearchLabLevel } from '../data/index'
import type {
  SharedBotMedalSplitterPlanner,
  SharedLabsCalcByLab,
  SharedModuleProgressInputs,
  SharedVaultLevels,
  SharedWorkshopStatLevels,
} from '../internal/shared-tool-inputs-extended'
import type { SharedModuleEfficiencyLabs } from '../internal/shared-tool-inputs'
import {
  mergeSharedUptimeInputs,
  resolveUptimeCoreStateFromSharedInputs,
  type SharedUptimeInputs,
  syncUptimeFromUwProgressLevels,
  type UwProgressLevels,
} from '../internal/shared-uptime-inputs'
import { uwStoneChartData } from '../data/index'
import { BOT_UPGRADES_DATA } from '../data/index'
import { DEFAULT_BOT_MEDAL_SPLITTER_TOWER_RANGE } from '../internal/bot-medal-splitter-local-state'
import { iapTogglesFromLegacyMults } from './resource-drops-coin-iap'
import { computeModuleCoinsKillBonusFromHub } from './resource-drops-coin-module-cpk'
import {
  blackHoleDigestorCpkBonusPct,
  compressorRarityFromGeneratorUnique,
  expectedFreeUpgradesPerWave,
  goldenBotCoverageWithSingularityHarness,
  resolveEquippedGeneratorUniqueFromModuleProgress,
  resolveGeneratorUniqueRarityBonus,
  singularityHarnessRangeBonusMeters,
} from './resource-drops-coin-generator-modules'
import { introSprintZeroCoinWaveCap } from './resource-drops-coin-intro-sprint'
import {
  coinTradeOffPerkMult,
  standardPerkBonusPctFromLabLevel,
} from './resource-drops-coin-trade-off'
import {
  assembleEnemyDropsSimulationInput,
  type EnemyDropsLinkedSources,
} from './enemy-drops-context'
import {
  COIN_BONUS_ENHANCEMENT_KEY,
  COINS_KILL_WORKSHOP_KEY,
  COINS_WAVE_WORKSHOP_KEY,
  RESOURCE_DROPS_COIN_LAB_SLUGS,
  type ResourceDropsCoinBotLevels,
  type ResourceDropsCoinSimulationInput,
  type ResourceDropsCoinUwLevels,
} from './resource-drops-coin-simulation'

export interface ResourceDropsCoinLinkedSources extends EnemyDropsLinkedSources {
  uptimeInputs: SharedUptimeInputs
  uwCalcProgress: UwProgressLevels
  cardsProgress: SharedCardsProgressInputs
  moduleProgressInputs: SharedModuleProgressInputs
  moduleEfficiencyLabs: SharedModuleEfficiencyLabs
  vaultLevels: SharedVaultLevels
  botMedalSplitterPlanner?: SharedBotMedalSplitterPlanner
  /** Intro Sprint card level (1–7) when known from save/cards hub. */
  introSprintCardLevel?: number
  introSprintCardMastery?: number
}

function readWorkshopCoinUtilityLevel(workshop: SharedWorkshopStatLevels, key: string): number {
  const fromCoin = workshop.coinCurrentLevels[key]
  if (Number.isFinite(fromCoin)) return Math.floor(fromCoin)
  const fromLevels = workshop.levels[key]
  if (Number.isFinite(fromLevels)) return Math.floor(fromLevels)
  return 0
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
  const fromResearch = resolveResearchLabLevel(researchLabLevels, slug, maxLevel)
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

  return Math.max(fromResearch, fromCalc)
}

function readUwProgressLevel(progress: UwProgressLevels, weaponName: string, statName: string): number {
  const weapon = progress[weaponName]
  if (!weapon) return 0
  const value = weapon[statName]
  return Number.isFinite(value) ? Math.floor(value) : 0
}

function buildUwLevels(progress: UwProgressLevels): ResourceDropsCoinUwLevels {
  return {
    gtMultiplierLevel: readUwProgressLevel(progress, 'Golden Tower', 'Multiplier'),
    gtCdLevel: readUwProgressLevel(progress, 'Golden Tower', 'Cooldown'),
    gtDurLevel: readUwProgressLevel(progress, 'Golden Tower', 'Duration'),
    gtCdLab: 0,
    gtDurLab: 0,
    bhCdLevel: readUwProgressLevel(progress, 'Black Hole', 'Cooldown'),
    bhDurLevel: readUwProgressLevel(progress, 'Black Hole', 'Duration'),
    bhCdLab: 0,
    bhDurLab: 0,
    dwCdLevel: readUwProgressLevel(progress, 'Death Wave', 'Cooldown'),
    dwQtyLevel: readUwProgressLevel(progress, 'Death Wave', 'Quantity'),
    slCdLevel: readUwProgressLevel(progress, 'Spotlight', 'Cooldown'),
    slQtyLevel: readUwProgressLevel(progress, 'Spotlight', 'Quantity'),
    slAngleLevel: readUwProgressLevel(progress, 'Spotlight', 'Angle'),
  }
}

function buildBotLevels(uptime: SharedUptimeInputs, goldenBotBonusLevel: number): ResourceDropsCoinBotLevels {
  return {
    gbBonusLevel: Math.floor(Number(goldenBotBonusLevel) || 0),
    gbCdLevel: Math.floor(Number(uptime.gbCdLevel) || 0),
    gbDurLevel: Math.floor(Number(uptime.gbDurLevel) || 0),
    gbCdLab: Math.floor(Number(uptime.gbCdLab) || 0),
    gbDurLab: Math.floor(Number(uptime.gbDurLab) || 0),
  }
}

function readVaultCoinskillLevel(vaultLevels: SharedVaultLevels): number {
  const raw = vaultLevels.levels.coinskill
  return Number.isFinite(raw) ? Math.min(3, Math.max(0, Math.floor(raw))) : 0
}

function readGoldenBotRangeValue(gbRangeLevel: number): string {
  const bot = BOT_UPGRADES_DATA.find(entry => entry.name === 'Golden Bot')
  const stat = bot?.stats.Range
  if (!stat) return '20M'
  const level = Math.max(0, Math.floor(gbRangeLevel))
  const raw = stat.levels[level as keyof typeof stat.levels] ?? stat.base
  return String(raw)
}

function readGtPlusLevel(progress: UwProgressLevels): number {
  return readUwProgressLevel(progress, 'Golden Tower', 'Golden Combo')
}

function resolveTowerRangeMeters(
  workshop: SharedWorkshopStatLevels,
  botMedalPlanner?: SharedBotMedalSplitterPlanner,
): number {
  const preset = botMedalPlanner?.presets?.[botMedalPlanner.activePreset ?? 0]
  if (preset?.towerRange != null && preset.towerRange > 0) return preset.towerRange
  const fromWorkshop = workshop.levels['Range']
  if (Number.isFinite(fromWorkshop) && fromWorkshop > 0) return Math.floor(fromWorkshop)
  return DEFAULT_BOT_MEDAL_SPLITTER_TOWER_RANGE
}

function mergeGeneratorUniqueIntoUptime(
  uptime: SharedUptimeInputs,
  generatorUnique: ReturnType<typeof resolveEquippedGeneratorUniqueFromModuleProgress>,
): SharedUptimeInputs {
  if (!generatorUnique) return uptime
  if (generatorUnique.templateId === 'galaxy-compressor') {
    const rarity = compressorRarityFromGeneratorUnique(generatorUnique.rarity)
    if (!uptime.compressor || uptime.compressor === 'Disabled') {
      return { ...uptime, compressor: rarity }
    }
  }
  return uptime
}

function resolveSingularityHarnessBonus(
  generatorUnique: ReturnType<typeof resolveEquippedGeneratorUniqueFromModuleProgress>,
  botMedalPlanner?: SharedBotMedalSplitterPlanner,
): number {
  if (generatorUnique?.templateId === 'singularity-harness') {
    return singularityHarnessRangeBonusMeters(generatorUnique.rarity)
  }
  const preset = botMedalPlanner?.presets?.[botMedalPlanner.activePreset ?? 0]
  const shRarity = preset?.singularityHarnessRarity
  if (shRarity && shRarity !== 'none') {
    return singularityHarnessRangeBonusMeters(shRarity)
  }
  return 0
}

function readGoldenBotRangeLevel(sources: ResourceDropsCoinLinkedSources): number {
  const bot = BOT_UPGRADES_DATA.find(entry => entry.label === 'Golden Bot')
  const rangeIdx = bot?.statOrder.indexOf('Range') ?? -1
  if (rangeIdx < 0) return 0
  const guardianLevels = sources.guardianLevels['Golden Bot']
    ?? sources.guardianLevels['Coin Bot']
    ?? sources.guardianLevels['golden bot']
  if (guardianLevels?.[rangeIdx] != null) {
    return Math.max(0, Math.floor(guardianLevels[rangeIdx]))
  }
  return 0
}

export function assembleResourceDropsCoinSimulationInput(
  sources: ResourceDropsCoinLinkedSources,
): ResourceDropsCoinSimulationInput {
  const cardsProgress = normalizeSharedCardsProgressInputs(sources.cardsProgress)
  const uwWeapons = Object.values(uwStoneChartData)
  const generatorUnique = resolveEquippedGeneratorUniqueFromModuleProgress(sources.moduleProgressInputs)
  const mergedUptimeBase = mergeSharedUptimeInputs(
    sources.uptimeInputs,
    syncUptimeFromUwProgressLevels(sources.uwCalcProgress, uwWeapons, sources.uptimeInputs),
  )
  const mergedUptime = mergeGeneratorUniqueIntoUptime(mergedUptimeBase, generatorUnique)
  const uptimeState = resolveUptimeCoreStateFromSharedInputs(mergedUptime)
  const enemyDrops = assembleEnemyDropsSimulationInput({
    ...sources,
    uptimeInputs: mergedUptime,
    cards: {
      enemyBalanceLevel: cardsProgress.ebLevel,
      enemyBalanceMastery: cardsProgress.ebMastery >= 0 ? cardsProgress.ebMastery : 0,
      waveSkipLevel: cardsProgress.wsLevel,
      waveSkipMastery: cardsProgress.wsMastery >= 0 ? cardsProgress.wsMastery : 0,
      waveAcceleratorLevel: cardsProgress.waLevel,
      waveAcceleratorMastery: cardsProgress.waMastery >= 0 ? cardsProgress.waMastery : 0,
    },
  })

  const coinInputs = sources.enemyDropsInputs
  const workshop = sources.workshopStatLevels
  const labs = sources.researchLabLevels
  const labsCalc = sources.labsCalcByLab
  const iapToggles = iapTogglesFromLegacyMults(coinInputs)

  const moduleCoinsKillBonus = computeModuleCoinsKillBonusFromHub({
    moduleProgress: sources.moduleProgressInputs,
    moduleEfficiencyLabs: sources.moduleEfficiencyLabs,
  })

  const towerRange = resolveTowerRangeMeters(workshop, sources.botMedalSplitterPlanner)
  const gbRangeLevel = readGoldenBotRangeLevel(sources)
  const shBonusMeters = resolveSingularityHarnessBonus(generatorUnique, sources.botMedalSplitterPlanner)
  const goldenBotCoverage = goldenBotCoverageWithSingularityHarness(
    readGoldenBotRangeValue(gbRangeLevel),
    towerRange,
    shBonusMeters,
  )

  const standardPerkBonusPct = standardPerkBonusPctFromLabLevel(
    resolveLabLevelFromSources(labs, labsCalc, 'standard_perks_bonus'),
  )
  const improveTradeOffLabPct = resolveLabLevelFromSources(labs, labsCalc, 'improve_trade_off_perks')

  const freeUpgradesEnhancementLevel = readWorkshopEnhancementLevel(workshop, 'free_upgrades')
  const bhdPct = generatorUnique?.templateId === 'black-hole-digestor'
    ? resolveGeneratorUniqueRarityBonus('black-hole-digestor', generatorUnique.rarity)
    : 0
  const bhdCpkBonusPct = blackHoleDigestorCpkBonusPct(
    bhdPct,
    expectedFreeUpgradesPerWave({
      freeUpgradesEnhancementLevel,
      freeUpgradePerkQty: coinInputs.freeUpgradePerkLevel,
    }),
  )

  const introSprintZeroCoinWaveCapValue = introSprintZeroCoinWaveCap({
    cardLevel: sources.introSprintCardLevel ?? 0,
    cardMastery: sources.introSprintCardMastery ?? -1,
    active: coinInputs.assumeIntroSprintActive && (sources.introSprintCardLevel ?? 0) > 0,
  })

  return {
    ...enemyDrops,
    waveAcceleratorMasteryLevel: cardsProgress.waMastery >= 0 ? cardsProgress.waMastery : -1,
    coinsKillWorkshopLevel: readWorkshopCoinUtilityLevel(workshop, COINS_KILL_WORKSHOP_KEY),
    coinsWaveWorkshopLevel: readWorkshopCoinUtilityLevel(workshop, COINS_WAVE_WORKSHOP_KEY),
    coinBonusEnhancementLevel: readWorkshopEnhancementLevel(workshop, COIN_BONUS_ENHANCEMENT_KEY),
    coinsKillLabLevel: resolveLabLevelFromSources(labs, labsCalc, RESOURCE_DROPS_COIN_LAB_SLUGS.coinsKill),
    coinsWaveLabLevel: resolveLabLevelFromSources(labs, labsCalc, RESOURCE_DROPS_COIN_LAB_SLUGS.coinsWave),
    gtBonusLabLevel: resolveLabLevelFromSources(labs, labsCalc, RESOURCE_DROPS_COIN_LAB_SLUGS.gtBonus),
    bhCoinLabLevel: resolveLabLevelFromSources(labs, labsCalc, RESOURCE_DROPS_COIN_LAB_SLUGS.bhCoin),
    dwCoinLabLevel: resolveLabLevelFromSources(labs, labsCalc, RESOURCE_DROPS_COIN_LAB_SLUGS.dwCoin),
    slCoinLabLevel: resolveLabLevelFromSources(labs, labsCalc, RESOURCE_DROPS_COIN_LAB_SLUGS.slCoin),
    coinsCardLevel: cardsProgress.coinsLevel,
    coinsCardMastery: cardsProgress.coinsMastery >= 0 ? cardsProgress.coinsMastery : 0,
    themeCoinBonusPct: coinInputs.themeCoinBonusPct,
    relicCoinBonusPct: coinInputs.relicCoinBonusPct,
    iapToggles,
    moduleCoinsKillBonus,
    vaultCoinskillLevel: readVaultCoinskillLevel(sources.vaultLevels),
    allCoinPerkLevel: coinInputs.allCoinPerkLevel,
    standardPerkBonusPct,
    hasCoinTradeOffPerk: coinInputs.hasCoinTradeOffPerk,
    improveTradeOffLabPct,
    introSprintZeroCoinWaveCap: introSprintZeroCoinWaveCapValue,
    bhdCpkBonusPct,
    gtPlusLevel: readGtPlusLevel(sources.uwCalcProgress),
    goldenBotCoverageFraction: goldenBotCoverage,
    goldenBotBonusLevel: coinInputs.goldenBotBonusLevel,
    useGoldenBotCoinBonus: coinInputs.useGoldenBotCoinBonus,
    assumeSyncedUwCoinWindows: coinInputs.assumeSyncedUwCoinWindows,
    uwLevels: buildUwLevels(sources.uwCalcProgress),
    botLevels: buildBotLevels(mergedUptime, coinInputs.goldenBotBonusLevel),
    uptime: uptimeState,
  }
}

export { RESOURCE_DROPS_COIN_LAB_SLUGS, coinTradeOffPerkMult }
