import { describe, expect, it } from 'vitest'
import {
  AD_COIN_BONUS_MULTIPLIER,
  BOTH_PACKS_COIN_MULTIPLIER,
  CASH_FIELDS_WRITTEN_PER_KILL,
  CASH_IS_ADDITIVE_ON_KILL,
  CASH_PER_KILL_CHAIN,
  COIN_BONUS_FACTORS,
  COIN_BONUS_HOMONYMS,
  COINS_CARD_INDEX,
  COINS_MASTERY_RESEARCH_INDEX,
  COINS_PER_KILL_CHAIN,
  ECONOMY_KNOWLEDGE_EDGES,
  ECONOMY_KNOWLEDGE_NODES,
  ENEMY_BALANCE_MULTIPLIES_CASH_ONLY,
  EPIC_PACK_COIN_MULTIPLIER,
  MODULE_CLUSTER_GETTER_COUNT,
  MODULE_CONTRIBUTION_IS_ADDITIVE,
  MODULE_ECONOMY_CLUSTER_IDS,
  MODULE_STAT_GETTER_COUNT,
  MODULE_TYPE_BENEFIT_GETTERS,
  RESUME_WAVE_CASH_MULTIPLIER,
  SHARED_COIN_AND_CASH_BONUS,
  STARTER_PACK_COIN_MULTIPLIER,
  ULTIMATE_WEAPONS_IN_COIN_CHAIN,
  WAVE_SKIP_CARD_INDEX,
  WAVE_SKIP_DOUBLE_IS_SEPARATE_ROLL,
  WAVE_SKIP_IS_SEEDED,
  WAVE_SKIP_TRACKED_FIELDS,
} from '../../src/knowledge/compartments/economy'
import { CARD_IMPORT_CATALOG } from '../../src/data/player-stats/data'

describe('the coin multiplier chain', () => {
  it('multiplies the two packs rather than taking the larger', () => {
    expect(BOTH_PACKS_COIN_MULTIPLIER)
      .toBe(STARTER_PACK_COIN_MULTIPLIER * EPIC_PACK_COIN_MULTIPLIER)
    // The tempting wrong model: only the better pack counts.
    expect(BOTH_PACKS_COIN_MULTIPLIER)
      .toBeGreaterThan(Math.max(STARTER_PACK_COIN_MULTIPLIER, EPIC_PACK_COIN_MULTIPLIER))
  })

  it('keeps every factor distinct and non-trivial', () => {
    expect(new Set(COIN_BONUS_FACTORS).size).toBe(COIN_BONUS_FACTORS.length)
    expect(COIN_BONUS_FACTORS.length).toBe(11)
    for (const factor of COIN_BONUS_FACTORS) expect(factor.trim().length).toBeGreaterThan(8)
  })

  it('names an ad bonus that survives buying ads away', () => {
    expect(AD_COIN_BONUS_MULTIPLIER).toBeGreaterThan(1)
    const node = ECONOMY_KNOWLEDGE_NODES.find(n => n.id === 'coinsBonusTotal')!
    expect(node.traps!.join(' ')).toMatch(/bypass/i)
  })

  it('points the Coins card index at the Coins card, by GAME index', () => {
    // CARD_TEMPLATES array position is NOT the game's card index — the two
    // orders agree early and diverge later, so an array lookup passes by luck.
    // CARD_IMPORT_CATALOG carries the game's own index.
    const byIndex = new Map(CARD_IMPORT_CATALOG.map(c => [c.index, c.name]))
    expect(byIndex.get(COINS_CARD_INDEX)).toBe('Coins')
    expect(COINS_MASTERY_RESEARCH_INDEX).toBe(166)
  })
})

describe('the four systems that feed the coin multiplier', () => {
  it('has an edge from each into coinsBonusTotal', () => {
    const into = ECONOMY_KNOWLEDGE_EDGES
      .filter(e => e.to === 'coinsBonusTotal' && e.kind === 'scales')
      .map(e => e.from)
      .sort()
    expect(into).toEqual(['dissonance', 'relic', 'theme'])
  })

  it('mentions the module generator in the factor list even without its own edge', () => {
    expect(COIN_BONUS_FACTORS.join(' ')).toMatch(/GeneratorBenefit/)
  })
})

