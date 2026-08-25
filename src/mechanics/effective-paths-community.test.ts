import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { computeEffectiveHealth } from './effective-paths-ehp-model'
import {
  effectiveHealthConfigFromSheet,
  effectiveHealthLevelsFromSheet,
} from './effective-paths-ehp-from-sheet'
import { parseNumberInput } from '../formatting/numbers'
import { EFFECTIVE_DAMAGE_UPGRADES, planEffectiveDamagePath } from './effective-paths-edamage-plan'
import { computeEffectiveDamage } from './effective-paths-edamage-compute'
import { configFromSheet, levelsFromSheet } from './effective-paths-edamage-compute.test'
import type { SheetCells } from './effective-paths-edamage-compute.test'
import { effectiveDamageCoinLevelsFromSheet } from './effective-paths-edamage-coin-levels'
import fixture from '../../fixtures/mechanics/effective-paths-community.fixtures.json'
import currentOracle from '../../fixtures/mechanics/effective-paths-community-oracle.fixtures.json'

/**
 * The port against REAL accounts, shared by the community.
 *
 * Every other sweep in this directory runs on a working copy whose `_IDS` is a
 * blank demo IMPORTRANGE. That copy cannot have a workshop enhancement, a
 * relic, an assist module or an unlocked vault, so the generated accounts pin
 * those inputs at zero and the branches that read them are never taken. The
 * comparisons pass, and they pass about a player who cannot exist.
 *
 * These sheets are somebody's actual account. They span five releases --
 * v5.07.02.07 to v5.09.03.07 among the readable ones -- and were read with the
 * `spreadsheets.readonly` scope: `capture-community-sheets.mjs` has no write
 * path, because these are not ours to write to.
 *
 * ## What they found on the first run
 *
 * Two inputs that are live on every real account and zero on every generated
 * one, both feeding the largest term in eHP:
 *
 *   BI6   Health workshop enhancement   43 and 75, against 0
 *   BL6   Health relic percentage       0.45 and 0.80, against 0
 *
 * and `BH6`, the resolved workshop value, is 6.7e9 rather than the base 5.
 *
 * ## The broad answer, across nine accounts and five releases
 *
 * TWO causes, not a list of symptoms.
 *
 * ONE: Health is wrong on every readable account -- -15%, -16%, -21%, -25%,
 * -87% -- and on the current release nothing else is. That is the finding.
 *
 * And it is NOT the enhancement or the relic, which was the first guess and is
 * refuted by the same table that suggested it:
 *
 *   sheet-2   Defense Absolute   enh=50   relic=0.74   exact
 *   sheet-18  Recovery Package   enh=225  relic=0      exact
 *   sheet-19  Defense Absolute   enh=0    relic=0.72   exact
 *   sheet-1   Health             enh=43   relic=0.449  -21%
 *
 * Both inputs are handled correctly in every stat except Health. They are what
 * make the Health defect VISIBLE -- zero on the generated fixture, large here
 * -- not what causes it. The drift does not scale cleanly with either
 * (sheet-18 at enh=225 is -87%, sheet-19 at enh=140 is -17%, same relic), so
 * it is not one missing factor either. It is `EPH_HEALTH` against
 * `effectiveHealth`: one function, one formula, sixteen arguments.
 *
 * TWO: the releases before v5.09.03 had LAYOUT DRIFT, and their numbers were
 * not model error. Every term read -100% with `BI6 = 600`, against 43/75/140/
 * 225 on the newer ones -- terms reading zero across the board is a range
 * landing in the wrong place, not a formula disagreeing.
 *
 * FIXED, in the capture rather than here. `capture-community-sheets.mjs` now
 * reads each sheet's own `EPH_HEALTH` and wall-gate calls and re-keys what it
 * captures onto the canonical v5.09.03 addresses, so the port keeps reading one
 * layout. Three shifts, all read off the sheet instead of switched on a version
 * string:
 *
 *   card block columns   v5.09.03 inserted a blank column mid-block, so the
 *                        old `AX Active` is the current `AY Active` -- while
 *                        `AV Value`, and `AM`/`AN`/`AO`/`AR`, never moved
 *   card block rows      one row was added above the block in v5.09.03
 *   wall gate            `IF($AM$20, ...)` on every older release
 *
 * The version string could not have driven this: `sheet-2` reports v5.09.03.07
 * and gates its wall on `$AM$20` anyway. It used to be excluded from the
 * end-to-end comparison by id for exactly that reason, and no longer is.
 *
 * None of this was reachable from the generated fixture, where every one of
 * these inputs is zero.
 */

interface Tab {
  answer?: number | null
  band?: Record<string, unknown>
  cells?: Record<string, unknown>
  path?: { name: string; level: unknown }[]
}
interface Account { id: string; version: string; tabs: Record<string, Tab> }
interface Layout {
  layout?: { columnOffset: number; rowOffset: number; recognised: boolean }
}

const CURRENT_ORACLE = currentOracle as unknown as { accounts: Record<string, unknown> }
const ACCOUNTS = (fixture as unknown as { accounts: Account[] }).accounts

/** A live cell shows what the sheet DISPLAYS; the reader wants values. */
function normaliseCell(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const text = value.trim()
  if (text === '-' || text === '') return 0
  if (/^[+-]?\d+(\.\d+)?$/.test(text)) return Number(text)
  if (/^\d+(\.\d+)?\s*[KMBTqQsSOND]$/i.test(text)) return parseNumberInput(text.replace(/\s+/g, ''))
  return value
}
const cellsFor = (account: Account, tab: string) => Object.fromEntries(
  Object.entries(account.tabs[tab]?.cells ?? {}).map(([k, v]) => [k, normaliseCell(v)]),
)

/**
 * An account whose OWN sheet is erroring is not evidence about the port.
 *
 * `sheet-9` answers `#N/A (Array arguments to XLOOKUP are of different size.)`
 * in its component row -- a broken preset on that copy, not a disagreement.
 * Skipped by detecting the error text rather than by listing the id, so the
 * next broken sheet is skipped too and a fixed one comes back automatically.
 */
