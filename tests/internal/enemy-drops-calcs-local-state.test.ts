import { describe, expect, it } from 'vitest'
import {
  defaultEnemyDropsCalcsLocalState,
  migrateLegacyEnemyDropsActiveTab,
  normalizeEnemyDropsCalcsLocalState,
} from '../../src/internal/local-state/enemy-drops-calcs'

describe('enemy-drops-calcs-local-state', () => {
  it('defaults to calculator tab with inputs expanded', () => {
    expect(defaultEnemyDropsCalcsLocalState()).toEqual({
      activeTab: 'calculator',
      activePathsTab: 'cells',
      inputsExpanded: true,
    })
  })

  it('migrates legacy flat tab ids to top + paths tabs', () => {
    expect(migrateLegacyEnemyDropsActiveTab('inputs')).toEqual({
      activeTab: 'calculator',
      activePathsTab: 'cells',
    })
    expect(migrateLegacyEnemyDropsActiveTab('shards')).toEqual({
      activeTab: 'paths',
      activePathsTab: 'shards',
    })
  })

  it('normalizes persisted layout state and legacy activeTab values', () => {
    expect(normalizeEnemyDropsCalcsLocalState({
      activeTab: 'fetch',
      inputsExpanded: false,
    })).toEqual({
      activeTab: 'paths',
      activePathsTab: 'fetch',
      inputsExpanded: false,
    })

    expect(normalizeEnemyDropsCalcsLocalState({
      activeTab: 'paths',
      activePathsTab: 'shards',
      inputsExpanded: true,
    })).toEqual({
      activeTab: 'paths',
      activePathsTab: 'shards',
      inputsExpanded: true,
    })
  })
})
