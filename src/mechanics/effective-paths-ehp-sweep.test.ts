import { describe, expect, it } from 'vitest'
import { computeEffectiveHealth } from './effective-paths-ehp-model'
import { survivalMultiplier } from './effective-paths-hp'
import { planEffectiveHealthPath } from './effective-paths-ehp-plan'
import {
  effectiveHealthConfigFromSheet,
  effectiveHealthLevelsFromSheet,
} from './effective-paths-ehp-from-sheet'
import fixture from '../../fixtures/mechanics/effective-paths-ehp-sweep.fixtures.json'

/**
 * eHP against the sheet's live row, on ten accounts.
 *
 * What this replaces: a path fixture of ONE account captured "from an all-zero
 * starting state". At zero nearly every term is its own identity, so a factor
 * that is never applied looks exactly like a factor applied to nothing -- the
 * weakest fixture shape there is.
 *
 * eHP had no cell reader until now, which is why it never had a sweep: without
 * one there is no way to drive the port from a captured account.
 * `effective-paths-ehp-from-sheet.ts` is that reader, written against the cells
 * each component formula names rather than against neighbours.
 */

interface Column { header: string, value: unknown }
interface Account {
  id: string
  cellDiff: Record<string, unknown>
  columns: Record<string, Column>
  steps: Array<{ step: number, name: string, level: unknown }>
  poolGate: { AM21: unknown, AM23: unknown }
}

const SWEEP = fixture as unknown as {
  baseCells: Record<string, unknown>
  states: Account[]
}

const cellsFor = (a: Account) => ({ ...SWEEP.baseCells, ...a.cellDiff })
const breakdownFor = (a: Account) => {
  const cells = cellsFor(a)
  return computeEffectiveHealth(
    effectiveHealthConfigFromSheet(cells), effectiveHealthLevelsFromSheet(cells),
  )
}

/**
 * Every column of the sheet's component band, and what produces it here.
 *
 * The survival terms are stored by the sheet as MULTIPLIERS and by the port as
 * REDUCTIONS, so `survivalMultiplier` is applied on this side rather than
 * inverting the sheet's -- inverting would let a wrong reduction cancel itself
 * and pass.
 */
const COLUMNS: Array<[string, string, (b: ReturnType<typeof breakdownFor>) => number | null]> = [
  ['CI5', 'Disco Defense', b => b.dissonance],
  ['CJ5', 'Health', b => b.health],
  ['CK5', 'Armor', b => b.armor],
  ['CL5', 'Defense Absolute', b => b.defenseAbsolute],
  ['CM5', 'Defense %', b => survivalMultiplier(b.defensePercent)],
  ['CN5', 'Wall Fortification', b => b.wallHealth],
  ['CO5', 'Recovery Package Max', b => b.maxRecovery],
  ['CP5', 'Improve Trade-off', b => survivalMultiplier(b.tradeOffReduction)],
  ['CQ5', 'Chrono Field', b => survivalMultiplier(b.chronoFieldReduction)],
  ['CR5', 'Chain Thunder', b => survivalMultiplier(b.chainThunderReduction)],
  ['CS5', 'eHP', b => b.effectiveHealth],
]