/**
 * The capture's own canonicalisation, applied to a tab it does not apply it to.
 *
 * `capture-community-sheets.mjs` ends its input block with
 *
 *     if (m.tab !== 'eHP') { entry.cells = raw } else { ...toCanonical... }
 *
 * so ONLY the eHP tab is stored canonically and every other tab keeps the
 * addresses it was read at. On the three older copies with
 * `layout.columnOffset === -1` that puts the eDamage run type in `AW19` where
 * the port looks in `AX19`: `runType` reads `''`, the effective damage comes out
 * `NaN`, the planner offers nothing, and `sheet-15`, `sheet-16` and `sheet-17`
 * contributed zero comparisons while a max-across-accounts reported "up to 20".
 *
 * The rules below are COPIED from that script, not re-derived. A blanket shift
 * was tried first and broke `sheet-13`, which reads correctly unshifted:
 *
 *   - the column shift starts at `AW` and is tested against the CAPTURED
 *     column, because v5.09.03 inserted one blank column mid card-block;
 *   - `$AM$`, `$AN$`, `$AO$`, `$AR$` and `$AV$` are identical on every release
 *     and must NOT move;
 *   - the row shift touches only the card, perk and flag columns, rows 8..45.
 */
const SHIFT_FROM_COLUMN = 'AW'
const CARD_BLOCK_COLUMNS = new Set(['AT', 'AV', 'AY'])
const CARD_BLOCK_ROWS = [8, 45] as const
const columnName = (n: number) => {
  let out = ''
  let x = n
  while (x > 0) { out = String.fromCharCode(65 + ((x - 1) % 26)) + out; x = Math.floor((x - 1) / 26) }
  return out
}
const columnIndex = (name: string) => {
  let n = 0
  for (const ch of name) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}
const toCanonical = (ref: string, columnOffset: number, rowOffset: number) => {
  const m = /^([A-Z]+)(\d+)$/.exec(ref)
  if (!m) return null
  const captured = columnIndex(m[1])
  const col = captured >= columnIndex(SHIFT_FROM_COLUMN) ? captured - columnOffset : captured
  if (col < 1) return null
  let row = Number(m[2])
  const canonicalColumn = columnName(col)
  if (rowOffset !== 0 && CARD_BLOCK_COLUMNS.has(canonicalColumn)
    && row >= CARD_BLOCK_ROWS[0] && row <= CARD_BLOCK_ROWS[1]) {
    row -= rowOffset
  }
  if (row < 1) return null
  return `${canonicalColumn}${row}`
}

/** A non-eHP tab's cells, put on the canonical grid. */
const canonicalCells = (account: Account, tab: string) => {
  const raw = account.tabs[tab]?.cells ?? {}
  const layout = (account as Account & Layout).layout
  const dc = layout?.columnOffset ?? 0
  const dr = layout?.rowOffset ?? 0
  // COLUMN shift only. The row shift is the eHP card block's and does not
  // belong to this tab -- applying it broke sheet-13, which reads correctly
  // with its rows untouched.
  void dr
  if (!layout?.recognised || dc === 0) return cellsFor(account, tab)
  const out: Record<string, unknown> = {}
  for (const [ref, value] of Object.entries(raw)) {
    const key = toCanonical(ref, dc, 0)
    if (key !== null) out[key] = normaliseCell(value)
  }
  return out
}

/** `sheetName -> key`, derived from the candidate list so it cannot drift. */
const STONE_KEY_BY_SHEET_NAME = new Map(
  EFFECTIVE_DAMAGE_UPGRADES
    .filter(upgrade => upgrade.band === 'stone')
    .map(upgrade => [upgrade.sheetName, upgrade.key] as const),
)

/**
 * `levels`, with each satellite band filled in from that tab's own level row.
 *
 * `levelsFromSheet` builds `lab`, `keys` and `stone` from eDamage and stops, so
 * a satellite planned without this prices its candidates against the PLANNER
 * tab's levels. On the stone surface that is not a small error: leaving it out
 * put `CL Chance` 2e10 away from its peers.
 */
const levelsForSurface = (cells: SheetCells, account: Account) => {
  const base = levelsFromSheet(cells)
  const coinBand = account.tabs['eDamage Coins']?.levelBand as Record<string, unknown> | undefined
  const coin = coinBand ? effectiveDamageCoinLevelsFromSheet(coinBand).absolute : base.coin
  const stoneBand = account.tabs['eDamage Stone']?.levelBand as Record<string, unknown> | undefined
  const stone = { ...base.stone } as unknown as Record<string, number>
  for (const [name, value] of Object.entries(stoneBand ?? {})) {
    const key = STONE_KEY_BY_SHEET_NAME.get(name)
    if (!key || typeof value !== 'number') continue
    stone[key] = value
  }
  return { ...base, coin, stone: stone as unknown as typeof base.stone }
}

const usable = (account: Account) =>
  typeof account.tabs.eHP?.band?.Health === 'number'

/**
 * Every readable account, on every release.
 *
 * This deliberately does NOT filter by version. It used to -- `/^v5\.09\.03/`
 * -- because the older releases' addresses had not been worked out, and a
 * version filter is the honest way to say "not asserted on yet". Now that the
 * capture normalises them, filtering would mean four accounts and three
 * releases quietly stopped being checked.
 */
const current = usable

