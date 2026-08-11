import { z } from 'zod'
import { parseSaveDateTimeToMs } from '../formatting/index'
import { stableSerialize } from './persistence-primitives'
import { canonicalizeTrackerRunData, serializeTrackerRunForCloudAttributes } from './tracker-run-normalization'

const trackerAppwriteDocumentSystemShape = {
  $id: z.string().optional(),
  $collectionId: z.string().optional(),
  $databaseId: z.string().optional(),
  $createdAt: z.string().optional(),
  $updatedAt: z.string().optional(),
  $permissions: z.array(z.string()).optional(),
} satisfies Record<string, z.ZodTypeAny>

const trackerRunFlexibleNumberLikeFields = new Set([
  'tier',
  'wave',
  'coins',
  'cells',
  'rerollShards',
])

const trackerRunNullableStringFields = new Set([
  'fileId',
  'screenshotUrl',
  'source',
  // Appwrite datetime attributes serialize as ISO strings or JSON null when unset.
  'createdAt',
  'updatedAt',
  'deletedAt',
])

const trackerRunBooleanLikeFields = new Set([
  'verified',
  'blocked',
  'banned',
  'public',
])

const trackerLifetimeOptionalFieldShape = {
  userId: z.string().optional(),
  username: z.string().optional(),
  date: z.string().optional(),
  gameStarted: z.string().optional(),
  screenshotUrl: z.string().nullable().optional(),
  verified: z.union([z.boolean(), z.number(), z.string(), z.null()]).optional(),
  blocked: z.union([z.boolean(), z.number(), z.string(), z.null()]).optional(),
  coinsEarned: z.string().optional(),
  cashEarned: z.string().optional(),
  stonesEarned: z.string().optional(),
  keysEarned: z.string().optional(),
  damageDealt: z.string().optional(),
  enemiesDestroyed: z.string().optional(),
  wavesCompleted: z.string().optional(),
  upgradesBought: z.string().optional(),
  workshopUpgrades: z.string().optional(),
  workshopCoinsSpent: z.string().optional(),
  researchCompleted: z.string().optional(),
  labCoinsSpent: z.string().optional(),
  freeUpgrades: z.string().optional(),
  interestEarned: z.string().optional(),
  orbKills: z.string().optional(),
  deathRayKills: z.string().optional(),
  thornDamage: z.string().optional(),
  wavesSkipped: z.string().optional(),
} satisfies Record<string, z.ZodTypeAny>

