import { describe, expect, it } from 'vitest'
import { DAMAGE_PLAN_VARIANTS, planEffectiveDamagePath } from './effective-paths-edamage-plan'
import { planEffectiveEconomyPath } from './effective-paths-eecon-plan'
import { zeroEffectiveDamageConfig } from './effective-paths-edamage-config'
import { ZERO_EFFECTIVE_DAMAGE_LEVELS } from './effective-paths-edamage-levels'
import { ZERO_EFFECTIVE_ECONOMY_LEVELS } from './effective-paths-eecon-levels'
import { zeroEffectiveEconomyConfig } from './effective-paths-eecon-compute'
import type { PathStep } from './effective-paths-planner'

/**
 * What is true of *any* path, whatever it is planning.
 *
 * ## Why structural checks and not values
 *
 * The value tests elsewhere compare a path against the sheet, one account at a
 * time. They are the authority on whether the numbers are right, and they say
 * nothing about whether the walk itself is sane.
 *
 * These do. A path is a sequence of purchases, and a sequence of purchases has
 * properties that hold regardless of the model behind it: you buy a level at a
 * time, you never buy past a cap, the running total only goes up, and asking
 * the same question twice gives the same answer. Each of those can break
 * without a single value being obviously wrong — a path that skips from level 4
 * to level 6 still shows plausible numbers in every row.
 *
 * They also cover every variant rather than the one an account happens to
 * exercise, which is what makes them cheap to keep.
 */

const PLANS = [
  ...DAMAGE_PLAN_VARIANTS.map(variant => ({
    family: `damage/${variant}`,
    plan: (steps: number) => planEffectiveDamagePath({
      config: zeroEffectiveDamageConfig(),
      levels: ZERO_EFFECTIVE_DAMAGE_LEVELS,
      variant,
      steps,
    }),
  })),
  ...(['time', 'coin', 'stone'] as const).map(variant => ({
    family: `econ/${variant}`,
    plan: (steps: number) => planEffectiveEconomyPath({
      config: zeroEffectiveEconomyConfig(),
      levels: ZERO_EFFECTIVE_ECONOMY_LEVELS,
      variant,
      steps,
      workshopEnhancementsUnlocked: true,
    }),
  })),
]

const REQUESTED = 30

describe.each(PLANS)('$family', ({ plan }) => {
  const result = plan(REQUESTED)
  const steps: PathStep[] = result.steps

  it('plans no more steps than were asked for', () => {
    // Fewer is legitimate — everything reachable can be capped. More is a loop
    // that does not stop, and on the sheet's 145-row grid that is a hang.
    expect(steps.length).toBeLessThanOrEqual(REQUESTED)
  })

  it('numbers its steps from one, without gaps', () => {
    expect(steps.map(step => step.step)).toEqual(steps.map((_, index) => index + 1))
  })

  it('buys one level at a time, in order, per upgrade', () => {
    /*
     * The invariant a greedy loop breaks quietly. Every step raises exactly one
     * upgrade by exactly one level, so an upgrade's levels across the path must
     * be consecutive and ascending. Skipping one still renders a plausible row
     * — and prices a level the player never bought.
     */
    const seen = new Map<string, number>()
    for (const step of steps) {
      const previous = seen.get(step.id)
      if (previous !== undefined) {
        expect(step.level, `${step.name} jumped from ${previous}`).toBe(previous + 1)
      }
      seen.set(step.id, step.level)
    }
  })

  it('never buys the same upgrade at the same level twice', () => {
    const bought = steps.map(step => `${step.id}@${step.level}`)
    expect(new Set(bought).size).toBe(bought.length)
  })

  it('charges a real, positive price for every step', () => {
    // The planner's own rule — a non-positive or non-finite cost takes a
    // candidate out of the running — so nothing it *chose* may violate it.
    for (const step of steps) {
      expect(Number.isFinite(step.cost), step.name).toBe(true)
      expect(step.cost, step.name).toBeGreaterThan(0)
    }
  })

  it('accumulates cost exactly, and only upwards', () => {
    let running = 0
    for (const step of steps) {
      running += step.cost
      expect(step.cumulativeCost, `step ${step.step}`).toBeCloseTo(running, 6)
    }
  })

  it('reports the return it actually chose on', () => {
    // `roi` is what the step was picked for. If it disagrees with `gain / cost`
    // then the ranking and the report are two different stories, and a reader
    // comparing rows is being misled.
    for (const step of steps) {
      expect(step.roi, step.name).toBeCloseTo(step.gain / step.cost, 6)
    }
  })

  it('never goes backwards in value', () => {
    /*
     * Not "every gain is positive": a zero-gain step is legitimate when nothing
     * left improves the model and the tie-break picks something. Going *down*
     * is not — it would mean a purchase made the player worse off.
     */
    for (const [index, step] of steps.entries()) {
      if (index === 0) continue
      expect(step.value, `step ${step.step}`).toBeGreaterThanOrEqual(steps[index - 1].value)
    }
  })

  it('gives the same answer twice', () => {
    // Determinism is the whole basis for comparing a run against the sheet, or
    // against yesterday. A `Map` iteration order or an unstable sort would show
    // up here and nowhere else.
    const again = plan(REQUESTED)
    expect(again.steps.map(step => `${step.id}@${step.level}:${step.cost}`))
      .toEqual(steps.map(step => `${step.id}@${step.level}:${step.cost}`))
  })

  it('extends rather than rewrites when asked for more steps', () => {
    /*
     * A greedy walk has no lookahead, so the first N steps of a longer plan
     * must be the shorter plan exactly. If they differ, something is reading
     * state that depends on how many steps were requested — and the short plan
     * a player sees would not be the start of the long one.
     */
    const longer = plan(REQUESTED + 10)
    const head = longer.steps.slice(0, steps.length).map(step => `${step.id}@${step.level}`)
    expect(head).toEqual(steps.map(step => `${step.id}@${step.level}`))
  })

  it('explains every candidate it did not plan', () => {
    const planned = new Set(steps.map(step => step.name))
    for (const entry of result.excluded) {
      expect(entry.reason, entry.sheetName).toBeTruthy()
      // And does not contradict itself by excluding something it bought.
      expect(planned.has(entry.sheetName), `${entry.sheetName} was planned and excluded`).toBe(false)
    }
  })

  it('plans nothing at all when asked for nothing', () => {
    // `steps: 0` is a legitimate way to ask only for the starting value, which
    // is how the site reads a path's "Current" figure.
    expect(plan(0).steps).toEqual([])
  })
})
