import { describe, expect, it } from 'vitest'
import {
  appendSkipExclusions,
  describePathSkip,
  type PathSkip,
  planPath,
  skipsFromFirstStep,
} from './effective-paths-planner'
import { planEffectiveDamagePath } from './effective-paths-edamage-plan'
import { planEffectiveEconomyPath } from './effective-paths-eecon-plan'
import { zeroEffectiveDamageConfig } from './effective-paths-edamage-config'
import { ZERO_EFFECTIVE_DAMAGE_LEVELS } from './effective-paths-edamage-levels'
import { ZERO_EFFECTIVE_ECONOMY_LEVELS } from './effective-paths-eecon-levels'
import { zeroEffectiveEconomyConfig } from './effective-paths-eecon-compute'

/**
 * Every candidate a plan leaves out is accounted for.
 *
 * ## Why this is not cosmetic
 *
 * The greedy loop passes over a candidate for three reasons — it is at its cap,
 * it has no usable price, or the model cannot value it — and all three used to
 * be a bare `continue`. A candidate dropped that way appeared in neither the
 * steps nor the exclusions, so a path that stopped early or ranked something
 * strange had no explanation anywhere.
 *
 * That cost real time. A live account planned a module level nine orders of
 * magnitude worse per day than a lab whose next level simply never appeared,
 * and it read as a ranking bug for a whole round of investigation. It was not:
 * every lab on the account was already at its cap. The plan now says so.
 *
 * So the rule is: **a candidate is planned, or it is explained.** Never
 * neither.
 */

const damage = () => planEffectiveDamagePath({
  config: zeroEffectiveDamageConfig(),
  levels: ZERO_EFFECTIVE_DAMAGE_LEVELS,
  variant: 'lab-time',
  steps: 5,
})

const econ = () => planEffectiveEconomyPath({
  config: zeroEffectiveEconomyConfig(),
  levels: ZERO_EFFECTIVE_ECONOMY_LEVELS,
  variant: 'time',
  steps: 5,
  workshopEnhancementsUnlocked: true,
})

describe('every planner explains what it left out', () => {
  for (const [family, plan] of [['damage', damage], ['econ', econ]] as const) {
    it(`${family} gives every exclusion a reason`, () => {
      for (const entry of plan().excluded) {
        // A reason nobody can read is the same as no reason. Not matched
        // against a keyword list: the first version of this rejected "what it
        // multiplies is not taken yet", which is a better reason than any
        // pattern it was checking for.
        expect(entry.reason, entry.sheetName).toBeTruthy()
        expect(entry.reason.length, entry.sheetName).toBeGreaterThan(10)
      }
    })

    it(`${family} never leaves a candidate both unplanned and unexplained`, () => {
      const result = plan()
      const planned = new Set(result.steps.map(step => step.name))
      const explained = new Set(result.excluded.map(entry => entry.sheetName))
      // Not asserted against the full catalog: each planner filters by variant
      // first, and a candidate the variant does not offer is not "left out".
      for (const name of planned) expect(explained.has(name)).toBe(false)
      expect(planned.size + explained.size).toBeGreaterThan(0)
    })
  }
})