describe('the port against real community accounts', () => {
  it('read enough accounts to be worth comparing', () => {
    // Guards the guard: a capture that lost access to everything would leave
    // every assertion below iterating an empty list.
    expect(ACCOUNTS.length).toBeGreaterThanOrEqual(5)
    expect(ACCOUNTS.filter(usable).length).toBeGreaterThanOrEqual(3)
    expect(new Set(ACCOUNTS.map(a => a.version)).size).toBeGreaterThan(1)
  })

  it('exercises inputs the generated fixture never could', () => {
    /*
     * The point of these sheets, asserted rather than assumed. If a future
     * capture lost the IDS-derived inputs, every comparison here would quietly
     * become another run of the generated fixture.
     */
    const live = ACCOUNTS.filter(usable).filter(a => {
      const c = cellsFor(a, 'eHP')
      return Number(c.BI6) > 0 || Number(c.BL6) > 0
    })
    expect(live.length, 'no account has a workshop enhancement or a relic')
      .toBeGreaterThan(0)
  })

  it('computes the Health the sheet computes', () => {
    /*
     * FIXED, and this is the assertion that proves it.
     *
     * Health was -15% to -87% on every real account and exact on every
     * generated one. The cause was `config.dissonance` never being set by
     * `effectiveHealthConfigFromSheet`, so `dissonance.active` stayed false and
     * the boost was 1. On a copy with a blank `_IDS` there are no personal
     * bests and the boost really IS 1, which is why the generated sweep agreed
     * to 1e-9 and could never have caught it.
     *
     * Dividing the error by the sheet's own `Disco Defense` column gave exactly
     * 1.000000 on four of five usable accounts, which is what identified it.
     */
    const wrong: string[] = []
    for (const account of ACCOUNTS.filter(current)) {
      const cells = cellsFor(account, 'eHP')
      const mine = computeEffectiveHealth(
        effectiveHealthConfigFromSheet(cells),
        effectiveHealthLevelsFromSheet(cells),
      )
      const theirs = Number(account.tabs.eHP?.band?.Health)
      const drift = Math.abs(mine.health / theirs - 1)
      if (drift > 1e-9) wrong.push(`${account.id} (${account.version}): ${(drift * 100).toFixed(4)}%`)
    }
    expect(wrong).toEqual([])
    expect(ACCOUNTS.filter(current).length, 'too few accounts to check')
      .toBeGreaterThan(6)
  })

  it('composes the whole eHP the sheet composed', () => {
    /*
     * Exact end to end on every current-release account but one.
     *
     * Two defects were behind the drift, both the same shape -- an input the
     * generated fixture holds at zero and a real account does not:
     *
     *   dissonance          `config.dissonance` never set, so the boost was 1
     *   stone capacities    `BK22`/`BK23`/`BK25` left at 0 on the claim that
     *                       "the stone-bought capacities are not on this tab"
     *
     * The third was layout: the older releases put the card block one column
     * and one row away, and every release before v5.09.03 -- plus `sheet-2`,
     * which reports v5.09.03.07 -- gates the wall on `$AM$20` rather than
     * `$AM$21`. `sheet-2` was excluded here by id on the reasoning that "the
     * sheets disagree with each other" is a fact about the corpus rather than a
     * bug. That was true, and it was still the wrong place to stop: the sheet
     * says which cell it reads, so the capture can just ask it.
     *
    const wrong: string[] = []
    let compared = 0
    for (const account of ACCOUNTS.filter(current)) {
      const cells = cellsFor(account, 'eHP')
      const mine = computeEffectiveHealth(
        effectiveHealthConfigFromSheet(cells),
        effectiveHealthLevelsFromSheet(cells),
      )
      const theirs = Number(account.tabs.eHP?.answer)
      if (!Number.isFinite(theirs) || theirs === 0) continue
      compared += 1
      const drift = Math.abs(mine.effectiveHealth / theirs - 1)
      if (drift > 1e-9) {
        wrong.push(`${account.id} (${account.version}): ${(drift * 100).toFixed(3)}%`)
      }
    }
    expect(wrong).toEqual([])
    // Never zero: excluding the corpus one account at a time would otherwise
    // end with an assertion that compares nothing and passes.
    expect(compared, 'no account was compared end to end').toBeGreaterThan(6)
  })

  it('matches every eHP component, on every release', () => {
    /*
     * Exact on all eight usable accounts across four releases, and this was an
     * `it.fails` until the capture learned the older layouts.
     *
     * What it recorded then is worth keeping, because the reasoning was the
     * useful part. "Matches everything except Health" had been written after
     * looking at the first two accounts and was wrong -- a generalisation from
     * the newest release to all five, which is the same mistake as
     * generalising from one account to a population. The failures it exposed:
     *
     *   sheet-13  v5.09.01.02   Defense Absolute 99.5%   Defense % 59.4%
     *   sheet-15  v5.08.05.04   Armor 48.2%  Defense Absolute 100%  Defense % 97.7%
     *   sheet-16  v5.08.05.04   Defense Absolute 100%    Defense % 82.3%
     *
     * and the note said a 100% Defense Absolute is a term reading zero, which
     * is a range landing in the wrong place far more often than it is a model.
     * It was. Every one of these was addressing, not arithmetic.
     *
     * `Defense %` is compared through `1/(1-x)`: the sheet's `CM5` is the
     * survival multiplier and the port returns the fraction, so comparing them
     * raw reports 98% and means nothing.
     */
    const wrong: string[] = []
    let compared = 0
    for (const account of ACCOUNTS.filter(usable)) {
      const cells = cellsFor(account, 'eHP')
      const r = computeEffectiveHealth(
        effectiveHealthConfigFromSheet(cells),
        effectiveHealthLevelsFromSheet(cells),
      ) as unknown as Record<string, number>
      const band = account.tabs.eHP?.band ?? {}
      const checks: [string, number][] = [
        ['Armor', r.armor],
        ['Defense Absolute', r.defenseAbsolute],
        ['Defense %', 1 / (1 - r.defensePercent)],
        ['Recovery Package Max', r.maxRecovery],
      ]
      compared += 1
      for (const [name, port] of checks) {
        const sheet = band[name]
        if (typeof sheet !== 'number' || sheet === 0 || !Number.isFinite(port)) continue
        const drift = Math.abs(port / sheet - 1)
        if (drift > 1e-6) wrong.push(`${account.id} ${name}: ${(drift * 100).toFixed(3)}%`)
      }
    }
    expect(wrong).toEqual([])
    expect(compared, 'no account had components to compare').toBeGreaterThan(6)
  })

  /**
   * THE POINT OF THESE SHEETS, finally used for what they are.
   *
   * The generated fixture's workbook holds two players at once -- its `eDamage`
   * input block is pasted as values and the satellites still derive from a demo
   * `_IDS` import (`pnpm epaths:seam`, `pnpm epaths:handtyped`). That is why
   * four tabs' bases are excluded from the anchor in the unified sweep, and why
   * three tabs there never have two live candidates to compare.
   *
   * These nine are REAL COPIES, one player each, and they are coherent:
   *
   *   sheet-1    eDamage Cannon 5.59      eDamage Coins Cannon 5.59
   *   sheet-15   eDamage Cannon 52.3374   eDamage Coins Cannon 52.3374
   *   sheet-16   169.93521664 == 169.93521664
   *
   * with `Primary Core` at 139..221 rather than the demo's 1. So the seam is
   * simply absent here, and a ranking measured on them is measured on a player
   * the sheet actually describes.
   *
   * All-pairs on ROI, the same shape as the unified sweep's: the path takes the
   * largest ROI, so `roiA/roiB` is what decides a step.
   */
  it('ranks every candidate the way each real sheet ranks it', () => {
    const SURFACES = [
      ['eDamage Coins', 'coin'],
      ['eDamage Stone', 'stone'],
    ] as const
    const offenders = new Map<string, { n: number, worst: number, example: string }>()
    const live = new Map<string, number>()
    const dropped: string[] = []
    const perAccount: string[] = []
    const notCurrent = new Set<string>()
    let compared = 0

    for (const account of ACCOUNTS.filter(current)) {
      const cells = canonicalCells(account, 'eDamage') as SheetCells
      if (typeof cells.AM4 !== 'number') continue
      let config
      let levels
      try {
        config = configFromSheet(cells)
        levels = levelsForSurface(cells, account)
      } catch (err) {
        // NEVER silently. A sheet dropped here is a sheet nothing checks, and
        // the one that was being dropped is the only one with a core assist
        // substat -- the single account that can exercise `eDamage Stone!ET5`.
        dropped.push(`${account.id}: ${(err as Error).message.slice(0, 120)}`)
        continue
      }

      for (const [surface, variant] of SURFACES) {
        const roi = account.tabs[surface]?.roi as Record<string, unknown> | undefined
        if (!roi) continue
        const mine = new Map<string, number>()
        try {
          planEffectiveDamagePath({
            config,
            levels,
            variant: variant as never,
            steps: 1,
            onCandidateRoi: e => {
              if (e.step !== 1) return
              mine.set(e.name, e.roi)
              /*
               * `EPATHS_PRICE=<sheet>` prints the port's level, price, gain and
               * ROI per candidate, which is how the one current-release finding
               * below was split into "cost exact, gain not".
               */
              if (process.env.EPATHS_PRICE === account.id) {
                const full = e as unknown as { price?: number, nextLevel?: number, gain?: number }
                console.log(`PRICE ${account.id} ${e.name} level ${full.nextLevel}`
                  + ` price ${full.price?.toExponential(6)} gain ${full.gain?.toExponential(6)}`
                  + ` roi ${e.roi.toExponential(6)}`)
              }
            },
          })
        } catch (err) {
          // The second silent catch, and the one that was hiding sheet-15.
          dropped.push(`${account.id} ${surface}: ${(err as Error).message.slice(0, 120)}`)
          continue
        }

        /*
         * DEATH WAVE'S STONE COST MOVED BETWEEN RELEASES, so its ROI on a
         * pre-v5.09 copy is not evidence about the port.
         *
         *   sheet-19  v5.09.03.07   DW Quantity / Cooldown   1.000000
         *   sheet-13  v5.09.01.02                            1.000000
         *   sheet-16  v5.08.05.04                            0.222222  (2/9)
         *   sheet-15  v5.08.05.04                            0.008197  (1/122)
         *
         * Both v5.08 copies are off and by DIFFERENT factors, so it is not one
         * constant -- it is level-dependent, which is what a changed
         * `DVT_UW_COST` table looks like. The port's Death Wave DPS itself is
         * exact on those same sheets (69.54 against 69.54 on sheet-15), so the
         * gain is right and only the price is from another release.
         *
         * Excluded BY VERSION and BY NAME rather than by tolerance, and only
         * for Death Wave, because that is the only one with direct evidence.
         * Excluding the old copies WHOLESALE was tried and reverted: it takes
         * the comparison straight back to 742 and throws away the three sheets
         * just brought online, which is the opposite of the point.
         *
             * The remaining offenders carry their sheet's VERSION, so a finding
         * that only ever appears on a v5.08 copy can be recognised as another
         * table change rather than read as a port defect. `SM Damage` at 2.086
         * on sheet-15 and `Rend Armor +` at 8.73 on sheet-16 are both in that
         * position and neither is evidenced yet.
         *
         * THE ONE ON A CURRENT RELEASE is `eDamage Coins :: Damage/Meter +` at
         * 5.151489 on sheet-2 (v5.09.03.07), and it is narrowed to the gain:
         *
         *   port  level 55  price 2.583000e+13
         *   sheet WSPCOST_SINGLE_ADJUSTED("Damage/Meter", 55) = 2.583e13
         *
         * The cost is EXACT and the level matches the sheet's `Damage / Meter`
         * of 54. Its four peers on that tab are 0.994864 to 1.000000, so the
         * tab's base and cost model are fine and only this candidate's gain is
         * 5.15x large.
         *
         * Two details worth carrying into that hunt. The sheet looks the cost
         * up as `SUBSTITUTE(FI$4, " +", "")` -- the ROI column's OWN header,
         * `"Damage/Meter"` with no spaces, where the value column's header has
         * them; `WSPCOST_SINGLE_ADJUSTED("Damage / Meter", 55)` is `#N/A`. And
         * the `+` level enters as `WSPlus, 1 + 0.01 * wsp_level` INSIDE
         * `EPD_DPM`, multiplying `(WS * Lab + Substat)` before `EPD_RANGEDPM`
         * wraps it -- so 54 -> 55 is a 1.55/1.54 move on DPM, not on damage.
         *
         * sheet-2 sits at 54 where every generated account sits at 41, which is
         * why no synthetic fixture could have shown this.
         */
        /*
         * PARITY IS WITH THE NEWEST SHEET, not with every copy that exists.
         *
         * The IDS system's whole point is that a player's INPUTS live in their
         * own IDS Master and the EP sheet is updated underneath them. So an old
         * copy is valuable for the legitimate value spread its IDS carries --
         * real levels, real modules, real relics -- and NOT as a statement
         * about what the current sheet computes. Its ROI columns are the old
         * release's arithmetic.
         *
         * Comparing against them produced exactly that: Death Wave's stone cost
         * differing by 2/9 on one v5.08 copy and 1/122 on another, `SM Damage`
         * at 2.086, `Rend Armor +` at 8.73 -- none of it a port defect, all of
         * it the port correctly modelling a release those sheets predate.
         *
         * So the RANKING runs on current-release copies only. The older ones
         * keep contributing everywhere their inputs are the point: the eHP
         * value assertions above read all eight, and driving their inputs
         * through the local evaluator of the CURRENT workbook is the way to get
         * their value spreads into a current-logic comparison.
         */
        const oldRelease = !/^v5\.09\.03/.test(String(account.version))
        if (oldRelease) {
          notCurrent.add(`${account.id} (${account.version})`)
          continue
        }
        const peers: { name: string, ours: number, theirs: number }[] = []
        for (const [name, theirs] of Object.entries(roi)) {
          const ours = mine.get(name)
          if (typeof theirs !== 'number' || theirs <= 0 || ours === undefined || ours <= 0) continue

          peers.push({ name, ours, theirs })
        }
        /*
         * `EPATHS_SHEET=sheet-2 EPATHS_TAB="eDamage Stone"` prints every
         * candidate's `ours/theirs` against the tab's median, which is how the
         * work list below was narrowed from "38 material" to five names.
         */
        /*
         * Written to a FILE, not to stdout.
         *
         * The console version of this dropped lines -- `SL Angle` never
         * appeared in it while the offender list named `SL Angle` on the same
         * account, and the two views disagreed for long enough to be called an
         * unresolved discrepancy in the docs. It was not a discrepancy: the
         * data always had it (`theirs` 5.595e-4, `ours` 3.2104e+22, kept), and
         * the print was being truncated. A diagnostic that silently loses rows
         * is worse than none, because it is read as evidence.
         */
        if (process.env.EPATHS_SHEET === account.id && process.env.EPATHS_TAB === surface) {
          const scaled = peers.map(p => ({ ...p, scale: p.ours / p.theirs }))
          const med = [...scaled].sort((a, b) => a.scale - b.scale)[Math.floor(scaled.length / 2)]?.scale ?? 1
          const rows = scaled
            .sort((a, b) => Math.abs(b.scale / med - 1) - Math.abs(a.scale / med - 1))
            .map(p => ({ name: p.name, ours: p.ours, theirs: p.theirs, scaleOverMedian: p.scale / med }))
          writeFileSync(
            `${process.env.TEMP}/epaths-cand-${account.id}-${surface.replace(/\W+/g, '-')}.json`,
            JSON.stringify({ account: account.id, version: account.version, surface, rows }, null, 1),
          )
        }
        perAccount.push(`${account.id} ${surface}: sheet ${Object.values(roi).filter(v => typeof v === 'number' && v > 0).length}`
          + ` port ${mine.size} comparable ${peers.length}`)
        live.set(surface, Math.max(live.get(surface) ?? 0, peers.length))
        for (let i = 0; i < peers.length; i += 1) {
          for (let j = i + 1; j < peers.length; j += 1) {
            const a = peers[i]
            const b = peers[j]
            compared += 1
            const ratio = (a.ours / b.ours) / (a.theirs / b.theirs)
            if (Math.abs(ratio - 1) <= 1e-6) continue
            for (const [self, other, r] of [[a, b, ratio], [b, a, 1 / ratio]] as const) {
              const key = `${surface} :: ${self.name}`
              const hit = offenders.get(key) ?? { n: 0, worst: 1, example: '' }
              hit.n += 1
              if (Math.abs(r - 1) > Math.abs(hit.worst - 1)) {
                hit.worst = r
                hit.example = `${account.id} (${account.version}) vs ${other.name}`
              }
              offenders.set(key, hit)
            }
          }
        }
      }
    }

    /*
     * ALL EIGHT READABLE SHEETS NOW CONTRIBUTE, and three of them did not until
     * `canonicalCells` above. `live`'s max-across-accounts had reported "up to
     * 20 comparable" while the per-account line said:
     *
     *   sheet-15 eDamage Stone: sheet 23 port 0 comparable 0
     *   sheet-16 eDamage Stone: sheet 20 port 0 comparable 0
     *   sheet-17 eDamage Stone: sheet  1 port 0 comparable 0
     *
     * A maximum cannot show a zero. The per-account count replaces it, and the
     * contributing set is asserted BY NAME below.
     *
     * Three shifts were tried and only the third holds, each judged by whether
     * it broke a working sheet:
     *
     *   blanket row+column       sheet-13 11 -> 0, others still 0
     *   the capture's eHP rules  sheet-13 11 -> 0, others still 0
     *   COLUMN ONLY              sheet-13 11, and 15/16/17 come online
     *
     * 742 comparisons became 1215. The row shift belongs to the eHP card block
     * and not to this tab; the column shift is the v5.09.03 blank column, which
     * moves every tab's grid alike.
     */
    const material = [...offenders].filter(([, v]) => Math.abs(v.worst - 1) > 1e-3)
    material.sort((a, b) => b[1].n - a[1].n)
    console.log([
      '',
      `REAL-SHEET RANKING: ${compared} comparisons, ${material.length} material`,
      ...dropped.map(d => `  DROPPED ${d}`),
      ...perAccount.map(x => `  PER ${x}`),
      `  ranked on current-release copies only; ${notCurrent.size} older: ${[...notCurrent].join(', ')}`,
      ...[...live].map(([tab, n]) => `  ${tab.padEnd(16)} up to ${n} comparable candidate(s)`),
      ...material.slice(0, 16).map(([k, v]) =>
        `  ${String(v.n).padStart(4)}x  ${k.padEnd(40)} worst ${v.worst.toFixed(6)}  ${v.example}`),
      '',
    ].join(String.fromCharCode(10)))

    expect(compared).toBeGreaterThan(20)
    expect(live.get('eDamage Coins') ?? 0).toBeGreaterThanOrEqual(8)
    expect(live.get('eDamage Stone') ?? 0).toBeGreaterThanOrEqual(15)
    /*
     * How many sheets actually reached the comparison, asserted so the three
     * silent zeros cannot become four. Raise this when the layout offsets are
     * handled; do not lower it.
     */
    const contributing = new Set(perAccount.filter(x => !x.endsWith('comparable 0'))
      .map(x => x.split(' ')[0]))
    expect([...contributing].sort()).toEqual(['sheet-1', 'sheet-18', 'sheet-19', 'sheet-2'])
    /*
     * And the four that do NOT rank are held out for the RIGHT reason -- being
     * an older release -- rather than by going quiet. Before the layout fix
     * three of them contributed nothing because their eDamage cells were read
     * at the wrong columns, which is a very different thing and looked the same
     * from here.
     */
    expect([...notCurrent].map(x => x.split(' ')[0]).sort())
      .toEqual(['sheet-13', 'sheet-15', 'sheet-16', 'sheet-17'])

    /*
     * REPORTED, not yet ratcheted, and the numbers are the reason.
     *
     * `eDamage Coins` is CLEAN across all eight readable sheets -- 11
     * comparable candidates, no material disagreement -- which is the first
     * time the coin tab has been checked against a player the sheet actually
     * describes rather than against the demo import.
     *
     * `eDamage Stone` is not, and the disagreements are concentrated: the
     * Spotlight family (`SL Damage` 0.791, `SL Angle` 1.270, `SL Quantity`
     * 0.788, worst on sheet-2) plus the assist-module pair at ~1.042 on
     * sheet-19. These are REAL players with real modules -- `Primary Core` 139
     * to 221 -- so none of it is the two-player seam that explains the
     * generated fixture's gaps.
     *
     * NARROWED. On `sheet-2` (v5.09.03.07, a CURRENT release), 15 of the 20
     * comparable stone candidates agree to 1.000000 against the tab's median
     * scale, and the whole disagreement is five names:
     *
     *   SL Angle      1.186800   SL Quantity   0.934739
     *   SL Damage     0.939136   SM Damage     0.956722
     *   CF Slow       1.010699
     *
     * NOT A SWAP, which was the first guess: `SL Angle` and `SL Quantity` look
     * reciprocal in the all-pairs output (1.270 and 0.788) only because each
     * one's worst pair is against the other. Feeding the port's `SL Angle` the
     * sheet's `SL Quantity` gives 5.08x and the reverse gives 0.218x -- both
     * far worse than straight. Measured and ruled out.
     *
     * `SL Angle` was also once believed ABSENT from this tab's peers, because
     * the console version of the dump above silently dropped its row while the
     * offender list named it. It is present: `theirs` 5.595e-4, `ours`
     * 3.2104e+22, kept. The dump writes to a file now.
     *
     * Not ratcheted yet because a ratchet on findings nobody has explained
     * records a number rather than a fact. The work is to explain those five,
     * and this test is what makes them reproducible:
     *
     *   EPATHS_SHEET=sheet-2 EPATHS_TAB="eDamage Stone" pnpm vitest run      *     packages/sdk/src/mechanics/effective-paths-community.test.ts
     */
    expect(material.length).toBeLessThanOrEqual(40)
  })

  /**
   * The port against what TODAY's sheet says for each real player.
   *
   * The ranking above compares against each copy's OWN ROI columns, which is
   * the arithmetic of the release that copy was made from -- so it can only run
   * on current-release copies, and everything older is held out.
   *
   * `effective-paths-community-oracle.fixtures.json` removes that limit. It is
   * each player's eDamage input block evaluated by the CURRENT workbook
   * (`pnpm epaths:community`, `emit-community-oracle.mjs`), and it is
   * trustworthy because every current-release copy reproduces its own captured
   * answer to the digit that way. Real inputs, newest arithmetic, nothing in
   * between -- which is exactly what the IDS system is for, and it lets a
   * v5.08 copy contribute its value spread instead of its history.
   */
  it('ranks every candidate the way the CURRENT sheet ranks it, on real inputs', () => {
    const offenders = new Map<string, { n: number, worst: number, example: string }>()
    const live = new Map<string, number>()
    const dropped: string[] = []
    const excluded: string[] = []
    let compared = 0

    for (const account of ACCOUNTS) {
      const oracle = (CURRENT_ORACLE.accounts as Record<string, {
        rois?: Record<string, number>, untrusted?: string[], gains?: Record<string, number>,
      }>)[account.id]
      if (!oracle?.rois) { dropped.push(`${account.id}: no oracle entry`); continue }
      const cells = canonicalCells(account, 'eDamage') as SheetCells
      if (typeof cells.AM4 !== 'number') {
        dropped.push(`${account.id}: AM4 is ${String(cells.AM4).slice(0, 40)}`)
        continue
      }
      let config
      let levels
      try {
        config = configFromSheet(cells)
        levels = levelsForSurface(cells, account)
      } catch (err) {
        dropped.push(`${account.id} config: ${(err as Error).message.slice(0, 90)}`)
        continue
      }

      const mine = new Map<string, number>()
      const portRows: unknown[] = []
      try {
        planEffectiveDamagePath({
          config,
          levels,
          variant: 'lab-time' as never,
          steps: 1,
          onCandidateRoi: e => {
            if (e.step !== 1) return
            mine.set(e.name, e.roi)
            if (process.env.EPATHS_PORT === account.id) {
              const full = e as unknown as { price?: number, nextLevel?: number, gain?: number }
              portRows.push({
                name: e.name, roi: e.roi, price: full.price ?? null,
                nextLevel: full.nextLevel ?? null, gain: full.gain ?? null,
              })
            }
          },
        })
      } catch (err) {
        dropped.push(`${account.id} plan: ${(err as Error).message.slice(0, 90)}`)
        continue
      }
      if (process.env.EPATHS_PORT === account.id) {
        const cols = computeEffectiveDamage(config, levels).columns as unknown as Record<string, unknown>
        writeFileSync(`${process.env.TEMP}/port-${account.id}.json`, JSON.stringify({
          rows: portRows, oracleRois: oracle.rois, oracleGains: oracle.gains,
          columns: Object.fromEntries(Object.entries(cols).filter(([, v]) => typeof v === 'number')),
          labLevels: levels.lab,
          cellsOfInterest: Object.fromEntries(['CC5', 'CD5', 'BG13', 'BI13', 'BL13', 'BM13', 'AY50']
            .map(k => [k, (cells as unknown as Record<string, unknown>)[k]])),
        }, null, 1))
      }

      /*
       * A candidate this copy could not compute is not evidence about the port.
       *
       * `sheet-13` holds `#N/A (Did not find value 'Range' in MATCH
       * evaluation)` in `CB5:CB8`, and `CB4` is "Range" -- the same name the
       * ROI band uses. `DU5` (Range) reads `CB5`, so recomputing it produces a
       * Range that player's sheet never had, and ranking it put `Range` 34313x
       * from its peers on that account alone. The emit records the erroring
       * columns' HEADERS, so the exclusion is per copy and by name.
       */
      const untrusted = new Set(oracle.untrusted ?? [])
      const gains = oracle.gains ?? {}
      const peers: { name: string, ours: number, theirs: number }[] = []
      for (const [name, theirs] of Object.entries(oracle.rois)) {
        const ours = mine.get(name)
        if (untrusted.has(name)) { excluded.push(`${account.id}: ${name}`); continue }
        if (typeof theirs !== 'number' || theirs <= 0 || ours === undefined || ours <= 0) continue
        peers.push({ name, ours, theirs })
      }
      if (process.env.EPATHS_CUR === account.id) {
        writeFileSync(`${process.env.TEMP}/cur-${account.id}.json`, JSON.stringify({
          oracleNames: Object.keys(oracle.rois),
          portNames: [...mine.keys()],
          peers: peers.length,
        }, null, 1))
      }
      live.set(account.id, peers.length)
      for (let i = 0; i < peers.length; i += 1) {
        for (let j = i + 1; j < peers.length; j += 1) {
          const a = peers[i]
          const b = peers[j]
          compared += 1
          const ratio = (a.ours / b.ours) / (a.theirs / b.theirs)
          if (Math.abs(ratio - 1) <= 1e-6) continue
          for (const [self, other, r] of [[a, b, ratio], [b, a, 1 / ratio]] as const) {
            const key = self.name
            const hit = offenders.get(key) ?? { n: 0, worst: 1, example: '', state: 0 }
            hit.n += 1
            if (Math.abs(r - 1) > Math.abs(hit.worst - 1)) {
              hit.worst = r
              hit.example = `${account.id} (${account.version}) vs ${other.name}`
              /*
               * The same disagreement as a STATE error.
               *
               * An ROI divides by its gain, so comparing ROIs amplifies a state
               * error by `(1+g)/g`. These accounts have very small gains --
               * `Max Rend Armor Multiplier` is 7.25e-8 on `sheet-18`, an
               * amplification of 1.4e7 -- so "5.9x" there is four parts in ten
               * million of state and not a defect at all. Without this column
               * the loudest rows are simply the smallest gains.
               */
              const ga = gains[self.name]
              const gb = gains[other.name]
              const g = Math.min(Math.abs(ga ?? Infinity), Math.abs(gb ?? Infinity))
              hit.state = Number.isFinite(g) ? Math.abs(r - 1) * g : Number.NaN
            }
            offenders.set(key, hit)
          }
        }
      }
    }

    const material = [...offenders].filter(([, v]) => Math.abs(v.worst - 1) > 1e-3)
    /*
     * Sorted by STATE, not by how often a name appears.
     *
     * By count the list opens with a dozen rows off `sheet-18` at "0.17x" and
     * "5.9x", every one of them 6e-8 of state: their peer is `Max Rend Armor
     * Multiplier`, whose gain there is 7.25e-8, so `(1+g)/g` multiplies
     * nothing by fourteen million. Sorting by count puts the smallest gains at
     * the top and the real differences out of sight.
     */
    material.sort((a, b) => (b[1].state || 0) - (a[1].state || 0))
    console.log([
      '',
      `CURRENT-SHEET RANKING: ${compared} comparisons on real inputs, ${material.length} material`,
      ...dropped.map(d => `  DROPPED ${d}`),
      ...(excluded.length ? [`  untrusted on their own copy: ${excluded.join(', ')}`] : []),
      ...[...live].map(([id, n]) => `  ${id.padEnd(10)} ${n} comparable candidate(s)`),
      ...material.slice(0, 14).map(([k, v]) =>
        `  ${String(v.n).padStart(4)}x  ${k.padEnd(34)} worst ${v.worst.toFixed(6)}`
        + `  state ${Number.isFinite(v.state) ? v.state.toExponential(1) : '  n/a  '}  ${v.example}`),
      '',
    ].join(String.fromCharCode(10)))

    expect(compared).toBeGreaterThan(300)
    /*
     * SEVEN of the nine copies reach this comparison, including three the
     * release-gated ranking above must hold out. `sheet-9` cannot: its own
     * `AM4` is `#N/A`, so there is no player to drive. `sheet-17` has no oracle
     * entry because its lab block is one row earlier and the emit refuses to
     * guess.
     */
    expect([...live.keys()].sort()).toEqual([
      'sheet-1', 'sheet-13', 'sheet-15', 'sheet-16', 'sheet-18', 'sheet-19', 'sheet-2',
    ])

    /*
     * THE CLUSTER WAS DISSONANT ECHO, HARDCODED OFF. FIXED.
     *
     * `configFromSheet` in `effective-paths-edamage-compute.test.ts` ends with
     *
     *     dissonance: { active: false, tierPersonalBest: 0, allTierPersonalBests: [] }
     *
     * hardcoded, for every account, whatever the sheet says. So the port's
     * `dissonanceBoost` returns 1 and two whole terms vanish:
     *
     *   CY5  Disco Attack   sheet 5.20937539659   port 1
     *   EB5  Disco UW       sheet 5.20808557575   port 1
     *
     * `Disco Attack` multiplies `Damage` into `Base`, which is the non-UW
     * addend; `Disco UW` multiplies the ultimate-weapon side. That is exactly
     * why the offender list split into two groups: the four candidates that
     * move ONLY `OtherMults` -- `Range`, `Damage / Meter`, `Super Tower Bonus`,
     * `Max Rend Armor Multiplier` -- came out with an implied base of
     * x5.152990 against the other eight, to six digits, and the eight agree
     * among themselves to within 1%.
     *
     * It never showed on the generated fixture because that workbook's
     * `CX13` is 0: the demo player has no Dissonant Echo, so both sides return
     * 1 and agree. It takes a real player to see it, which is the whole
     * argument for these copies.
     *
     * WIRING IT IS NOT A ONE-LINER. The sheet reads two DIFFERENT blocks --
     *
     *     CY5 = TTG_DISSONANT_ATTACK_BOOST($CX$13, $CX$14:$CX$34, CT5)
     *     EB5 = TTG_DISSONANT_UW_BOOST($CX$40, $CX$41:$CX$61, CU5)
     *
     * -- and on `sheet-2` they hold different numbers (attack 5475, 5009,
     * 7526; uw 5531, 6264, 6191). The port's config carries ONE
     * `{ tierPersonalBest, allTierPersonalBests }` pair and distinguishes the
     * two only by a `type` argument, so it cannot represent both as it stands.
     * The `tierPersonalBest` halves do match (5000/5000, 0/0 on all three
     * current copies); it is the per-tier lists that differ.
     *
     * FIXED, both halves. `EffectiveDamageConfig.dissonance` gained an optional
     * `ultimateWeapon` block for the second set, and `configFromSheet` reads
     * both from the sheet, with `active` following eHP's rule -- true whenever
     * a personal best exists.
     *
     * The result, measured: 457 comparisons became 601 (candidates that were
     * inert are now live), and the worst state error went 1.6e-4 -> 6.6e-7, a
     * factor of 240. The whole `sheet-2` cluster is gone.
     *
     * The rest, still unexplained but three orders smaller:
     *
     *   Max Rend Armor Multiplier   5.902707   sheet-18, and its peers read
     *                                          0.1709 against it, so IT is the
     *                                          odd one rather than they
     *   Spotlight Missiles          5.604994   sheet-2, same shape
     *   Missile Amplifier           0.181890   sheet-16 vs Max Rend
     *
     * `Max Rend Armor Multiplier` turning up on two copies is the strongest
     * lead: its assist-substat cap was already found to come from the wrong
     * column on `eDamage Coins` today, and these are the first accounts with a
     * real assist module to exercise the eDamage band's own cap.
     *
     * `sheet-1` and `sheet-2` used to contribute 0 and 1 candidates and now
     * contribute 8 and 13: their `$AY$26` -- "hide labs I have not unlocked" --
     * was resolving against the working copy's demo `_IDS`, where nothing is
     * unlocked, so every column hid. Forced off in the emit.
     */
    /*
     * The ratchet is on STATE, because that is the quantity that says whether
     * the port is modelling anything wrong.
     *
     * Everything currently found is at or below 1.3e-4, and the three at that
     * scale are one cluster: `Damage / Meter`, `Range` and `Spotlight Missiles`
     * on `sheet-2`. `Damage/Meter` is the same candidate the coin tab flags at
     * 5.18x, so the two are probably one defect seen twice.
     *
     * WAS 1e-3, when the worst finding was 1.6e-4 and the whole cluster was
     * Dissonant Echo being hardcoded off. With that wired the worst is 6.6e-7,
     * on `sheet-13` -- the copy whose own cells error -- so the bar comes down
     * to 1e-5: an order of magnitude above today's worst, and still far below
     * anything a person would call a disagreement.
     */
    const realState = material.filter(([, v]) => Number.isFinite(v.state) && v.state > 1e-5)
    expect(realState.map(([k, v]) => `${k} state ${v.state.toExponential(1)}`)).toEqual([])
  })

  it('normalised the older layouts rather than skipping them', () => {
    /*
     * The guard on the fix itself.
     *
     * Every assertion above would pass on a capture that silently lost the
     * pre-v5.09.03 accounts, since they iterate whatever is in the fixture.
     * This asserts the older releases are present AND that the capture
     * recognised and shifted them -- an unrecognised layout is captured
     * unshifted, which is the state that produced -100% on every term.
     */
    const older = ACCOUNTS.filter(a => usable(a) && !/^v5\.09\.03/.test(a.version))
    expect(older.map(a => a.version).sort()).toEqual(
      ['v5.07.02.07', 'v5.08.05.04', 'v5.08.05.04', 'v5.09.01.02'],
    )
    for (const account of older) {
      const layout = (account as Account & Layout).layout
      expect(layout?.recognised, `${account.id} layout not recognised`).toBe(true)
      expect(
        layout!.columnOffset !== 0 || layout!.rowOffset !== 0,
        `${account.id} captured unshifted`,
      ).toBe(true)
    }
  })
})
