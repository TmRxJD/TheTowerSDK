import { describe, expect, it } from 'vitest'
import {
  buildTrackerRunCloudWritePayload,
  buildTrackerRunFingerprint,
  readTrackerRunCoverageData,
  hydrateTrackerCloudRun,
  hydrateTrackerRunEntryFromDocument,
  normalizeTrackerDateText,
  normalizeTrackerTimeText,
  parseTrackerRunDateTimeTimestamp,
  pickString,
  trackerRunCloudDocumentReadSchema,
  trackerRunCloudDocumentSchema,
  trackerRunCloudWriteSchema,
  trackerRunsShareDuplicateIdentity,
} from './tracker-cloud-schemas'

describe('tracker cloud schemas', () => {
  it('extracts coverage from canonical labels without conflating orb metrics', () => {
    expect(
      readTrackerRunCoverageData({
        ['Total Enemies']: '5000',
        ['Golden Tower']: '3300',
        ['Destroyed By Orbs']: '1200',
        ['Black Hole']: '900',
        ['Tagged by Death Wave']: '600',
        ['Amplify Bot']: '450',
        ['Summoned enemies']: '75',
      }),
    ).toEqual({
      totalEnemies: '5000',
      killsWithGoldenTower: '3300',
      destroyedByOrbs: '1200',
      destroyedByBlackHole: '900',
      taggedByDeathWave: '600',
      killsWithAmplifyBot: '450',
      guardianSummonedEnemies: '75',
    })
  })

  it('matches duplicate identity with canonical coin labels only', () => {
    const existing = {
      tier: '11',
      wave: '7676',
      duration: '9h54m5s',
      coins: '76.37T',
    }

    expect(
      trackerRunsShareDuplicateIdentity(existing, {
        Tier: '11',
        Wave: '7676',
        ['Real Time']: '9h 54m 5s',
        ['Coins earned']: '76.37T',
      }),
    ).toBe(true)

    expect(
      trackerRunsShareDuplicateIdentity(existing, {
        Tier: '11',
        Wave: '7676',
        ['Real Time']: '9h 54m 5s',
        ['Coins Earned']: '76.37T',
      }),
    ).toBe(false)
  })

  it('prefers run date and time for run-oriented parsing and fingerprinting', () => {
    const run = {
      type: 'Farming',
      tier: '11',
      wave: '7676',
      duration: '1h2m3s',
      date: '2026-03-23',
      time: '14:00:00',
      runDate: '2026-03-22',
      runTime: '09:15:00',
    }

    expect(parseTrackerRunDateTimeTimestamp(run)).toBe(new Date('2026-03-22 09:15:00').getTime())
    expect(buildTrackerRunFingerprint(run)).toContain('2026-03-22|09:15:00')
  })

  it('normalizes legacy run date and time strings without defaulting blanks', () => {
    expect(normalizeTrackerDateText('3/22/2026')).toBe('2026-03-22')
    expect(normalizeTrackerTimeText('9:15 AM')).toBe('09:15:00')
    expect(normalizeTrackerDateText('')).toBe('')
    expect(normalizeTrackerTimeText('')).toBe('')
  })

  it('normalizes tracker cloud write payload date fields', () => {
    const payload = buildTrackerRunCloudWritePayload({
      userId: '123456789012345678',
      username: 'tester',
      runData: {
        date: '2026-03-23',
        time: '14:00:00',
        runDate: '3/22/2026',
        runTime: '9:15 AM',
        tier: '11',
        wave: '7676',
        duration: '1h2m3s',
        coins: '10.1T',
        cells: '123',
        rerollShards: '8',
        killedBy: 'Apathy',
        type: 'farming',
      },
    })

    expect(payload).toMatchObject({
      date: '2026-03-23',
      time: '14:00:00',
      runDate: '2026-03-22',
      runTime: '09:15:00',
      type: 'Farming',
    })
  })

  it('rejects unknown tracker run document and write attributes', () => {
    expect(() => buildTrackerRunCloudWritePayload({
      userId: '123456789012345678',
      username: 'tester',
      runData: {
        tier: '11',
        wave: '7676',
        duration: '1h2m3s',
        coins: '10.1T',
        cells: '123',
        rerollShards: '8',
        killedBy: 'Apathy',
        type: 'farming',
        unknownField: 'should-not-pass',
      },
    })).not.toThrow()

    expect(() => trackerRunCloudWriteSchema.parse({
      userId: '123456789012345678',
      username: 'tester',
      tier: '11',
      wave: '7676',
      duration: '1h2m3s',
      coins: '10.1T',
      cells: '123',
      rerollShards: '8',
      killedBy: 'Apathy',
      date: '2026-03-22',
      time: '09:15:00',
      runDate: '2026-03-22',
      runTime: '09:15:00',
      type: 'Farming',
      unknownField: 'should-not-pass',
    })).toThrow()

    expect(() => trackerRunCloudDocumentSchema.parse({
      $id: 'run-1',
      $collectionId: 'runs',
      $databaseId: 'run-tracker-data',
      $createdAt: '2026-03-23T14:00:00.000Z',
      $updatedAt: '2026-03-23T14:05:00.000Z',
      $permissions: [],
      userId: '123456789012345678',
      username: 'tester',
      tier: '11',
      wave: '7676',
      duration: '1h2m3s',
      coins: '10.1T',
      cells: '123',
      rerollShards: '8',
      killedBy: 'Apathy',
      date: '2026-03-22',
      time: '09:15:00',
      runDate: '2026-03-22',
      runTime: '09:15:00',
      type: 'Farming',
      unknownField: 'should-not-pass',
    })).toThrow()
  })

  it('accepts unknown Appwrite fields on cloud read schema', () => {
    const parsed = trackerRunCloudDocumentReadSchema.safeParse({
      $id: 'run-1',
      userId: '123456789012345678',
      username: 'tester',
      tier: '11',
      wave: '7676',
      duration: '1h2m3s',
      coins: '10.1T',
      cells: '123',
      rerollShards: '8',
      killedBy: 'Apathy',
      date: '2026-03-22',
      time: '09:15:00',
      runDate: '2026-03-22',
      runTime: '09:15:00',
      type: 'Farming',
      unknownField: 'allowed-on-read',
    })

    expect(parsed.success).toBe(true)
  })

  it('accepts null Appwrite datetime meta fields on existing run documents', () => {
    const parsed = trackerRunCloudDocumentSchema.safeParse({
      $id: 'run-1',
      $collectionId: 'runs',
      $databaseId: 'run-tracker-data',
      $createdAt: '2026-03-23T14:00:00.000Z',
      $updatedAt: '2026-03-23T14:05:00.000Z',
      $permissions: [],
      userId: '123456789012345678',
      username: 'tester',
      tier: '11',
      wave: '7676',
      duration: '1h2m3s',
      coins: '10.1T',
      cells: '123',
      rerollShards: '8',
      killedBy: 'Apathy',
      date: '2026-03-22',
      time: '09:15:00',
      runDate: '2026-03-22',
      runTime: '09:15:00',
      type: 'Farming',
      createdAt: null,
      updatedAt: null,
      deletedAt: null,
    })

    expect(parsed.success).toBe(true)
  })

  it('hydrates cloud runs with distinct added and run timestamps', () => {
    const hydrated = hydrateTrackerCloudRun({
      id: 'run-1',
      date: '2026-03-23',
      time: '14:00:00',
      runDate: '2026-03-22',
      runTime: '09:15:00',
      createdAt: '2026-03-23T14:00:00.000Z',
      type: 'farming',
    }, 'user-1', 'tester')

    expect(hydrated).toMatchObject({
      date: '2026-03-23',
      time: '14:00:00',
      runDate: '2026-03-22',
      runTime: '09:15:00',
      type: 'Farming',
      userId: 'user-1',
      username: 'tester',
    })
  })

  it('preserves spotlight damage in tracker run cloud payloads and hydrated documents', () => {
    const payload = buildTrackerRunCloudWritePayload({
      userId: '123456789012345678',
      username: 'tester',
      runData: {
        date: '2026-03-23',
        time: '14:00:00',
        runDate: '2026-03-22',
        runTime: '09:15:00',
        tier: '11',
        wave: '7676',
        duration: '1h2m3s',
        coins: '10.1T',
        cells: '123',
        rerollShards: '8',
        killedBy: 'Apathy',
        type: 'farming',
        spotlightDamage: '1.25Q',
      },
    })

    expect(payload.spotlightDamage).toBe('1.25Q')
    expect(() => trackerRunCloudWriteSchema.parse(payload)).not.toThrow()

    const hydrated = hydrateTrackerRunEntryFromDocument({
      $id: 'run-1',
      date: '2026-03-23',
      time: '14:00:00',
      runDate: '2026-03-22',
      runTime: '09:15:00',
      tier: '11',
      wave: '7676',
      duration: '1h2m3s',
      coins: '10.1T',
      cells: '123',
      rerollShards: '8',
      killedBy: 'Apathy',
      type: 'Farming',
      spotlightDamage: '1.25Q',
    })

    expect(hydrated.spotlightDamage).toBe('1.25Q')
  })

  it('accepts legacy run documents with public and banned fields', () => {
    expect(() => trackerRunCloudDocumentSchema.parse({
      $id: 'run-legacy-1',
      $collectionId: 'runs',
      $databaseId: 'run-tracker-data',
      $createdAt: '2026-03-23T14:00:00.000Z',
      $updatedAt: '2026-03-23T14:05:00.000Z',
      $permissions: [],
      userId: '123456789012345678',
      username: 'tester',
      tier: '11',
      wave: '7676',
      duration: '1h2m3s',
      coins: '10.1T',
      cells: '123',
      rerollShards: '8',
      killedBy: 'Apathy',
      date: '2026-03-22',
      time: '09:15:00',
      runDate: '2026-03-22',
      runTime: '09:15:00',
      type: 'Farming',
      public: false,
      banned: false,
    })).not.toThrow()
  })

  it('accepts prod bot run documents with nullable optional metrics', () => {
    expect(() => trackerRunCloudDocumentSchema.parse({
      $id: 'run-legacy-null-1',
      $collectionId: 'runs',
      $databaseId: 'run-tracker-data',
      $createdAt: '2026-04-08T02:38:10.370Z',
      $updatedAt: '2026-04-08T02:38:10.370Z',
      $permissions: [],
      userId: '371914184822095873',
      username: 'tester',
      tier: '20',
      wave: '4957',
      duration: '3h1m2s',
      coins: '12.3Q',
      cells: '456',
      rerollShards: '789',
      killedBy: 'Boss',
      date: '2026-04-08',
      time: '02:38:09',
      runDate: '2026-04-08',
      runTime: '02:38:09',
      type: 'Farming',
      public: false,
      banned: false,
      totalEnemies: null,
      coinsFromDeathWave: null,
      destroyedByOrbs: null,
      rareModulesFetched: null,
    })).not.toThrow()
  })

  it('accepts updated battle report metrics in run documents and write payloads', () => {
    expect(() => trackerRunCloudDocumentSchema.parse({
      $id: 'run-updated-1',
      $collectionId: 'runs',
      $databaseId: 'run-tracker-data',
      $createdAt: '2026-04-08T02:38:10.370Z',
      $updatedAt: '2026-04-08T02:38:10.370Z',
      $permissions: [],
      userId: '371914184822095873',
      username: 'tester',
      tier: '18',
      wave: '4970',
      duration: '3h48m47s',
      coins: '1.30Q',
      cells: '550.81K',
      rerollShards: '50.33K',
      killedBy: 'Apathy',
      date: '2026-04-06',
      time: '11:03:00',
      runDate: '2026-04-06',
      runTime: '11:03:00',
      type: 'Farming',
      highestCoinsPerMinute: '11.40q',
      defensePercentBlocked: '341.24Q',
      enemyAttackLevelsSkipped: '2731',
      enemiesHitByProjectiles: '581.51K',
      killsWithGoldenTower: '599945',
      criticalCoinCoins: '3.35q',
      gemsEarned: '140',
      destroyedByProjectiles: '914',
      destroyedByOther: '0',
    })).not.toThrow()

    expect(() => trackerRunCloudWriteSchema.parse({
      userId: '371914184822095873',
      username: 'tester',
      tier: '18',
      wave: '4970',
      duration: '3h48m47s',
      coins: '1.30Q',
      cells: '550.81K',
      rerollShards: '50.33K',
      killedBy: 'Apathy',
      date: '2026-04-06',
      time: '11:03:00',
      runDate: '2026-04-06',
      runTime: '11:03:00',
      type: 'Farming',
      highestCoinsPerMinute: '11.40q',
      defensePercentBlocked: '341.24Q',
      enemyAttackLevelsSkipped: '2731',
      enemiesHitByProjectiles: '581.51K',
      killsWithGoldenTower: '599945',
      criticalCoinCoins: '3.35q',
      gemsEarned: '140',
      destroyedByProjectiles: '914',
      destroyedByOther: '0',
    })).not.toThrow()
  })

  it('picks trimmed strings from mixed values', () => {
    expect(pickString('  hello  ')).toBe('hello')
    expect(pickString('   ')).toBeUndefined()
    expect(pickString(null)).toBeUndefined()
  })
})