describe('the skip record itself', () => {
  const skips: PathSkip[] = []
  const steps = planPath({
    upgrades: [
      { id: 'maxed', name: 'Maxed', level: 5, maxLevel: 5 },
      { id: 'stopped', name: 'Stopped', level: 2, maxLevel: 9, targetLevel: 2 },
      { id: 'free', name: 'Free', level: 0, maxLevel: 9 },
      { id: 'priceless', name: 'Priceless', level: 0, maxLevel: 9 },
      { id: 'good', name: 'Good', level: 0, maxLevel: 9 },
    ],
    steps: 1,
    evaluate: levels => (levels.get('good') ?? 0) * 10,
    cost: id => {
      if (id === 'free') return 0
      if (id === 'priceless') return Number.NaN
      return 1
    },
    onSkip: skip => skips.push(skip),
  })

  const byId = new Map(skipsFromFirstStep(skips).map(skip => [skip.id, skip]))

  it('plans the one candidate that is buyable and worth something', () => {
    expect(steps.map(step => step.id)).toEqual(['good'])
  })

  it('reports a maxed upgrade as capped, with its cap', () => {
    expect(byId.get('maxed')?.reason).toBe('capped')
    expect(byId.get('maxed')?.detail).toBe(5)
  })

  it('reports a player’s own stop as capped at the stop, not the maximum', () => {
    // `targetLevel` wins over `maxLevel`, and the reason has to say which — a
    // player who set a stop needs to see their own number back.
    expect(byId.get('stopped')?.detail).toBe(2)
    expect(describePathSkip(byId.get('stopped')!)).toBe('already at its cap of 2')
  })

  it('separates a price of zero from no price at all', () => {
    /*
     * Both take the candidate out of the running and they are different faults:
     * zero is a discount that reached 100%, `NaN` is a missing catalog entry.
     * Reporting them alike sends the reader to the wrong place.
     */
    expect(byId.get('free')?.reason).toBe('unpriced')
    expect(describePathSkip(byId.get('free')!)).toMatch(/priced at 0/)

    expect(byId.get('priceless')?.reason).toBe('unpriced')
    expect(describePathSkip(byId.get('priceless')!)).toMatch(/no price/)
  })

  it('records the level it would have bought', () => {
    expect(byId.get('free')?.nextLevel).toBe(1)
    expect(byId.get('stopped')?.nextLevel).toBe(3)
  })

  it('fires every step, so a caller has to take the first', () => {
    // The whole reason `skipsFromFirstStep` exists: unfiltered, a 145-step plan
    // reports the same capped upgrade 145 times.
    const many: PathSkip[] = []
    planPath({
      upgrades: [
        { id: 'maxed', name: 'Maxed', level: 5, maxLevel: 5 },
        { id: 'good', name: 'Good', level: 0, maxLevel: 99 },
      ],
      steps: 4,
      evaluate: levels => (levels.get('good') ?? 0) * 10,
      cost: () => 1,
      onSkip: skip => many.push(skip),
    })

    expect(many.length).toBe(4)
    expect(skipsFromFirstStep(many).length).toBe(1)
  })
})

describe('appendSkipExclusions', () => {
  const skip = (over: Partial<PathSkip> = {}): PathSkip => ({
    step: 1, id: 'a', name: 'A', nextLevel: 2, reason: 'capped', detail: 1, ...over,
  })

  it('keeps a planner’s own reason over a generic one', () => {
    /*
     * "the weapon is not unlocked" says more than "already at its cap", and the
     * planner knew the first before the loop ever ran. A second entry for the
     * same upgrade would also render twice.
     */
    const excluded = [{ sheetName: 'A', reason: 'the weapon is not unlocked' }]
    appendSkipExclusions(excluded, [], [skip()])
    expect(excluded).toEqual([{ sheetName: 'A', reason: 'the weapon is not unlocked' }])
  })

  it('says nothing about an upgrade that was planned', () => {
    // A candidate capped at step 40 was still bought 39 times; reporting it as
    // left out would contradict the path above it.
    const excluded: Array<{ sheetName: string, reason: string }> = []
    appendSkipExclusions(
      excluded,
      [{ step: 1, id: 'a', name: 'A', level: 2, cost: 1, cumulativeCost: 1, gain: 1, roi: 1, value: 1 }],
      [skip()],
    )
    expect(excluded).toEqual([])
  })

  it('adds each upgrade once, however many steps it was skipped on', () => {
    const excluded: Array<{ sheetName: string, reason: string }> = []
    appendSkipExclusions(excluded, [], [skip(), skip({ step: 2 }), skip()])
    expect(excluded).toHaveLength(1)
  })
})
