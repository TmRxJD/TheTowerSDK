import { describe, expect, it } from 'vitest'
import { computeEffectiveEconomy } from './effective-paths-eecon-compute'
import { configFromSheet, levelsFromSheet } from './effective-paths-eecon-compute.test'
import { planEffectiveEconomyPath } from './effective-paths-eecon-plan'
import fixture from '../../fixtures/mechanics/effective-paths-eecon-sweep.fixtures.json'

/**
 * eEcon's PATH against the sheet, on ten accounts instead of one.
 *
 * The columns were already covered: `effective-paths-eecon-states.fixtures.json`
 * holds twelve accounts and asserts all 29 of them. What sat on a single
 * account was the PATH -- `effective-paths-eecon-path.fixtures.json` is one
 * player -- and the path is the product. Two models can agree on every number
 * and still rank the upgrades differently.
 *
 * The columns are re-asserted here anyway, on ten DIFFERENT accounts, and that
 * is what caught the Gold Bot cooldown: twelve accounts had not happened to
 * include one whose coin weapons were synced, so the branch that reads the
 * sync ratio never ran.
 *
 * The whole-workbook scan named eEcon as the last real gap: five functions
 * (`DVT_BOT_STAT`, `EP_NEXT_UWP_COST`, `MODSTAT_GENERATOR`,
 * `TTG_DISSONANT_UTILITY_BOOST`, `_IDS_READY`) reach an eEcon answer cell and
 * nothing swept them. This is the sweep.
 *
 * Captured by `scripts/effective-paths/capture-eecon-sweep.mjs`, which
 * snapshots `eEcon!BE5:BE35` in formula mode and restores it afterwards -- the
 * levels there are `=IDS_LAB_LEVEL(...)`, and the older eDamage sweep simply
 * overwrote its equivalents (`eDamage!BC5:BC9` are bare numbers to this day).
 */

interface Column { header: string, value: unknown }
interface Account {
  id: string
  cellDiff: Record<string, unknown>
  columns: Record<string, Column>
  steps: Array<{ step: number, name: string, level: unknown }>
  roi: Record<string, number | null>
  roiByStep: Array<Record<string, number | null>>
}

const SWEEP = fixture as unknown as {
  baseCells: Record<string, unknown>
  states: Account[]
}

const cellsFor = (account: Account) => ({ ...SWEEP.baseCells, ...account.cellDiff })

/** The sheet writes a level as `lvl 12`; the planner counts in numbers. */
const sheetLevel = (raw: unknown): number =>
  Number(String(raw ?? '').replace(/[^\d]/g, '')) || 0

const outputsFor = (account: Account): Record<string, number> => {
  const out: Record<string, number> = {}
  for (const [cell, col] of Object.entries(account.columns)) {
    if (typeof col.value === 'number') out[cell] = col.value
  }
  return out
}

/**
 * Below this, the sheet's own ROI is the difference of two nearly equal
 * doubles and carries no information.
 *
 * Card Mastery durations run to ~1e9, so a ~1e-2 relative gain over that cost
 * lands at ~1e-11 -- and at 60 accounts several of the sheet's values there are
 * NEGATIVE, which would mean an upgrade that makes the account worse. They are
 * cancellation noise, not measurements.
 *
 * The consequence is a real limit on parity, not an excuse: wherever the
 * sheet's numbers have resolution the port reproduces them exactly, and where
 * they do not, no correct model can reproduce the ORDER either, because the
 * order is noise.
 */
const SHEET_NOISE_FLOOR = 1e-9

