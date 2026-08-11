import { readDurationSecondsFromSave } from './battle-duration'
import { TRACKER_RUN_EXTENDED_FIELDS, TRACKER_RUN_OPTIONAL_STRING_FIELDS } from '../internal/tracker-cloud-schemas'
import { formatCompact } from '../internal/tool-formatting'

type BattleReportStatField = (typeof TRACKER_RUN_OPTIONAL_STRING_FIELDS)[number]

const BATTLE_REPORT_SAVE_KEY_ALIASES: Partial<Record<BattleReportStatField, readonly string[]>> = {
  basic: ['totalBasic'],
  fast: ['totalFast'],
  tank: ['totalTank'],
  ranged: ['totalRanged'],
  boss: ['totalBoss'],
  protector: ['totalProtector'],
  vampires: ['totalVampire'],
  rays: ['totalRays'],
  scatters: ['totalScatters'],
  saboteurs: ['totalSaboteurs'],
  commanders: ['totalCommanders'],
  overcharges: ['totalOvercharges'],
  enemiesHitByOrbs: ['orbHits', 'orbHitsThisRound'],
  taggedByDeathWave: ['taggedByDeathwave', 'totalEnemiesTaggedByDeathwaveThisRound'],
  destroyedInSpotlight: ['enemiesDestroyedInSpotlightThisRound'],
  totalEnemies: ['totalEnemiesDestroyedThisRound'],
  freeAttackUpgrade: ['freeAttackUpgrades'],
  freeDefenseUpgrade: ['freeDefenseUpgrades'],
  freeUtilityUpgrade: ['freeUtilityUpgrades'],
  coinsFromBlackhole: ['coinsFromBlackHole'],
  destroyedInGoldenBot: ['destroyedInGoldenBot', 'enemiesKilledInGoldenBot', 'enemiesKilledInGoldenBotThisRound'],
  guardianSummonedEnemies: ['guardianSummoned', 'totalSummonedByGuardianThisRound', 'summonedEnemies'],
  killsWithGoldenTower: ['destroyedInGoldenTower', 'goldenTowerKills', 'killedWithGoldenTower'],
  enemiesHitByBlackHole: ['blackHoleHits', 'enemiesHitByBlackHoleThisRound'],
  killsWithAmplifyBot: ['destroyedInAmplifyBot', 'enemiesKilledInAmplifyBot', 'killedWithAmplifyBot'],
  coinsFetched: ['guardianCoinsFetched'],
  gemsFetched: ['guardianGems'],
  medalsFetched: ['guardianMedals'],
  rerollShardsFetched: ['guardianRerollShards'],
  cannonShardsFetched: ['guardianCannonShards'],
  armorShardsFetched: ['guardianArmorShards'],
  generatorShardsFetched: ['guardianGeneratorShards'],
  coreShardsFetched: ['guardianCoreShards'],
  commonModulesFetched: ['guardianCommonModules'],
  rareModulesFetched: ['guardianRareModules'],
  highestCoinsPerMinute: ['highestCPM'],
  nukeCount: ['nukesUsed'],
  secondWindCount: ['secondWindsUsed'],
  demonModeCount: ['demonModesUsed'],
  hitsAbsorbedByEnergyShield: ['energyShieldHitsAbsorbed'],
  enemyAttackLevelsSkipped: ['attackLevelSkips'],
  enemyHealthLevelsSkipped: ['healthLevelSkips'],
  coinsFromWaveSkip: ['coinsEarnedWaveSkip'],
  coinsPerWave: ['coinsEarnedCPW'],
  gemsEarned: ['gemsThisRound'],
  adGemsEarned: ['adGemsThisRound'],
  fetchGems: ['guardianGems'],
  medalsEarned: ['guardianMedals'],
  killsWithDeathPenalty: ['destroyedByDeathPenalty'],
  killsWithDeathWave: [
    'destroyedInDeathWave',
    'destroyedInDeathwave',
    'enemiesHitByDeathWaveThisRound',
    'enemiesHitByDeathwaveThisRound',
  ],
  coinsFromGoldenCombo: ['coinsFromGoldenTowerPlus'],
  criticalCoinCoins: ['coinsFromCritCoin'],
  largestInnerLandmineCharge: ['largestILMCharge'],
  negativeMassProjectorBlocked: ['magicOrbBlocked'],
  enemiesHitByLandMines: ['enemiesHitByLandMines', 'enemiesHitByLandMineThisRound'],
}

