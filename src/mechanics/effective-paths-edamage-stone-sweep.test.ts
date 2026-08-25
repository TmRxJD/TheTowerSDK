import { describe, expect, it } from 'vitest'

import {
  STONE_PLUS_STATS,
  STONE_STAT_FIELD_KEYS,
  computeEffectiveDamage,
} from './effective-paths-edamage-compute'
import { configFromSheet, levelsFromSheet } from './effective-paths-edamage-compute.test'
import type { SheetCells } from './effective-paths-edamage-compute.test'
import { parseNumberInput } from '../formatting/numbers'
import { EFFECTIVE_DAMAGE_UPGRADES, planEffectiveDamagePath } from './effective-paths-edamage-plan'
import fixture from '../../fixtures/mechanics/effective-paths-edamage-stone-sweep.fixtures.json'

/**
 * The port's STONE path against the sheet's, across randomised accounts.
 *
 * The stone band buys ultimate weapon stats rather than labs, so it exercises a
 * different candidate list, a different cost table and a different set of caps
 * from the lab-time sweep — but the same effective damage model underneath.
 * Getting one right says little about the other.
 *
 * ## Why there is no `_EPSTONE` driver tab
 *
 * `eDamage Stone` holds no inputs. It MIRRORS the planner tab —
 * `{eDamage!AT12:AY71}` for the controls and the run type, `{eDamage!BB3:BM50}`
 * for every lab level — and differs only in what a level costs. So the account
 * is written to `eDamage`, whose IDS-dependent inputs are frozen in place, and
 * the path is read here. A duplicate would have gone on reading the *original*
 * `eDamage` and driven nothing, while looking built.
 *
 * ## Same accounts as the lab-time sweep
 *
 * `account-N` here is the same player as `account-N` in
 * `effective-paths-edamage-path-sweep.test.ts`, by seed. A disagreement that
 * shows up in one variant and not the other is then a fact about the variant
 * rather than about the draw.
 */

interface Step { step: number, name: string, level: string | number | null }
interface Account { id: string, cellDiff?: Record<string, unknown>, steps: Step[] }

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
)

/**
 * The account's REAL stone levels, from the stone tab's own level row.
 *
 * `levelsFromSheet` reads the eDamage tab, which carries no ultimate weapon
 * stone levels at all, so every one of them fell back to zero and this sweep
 * compared the sheet's account against a port that believed every UW stat sat
 * at level 0.
 *
 * Zero is not a harmless default here. The sheet writes **-1** for a `+` stat
 * that is NOT OWNED, while 0 is a real owned level with a real value — so an
 * unowned Cover Fire read as owned, an unowned Charged Mines contributed 0
 * where the sheet contributes 1, and so on. That is the whole stone gap:
 * ILM off by x2, SM by x3.78, PS by x1.45.
 *
 * The name-to-key map is DERIVED from the candidate list rather than written
 * out, so it cannot drift from the band the planner actually reads.
 */
const STONE_KEY_BY_SHEET_NAME = new Map(
  EFFECTIVE_DAMAGE_UPGRADES
    .filter(upgrade => upgrade.band === 'stone')
    .map(upgrade => [upgrade.sheetName, upgrade.key] as const),
)

function levelsFor(account: Account): EffectiveDamageLevels {
  const base = levelsFromSheet(cellsFor(account))
  const satLevels = (account as unknown as { satLevels?: Record<string, unknown> }).satLevels
  if (!satLevels) return base
  const stone = { ...base.stone } as unknown as Record<string, number>
  for (const [name, value] of Object.entries(satLevels)) {
    const key = STONE_KEY_BY_SHEET_NAME.get(name)
    if (!key || typeof value !== 'number') continue
    stone[key] = value
  }
  return { ...base, stone: stone as unknown as EffectiveDamageLevels['stone'] }
}

const sheetLevel = (raw: Step['level']) => Number(String(raw ?? '').replace(/[^\d]/g, '')) || 0

