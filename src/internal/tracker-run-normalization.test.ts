import { describe, expect, it } from 'vitest'
import {
  applyRunDataAliasGroups,
  canonicalizeRunDataForOutput,
  canonicalizeTrackerRunData,
  serializeTrackerRunForCloudAttributes,
} from './tracker-run-normalization'
import { TRACK_RUN_SUBMIT_ALIAS_GROUPS } from './tracker-run-field-vocabulary'

describe('tracker run normalization', () => {
  it('canonicalizes exact battle report labels and keeps the dice bridge only where needed', () => {
    const normalized = canonicalizeRunDataForOutput({
      Tier: '12',
      'Real Time': '1h2m3s',
      'Coins earned': '1234',
      Damage: '45 summoned enemies 9',
      'Guardian coins stolen': '77',
      'Rare Modules': '2',
      dice: '88',
    })

    expect(normalized.tier).toBe('12')
    expect(normalized.roundDuration).toBe('1h2m3s')
    expect(normalized.totalCoins).toBe('1234')
    expect(normalized.guardianDamage).toBe('45')
    expect(normalized.guardianSummonedEnemies).toBe('9')
    expect(normalized.guardianCoinsStolen).toBe('77')
    expect(normalized.rareModulesFetched).toBe('2')
    expect(normalized.totalDice).toBe('88')
    expect(normalized['Coins earned']).toBeUndefined()
  })

  it('preserves canonical values when conflicting raw aliases are present', () => {
    const normalized = canonicalizeRunDataForOutput({
      wave: '7676',
      Wave: '167963',
      killedBy: 'Fast',
      'Killed By': 'Apathy',
    })

    expect(normalized.wave).toBe('7676')
    expect(normalized.killedBy).toBe('Fast')
    expect(normalized.Wave).toBeUndefined()
    expect(normalized['Killed By']).toBeUndefined()
  })

  it('applies submit aliases that collapse duplicated battle-report keys', () => {
    const submitReady = applyRunDataAliasGroups({
      'Enemies Hit by Orbs': '401',
      'Summoned enemies': '12',
      'Coins From Orb': '999',
      rerollShards: '14',
    }, TRACK_RUN_SUBMIT_ALIAS_GROUPS)

    expect(submitReady.enemiesHitByOrbs).toBe('401')
    expect(submitReady['Enemies Hit by Orbs']).toBeUndefined()
    expect(submitReady.guardianSummonedEnemies).toBe('12')
    expect(submitReady.coinsFromOrbs).toBe('999')
    expect(submitReady.totalDice).toBe('14')
  })

  it('builds a single canonical tracker run record and drops raw aliases', () => {
    const canonical = canonicalizeTrackerRunData({
      tier: '11',
      Tier: '11+',
      wave: '7676',
      Wave: '167963',
      totalCoins: '76.37T',
      'Coins earned': '76.37T',
      killedBy: 'Fast',
      'Killed By': 'Apathy',
      date: '2026-03-23',
      time: '14:00:00',
      runDate: '2026-03-22',
      runTime: '09:15:00',
      notes: 'keep me',
      values: { junk: true },
    })

    expect(canonical).toMatchObject({
      tier: '11',
      tierDisplay: '11',
      wave: '7676',
      totalCoins: '76.37T',
      killedBy: 'Fast',
      date: '2026-03-23',
      time: '14:00:00',
      runDate: '2026-03-22',
      runTime: '09:15:00',
      notes: 'keep me',
    })
    expect(canonical).not.toHaveProperty('Wave')
    expect(canonical).not.toHaveProperty('Killed By')
    expect(canonical).not.toHaveProperty('values')
  })

  it('does not collapse section-scoped Black Hole fields through ambiguous raw aliases', () => {
    const canonical = canonicalizeTrackerRunData({
      enemiesHitByBlackHole: '590.60K',
      destroyedByBlackHole: '8935',
      ['Black Hole']: '1.91ab',
    })

    expect(canonical).toMatchObject({
      enemiesHitByBlackHole: '590.60K',
      destroyedByBlackHole: '8935',
    })
    expect((canonical as Record<string, unknown>).blackHoleDamage).toBeUndefined()
  })

  it('omits oversized optional cloud attributes instead of sending invalid Appwrite values', () => {
    const serialized = serializeTrackerRunForCloudAttributes({
      tier: '11',
      wave: '7676',
      roundDuration: '9h54m5s',
      totalCoins: '76.37T',
      totalCells: '128.82K',
      totalDice: '16.80K',
      killedBy: 'Fast',
      date: '2026-03-21',
      time: '13:47:00',
      runDate: '2026-03-20',
      runTime: '11:47:00',
      deathWaveDamage: '1234567890123456789012345',
      taggedByDeathWave: '167963',
    })

    expect(serialized).toMatchObject({
      tier: '11',
      wave: '7676',
      totalCoins: '76.37T',
      runDate: '2026-03-20',
      runTime: '11:47:00',
      taggedByDeathWave: '167963',
    })
    expect(serialized.deathWaveDamage).toBeUndefined()
  })

  it('preserves updated battle report fields through canonicalization and cloud serialization', () => {
    const canonical = canonicalizeTrackerRunData({
      highestCoinsPerMinute: '11.40q',
      defensePercentBlocked: '341.24Q',
      killsWithGoldenTower: '599945',
      destroyedByProjectiles: '914',
      gemsEarned: '140',
      fetchGems: '8',
    })

    expect(canonical).toMatchObject({
      highestCoinsPerMinute: '11.40q',
      defensePercentBlocked: '341.24Q',
      killsWithGoldenTower: '599945',
      destroyedByProjectiles: '914',
      gemsEarned: '140',
      fetchGems: '8',
    })

    const serialized = serializeTrackerRunForCloudAttributes(canonical)
    expect(serialized).toMatchObject({
      highestCoinsPerMinute: '11.40q',
      defensePercentBlocked: '341.24Q',
      killsWithGoldenTower: '599945',
      destroyedByProjectiles: '914',
      gemsEarned: '140',
      fetchGems: '8',
    })
  })
})
