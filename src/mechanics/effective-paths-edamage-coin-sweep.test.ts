/**
 * The `eDamage Coins` path, planned by the port and by the sheet, per account.
 *
 * ## Why a third sweep rather than trusting the first two
 *
 * `lab-time` reaches parity on 199 accounts and `stone` does not, and the seven
 * defects that closed the lab-time gap were each found by the SHAPE of a
 * disagreement — which upgrade, at which step. A variant that has never been
 * swept has no shape, only an assumption that the same planner behaves the same
 * way when the currency changes. It does not: `stone` needed a per-candidate
 * shadow model and a cost-to-cap rule that `lab-time` never exercised.
 *
 * Coins is the cheapest remaining variant to settle because its driver is
 * already proven to move — `build-satellite-drivers.mjs` shows inputs reaching
 * it through `eDamage` and its path responding — so a disagreement here is a
 * fact about the port rather than about a dead driver.
 *
 * ## What this does NOT establish
 *
 * The sweep is 10 accounts against lab-time's 199, and only 4 distinct paths
 * among them, so it can show that a defect exists and cannot show that none
 * does. Treat green as "no disagreement found in ten draws".
 *
 * NARROWER THAN IT LOOKS ON THE ONE AXIS THIS FILE FIXED. The generator varies
 * lab levels, weapon ownership and the card and perk masters — it does NOT vary
 * workshop ENHANCEMENT levels. Every account here starts at Damage 31, Critical
 * Factor 57, Super Crit Mult 9, Rend Armor 75, Damage/Meter 41, Attack Speed 12
 * and Cash Bonus 0, identical across all ten. So the enhancement wiring these
 * accounts exercise is exercised at exactly one starting configuration, and a
 * defect that only appears at some other level — an off-by-one at 0, a cap near
 * 600 — would pass this sweep unseen.
 *
 * That also makes one shortcut safe that would otherwise be wrong: the Cash
 * Bonus level is read from `baseSatelliteCells`, which the capture records for
 * the FIRST account only. It is correct for all ten precisely because the
 * capture never moves it. If the generator is ever taught to vary enhancement
 * levels, that read becomes wrong for nine accounts and this comment is the
 * warning.
 */
import { describe, expect, it } from 'vitest'

import { computeEffectiveDamage } from './effective-paths-edamage-compute'
import { configFromSheet, levelsFromSheet } from './effective-paths-edamage-compute.test'
import { effectiveDamageCoinLevelsFromSheet } from './effective-paths-edamage-coin-levels'
import type { SheetCells } from './effective-paths-edamage-compute.test'
import { parseNumberInput } from '../formatting/numbers'
import { EFFECTIVE_DAMAGE_UPGRADES, planEffectiveDamagePath } from './effective-paths-edamage-plan'
import fixture from '../../fixtures/mechanics/effective-paths-edamage-coin-sweep.fixtures.json'

type Step = { name: string, level: string | number }
type Account = { id: string, cellDiff?: Record<string, unknown>, steps: Step[] }

const SWEEP = fixture as unknown as {
  sheetVersion: string
  tab: string
  variant: string
  accounts: number
  droppedForErrors: number
  distinctPaths: number
  baseCells: SheetCells
  states: Account[]
}

/** A live cell shows what the sheet DISPLAYS; the reader wants values. */
function normaliseCell(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const text = value.trim()
  if (text === '-' || text === '') return 0
  if (/^[+-]?\d+(\.\d+)?$/.test(text)) return Number(text)
  if (/^\d+(\.\d+)?\s*[KMBTqQsSOND]$/i.test(text)) return parseNumberInput(text.replace(/\s+/g, ''))
  return value
}

const cellsFor = (account: Account): SheetCells => Object.fromEntries(
  Object.entries({ ...SWEEP.baseCells, ...(account.cellDiff ?? {}) })
    .map(([key, value]) => [key, normaliseCell(value)]),
) as SheetCells

const sheetLevel = (raw: Step['level']) => Number(String(raw ?? '').replace(/[^\d]/g, '')) || 0

/**
 * The coins tab's own level row, keyed by the header it sits under.
 *
 * By HEADER, never by column letter. `BU5` is the Cash Bonus enhancement level
 * here and `criticalChanceMastery` on `eDamage`, and the fixture carries both —
 * so a letter alone does not identify a quantity in this file. Row 4 names each
 * column, which makes the lookup say what it means.
 */