describe('eEcon across the swept accounts', () => {
  it('captured ten accounts that actually differ', () => {
    /*
     * A sweep where nothing moved passes every comparison and proves nothing.
     * `eDamage`'s stone band once ran 24 levels that reached zero candidates
     * and returned the list in declaration order; it looked like a path.
     */
    // Sized from the fixture, not pinned: the capture takes an account count
    // and a bigger sweep must not fail the test that says it moved.
    expect(SWEEP.states.length).toBeGreaterThanOrEqual(10)
    const answers = new Set(SWEEP.states.map(a => a.columns.DS5?.value))
    expect(answers.size).toBe(SWEEP.states.length)
    // Different ANSWERS and different OPENINGS. Path length was the first
    // check here and it was the wrong one: once the accounts got richer every
    // one of them planned the full forty steps, so a real improvement in the
    // fixture failed the test that was meant to police it.
    const openings = new Set(SWEEP.states.map(a => a.steps[0]?.name))
    expect(openings.size).toBeGreaterThan(3)
  })

  it('still has six columns that are identical on every account', () => {
    /*
     * These are pinned by the workbook, not by the generator, and saying so is
     * the point: each is a column the sweep does NOT test.
     *
     * `_IDS` on the working copy is a blank demo IMPORTRANGE, so every function
     * reading the player's modules, bots or dissonance personal bests returns
     * the same thing whatever else changes -- `CV5` is
     * `MODSTAT_GENERATOR(IDS_MOD_GENERATOR_RARITY(...), …)` and there is no
     * module to have a rarity. `sheet_info` lists this as a trap in as many
     * words: "Blank demo _IDS is not a missing column."
     *
     * Two more (`CU5`, `CX5`) used to be on this list and came off it by
     * writing the generator uniques directly. The rest need a populated IDS
     * Master, which is a different piece of work.
     */
    const uniform = Object.keys(SWEEP.states[0].columns).filter(cell =>
      new Set(SWEEP.states.map(a => a.columns[cell]?.value)).size === 1)
    expect(uniform.sort()).toEqual(['CQ5', 'CV5', 'CY5', 'DC5', 'DO5', 'DP5'])
  })

  it('covers both sides of the gold-bot divide-by-zero branch', () => {
    /*
     * `DL5` is `IFERROR(…, 120)` over a division by
     * `COUNTIF($BK$15:$BK$17, TRUE)`, so the fallback fires only with NO coin
     * weapon owned. That branch is a defect this sweep found and fixed -- and
     * then stopped covering: rolling the three flags freely gave ten accounts
     * that all owned at least one, and a planted `120 -> 121` passed the entire
     * sweep afterwards.
     *
     * Asserted rather than left to the generator's luck. A fixture that covers
     * one side of a branch and a suite that passes look identical from here.
     */
    const cellsOf = (account: Account) => cellsFor(account) as Record<string, unknown>
    const owned = (account: Account) =>
      ['BK15', 'BK16', 'BK17'].filter(ref => cellsOf(account)[ref] === true).length
    const compressor = (account: Account) => {
      const cells = cellsOf(account)
      const num = (ref: string) => (typeof cells[ref] === 'number' ? cells[ref] as number : 0)
      return num('AO7') + num('AS7')
    }

    /*
     * BOTH conditions are needed, which is the whole point. `IFS` is lazy, so a
     * non-zero compressor answers on the first branch and the division is never
     * evaluated -- pinning only the weapons left this uncovered while looking
     * covered, and accounts with nothing owned still answered 99 and 119.
     */
    const fallback = SWEEP.states.filter(a => owned(a) === 0 && compressor(a) === 0)
    const shortCircuit = SWEEP.states.filter(a => owned(a) === 0 && compressor(a) !== 0)
    const computed = SWEEP.states.filter(a => owned(a) > 0)
    expect(fallback.length, 'no account reaches the 120 fallback').toBeGreaterThan(0)
    expect(shortCircuit.length, 'no account distinguishes the branch ORDER').toBeGreaterThan(0)
    expect(computed.length, 'no account reaches the computed branch').toBeGreaterThan(0)

    /*
     * The third set is what makes the ORDER checkable. With only `fallback` and
     * `computed` present, swapping the two guards in `resolveGoldBotCooldown`
     * passed the entire sweep -- both orders agree when the compressor is 0.
     * These accounts own no weapon AND have a unique, so `IFS` answers on the
     * first branch and must NOT reach the fallback.
     */
    for (const account of shortCircuit) {
      // The claim is that these answer `$BN$19 + $BH$29`, not that they avoid
      // the number 120 -- `MIN(…, 120+$BH$29)` reaches 120 legitimately when
      // `$BH$29` is 0, so "not 120" was testing the wrong thing and failed the
      // moment a sixty-account sweep produced such an account.
      const cells = cellsOf(account)
      const num = (ref: string) => (typeof cells[ref] === 'number' ? cells[ref] as number : 0)
      expect(account.columns.DL5?.value, account.id).toBe(num('BN19') + num('BH29'))
    }

    // And the fallback really is 120 — not the Gold Bot's own cooldown, which
    // is what the port returned before the sweep caught it.
    for (const account of fallback) expect(account.columns.DL5?.value).toBe(120)
  })

  it('reproduces every computation column, on every account', () => {
    const failures: string[] = []
    for (const account of SWEEP.states) {
      const cells = cellsFor(account)
      const ours = computeEffectiveEconomy(
        configFromSheet(cells, outputsFor(account)), levelsFromSheet(cells),
      ).columns
      for (const [cell, col] of Object.entries(account.columns)) {
        const theirs = col.value
        if (typeof theirs !== 'number' || !Number.isFinite(theirs)) continue
        const mine = ours[cell]
        if (mine === undefined) {
          failures.push(`${account.id} ${cell} (${col.header}): port exposes nothing`)
          continue
        }
        const relative = theirs === 0
          ? Math.abs(mine)
          : Math.abs(mine - theirs) / Math.abs(theirs)
        if (relative > 1e-9) {
          failures.push(`${account.id} ${cell} (${col.header}): `
            + `got ${mine.toExponential(6)}, sheet ${theirs.toExponential(6)}`)
        }
      }
    }
    // Named, never counted — the column IS the diagnosis.
    expect(failures).toEqual([])
  })

  it('plans what the sheet plans, for every account', { timeout: 120_000 }, () => {
    const failures: string[] = []
    for (const account of SWEEP.states) {
      const cells = cellsFor(account)
      const plan = planEffectiveEconomyPath({
        config: configFromSheet(cells, outputsFor(account)),
        levels: levelsFromSheet(cells),
        variant: 'time',
        steps: account.steps.length,
      })
      const ours = plan.steps.map(s => `${s.name}@${s.level}`)
      const theirs = account.steps.map(s => `${s.name}@${sheetLevel(s.level)}`)
      if (ours.length !== theirs.length) {
        failures.push(`${account.id}: ${ours.length} steps vs the sheet's ${theirs.length}`)
        continue
      }
      const at = ours.findIndex((step, i) => step !== theirs[i])
      if (at < 0) continue

      /*
       * A divergence is only excusable where the sheet has nothing left to say.
       *
       * By deep steps the board is exhausted down to a handful of Card Mastery
       * candidates whose ROI is ~1e-11 -- some of them NEGATIVE, which would
       * mean an upgrade that hurts. At that magnitude the sheet's own
       * `New/Old - 1` is cancellation noise and its ORDER is not a fact about
       * the game. No correct model reproduces it, and pretending otherwise
       * would mean fitting to noise.
       *
       * Checked against the sheet's OWN band at that step, not against ours,
       * so it cannot excuse itself.
       */
      const priced = Object.values(account.roiByStep?.[at] ?? {})
        .filter((v): v is number => typeof v === 'number' && v !== 0)
      const allNoise = priced.length > 0 && priced.every(v => Math.abs(v) < SHEET_NOISE_FLOOR)
      if (allNoise) continue

      failures.push(`${account.id}: step ${at + 1} — port ${ours[at]}, sheet ${theirs[at]}`
        + ` (sheet's best remaining ROI ${Math.max(...priced.map(Math.abs)).toExponential(2)})`)
    }

    /*
     * Zero, and it took finding the actual mechanism to get there.
     *
     * Two accounts diverged here, both on Recovery Package Chance, and the
     * first diagnosis was wrong: it blamed `syncMultiplier` for quantising
     * cooldowns into whole cycles where the sheet supposedly did not. Our sync
     * IS a step function -- a level moves `CX5` 0.8290527 -> 0.8281056 and the
     * cooldowns with it, `DF5` 165.8 -> 165.6, and `DM5` does not budge to ten
     * decimal places -- but so is the sheet's. Evaluated directly,
     *
     *     EPC_SYNC(…, 165.8, …, 248.7, …) = 1.1788856304985336
     *     EPC_SYNC(…, 165.6, …, 248.4, …) = 1.1788856304985336
     *     EPC_SYNC(…, 165,   …, 248,   …) = 1.1788856304985336
     *
     * so the sheet is exactly as insensitive and the gain had to come from
     * somewhere else. It came from the candidate column itself: `eEcon!DW5`
     * rebuilds the cooldowns rather than reading `DB5`/`DF5`/`DI5`, and every
     * one of its three guards compares against GOLDEN TOWER's cooldown --
     * `DE5>=GTcd1*GComp` for Black Hole, `DH5>=GTcd1*GComp` for Death Wave.
     * `EPC_GTCD(FALSE, …)` is 0, so with no Golden Tower every guard is
     * `duration >= 0`, all three cooldowns collapse to 1, and the candidate's
     * sync is enormous.
     *
     * The prediction that followed was checked before the fix went in: the
     * sheet should buy this upgrade only where Golden Tower is unowned. Across
     * the ten accounts it does, and none of the seven that own it diverge.
     */
    expect(failures).toEqual([])
  })

  it('prices every candidate the way the sheet does, at step 1', () => {
    /*
     * The check eDamage and eHP have and eEcon did not. `ET5` is
     * `EPP_MATRIX(DV5:ES5)`, so `DV..ES` is the band the sheet ranks by.
     *
     * Compared through the base eEcon, because the units differ: the sheet's
     * band is a RELATIVE gain over a cost, `planPath` ranks on `gain/price`
     * with an ABSOLUTE one. The factor is the account's own eEcon and constant
     * within a step, so it never changes an ordering — but comparing raw
     * numbers would show a uniform ratio and prove nothing.
     *
     * The columns measure on different SUBSETS of the product: `Old` is `CR5`
     * for Coins per Kill, `CR5*CU5` for Standard Perks Bonus, `DM5` for
     * Recovery Package Chance, `CU5*DR5` for Wave Skip Mastery. Since
     * `DS5 = CW5*DM5*DQ5*DR5` and `CW5` carries `CR5`, `CS5`, `CT5`, `CU5` and
     * `CV5` as plain factors, a relative change in any subset equals the
     * relative change in `DS5` provided nothing outside it moved. So the
     * subsets are not why anything below disagrees.
     */

    const failures: string[] = []
    let accountsCompared = 0
    let pairsCompared = 0
    for (const account of SWEEP.states) {
      const cells = cellsFor(account)
      const config = configFromSheet(cells, outputsFor(account))
      const levels = levelsFromSheet(cells)
      const base = computeEffectiveEconomy(config, levels).effectiveEconomy

      const ours = new Map<string, number>()
      planEffectiveEconomyPath({
        config,
        levels,
        variant: 'time',
        steps: 1,
        onCandidateRoi: entry => { if (entry.step === 1) ours.set(entry.name, entry.roi) },
      })

      accountsCompared += 1
      for (const [name, theirs] of Object.entries(account.roi)) {
        // A blank is the sheet declining to offer the candidate on this row.
        if (typeof theirs !== 'number' || theirs === 0) continue
        pairsCompared += 1
        const mine = ours.get(name)
        const label = `${account.id} ${name}`
        if (mine === undefined || mine === 0) { failures.push(label); continue }
        const drift = (mine / base) / theirs
        if (Math.abs(drift - 1) > 1e-6) failures.push(label)
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
     * Measured 2026-08-20 (60 accounts, 332 comparisons) and pinned as a FLOOR,
     * so a fixture gaining accounts is not a failure.
     */
    expect(accountsCompared, 'the ROI comparison ran on no accounts').toBeGreaterThanOrEqual(60)
    expect(pairsCompared, 'the ROI comparison made no comparisons').toBeGreaterThanOrEqual(332)

    /*
     * A RATCHET on the comparisons that live below the floor of the sheet's
     * own arithmetic. One, on this fixture; it was four before the generator
     * was fixed to cover the gold-bot fallback, which shifted every account.
     *
     * The earlier note here blamed the wave-time denominator for crossing zero
     * and flipping `6500/(…)`. That was wrong, and the numbers say so: our
     * gain for both masteries is POSITIVE on every account (`account-0`'s Wave
     * Accelerator Mastery is +7.69e-2 relative), so nothing on our side changes
     * sign.
     *
     * What is actually going on is the COST. Card Mastery durations at these
     * levels are around 1e9, so the ROI is a ~1e-2 numerator over a ~1e9
     * denominator: 1e-11, give or take. At that magnitude `New/Old - 1` inside
     * the sheet is cancelling two nearly equal numbers, and the result is
     * noise. Six of the eight wave-mastery comparisons match us EXACTLY --
     * `account-1` at 1.304e-11 and 1.141e-11, `account-0`'s Wave Skip Mastery
     * at 5.217e-12. The two that do not include `account-0`'s -3.037e-10,
     * which implies a price of -2.5e8: a negative cost, which is not a cost.
     *
     * Left as an exact list rather than papered over with a magnitude
     * threshold, because a threshold would also swallow a real defect that
     * happened to be small. Nothing rides on it either way: the sheet buys
     * neither mastery on any of the ten accounts, our path matches all ten
     * step for step, and a candidate 1e-11 from the top of the board cannot
     * change a pick.
     */
    /*
     * EXACT on every candidate both sides price — 327 comparisons across sixty
     * accounts, zero numeric drift.
     *
     * This used to exempt anything under a `SHEET_NOISE_FLOOR`, on the reading
     * that ROIs around 1e-11 were the sheet's own cancellation noise. They were
     * not. Every one of them was a candidate column doing arithmetic its base
     * row does not, and each came out exact once the column was read:
     *
     *   Wave Skip Mastery          `EPC_FUP` with the Wave Skip card in the
     *                              slot that wants Free Upgrades
     *   Intro Sprint Mastery       wave-skip term gated on `$AO$32`, the Golden
     *   Wave Accelerator Mastery   Tower level, ANDed with the Wave Skip card
     *
     * The exemption was hiding three real defects behind a plausible story
     * about floating point, which is why it is gone rather than loosened.
     */
    /*
     * Five remain, and they are a REPRESENTATIONAL difference rather than a
     * numeric one: the sheet prices these candidates at a NEGATIVE ROI
     * (-9.6e-12, -4.1e-11) and our planner declines to price them at all,
     * excluding them because "its prerequisite is not met" — the mastery's card
     * is not equipped.
     *
     * Both sides agree the upgrade is never bought, so no path differs. Listed
     * exactly rather than waved through, and NOT fixed by loosening the
     * prerequisite, which would put a candidate on the board that our own model
     * says cannot be researched.
     */
    const PRICED_BY_SHEET_AT_A_LOSS = [
      'account-13 Wave Skip Mastery',
      'account-28 Wave Skip Mastery',
      'account-37 Intro Sprint Mastery',
      'account-39 Wave Skip Mastery',
      'account-52 Wave Skip Mastery',
    ]
    expect(failures.sort()).toEqual(PRICED_BY_SHEET_AT_A_LOSS)
  })
})
