/** Cost to reach `targetLevel` from `targetLevel − 1` (matches game index: level 2 → index 0). */
export const MODULE_COST_TABLE_LENGTH = 300

/** Reroll currency cost by number of locked substats (0–7). Index 7 is unused (0). */
export const MODULE_REROLL_COSTS_BY_LOCKED_SUBSTATS: readonly number[] = [
  40, 160, 500, 1000, 1600, 2250, 3000, 0,
]

/** @deprecated Use `MODULE_REROLL_COSTS_BY_LOCKED_SUBSTATS`. Kept for existing imports. */
export const MAIN_SUB_COSTS: number[] = Array.from({ length: 69 }, (_, i) => 15 + i * 3)

const COIN_RODATA_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [10_000, 25_000], // levels 2–5 vs 6–10
  [45_000, 60_000], // levels 11–15 vs 16–20
  [120_000, 180_000], // levels 21–25 vs 26–30
  [350_000, 500_000], // levels 31–35 vs 36–40
  [1_000_000, 3_000_000], // levels 41–50 vs 51–60
  [25_000_000, 100_000_000], // levels 61–70 vs 71–80
  [350_000_000, 8_000_000_000], // levels 81–100 vs 101–120
  [32_000_000_000, 500_000_000_000], // levels 121–140 vs 141–160
]

const COIN_HIGH_POLY_SCALE = 5e17

function coinPair(index: number, targetLevel: number, threshold: number): number {
  const [low, high] = COIN_RODATA_PAIRS[index]
  return targetLevel > threshold ? high : low
}

function coinHighLinear(targetLevel: number): number {
  const slope = 0x2d79883d2000n
  const intercept = 0x9184e72a000n
  const offset = BigInt(targetLevel - 0xA1)
  return Number(BigInt.asIntN(64, offset * slope + intercept))
}

function coinHighQuadratic(targetLevel: number): number {
  const a = targetLevel - 0xC8
  const b = targetLevel - 0xC9
  let product = a * b
  if (product < 0) product += 1
  product = (product >> 1) + 2
  const multiplier = 0x470de4df82000n
  return Number(BigInt.asIntN(64, BigInt(product) * multiplier))
}

function coinHighPolynomial(targetLevel: number): number {
  const a = targetLevel - 0xF0
  const b = targetLevel - 0xF1
  return ((b * a * 0.5) + 2.0) * COIN_HIGH_POLY_SCALE
}

/** Coin cost to upgrade a module to `targetLevel` (discount 0). */
export function getModuleCoinUpgradeCost(targetLevel: number): number {
  const level = Math.max(1, Math.floor(Number(targetLevel) || 1))

  if (level >= 0xA1) {
    if (level > 0xF0) return coinHighPolynomial(level)
    if (level > 0xC8) return coinHighQuadratic(level)
    return coinHighLinear(level)
  }
  if (level >= 0x79) return coinPair(7, level, 0x8C)
  if (level >= 0x51) return coinPair(6, level, 0x64)
  if (level >= 0x3D) return coinPair(5, level, 0x46)
  if (level >= 0x29) return coinPair(4, level, 0x32)
  if (level >= 0x1F) return coinPair(3, level, 0x23)
  if (level >= 0x15) return coinPair(2, level, 0x19)
  if (level >= 0x0B) return coinPair(1, level, 0x0F)
  return coinPair(0, level, 5)
}

function shardBucket(targetLevel: number): number {
  const level = Math.max(1, Math.floor(Number(targetLevel) || 1))

  if (level >= 0x29) {
    if (level >= 0x79) {
      if (level >= 0xA1) {
        if (level > 0xF0) return level * 0x1F4 - 100_500
        if (level > 0xC8) return level * 0xFA - 40_250
        return level * 0x7D - 15_125
      }
      if (level >= 0x8D) return level > 0x96 ? 0xFA0 : 0xBB8
      if (level >= 0x82) return level > 0x82 ? 0x9C4 : 0x708
      return level > 0x82 ? 0x9C4 : 0x708
    }
    if (level >= 0x51) {
      if (level >= 0x65) return level > 0x6E ? 0x514 : 0x3E8
      return level > 0x5A ? 0x2BC : 0x1F4
    }
    if (level >= 0x3D) return level > 0x46 ? 0x15E : 0xFA
    return level > 0x32 ? 0xB4 : 0x78
  }
  if (level >= 0x15) {
    if (level >= 0x1F) return level > 0x23 ? 0x5A : 0x4B
    return level > 0x19 ? 0x32 : 0x28
  }
  if (level >= 0x0B) return level > 0x0F ? 0x19 : 0x14
  return level > 5 ? 12 : 7
}