const COUNT_STAT_FIELDS = new Set<BattleReportStatField>([
  'deathDefy',
  'projectilesCount',
  'lifesteal',
  'enemiesHitByOrbs',
  'landMinesSpawned',
  'wavesSkipped',
  'recoveryPackages',
  'freeAttackUpgrade',
  'freeDefenseUpgrade',
  'freeUtilityUpgrade',
  'hpFromDeathWave',
  'gemBlocksTapped',
  'totalEnemies',
  'basic',
  'fast',
  'tank',
  'ranged',
  'boss',
  'protector',
  'totalElites',
  'vampires',
  'rays',
  'scatters',
  'saboteurs',
  'commanders',
  'overcharges',
  'destroyedByOrbs',
  'destroyedByThorns',
  'destroyedByDeathRay',
  'destroyedByLandMine',
  'destroyedInSpotlight',
  'thunderBotStuns',
  'destroyedInGoldenBot',
  'guardianSummonedEnemies',
  'gemsFetched',
  'medalsFetched',
  'rerollShardsFetched',
  'cannonShardsFetched',
  'armorShardsFetched',
  'generatorShardsFetched',
  'coreShardsFetched',
  'commonModulesFetched',
  'rareModulesFetched',
  'taggedByDeathWave',
  'nukeCount',
  'secondWindCount',
  'demonModeCount',
  'hitsAbsorbedByEnergyShield',
  'enemyAttackLevelsSkipped',
  'enemyHealthLevelsSkipped',
  'fetchGems',
  'medalsEarned',
  'adGemsEarned',
  'gemsEarned',
  'largestWaveSkip',
  'largestSmartMissileStack',
  'largestGoldenCombo',
  'killsWithGoldenTower',
  'killsWithDeathWave',
  'killsWithAmplifyBot',
  'killsWithDeathPenalty',
  'destroyedByProjectiles',
  'destroyedByChainLightning',
  'destroyedBySmartMissiles',
  'destroyedByInnerLandMines',
  'destroyedByPoisonSwamp',
  'destroyedByBlackHole',
  'destroyedByFlameBot',
  'destroyedByOther',
  'enemiesHitByProjectiles',
  'enemiesHitByThorns',
  'enemiesHitByDeathRay',
  'enemiesHitByChainLightning',
  'enemiesHitBySmartMissiles',
  'enemiesHitByInnerLandMines',
  'enemiesHitByPoisonSwamp',
  'enemiesHitByBlackHole',
  'enemiesHitByChronoField',
  'enemiesHitByLandMines',
  'enemiesHitByThunderBot',
  'enemiesHitByFlameBot',
  'enemiesHitByAttackChip',
  'enemiesHitByOrbitalAugment',
])

function readNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw.trim())
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function compactBattleReportStat(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatCompact(value).substring(0, 20)
  }
  const raw = String(value).trim()
  return raw.length > 0 ? raw.substring(0, 20) : null
}

function optionalCountField(value: unknown): string | null {
  if (value == null) return null
  const raw = String(value).trim()
  return raw.length > 0 ? raw.substring(0, 20) : null
}

function resolveBattleReportSaveKeys(trackerField: string): readonly string[] {
  const aliases = BATTLE_REPORT_SAVE_KEY_ALIASES[trackerField as BattleReportStatField]
  const keys = new Set<string>([trackerField, ...(aliases ?? [])])
  if (trackerField.startsWith('enemiesHitBy')) {
    keys.add(`${trackerField}ThisRound`)
  }
  return [...keys]
}

function readBattleReportSaveValue(
  run: Record<string, unknown>,
  trackerField: string,
): unknown {
  for (const saveKey of resolveBattleReportSaveKeys(trackerField)) {
    if (!(saveKey in run)) continue
    const value = run[saveKey]
    if (value == null) continue
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (String(value).trim().length > 0) return value
  }
  return null
}

function formatBattleReportStatValue(
  trackerField: BattleReportStatField,
  value: unknown,
): string | null {
  if (COUNT_STAT_FIELDS.has(trackerField)) {
    return optionalCountField(value)
  }
  return compactBattleReportStat(value)
}

function computePerHourStat(
  run: Record<string, unknown>,
  amountKey: string,
): string | null {
  const seconds = readDurationSecondsFromSave(run.realTime)
  const amount = readNumber(run[amountKey])
  if (seconds == null || seconds <= 0 || amount == null || amount <= 0) return null
  return compactBattleReportStat(amount / (seconds / 3600))
}

