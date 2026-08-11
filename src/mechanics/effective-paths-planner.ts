/**
 * Effective Paths — the path planner.
 *
 * A "path" is an ordered list of upgrades: what to buy next, and after that,
 * and after that. The spreadsheet builds one with a greedy loop spread across a
 * 146-row grid — each row scores every candidate upgrade by return on
 * investment, marks the single best one, and carries the resulting levels into
 * the next row.
 *
 * That is what this reproduces, in the shape the sheet implies:
 *
 * ```text
 * levels := current levels
 * repeat for each step:
 *   for each upgrade still below its cap:
 *     roi := (value(levels with that upgrade +1) − value(levels)) / cost
 *   take the best roi, apply it, and continue from there
 * ```
 *
 * The planner is deliberately ignorant of what it is optimising. It takes an
 * `evaluate` function and a `cost` function, so the same loop drives the eHP,
 * eDamage and eEcon paths, and the coin/stone/time variants of each — those
 * differ only in what a "cost" is. Supply the eHP composition and a stone cost
 * and you get the stone path; supply lab duration and you get the time path.
 *
 * Credit for the approach belongs to the Effective Paths maintainers — see
 * `effective-paths-credits.ts`.
 */

/** One upgrade the planner may choose to buy. */
export interface PathUpgrade {
  /** Stable key, used to look costs up and to identify steps. */
  id: string
  /** Display name, as the sheet labels it. */
  name: string
  /** The level the player is at now. */
  level: number
  /** The highest level the game allows. */
  maxLevel: number
  /**
   * A self-imposed stop below `maxLevel`. The sheet lets a player cap an
   * upgrade they do not want the path to push further; when set, this wins over
   * `maxLevel`.
   */
  targetLevel?: number
}

export interface PathPlanOptions {
  /**
   * Candidates, in the order ties should be broken. The sheet resolves a tie by
   * taking the leftmost column, so earlier entries win.
   */
  upgrades: readonly PathUpgrade[]
  /** How many steps to plan. The sheet's grid tops out at 145. */
  steps: number
  /**
   * The effective value — eHP, DPM, coins per hour — for a given set of levels.
   * Called once per candidate per step, so keep it cheap and free of side
   * effects.
   */
  evaluate: (levels: ReadonlyMap<string, number>) => number
  /**
   * What it costs to take `id` from `nextLevel - 1` to `nextLevel`. Return the
   * currency the path is measured in: stones, coins, or seconds of lab time.
   *
   * A non-finite or non-positive cost takes the upgrade out of the running for
   * that step — the sheet's division would produce an error, which it treats as
   * "not a candidate".
   */
  cost: (id: string, nextLevel: number) => number
}

export interface PathStep {
  /** 1-based position in the path. */
  step: number
  id: string
  name: string
  /** The level this step buys — the level you end up at, not the one you left. */
  level: number
  /** What this step costs, in the path's currency. */
  cost: number
  /** Every step's cost up to and including this one. */
  cumulativeCost: number
  /** The gain this step buys. */
  gain: number
  /** `gain / cost` — what the step was chosen on. */
  roi: number
  /** The effective value after taking this step. */
  value: number
}

/** `true` when `nextLevel` is past the upgrade's target, or its max if untargeted. */
function isCapped(upgrade: PathUpgrade, nextLevel: number): boolean {
  const cap = upgrade.targetLevel ?? upgrade.maxLevel
  return nextLevel > cap
}

/**
 * Plan a path by repeatedly buying the best return on investment.
 *
 * Returns fewer steps than asked for when every upgrade reaches its cap, or
 * when nothing left produces a gain worth costing out.
 *
 * Greedy is what the sheet does, and it is not the same as optimal: an upgrade
 * that unlocks a large gain a few levels later can be passed over. Treat the
 * result as the sheet's recommendation, not a proof.
 */
export function planPath(options: PathPlanOptions): PathStep[] {
  const { upgrades, steps, evaluate, cost } = options

  const levels = new Map<string, number>()
  for (const upgrade of upgrades) levels.set(upgrade.id, upgrade.level)

  const path: PathStep[] = []
  let currentValue = evaluate(levels)
  let cumulativeCost = 0

  for (let step = 1; step <= steps; step++) {
    let best: { upgrade: PathUpgrade, roi: number, gain: number, price: number, value: number } | null = null

    for (const upgrade of upgrades) {
      const nextLevel = (levels.get(upgrade.id) ?? upgrade.level) + 1
      if (isCapped(upgrade, nextLevel)) continue

      const price = cost(upgrade.id, nextLevel)
      if (!Number.isFinite(price) || price <= 0) continue

      const previous = levels.get(upgrade.id) ?? upgrade.level
      levels.set(upgrade.id, nextLevel)
      const value = evaluate(levels)
      levels.set(upgrade.id, previous)

      if (!Number.isFinite(value)) continue

      const gain = value - currentValue
      const roi = gain / price
      // Strictly greater, so the earliest upgrade wins a tie — the sheet takes
      // the leftmost column of the joint maximum.
      if (best === null || roi > best.roi) {
        best = { upgrade: upgrade, roi, gain, price, value }
      }
    }

    if (best === null) break

    levels.set(best.upgrade.id, (levels.get(best.upgrade.id) ?? best.upgrade.level) + 1)
    cumulativeCost += best.price
    currentValue = best.value

    path.push({
      step,
      id: best.upgrade.id,
      name: best.upgrade.name,
      level: levels.get(best.upgrade.id) as number,
      cost: best.price,
      cumulativeCost,
      gain: best.gain,
      roi: best.roi,
      value: best.value,
    })
  }

  return path
}

/**
 * The levels a path leaves you at — the starting levels with every step applied.
 *
 * Useful for showing "where this path gets you" without replaying it.
 */
export function levelsAfterPath(
  upgrades: readonly PathUpgrade[],
  path: readonly PathStep[],
): Map<string, number> {
  const levels = new Map<string, number>()
  for (const upgrade of upgrades) levels.set(upgrade.id, upgrade.level)
  for (const step of path) levels.set(step.id, step.level)
  return levels
}
