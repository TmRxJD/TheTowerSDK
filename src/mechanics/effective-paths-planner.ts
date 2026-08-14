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

/**
 * Refuse a path variant no upgrade claims.
 *
 * Every planner here decides eligibility by asking whether an upgrade's variant
 * list contains the requested one. A variant nothing lists is therefore not an
 * error anywhere: every candidate is skipped, and the result is a path with no
 * steps, no exclusions and no issues — which is exactly what a player who has
 * bought everything looks like.
 *
 * The near miss is a band name. `lab` is a band and `lab-time` is a variant,
 * one character apart, and the compiler only objects where the argument is
 * typed — not in a fixture, and not for a value read back from stored settings
 * as a string.
 *
 * @param family how to name this planner in the message
 */
export function assertPathVariant(
  variant: string,
  allowed: readonly string[],
  family: string,
): void {
  if (allowed.includes(variant)) return
  throw new Error(
    `unknown ${family} path variant "${variant}" — expected one of ${allowed.join(', ')}`,
  )
}

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
  /**
   * Called for every candidate the loop passes over, and why.
   *
   * The three `continue`s below are silent by design — the sheet's own division
   * simply errors and the column drops out — and that silence is a problem for
   * a caller trying to explain an empty or surprising path. A candidate that is
   * capped, unpriced or unevaluable appears nowhere: not in the steps, and not
   * in the exclusions a planner reports, because nothing knew to record it.
   *
   * Fires once per candidate per step, so a caller that wants a report should
   * keep the first step's and drop the rest — see `skipsFromFirstStep`.
   */
  onSkip?: (skip: PathSkip) => void
}

/** Why a candidate was passed over on a given step. */
export interface PathSkip {
  /** 1-based step the candidate was passed over on. */
  step: number
  id: string
  name: string
  /** The level it would have bought. */
  nextLevel: number
  reason: PathSkipReason
  /**
   * The number that disqualified it — the price for `unpriced`, the value for
   * `unevaluable`, the cap for `capped`. Recorded because "no price" and "a
   * price of exactly zero" are different bugs with the same symptom.
   */
  detail: number
}

/**
 * The three ways a candidate leaves the running.
 *
 * - `capped` — already at its target or maximum, which is normal and expected.
 * - `unpriced` — the cost was not a positive finite number. A missing catalog
 *   entry and a fully discounted cost of zero both land here.
 * - `unevaluable` — the model returned a non-finite value for the state that
 *   buying it would produce.
 */
export type PathSkipReason = 'capped' | 'unpriced' | 'unevaluable'

/**
 * The first step's skips, one per candidate.
 *
 * A skip fires every step, so an unfiltered log is thousands of entries saying
 * the same thing. The first step is the one that describes the account the
 * player actually has.
 */
export function skipsFromFirstStep(skips: readonly PathSkip[]): PathSkip[] {
  return skips.filter(skip => skip.step === 1)
}

/**
 * One upgrade a plan left out, and why, as every planner reports it.
 *
 * `id` matters because `sheetName` is **not unique**. Two eHP upgrades are both
 * called `Assist Module Substats - Armor` — the Assist Module lab and the
 * stone-bought slot upgrade — and on the stone path one is planned while the
 * other is excluded. Compare these lists by `id`; a name-keyed comparison
 * reports that as the same upgrade being planned and left out at once.
 *
 * Optional only because the discount planner predates it and keys its
 * candidates differently; prefer to set it.
 */
export interface PathExclusion {
  id?: string
  sheetName: string
  reason: string
}

/**
 * A skip in the words a player reads.
 *
 * Each names the number that disqualified the candidate. "No price" and "a
 * price of exactly zero" look identical on screen and are different faults: a
 * missing catalog entry against a discount that has reached 100%.
 */
export function describePathSkip(skip: PathSkip): string {
  switch (skip.reason) {
    case 'capped':
      return `already at its cap of ${skip.detail}`
    case 'unpriced':
      return Number.isFinite(skip.detail)
        ? `priced at ${skip.detail} for level ${skip.nextLevel}, which is not a cost`
        : `no price for level ${skip.nextLevel}`
    case 'unevaluable':
      return `the model could not value level ${skip.nextLevel}`
  }
}

/**
 * Add every first-step skip that is not already accounted for.
 *
 * Shared by all four planners so a candidate cannot vanish from one of them and
 * be explained by another. Anything already planned, or already excluded for a
 * reason of the planner's own — a locked weapon, a synced cooldown — keeps that
 * reason: it says more than "capped" does.
 *
 * Mutates `excluded` in place, which is how each planner already builds it.
 */
export function appendSkipExclusions(
  excluded: PathExclusion[],
  planned: readonly PathStep[],
  skips: readonly PathSkip[],
): void {
  const plannedIds = new Set(planned.map(step => step.id))
  // By id, not by name: two upgrades can share a display name, and skipping one
  // because the *other* is already listed would lose a real reason.
  const already = new Set(excluded.map(entry => entry.id ?? entry.sheetName))

  for (const skip of skipsFromFirstStep(skips)) {
    if (plannedIds.has(skip.id) || already.has(skip.id)) continue
    already.add(skip.id)
    excluded.push({ id: skip.id, sheetName: skip.name, reason: describePathSkip(skip) })
  }
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
  const { upgrades, steps, evaluate, cost, onSkip } = options

  const levels = new Map<string, number>()
  for (const upgrade of upgrades) levels.set(upgrade.id, upgrade.level)

  const path: PathStep[] = []
  let currentValue = evaluate(levels)
  let cumulativeCost = 0

  for (let step = 1; step <= steps; step++) {
    let best: { upgrade: PathUpgrade, roi: number, gain: number, price: number, value: number } | null = null

    for (const upgrade of upgrades) {
      const nextLevel = (levels.get(upgrade.id) ?? upgrade.level) + 1
      const skip = (reason: PathSkipReason, detail: number) =>
        onSkip?.({ step, id: upgrade.id, name: upgrade.name, nextLevel, reason, detail })

      if (isCapped(upgrade, nextLevel)) {
        skip('capped', upgrade.targetLevel ?? upgrade.maxLevel)
        continue
      }

      const price = cost(upgrade.id, nextLevel)
      if (!Number.isFinite(price) || price <= 0) {
        skip('unpriced', price)
        continue
      }

      const previous = levels.get(upgrade.id) ?? upgrade.level
      levels.set(upgrade.id, nextLevel)
      const value = evaluate(levels)
      levels.set(upgrade.id, previous)

      if (!Number.isFinite(value)) {
        skip('unevaluable', value)
        continue
      }

      const gain = value - currentValue
      const roi = gain / price
      /*
       * The candidate's own value is checked above; this catches the
       * *baseline* being non-finite, which the check above cannot see. It
       * matters because of how the comparison below fails: `NaN > NaN` is
       * false, so a NaN ROI never displaces the incumbent and the first
       * candidate examined wins every step — a path in upgrade-declaration
       * order, presented as a recommendation, with nothing saying so.
       */
      if (!Number.isFinite(roi)) {
        skip('unevaluable', roi)
        continue
      }
      // Strictly greater, so the earliest upgrade wins a tie — the sheet takes
      // the leftmost column of the joint maximum.
      if (best === null || roi > best.roi) {
        best = { upgrade, roi, gain, price, value }
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