function computeCoinsPerKill(run: Record<string, unknown>): string | null {
  const coins = readNumber(run.coinsEarned)
  const kills = readNumber(run.totalEnemies)
  if (coins == null || kills == null || kills <= 0 || coins <= 0) return null
  return compactBattleReportStat(coins / kills)
}

function inferZeroBattleReportStat(
  run: Record<string, unknown>,
  trackerField: BattleReportStatField,
): string | null {
  if (trackerField === 'bountyCoins' && !resolveBattleReportSaveKeys(trackerField).some(key => key in run)) {
    return '0'
  }
  if (trackerField === 'attackChipDamage') {
    const chipHits = readNumber(run.enemiesHitByAttackChipThisRound)
    if (chipHits === 0 && readBattleReportSaveValue(run, 'attackChipDamage') == null) {
      return '0'
    }
  }
  if (trackerField === 'negativeMassProjectorBlocked') {
    const blocked = readNumber(run.magicOrbBlocked)
    if (blocked === 0 && readBattleReportSaveValue(run, 'negativeMassProjectorBlocked') == null) {
      return '0'
    }
  }
  if (trackerField === 'largestInnerLandmineCharge') {
    const charge = readNumber(run.largestILMCharge)
    if (charge === 0 && readBattleReportSaveValue(run, 'largestInnerLandmineCharge') == null) {
      return '0'
    }
  }
  return null
}

function readDerivedBattleReportStat(
  run: Record<string, unknown>,
  trackerField: BattleReportStatField,
): string | null {
  switch (trackerField) {
    case 'coinsPerHour':
      return computePerHourStat(run, 'coinsEarned')
    case 'cellsPerHour':
      return computePerHourStat(run, 'cellsEarned')
    case 'rerollShardsPerHour':
      return computePerHourStat(run, 'rerollShardsEarned')
    case 'coinsPerKill':
      return computeCoinsPerKill(run)
    default:
      return null
  }
}

function readBattleReportStatValue(
  run: Record<string, unknown>,
  trackerField: BattleReportStatField,
): string | null {
  const direct = readBattleReportSaveValue(run, trackerField)
  if (direct != null) {
    return formatBattleReportStatValue(trackerField, direct)
  }

  const derived = readDerivedBattleReportStat(run, trackerField)
  if (derived != null) return derived

  return inferZeroBattleReportStat(run, trackerField)
}

const BATTLE_REPORT_STAT_FIELDS = TRACKER_RUN_OPTIONAL_STRING_FIELDS.filter(
  key => key !== 'username' && key !== 'note',
)

/** Map save battle-history entry fields onto all optional tracker stat keys. */
export function buildBattleReportStatFieldsFromSaveEntry(
  run: Record<string, unknown>,
): Partial<Record<BattleReportStatField, string | null>> {
  const mapped: Partial<Record<BattleReportStatField, string | null>> = {}

  for (const trackerField of BATTLE_REPORT_STAT_FIELDS) {
    const value = readBattleReportStatValue(run, trackerField)
    if (value == null) continue
    mapped[trackerField] = value
  }

  return mapped
}

/** Extended-only subset for runs_extended_data writes. */
export function buildBattleReportExtendedFieldsFromSaveEntry(
  run: Record<string, unknown>,
): Partial<Record<(typeof TRACKER_RUN_EXTENDED_FIELDS)[number], string | null>> {
  const all = buildBattleReportStatFieldsFromSaveEntry(run)
  const mapped: Partial<Record<(typeof TRACKER_RUN_EXTENDED_FIELDS)[number], string | null>> = {}

  for (const trackerField of TRACKER_RUN_EXTENDED_FIELDS) {
    const value = all[trackerField as BattleReportStatField]
    if (value != null) mapped[trackerField] = value
  }

  return mapped
}

/** Read a raw save value for a tracker field, including save-key aliases. */
export function readBattleReportRawSaveValue(
  run: Record<string, unknown>,
  trackerField: string,
): unknown {
  return readBattleReportSaveValue(run, trackerField)
}

export function getBattleReportSaveKeysForTest(trackerField: string): readonly string[] {
  return resolveBattleReportSaveKeys(trackerField)
}

export function getBattleReportExtendedSaveKeysForTest(trackerField: string): readonly string[] {
  return resolveBattleReportSaveKeys(trackerField)
}