/** Shard cost to upgrade a module to `targetLevel` (discount 0). */
export function getModuleShardUpgradeCost(targetLevel: number): number {
  return shardBucket(targetLevel)
}

/** Reroll currency cost from locked-substat count (discount 0). */
export function getModuleRerollCost(lockedSubstats: number): number {
  const index = Math.max(0, Math.min(7, Math.floor(Number(lockedSubstats) || 0)))
  return MODULE_REROLL_COSTS_BY_LOCKED_SUBSTATS[index] ?? 0
}

export const MODULE_SHARD_COSTS: number[] = Array.from(
  { length: MODULE_COST_TABLE_LENGTH - 1 },
  (_, index) => getModuleShardUpgradeCost(index + 2),
)

export const MODULE_COIN_COSTS: number[] = Array.from(
  { length: MODULE_COST_TABLE_LENGTH - 1 },
  (_, index) => getModuleCoinUpgradeCost(index + 2),
)

export type ModuleCostRoundingMode = 'round' | 'ceil' | 'floor'

function clampDiscountPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.floor(value)))
}

function applyRounding(value: number, roundingMode: ModuleCostRoundingMode): number {
  if (roundingMode === 'ceil') return Math.ceil(value)
  if (roundingMode === 'floor') return Math.floor(value)
  return Math.round(value)
}

export function buildDiscountedModuleCosts(
  costs: readonly number[],
  discountPercent: number,
  roundingMode: ModuleCostRoundingMode = 'round',
): number[] {
  const mult = 1 - (clampDiscountPercent(discountPercent) / 100)
  return costs.map(cost => Math.max(0, applyRounding(Number(cost || 0) * mult, roundingMode)))
}

export function buildModuleCostPrefix(costs: readonly number[]): number[] {
  const prefix: number[] = []
  let acc = 0
  for (let index = 0; index < costs.length; index += 1) {
    acc += Number(costs[index] || 0)
    prefix.push(acc)
  }
  return prefix
}

export function sumModuleCostsBetweenWithRounding(
  costs: readonly number[],
  fromLevel: number,
  toLevel: number,
  discountPercent: number,
  roundingMode: ModuleCostRoundingMode = 'round',
): number {
  const from = Math.max(1, Math.floor(Number(fromLevel) || 1))
  const to = Math.max(1, Math.floor(Number(toLevel) || 1))
  if (to <= from) return 0

  const discounted = buildDiscountedModuleCosts(costs, discountPercent, roundingMode)
  const prefix = buildModuleCostPrefix(discounted)
  const leftIndex = from - 2
  const rightIndex = to - 2
  const left = leftIndex >= 0 ? (prefix[leftIndex] || 0) : 0
  const right = rightIndex >= 0 ? (prefix[rightIndex] || 0) : 0
  return Math.max(0, right - left)
}

export function sumModuleCostsBetween(
  costs: readonly number[],
  fromLevel: number,
  toLevel: number,
  discountPercent: number,
): number {
  return sumModuleCostsBetweenWithRounding(costs, fromLevel, toLevel, discountPercent, 'round')
}

export function sumModuleShardCostsBetween(fromLevel: number, toLevel: number, discountPercent: number): number {
  return sumModuleCostsBetween(MODULE_SHARD_COSTS, fromLevel, toLevel, discountPercent)
}

export function sumModuleCoinCostsBetween(fromLevel: number, toLevel: number, discountPercent: number): number {
  return sumModuleCostsBetween(MODULE_COIN_COSTS, fromLevel, toLevel, discountPercent)
}

export interface ModuleCostRow {
  level: number
  baseCost: number
  discountedCost: number
  cumulativeCost: number
}

export function buildModuleCostRows(
  costs: readonly number[],
  fromLevel: number,
  toLevel: number,
  discountPercent: number,
): ModuleCostRow[] {
  const from = Math.max(1, Math.floor(Number(fromLevel) || 1))
  const to = Math.max(from, Math.floor(Number(toLevel) || from))
  if (to <= from) return []

  const mult = 1 - (clampDiscountPercent(discountPercent) / 100)
  const rows: ModuleCostRow[] = []
  let cumulative = 0

  for (let level = from + 1; level <= to; level += 1) {
    const index = level - 2
    const baseCost = Number(costs[index] || 0)
    const discountedCost = Math.round(baseCost * mult)
    cumulative += discountedCost
    rows.push({
      level,
      baseCost,
      discountedCost,
      cumulativeCost: cumulative,
    })
  }

  return rows
}
