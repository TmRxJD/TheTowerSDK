/**
 * Module upgrades: shards and coins to take a module between two levels.
 *
 * Rarity is not decoration — it sets the level cap, so the same target level is reachable
 * on an Ancestral module and impossible on a Common one. The cap is applied here rather
 * than left to the caller, because silently pricing levels a module cannot reach is the
 * kind of wrong answer that looks completely reasonable.
 */
import {
  buildModuleCostRows,
  MODULE_COIN_COSTS,
  MODULE_RARITY_LEVEL_CAPS,
  MODULE_SHARD_COSTS,
} from '../data/index'
import { type CalculatorBuilder, type CalculatorResultBase, clampNumber } from './types'

const RARITIES: readonly string[] = Object.keys(MODULE_RARITY_LEVEL_CAPS)

export interface ModuleCostInput {
  /** Rarity, which decides the level cap. */
  rarity: string
  currentLevel: number
  targetLevel: number
  /** Shard discount, as a percentage. */
  shardDiscountPercent: number
  /** Coin discount, as a percentage. */
  coinDiscountPercent: number
}

export interface ModuleCostLevel {
  readonly level: number
  readonly shardCost: number
  readonly coinCost: number
  readonly cumulativeShards: number
  readonly cumulativeCoins: number
}

export interface ModuleCostResult extends CalculatorResultBase {
  readonly levels: readonly ModuleCostLevel[]
  readonly totalShards: number
  readonly totalCoins: number
  /** Highest level this rarity can reach. */
  readonly levelCap: number
}

const defaults: ModuleCostInput = {
  rarity: RARITIES.at(-1) ?? RARITIES[0] ?? '',
  currentLevel: 1,
  targetLevel: 20,
  shardDiscountPercent: 0,
  coinDiscountPercent: 0,
}

function capFor(rarity: string): number {
  const caps = MODULE_RARITY_LEVEL_CAPS as Record<string, number>
  return Object.prototype.hasOwnProperty.call(caps, rarity) ? (caps[rarity] ?? 0) : 0
}

export const moduleCostCalculator: CalculatorBuilder<ModuleCostInput, ModuleCostResult> = {
  id: 'module.cost',
  title: 'Module upgrade cost',
  summary: 'Shards and coins to take one module from its current level to a target.',

  fields: [
    {
      key: 'rarity',
      label: 'Rarity',
      kind: 'select',
      options: RARITIES.map(rarity => ({ value: rarity, label: `${rarity} (max ${capFor(rarity)})` })),
      help: 'Rarity sets the level cap.',
    },
    { key: 'currentLevel', label: 'Current level', kind: 'number', min: 1 },
    { key: 'targetLevel', label: 'Target level', kind: 'number', min: 1 },
    { key: 'shardDiscountPercent', label: 'Shard discount', kind: 'number', unit: 'percent', min: 0, max: 100 },
    { key: 'coinDiscountPercent', label: 'Coin discount', kind: 'number', unit: 'percent', min: 0, max: 100 },
  ],

  defaults,

  normalize(input = {}) {
    const rarity = typeof input.rarity === 'string' && RARITIES.includes(input.rarity)
      ? input.rarity
      : defaults.rarity
    const cap = capFor(rarity) || MODULE_SHARD_COSTS.length
    return {
      rarity,
      currentLevel: Math.floor(clampNumber(input.currentLevel, 1, cap, defaults.currentLevel)),
      targetLevel: Math.floor(clampNumber(input.targetLevel, 1, cap, defaults.targetLevel)),
      shardDiscountPercent: clampNumber(input.shardDiscountPercent, 0, 100, 0),
      coinDiscountPercent: clampNumber(input.coinDiscountPercent, 0, 100, 0),
    }
  },

  compute(rawInput = {}) {
    const input = this.normalize(rawInput)
    const notes: string[] = []
    const levelCap = capFor(input.rarity) || MODULE_SHARD_COSTS.length

    if (typeof rawInput.rarity === 'string' && rawInput.rarity && rawInput.rarity !== input.rarity) {
      notes.push(`No module rarity named "${rawInput.rarity}"; used ${input.rarity} instead.`)
    }
    if (typeof rawInput.targetLevel === 'number' && rawInput.targetLevel > levelCap) {
      notes.push(`${input.rarity} caps at level ${levelCap}; the target was clamped.`)
    }
    if (input.targetLevel <= input.currentLevel) {
      notes.push('Target level is not above the current level, so there is nothing to buy.')
      return { levels: [], totalShards: 0, totalCoins: 0, levelCap, notes }
    }

    const shardRows = buildModuleCostRows(
      MODULE_SHARD_COSTS,
      input.currentLevel,
      input.targetLevel,
      input.shardDiscountPercent,
    )
    const coinRows = buildModuleCostRows(
      MODULE_COIN_COSTS,
      input.currentLevel,
      input.targetLevel,
      input.coinDiscountPercent,
    )

    const levels: ModuleCostLevel[] = shardRows.map((shard, index) => {
      const coin = coinRows[index]
      return {
        level: shard.level,
        shardCost: shard.discountedCost,
        coinCost: coin?.discountedCost ?? 0,
        cumulativeShards: shard.cumulativeCost,
        cumulativeCoins: coin?.cumulativeCost ?? 0,
      }
    })

    return {
      levels,
      totalShards: levels.at(-1)?.cumulativeShards ?? 0,
      totalCoins: levels.at(-1)?.cumulativeCoins ?? 0,
      levelCap,
      notes,
    }
  },
}