describe('advice is kept apart from mechanics', () => {
  it('marks the farming node as sentiment and the chain as objective', () => {
    const advice = ECONOMY_KNOWLEDGE_NODES.find(n => n.id === 'economy.farmingAdvice')!
    const chain = ECONOMY_KNOWLEDGE_NODES.find(n => n.id === 'coinsBonusTotal')!
    expect(advice.claimType).toBe('sentiment')
    expect(chain.claimType).toBe('objective')
    expect(chain.verification).toBe('verified_here')
  })

  it('gives the sentiment node no assertions and no implementation', () => {
    const advice = ECONOMY_KNOWLEDGE_NODES.find(n => n.id === 'economy.farmingAdvice')!
    expect(advice.assertions ?? []).toEqual([])
    expect(advice.implementedBy ?? []).toEqual([])
  })
})

describe('module economy clusters, accounted on both sides', () => {
  it('has every economy stat inside the 35-44 block', () => {
    for (const [stat, id] of Object.entries(MODULE_ECONOMY_CLUSTER_IDS)) {
      expect(id, `${stat} outside the block`).toBeGreaterThanOrEqual(35)
      expect(id, `${stat} outside the block`).toBeLessThanOrEqual(44)
    }
  })

  it('has every id in 35-44 claimed by exactly one economy stat', () => {
    const byId = new Map<number, string[]>()
    for (const [stat, id] of Object.entries(MODULE_ECONOMY_CLUSTER_IDS)) {
      byId.set(id, [...(byId.get(id) ?? []), stat])
    }
    const missing: number[] = []
    const duplicated: number[] = []
    for (let id = 35; id <= 44; id += 1) {
      const owners = byId.get(id) ?? []
      if (owners.length === 0) missing.push(id)
      if (owners.length > 1) duplicated.push(id)
    }
    // Both remainders empty, or the block is not actually contiguous.
    expect({ missing, duplicated }).toEqual({ missing: [], duplicated: [] })
    expect(byId.size).toBe(10)
  })

  it('keeps the module-type getters out of the cluster map', () => {
    for (const getter of MODULE_TYPE_BENEFIT_GETTERS) {
      expect(Object.keys(MODULE_ECONOMY_CLUSTER_IDS)).not.toContain(getter)
    }
    expect(MODULE_TYPE_BENEFIT_GETTERS).toHaveLength(4)
  })

  it('counts fewer cluster getters than total getters, by exactly the four types', () => {
    expect(MODULE_STAT_GETTER_COUNT - MODULE_CLUSTER_GETTER_COUNT)
      .toBe(MODULE_TYPE_BENEFIT_GETTERS.length)
  })

  it('records modules as additive and the coin chain as multiplicative', () => {
    expect(MODULE_CONTRIBUTION_IS_ADDITIVE).toBe(true)
    const chain = ECONOMY_KNOWLEDGE_NODES.find(n => n.id === 'coinsBonusTotal')!
    expect(chain.assertions!.some(
      a => a.predicate === 'allFactorsMultiplicative' && a.value === true,
    )).toBe(true)
  })
})

describe('the per-kill coin chain', () => {
  it('is all multiplies, with the enemy value first', () => {
    expect(COINS_PER_KILL_CHAIN[0]).toBe('Enemy.enemyKillCoins')
    expect(COINS_PER_KILL_CHAIN).toHaveLength(12)
    expect(new Set(COINS_PER_KILL_CHAIN).size).toBe(COINS_PER_KILL_CHAIN.length)
  })

  it('carries a factor for every ultimate weapon named, including Spotlight', () => {
    const chain = COINS_PER_KILL_CHAIN.join(' ')
    for (const weapon of ULTIMATE_WEAPONS_IN_COIN_CHAIN) {
      const token = weapon.replace(/\s+/g, '')
      expect(chain, `${weapon} missing from the chain`).toMatch(new RegExp(token, 'i'))
    }
    expect(ULTIMATE_WEAPONS_IN_COIN_CHAIN).toContain('Spotlight')
    expect(ULTIMATE_WEAPONS_IN_COIN_CHAIN).toHaveLength(4)
  })

  it('keeps the four coin-bonus homonyms distinct', () => {
    const keys = Object.keys(COIN_BONUS_HOMONYMS)
    expect(keys).toHaveLength(4)
    expect(new Set(Object.values(COIN_BONUS_HOMONYMS)).size).toBe(4)
    // Three of the four are terms in the product; the module one deliberately is not.
    const chain = COINS_PER_KILL_CHAIN.join(' ')
    expect(chain).toContain('Main.coinsBonusUpgrade')
    expect(chain).toContain('Main.coinsBonusTotal')
    expect(chain).toContain('Enemy.enemyKillCoins')
    expect(chain).not.toContain('get_CoinsPerKill')
  })

  it('separates additive cash from multiplicative coins on the same kill', () => {
    expect(CASH_IS_ADDITIVE_ON_KILL).toBe(true)
    expect(CASH_FIELDS_WRITTEN_PER_KILL).toHaveLength(4)
    for (const field of CASH_FIELDS_WRITTEN_PER_KILL) {
      expect(COINS_PER_KILL_CHAIN.join(' '), `${field} should not be a coin factor`)
        .not.toContain(field)
    }
  })

  it('links every chain system into the kill award with an edge', () => {
    const into = new Set(ECONOMY_KNOWLEDGE_EDGES
      .filter(e => e.to === 'economy.killAward')
      .map(e => e.from))
    for (const id of [
      'ultimateWeapon.goldenTower', 'ultimateWeapon.blackHole',
      'ultimateWeapon.deathWave', 'ultimateWeapon.spotlight',
      'bot', 'guardian.chip', 'orb', 'coinsBonusTotal',
    ]) {
      expect(into, `no edge from ${id}`).toContain(id)
    }
  })
})

