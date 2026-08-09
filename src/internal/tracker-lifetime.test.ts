import { describe, expect, it } from 'vitest'
import {
  buildTrackerLifetimeCloudPatch,
  buildTrackerLifetimeCloudWritePayload,
  normalizeTrackerLifetimeDate,
  normalizeTrackerLifetimeDateText,
  normalizeTrackerLifetimeEntryValues,
} from './tracker-lifetime'

describe('tracker lifetime helper', () => {
  it('normalizes lifetime entry values and preserves cloud write extras', () => {
    const normalized = normalizeTrackerLifetimeEntryValues({
      coinsEarned: '1,25',
      cashEarned: 2,
      stonesEarned: null,
      damageDealt: '100',
    })

    expect(normalized).toMatchObject({
      coinsEarned: '1.25',
      cashEarned: '2',
      stonesEarned: '0',
      damageDealt: '100',
    })

    const payload = buildTrackerLifetimeCloudWritePayload(
      {
        date: '3/26/2026',
        gameStarted: '2026-03-26T00:00:00Z',
        coinsEarned: '1,25',
        cashEarned: 2,
        stonesEarned: 3,
        keysEarned: 4,
        damageDealt: 5,
        enemiesDestroyed: 6,
        wavesCompleted: 7,
        upgradesBought: 8,
        workshopUpgrades: 9,
        workshopCoinsSpent: 10,
        researchCompleted: 11,
        labCoinsSpent: 12,
        freeUpgrades: 13,
        interestEarned: 14,
        orbKills: 15,
        deathRayKills: 16,
        thornDamage: 17,
        wavesSkipped: 18,
        screenshotUrl: 'https://example.test/screenshot.png',
        verified: true,
      },
      'user-1',
      'tester',
      { existing: { existingField: 'kept' } },
    )

    expect(payload).toMatchObject({
      userId: 'user-1',
      username: 'tester',
      date: '2026-03-26',
      gameStarted: '2026-03-26T00:00:00Z',
      coinsEarned: '1.25',
      cashEarned: '2',
      screenshotUrl: 'https://example.test/screenshot.png',
      verified: true,
    })
  })

  it('falls back to Anonymous when username is missing', () => {
    const payload = buildTrackerLifetimeCloudWritePayload(
      {
        date: '2026-03-26',
        gameStarted: '2026-03-26T00:00:00Z',
        coinsEarned: '1',
        cashEarned: '2',
        stonesEarned: '3',
        keysEarned: '4',
        damageDealt: '5',
        enemiesDestroyed: '6',
        wavesCompleted: '7',
        upgradesBought: '8',
        workshopUpgrades: '9',
        workshopCoinsSpent: '10',
        researchCompleted: '11',
        labCoinsSpent: '12',
        freeUpgrades: '13',
        interestEarned: '14',
        orbKills: '15',
        deathRayKills: '16',
        thornDamage: '17',
        wavesSkipped: '18',
      },
      'user-1',
      undefined as unknown as string,
    )

    expect(payload.username).toBe('Anonymous')
  })

  it('normalizes tracker dates to ISO day strings', () => {
    expect(normalizeTrackerLifetimeDate('2026-03-26T12:30:00Z')).toBe('2026-03-26')
    expect(normalizeTrackerLifetimeDateText('3/26/2026')).toBe('2026-03-26')
  })

  it('builds a minimal patch for lifetime cloud writes', () => {
    const patch = buildTrackerLifetimeCloudPatch(
      {
        userId: 'user-1',
        username: 'tester',
        date: '2026-03-26',
        gameStarted: '2026-03-26T00:00:00Z',
        coinsEarned: '10',
        cashEarned: '2',
        stonesEarned: '3',
        keysEarned: '4',
        damageDealt: '5',
        enemiesDestroyed: '6',
        wavesCompleted: '7',
        upgradesBought: '8',
        workshopUpgrades: '9',
        workshopCoinsSpent: '10',
        researchCompleted: '11',
        labCoinsSpent: '12',
        freeUpgrades: '13',
        interestEarned: '14',
        orbKills: '15',
        deathRayKills: '16',
        thornDamage: '17',
        wavesSkipped: '18',
        screenshotUrl: 'https://example.test/screenshot-new.png',
        verified: true,
      },
      {
        userId: 'user-1',
        username: 'tester',
        date: '2026-03-26',
        gameStarted: '2026-03-26T00:00:00Z',
        coinsEarned: '10',
        cashEarned: '2',
        stonesEarned: '3',
        keysEarned: '4',
        damageDealt: '5',
        enemiesDestroyed: '6',
        wavesCompleted: '7',
        upgradesBought: '8',
        workshopUpgrades: '9',
        workshopCoinsSpent: '10',
        researchCompleted: '11',
        labCoinsSpent: '12',
        freeUpgrades: '13',
        interestEarned: '14',
        orbKills: '15',
        deathRayKills: '16',
        thornDamage: '17',
        wavesSkipped: '18',
        screenshotUrl: 'https://example.test/screenshot-old.png',
        verified: false,
      },
    )

    expect(patch).toMatchObject({
      screenshotUrl: 'https://example.test/screenshot-new.png',
      verified: true,
    })
  })
})
