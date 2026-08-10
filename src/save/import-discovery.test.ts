import { describe, expect, it } from 'vitest'
import {
  BOTS_SAVE_CURRENT_PRESET_KEY,
  BOTS_SAVE_MIGRATED_V28_KEY,
} from './bots'
import { CARDS_SAVE_LEVEL_KEY, CARDS_SAVE_UNLOCKED_KEY } from './cards'
import { planBattleReportImport } from './battle-reports'
import { discoverSaveImportTrackers } from './import-discovery'
import { countImportableItemsFromSaveRoot } from './import-counts'

describe('planBattleReportImport', () => {
  it('returns canonical tracker run fields instead of raw save entries', () => {
    const plan = planBattleReportImport({
      battleHistory: {
        _items: [{
          tier: 20,
          wave: 7779,
          coinsEarned: 5_800_000_000_000_000,
          cellsEarned: 820_000,
          rerollShardsEarned: 365_000,
          realTime: 10_669,
          battleDate: { __value: '2026-07-03T11:30:00.000Z' },
          isTournament: false,
        }],
      },
    }, [])

    expect(plan.importable).toHaveLength(1)
    const run = plan.importable[0]!
    expect(run.duration).toBeTruthy()
    expect(String(run.duration)).not.toBe('?')
    expect(run.coins).toBeTruthy()
    expect(run.cells).toBeTruthy()
    expect(run.rerollShards).toBeTruthy()
    expect(run.runDate).toBeTruthy()
    expect(run.type).toBe('Farming')
  })

  it('includes extended collection stats from save entries for import preview and persist', () => {
    const plan = planBattleReportImport({
      battleHistory: {
        _items: [{
          tier: 21,
          wave: 7779,
          coinsEarned: 740_180_000_000_000_000,
          cellsEarned: 3_010_000,
          rerollShardsEarned: 935_550,
          realTime: 25_223,
          battleDate: { __value: '2026-06-27T15:56:00.000Z' },
          isTournament: false,
          totalEnemies: 1_000_000,
          destroyedInGoldenTower: 850_000,
          enemiesHitByBlackHole: 720_000,
          enemiesHitByOrbs: 640_000,
          taggedByDeathwave: 870_000,
          destroyedInSpotlight: 1_000_000,
          destroyedInGoldenBot: 510_000,
          destroyedInAmplifyBot: 420_000,
          guardianSummoned: 95_000,
        }],
      },
    }, [])

    expect(plan.importable).toHaveLength(1)
    const run = plan.importable[0]!
    expect(run.totalEnemies).toBeTruthy()
    expect(run.killsWithGoldenTower).toBeTruthy()
    expect(run.enemiesHitByBlackHole).toBeTruthy()
    expect(run.enemiesHitByOrbs).toBeTruthy()
    expect(run.taggedByDeathWave).toBeTruthy()
    expect(run.destroyedInSpotlight).toBeTruthy()
    expect(run.destroyedInGoldenBot).toBeTruthy()
    expect(run.killsWithAmplifyBot).toBeTruthy()
    expect(run.guardianSummonedEnemies).toBeTruthy()
  })

  it('treats importable preview payloads as duplicates when passed as existingRuns (accept must use local runs)', () => {
    const parsedRoot = {
      battleHistory: {
        _items: [{
          tier: 20,
          wave: 7779,
          coinsEarned: 5_800_000_000_000_000,
          cellsEarned: 820_000,
          rerollShardsEarned: 365_000,
          realTime: 10_669,
          battleDate: { __value: '2026-07-03T11:30:00.000Z' },
          isTournament: false,
        }],
      },
    }

    const initialPlan = planBattleReportImport(parsedRoot, [])
    expect(initialPlan.importable).toHaveLength(1)

    const replanned = planBattleReportImport(parsedRoot, initialPlan.importable)
    expect(replanned.importable).toHaveLength(0)
    expect(replanned.skippedDuplicates).toBe(1)
  })
})

describe('discoverSaveImportTrackers', () => {
  it('includes battle report and lifetime summaries', () => {
    const result = discoverSaveImportTrackers({
      battleHistory: {
        _items: [{
          tier: 21,
          wave: 4695,
          coinsEarned: 1000,
          cellsEarned: 100,
          rerollShardsEarned: 10,
          realTime: 3600,
          battleDate: { __value: '2026-07-02T10:00:00.000Z' },
        }],
      },
      gameStartedDate: { __value: '2024-01-01T00:00:00.000Z' },
      totalCoinsEarned: 999,
      totalWavesCompleted: 1000,
    })

    const battle = result.trackers.find(tracker => tracker.key === 'battleReports')
    const lifetime = result.trackers.find(tracker => tracker.key === 'lifetime')
    expect(battle?.count).toBe(1)
    expect(lifetime?.count).toBeGreaterThan(0)
    expect(result.battleReportPlan.importable[0]?.coins).toBeTruthy()
  })

  it('discovers bots and cards using the same extractors as the website import counts', () => {
    const parsedRoot = {
      [BOTS_SAVE_MIGRATED_V28_KEY]: true,
      [BOTS_SAVE_CURRENT_PRESET_KEY]: 0,
      botPresetName: ['Farming'],
      flameBotPresets: {
        _items: [
          { unlocked: true, active: true, levels: [0, 15, 15, 22], selectedLevels: [0, 15, 15, 22] },
        ],
      },
      thunderBotPresets: { _items: [] },
      goldenBotPresets: { _items: [] },
      amplifyBotPresets: { _items: [] },
      botBotPresets: { _items: [] },
      [CARDS_SAVE_LEVEL_KEY]: [2, 0, 1],
      [CARDS_SAVE_UNLOCKED_KEY]: [true, false, true],
    }

    const sharedCounts = countImportableItemsFromSaveRoot(parsedRoot)
    const result = discoverSaveImportTrackers(parsedRoot)
    const bots = result.trackers.find(tracker => tracker.key === 'bots')
    const cards = result.trackers.find(tracker => tracker.key === 'cards')

    expect(sharedCounts.bots).toBeGreaterThan(0)
    expect(sharedCounts.cards).toBeGreaterThan(0)
    expect(bots?.count).toBe(sharedCounts.bots)
    expect(cards?.count).toBe(sharedCounts.cards)
  })

  it('does not count bots/cards from legacy root fields when planner extractors find nothing', () => {
    const result = discoverSaveImportTrackers({
      botLevels: [10, 0, 0, 0],
      botPlusLevels: [1, 0, 0, 0],
      botUnlocked: [true, false, false, false],
      cardLevels: [2, 1, 0],
      cardsUnlocked: [true, true, false],
    })

    const bots = result.trackers.find(tracker => tracker.key === 'bots')
    const cards = result.trackers.find(tracker => tracker.key === 'cards')
    expect(bots?.count).toBe(0)
    expect(cards?.count).toBe(0)
  })
})
