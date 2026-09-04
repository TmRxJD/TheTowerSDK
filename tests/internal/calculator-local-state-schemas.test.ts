import { describe, expect, it } from 'vitest'
import {
  botMedalSplitterLocalPersistenceSchema,
  botsCalcsLocalPersistenceSchema,
  damageReduxCalcsLocalPersistenceSchema,
  dissonanceCalcsLocalPersistenceSchema,
  enemyStatsCalcsLocalPersistenceSchema,
  guardiansCalcsLocalPersistenceSchema,
  labsCalcsLocalPersistenceSchema,
  modulesCalcsLocalPersistenceSchema,
  normalizeBotMedalSplitterLocalState,
  normalizeBotsCalcsLocalState,
  normalizeDamageReduxCalcsLocalState,
  normalizeDissonanceCalcsLocalState,
  normalizeEnemyStatsCalcsLocalState,
  normalizeGuardiansCalcsLocalState,
  normalizeLabsCalcsLocalState,
  normalizeModulesCalcsLocalState,
  normalizeShardSplitterLocalState,
  normalizeThornsCalcsLocalState,
  normalizeTournamentPerformanceLocalState,
  normalizeUptimeChartLocalState,
  normalizeWorkshopCalcsLocalState,
  shardSplitterLocalPersistenceSchema,
  thornsCalcsLocalPersistenceSchema,
  tournamentPerformanceLocalPersistenceSchema,
  uptimeChartLocalPersistenceSchema,
  workshopCalcsLocalPersistenceSchema,
} from '../../src/internal/local-state/calculator-local-state-schemas'