export function normalizeTrackerDateText(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  const parsedMs = parseSaveDateTimeToMs(raw)
  if (parsedMs != null && /^\d+$/.test(raw)) {
    const date = new Date(parsedMs)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const parts = raw.split(/[./-]/).map(part => part.trim())
  if (parts.length !== 3) return raw

  const [firstPart, secondPart, thirdPart] = parts
  if (!/^\d{1,4}$/.test(firstPart) || !/^\d{1,2}$/.test(secondPart) || !/^\d{1,4}$/.test(thirdPart)) {
    return raw
  }

  if (firstPart.length === 4) {
    return `${firstPart.padStart(4, '0')}-${secondPart.padStart(2, '0')}-${thirdPart.padStart(2, '0')}`
  }

  const monthOrDayA = Number(firstPart)
  const monthOrDayB = Number(secondPart)
  const year = thirdPart.length === 2 ? `20${thirdPart}` : thirdPart.padStart(4, '0')
  const month = monthOrDayA > 12 ? monthOrDayB : monthOrDayA
  const day = monthOrDayA > 12 ? monthOrDayA : monthOrDayB

  if (!Number.isFinite(month) || !Number.isFinite(day)) return raw
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function normalizeTrackerTimeText(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`

  const shortTimeMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)$/i)
  if (shortTimeMatch) {
    let hour = Number(shortTimeMatch[1])
    const minute = shortTimeMatch[2]
    const second = shortTimeMatch[3] ?? '00'
    const suffix = shortTimeMatch[4].toUpperCase()
    if (suffix === 'PM' && hour < 12) hour += 12
    if (suffix === 'AM' && hour === 12) hour = 0
    return `${String(hour).padStart(2, '0')}:${minute}:${second}`
  }

  const compactTimeMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (compactTimeMatch) {
    const hour = compactTimeMatch[1]
    const minute = compactTimeMatch[2]
    const second = compactTimeMatch[3] ?? '00'
    return `${hour.padStart(2, '0')}:${minute}:${second}`
  }

  return raw
}

const TRACKER_RUN_NON_ATTRIBUTE_KEYS = new Set([
  'fullRunData',
  'localId',
  'localScreenshotPath',
  'localScreenshotName',
])

export const TRACKER_RUN_OPTIONAL_STRING_FIELDS = [
  'username',
  'note',
  'gameTime',
  'coinsPerHour',
  'cellsPerHour',
  'rerollShardsPerHour',
  'cashEarned',
  'interestEarned',
  'gemBlocksTapped',
  'damageTaken',
  'damageTakenWall',
  'damageTakenWhileBerserked',
  'damageGainFromBerserk',
  'deathDefy',
  'damageDealt',
  'projectilesDamage',
  'rendArmorDamage',
  'projectilesCount',
  'lifesteal',
  'thornDamage',
  'orbDamage',
  'enemiesHitByOrbs',
  'landMineDamage',
  'landMinesSpawned',
  'deathRayDamage',
  'smartMissileDamage',
  'innerLandMineDamage',
  'chainLightningDamage',
  'deathWaveDamage',
  'taggedByDeathWave',
  'swampDamage',
  'blackHoleDamage',
  'spotlightDamage',
  'electronsDamage',
  'wavesSkipped',
  'recoveryPackages',
  'freeAttackUpgrade',
  'freeDefenseUpgrade',
  'freeUtilityUpgrade',
  'hpFromDeathWave',
  'coinsFromDeathWave',
  'cashFromGoldenTower',
  'coinsFromGoldenTower',
  'coinsFromBlackhole',
  'coinsFromSpotlight',
  'coinsFromOrbs',
  'coinsFromCoinUpgrade',
  'coinsFromCoinBonuses',
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
  'flameBotDamage',
  'thunderBotStuns',
  'goldenBotCoinsEarned',
  'destroyedInGoldenBot',
  'guardianDamage',
  'guardianSummonedEnemies',
  'guardianCoinsStolen',
  'coinsFetched',
  'gemsFetched',
  'medalsFetched',
  'rerollShardsFetched',
  'cannonShardsFetched',
  'armorShardsFetched',
  'generatorShardsFetched',
  'coreShardsFetched',
  'commonModulesFetched',
  'rareModulesFetched',
  'highestCoinsPerMinute',
  'largestWaveSkip',
  'mostCoinsFromWaveSkip',
  'mostCellsFromWaveSkip',
  'largestSmartMissileStack',
  'largestGoldenCombo',
  'mostCoinsFromGoldenCombo',
  'largestInnerLandmineCharge',
  'attackChipDamage',
  'towerHealthRegen',
  'wallHealthRegen',
  'defensePercentBlocked',
  'defenseAbsoluteBlocked',
  'chronoFieldBlocked',
  'chainThunderBlocked',
  'flameBotBlocked',
  'primordialCollapseBlocked',
  'negativeMassProjectorBlocked',
  'enemyAttackLevelsSkipped',
  'enemyHealthLevelsSkipped',
  'hitsAbsorbedByEnergyShield',
  'nukeCount',
  'secondWindCount',
  'demonModeCount',
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
  'killsWithGoldenTower',
  'killsWithDeathWave',
  'killsWithAmplifyBot',
  'killsWithDeathPenalty',
  'killsWithBlackHole',
  'killsWithOrbs',
  'criticalCoinCoins',
  'coinsPerKill',
  'coinsFromGoldenCombo',
  'coinsFromWaveSkip',
  'coinsPerWave',
  'bountyCoins',
  'gemsEarned',
  'adGemsEarned',
  'fetchGems',
  'medalsEarned',
  'destroyedByProjectiles',
  'destroyedByChainLightning',
  'destroyedBySmartMissiles',
  'destroyedByInnerLandMines',
  'destroyedByPoisonSwamp',
  'destroyedByBlackHole',
  'destroyedByFlameBot',
  'destroyedByOther',
] as const

export const TRACKER_RUN_MAIN_COLLECTION_OPTIONAL_FIELDS = [
  'note',
  'gameTime',
  'coinsPerHour',
  'cellsPerHour',
  'rerollShardsPerHour',
  'cashEarned',
  'interestEarned',
  'gemBlocksTapped',
  'damageTaken',
  'damageTakenWall',
  'damageTakenWhileBerserked',
  'damageGainFromBerserk',
  'deathDefy',
  'damageDealt',
  'projectilesDamage',
  'rendArmorDamage',
  'projectilesCount',
  'lifesteal',
  'thornDamage',
  'orbDamage',
  'enemiesHitByOrbs',
  'landMineDamage',
  'landMinesSpawned',
  'deathRayDamage',
  'smartMissileDamage',
  'innerLandMineDamage',
  'chainLightningDamage',
  'deathWaveDamage',
  'taggedByDeathWave',
  'swampDamage',
  'blackHoleDamage',
  'electronsDamage',
  'wavesSkipped',
  'recoveryPackages',
  'freeAttackUpgrade',
  'freeDefenseUpgrade',
  'freeUtilityUpgrade',
  'hpFromDeathWave',
  'coinsFromDeathWave',
  'cashFromGoldenTower',
  'coinsFromGoldenTower',
  'coinsFromBlackhole',
  'coinsFromSpotlight',
  'coinsFromOrbs',
  'coinsFromCoinUpgrade',
  'coinsFromCoinBonuses',
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
  'flameBotDamage',
  'thunderBotStuns',
  'goldenBotCoinsEarned',
  'destroyedInGoldenBot',
  'guardianDamage',
  'guardianSummonedEnemies',
  'guardianCoinsStolen',
  'coinsFetched',
  'gemsFetched',
  'medalsFetched',
  'rerollShardsFetched',
  'cannonShardsFetched',
  'armorShardsFetched',
  'generatorShardsFetched',
  'coreShardsFetched',
  'commonModulesFetched',
  'rareModulesFetched',
] as const

export const TRACKER_RUN_MAIN_COLLECTION_META_FIELDS = [
  'fileId',
  'verified',
  'blocked',
  'screenshotUrl',
  'source',
] as const

export const TRACKER_RUN_EXTENDED_FIELDS = TRACKER_RUN_OPTIONAL_STRING_FIELDS.filter(key => (
  key !== 'username'
  && key !== 'note'
  && !TRACKER_RUN_MAIN_COLLECTION_OPTIONAL_FIELDS.includes(key as (typeof TRACKER_RUN_MAIN_COLLECTION_OPTIONAL_FIELDS)[number])
))

const trackerRunNullishStringFields = new Set<string>(TRACKER_RUN_OPTIONAL_STRING_FIELDS)

const TRACKER_RUN_CLOUD_ALLOWED_FIELDS = new Set<string>([
  'userId',
  'username',
  'cells',
  'coins',
  'date',
  'duration',
  'killedBy',
  'rerollShards',
  'runDate',
  'runTime',
  'tier',
  'time',
  'type',
  'wave',
  'note',
  'fileId',
  'screenshotUrl',
  'verified',
  'blocked',
  'banned',
  'public',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'source',
  'gameTime',
  'coinsPerHour',
  'cellsPerHour',
  'rerollShardsPerHour',
  'cashEarned',
  'interestEarned',
  'gemBlocksTapped',
  'damageTaken',
  'damageTakenWall',
  'damageTakenWhileBerserked',
  'damageGainFromBerserk',
  'deathDefy',
  'damageDealt',
  'projectilesDamage',
  'rendArmorDamage',
  'projectilesCount',
  'lifesteal',
  'thornDamage',
  'orbDamage',
  'enemiesHitByOrbs',
  'landMineDamage',
  'landMinesSpawned',
  'deathRayDamage',
  'smartMissileDamage',
  'innerLandMineDamage',
  'chainLightningDamage',
  'deathWaveDamage',
  'taggedByDeathWave',
  'swampDamage',
  'blackHoleDamage',
  'spotlightDamage',
  'electronsDamage',
  'wavesSkipped',
  'recoveryPackages',
  'freeAttackUpgrade',
  'freeDefenseUpgrade',
  'freeUtilityUpgrade',
  'hpFromDeathWave',
  'coinsFromDeathWave',
  'cashFromGoldenTower',
  'coinsFromGoldenTower',
  'coinsFromBlackhole',
  'coinsFromSpotlight',
  'coinsFromOrbs',
  'coinsFromCoinUpgrade',
  'coinsFromCoinBonuses',
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
  'flameBotDamage',
  'thunderBotStuns',
  'goldenBotCoinsEarned',
  'destroyedInGoldenBot',
  'guardianDamage',
  'guardianSummonedEnemies',
  'guardianCoinsStolen',
  'coinsFetched',
  'gemsFetched',
  'medalsFetched',
  'rerollShardsFetched',
  'cannonShardsFetched',
  'armorShardsFetched',
  'generatorShardsFetched',
  'coreShardsFetched',
  'commonModulesFetched',
  'rareModulesFetched',
  'highestCoinsPerMinute',
  'largestWaveSkip',
  'mostCoinsFromWaveSkip',
  'mostCellsFromWaveSkip',
  'largestSmartMissileStack',
  'largestGoldenCombo',
  'mostCoinsFromGoldenCombo',
  'largestInnerLandmineCharge',
  'attackChipDamage',
  'towerHealthRegen',
  'wallHealthRegen',
  'defensePercentBlocked',
  'defenseAbsoluteBlocked',
  'chronoFieldBlocked',
  'chainThunderBlocked',
  'flameBotBlocked',
  'primordialCollapseBlocked',
  'negativeMassProjectorBlocked',
  'enemyAttackLevelsSkipped',
  'enemyHealthLevelsSkipped',
  'hitsAbsorbedByEnergyShield',
  'nukeCount',
  'secondWindCount',
  'demonModeCount',
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
  'killsWithGoldenTower',
  'killsWithDeathWave',
  'killsWithAmplifyBot',
  'killsWithDeathPenalty',
  'killsWithBlackHole',
  'killsWithOrbs',
  'criticalCoinCoins',
  'coinsPerKill',
  'coinsFromGoldenCombo',
  'coinsFromWaveSkip',
  'coinsPerWave',
  'bountyCoins',
  'gemsEarned',
  'adGemsEarned',
  'fetchGems',
  'medalsEarned',
  'destroyedByProjectiles',
  'destroyedByChainLightning',
  'destroyedBySmartMissiles',
  'destroyedByInnerLandMines',
  'destroyedByPoisonSwamp',
  'destroyedByBlackHole',
  'destroyedByFlameBot',
  'destroyedByOther',
])

function createTrackerRunOptionalFieldShape(): Record<string, z.ZodTypeAny> {
  return Object.fromEntries(
    Array.from(TRACKER_RUN_CLOUD_ALLOWED_FIELDS).map(key => {
      if (trackerRunNullableStringFields.has(key)) {
        return [key, z.string().nullable().optional()] as const
      }

      if (trackerRunNullishStringFields.has(key)) {
        return [key, z.string().nullable().optional()] as const
      }

      if (trackerRunBooleanLikeFields.has(key)) {
        return [key, z.union([z.boolean(), z.number(), z.string(), z.null()]).optional()] as const
      }

      if (trackerRunFlexibleNumberLikeFields.has(key)) {
        return [key, z.union([z.string(), z.number()]).optional()] as const
      }

      return [key, z.string().optional()] as const
    }),
  )
}

const trackerRunOptionalFieldShape = createTrackerRunOptionalFieldShape()

export const trackerRunCloudDocumentSchema = z.object({
  ...trackerAppwriteDocumentSystemShape,
  ...trackerRunOptionalFieldShape,
}).strict()

/** Cloud list/pull reads — allow Appwrite fields not yet in the governed allowlist. */
export const trackerRunCloudDocumentReadSchema = z.object({
  ...trackerAppwriteDocumentSystemShape,
  ...trackerRunOptionalFieldShape,
}).passthrough()

export type TrackerRunCloudDocument = z.infer<typeof trackerRunCloudDocumentSchema>

export const trackerRunCloudWriteSchema = z.object({
  userId: z.string(),
  username: z.string(),
  cells: z.string(),
  coins: z.string(),
  date: z.string(),
  duration: z.string(),
  killedBy: z.string(),
  rerollShards: z.string(),
  runDate: z.string(),
  runTime: z.string(),
  tier: z.string(),
  time: z.string(),
  type: z.string(),
  wave: z.string(),
  note: z.string().optional(),
  fileId: z.string().nullable().optional(),
  screenshotUrl: z.string().nullable().optional(),
  verified: z.union([z.boolean(), z.number(), z.string(), z.null()]).optional(),
  blocked: z.union([z.boolean(), z.number(), z.string(), z.null()]).optional(),
  banned: z.union([z.boolean(), z.number(), z.string(), z.null()]).optional(),
  public: z.union([z.boolean(), z.number(), z.string(), z.null()]).optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  deletedAt: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  gameTime: z.string().optional(),
  coinsPerHour: z.string().optional(),
  cellsPerHour: z.string().optional(),
  rerollShardsPerHour: z.string().optional(),
  cashEarned: z.string().optional(),
  interestEarned: z.string().optional(),
  gemBlocksTapped: z.string().optional(),
  damageTaken: z.string().optional(),
  damageTakenWall: z.string().optional(),
  damageTakenWhileBerserked: z.string().optional(),
  damageGainFromBerserk: z.string().optional(),
  deathDefy: z.string().optional(),
  damageDealt: z.string().optional(),
  projectilesDamage: z.string().optional(),
  rendArmorDamage: z.string().optional(),
  projectilesCount: z.string().optional(),
  lifesteal: z.string().optional(),
  thornDamage: z.string().optional(),
  orbDamage: z.string().optional(),
  enemiesHitByOrbs: z.string().optional(),
  landMineDamage: z.string().optional(),
  landMinesSpawned: z.string().optional(),
  deathRayDamage: z.string().optional(),
  smartMissileDamage: z.string().optional(),
  innerLandMineDamage: z.string().optional(),
  chainLightningDamage: z.string().optional(),
  deathWaveDamage: z.string().optional(),
  taggedByDeathWave: z.string().optional(),
  swampDamage: z.string().optional(),
  blackHoleDamage: z.string().optional(),
  spotlightDamage: z.string().optional(),
  electronsDamage: z.string().optional(),
  wavesSkipped: z.string().optional(),
  recoveryPackages: z.string().optional(),
  freeAttackUpgrade: z.string().optional(),
  freeDefenseUpgrade: z.string().optional(),
  freeUtilityUpgrade: z.string().optional(),
  hpFromDeathWave: z.string().optional(),
  coinsFromDeathWave: z.string().optional(),
  cashFromGoldenTower: z.string().optional(),
  coinsFromGoldenTower: z.string().optional(),
  coinsFromBlackhole: z.string().optional(),
  coinsFromSpotlight: z.string().optional(),
  coinsFromOrbs: z.string().optional(),
  coinsFromCoinUpgrade: z.string().optional(),
  coinsFromCoinBonuses: z.string().optional(),
  totalEnemies: z.string().optional(),
  basic: z.string().optional(),
  fast: z.string().optional(),
  tank: z.string().optional(),
  ranged: z.string().optional(),
  boss: z.string().optional(),
  protector: z.string().optional(),
  totalElites: z.string().optional(),
  vampires: z.string().optional(),
  rays: z.string().optional(),
  scatters: z.string().optional(),
  saboteurs: z.string().optional(),
  commanders: z.string().optional(),
  overcharges: z.string().optional(),
  destroyedByOrbs: z.string().optional(),
  destroyedByThorns: z.string().optional(),
  destroyedByDeathRay: z.string().optional(),
  destroyedByLandMine: z.string().optional(),
  destroyedInSpotlight: z.string().optional(),
  flameBotDamage: z.string().optional(),
  thunderBotStuns: z.string().optional(),
  goldenBotCoinsEarned: z.string().optional(),
  destroyedInGoldenBot: z.string().optional(),
  guardianDamage: z.string().optional(),
  guardianSummonedEnemies: z.string().optional(),
  guardianCoinsStolen: z.string().optional(),
  coinsFetched: z.string().optional(),
  gemsFetched: z.string().optional(),
  medalsFetched: z.string().optional(),
  rerollShardsFetched: z.string().optional(),
  cannonShardsFetched: z.string().optional(),
  armorShardsFetched: z.string().optional(),
  generatorShardsFetched: z.string().optional(),
  coreShardsFetched: z.string().optional(),
  commonModulesFetched: z.string().optional(),
  rareModulesFetched: z.string().optional(),
  highestCoinsPerMinute: z.string().optional(),
  largestWaveSkip: z.string().optional(),
  mostCoinsFromWaveSkip: z.string().optional(),
  mostCellsFromWaveSkip: z.string().optional(),
  largestSmartMissileStack: z.string().optional(),
  largestGoldenCombo: z.string().optional(),
  mostCoinsFromGoldenCombo: z.string().optional(),
  largestInnerLandmineCharge: z.string().optional(),
  attackChipDamage: z.string().optional(),
  towerHealthRegen: z.string().optional(),
  wallHealthRegen: z.string().optional(),
  defensePercentBlocked: z.string().optional(),
  defenseAbsoluteBlocked: z.string().optional(),
  chronoFieldBlocked: z.string().optional(),
  chainThunderBlocked: z.string().optional(),
  flameBotBlocked: z.string().optional(),
  primordialCollapseBlocked: z.string().optional(),
  negativeMassProjectorBlocked: z.string().optional(),
  enemyAttackLevelsSkipped: z.string().optional(),
  enemyHealthLevelsSkipped: z.string().optional(),
  hitsAbsorbedByEnergyShield: z.string().optional(),
  nukeCount: z.string().optional(),
  secondWindCount: z.string().optional(),
  demonModeCount: z.string().optional(),
  enemiesHitByProjectiles: z.string().optional(),
  enemiesHitByThorns: z.string().optional(),
  enemiesHitByDeathRay: z.string().optional(),
  enemiesHitByChainLightning: z.string().optional(),
  enemiesHitBySmartMissiles: z.string().optional(),
  enemiesHitByInnerLandMines: z.string().optional(),
  enemiesHitByPoisonSwamp: z.string().optional(),
  enemiesHitByBlackHole: z.string().optional(),
  enemiesHitByChronoField: z.string().optional(),
  enemiesHitByLandMines: z.string().optional(),
  enemiesHitByThunderBot: z.string().optional(),
  enemiesHitByFlameBot: z.string().optional(),
  enemiesHitByAttackChip: z.string().optional(),
  enemiesHitByOrbitalAugment: z.string().optional(),
  killsWithGoldenTower: z.string().optional(),
  killsWithDeathWave: z.string().optional(),
  killsWithAmplifyBot: z.string().optional(),
  killsWithDeathPenalty: z.string().optional(),
  killsWithBlackHole: z.string().optional(),
  killsWithOrbs: z.string().optional(),
  criticalCoinCoins: z.string().optional(),
  coinsPerKill: z.string().optional(),
  coinsFromGoldenCombo: z.string().optional(),
  coinsFromWaveSkip: z.string().optional(),
  coinsPerWave: z.string().optional(),
  bountyCoins: z.string().optional(),
  gemsEarned: z.string().optional(),
  adGemsEarned: z.string().optional(),
  fetchGems: z.string().optional(),
  medalsEarned: z.string().optional(),
  destroyedByProjectiles: z.string().optional(),
  destroyedByChainLightning: z.string().optional(),
  destroyedBySmartMissiles: z.string().optional(),
  destroyedByInnerLandMines: z.string().optional(),
  destroyedByPoisonSwamp: z.string().optional(),
  destroyedByBlackHole: z.string().optional(),
  destroyedByFlameBot: z.string().optional(),
  destroyedByOther: z.string().optional(),
}).strict()

export type TrackerRunCloudWrite = z.infer<typeof trackerRunCloudWriteSchema>

export const trackerLifetimeCloudDocumentSchema = z.object({
  ...trackerAppwriteDocumentSystemShape,
  ...trackerLifetimeOptionalFieldShape,
}).strict()

export type TrackerLifetimeCloudDocument = z.infer<typeof trackerLifetimeCloudDocumentSchema>

export const trackerLifetimeCloudWriteSchema = z.object({
  userId: z.string(),
  username: z.string(),
  date: z.string(),
  gameStarted: z.string(),
  coinsEarned: z.string(),
  recentCoinsPerHour: z.string().optional(),
  cashEarned: z.string(),
  stonesEarned: z.string(),
  keysEarned: z.string(),
  cellsEarned: z.string().optional(),
  rerollShardsEarned: z.string().optional(),
  damageDealt: z.string(),
  enemiesDestroyed: z.string(),
  wavesCompleted: z.string(),
  upgradesBought: z.string(),
  workshopUpgrades: z.string(),
  workshopCoinsSpent: z.string(),
  researchCompleted: z.string(),
  labCoinsSpent: z.string(),
  freeUpgrades: z.string(),
  interestEarned: z.string(),
  orbKills: z.string(),
  deathRayKills: z.string(),
  thornDamage: z.string(),
  wavesSkipped: z.string(),
  screenshotUrl: z.string().nullable().optional(),
  verified: z.union([z.boolean(), z.number(), z.string(), z.null()]).optional(),
  blocked: z.union([z.boolean(), z.number(), z.string(), z.null()]).optional(),
}).strict()

export type TrackerLifetimeCloudWrite = z.infer<typeof trackerLifetimeCloudWriteSchema>

function pickFirstDefinedValue(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) {
      const value = record[key]
      if (value !== null && value !== undefined) {
        return value
      }
    }
  }

  return undefined
}

function isScalarRunFieldValue(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function normalizeTrackerBooleanLike(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function asStringOrUndefined(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  return String(value)
}

export function pickString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const text = String(value).trim()
  return text.length > 0 ? text : undefined
}

function asStringOrNumberOrUndefined(value: unknown): string | number | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number' || typeof value === 'string') return value
  return String(value)
}

function setTrackerStringIfPresent(entry: Record<string, unknown>, key: string, value: unknown): void {
  const normalized = pickTrackerRunField({ value }, ['value'])
  if (normalized) {
    entry[key] = normalized
  }
}

export function stripUndefinedFields<T extends Record<string, unknown>>(value: T): T {
  const entries = Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  return Object.fromEntries(entries) as T
}

export function sanitizeTrackerRunCloudPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => TRACKER_RUN_CLOUD_ALLOWED_FIELDS.has(key)),
  )
}

export function pickTrackerRunField(run: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = run[key]
    if (value === null || value === undefined) continue
    const text = String(value).trim()
    if (text.length > 0) return text
  }
  return undefined
}

export function collectTrackerRunScalarFields(
  ...sources: Array<Record<string, unknown> | null | undefined>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) continue
      if (TRACKER_RUN_NON_ATTRIBUTE_KEYS.has(key)) continue
      if (!isScalarRunFieldValue(value)) continue
      payload[key] = value
    }
  }
  return payload
}

export function readTrackerRunCoverageData(source: Record<string, unknown>): Record<string, unknown> {
  return stripUndefinedFields({
    totalEnemies: source.totalEnemies ?? source['Total Enemies'],
    killsWithGoldenTower: source.killsWithGoldenTower ?? source['Golden Tower'],
    enemiesHitByOrbs: source.enemiesHitByOrbs ?? source['Enemies Hit by Orbs'],
    destroyedByOrbs: source.destroyedByOrbs ?? source['Destroyed By Orbs'],
    destroyedByBlackHole: source.destroyedByBlackHole ?? source['Destroyed By Black Hole'] ?? source['Black Hole'],
    taggedByDeathWave: source.taggedByDeathWave ?? source['Tagged by Death Wave'],
    destroyedInSpotlight: source.destroyedInSpotlight ?? source['Destroyed in Spotlight'],
    destroyedInGoldenBot: source.destroyedInGoldenBot ?? source['Destroyed in Golden Bot'],
    killsWithAmplifyBot: source.killsWithAmplifyBot ?? source['Amplify Bot'],
    guardianSummonedEnemies: source.guardianSummonedEnemies ?? source['Summoned enemies'],
  })
}

export function normalizeTrackerRunIdentityValue(value: unknown): string {
  return String(value ?? '').trim()
}

export function normalizeTrackerRunDurationForIdentity(value: unknown): string {
  const normalized = String(value ?? '').toLowerCase().replace(/\s+/g, '')
  const hours = normalized.match(/(\d+)h/)?.[1] ?? '0'
  const minutes = normalized.match(/(\d+)m/)?.[1] ?? '0'
  const seconds = normalized.match(/(\d+)s/)?.[1] ?? '0'
  return `${hours}h${minutes}m${seconds}s`
}

export function trackerRunsShareDuplicateIdentity(
  existing: Record<string, unknown>,
  candidate: Record<string, unknown>,
): boolean {
  const existingTier = normalizeTrackerRunIdentityValue(pickFirstDefinedValue(existing, ['tier', 'Tier']))
  const candidateTier = normalizeTrackerRunIdentityValue(pickFirstDefinedValue(candidate, ['tier', 'Tier']))
  if (!existingTier || !candidateTier || existingTier !== candidateTier) return false

  const existingWave = normalizeTrackerRunIdentityValue(pickFirstDefinedValue(existing, ['wave', 'Wave']))
  const candidateWave = normalizeTrackerRunIdentityValue(pickFirstDefinedValue(candidate, ['wave', 'Wave']))
  if (!existingWave || !candidateWave || existingWave !== candidateWave) return false

  const existingDuration = normalizeTrackerRunDurationForIdentity(
    pickFirstDefinedValue(existing, ['duration', 'roundDuration', 'Real Time']),
  )
  const candidateDuration = normalizeTrackerRunDurationForIdentity(
    pickFirstDefinedValue(candidate, ['duration', 'roundDuration', 'Real Time']),
  )
  if (!existingDuration || !candidateDuration || existingDuration !== candidateDuration) return false

  const existingCoins = normalizeTrackerRunIdentityValue(
    pickFirstDefinedValue(existing, ['coins', 'totalCoins', 'Coins earned']),
  )
  const candidateCoins = normalizeTrackerRunIdentityValue(
    pickFirstDefinedValue(candidate, ['coins', 'totalCoins', 'Coins earned']),
  )
  if (!existingCoins || !candidateCoins || existingCoins !== candidateCoins) return false

  return true
}

export function parseTrackerTimestampCandidate(candidate: unknown): number {
  if (candidate === null || candidate === undefined) return 0

  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    if (candidate > 0 && candidate < 10_000_000_000) return candidate * 1000
    return candidate > 0 ? candidate : 0
  }

  const raw = String(candidate).trim()
  if (!raw) return 0

  if (/^\d{10,16}$/.test(raw)) {
    const numeric = Number(raw)
    if (Number.isFinite(numeric)) {
      if (numeric > 0 && numeric < 10_000_000_000) return numeric * 1000
      return numeric > 0 ? numeric : 0
    }
  }

  const parsed = new Date(raw).getTime()
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return 0
}

export function parseTrackerRunDateTimeTimestamp(run: Record<string, unknown>): number {
  const rawDate = String(run.runDate ?? run.date ?? '').trim()
  const rawTime = String(run.runTime ?? run.time ?? '').trim()
  if (!rawDate && !rawTime) return 0

  const parsedMs = parseSaveDateTimeToMs(`${rawDate} ${rawTime}`.trim())
    ?? parseSaveDateTimeToMs(rawDate)
    ?? parseSaveDateTimeToMs(rawTime)
    ?? parseSaveDateTimeToMs(run.battleDate)
  if (parsedMs != null) return parsedMs

  const mdy = rawDate.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})$/)
  if (mdy) {
    const month = Number(mdy[1])
    const day = Number(mdy[2])
    const year = Number(mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3])
    if (Number.isFinite(month) && Number.isFinite(day) && Number.isFinite(year)) {
      const isoLikeDate = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      const normalized = parseTrackerTimestampCandidate(`${isoLikeDate} ${rawTime}`.trim())
      if (normalized > 0) return normalized
    }
  }

  return 0
}

export function estimateTrackerRunTimestamp(run: Record<string, unknown>): number {
  const candidates = [
    run.updatedAt,
    run.createdAt,
    run.$updatedAt,
    run.$createdAt,
    run.reportTimestamp,
    run['Battle Date'],
    run.battleDate,
  ]

  for (const candidate of candidates) {
    const parsed = parseTrackerTimestampCandidate(candidate)
    if (parsed > 0) return parsed
  }

  return parseTrackerRunDateTimeTimestamp(run)
}

export function stripTrackerRunVolatileFields(
  entry: Record<string, unknown> | null | undefined,
  volatileKeys: string[] = ['updatedAt'],
): Record<string, unknown> {
  if (!entry || typeof entry !== 'object') return {}
  const clone = { ...entry }
  for (const key of volatileKeys) {
    delete clone[key]
  }
  return clone
}

export function hasMaterialTrackerRunEntryChange(
  existing: Record<string, unknown> | null,
  nextEntry: Record<string, unknown>,
  volatileKeys: string[] = ['updatedAt'],
): boolean {
  if (!existing) return true
  return stableSerialize(stripTrackerRunVolatileFields(existing, volatileKeys))
    !== stableSerialize(stripTrackerRunVolatileFields(nextEntry, volatileKeys))
}

export function buildTrackerRunFingerprint(run: Record<string, unknown>): string {
  const type = String(run.type ?? 'Farming').toLowerCase()
  const tier = String(run.tierDisplay ?? run.tier ?? '').trim()
  const wave = String(run.wave ?? '').trim()
  const duration = String(run.roundDuration ?? run.duration ?? '').trim()
  const date = String(run.runDate ?? run.date ?? '').trim()
  const time = String(run.runTime ?? run.time ?? '').trim()
  const coins = String(run.coins ?? '').trim()
  const cells = String(run.cells ?? '').trim()
  const rerollShards = String(run.rerollShards ?? '').trim()
  const killedBy = String(run.killedBy ?? '').trim().toLowerCase()
  return `${type}|${tier}|${wave}|${duration}|${date}|${time}|${coins}|${cells}|${rerollShards}|${killedBy}`
}

export function buildTrackerRunIdentityKey(run: Record<string, unknown>): string {
  const runId = pickTrackerRunField(run, ['runId', 'id', '$id'])
  if (runId) return `runId:${runId}`

  const localId = pickTrackerRunField(run, ['localId'])
  if (localId) return `localId:${localId}`

  return `fp:${buildTrackerRunFingerprint(run)}`
}

export function normalizeTrackerRunType(value: unknown): string {
  const str = String(value ?? 'Farming').trim()
  if (!str) return 'Farming'
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function normalizeTrackerRunTextValue(value: unknown, fallback: string): string {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : fallback
}

export function normalizeTrackerRunMetricValue(value: unknown, fallback = '0'): string {
  return normalizeTrackerRunTextValue(value, fallback).replace(',', '.')
}

export function hydrateTrackerRunEntryFromDocument(
  doc: Record<string, unknown>,
  options?: { fallbackId?: string },
): Record<string, unknown> {
  const fileId = pickTrackerRunField(doc, ['fileId'])
  const screenshotUrl = pickTrackerRunField(doc, ['screenshotUrl'])
  const hasImage = Boolean(fileId || screenshotUrl)
  const isVerified = normalizeTrackerBooleanLike(doc.verified) && hasImage
  const createdAt = pickTrackerRunField(doc, ['$createdAt', 'createdAt'])
  const updatedAt = pickTrackerRunField(doc, ['$updatedAt', 'updatedAt', 'reportTimestamp']) ?? createdAt

  const entry: Record<string, unknown> = {
    id: pickTrackerRunField(doc, ['$id', 'id']) ?? options?.fallbackId ?? 'unknown-run-id',
    tier: String(doc.tier ?? ''),
    wave: String(doc.wave ?? ''),
    coins: String(doc.coins ?? ''),
    cells: String(doc.cells ?? ''),
    rerollShards: String(doc.rerollShards ?? ''),
    duration: String(doc.duration ?? ''),
    killedBy: String(doc.killedBy ?? ''),
    date: normalizeTrackerDateText(doc.date),
    time: normalizeTrackerTimeText(doc.time),
    type: String(doc.type ?? ''),
    runDate: normalizeTrackerDateText(doc.runDate),
    runTime: normalizeTrackerTimeText(doc.runTime),
    hasImage,
    isVerified,
    verified: isVerified,
  }

  for (const key of TRACKER_RUN_OPTIONAL_STRING_FIELDS) {
    setTrackerStringIfPresent(entry, key, doc[key])
  }

  if (fileId) entry.fileId = fileId
  if (screenshotUrl) entry.screenshotUrl = screenshotUrl
  if (createdAt) entry.createdAt = createdAt
  if (updatedAt) entry.updatedAt = updatedAt

  const reportTimestamp = pickTrackerRunField(doc, ['reportTimestamp'])
  if (reportTimestamp) {
    entry.reportTimestamp = reportTimestamp
  }
  if (normalizeTrackerBooleanLike(doc.blocked) || normalizeTrackerBooleanLike(doc.banned)) {
    entry.blocked = true
  }

  return entry
}

export function hydrateTrackerCloudRun(
  raw: Record<string, unknown>,
  userId: string,
  username: string,
): Record<string, unknown> {
  const runType = raw.type ? normalizeTrackerRunType(raw.type) : 'Farming'
  const coverage = readTrackerRunCoverageData(raw)
  const runDateValue = raw.runDate ?? raw.date
  const runTimeValue = raw.runTime ?? raw.time
  const importDateValue = raw.date ?? raw.runDate
  const importTimeValue = raw.time ?? raw.runTime
  const updatedAtValue =
    raw.updatedAt
    ?? raw.$updatedAt
    ?? raw.reportTimestamp
    ?? `${String(importDateValue ?? '')} ${String(importTimeValue ?? '')}`
  const createdAtValue = raw.createdAt ?? raw.$createdAt ?? raw.reportTimestamp ?? updatedAtValue

  return {
    ...raw,
    userId,
    runId: pickTrackerRunField(raw, ['runId', 'id', '$id']),
    username,
    type: runType,
    tierDisplay: asStringOrNumberOrUndefined(raw.tierDisplay),
    tier: asStringOrNumberOrUndefined(raw.tier ?? raw.Tier),
    wave: asStringOrNumberOrUndefined(raw.wave ?? raw.Wave),
    totalCoins: asStringOrNumberOrUndefined(raw.totalCoins ?? raw.coins),
    totalCells: asStringOrNumberOrUndefined(raw.totalCells ?? raw.cells),
    totalDice: asStringOrNumberOrUndefined(raw.totalDice ?? raw.dice ?? raw.rerollShards),
    ...coverage,
    roundDuration: asStringOrUndefined(raw.roundDuration ?? raw.duration),
    duration: asStringOrUndefined(raw.duration ?? raw.roundDuration),
    date: normalizeTrackerDateText(importDateValue),
    time: normalizeTrackerTimeText(importTimeValue),
    runDate: normalizeTrackerDateText(runDateValue),
    runTime: normalizeTrackerTimeText(runTimeValue),
    note: raw.note ?? raw.notes ?? '',
    notes: raw.notes ?? raw.note ?? '',
    updatedAt: asStringOrNumberOrUndefined(updatedAtValue),
    createdAt: asStringOrNumberOrUndefined(createdAtValue),
  }
}

export function parseTrackerRunCloudWrite(input: Record<string, unknown>): TrackerRunCloudWrite {
  return trackerRunCloudWriteSchema.parse(input)
}

export function buildTrackerRunCloudWritePayload(input: {
  userId: string
  username: string
  runData: Record<string, unknown>
  canonicalRunData?: Record<string, unknown> | null
  screenshotUrl?: string | null
}): TrackerRunCloudWrite {
  const rawRunData = input.runData ?? {}
  const rawCanonicalRunData = input.canonicalRunData ?? {}
  const normalizedRunData = canonicalizeTrackerRunData(rawRunData)
  const normalizedCanonicalRunData = input.canonicalRunData ? canonicalizeTrackerRunData(input.canonicalRunData) : null
  const mergedForSerialization = {
    ...rawCanonicalRunData,
    ...rawRunData,
    ...normalizedCanonicalRunData,
    ...normalizedRunData,
  }
  const serializedRaw = serializeTrackerRunForCloudAttributes(mergedForSerialization)
  const serialized = { ...serializedRaw }
  delete serialized.blocked
  delete serialized.public
  delete serialized.banned
  const combined = {
    ...rawCanonicalRunData,
    ...rawRunData,
    ...serialized,
  }

  const payload = {
    ...serialized,
    userId: input.userId,
    username: input.username,
    note: pickTrackerRunField(combined, ['note', 'notes']),
    cells: normalizeTrackerRunMetricValue(pickTrackerRunField(combined, ['totalCells', 'cells']) ?? '0'),
    coins: normalizeTrackerRunMetricValue(pickTrackerRunField(combined, ['totalCoins', 'coins']) ?? '0'),
    date: normalizeTrackerDateText(pickTrackerRunField(combined, ['date', 'runDate']) ?? ''),
    duration: normalizeTrackerRunTextValue(pickTrackerRunField(combined, ['roundDuration', 'duration']) ?? '', '0h0m0s'),
    killedBy: normalizeTrackerRunTextValue(pickTrackerRunField(combined, ['killedBy']) ?? '', 'Apathy'),
    rerollShards: normalizeTrackerRunMetricValue(pickTrackerRunField(combined, ['totalDice', 'rerollShards', 'dice']) ?? '0'),
    runDate: normalizeTrackerDateText(pickTrackerRunField(combined, ['runDate', 'date']) ?? ''),
    runTime: normalizeTrackerTimeText(pickTrackerRunField(combined, ['runTime', 'time']) ?? ''),
    tier: normalizeTrackerRunTextValue(pickTrackerRunField(combined, ['tier']) ?? '', '1'),
    time: normalizeTrackerTimeText(pickTrackerRunField(combined, ['time', 'runTime']) ?? ''),
    type: normalizeTrackerRunType(pickTrackerRunField(combined, ['type']) ?? 'Farming'),
    wave: normalizeTrackerRunTextValue(pickTrackerRunField(combined, ['wave']) ?? '', '1'),
    ...(input.screenshotUrl ? { screenshotUrl: input.screenshotUrl } : {}),
  }

  return parseTrackerRunCloudWrite(sanitizeTrackerRunCloudPayload(payload))
}

export function parseTrackerLifetimeCloudWrite(input: Record<string, unknown>): TrackerLifetimeCloudWrite {
  return trackerLifetimeCloudWriteSchema.parse(input)
}