/**
 * The stone candidates the DRIVER cannot offer, and why they are excluded here
 * rather than gated in the port.
 *
 * All of them hang on the IDS import — the player's own save — which a copy of
 * the workbook does not have. On this driver they are hidden for every account
 * regardless of state, so that is a property of the driver, not of the game.
 *
 *   eDamage Stone!GK2 = OR(NOT('_IDS'!$BG$2), $AX$19="Attack Disso", CM5>=99)
 *   eDamage Stone!FK2 = OR(NOT('_IDS'!$BV$2), CQ5>=69)
 *
 * and, inside each `+` stat's own shadow rather than in its row-2 flag:
 *
 *   OR(DVT_UW_STAT("Inner Land Mines", "Charged Mines", CJ5+1)="",
 *      IDS_UW_COUNT() <= 8)
 *
 * The `+` upgrades unlock only once the player owns more than eight ultimate
 * weapons, and `IDS_UW_COUNT()` reads that from the save — not from the `BH`
 * ownership flags the sweep sets, so no account can turn it on. The port has
 * only eight weapons in `DAMAGE_ULTIMATE_WEAPONS`, so it cannot derive the
 * count either; this is genuinely outside what it models.
 *
 * ## Why not gate these in the port
 *
 * It would be the wrong fix twice over: it would delete upgrades real players
 * can buy, and it would make this sweep pass by agreeing with a limitation
 * instead of with the sheet.
 *
 * A first attempt did gate them, on `plus === null` — the `BL` column reading
 * "Locked" — which fitted the observation (`ILM Damage` shown, `ILM Charged
 * Mines` blank, weapon plainly owned) and was still wrong. Reading the shadow
 * showed the real condition. Fitting a rule to a symptom produces a gate that
 * happens to agree here and misfires everywhere else.
 *
 * The `+` names come from `STONE_PLUS_STATS`, derived from the field map, so
 * this cannot drift out of step with it.
 */
const IDS_GATED_ON_THIS_DRIVER = [
  'Assist Module Bonus - Cannon',
  'Assist Module Substats - Core',
  ...STONE_PLUS_STATS,
]

const excludeIds = IDS_GATED_ON_THIS_DRIVER.map((sheetName) => {
  const upgrade = EFFECTIVE_DAMAGE_UPGRADES
    .find(u => u.band === 'stone' && u.sheetName === sheetName)
  if (!upgrade) throw new Error(`no stone candidate named ${sheetName}`)
  return upgrade.id
})

/**
 * Below this the sheet's own ROI carries no information.
 *
 * `(candidate/base - 1)` subtracts two nearly equal doubles; divided by a stone
 * cost it lands near 1e-11 for upgrades that barely move the total, and the
 * remaining digits are cancellation noise. Matched to `SHEET_NOISE_FLOOR` in
 * the eEcon sweep, which hit the same wall from the other direction.
 */
const SHEET_NOISE_FLOOR = 1e-9