describe('calculator local state schemas', () => {
  it('normalizes labs calcs local state with clamped levels', () => {
    const normalized = normalizeLabsCalcsLocalState({
      selectedLabType: 'Main',
      calcSpeedLevel: 120,
      calcGemMultiplier: 1.5,
      calcByLab: {
        'Lab Speed': { current: 4, target: 8 },
      },
    })

    expect(normalized).toMatchObject({
      selectedLabType: 'Main',
      calcSpeedLevel: 99,
      calcGemMultiplier: 1.5,
      calcByLab: {
        'Lab Speed': { current: 4, target: 8 },
      },
    })
    expect(labsCalcsLocalPersistenceSchema.parse({
      selectedLabType: 'Main',
      calcSpeedLevel: 50,
    })).toMatchObject({ calcSpeedLevel: 50 })
  })

  it('normalizes modules calcs local state with clamped discounts', () => {
    const normalized = normalizeModulesCalcsLocalState({
      moduleType: 'generator',
      coinDiscount: 150,
      currentLevel: { generator: 12 },
    })

    expect(normalized).toMatchObject({
      moduleType: 'generator',
      coinDiscount: 100,
      currentLevel: { generator: 12 },
    })
    expect(modulesCalcsLocalPersistenceSchema.parse({ shardDiscount: 5 })).toMatchObject({ shardDiscount: 5 })
  })

  it('normalizes damage redux calcs and clamps defense percent', () => {
    const normalized = damageReduxCalcsLocalPersistenceSchema.parse({
      defensePct: 120,
      useDefense: false,
    })

    expect(normalized).toMatchObject({
      defensePct: 98,
      useDefense: false,
    })
    expect(normalizeDamageReduxCalcsLocalState({ cfPct: 5 }).cfPct).toBe(10)
  })

  it('normalizes workshop calcs local state with clamped pagination', () => {
    const normalized = normalizeWorkshopCalcsLocalState({
      itemsPerPage: 500,
      currentPage: 0,
      activeTab: 'enhancements',
    })

    expect(normalized).toMatchObject({
      itemsPerPage: 100,
      currentPage: 1,
      activeTab: 'enhancements',
    })
    expect(workshopCalcsLocalPersistenceSchema.parse({ showCoin: false }).showCoin).toBe(false)
  })

  it('normalizes thorns calcs local state and enforces pc mastery rules', () => {
    const normalized = normalizeThornsCalcsLocalState({
      settings: { pcLevel: 3, pcMasteryLevel: 5 },
    })

    expect(normalized.settings.pcMasteryLevel).toBe(0)
    expect(thornsCalcsLocalPersistenceSchema.parse({ comparisonPanel: 'wall' }).comparisonPanel).toBe('wall')
  })

  it('normalizes bots calcs local state with medal splitter tab', () => {
    const normalized = normalizeBotsCalcsLocalState({
      activeTab: 'medal-splitter',
      statFilter: [1.9, 'x'],
    })

    expect(normalized.activeTab).toBe('medal-splitter')
    expect(normalized.statFilter).toEqual([1])
    expect(botsCalcsLocalPersistenceSchema.parse({ hideCompleted: true }).hideCompleted).toBe(true)
  })

  it('normalizes enemy stats calcs local state with legacy skip fields', () => {
    const normalized = normalizeEnemyStatsCalcsLocalState({
      healthSkipCount: 3,
      attackSkipPct: 25,
      wave: 0,
    })

    expect(normalized.healthSkipInput).toBe('3')
    expect(normalized.attackSkipInput).toBe('25%')
    expect(normalized.wave).toBe(1)
    expect(enemyStatsCalcsLocalPersistenceSchema.parse({ mode: 'hp' }).mode).toBe('hp')
  })

  it('persists protector radius lab and ELS path pagination prefs', () => {
    const normalized = normalizeEnemyStatsCalcsLocalState({
      enemyLabLevels: { protector_radius: 12 },
      elsPathItemsPerPage: 50,
      elsPathCurrentPage: 3,
    })

    expect(normalized.enemyLabLevels.protector_radius).toBe(12)
    expect(normalized.elsPathItemsPerPage).toBe(50)
    expect(normalized.elsPathCurrentPage).toBe(3)
    expect(
      enemyStatsCalcsLocalPersistenceSchema.parse({
        enemyLabLevels: { protector_radius: 12 },
        elsPathItemsPerPage: -1,
      }).elsPathItemsPerPage,
    ).toBe(-1)
  })

  it('normalizes bot medal splitter local state with legacy target fields', () => {
    const normalized = normalizeBotMedalSplitterLocalState({
      activePreset: 9,
      plannerTab: 'inputs',
      presets: [{
        budget: 999999999,
        targetBotLabel: 'Golden Bot',
        syncWithBotBot: true,
        singularityHarnessRarity: 'Mythic',
      }],
    })

    expect(normalized.activePreset).toBe(2)
    expect(normalized.plannerTab).toBe('inputs')
    expect(normalized.presets[0]?.budget).toBe(100000000)
    expect(normalized.presets[0]?.singularityHarnessRarity).toBe('Mythic')
    expect(botMedalSplitterLocalPersistenceSchema.parse({ plannerTab: 'allocation' }).plannerTab).toBe('allocation')
  })

  it('normalizes guardians calcs local state with optional panels', () => {
    const normalized = normalizeGuardiansCalcsLocalState({
      mainTab: 'Effective Paths',
      hideCompleted: false,
      startingPanel: 2.8,
      enteredLevels: { Stun: [1, 2] },
    })

    expect(normalized).toMatchObject({
      mainTab: 'Effective Paths',
      hideCompleted: false,
      startingPanel: 2,
      enteredLevels: { Stun: [1, 2] },
    })
    expect(guardiansCalcsLocalPersistenceSchema.parse({ statFilter: [1.2] }).statFilter).toEqual([1])
  })

  it('normalizes dissonance calcs local state with echo lab clamp', () => {
    const normalized = normalizeDissonanceCalcsLocalState({
      echoLabLevels: { attack: 99 },
      echoLabsLocked: true,
      visibleColumnKeys: ['waves', 'invalid', 'waves'],
    })

    expect(normalized.echoLabLevels.attack).toBe(20)
    expect(normalized.echoLabsLocked).toBe(true)
    expect(normalized.visibleColumnKeys).toEqual(['waves'])
    expect(dissonanceCalcsLocalPersistenceSchema.parse({ echoLabsLocked: false }).echoLabsLocked).toBe(false)
  })

  it('normalizes tournament performance local state', () => {
    const normalized = tournamentPerformanceLocalPersistenceSchema.parse({
      selectedLeagues: ['Champion', 'Champion', ''],
      searchPlayerId: '  player-1  ',
    })

    expect(normalized).toMatchObject({
      selectedLeagues: ['Champion'],
      searchPlayerId: 'player-1',
    })
    expect(normalizeTournamentPerformanceLocalState({}).searchPlayerId).toBe('')
  })

  it('normalizes uptime chart local state with default order fallback', () => {
    const normalized = normalizeUptimeChartLocalState({
      chartOrientation: 'portrait',
      chartView: 'linear',
      chartOrder: [],
    })

    expect(normalized.chartOrientation).toBe('portrait')
    expect(normalized.chartView).toBe('linear')
    expect(normalized.chartOrder.length).toBeGreaterThan(0)
    expect(uptimeChartLocalPersistenceSchema.parse({ chartCollapsed: true }).chartCollapsed).toBe(true)
  })

  it('normalizes shard splitter local state through persistence schema', () => {
    const normalized = shardSplitterLocalPersistenceSchema.parse({
      selectedModuleType: 'core',
      shardDiscount: 12,
      splitterByType: {
        core: {
          budget: 100,
          unspentShards: 5,
          assistEffPct: 30,
          primaryLevel: 10,
          secondaryLevel: 20,
          primaryRarity: 'Rare',
          secondaryRarity: 'Epic',
        },
      },
      costsAssistEffPctByType: {
        cannon: 25,
        defense: 25,
        generator: 25,
        core: 30,
      },
      columns: {
        splitOrder: ['tgtSpent'],
        splitSelected: ['tgtSpent'],
        damagePathOrder: ['step'],
        damagePathSelected: ['step'],
      },
    })

    expect(normalized.selectedModuleType).toBe('core')
    expect(normalized.shardDiscount).toBe(12)
    expect(normalizeShardSplitterLocalState(normalized).shardDiscount).toBe(12)
  })
})
