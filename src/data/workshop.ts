export interface WorkshopLevelCostRow {
  level: number
  baseCost: number
  bonusMultiplier: number
  discountedCost: number
  cumulativeCost: number
}

type WorkshopCostLevelsInput = number[] | Record<number, number>

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export function computeWorkshopTotalDiscountPercent(
  sectionDiscountPercent: number,
  vaultDiscountPercent = 0,
): number {
  return clampPercent(sectionDiscountPercent + vaultDiscountPercent)
}

export function computeDiscountedWorkshopCost(baseCost: number, totalDiscountPercent: number): number {
  return Math.round(baseCost * (1 - clampPercent(totalDiscountPercent) / 100))
}

export function buildWorkshopLevelCostRows(
  costs: WorkshopCostLevelsInput,
  fromLevel: number,
  toLevel: number,
  totalDiscountPercent: number,
): WorkshopLevelCostRow[] {
  const start = Math.max(0, Math.floor(fromLevel))
  const end = Math.max(start + 1, Math.floor(toLevel))

  const rows: WorkshopLevelCostRow[] = []
  let cumulative = 0
  for (let level = start + 1; level <= end; level += 1) {
    const index = level - 1
    const baseCost = Number(Array.isArray(costs) ? costs[index] : costs[index] ?? 0)
    const discountedCost = computeDiscountedWorkshopCost(baseCost, totalDiscountPercent)
    cumulative += discountedCost
    rows.push({
      level,
      baseCost,
      bonusMultiplier: 1 + level * 0.01,
      discountedCost,
      cumulativeCost: cumulative,
    })
  }

  return rows
}

export function computeWorkshopCostTotal(
  costs: WorkshopCostLevelsInput,
  fromLevel: number,
  toLevel: number,
  totalDiscountPercent: number,
): number {
  const rows = buildWorkshopLevelCostRows(costs, fromLevel, toLevel, totalDiscountPercent)
  if (rows.length === 0) return 0
  return rows[rows.length - 1].cumulativeCost
}