const satelliteLevelsFor = (account: Account): Record<string, unknown> => ({
  ...(SWEEP.baseSatelliteCells ?? {}),
  ...(account.satLevels ?? {}),
} as Record<string, unknown>)

/**
 * The capture stores these keyed BY HEADER already, not as `XX4`/`XX5` pairs.
 * The first version of this walked `Object.entries` looking for a cell ref
 * matching `/^([A-Z]+)4$/`, found 0 of 27, and produced an EMPTY map -- so
 * `cashBonusEnhancementLevel` was 0 on every account of every run since it was
 * written, and nothing said so. Read the shape the capture actually writes.
 */
const satelliteLevel = (account: Account, header: string): number => {
  const raw = satelliteLevelsFor(account)[header]
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0
}

/**
 * The config, plus the one field the planner tab cannot supply.
 *
 * `configFromSheet` reads `eDamage`. The Cash Bonus enhancement level is native
 * to `eDamage Coins`, so it is passed in from the satellite capture rather than
 * read from a cell that means something else.
 */
const configForCoins = (cells: SheetCells, account: Account) => {
  const config = configFromSheet(cells)
  return {
    ...config,
    cashBonusEnhancementLevel: satelliteLevel(account, 'Cash Bonus'),
    /*
     * The Core module rarity, without which the coin tab cannot be reproduced.
     *
     * `eDamage Coins!DO5` derives both core bonuses from
     * `MODSTAT_CORE(IDS_MOD_CORE_RARITY(IDS_MOD_CORE_NAME($AX$15)), CE5)` where
     * eDamage!EN5 passes the player's FIXED `$AM$23`. `moduleBonusAtLevel`
     * implements the derivation but falls back to the fixed bonus when the
     * rarity is undefined -- so without this the port produces the eDamage
     * tab's ultimate weapons on the coin tab, a flat 1.44712x.
     *
     * Read on the live sheet 2026-08-20: `$AX$15` is "Tourney",
     * `IDS_MOD_CORE_NAME` resolves to "Any Other" and hence rarity "Common",
     * and `IDS_MOD_CORE_ASSIST_NAME` resolves to null. That degradation is a
     * property of the oracle working copy, which has no IDS import behind it --
     * the same reason `IDS_LAB_LEVEL` returns 0 for every lab here.
     *
     * A CONSTANT rather than a captured value, because `AX15` is a satellite
     * cell the generator never varies and the capture does not read it. When
     * `capture-satellite-sweep.mjs` is next extended it should record the two
     * resolved rarities and this should read them instead.
     */
    modules: {
      ...config.modules,
      core: { ...config.modules.core, primaryRarity: 'Common', assistRarity: undefined },
    },
  }
}

/**
 * The eDamage levels, plus the coin band the coin tab computes from.
 *
 * `levelsFromSheet` builds `lab`, `keys` and `stone` and stops, so `levels.coin`
 * was all-zero here -- and the coin tab derives its Core module bonuses from
 * exactly those levels where eDamage passes the player's fixed ones. Unwired,
 * the port produced the eDamage tab's ultimate weapons on the coin tab: a flat
 * 1.44714x on every account. See `effective-paths-edamage-coin-levels.ts`.
 */
const levelsForCoins = (cells: SheetCells, account: Account) => {
  const band = effectiveDamageCoinLevelsFromSheet(satelliteLevelsFor(account))
  // A capture that drifts has to fail rather than zero a field silently.
  expect(band.unknown).toEqual([])
  expect(band.missing).toEqual([])
  return { ...levelsFromSheet(cells), coin: band.absolute }
}

/**
 * `Damage +`, which THIS COPY of the sheet can never offer.
 *
 * `eDamage Coins!EZ2` — the only enhancement column with a hide flag at all —
 * is `OR(IDS_LAB_LEVEL("Workshop Enhancements") <> 1, $AW$19 = "Attack Disso")`,
 * and on the oracle working copy `IDS_LAB_LEVEL` returns 0 for EVERY lab
 * because there is no IDS import behind it. So the flag is TRUE on every
 * account in this sweep, for a reason that has nothing to do with the account,
 * and `Damage +` appears in none of the ten captured paths.
 *
 * EXCLUDED RATHER THAN REPRODUCED, and the distinction matters. The port picks
 * `Damage +` at step 40 because it is modelling a real player, for whom the lab
 * IS bought and the candidate IS available. Teaching the port to hide it would
 * bake a property of this spreadsheet copy into the model and be wrong for
 * every actual account — the fixture would go green by making the code worse.
 *
 * Same treatment, and the same reasoning, as `IDS_GATED_ON_THIS_DRIVER` in the
 * stone sweep. The capture script's own header documents this class of problem:
 * a driver that cannot offer a candidate produces a path that looks like a
 * ranking answer and is not one.
 */