describe('eDamage stone path parity across accounts', () => {
  /*
   * EVERY computation column, on EVERY account — not just the final path.
   *
   * This is the check the sweeps were missing, and its absence is why each
   * defect so far cost an afternoon. A sweep compares the PATH: forty steps in,
   * the port picks a different upgrade, and the cause could be any of 47
   * columns feeding two candidates' gains. The compute test does compare
   * columns, but against ONE account, so anything that only goes wrong for a
   * particular run type or weapon combination passed it.
   *
   * The capture could not have done this before either: it read `AI1:CX85`,
   * and the grid computes in `CY..ES` — the inputs and the answer were
   * captured, and nothing in between. `capture-satellite-sweep.mjs` now takes
   * `CY5:ES5` as well.
   *
   * A failure here names the column. That is the whole point.
   */
  /*
   * EVERY candidate's ROI at step 1, not just the step the path diverges on.
   *
   * The sheet's ROI column is `(shadow/EE5 - 1)/cost` — the value the candidate
   * would produce, over what it costs — and it is what decides each pick. Ours
   * is `(value - base)/cost`, which differs only by the constant factor `base`,
   * so the two agree exactly once each side is normalised within an account.
   *
   * This is the check that names a mispriced candidate directly. A path
   * comparison says "step 40 differs" and leaves 29 candidates and 47 columns
   * as suspects; this says "SL Angle". Every stone and coin defect this session
   * was found the first way, at roughly an afternoon each.
   *
   * Blanks are kept, not skipped: a blank ROI is the sheet declining to offer
   * the candidate, and a port that offers one the sheet hides is exactly the
   * defect that cost three Util Disso accounts on the coin path.
   */
  /*
   * FAILING, and the failures are the point — each names a candidate and the
   * exact factor it is out by. Grouped, from the first run:
   *
   *   ILM Damage / Quantity / Cooldown   x1.995  (x1.9953, x1.9940, x1.9930)
   *   SM Damage                          x0.2648
   *   PS Damage / Duration / Cooldown    x0.7184, x0.6870 (varies by account)
   *   Assist Module Substats - Cannon    x1.005 - x1.024
   *   CF Slow                            x1.047 on one account
   *
   * A constant multiplier repeated across three stats of the same weapon and
   * across accounts is a MISSING FACTOR, not a ranking subtlety. That is four
   * defects to find rather than five accounts to bisect.
   *
   * Ruled out for ILM so the next reading does not redo it: `EP_ILM_DPS` is
   * character-for-character our `innerLandMinesDps`; `STAT_UW_ILM_FINAL_QTY`
   * and `STAT_UW_ILM_FINAL_DMG` match ours exactly; our ILM responds to a
   * Damage level with the right ladder ratio (1.098 and 1.179 against the
   * sheet's 1.1 and 1.1818); and the base and shadow call
   * `EP_UW_TOTAL_DAMAGE` with identical arguments, so only the ILM term
   * differs between them.
   *
   * The thread still open: `eDamage Stone` has its OWN computation columns, and
   * they do not agree with `eDamage` — `EO5` against `EA5` is 86,244,320
   * against 528,250 for the same account, because the stone tab reads every UW
   * stat from its level row through `DVT_UW_STAT` instead of from the player's
   * configured values. The port models that as `weaponStatsFromStoneLevels`,
   * and the column sweep above verifies our columns against `eDamage` only. So
   * the stone tab's columns are the one surface still unchecked, and a factor
   * of two hiding in the stone ILM base would produce exactly this.
   *
   * Capturing `eDamage Stone`'s own CY..EE band and running the column sweep
   * against it is the next step, and it is the same mechanical move that found
   * everything else here.
   */
  it('prices every candidate the way the sheet does, at step 1', () => {
    const failures: string[] = []
    let accountsCompared = 0
    let pairsCompared = 0
    for (const account of SWEEP.states) {
      const captured = (account as unknown as { roi?: Record<string, number | null> }).roi
      if (!captured) continue
      const cells = cellsFor(account)
      const config = configFromSheet(cells)
      const levels = levelsFor(account)

      const plan = planEffectiveDamagePath({
        config, levels, variant: 'stone', steps: 1, excludeIds,
      })
      const ourRoi = new Map<string, number>()
      for (const candidate of plan.firstStepRoi ?? []) ourRoi.set(candidate.name, candidate.roi)
      if (ourRoi.size === 0) continue
      accountsCompared += 1

      /*
       * Compared through the MEDIAN ratio, not by normalising each side to its
       * own maximum.
       *
       * `sheet_roi = our_roi / base * EF3`, so theirs-over-ours is a constant
       * within an account and every candidate should show the same ratio. That
       * makes an outlier stand alone. Normalising to the max instead — which is
       * what this did first — divides everything by whichever candidate is
       * largest, so ONE mispriced candidate at the top drags every other row
       * off it. The first run reported twenty names when three were wrong, and
       * the factor of two on ILM was buried among them.
       */
      const pairs: Array<[string, number, number]> = []
      for (const [name, theirs] of Object.entries(captured)) {
        const ours = ourRoi.get(name)
        if (theirs === null) {
          if (ours !== undefined && ours > 0) {
            failures.push(`${account.id} ${name}: sheet offers nothing, port prices it`)
          }
          continue
        }
        if (ours === undefined) {
          failures.push(`${account.id} ${name}: sheet prices it, port offers nothing`)
          continue
        }
        if (ours === 0 || !Number.isFinite(ours) || !Number.isFinite(theirs)) continue
        pairs.push([name, ours, theirs])
        pairsCompared += 1
      }
      if (pairs.length === 0) continue

      const ratios = pairs.map(([, ours, theirs]) => theirs / ours).sort((a, b) => a - b)
      const median = ratios[Math.floor(ratios.length / 2)]
      for (const [name, ours, theirs] of pairs) {
        const drift = (theirs / ours) / median
        if (Math.abs(drift - 1) <= 1e-6) continue
        /*
         * Below the sheet's own resolution, exempt.
         *
         * `(EJ5/EE5 - 1)` is the difference of two nearly equal doubles, so once
         * the ratio lands around 1e-11 the digits are cancellation noise rather
         * than a measurement. At sixty accounts two `DW Cooldown` comparisons
         * drifted at exactly that magnitude while a third account with the same
         * 1e-10 ROI agreed -- which is what noise looks like, not a defect.
         *
         * Anything the sheet prices ABOVE the floor still has to match exactly,
         * and that is where every real defect this sweep found has lived.
         */
        if (Math.abs(theirs) < SHEET_NOISE_FLOOR) continue
        failures.push(
          `${account.id} ${name}: off by x${drift.toFixed(4)} `
          + `(port ${ours.toExponential(4)}, sheet ${theirs.toExponential(4)})`)
      }
    }
    // Named, never counted — the candidate IS the diagnosis.
    expect(failures).toEqual([])

    /*
     * Guards the guard.
     *
     * This loop has three `continue`s -- no captured ROI, nothing priced, a
     * non-finite pair -- and every one of them is SILENT. A change that made
     * the planner offer nothing here would empty `failures` and pass, which is
     * the same shape as the defects this whole sweep exists to catch: a check
     * that runs on nothing looks exactly like a check that found nothing.
     *
     * Measured 2026-08-20 -- all 60 accounts, 765 comparisons -- then pinned as
     * a floor rather than an equality so a fixture gaining accounts is not a
     * failure. 765 rather than 60 x 29 because most of the remaining entries
     * are `null`, the sheet declining to offer that candidate, and those are
     * checked on the branch above instead.
     */
    expect(accountsCompared, 'the ROI comparison ran on no accounts').toBeGreaterThanOrEqual(60)
    expect(pairsCompared, 'the ROI comparison made no comparisons').toBeGreaterThanOrEqual(765)
  })

  it('reproduces every computation column, on every account', () => {
    const failures: string[] = []
    for (const account of SWEEP.states) {
      const captured = (account as unknown as { columns?: Record<string, unknown> }).columns
      if (!captured) continue
      const cells = cellsFor(account)
      const ours = computeEffectiveDamage(configFromSheet(cells), levelsFor(account)).columns
      for (const [ref, expected] of Object.entries(captured)) {
        if (typeof expected !== 'number') continue
        const got = ours[ref]
        if (got === undefined) continue
        const scale = Math.max(1e-9, Math.abs(expected))
        if (Math.abs(got - expected) / scale > 1e-6) {
          failures.push(`${account.id} ${ref}: port ${got}, sheet ${expected}`)
        }
      }
    }
    // Named, never counted — the column IS the diagnosis.
    expect(failures).toEqual([])
  })

  it('excludes exactly the two candidates the driver cannot offer', () => {
    // A lookup that silently found nothing would exclude nothing and this
    // sweep would go back to failing on an upgrade the sheet never shows.
    expect(excludeIds).toHaveLength(7)
    expect(STONE_PLUS_STATS.size).toBe(5)
    for (const id of excludeIds) expect(id.startsWith('stone.')).toBe(true)
  })

  it('came from a driver that is known to move', () => {
    expect(SWEEP.tab).toBe('eDamage Stone')
    expect(SWEEP.variant).toBe('stone')
    expect(SWEEP.sheetVersion).toBe('v5.09.03.07')
    // A capture where every account plans the same path is what a BROKEN
    // driver looks like on these tabs, and three earlier ones looked exactly
    // like that. More than one distinct path is the minimum evidence that the
    // inputs reached the computation at all.
    expect(SWEEP.distinctPaths).toBeGreaterThan(1)
    expect(SWEEP.states.length).toBe(SWEEP.accounts)
    for (const account of SWEEP.states) {
      expect(account.steps.length, account.id).toBeGreaterThan(0)
    }
  })

  it('gives every account a different input block', () => {
    for (const account of SWEEP.states.slice(1)) {
      expect(Object.keys(account.cellDiff ?? {}).length, account.id).toBeGreaterThan(0)
    }
  })

  /**
   * Every stone candidate MOVES effective damage. The whole band, one by one.
   *
   * `EffectiveDamageStoneLevels` carries 24 ultimate-weapon stat keys and
   * `computeEffectiveDamage` used to read NONE of them -- it took every weapon
   * stat from `config.ultimateWeapons`, which a path cannot move. So every
   * stone candidate gained exactly zero, and `planPath`'s own comment describes
   * what follows: with no ROI to separate them the first candidate examined
   * wins every step, and the "path" is the declaration order of the candidate
   * list presented as a recommendation. That is why the port opened with
   * `DW Damage` on six of ten accounts -- it is simply first in the list.
   *
   * Supported by the model, never set by the wiring, and nothing anywhere
   * reported it: no test compared a stone path against the sheet until this
   * file, and the paths it produced were forty plausible steps long.
   *
   * ## Why the account is doctored before the check
   *
   * Two things legitimately flatten a stat to zero, and neither is the defect:
   * a weapon that is not owned contributes no damage at all, and an assist
   * module that is not equipped gives a cap of flat zero. On the raw account
   * that hides 15 of the 24 behind conditions that are working correctly, and
   * the check would read "9 wired" while proving nothing about the rest.
   *
   * So every weapon is unlocked and every assist equipped, which is the only
   * state in which all 24 are REQUIRED to move. This is the guess-effect
   * pattern: flip the input, assert the output moves, name whatever does not.
   */
  it('moves effective damage for every one of the 24 stone stats', () => {
    const account = SWEEP.states[0]
    const cells = cellsFor(account)
    const sheetConfig = configFromSheet(cells)
    const config = {
      ...sheetConfig,
      chronoFieldEnabled: true,
      hasRendArmour: true,
      modules: Object.fromEntries(Object.entries(sheetConfig.modules)
        .map(([slot, module]) => [slot, { ...module, hasAssist: true }])),
      // Coverage is `min(1, quantity * (angle + 4) / 360)`. The account owns
      // enough Spotlights to saturate it, so the angle can move all it likes
      // and the total will not — legitimate, and it hides the wiring.
      spotlightQuantity: 1,
      ultimateWeapons: Object.fromEntries(Object.entries(sheetConfig.ultimateWeapons)
        .map(([name, row]) => [name, {
          ...row,
          unlocked: true,
          // The third column is the weapon's cooldown-or-equivalent, and Chain
          // Lightning's is a PROC CHANCE. At zero its whole DPS term is zero,
          // so its quantity multiplies nothing.
          cooldown: row.cooldown > 0 ? row.cooldown : (name === 'Chain Lightning' ? 0.05 : 1),
        }])),
    } as typeof sheetConfig

    const levels = levelsFor(account)
    // The stone path resolves weapon stats from levels; without the flag the
    // model reads the observed values and no level can move anything. See
    // `EffectiveDamageShadow.weaponStatsFromStoneLevels`.
    const STONE = { weaponStatsFromStoneLevels: true }
    const before = computeEffectiveDamage(config, levels, STONE).effectiveDamage
    expect(Number.isFinite(before)).toBe(true)

    /*
     * Four levels tried, and the stat counts as wired if ANY of them moves.
     *
     * One level is not always enough, and Chain Lightning shows why:
     * `chainLightningQuantity` is `Math.floor(base + substat)`, the account
     * observes 2.093, and the chart's value at level 1 is 2 — both floor to 2,
     * so a correctly wired stat produces no change at all. Level 2 moves it
     * (ultimate weapon damage 7.90e8 -> 8.70e8).
     *
     * Requiring a single level would have reported a working stat as dead, and
     * Fixing\ that would have meant breaking the floor.
     */
    const inert: string[] = []
    for (const key of STONE_STAT_FIELD_KEYS) {
      const current = (levels.stone as Record<string, number>)[key]
      const moved = [1, 2, 3, 4].some((step) => {
        const bumped = { ...levels, stone: { ...levels.stone, [key]: current + step } }
        return computeEffectiveDamage(config, bumped, STONE).effectiveDamage !== before
      })
      if (!moved) inert.push(key)
    }

    // NAMED, not counted. A count cannot tell "one stat wired to a field
    // nothing reads" from "the band is fine", and two of the seven weapons map
    // their stats to fields a positional rule would have got wrong -- Chrono
    // Field never uses `.damage`, and Spotlight's quantity is not in the
    // weapon row at all.
    expect(inert).toEqual([])
    expect(STONE_STAT_FIELD_KEYS).toHaveLength(24)
  })

  /**
   * OPEN GAP, kept failing on purpose: the stone shadows do not agree with the
   * stone base column, and by a large factor.
   *
   * Wiring the 24 stats moved the first disagreement from step 1 to step 31+ on
   * most accounts, so the band now ranks rather than returning declaration
   * order. What remains is not a missing stat — it is that some of the sheet's
   * own stone shadow columns rebuild the bullet half differently from the base
   * they are compared against.
   *
   * `eDamage Stone!EU5`, the SL Angle shadow, ends:
   *
   *     OtherDMG, MS*BS*ASPD*RF*RDPM*Rend*ST
   *     $CU5 * ($CZ5 * OtherDMG * SL + UWDMG * $DA5) * ED5
   *
   * where the base `EE5` uses the tab's own `$DL5` in place of `OtherDMG`, and
   * takes `MS`, `BS`, `RF` and `Rend` from its own columns rather than from
   * `eDamage!$DP$5`, `$DQ$5`, `$DS$5`, `$DZ$5`. Measured on `account-9`:
   *
   *     OtherDMG          61,804,789.63
   *     DL5               36,570,747.13
   *     ratio                      1.6900
   *
   * The upgrade itself is worth `+1.45%` there — coverage goes `0.094604` to
   * `0.097382`, and `SL` goes `1.98067` to `2.00944`, which the port reproduces.
   * The sheet reports `+71.2%`, and `1.6900 x 1.0145 = 1.7148` accounts for it
   * exactly. So the ROI that column publishes is dominated by a constant offset
   * between two of its own formulas rather than by the level being priced, and
   * `SL Angle` wins step 1 on that basis.
   *
   * ## Why this is not fixed here
   *
   * Reproducing it means porting each shadow's reconstruction separately —
   * effectively a second damage model, per column, including its cross-tab
   * reads. That is real work with a real risk of fitting noise, and it should
   * be done column by column against measurements like the ones above rather
   * than in one sweep. `Spotlight Missiles` and `Assist Module Substats -
   * Cannon` were each exactly this shape and each took a separate measurement
   * to pin down.
   *
   * CF SLOW IS NOW CLOSED, and it was two faults rather than one. The base
   * column `eDamage Stone!EB5` clamps at 90%:
   *
   *     1/(1 - MIN(90%, SpeedReduction(CK5) + Substat))
   *
   * while `FF5`, the column that PRICES a level, does not:
   *
   *     CFSlow, 1/(1 - SpeedReduction(CK5+1) - Substat)
   *
   * So the sheet values a level as if the cap did not exist, and our clamped
   * gain fell to a fraction of it near the cap — the port stopped buying at 9
   * where the sheet buys 10. The sheet's own stop is a GATE, not a clamp: `FF5`
   * blanks on `EB5>=10`, which is the same 90% written as a ceiling on the
   * result, so the level that first crosses is still bought and the next is not.
   * Both halves were needed; the shadow alone made the port buy an eleventh
   * level the sheet never offers.
   *
   * That closed accounts 2, 7 and 8.
   *
   * ACCOUNTS 3 AND 6 were a DATA gap, not a model one. `uwStoneChartData` had
   * Inner Land Mines Damage stopping at level 30 where the sheet goes to 35, so
   * the planner switched stat five levels early. Four other ladders were short
   * the same way; see `ultimate-weapon-stones.ts`. The tell was the ROI TREND —
   * ILM Damage scored 6.36e9 at level 29 and 6.68e9 at level 30, rising, and
   * then the port took something at 3.5e9 instead. A candidate that is winning
   * and then vanishes is not outranked, it is unavailable.
   *
   * ## What is left
   *
   * Accounts 0/1/4/5 at step 36-38, one shape: after Chain Lightning Damage
   * maxes at 31, the sheet buys `ILM Damage@1` and the port buys `CL Chance@1`.
   * Costs are not the difference — `DVT_UW_COST` gives 5 and 8, exactly what the
   * port uses. It is the ILM gain: the port scores 8.43e10 against CL Chance's
   * 2.44e11, and for the sheet's ordering to hold ILM would need to be worth
   * about 1.8x more relative to CL than the port makes it.
   *
   * ONE UNCONFIRMED LEAD, recorded because it is specific and because it points
   * the WRONG way, which is the sort of thing that gets forgotten and re-found.
   * `EP_ILM_DPS` takes ChronoJump and ChargedMines as separate arguments and
   * multiplies them, so where the heat factor sits between them does not matter
   * algebraically. What might matter is whether it is applied TWICE: at charged
   * mines level 0 the sheet's `ILMCM` is 0.5, while `config.ultimateWeapons`
   * reports `plus: 0.528`, and 0.528/0.5 is 1.056 — which looks like a heat
   * factor already baked into the config value that the port then applies again
   * via `chronoJump`. Unverified: the probe read the CONFIG, not what
   * `weaponStatsFromStoneLevels` actually hands the DPS function, and under that
   * shadow the value may be re-read from the table unheated. If it is a real
   * double-count it makes our ILM too BIG, which is the opposite of what this
   * divergence needs — so it is a separate defect if it exists at all.
   *
   * Account 9 at step 1 remains the SL Angle shadow above.
   */
  it('plans what the sheet plans, for every account', { timeout: 120_000 }, () => {
    const failures: string[] = []
    for (const account of SWEEP.states) {
      const cells = cellsFor(account)
      const plan = planEffectiveDamagePath({
        config: configFromSheet(cells),
        levels: levelsFor(account),
        variant: 'stone',
        steps: account.steps.length,
        excludeIds,
      })
      const ours = plan.steps.map(s => `${s.name}@${s.level}`)
      const theirs = account.steps.map(s => `${s.name}@${sheetLevel(s.level)}`)
      if (ours.length !== theirs.length) {
        failures.push(`${account.id}: ${ours.length} steps vs the sheet's ${theirs.length}`)
        continue
      }
      const at = ours.findIndex((step, i) => step !== theirs[i])
      if (at >= 0) {
        failures.push(`${account.id}: step ${at + 1} — port ${ours[at]}, sheet ${theirs[at]}`)
      }
    }

    // Listed, never counted. Every defect the lab-time sweep found was named by
    // the SHAPE of its failures — which upgrade, at which step, under which run
    // type — and a count would have hidden all seven.
    expect(failures).toEqual([])
  })
})