describe('cash is its own chain, not coins with different numbers', () => {
  it('shares exactly one term with the coin chain', () => {
    const shared = CASH_PER_KILL_CHAIN.filter(t => COINS_PER_KILL_CHAIN.includes(t))
    expect(shared).toEqual([SHARED_COIN_AND_CASH_BONUS])
    expect(shared).toHaveLength(1)
  })

  it('is much shorter than the coin chain', () => {
    expect(CASH_PER_KILL_CHAIN.length).toBeLessThan(COINS_PER_KILL_CHAIN.length)
    expect(CASH_PER_KILL_CHAIN[0]).toBe('Enemy.enemyKillCash')
  })

  it('has no cash analogue of the account-wide coin multiplier', () => {
    expect(CASH_PER_KILL_CHAIN.join(' ')).not.toContain('coinsBonusTotal')
    expect(CASH_PER_KILL_CHAIN.join(' ')).toContain('cashBonusUpgrade')
    // The two workshop fields are siblings and must not be conflated.
    expect(COINS_PER_KILL_CHAIN.join(' ')).toContain('coinsBonusUpgrade')
    expect(COINS_PER_KILL_CHAIN.join(' ')).not.toContain('cashBonusUpgrade')
  })

  it('zeroes cash on a resume wave rather than reducing it', () => {
    expect(RESUME_WAVE_CASH_MULTIPLIER).toBe(0)
  })

  it('keeps Enemy Balance out of the coin chain', () => {
    expect(ENEMY_BALANCE_MULTIPLIES_CASH_ONLY).toBe(true)
    expect(CASH_PER_KILL_CHAIN.join(' ')).toContain('EnemyBalanceBonus')
    expect(COINS_PER_KILL_CHAIN.join(' ')).not.toContain('EnemyBalanceBonus')
  })
})

describe('the wave skip roll', () => {
  it('points at the Wave Skip card, by GAME index', () => {
    const byIndex = new Map(CARD_IMPORT_CATALOG.map(c => [c.index, c.name]))
    expect(byIndex.get(WAVE_SKIP_CARD_INDEX)).toBe('Wave Skip')
  })

  it('proves array position and game index are different things', () => {
    // The failure that caught this: CARD_TEMPLATES[20] is Death Ray.
    const byIndex = new Map(CARD_IMPORT_CATALOG.map(c => [c.index, c.name]))
    const positional = CARD_IMPORT_CATALOG.map(c => c.name)
    const divergent = CARD_IMPORT_CATALOG.filter((c, i) => positional[i] !== byIndex.get(c.index))
    // Same table so these agree; the point is that the SDK's CARD_TEMPLATES does not.
    expect(divergent).toEqual([])
    expect(byIndex.get(20)).not.toBe(byIndex.get(6))
  })

  it('records the roll as seeded and doubling as separate', () => {
    expect(WAVE_SKIP_IS_SEEDED).toBe(true)
    expect(WAVE_SKIP_DOUBLE_IS_SEPARATE_ROLL).toBe(true)
  })

  it('tracks four round-scoped fields, all distinct', () => {
    expect(WAVE_SKIP_TRACKED_FIELDS).toHaveLength(4)
    expect(new Set(WAVE_SKIP_TRACKED_FIELDS).size).toBe(4)
    for (const f of WAVE_SKIP_TRACKED_FIELDS) expect(f).toMatch(/ThisRound$/)
  })

  it('gates the wave skip card node rather than duplicating it', () => {
    const gate = ECONOMY_KNOWLEDGE_EDGES.find(
      e => e.from === 'economy.waveSkipRoll' && e.to === 'waveSkip',
    )
    expect(gate?.kind).toBe('gates')
  })
})