const IDS_GATED_ON_THIS_COPY = ['Damage +']

const excludeIds = IDS_GATED_ON_THIS_COPY.map((sheetName) => {
  const upgrade = EFFECTIVE_DAMAGE_UPGRADES
    .find(u => u.band === 'coin' && u.sheetName === sheetName)
  if (!upgrade) throw new Error(`no coin candidate named ${sheetName}`)
  return upgrade.id
})

describe('eDamage coin path parity across accounts', () => {
  it('came from the coins driver, not a copy of another sweep', () => {
    // The satellites are near-identical mirrors of `eDamage`, so a fixture
    // captured from the wrong tab would look entirely plausible and would be
    // measuring the variant it was named after in nothing but the filename.
    expect(SWEEP.tab).toBe('eDamage Coins')
    expect(SWEEP.variant).toBe('coin')
    expect(SWEEP.states.length).toBeGreaterThan(0)
  })

  it('captured accounts that actually differ from each other', () => {
    // Ten identical draws would pass any comparison and prove nothing. The
    // capture reports how many distinct paths it saw; one would mean the
    // generator moved nothing the planner reads.
    expect(SWEEP.distinctPaths).toBeGreaterThan(1)
  })

  /*
  /*
   * PARITY, on all ten accounts and every step. Four defects, each read off the
   * sheet rather than inferred:
   *
   *  1. `computeEffectiveDamage` never read `levels.coin.enhancement*`. The
   *     planner wrote the levels it bought there and the multiplier compute used
   *     came off the sheet's `BK` column, which never moved. All seven `+`
   *     candidates were offered, priced, and worth EXACTLY ZERO after purchase —
   *     and a zero-gain candidate is never chosen and never complains.
   *  2. Their starting level was read as 0, while the owned level lives on the
   *     CONFIG (`BI`), so the planner offered level 1 of an enhancement the
   *     account already held nine levels of.
   *  3. `Cash Bonus +` had neither its route to damage nor its gate. `EJ5/CT5`
   *     re-base CASH and reach damage only through Perfect Freeze's `log10`, so
   *     it is a plain MULTIPLIER; `EJ2` then hides it on
   *     `OR(AM45+AR45=0, run="Attack Disso", run="Util Disso")`. Hidden is not
   *     worth-zero: a zero gain still scores ROI 0 and still wins a tie, and
   *     three Util Disso accounts were buying it.
   *  4. `Damage +` prices on its own ratio (`EZ5`), not on effective damage.
   *
   * ## The last one was not a port defect at all
   *
   * After those, one divergence remained: the port took `Damage +@32` where the
   * sheet took `Super Crit Mult +@32`, on all ten accounts. Everything about it
   * looked like a hairline valuation error — the costs are identical
   * (480,540,000,000, confirmed against `WSPCOST_SINGLE_ADJUSTED`) and the gains
   * differed by 0.25%.
   *
   * It was neither. `eDamage Coins!EZ44` is BLANK: the sheet is not ranking
   * `Damage +` below `Super Crit Mult +`, it is not offering it. `EZ2` hides the
   * column on `IDS_LAB_LEVEL("Workshop Enhancements") <> 1`, and on this working
   * copy `IDS_LAB_LEVEL` returns 0 for EVERY lab because nothing is imported
   * behind it. So the flag is true for reasons that have nothing to do with any
   * account, and `Damage +` appears in none of the ten paths.
   *
   * Chasing the 0.25% would have found nothing, and "fixing" it would have meant
   * nudging a constant until ten accounts agreed. The measurement that stopped
   * it was cheap: read the cell the sheet actually evaluated at that row.
   */

  /**
   * What the sheet pays for each candidate, against what we pay -- at STEP 1.
   *
   * The coin tab was the only path tab with no ROI comparison. eEcon and eHP
   * both have one, and on both it is what turned "the port picked differently
   * at step 40" into "THIS candidate is mispriced, before anything compounds".
   * Without it, three separate defects here could only ever be seen as a
   * ranking difference deep in a path, and each had to be bisected by hand.
   *
   * The two sides measure different things and have to be put on one footing:
   *
   *   sheet   `(EM5/$EC5 - 1) / WSPCOST_SINGLE_ADJUSTED(stat, level) * $EF$3`
   *           -- a RELATIVE gain over cost, scaled by `EF3` = 1e9
   *   ours    `(value - currentValue) / price` -- an ABSOLUTE gain over price
   *
   * so the sheet's relative gain is `roi * price / EF3`, and ours is
   * `gain / baseline`. Costs are NOT normalised away: they were checked against
   * `WSPCOST_SINGLE_ADJUSTED` directly and match exactly, so a cost error would
   * still show up here rather than cancelling.
   */
  it('prices every candidate the sheet prices, to within a recorded bound', { timeout: 120_000 }, () => {
    /** `eDamage Coins!$EF$3`, the scale the ROI columns divide out. */
    const EF3 = 1e9

    /*
     * Below this the sheet is comparing its own floating-point noise.
     *
     * Attack Speed Mastery prices at ~1e-23 on four accounts and NEGATIVE on
     * one of them (`account-19`, -2.88e-23). Our gain there is exactly 0, which
     * reads as a 100% error against a number that is not a gain at all. eEcon's
     * sweep carries the same caveat for the same reason.
     */
    const NOISE_FLOOR = 1e-20

    /**
     * Measured across all 33 accounts, not chosen. Eight candidates agree to
     * 0.05%; two do not, and those two are the finding rather than the
     * tolerance -- see the note below.
     */
    const BOUNDS: Record<string, [number, number]> = {
      // Exact to floating point -- an epsilon, not a tolerance.
      'Cash Bonus +': [1 - 1e-9, 1 + 1e-9],
      'Demon Mode Mastery': [1 - 1e-9, 1 + 1e-9],
      'Critical Factor +': [0.9998, 1.0003],
      'Super Crit Mult +': [0.9998, 1.0002],
      'Attack Speed +': [0.998, 1.002],
      'Damage/Meter +': [0.998, 1.002],
      'Range Mastery': [0.998, 1.002],
      'Rend Armor +': [0.998, 1.002],
      'Attack Speed Mastery': [0.998, 1.002],
      /*
       * NOT parity, and NOT unexplained. Both are hand-written candidate
       * columns that do arithmetic their base row does not, so a port that
       * recomputes the composition honestly cannot reproduce either.
       *
       * `EG5` (Critical Chance Mastery) takes three shortcuts, and they only
       * make sense together:
       *   - `CC, CW5+1%` and `SCC, CY5+1%` add a FLAT one percent instead of
       *     re-evaluating at `BR5+1`, and add it UNCONDITIONALLY where the base
       *     column gates the mastery on the card being equipped;
       *   - its `CardCCMastery` is likewise ungated;
       *   - its SCM substat is `$AM$15 + $AR$15`, and `$AR$15` is the UNIQUE
       *     assist column, not the substat one. Row 15 carries no unique, so
       *     `$AR$15` is 0 and the assist half of the substat VANISHES -- 0.3769
       *     against the base row's `$AM$15 + cap * $AO$15` = 0.3976 on the live
       *     sheet. That is the reference `candidate-vs-base-diff.mjs` flags.
       *
       * Reproducing them PIECEMEAL was tried and reverted, twice, and the
       * numbers are why:
       *
       *   nothing reproduced                    1.031x .. 1.411x
       *   + the two flat one-percents           up to 1.502x  (worse)
       *   + the dropped assist substat alone    0.509x .. 0.687x  (overshot)
       *
       * A five percent change in one term swings the ROI by fifty, because the
       * gain is a small difference of two large numbers. So this column is
       * all-or-nothing: it needs every one of the three at once, or none. Left
       * at none, because tuning toward a middle value here would be exactly the
       * "nudge a constant until the accounts agree" this repo warns about, and
       * because the candidate is never bought on any account.
       *
       * `ET5` (Assist Module Substats - Cannon) rebuilds the whole composition
       * at the bumped cap, faithfully, EXCEPT that its `Rend` takes the cap
       * from `CG5+1` -- the Assist Module SUBSTATS column -- while the base row
       * `DL5` takes it from `CJ5`, the Assist Module BONUS column. So this
       * candidate silently REPAIRS the wrong-column difference the base row
       * carries, and its gain includes that repair.
       *
       * THAT IS NOW REPRODUCED. The note here used to end "we cannot reproduce
       * a gain that comes from fixing a bug we never had", and it was right at
       * the time: the port took the substats level on BOTH sides, so it had no
       * difference to repair. With the base reading `CJ5`
       * ({@link EffectiveDamageShadow.maxRendAssistCapFromBonusLevel}) and this
       * one candidate switched back to the substats cap, the pair lines up and
       * the spread falls from 0.71..1.43 to within 0.09%.
       *
       * Both are recorded in the EP graph as
       * `candidate.eDamageCoins.criticalChanceMastery` and
       * `candidate.eDamageCoins.assistSubstatCannon`.
       *
       * Neither is ever the best candidate on any of the 33 accounts, so no
       * path divergence shows either -- exactly the kind of defect a path
       * comparison cannot see and this test can. Bounded so they cannot widen,
       * and so that reproducing either one via a shadow fails here and has to
       * be acknowledged rather than absorbed.
       */
      'Critical Chance Mastery': [1.005, 1.60],
      /*
       * WAS [0.71, 1.43]. Now within 0.09%, because the repair described above
       * became reproducible: the port's base takes `CJ5` and this candidate
       * takes `CG5+1`, exactly as the two cells do.
       */
      'Assist Module Substats - Cannon': [0.99999, 1.001],
    }

    const failures: string[] = []
    const seen = new Map<string, number>()

    for (const account of SWEEP.states) {
      const cells = cellsFor(account)
      const config = configForCoins(cells, account)
      const levels = levelsForCoins(cells, account)
      /*
       * The SAME shadow the coin planner applies, or this baseline and the
       * candidate values it divides are two different models.
       *
       * `planEffectiveDamagePath` builds the coin path shadow internally;
       * computing the baseline without it made every candidate on an account
       * read a uniform 0.9956, which looks like a pricing defect and is this
       * line disagreeing with the planner one call away.
       */
      const baseline = computeEffectiveDamage(
        config, levels, { maxRendAssistCapFromBonusLevel: true },
      ).effectiveDamage
      const priced = new Map<string, { gain: number, price: number }>()

      planEffectiveDamagePath({
        config,
        levels,
        variant: 'coin',
        excludeIds,
        steps: 1,
        onCandidateRoi: entry => {
          if (entry.step === 1) priced.set(entry.name, { gain: entry.gain, price: entry.price })
        },
      })

      for (const [name, theirs] of Object.entries(account.roi ?? {})) {
        if (typeof theirs !== 'number' || theirs === 0) continue
        if (Math.abs(theirs) < NOISE_FLOOR) continue
        const mine = priced.get(name)
        // A candidate the sheet priced and we did not offer at all is the
        // loudest possible failure and must never be silent.
        if (!mine) { failures.push(`${account.id} ${name}: the sheet prices it, we do not offer it`); continue }
        const ratio = (mine.gain / baseline) / (theirs * mine.price / EF3)
        seen.set(name, (seen.get(name) ?? 0) + 1)
        const bound = BOUNDS[name]
        if (!bound) { failures.push(`${account.id} ${name}: no recorded bound (ratio ${ratio.toFixed(5)})`); continue }
        if (ratio < bound[0] || ratio > bound[1]) {
          failures.push(`${account.id} ${name}: ${ratio.toFixed(5)} outside [${bound[0]}, ${bound[1]}]`)
        }
      }
    }

    // Named, never counted -- the candidate IS the diagnosis.
    expect(failures).toEqual([])

    /*
     * Guards the guard. Every bound above has to have been exercised, or a
     * typo'd candidate name would leave a whole column unchecked while the
     * assertion above passed on an empty comparison -- which is the shape of
     * the defect this whole file exists to catch.
     */
    for (const name of Object.keys(BOUNDS)) {
      expect(seen.get(name) ?? 0, `${name} was never compared`).toBeGreaterThan(0)
    }
    expect(seen.size).toBe(Object.keys(BOUNDS).length)
  })

  it('matches the sheet for the first twenty-two steps, on every account', { timeout: 120_000 }, () => {
    // Pins the ground that was won. The enhancement fix moved every account's
    // first divergence from step 1 to step 17 or later, and a plain `it.fails`
    // on the whole path would go green again if that regressed all the way
    // back — `fails` cannot tell "wrong at step 17" from "wrong at step 1".
    const failures: string[] = []
    for (const account of SWEEP.states) {
      const cells = cellsFor(account)
      const plan = planEffectiveDamagePath({
        config: configForCoins(cells, account),
        levels: levelsForCoins(cells, account),
        variant: 'coin',
        excludeIds,
        steps: Math.min(22, account.steps.length),
      })
      const ours = plan.steps.map(step => `${step.name}@${step.level}`)
      const theirs = account.steps.slice(0, ours.length)
        .map(step => `${step.name}@${sheetLevel(step.level)}`)
      const at = ours.findIndex((step, index) => step !== theirs[index])
      if (at >= 0) failures.push(`${account.id}: step ${at + 1} — port ${ours[at]}, sheet ${theirs[at]}`)
    }
    // Back to a ratchet at ZERO, 2026-08-20. It had been briefly weakened to
    // two while the Core module rarity was still unwired; wiring it closed both.
    expect(failures).toEqual([])
  })

  it('plans what the sheet plans, for every account', { timeout: 120_000 }, () => {
    const failures: string[] = []
    for (const account of SWEEP.states) {
      const cells = cellsFor(account)
      const plan = planEffectiveDamagePath({
        config: configForCoins(cells, account),
        levels: levelsForCoins(cells, account),
        variant: 'coin',
        excludeIds,
        steps: account.steps.length,
      })
      const ours = plan.steps.map(step => `${step.name}@${step.level}`)
      const theirs = account.steps.map(step => `${step.name}@${sheetLevel(step.level)}`)
      if (ours.length !== theirs.length) {
        failures.push(`${account.id}: ${ours.length} steps vs the sheet's ${theirs.length}`)
        continue
      }
      const at = ours.findIndex((step, index) => step !== theirs[index])
      if (at >= 0) {
        failures.push(`${account.id}: step ${at + 1} — port ${ours[at]}, sheet ${theirs[at]}`)
      }
    }

    /*
     * A RATCHET at thirty-three accounts. Ten showed none of this.
     *
     * Every one is a deep step -- 28 to 37 -- and every one is an ENHANCEMENT
     * at a high level: the port takes `Damage/Meter +` into the forties where
     * the sheet takes `Super Crit Mult +`, and on `account-24` the sheet takes
     * `Cash Bonus +` at 10 where we take `Super Crit Mult +` at 28.
     *
     * NOT the enhancement unlock gate, which is now ported
     * (`ATTACK_ENHANCEMENT_SPEND_UNLOCKS`) and changed none of these: the sheet
     * blanks a gated enhancement on zero of these accounts, so every gate is
     * already open. Nor availability, which per-step `available` also did not
     * move. Nor the prices, which match `WSPCOST_SINGLE_ADJUSTED` exactly, nor
     * the 47 eDamage columns, which match on all 33 accounts.
     *
     * The cause is in the coin tab's OWN computation band, which was never
     * captured until now — `COMPUTE_BAND` covered only the stone tab. With it
     * captured, its `UWs` column reads a constant ~1.447x against ours on all
     * 33 accounts, which is the shape of the stone tab's Super Tower
     * double-count (a flat 1.69x) rather than anything account-specific.
     *
     * Listed exactly, never counted: an eighth fails, and a fix that removes
     * one shows up rather than being absorbed.
     */
    /*
     * ZERO, on all 33 accounts, for the whole path -- 2026-08-20.
     *
     * This list has been 10, then 4, then 12, and is now empty. The last three
     * defects, in the order they had to be found:
     *
     *  1. `levels.coin` was never populated. `levelsFromSheet` builds lab/keys/
     *     stone and stops, so the coin band -- which the coin tab computes from
     *     -- was all zero.
     *  2. `withLevels` wrote `levelOf`'s COMPOSITE back into `levels.coin`, so
     *     every coin evaluation ran with each mastery's lab level counted twice.
     *     The planner's gain was 3.7x to 8.7x a plain recompute.
     *  3. `config.modules.core.primaryRarity` was still undefined HERE, in the
     *     sweep's own config, after the defect it causes had already been
     *     diagnosed and pinned in `effective-paths-edamage-coin-levels.test.ts`.
     *     `moduleBonusAtLevel` silently fell back to the fixed core bonus and
     *     the coin tab kept producing the eDamage tab's ultimate weapons.
     *
     * The third is worth naming precisely because it was found LAST: the
     * mechanism was already understood and written down, and the wiring still
     * was not there. A diagnosis is not a fix.
     *
     * Kept as an explicit empty list rather than deleted. `toEqual([])` on a
     * named constant says "this is expected to be empty" where a removed test
     * says nothing at all.
     */
    const KNOWN_DEEP_ENHANCEMENT_DIVERGENCES: string[] = []
    expect(failures.sort()).toEqual(KNOWN_DEEP_ENHANCEMENT_DIVERGENCES)
  })
})