describe('eHP across the swept accounts', () => {
  it('captured accounts that actually differ', () => {
    // Sized from the fixture: the capture takes an account count, and growing
    // the sweep must not fail the test that says the accounts moved.
    expect(SWEEP.states.length).toBeGreaterThanOrEqual(10)
    expect(new Set(SWEEP.states.map(a => a.columns.CS5?.value)).size)
      .toBe(SWEEP.states.length)
    expect(new Set(SWEEP.states.map(a => a.steps[0]?.name)).size).toBeGreaterThan(2)
  })

  it('exercises the pool branch in both directions', () => {
    /*
     * `hasPool` is a BRANCH, not a factor: with no wall and no recovery the
     * sheet substitutes the constant 1 rather than multiplying by zero. A sweep
     * that never turns the gate on tests one side of an if — and the first
     * capture here did exactly that, with seven of eleven columns identical on
     * every account.
     */
    const gated = SWEEP.states.filter(a =>
      a.poolGate.AM21 === true || a.poolGate.AM23 === true)
    expect(gated.length).toBeGreaterThan(0)
    expect(gated.length).toBeLessThan(SWEEP.states.length)
  })

  it('names the columns that are still constant, rather than implying coverage', () => {
    /*
     * Pinned by the workbook's blank demo `_IDS`, not by the generator: armor
     * and defense-absolute come from workshop stats and modules the IMPORTRANGE
     * does not supply, and Disco Defense from dissonance personal bests.
     */
    const uniform = Object.keys(SWEEP.states[0].columns).filter(cell =>
      new Set(SWEEP.states.map(a => a.columns[cell]?.value)).size === 1)
    /*
     * A SUBSET assertion, not an equality. `CR5` (Chain Thunder) was on this
     * list at ten accounts and came off it at sixty -- more accounts reach more
     * states, and a widening sweep should not fail the test that reports what
     * it does not cover. What must not happen is a column QUIETLY joining the
     * list, so anything outside the known-pinned set is a failure.
     */
    const PINNED_BY_BLANK_IDS = ['CI5', 'CK5', 'CL5', 'CQ5', 'CR5']
    expect(uniform.filter(c => !PINNED_BY_BLANK_IDS.includes(c))).toEqual([])
  })

  it('reproduces every component column, on every account', () => {
    const failures: string[] = []
    for (const account of SWEEP.states) {
      const ours = breakdownFor(account)
      for (const [cell, header, get] of COLUMNS) {
        const theirs = account.columns[cell]?.value
        // The sheet writes "" for wall and recovery when their gate is off; the
        // port returns null. Both mean "not in play" and neither is a number.
        if (typeof theirs !== 'number') continue
        const mine = get(ours)
        if (mine === null || !Number.isFinite(mine)) {
          failures.push(`${account.id} ${cell} (${header}): port has ${mine}`)
          continue
        }
        const relative = theirs === 0
          ? Math.abs(mine)
          : Math.abs(mine - theirs) / Math.abs(theirs)
        if (relative > 1e-9) {
          failures.push(`${account.id} ${cell} (${header}): `
            + `got ${mine.toExponential(8)}, sheet ${theirs.toExponential(8)}`)
        }
      }
    }
    // Named, never counted — the column IS the diagnosis. This is what caught
    // the armor reader: `EPH_ARMOR(primary, hasAssist, assistBonus, …)` takes
    // the flag SECOND and the bonus THIRD, the reverse of the cell order, and
    // reading them the other way round gave a flat 0.8x on all ten accounts.
    expect(failures).toEqual([])
  })

  it('blanks wall and recovery together with the sheet', () => {
    /*
     * The pool is `null` and not `0`. Zero would multiply the whole health term
     * away; the sheet substitutes 1. Checked against the gate rather than
     * against our own output, so it cannot agree with itself.
     */
    for (const account of SWEEP.states) {
      const ours = breakdownFor(account)
      const gated = account.poolGate.AM21 === true || account.poolGate.AM23 === true
      if (!gated) {
        expect(ours.wallHealth, `${account.id} wall`).toBeNull()
        expect(ours.maxRecovery, `${account.id} recovery`).toBeNull()
      }
    }
  })

  /** ROI-band header -> the level key the planner knows it by. */
  const KEY_BY_NAME: Record<string, string> = {
    'Health': 'health',
    'Defense Absolute': 'defenseAbsolute',
    'Defense %': 'defensePercent',
    'Wall Health': 'wallHealth',
    'Wall Fortification': 'wallFortification',
    'Recovery Package Max': 'recoveryPackageMax',
    'Standard Perks Bonus': 'standardPerksBonus',
    'Improve Trade-Off Perks': 'improveTradeOffPerks',
    'Chrono Field Reduction %': 'chronoFieldReduction',
    'Death Wave Health': 'deathWaveHealth',
    'Chain Thunder': 'chainThunder',
    'Health Mastery': 'healthMastery',
    'Extra Defense Mastery': 'extraDefenseMastery',
    'Assist Module Substats - Armor': 'assistSubstatArmorLab',
    'Assist Module Substats - Generator': 'assistSubstatGeneratorLab',
    'Assist Module Bonus - Armor': 'assistBonusArmorLab',
    'Dissonant Echo - Defense': 'dissonantEchoDefense',
  }

  /**
   * The candidates the sheet actually OFFERS this account, from its own ROI
   * band: a blank cell is the sheet declining to price the upgrade at all.
   *
   * Taken from the fixture rather than modelled, because one of the gates
   * cannot be modelled from the tab's inputs -- see the test below.
   */
  /**
   * The per-lab ceiling from the tab's own `BE` column.
   *
   * Not optional: `labMaxCatalogLevel` returns 0 for the card masteries,
   * because they are not labs and the catalog has no row for them. Without a
   * ceiling the planner buys `Health Mastery` past the sheet's 9.
   */
  const maxLevelsFromSheet = (account: Account) => {
    const cells = cellsFor(account) as Record<string, unknown>
    const out: Record<string, number> = {}
    for (let row = 5; row <= 30; row += 1) {
      const name = cells[`BB${row}`]
      const max = cells[`BE${row}`]
      const key = typeof name === 'string' ? KEY_BY_NAME[name] : undefined
      if (key && typeof max === 'number' && max > 0) out[key] = max
    }
    return out
  }

  /**
   * What the sheet offers AT EACH STEP, from `roiByStep`.
   *
   * `roiByStep[k]` is ROI row `5+k`: the board after `k` purchases, which
   * decides step `k+1`. The gates are re-evaluated on every row -- `DT5` opens
   * with `IF(OR(CU5, $DT$2, <cap>), "", …)` and row 27 asks the same question
   * of a board 26 purchases further on -- so a candidate can be offered at
   * step 1 and withdrawn by step 27.
   *
   * A step-1 snapshot said exactly that about Health Mastery on `account-5`,
   * and the port kept buying it for fourteen steps the sheet had closed.
   */
  const availableAtStep = (account: Account) => {
    const perStep = account.roiByStep.map(row => new Set(
      Object.entries(row)
        .filter(([, value]) => value !== null)
        .map(([name]) => KEY_BY_NAME[name])
        .filter((key): key is string => Boolean(key)),
    ))
    // Past the captured rows, fall back to the last one we have rather than
    // opening the board back up.
    return (step: number, id: string) =>
      (perStep[step - 1] ?? perStep.at(-1) ?? perStep[0]).has(id)
  }

  it('reproduces the sheet path order, on every account', () => {
    /*
     * A RATCHET on leading agreement: `>=`, so a fix passes and a regression
     * fails, rather than an equality an improvement would break.
     *
     * All ten accounts reproduce all forty steps.
     *
     * Three things had to be separated to get here, and each looked like a
     * ranking bug until it was not:
     *
     *   availability  the sheet's gates, re-evaluated per ROW
     *   ceilings      from the tab's `BE` column, because `labMaxCatalogLevel`
     *                 returns 0 for card masteries -- they are not labs
     *   ranking       the only part that is actually the port's
     *
     * With the port choosing its own candidate set, `account-8` agreed on ZERO
     * of forty steps; with a step-1 snapshot of the gates, `account-5` agreed
     * on 26. Neither was a mis-priced candidate.
     *
     * Availability comes from the sheet, ranking from the port. Separating them
     * is what made this measurable: with the port choosing its own candidate
     * set, `account-8` agreed on ZERO of forty steps, which reads as a broken
     * ranking and was not one.
     */
    const EXPECTED: Record<string, number> = {
      'account-0': 40, 'account-1': 40, 'account-2': 40, 'account-3': 40,
      'account-4': 40, 'account-5': 40, 'account-6': 40, 'account-7': 40,
      'account-8': 40, 'account-9': 40,
    }

    const regressions: string[] = []
    for (const account of SWEEP.states) {
      const cells = cellsFor(account)
      const plan = planEffectiveHealthPath({
        config: effectiveHealthConfigFromSheet(cells),
        levels: effectiveHealthLevelsFromSheet(cells),
        // eHP names its variants differently from eEcon: `lab-time`, not `time`.
        variant: 'lab-time',
        steps: account.steps.length,
        maxLevels: maxLevelsFromSheet(account) as never,
        available: availableAtStep(account),
      })
      const ours = plan.steps.map(s => s.name)
      const theirs = account.steps.map(s => s.name)
      expect(plan.steps.length, `${account.id} planned nothing`).toBeGreaterThan(0)

      let agree = 0
      while (agree < ours.length && agree < theirs.length && ours[agree] === theirs[agree]) {
        agree += 1
      }
      if (agree < (EXPECTED[account.id] ?? 0)) {
        regressions.push(`${account.id}: ${agree}/${theirs.length} leading steps agree, `
          + `was ${EXPECTED[account.id]} — first difference at step ${agree + 1}, `
          + `port ${ours[agree]}, sheet ${theirs[agree]}`)
      }
    }
    // Named, never counted — the account and the step ARE the diagnosis.
    expect(regressions).toEqual([])
  })

  it('records why availability cannot be modelled from the tab', () => {
    /*
     * `eHP!DA5`, the Standard Perks Bonus candidate, is gated by
     *
     *     IF(OR(CU5, DB$2, <level cap>), "", …)
     *
     * `DB$2` is IMPROVE TRADE-OFF PERKS' visibility toggle, not its own. Every
     * other candidate column in `CV..DH` reads its own `$2` or none at all;
     * `DA5` is the single exception. So Standard Perks Bonus is hidden or shown
     * according to a different upgrade, and no reading of the port's inputs can
     * predict it.
     *
     * That is what the earlier 0/40 on `account-8` was: not a mis-ranked
     * candidate but one the sheet was not offering. The port bought Standard
     * Perks Bonus on three accounts and the sheet bought it on none of the ten.
     *
     * Asserted here so the fixture's blank cells are understood as the sheet's
     * own statement of what it offers, rather than as missing data.
     */
    const everOffered = SWEEP.states.filter(a => a.roi['Standard Perks Bonus'] !== null)
    const everBought = SWEEP.states.filter(a =>
      a.steps.some(s => s.name === 'Standard Perks Bonus'))

    /*
     * At ten accounts the sheet bought this on NONE of them and the note here
     * said so. At sixty it buys it on several. The gate is what it always was
     * -- `DA5` reads `DB$2` -- and "never bought" was a fact about the sample,
     * not about the sheet. Asserted as a mix now, which is the claim that
     * actually holds: availability varies per account and per step, in a way
     * nothing in the port's inputs can predict.
     */
    expect(everOffered.length).toBeGreaterThan(0)
    expect(everOffered.length).toBeLessThan(SWEEP.states.length)
    expect(everBought.length).toBeLessThan(SWEEP.states.length)
  })

  it('excludes only what the sheet blanked, and nothing else', () => {
    // Guards the mapping above: an ROI header this test cannot name would
    // silently drop out of `excludeKeys` and quietly widen the candidate set.
    const unmapped = new Set<string>()
    for (const account of SWEEP.states) {
      for (const name of Object.keys(account.roi)) {
        if (!(name in KEY_BY_NAME)) unmapped.add(name)
      }
    }
    expect([...unmapped]).toEqual([])
  })

  /** The five ROI columns priced on a local ladder rather than on eHP. */
  const LOCAL_SHAPE = new Set([
    'Health', 'Death Wave Health', 'Health Mastery',
    'Assist Module Bonus - Armor', 'Dissonant Echo - Defense',
  ])

  it('prices every candidate the way the sheet does, at step 1', () => {
    /*
     * The strongest check here, and the one that found both mastery defects.
     *
     * Compared through the base eHP, because the two sides carry different
     * UNITS: the sheet's band is `(candidate/CS5 - 1)/duration`, a RELATIVE
     * gain, while `planPath` ranks on `gain/price` with an ABSOLUTE gain. The
     * factor is the account's own eHP and is constant within a step, so it
     * never changes an ordering -- but comparing the raw numbers would show a
     * uniform 5.4813x on `account-0` and prove nothing.
     *
     * Twelve of the seventeen columns are `(candidate/CS5 - 1)/duration`; five
     * are a local ladder that never touches the composition. `DT5` (Health
     * Mastery) is the one where that distinction bites, because `EPH_HEALTH`
     * puts the mastery inside the card branch and the column does not check the
     * card at all.
     */
    const failures: string[] = []
    let accountsCompared = 0
    let pairsCompared = 0
    for (const account of SWEEP.states) {
      const cells = cellsFor(account)
      const config = effectiveHealthConfigFromSheet(cells)
      const levels = effectiveHealthLevelsFromSheet(cells)
      const base = computeEffectiveHealth(config, levels).effectiveHealth

      const ours = new Map<string, number>()
      planEffectiveHealthPath({
        config,
        levels,
        variant: 'lab-time',
        steps: 1,
        maxLevels: maxLevelsFromSheet(account) as never,
        onCandidateRoi: entry => { if (entry.step === 1) ours.set(entry.name, entry.roi) },
      })

      accountsCompared += 1
      for (const [name, theirs] of Object.entries(account.roi)) {
        // A blank is the sheet declining to offer the candidate, checked above.
        if (typeof theirs !== 'number' || theirs === 0) continue
        pairsCompared += 1
        const mine = ours.get(name)
        if (mine === undefined || mine === 0) {
          failures.push(`${account.id} ${name}: sheet prices it at `
            + `${theirs.toExponential(4)}, port has ${mine}`
            + `${LOCAL_SHAPE.has(name) ? ' (local-shape column)' : ''}`)
          continue
        }
        const drift = (mine / base) / theirs
        if (Math.abs(drift - 1) > 1e-6) {
          failures.push(`${account.id} ${name}: off by x${drift.toFixed(5)}`
            + `${LOCAL_SHAPE.has(name) ? ' (local-shape column)' : ''}`)
        }
      }
    }
    /*
     * Guards the guard.
     *
     * The loop above skips silently -- a blank ROI is the sheet declining to
     * offer a candidate -- so a change that made the planner price nothing
     * would leave `failures` empty and pass. A check that runs on nothing looks
     * exactly like a check that found nothing, which is the shape of every
     * defect these sweeps exist to catch.
     *
     * Measured 2026-08-20 (60 accounts, 302 comparisons) and pinned as a FLOOR,
     * so a fixture gaining accounts is not a failure.
     */
    expect(accountsCompared, 'the ROI comparison ran on no accounts').toBeGreaterThanOrEqual(60)
    expect(pairsCompared, 'the ROI comparison made no comparisons').toBeGreaterThanOrEqual(302)
    // Named, never counted — the candidate IS the diagnosis.
    expect(failures).toEqual([])
  })
})
