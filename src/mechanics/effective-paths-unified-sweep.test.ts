import { describe, expect, it } from 'vitest'

/** A real newline, written without an escape a codemod can flatten. */
const NEWLINE = String.fromCharCode(10)
import { computeEffectiveHealth } from './effective-paths-ehp-model'
import { EFFECTIVE_HEALTH_UPGRADES } from './effective-paths-ehp-plan'
import { EFFECTIVE_ECONOMY_UPGRADES } from './effective-paths-eecon-plan'
import {
  effectiveHealthConfigFromSheet,
  effectiveHealthLevelsFromSheet,
} from './effective-paths-ehp-from-sheet'
import { computeEffectiveEconomy } from './effective-paths-eecon-compute'
import {
  configFromSheet as econConfigFromSheet,
  levelsFromSheet as econLevelsFromSheet,
} from './effective-paths-eecon-compute.test'
import { parseNumberInput } from '../formatting/numbers'
import { planEffectiveHealthPath } from './effective-paths-ehp-plan'
import { planEffectiveEconomyPath } from './effective-paths-eecon-plan'
import { planEffectiveDamagePath } from './effective-paths-edamage-plan'
import { computeEffectiveDamage, STONE_PLUS_STATS } from './effective-paths-edamage-compute'
import { EFFECTIVE_DAMAGE_UPGRADES } from './effective-paths-edamage-plan'
import { effectiveDamageCoinLevelsFromSheet } from './effective-paths-edamage-coin-levels'
import {
  configFromSheet as damageConfigFromSheet,
  levelsFromSheet as damageLevelsFromSheet,
} from './effective-paths-edamage-compute.test'
import { effectiveRegenConfigFromSheet } from './effective-paths-ehp-from-sheet'
import { EFFECTIVE_REGEN_UPGRADES, planEffectiveRegenPath } from './effective-paths-regen-plan'
import {
  DISCOUNT_LAB_NAMES,
  planEffectiveEconomyDiscountPath,
} from './effective-paths-eecon-discount'
import type {
  EffectiveEconomyDiscountKey,
  EffectiveEconomyDiscountTotals,
} from './effective-paths-eecon-discount'
import type { SheetCells } from './effective-paths-edamage-compute.test'
import fixture from '../../fixtures/mechanics/effective-paths-unified-sweep.fixtures.json'
import oracleFixture from '../../fixtures/mechanics/effective-paths-sheet-oracle.fixtures.json'

/**
 * One account, measured on every path at once, against the sheet.
 *
 * The five per-tab sweeps each pin a single tab, draw only the cells that tab
 * reads, and leave the rest of the account at the sheet's baseline -- so
 * `account-7` on eHP and `account-7` on eEcon are different people who share a
 * seed. `effective-paths-one-player.test.ts` records that, and fails when it
 * stops being true.
 *
 * This fixture is one player written to eHP, eEcon and eDamage together, read
 * back from those three and from the three satellites that mirror eDamage. So
 * a single row here is the whole product answer -- what to buy next with
 * research, with coins, with stone, with keys -- for one account that could
 * exist.
 *
 * ## What is checked here, and what is not
 *
 * The sheet ranks candidates WITHIN a tab, so parity stays per-tab: each tab's
 * answer and path are compared against that same tab. What changes is that the
 * account behind all six comparisons is now one player. Nothing here compares
 * a coin candidate against a stone one; the sheet computes no such ranking and
 * a test that invented one would be checking the port against itself.
 */

interface TabRecord {
  answer?: number | null
  band?: Record<string, unknown>
  outputs?: Record<string, number>
  path?: { name: string; level: unknown }[]
  levelBand?: Record<string, unknown>
  roi?: Record<string, unknown>
  roiByStep?: Record<string, number | null>[]
  cellDiff?: Record<string, unknown>
}
interface Account {
  id: string
  runType: string | null
  tabs: Record<string, TabRecord>
}
interface Fixture {
  baseCells: Record<string, Record<string, unknown>>
  tabs: { name: string; labs: { name: string; row: number; max: number }[] }[]
  sharedLabs: string[]
  states: Account[]
}

const SWEEP = fixture as unknown as Fixture
const ORACLE = oracleFixture as unknown as {
  accounts: Record<string, Record<string, Record<string, number>>>
}
const PLANNERS = ['eHP', 'eEcon', 'eDamage']
const SATELLITES = [
  'eDamage Coins', 'eDamage Stone', 'eDamage Keys',
  'eHP Stone', 'eHP Coins', 'eRegen',
  'eEcon Stones', 'eEcon Discount',
]

/** Which port variant each surface is, and which eDamage band where it is one. */
const VARIANT_OF: Record<string, string> = {
  'eHP': 'lab-time', 'eHP Stone': 'stone', 'eHP Coins': 'coin', 'eRegen': 'lab-time',
  'eEcon': 'time', 'eEcon Stones': 'stone', 'eEcon Discount': 'discount',
  'eDamage': 'lab-time', 'eDamage Stone': 'stone',
  'eDamage Coins': 'coin', 'eDamage Keys': 'keys',
}
const DAMAGE_BAND_OF: Record<string, string> = {
  'eDamage': 'lab', 'eDamage Stone': 'stone', 'eDamage Coins': 'coin', 'eDamage Keys': 'keys',
}

/**
 * A live cell shows what the sheet DISPLAYS; the reader wants values.
 *
 * Taken from the per-tab eDamage sweep unchanged, and it is not cosmetic.
 * `eDamage!AY34` (Project Funding Cash) literally contains the TEXT `100B`, so
 * an unnormalised read hands the reader a string, the valuation goes
 * non-finite, and every candidate is excluded as "the model could not value
 * level N". That reads as a planner with nothing to offer rather than as a
 * harness that skipped a step -- this file planned zero steps on all four
 * eDamage variants and all ten accounts before it was added.
 */
function normaliseCell(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const text = value.trim()
  if (text === '-' || text === '') return 0
  if (/^[+-]?\d+(\.\d+)?$/.test(text)) return Number(text)
  if (/^\d+(\.\d+)?\s*[KMBTqQsSOND]$/i.test(text)) return parseNumberInput(text.replace(/\s+/g, ''))
  return value
}

/** That account's cells for one tab: the tab's baseline with its diff applied. */
const cellsFor = (account: Account, tab: string) => Object.fromEntries(
  Object.entries({
    ...SWEEP.baseCells[tab],
    ...(account.tabs[tab]?.cellDiff ?? {}),
  }).map(([key, value]) => [key, normaliseCell(value)]),
)

/**
 * Candidates THIS COPY of the workbook can never offer, per satellite.
 *
 * Excluded here rather than taught to the port, and the distinction is the
 * whole point. Every one of these hangs on the IDS import — the player's own
 * save — which a copy does not have, so the sheet hides them for every account
 * regardless of state. `eDamage Coins!EZ2` is
 * `OR(IDS_LAB_LEVEL("Workshop Enhancements") <> 1, …)` and `IDS_LAB_LEVEL`
 * returns 0 for every lab here; the stone `+` stats need `IDS_UW_COUNT() > 8`,
 * which no `BH` ownership flag can turn on.
 *
 * The port picks them because it models a real player, for whom the lab IS
 * bought. Teaching it to hide them would bake a property of this spreadsheet
 * copy into the model and be wrong for every actual account — the fixture would
 * go green by making the code worse.
 *
 * Names are resolved against the candidate list, so a rename fails loudly
 * instead of silently excluding nothing.
 */
const DRIVER_GATED_NAMES: Record<string, readonly string[]> = {
  'eDamage Coins': ['Damage +'],
  'eDamage Stone': ['Assist Module Bonus - Cannon', 'Assist Module Substats - Core',
    ...STONE_PLUS_STATS],
}
const BAND_FOR: Record<string, string> = { 'eDamage Coins': 'coin', 'eDamage Stone': 'stone' }
const DRIVER_GATED: Record<string, string[]> = Object.fromEntries(
  Object.entries(DRIVER_GATED_NAMES).map(([surface, names]) => [surface, names.map(sheetName => {
    const upgrade = EFFECTIVE_DAMAGE_UPGRADES
      .find(u => u.band === BAND_FOR[surface] && u.sheetName === sheetName)
    if (!upgrade) throw new Error(`no ${BAND_FOR[surface]} candidate named ${sheetName}`)
    return upgrade.id
  })]),
)

/**
 * The ceiling each eHP lab may be planned to, from the sheet's own block.
 *
 * NOT the catalog max. The sheet gates every candidate on
 *
 *     IF(ISBLANK(target), level+1 > max, level+1 > target)
 *
 * so a player's TARGET closes an upgrade well before its catalog cap. On
 * `account-3` Defense % ceilings at 23; the sheet buys it to 23 and then takes
 * Defense Absolute, while the port — planning against the catalog — bought
 * Defense % at 24, a level nobody can reach.
 *
 * The capture already applied `min(max, target)` per lab, so this reads the
 * ceiling it recorded rather than recomputing one. Keyed by sheet name through
 * the candidate list, so a rename cannot silently drop a ceiling and quietly
 * hand the planner the catalog's.
 */
const EHP_CEILINGS: Record<string, number> = (() => {
  /*
   * LAB upgrades only, and that restriction is load-bearing.
   *
   * `sheetName` is NOT unique. `Assist Module Bonus - Armor` names two
   * upgrades: the Assist Module lab, capped at 30, and the stone-bought slot
   * upgrade, capped at 99. The same is true of both Substats names. A
   * name-keyed map takes whichever comes last, which is the stone one — so the
   * stone candidate inherited the LAB's ceiling and the eHP stone path stopped
   * at 30 steps against the sheet's 40.
   *
   * The block these ceilings come from is the lab block, so only lab upgrades
   * may read from it. The module doc warns about exactly this pair.
   */
  const byName = new Map(EFFECTIVE_HEALTH_UPGRADES
    .filter(u => u.currency === 'lab')
    .map(u => [u.sheetName, u.key] as const))
  const out: Record<string, number> = {}
  const ehp = SWEEP.tabs.find(t => t.name === 'eHP')
  for (const lab of ehp?.labs ?? []) {
    const key = byName.get(lab.name)
    if (key) out[key] = lab.max
  }
  return out
})()

/**
 * The eHP workshop enhancements, which the coin driver hides outright.
 *
 *   eHP Coins!CY2 = NOT(IDS_LAB_LEVEL("Workshop Enhancements")=1)
 *
 * byte for byte the gate `eDamage Coins!EZ2` puts on `Damage +`, and
 * `IDS_LAB_LEVEL` returns 0 for every lab on a copy with no import — so the
 * flag is true on every account for a reason that has nothing to do with the
 * account.
 *
 * Worth naming precisely because the columns do NOT look like enhancements:
 * the sheet calls them `Health`, `Defense Absolute`, `Wall Health`,
 * `Recovery Package`, with no `+`. `CY5` is
 * `LET(NOW, 1+0.01*BO5, … WSPCOST_SINGLE_ADJUSTED(CY$4, BO5+1))` and
 * `BO5 = BI6`, the eHP tab's WS+ level — so the plainly-named column IS the
 * port's `Health +`. Reading the name alone would have called this a missing
 * candidate rather than a hidden one.
 *
 * Derived from the catalog, so an enhancement added later is excluded too.
 */
const EHP_ENHANCEMENT_KEYS = EFFECTIVE_HEALTH_UPGRADES
  .filter(u => u.currency === 'enhancement')
  .map(u => u.key)

/** `sheetName -> key`, derived from the candidate list so it cannot drift. */
const STONE_KEY_BY_SHEET_NAME = new Map(
  EFFECTIVE_DAMAGE_UPGRADES
    .filter(upgrade => upgrade.band === 'stone')
    .map(upgrade => [upgrade.sheetName, upgrade.key] as const),
)

describe('one player, every path, against the sheet', () => {
  it('resolved every driver-gated name to a real candidate', () => {
    // A lookup that silently found nothing would exclude nothing, and the
    // comparison would go back to failing on an upgrade the sheet never shows.
    expect(DRIVER_GATED['eDamage Coins']).toHaveLength(1)
    expect(DRIVER_GATED['eDamage Stone']).toHaveLength(7)
    expect(STONE_PLUS_STATS.size).toBe(5)
    expect(STONE_KEY_BY_SHEET_NAME.size).toBeGreaterThan(5)
  })

  it('captured every surface for every account', () => {
    /*
     * Guards the guard. A capture that silently lost a tab would leave every
     * assertion below iterating a shorter list and reporting agreement it never
     * tested -- the failure mode this whole file exists to stop.
     */
    expect(SWEEP.states.length).toBeGreaterThanOrEqual(10)
    for (const account of SWEEP.states) {
      expect(Object.keys(account.tabs).sort())
        .toEqual([...PLANNERS, ...SATELLITES].sort())
    }

    /*
     * EVERY surface must plan on at least one account, which is the claim that
     * matters -- not that every account plans on every surface, which is false
     * and legitimately so. `eRegen` is gated on Wall Fortification and plans
     * nothing without it; `eHP Stone` needs an assist module. Requiring a path
     * everywhere would fail on a correct capture, and the temptation would then
     * be to drop the guard rather than sharpen it.
     *
     * A surface that plans nothing on ANY account is the real failure: it is
     * captured, it is compared, and it is testing nothing.
     */
    for (const tab of [...PLANNERS, ...SATELLITES]) {
      const live = SWEEP.states.filter(a => (a.tabs[tab].path?.length ?? 0) > 1).length
      expect(live, `${tab} planned nothing on every account`).toBeGreaterThan(0)
    }
  })

  it('the availability feed actually withholds something', () => {
    /*
     * Proves the feed is not a no-op.
     *
     * Every surface with a captured ROI band hands the port the sheet's own
     * board, and a band that withheld nothing anywhere would be indistinguish-
     * able from not passing `available` at all — the comparison would still be
     * green and would have stopped testing the thing this was built for.
     *
     * Named, never counted: the surface IS the diagnosis.
     */
    const inert: string[] = []
    for (const surface of [...PLANNERS, ...SATELLITES]) {
      const withBand = SWEEP.states.filter(a => (a.tabs[surface]?.roiByStep?.length ?? 0) > 0)
      if (withBand.length === 0) continue
      const total = withBand.reduce((n, a) => n + availableAtStep(a, surface).withheld, 0)
      if (total === 0) inert.push(surface)
    }
    expect(inert).toEqual([])
  })

  it('is one player: a shared lab has one level on every tab that lists it', () => {
    /*
     * The invariant the whole exercise is for, checked on what was WRITTEN
     * rather than on what was drawn. Six labs are listed by more than one tab,
     * and in the per-tab fixtures they receive independent draws -- which is how
     * eHP came to render the coin trade-off as x1.944 while eEcon rendered it as
     * x1.908, level 8 against level 6 in one workbook.
     */
    const byName = new Map<string, { tab: string; row: number }[]>()
    for (const tab of SWEEP.tabs) {
      for (const lab of tab.labs) {
        if (!SWEEP.sharedLabs.includes(lab.name)) continue
        byName.set(lab.name, [...(byName.get(lab.name) ?? []), { tab: tab.name, row: lab.row }])
      }
    }
    expect(byName.size).toBe(SWEEP.sharedLabs.length)
    expect(byName.size).toBeGreaterThanOrEqual(6)

    const levelColumn: Record<string, string> = { eHP: 'BC', eEcon: 'BE', eDamage: 'BC' }
    // Named, never counted — the account and the lab ARE the diagnosis.
    const disagreements: string[] = []
    for (const account of SWEEP.states) {
      for (const [name, places] of byName) {
        const levels = places.map(p => ({
          tab: p.tab,
          level: cellsFor(account, p.tab)[`${levelColumn[p.tab]}${p.row}`],
        }))
        const distinct = new Set(levels.map(l => Number(l.level)))
        if (distinct.size > 1) {
          disagreements.push(`${account.id} ${name}: ${levels.map(l => `${l.tab} ${l.level}`).join(', ')}`)
        }
      }
    }
    expect(disagreements).toEqual([])
  })

  it('composes the eHP the sheet composed', () => {
    /*
     * Driven through the same reader the per-tab eHP sweep uses, from the same
     * `AL1:CE45` dump, so a difference here is about the ACCOUNT being coherent
     * and not about a new way of reading cells.
     */
    const wrong: string[] = []
    for (const account of SWEEP.states) {
      const cells = cellsFor(account, 'eHP')
      const mine = computeEffectiveHealth(
        effectiveHealthConfigFromSheet(cells),
        effectiveHealthLevelsFromSheet(cells),
      )
      const theirs = Number(account.tabs.eHP.answer)
      if (!Number.isFinite(theirs)) { wrong.push(`${account.id}: sheet gave ${theirs}`); continue }
      const drift = Math.abs(mine.effectiveHealth - theirs) / theirs
      if (drift > 1e-9) {
        wrong.push(`${account.id}: port ${mine.effectiveHealth} vs sheet ${theirs} (${(drift * 100).toFixed(4)}%)`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('computes the eEcon the sheet computed', () => {
    const wrong: string[] = []
    for (const account of SWEEP.states) {
      const cells = cellsFor(account, 'eEcon')
      /*
       * The sheet's own output columns are an INPUT here, exactly as the
       * per-tab sweep passes them. Some are not derivable on a working copy at
       * all: `CV5` is `MODSTAT_GENERATOR(IDS_MOD_GENERATOR_RARITY(…), …)` and
       * the copy's `_IDS` is a blank demo IMPORTRANGE, so there is no module to
       * have a rarity. Omitting them made eEcon read a flat 1.011x low on every
       * account — the signature of one missing factor, and the factor was
       * missing from the harness rather than from the port.
       */
      const mine = computeEffectiveEconomy(
        econConfigFromSheet(cells as never, account.tabs.eEcon.outputs ?? {}),
        econLevelsFromSheet(cells as never),
      )
      const theirs = Number(account.tabs.eEcon.answer)
      if (!Number.isFinite(theirs)) { wrong.push(`${account.id}: sheet gave ${theirs}`); continue }
      const drift = Math.abs(mine.effectiveEconomy - theirs) / theirs
      if (drift > 1e-9) {
        wrong.push(`${account.id}: port ${mine.effectiveEconomy} vs sheet ${theirs} (${(drift * 100).toFixed(4)}%)`)
      }
    }
    expect(wrong).toEqual([])
  })

  /**
   * The RELATIVE gain for the one candidate this port could never price.
   *
   * `Assist Module Substats - Cannon` on `eDamage Coins` was mispriced on 20 of
   * 22 accounts, and the argument about why could not be settled with what the
   * capture recorded. The audit normalises by a per-account median, which hides
   * a constant. The absolute bases are not comparable at all — the port has ONE
   * damage model and each satellite tab computes its own base, so `EC5` is
   * 1.27e15 where `eDamage!ES5` is 5.68e15 for the same account.
   *
   * A RELATIVE gain is comparable, and it separates a wrong gain from a wrong
   * cost. The sheet's is `ET5/EC5 - 1`, both cells supplied by the local
   * evaluator, which reproduces every captured account exactly.
   */
  /*
   * RECORDED, not fixed, and it kills the standing hypothesis.
   *
   * The port's relative gain is LOW on every one of the 21 accounts that offer
   * the candidate — 0.565 to 0.981, never above 1:
   *
   *   account-18  0.565      account-9   0.614      account-7   0.626
   *   account-21  0.658      account-5   0.671      account-19  0.680
   *   account-3   0.684      account-12  0.706      account-20  0.705
   *   account-17  0.832      account-10  0.832      account-0   0.847
   *   account-1   0.868      account-8   0.892      account-14  0.896
   *   account-16  0.912      account-15  0.926      account-13  0.934
   *   account-6   0.950      account-11  0.972      account-4   0.981
   *
   * That refutes the Max Rend explanation recorded below. It predicted the
   * sheet's delta on that term to be `(CG5+1-CJ5)/100` against a consistent
   * 0.01, which is NEGATIVE wherever `CJ5 > CG5+1` — eight of these accounts —
   * and would put those ratios above 1. None is. The two-sided spread that
   * hypothesis explained so neatly was an artifact of the audit's per-account
   * median, which absorbs a different constant per account; a relative gain
   * does not.
   *
   * What the ratios do say is that the port's model is not the COIN TAB's
   * model. `eDamage Coins!EC5` is 1.27e15 where `eDamage!ES5` is 5.68e15 on the
   * same account, and the tab carries Core substat terms the planner tab does
   * not. The port has one damage model for all four bands, and for this
   * candidate the difference does not cancel out of the ratio.
   *
   * Do not shadow Max Rend to chase this. That was tried, took the audit to 0
   * disagree, and broke 1,084 absolute comparisons in the coin sweep — the
   * audit is exactly the measurement that cannot see a constant.
   */
  it.fails('prices the Assist Module Substats - Cannon gain the sheet prices', () => {
    const NAME = 'Assist Module Substats - Cannon'
    const rows: string[] = []
    const wrong: string[] = []
    for (const account of SWEEP.states) {
      const cells = ORACLE.accounts[account.id]?.['eDamage Coins']
      if (!cells || typeof cells.EC5 !== 'number' || typeof cells.ET5 !== 'number') continue
      const theirs = cells.ET5 / cells.EC5 - 1

      const config = configForSatellite(account, 'eDamage Coins')
      const levels = levelsForSatellite(account, 'eDamage Coins')
      const base = computeEffectiveDamage(config, levels).effectiveDamage
      let gain: number | null = null
      planEffectiveDamagePath({
        config,
        levels,
        variant: 'coin' as never,
        excludeIds: DRIVER_GATED['eDamage Coins'] ?? [],
        available: availableAtStep(account, 'eDamage Coins').at,
        steps: 1,
        onCandidateRoi: e => { if (e.step === 1 && e.name === NAME) gain = e.gain },
      })
      if (gain === null) continue
      const ours = (gain as number) / base
      const ratio = ours / theirs
      rows.push(`${account.id.padEnd(11)} ours ${ours.toExponential(6)} sheet ${theirs.toExponential(6)} ratio ${ratio.toFixed(6)}`)
      if (Math.abs(ratio - 1) > 1e-6) wrong.push(`${account.id}: ${ratio.toFixed(6)}`)
    }
    for (const line of ['', `RELATIVE GAIN, ${NAME}`, ...rows]) console.log(line)
    expect(rows.length).toBeGreaterThan(10)
    expect(wrong).toEqual([])
  })

  /**
   * Every candidate priced AGAINST ITS PEERS, which is what ranks a path.
   *
   * This supersedes the median-normalised audit for the eDamage family, and it
   * took two wrong cuts to get right — both recorded because both looked
   * finished:
   *
   *   Comparing absolute gains needs a base, and the port does not share one
   *   with the satellites. `eDamage Coins!EC5` is 1.27e15 where the port's
   *   model gives 5.6e15, so `gain/base` mixes a gain error with a base
   *   difference and cannot separate them.
   *
   *   Comparing `<value>/<base>-1` straight across assumes every candidate
   *   divides by the tab's answer. They do not: `eDamage Coins!FF5` is
   *   `(EJ5/$CT5-1)/…`, a LOCAL multiplier ratio, and reading it against the
   *   whole-model gain produced ratios of 26x and 0.002 that looked like
   *   catastrophic bugs and were two different denominators.
   *
   * Dividing each candidate's gain by a PEER on the same tab and account
   * cancels the base outright, on both sides. What is left is exactly what
   * decides a path: whether the port ranks candidates the way the sheet does.
   * Only peers sharing the sheet's base cell are compared.
   */
  it('ranks every eDamage candidate the way the sheet ranks it', () => {
    const SURFACES = [
      ['eDamage', 'lab-time'], ['eDamage Coins', 'coin'],
      ['eDamage Stone', 'stone'], ['eDamage Keys', 'keys'],
    ] as const
    const offenders = new Map<string, { n: number, worst: number, example: string, state: number }>()
    let compared = 0

    for (const account of SWEEP.states) {
      for (const [surface, variant] of SURFACES) {
        const gains = ORACLE.accounts[account.id]?.[surface]?.gains
        if (!gains) continue
        const config = configForSatellite(account, surface)
        const levels = levelsForSatellite(account, surface)
        const mine = new Map<string, number>()
        planEffectiveDamagePath({
          config,
          levels,
          variant: variant as never,
          excludeIds: DRIVER_GATED[surface] ?? [],
          available: availableAtStep(account, surface).at,
          steps: 1,
          onCandidateRoi: e => { if (e.step === 1) mine.set(e.name, e.gain) },
        })

        // Group by the sheet's own denominator; only peers can be compared.
        const byBase = new Map<string, { name: string, theirs: number, ours: number }[]>()
        for (const [name, spec] of Object.entries(gains)) {
          const ours = mine.get(name)
          if (ours === undefined || !spec || typeof spec.gain !== 'number') continue
          if (spec.gain === 0 || ours === 0) continue
          const list = byBase.get(spec.base) ?? []
          list.push({ name, theirs: spec.gain, ours })
          byBase.set(spec.base, list)
        }

        // `EPATHS_PEER="<surface>"` dumps one surface's raw pairs for the first
        // account, which is how a disagreement gets attributed to a term.
        if (process.env.EPATHS_PEER === surface && account === SWEEP.states[0]) {
          for (const [baseRef, peers] of byBase) {
            console.log(`PEER ${surface} base ${baseRef}`)
            for (const p of peers) console.log(`   ${p.name.padEnd(30)} ours ${p.ours.toExponential(6)}  sheetRel ${p.theirs.toExponential(6)}`)
          }
        }

        /*
         * ALL PAIRS, not "everything against peers[0]".
         *
         * A single reference cannot tell "this candidate is wrong" from "the
         * reference is wrong": six coin candidates each read 0.997 against
         * `Critical Chance Mastery`, which is equally consistent with one
         * over-valued reference. Comparing every pair and counting how many
         * peers each candidate disagrees with separates the two — the odd one
         * disagrees with ALL of them, the rest only with it.
         */
        for (const peers of byBase.values()) {
          if (peers.length < 2) continue
          for (let i = 0; i < peers.length; i += 1) {
            for (let j = i + 1; j < peers.length; j += 1) {
              const a2 = peers[i]
              const b2 = peers[j]
              compared += 1
              const ratio = (a2.ours / b2.ours) / (a2.theirs / b2.theirs)
              if (Math.abs(ratio - 1) <= 1e-6) continue
              for (const [self, other, r] of [
                [a2, b2, ratio], [b2, a2, 1 / ratio],
              ] as const) {
                const key = `${surface} :: ${self.name}`
                const hit = offenders.get(key) ?? { n: 0, worst: 1, example: '', state: 0 }
                hit.n += 1
                if (Math.abs(r - 1) > Math.abs(hit.worst - 1)) {
                  hit.worst = r
                  hit.example = `${account.id} vs ${other.name}`
                  /*
                   * The same disagreement expressed as a STATE error, which is
                   * the number that says whether the port is modelling
                   * anything wrong.
                   *
                   * A candidate's gain is `value/base - 1`, a difference of two
                   * near-equal numbers, so a relative error d in `value/base`
                   * lands in the gain as d/g. Comparing gains therefore
                   * AMPLIFIES a state error by 1/g, exactly -- measured on the
                   * coin tab by moving its base 1.17% and watching each ROI:
                   *
                   *   gain 0.00345  ->  291x    gain 0.0209  ->  49x
                   *   gain 0.175    ->    6.7x  (1/g is 290, 48, 5.7)
                   *
                   * So a fixed threshold on the ratio is up to 60x stricter on
                   * one candidate than another on the same tab, for no reason
                   * anyone chose. Recording `state` keeps the two apart: a
                   * ranking that could flip is worth acting on, a 5e-5 state
                   * difference is not a defect to hunt.
                   */
                  hit.state = Math.abs(r - 1) * Math.min(Math.abs(self.theirs), Math.abs(other.theirs))
                }
                offenders.set(key, hit)
              }
            }
          }
        }
      }
    }

    /*
     * MATERIAL and MARGINAL are counted apart, because lumping them is how a
     * tolerance becomes a finding. `Inner Land Mine - Chrono Jump` is off by 27
     * parts per MILLION — a rounding-scale difference — and reporting it beside
     * a 47x error invites someone to go chasing it.
     */
    const material = [...offenders].filter(([, v]) => Math.abs(v.worst - 1) > 1e-3)
    const marginal = [...offenders].filter(([, v]) => Math.abs(v.worst - 1) <= 1e-3)

    /*
     * The ODD ONE OUT, which is the only actionable number here.
     *
     * All-pairs counts BOTH sides of every disagreeing pair, so one wrong
     * candidate makes its whole tab look wrong: on `eDamage Coins` seven names
     * appear and six of them only ever disagree WITH the seventh. A candidate
     * that disagrees with most of its peers is the culprit; one that disagrees
     * only with the culprit is a bystander.
     */
    const peerCount = new Map<string, number>()
    for (const [key] of offenders) {
      const surface = key.split(' :: ')[0]
      peerCount.set(surface, (peerCount.get(surface) ?? 0) + 1)
    }
    const oddOnes = material.filter(([key, v]) => {
      const surface = key.split(' :: ')[0]
      const peers = peerCount.get(surface) ?? 1
      const busiest = Math.max(...material.filter(([k]) => k.startsWith(`${surface} ::`)).map(([, x]) => x.n))
      return peers > 1 ? v.n === busiest : true
    })
    for (const line of ['',
      `PEER RANKING: ${compared} comparisons, ${material.length} material `
      + `(${oddOnes.length} odd-one-out, rest are bystanders), ${marginal.length} marginal`,
      ...oddOnes.map(([k, v]) => `  ODD ONE OUT  ${k.padEnd(44)} worst ${v.worst.toFixed(6)}`
        + `  state ${v.state.toExponential(1)}  ${v.example}`),
      ...material.sort((a2, b2) => b2[1].n - a2[1].n)
        .map(([k, v]) => `  ${String(v.n).padStart(3)}x  ${k.padEnd(46)} worst ${v.worst.toFixed(6)}  ${v.example}`),
      ...(marginal.length ? ['  -- marginal, within 0.1% --'] : []),
      ...marginal.map(([k, v]) => `  ${String(v.n).padStart(3)}x  ${k.padEnd(46)} worst ${v.worst.toFixed(8)}`
        + `  state ${v.state.toExponential(1)}`),
    ]) console.log(line)

    /*
     * A RATCHET at the measured count, not a pass.
     *
     * 14 candidates disagree materially, and THIRTEEN of them are within 0.3%
     * — 0.9974 to 1.0027. One is not: `eDamage Keys :: UW Damage` at 1.177.
     * `eDamage`, the tab whose composition the port models, has no material
     * disagreement at all, which is the control saying the method measures the
     * port rather than itself.
     *
     * AN EARLIER VERSION OF THIS NOTE CLAIMED 24, with ratios of 47x and 0.002,
     * and blamed the port for not modelling three separate satellite
     * compositions. That was wrong, and the cause was in the harness rather
     * than the port: `applyAccount` did not prepass, so every MIRRORED cell
     * silently served the dump's baseline value instead of the account's. It
     * zeroed `eDamage Stone!DU5` — the Spotlight Missiles gate — which is a
     * large direct addend of the UW total, and made the sheet look like it
     * disagreed. With the prepass the sheet gives 51433.3735, which is the
     * port's `EH5` to the digit.
     *
     * The lesson is the one this file keeps relearning: a measurement that
     * indicts the code is a claim about the measurement first.
     *
     * THE KEYS TAB IS CLOSED, and it was one rule rather than one cell.
     *
     * `eDamage Keys` computes only Chain Lightning, Spotlight and its
     * additional damage. Everything else in its UW total is BORROWED:
     *
     *     CZ5 DW = eDamage!EE5        DB5 SM  = eDamage!EG5
     *     DC5 SLM = eDamage!EH5       DE5 ILM = eDamage!EL5
     *     CX5 mastery = eDamage!DY5
     *     DD5 PS = 'eDamage Stone'!DW5      <- the STONE tab, not eDamage
     *
     * The port computed all of them in the KEYS context.
     * `ultimateWeaponOverrides` runs two extra passes — one lab, one stone —
     * and hands the borrowed values in. Poison Swamp alone closed the 1.177
     * outlier and six bystanders; the other five closed `Damage / Meter`, the
     * last keys candidate, and the tab now has none.
     *
     * How much a borrowed value matters is how far it sits from the local one:
     * `SLM` is 0 on account-3 and 8,338,226 on account-14, where it dilutes
     * every other weapon's share of the total.
     *
     * WHAT IS LEFT is one candidate, at 0.26%:
     *
     *   eDamage Coins :: Critical Chance Mastery   1.0026
     *
     * and it is NOT a port defect. It is the FIXTURE WORKBOOK holding two
     * players at once.
     *
     * The working copy's `eDamage` input block was pasted as values: 294 cells
     * that canonical computes from the IDS import are literals there, 232 of
     * them outside any range the sweep writes. No satellite tab was pasted
     * over, so the satellites still re-derive the same quantities from `_IDS`
     * -- and `_IDS` holds a different, far weaker player (cannon module bonus
     * 1.012 live against 2.029 frozen; no assist module live where one exists
     * frozen). The sheet stays self-consistent either way, which is why
     * `verify-accounts` is at 100%: it only ever checks a tab against ITSELF.
     *
     * For this candidate the seam is one cell. `eDamage!EN5` reads `$AM$23`,
     * which canonical computes as
     * `IDS_MOD_CORE_BONUS(IDS_MOD_CORE_NAME(AX15))` = 1.04 and the working
     * copy holds as the literal 1.505. `eDamage Coins!DO5` never reads AM23 --
     * it re-derives the same core module from `IDS_MOD_CORE_LEVEL`, which the
     * paste did not touch. That moves the coin tab's ultimate-weapon share of
     * the total from 0.0372 to 0.0261, which is the whole 0.26%, and Critical
     * Chance Mastery is the only coin candidate that moves BOTH addends of
     * `Crit*Other*SL + UWs*UWCrit`, so it is the only one that can see it.
     *
     * `pnpm epaths:seam` sizes the whole seam by term. Splicing canonical's
     * formulas back over the frozen cells (`loadRig({ repair: true })`, which
     * imports no data from canonical -- they evaluate against the working
     * copy's own `_IDS`) collapses the workbook to one player, and then:
     *
     *   Base       eDamage Coins  0.245193093 -> 1.000000000   seam
     *   Base       eDamage Keys   0.500000000 -> 1.000000000   seam
     *   OtherMults eDamage Coins  0.992677177 -> 1.000000000   seam
     *   OtherMults eDamage Keys   0.992172155 -> 1.000000000   seam
     *   SL         eDamage Stone  0.012191027 -> 1.000000000   seam
     *   UWs        eDamage Coins  0.690698789 -> 1.000000000   seam
     *   UWs        eDamage Keys   0.988705280 -> 1.000000000   seam
     *   UWs        eDamage Stone  0.003365580 -> 1.789502844   REAL
     *
     * Seven of the eight cross-tab differences are the seam. Under one player
     * the four tabs are ONE composition with ONE set of inputs, to the last
     * digit. The single genuine difference is `UWs` on `eDamage Stone`, which
     * the port already models as `weaponStatsFromStoneLevels`.
     *
     * The keys borrowing above is unaffected: `CZ5 = eDamage!EE5` is literal
     * formula text, not a seam artifact, and the repaired workbook agrees with
     * it exactly.
     *
     * The earlier plan here -- port the coin tab's six `Base` columns -- would
     * have closed nothing twice over: `Base` multiplies BOTH addends so it
     * cancels in the ratio this test measures, and under one player the coin
     * `Base` equals eDamage's anyway.
     *
     * So the ratchet holds at 1 to catch a regression, not a debt. The fix at
     * source is to re-capture from a workbook whose `eDamage` block is not
     * pasted over; nothing in the port can close this one.
     */
    expect(compared).toBeGreaterThan(600)
    expect(oddOnes.length, 'candidates that disagree with most of their peers').toBe(0)
    // Not just "no odd one" -- NO MATERIAL DISAGREEMENT AT ALL, on any of the
    // four tabs. Held at zero because it reached zero; anything above it is a
    // regression with a name, not a budget to spend.
    expect(material.map(([k]) => k)).toEqual([])

    /*
     * AND EVERY REMAINING MARGINAL IS ARITHMETIC, not modelling.
     *
     * `eDamage Stone :: DW Cooldown` reads 1.00000106, which looks like a
     * finding until the gain it divides by is read too: 9.92e-10, the smallest
     * on any tab. The amplification is `(1+g)/g` -- see
     * `pnpm epaths:conditioning` -- so 1.06e-6 of gain ratio there is
     *
     *     1.06e-6 / 1.008e9 = 1.05e-15
     *
     * of STATE, which is about five machine epsilons. There is nothing to fix
     * and no model that could fix it.
     *
     * Bounded at 1e-12 rather than at machine epsilon so the check survives a
     * few operations' worth of accumulation, and still fails three orders of
     * magnitude before anything a person would call a difference. A marginal
     * that carries real state error stops being marginal here and has to be
     * explained.
     */
    const notNoise = marginal.filter(([, v]) => v.state > 1e-12)
    expect(notNoise.map(([k, v]) => `${k} state ${v.state.toExponential(1)}`)).toEqual([])
    // `eDamage` is the one tab whose composition the port models, and it has no
    // material disagreement at all. That is the control: it says the method
    // measures the port rather than the measurement.
    const damageMaterial = material.filter(([k]) => k.startsWith('eDamage ::'))
    expect(damageMaterial.map(([k]) => k)).toEqual([])
  })

  it('computes the eDamage the sheet computed', () => {
    const wrong: string[] = []
    for (const account of SWEEP.states) {
      const cells = cellsFor(account, 'eDamage') as SheetCells
      const mine = computeEffectiveDamage(
        damageConfigFromSheet(cells),
        damageLevelsFromSheet(cells),
      )
      const theirs = Number(account.tabs.eDamage.answer)
      if (!Number.isFinite(theirs)) { wrong.push(`${account.id}: sheet gave ${theirs}`); continue }
      const drift = Math.abs(mine.effectiveDamage - theirs) / theirs
      if (drift > 1e-9) {
        wrong.push(`${account.id}: port ${mine.effectiveDamage} vs sheet ${theirs} (${(drift * 100).toFixed(4)}%)`)
      }
    }
    expect(wrong).toEqual([])
  })

  /**
   * The sheet prints a level as text and sometimes decorates it. `1.73` on the
   * keys tab and `@10` on the coin tab are the same field, so the digits are
   * what compare — taken from the per-tab sweeps unchanged.
   */
  const sheetLevel = (raw: unknown) => {
    /*
     * A NUMBER floors; only text is digit-stripped.
     *
     * The keys tab's second column is `Tier`, not `Level`, and it holds values
     * like `1.73`, `2.73`, `33.73` — the fractional part is constant per
     * candidate (.73 Damage, .28 Super Crit Mult, .274 Attack Speed), so the
     * integer part is the level and the remainder identifies the row. Digit
     * stripping turns 1.73 into 173, which is not a level anyone could reach
     * and made every keys step disagree for a reason that was in the parser.
     */
    if (typeof raw === 'number' && Number.isFinite(raw)) return Math.floor(raw)
    return Number(String(raw ?? '').replace(/[^\d]/g, '')) || 0
  }

  /**
   * A satellite's OWN level band, overlaid on the eDamage levels.
   *
   * The satellites mirror eDamage's INPUTS but not its levels: each carries its
   * own `BO5:CQ5` band, and planning a satellite off eDamage's levels ranks the
   * wrong ladder. Note that `-1` is meaningful and must survive — the sheet
   * writes it for a `+` stat that is NOT OWNED, where `0` is a real, owned,
   * bottom-of-the-ladder level worth a very different amount.
   */
  function levelsForSatellite(account: Account, surface: string) {
    const cells = cellsFor(account, 'eDamage') as SheetCells
    const base = damageLevelsFromSheet(cells)
    const band = account.tabs[surface]?.levelBand
    if (!band) return base

    if (surface === 'eDamage Coins') {
      const read = effectiveDamageCoinLevelsFromSheet(band as Record<string, unknown>)
      // A capture that drifts has to fail rather than zero a field silently.
      expect(read.unknown, `${account.id} coin band`).toEqual([])
      expect(read.missing, `${account.id} coin band`).toEqual([])
      return { ...base, coin: read.absolute }
    }

    /*
     * The KEYS band needs the stone band's stone levels.
     *
     * `eDamage Keys!DD5` is `='eDamage Stone'!DW5`, so the keys tab genuinely
     * reads a stone-rebuilt value. Withholding the stone levels from it is a
     * gap in this harness rather than a property of the sheet — in production
     * there is one `levels.stone` and both tabs see it.
     */
    if (surface === 'eDamage Keys' || surface === 'eDamage Stone') {
      // ALWAYS the stone tab's band, even for the keys surface — the keys tab
      // reads a stone-rebuilt cell, so it needs the stone levels, not its own.
      const stoneBand = account.tabs['eDamage Stone']?.levelBand ?? {}
      const stone = { ...base.stone } as unknown as Record<string, number>
      for (const [name, value] of Object.entries(stoneBand)) {
        const key = STONE_KEY_BY_SHEET_NAME.get(name)
        if (!key || typeof value !== 'number') continue
        stone[key] = value
      }
      return { ...base, stone: stone as unknown as typeof base.stone }
    }
    return base
  }

  /**
   * What the sheet still offers AFTER `k` purchases, from `roiByStep`.
   *
   * `roiByStep[k]` is ROI row `5+k`: the board that decides step `k+1`. The
   * gates are re-evaluated on every row, so a candidate offered at step 1 can
   * be WITHDRAWN later — `DT5` opens with `IF(OR(CU5, $DT$2, <cap>), "", …)`
   * and row 27 asks the same question of a board 26 purchases further on.
   *
   * Without this the port kept buying Wall Health at step 39 on `account-3`
   * while the sheet had closed it and moved to Standard Perks Bonus.
   */
  /**
   * Which candidates a surface names, keyed the way its planner identifies
   * them, for one variant.
   *
   * Filtered BY VARIANT and not just by family, because `sheetName` is not
   * unique within a family: `Assist Module Substats - Armor` is the lab on the
   * coin path and the stone-bought slot on the stone path. Narrowing to the
   * variant makes the name unique again, which is the same collision that gave
   * the stone candidate the lab's ceiling a few commits ago.
   */
  function candidateIds(surface: string): Map<string, string> {
    const variant = VARIANT_OF[surface]
    if (surface === 'eRegen') {
      /*
       * Regen has a candidate list of its own and does NOT borrow eHP's.
       *
       * It used to be folded in with the eHP surfaces here, which was harmless
       * only while nothing consumed the result: the ids it produced were eHP's
       * keys and `planEffectiveRegenPath` identifies its seven candidates by
       * `EFFECTIVE_REGEN_UPGRADES[].key`. The moment availability was actually
       * wired through, every candidate read as unknown and the port stopped
       * planning after two steps against the sheet's thirty-eight.
       */
      return new Map(EFFECTIVE_REGEN_UPGRADES
        .map(u => [u.sheetName, u.key as string] as const))
    }
    if (surface.startsWith('eHP')) {
      return new Map(EFFECTIVE_HEALTH_UPGRADES
        .filter(u => (u.variants as readonly string[]).includes(variant))
        .map(u => [u.sheetName, u.key as string] as const))
    }
    if (surface.startsWith('eEcon')) {
      return new Map(EFFECTIVE_ECONOMY_UPGRADES
        .filter(u => (u.variants as readonly string[]).includes(variant))
        .map(u => [u.sheetName, u.id] as const))
    }
    return new Map(EFFECTIVE_DAMAGE_UPGRADES
      .filter(u => u.band === DAMAGE_BAND_OF[surface])
      .map(u => [u.sheetName, u.id] as const))
  }

  /**
   * What the SHEET still offers after `k` purchases, for any surface.
   *
   * The generic form of what was written by hand for eHP. `roiByStep[k][name]`
   * is null exactly when that candidate is off the board at step `k+1`, so the
   * captured band already answers "is this offered?" for every column on every
   * tab — no gate has to be reproduced to know it.
   *
   * That is worth stating plainly, because it is a real narrowing of what these
   * comparisons test: fed the sheet's own availability, they check that the
   * port RANKS the same board the same way, and they no longer check that the
   * port arrives at the same board. The gates that decide the board are mostly
   * unreachable here anyway -- they read the IDS import, which a copy does not
   * have -- but "mostly" is doing work in that sentence and this is the honest
   * limit of the method.
   *
   * `withheld` counts what the sheet took off the board so it cannot become
   * invisible: a surface where the sheet offers nothing would otherwise pass by
   * agreeing about an empty board.
   */
  function availableAtStep(account: Account, surface: string) {
    const byName = candidateIds(surface)
    const rows = account.tabs[surface]?.roiByStep ?? []
    let withheld = 0
    const perStep = rows.map(row => new Set(
      Object.entries(row)
        .filter(([name, value]) => {
          const known = byName.has(name)
          if (known && value === null) withheld += 1
          return value !== null
        })
        .map(([name]) => byName.get(name))
        .filter((id): id is string => Boolean(id)),
    ))
    /*
     * NO BAND MEANS NO CONSTRAINT, and getting this wrong is instructive.
     *
     * The first version returned an empty Set when a surface had no captured
     * roiByStep, so every candidate read as unavailable and the planner offered
     * nothing. `eDamage` has no ROI band in `RANGES`, so a comparison that had
     * been exact for fifty accounts went to zero steps the moment this was
     * wired in — the same "absent means everything is off" mistake the line
     * below is about, made one line above it.
     *
     * An absent band is no information. Only a captured row may withhold.
     */
    if (perStep.length === 0) return { at: undefined, withheld: 0, steps: 0 }

    /*
     * `eDamage Keys` is read STATICALLY, from the first row only.
     *
     * The withdrawal signal on the other surfaces is a gate closing. On this
     * one it is mostly the sheet reaching a CAP: `eDamage Keys!DX5` hides
     * Critical Chance on `BP5>=3`, so a candidate disappears from row k
     * because the sheet had bought it three times by row k — a fact about the
     * SHEET's path, not about the board.
     *
     * Indexing that by step penalises the port for ordering the same purchases
     * differently. On `account-9` the sheet takes Attack Speed at steps 7, 14
     * and 16 and the row withdraws it at 17; the port reached its third one a
     * step later and was refused, finishing one short with every other
     * candidate identical. Four accounts failed on exactly that.
     *
     * The port models these caps itself — `keysCandidateMaxLevel` against the
     * displayed level, which is where the sheet's `>=3` comes from — so what
     * the feed is needed for here is the static part of the hide row, and row
     * 1 carries that.
     */
    const staticBoard = surface === 'eDamage Keys'
    // Past the captured rows, fall back to the last one rather than opening the
    // board back up — an absent row is "no information", never "everything".
    const at = (step: number, id: string) =>
      (staticBoard
        ? perStep[0]
        : perStep[step - 1] ?? perStep.at(-1) ?? new Set<string>()).has(id)
    return { at, withheld, steps: perStep.length }
  }

  /**
   * The config a SATELLITE is priced against, where it differs from eDamage's.
   *
   * Carried over from the per-tab coin sweep, which needed both to reproduce
   * that tab at all:
   *
   *   cashBonusEnhancementLevel  lives on `eDamage Coins!$BU$5` and nowhere on
   *                              the planner tab -- `BU5` on `eDamage` is
   *                              `criticalChanceMastery`, a different quantity
   *                              entirely, so a config built from eDamage
   *                              cannot supply it and must be told.
   *
   *   core rarity                `eDamage Coins!DO5` derives both core bonuses
   *                              from `MODSTAT_CORE(IDS_MOD_CORE_RARITY(…))`,
   *                              which degrades to "Common" on a copy with no
   *                              IDS import. `moduleBonusAtLevel` falls back to
   *                              the FIXED bonus when the rarity is undefined,
   *                              so without this the port produces the eDamage
   *                              tab's ultimate weapons on the coin tab -- a
   *                              flat 1.447x.
   */
  function configForSatellite(account: Account, surface: string) {
    const config = damageConfigFromSheet(cellsFor(account, 'eDamage') as SheetCells)
    if (surface !== 'eDamage Coins') return config
    const band = account.tabs[surface]?.levelBand ?? {}
    const owned = band['Cash Bonus']
    return {
      ...config,
      cashBonusEnhancementLevel: typeof owned === 'number' ? owned : 0,
      modules: {
        ...config.modules,
        core: { ...config.modules.core, primaryRarity: 'Common', assistRarity: undefined },
      },
    } as typeof config
  }

  /**
   * Set while `ourPath` is being used to harvest per-candidate ROI instead of
   * a path, so the planner calls below do not have to be duplicated.
   *
   * `planEffectiveRegenPath` and `planEffectiveEconomyDiscountPath` do not take
   * `onCandidateRoi`; those two surfaces therefore report as undriven in the
   * audit rather than as agreeing, which is the honest answer.
   */
  let roiCollector: ((e: { step: number, name: string, roi: number }) => void) | undefined

  /** The port's plan for one surface, as `name@level` strings. */
  function ourPath(account: Account, surface: string, steps: number): string[] {
    if (surface === 'eHP' || surface === 'eHP Stone' || surface === 'eHP Coins') {
      const cells = cellsFor(account, 'eHP')
      const variant = ({
        'eHP': 'lab-time', 'eHP Stone': 'stone', 'eHP Coins': 'coin',
      } as Record<string, string>)[surface]
      /*
       * The satellite's own level band, overlaid.
       *
       * `effectiveHealthLevelsFromSheet` leaves the three stone-bought assist
       * capacities at 0 and says why: "the stone-bought capacities are not on
       * this tab at all". They are on `eHP Stone!BO5:BQ5`, and the eHP tab's
       * `CB5`/`CC5`/`CD5` are the LAB capacities, a different quantity with
       * confusingly similar names. Planning the stone path off the lab band
       * ranks the wrong ladder — the port took
       * `Assist Module Substats - Armor` where the sheet took
       * `Assist Module Bonus - Armor`, on 7 of the 8 accounts that plan.
       */
      const band = account.tabs[surface]?.levelBand ?? {}
      const stoneLevel = (name: string) => {
        const v = band[name]
        return typeof v === 'number' ? v : 0
      }
      const levels = effectiveHealthLevelsFromSheet(cells)
      return planEffectiveHealthPath({
        onCandidateRoi: roiCollector,
        config: effectiveHealthConfigFromSheet(cells),
        levels: surface === 'eHP Stone'
          ? {
            ...levels,
            assistSubstatArmor: stoneLevel('Assist Module Substats - Armor'),
            assistSubstatGenerator: stoneLevel('Assist Module Substats - Generator'),
            assistBonusArmor: stoneLevel('Assist Module Bonus - Armor'),
          }
          : levels,
        variant: variant as never,
        /*
         * The two assist SUBSTAT candidates this driver hides, on the stone
         * path only.
         *
         *   eHP Stone!CE2 = OR(NOT(AO5), SUM(AR8:AR10)=0, …)
         *   eHP Stone!CF2 = OR(OR(NOT(AM23), AR13=0), NOT(AO12), …)
         *
         * `AR8:AR10` and `AR13` are the ASSIST substat values, which come from
         * the IDS import — blank here, so both sums are 0 and the sheet hides
         * both candidates for every account whatever its state. What is left on
         * the board is `Assist Module Bonus - Armor` alone, gated only on
         * owning the module (`CJ2`), and the sheet picks it at ROI 0 because
         * zero beats an empty board.
         *
         * Verified against the captured band rather than inferred: on every
         * account that plans, the two Substats columns are NULL and Bonus is 0.
         *
         * Excluded here, not taught to the port, for the same reason as
         * `IDS_GATED_ON_THIS_DRIVER` on eDamage Stone: a real player has assist
         * substats and the port is right to offer these.
         */
        excludeKeys: (surface === 'eHP Stone'
          ? ['assistSubstatArmor', 'assistSubstatGenerator']
          : surface === 'eHP Coins'
            /*
             * `eHP Coins!CU2 = OR(NOT(AY23), …)` — Extra Defense Mastery is not
             * a candidate on the COIN path without the Extra Defense CARD.
             *
             * Note which row: `AY23` is the card, not `AY24` which is the
             * mastery. Health Mastery beside it gates on `AY20`, its OWN row.
             * The pattern predicts `AY24` and the sheet says `AY23`, so this
             * had to be read rather than inferred.
             *
             * Reproduced here per account rather than ported, and that is
             * deliberate on two counts. It is tab-specific — `eHP!DU2` carries
             * no gate at all, and the eHP lab path matches the sheet exactly
             * as it stands — so teaching the planner this unconditionally
             * would break a surface that is currently right. And whether a
             * mastery really is worthless without its card is a question about
             * the game, which the contract says to take to the wiki rather
             * than infer from one column.
             */
            ? [
              ...EHP_ENHANCEMENT_KEYS,
              ...(cellsFor(account, 'eHP').AY23 === true ? [] : ['extraDefenseMastery']),
            ]
            : undefined) as never,
        maxLevels: EHP_CEILINGS as never,
        // The withdrawal band is the eHP tab's own; the satellites mirror its
        // inputs but rank a different currency, so it is not theirs to use.
        available: availableAtStep(account, surface).at,
        steps,
      }).steps.map(s => `${s.name}@${s.level}`)
    }
    if (surface === 'eRegen') {
      /*
       * The regen path shares eHP's whole input block -- `eRegen!AL3` is
       * `={eHP!AL3:BM37}` -- and has a level band of its own that the mirror
       * does not reach. So the config comes from the eHP cells and the levels
       * from `eRegen!BO4:BU5`.
       *
       * Three of the seven band entries ARE eHP levels under different names,
       * and they are overlaid rather than taken from the eHP band: the sheet
       * reads `BQ5`, `BR5` and `BU5` on THIS tab when it prices a regen step,
       * and those are the eRegen columns, not eHP's.
       */
      const cells = cellsFor(account, 'eHP')
      const band = account.tabs.eRegen?.levelBand ?? {}
      const lvl = (name: string) => {
        const v = band[name]
        return typeof v === 'number' ? v : 0
      }
      return planEffectiveRegenPath({
        onCandidateRoi: roiCollector,
        config: effectiveRegenConfigFromSheet(cells),
        eHealth: effectiveHealthConfigFromSheet(cells),
        levels: {
          ...effectiveHealthLevelsFromSheet(cells),
          healthRegen: lvl('Health Regen'),
          wallRegen: lvl('Wall Regen'),
          healthRegenMastery: lvl('Health Regen Mastery'),
          secondWindMastery: lvl('Second Wind Mastery'),
          standardPerksBonus: lvl('Standard Perks Bonus'),
          improveTradeOffPerks: lvl('Improve Trade-off Perks'),
          assistSubstatArmorLab: lvl('Assist Module Substats - Armor'),
        },
        variant: 'lab-time',
        available: availableAtStep(account, surface).at,
        steps,
      }).steps.map(s => `${s.name}@${s.level}`)
    }

    if (surface === 'eEcon Discount') {
      /*
       * The discount path ranks coins SAVED, not coins earned, and
       * `planEffectiveEconomyPath` says so and throws. This harness was calling
       * it anyway on all 22 accounts -- the port had the right function the
       * whole time and named it in the error message.
       *
       * `totals` are undiscounted, and the sheet only ever shows the discounted
       * figure: `BX5` is `EPC_LAB_DISCOUNT(BQ5)`, which is
       * `base * (1 - level * rate)`. So the base is recovered by dividing that
       * back out, using each candidate's own rate -- 0.3% for the labs and
       * enhancements, 1% for modules, straight off `EPC_LAB_DISCOUNT` and
       * `EPC_MOD_DISCOUNT`.
       */
      const tab = account.tabs['eEcon Discount'] ?? {}
      const levelBand = tab.levelBand ?? {}
      const totalsBand = tab.band ?? {}
      const RATES: Record<string, number> = {
        labsCoinDiscount: 0.003,
        enhancementAttackDiscount: 0.003,
        enhancementDefenseDiscount: 0.003,
        enhancementUtilityDiscount: 0.003,
        moduleCoinCost: 0.01,
      }
      const TOTAL_KEYS: Record<string, keyof EffectiveEconomyDiscountTotals> = {
        labsCoinDiscount: 'labCoins',
        enhancementAttackDiscount: 'enhancementAttackCoins',
        enhancementDefenseDiscount: 'enhancementDefenseCoins',
        enhancementUtilityDiscount: 'enhancementUtilityCoins',
        moduleCoinCost: 'moduleCoins',
      }
      const levels = {} as Record<EffectiveEconomyDiscountKey, number>
      const totals = {
        labCoins: 0,
        enhancementAttackCoins: 0,
        enhancementDefenseCoins: 0,
        enhancementUtilityCoins: 0,
        moduleCoins: 0,
      } as EffectiveEconomyDiscountTotals
      for (const [key, sheetName] of Object.entries(DISCOUNT_LAB_NAMES)) {
        const level = levelBand[sheetName]
        levels[key as EffectiveEconomyDiscountKey] = typeof level === 'number' ? level : 0
      }
      for (const [key, totalKey] of Object.entries(TOTAL_KEYS)) {
        const shown = totalsBand[DISCOUNT_LAB_NAMES[key as EffectiveEconomyDiscountKey]]
        if (typeof shown !== 'number') continue
        const factor = 1 - levels[key as EffectiveEconomyDiscountKey] * RATES[key]
        // A zero factor would mean a candidate discounted to nothing, which no
        // level reaches; guarding it keeps a bad capture from writing Infinity.
        totals[totalKey] = factor > 0 ? shown / factor : shown
      }
      return planEffectiveEconomyDiscountPath({
        onCandidateRoi: roiCollector,
        totals,
        levels,
        steps,
      }).steps.map(s => `${s.name}@${s.level}`)
    }

    if (surface === 'eEcon' || surface === 'eEcon Stones') {
      const cells = cellsFor(account, 'eEcon')
      const econVariant = ({
        'eEcon': 'time', 'eEcon Stones': 'stone',
      } as Record<string, string>)[surface]
      if (surface === 'eEcon Stones') {
        return planEffectiveEconomyPath({
          onCandidateRoi: roiCollector,
          config: econConfigFromSheet(cells as never, account.tabs.eEcon.outputs ?? {}),
          levels: econLevelsFromSheet(cells as never),
          variant: econVariant as never,
          available: availableAtStep(account, surface).at,
          steps,
        }).steps.map(s => `${s.name}@${s.level}`)
      }
      return planEffectiveEconomyPath({
        onCandidateRoi: roiCollector,
        config: econConfigFromSheet(cells as never, account.tabs.eEcon.outputs ?? {}),
        levels: econLevelsFromSheet(cells as never),
        variant: 'time',
        steps,
      }).steps.map(s => `${s.name}@${s.level}`)
    }
    const variant = ({
      eDamage: 'lab-time', 'eDamage Stone': 'stone', 'eDamage Keys': 'keys', 'eDamage Coins': 'coin',
    } as Record<string, string>)[surface]
    return planEffectiveDamagePath({
      onCandidateRoi: roiCollector,
      config: configForSatellite(account, surface),
      levels: levelsForSatellite(account, surface),
      variant: variant as never,
      excludeIds: DRIVER_GATED[surface] ?? [],
      available: availableAtStep(account, surface).at,
      steps,
    }).steps.map(s => `${s.name}@${s.level}`)
  }

  /*
   * One `it` per surface rather than one for all six: a coin divergence and a
   * stone divergence are different findings, and a single failure list would
   * report whichever came first and hide the rest.
   */
  /**
   * The two surfaces still diverging, and exactly why.
   *
   * `it.fails` rather than a skip or a standing red: each passes BECAUSE the
   * comparison still diverges, and turns red the moment someone closes the gap
   * -- at which point it becomes a plain `it`. A skipped test would go quiet
   * instead, and quiet is how a gap becomes permanent.
   *
   * NINE of the eleven surfaces are exact on all 22 accounts. What closed the
   * four that were open here:
   *
   *   eEcon Discount  the harness was calling `planEffectiveEconomyPath`, which
   *                   throws and names `planEffectiveEconomyDiscountPath` in
   *                   the message. The port had the right function all along.
   *
   *   eRegen          two gaps, both in the harness/port seam.
   *                   `effectiveRegenConfigFromSheet` did not exist -- the
   *                   regen path shares eHP's whole input block through
   *                   `eRegen!AL3` = `={eHP!AL3:BM37}`, so it is a small
   *                   reader, it just had never been written. And
   *                   `planEffectiveRegenPath` did not accept `available`,
   *                   though `planPath` beneath it always has, so the planner
   *                   could not express a candidate the sheet had withdrawn.
   *
   *   eDamage Keys    the FIXTURE. `eDamage!BM8` and its ten siblings are
   *                   hand-typed literals left on the working copy, and
   *                   `eDamage Keys!BO5` is `=BM8/5%`, so the keys levels came
   *                   out fractional -- 0.73, 1.42. The sheet's own Damage gate
   *                   is `BO5=3`, an EQUALITY, which 0.73 steps straight past,
   *                   so the SHEET planned 33 purchases of a three-level vault
   *                   node. The capture now draws integer vault levels.
   *
   *   eEcon Stones    the three stone cooldown candidates were missing from
   *                   `GOLDEN_TOWER_GUARD_CANDIDATES`. Found by reading all
   *                   nineteen candidate formulas: exactly GT/BH/DW Cooldown
   *                   compare every weapon's duration against GOLDEN TOWER's
   *                   cooldown. That is why a shorter cooldown lifts the
   *                   overlap between weapons and not just one weapon's uptime.
   *
   * What is left, and why neither is a number to nudge:
   *
   *   eEcon Stones    ONE candidate, and it is measured rather than guessed.
   *
   *                   Comparing the port's `onCandidateRoi` against the
   *                   sheet's ROI band per candidate, every candidate on this
   *                   surface agrees to 1.00000000 except one:
   *
   *                     Wave Skip Mastery   0.90550474
   *                     everything else     1.00000000
   *
   *                   so the port under-values it by 9.45%, on 3 of 22
   *                   accounts, and prices the other eighteen exactly.
   *
   *                   `eEcon!AX36` is `(New/Old-1)/1000` with `Old = CU5*DR5`
   *                   — the Black Hole Digestor times the wave boost, two
   *                   columns multiplied, not the answer — and `New` the same
   *                   pair recomputed with the mastery unlocked at
   *                   `RIGHT($AX$29, 1)`. The port computes exactly that pair,
   *                   from `columns.CU5 * columns.DR5`.
   *
   *                   Ruled out, each by testing it rather than reasoning about
   *                   it: the horizon constant is 13 on both sides; forcing the
   *                   Wave Skip CARD on, which `EPC_WS_FUP(13, 1, ...)` appears
   *                   to do, changes nothing on an account where it is already
   *                   equipped and made the audit WORSE elsewhere (3 of 22 to
   *                   5); and the card level, mastery flag and mastery level
   *                   all match the arguments the sheet passes.
   *
   *                   Narrowed by decomposing the product:
   *
   *                     DR5 (the wave boost)      1.21445875
   *                     CU5 (Black Hole Digestor) 1.00188463
   *                     product                   1.216748
   *                     product the sheet needs   1.239367
   *
   *                   `WS_FUP` IS NOT THE CAUSE, and an earlier note here said
   *                   it was. `EPC_WS_FUP` picks column `1+card_lvl` without
   *                   the mastery and `9+mastery_lvl` with it, and summed over
   *                   the sheet's own `EP_HELPER` table that is
   *
   *                     card_lvl 1 -> mastery_lvl 0   ratio 1.144802
   *
   *                   which is the port's 1.145 to six figures. The 2.58x that
   *                   looked like the missing jump is `EPC_WSM`, a DIFFERENT
   *                   sum over the same table — `SEQUENCE(skips)` where
   *                   `EPC_WS_FUP` uses `SEQUENCE(skips, 1, 0)` — and its ratio
   *                   is 2.608914.
   *
   *                   The table itself is not the cause either. All 14 rows and
   *                   18 columns of `WAVE_SKIP_CHANCES` were compared against
   *                   `EP_HELPER!B2:S15` and every value matches.
   *
   *                   `WB = 6500/(WAm - IS - WSm)` was then measured rather
   *                   than reasoned about. Printing the port's own terms for
   *                   the divergent account, base row and mastery row:
   *
   *                     base  WAm 5909.0909  IS 0  ISd 0
   *                           WSm  584.415  k 0.098901  WB 1.220732
   *                     new   WAm 5909.0909  IS 0  ISd 0
   *                           WSm 1524.688  k 0.258024  WB 1.482528
   *
   *                   The base `WB` is the sheet's captured `DR5` to seven
   *                   figures, `WAm` and `ISd` do not move (nothing about this
   *                   mastery touches Wave Accelerator or Intro Sprint), and
   *                   both `k` are exact `EP_HELPER` columns — 0.098901 is
   *                   column `1+card_lvl` at card level 1, 0.258024 is column
   *                   `9+mastery_lvl` at mastery level 0. So `WSm` is picked
   *                   and scaled correctly.
   *
   *                   That closed the single-factor explanations, and the
   *                   cause turned out to be in the sheet. `eEcon!AX36` is the
   *                   ONLY mastery candidate whose `New` recomputes `BHDig` —
   *                   `AX38` and `AX41` open with `Old, DR5` and touch nothing
   *                   but the wave boost, and `AX32`/`AX34` are closed-form —
   *                   so it is the only one that calls `EPC_FUP` at all, and
   *                   the only one that could carry this. It feeds it the wrong
   *                   card row:
   *
   *                     base CU5     EPC_FUP($BJ$6, $AZ$33, $AW$33, ...)
   *                     AX36 New     EPC_FUP($BJ$6, $AZ$35, $AW$35, ...)
   *
   *                   Row 33 is Free Upgrades (value 0.04); row 35 is Wave
   *                   Skip (value 0.09). `EPC_FUP` is the FREE UPGRADE chance,
   *                   so row 33 is the correct argument and the base row uses
   *                   it. Whoever hand-wrote the `AX36` candidate rewrote 33 to
   *                   35 along with the Wave Skip references that genuinely do
   *                   belong to this mastery.
   *
   *                   `EPC_FUP` is
   *                   `(WS + CARD + PERK + SUBSTAT) * WSE * RELIC * VAULT`, so
   *                   `card_val` is ADDITIVE — an earlier version of this note
   *                   said "linear, so it scales FreeUP by 2.25", which is the
   *                   wrong reason. It is affine, and proportional only because
   *                   every other term is zero on these accounts: FreeUP_base =
   *                   3 x 0.04 x dig = 0.012 gives dig = 0.1, and 3 x 0.09 x
   *                   0.1 = 0.027, against the 0.026999 the gap required before
   *                   the formula was read.
   *
   *                   The oracle rules out the charitable reading. `EPC_FUP`'s
   *                   first parameter is `ws_val` = the WORKSHOP value ($BJ$6-8
   *                   against rows 9-11, "Free Attack/Defense/Utility
   *                   Upgrade"), matching "three separate chances from the
   *                   workshop, capped at 90.75% with card and perk". Wave
   *                   Skip's genuine interaction with free upgrades is EXTRA
   *                   ROLLS per skipped wave — which the separate `WSf` factor
   *                   already models. Feeding its skip chance into the CHANCE
   *                   too is both double-counting and a category error.
   *
   *                   None of which has to be argued, because the sheet answers
   *                   it directly. `scripts/effective-paths/probe-mastery-freeup-row.mjs`
   *                   holds every other input fixed and moves the two card
   *                   values, snapshotting and restoring in a `finally`:
   *
   *                     AW33   AW35    CU5           AX36
   *                     0.04   0.04    1.095604387   2.298e-4
   *                     0.04   0.09    1.095604387   2.507e-4   (live)
   *                     0.50   0.09    1.247252725   9.865e-5
   *                     0.04   0.50    1.095604387   4.222e-4
   *
   *                   `CU5` moves only with Free Upgrades; `AX36`'s `New` moves
   *                   only with Wave Skip; `DR5` never moves at all, so `AW35`
   *                   does not reach the wave-skip machinery (that takes
   *                   `AV35`, the LEVEL) and `EPC_FUP` is its only route in. A
   *                   self-consistent ratio cannot have `Old` sensitive to a
   *                   term `New` ignores. Equalising the two cards gives
   *                   2.298e-4 against the live 2.507e-4 — 9.1% overstated,
   *                   which is the 9.45% measured from the other end.
   *
   *                   And it is not an artifact of our working copy: the
   *                   CANONICAL workbook's `AX36` and `CU5` are byte-identical
   *                   to the copy's, row 35 and row 33 respectively.
   *
   *                   THE PORT IS RIGHT AND THE SHEET IS WRONG, so this is left
   *                   as a recorded divergence rather than shadowed into parity.
   *                   Reproducing it would mean shipping a knowingly bad number
   *                   to players. Do not "fix" the port to match `AX36`.
   */
  const UNDRIVEN = new Set(['eEcon Stones'])

  for (const surface of [...PLANNERS, ...SATELLITES]) {
    const testFor = UNDRIVEN.has(surface) ? it.fails : it
    testFor(`plans the ${surface} path the sheet plans`, { timeout: 120_000 }, () => {
      const failures: string[] = []
      let skipped = 0
      for (const account of SWEEP.states) {
        const raw = account.tabs[surface].path ?? []
        /*
         * The sheet saying it cannot plan is not a path.
         *
         * `eHP Stone` prints "Not seeing path? Make sure you enabled and
         * equipped relevant assist mods." in the name column when the account
         * has no assist module, and on this copy that is a property of the
         * DRIVER -- `AO5` is `='_IDS'!BL2` and there is no import behind it, so
         * the capture rolls it rather than the player having chosen. Comparing
         * a plan against an apology is not a parity check.
         *
         * Skipped, and COUNTED: an account dropped in silence is how a sweep
         * comes to report agreement it never tested.
         */
        if (raw.length === 1 && /Not seeing path/i.test(String(raw[0]?.name ?? ''))) {
          skipped += 1
          continue
        }
        /*
         * A mastery step on `eEcon Stones` has NO level to compare against.
         *
         * `eEcon Stones!D6` prints `"lvl " & RIGHT($AX$29, 1)` for any
         * candidate whose NAME contains "Mastery" -- `AX29` being the tab's
         * "Compare Masteries at" setting -- so every mastery step on this copy
         * reads `lvl 0` whatever the account's level is, and `sheet-13`, whose
         * `AX29` is 4, prints `Coins Mastery@lvl 4` for the same reason.
         *
         * Comparing the port's level against that compares it against a
         * constant. The NAME is still compared, so a mis-ranked mastery still
         * fails; only the field the sheet does not fill is dropped.
         */
        /*
         * Two fields the sheet leaves empty and this comparison must not read.
         *
         * `eEcon Stones` prints `"lvl " & RIGHT($AX$29, 1)` for any candidate
         * whose NAME contains "Mastery" — the tab's "Compare Masteries at"
         * setting, so `lvl 0` here and `lvl 4` on sheet-13 whatever the
         * account's level.
         *
         * `eDamage Keys` prints NOTHING for UW Damage: its level is null on all
         * 60 occurrences across all 22 accounts, and the harness reads that as
         * `@0` while the port reports the level it bought.
         *
         * The NAME is still compared in both cases, so a mis-ranked candidate
         * still fails; only the field the sheet does not fill is dropped.
         */
        const levelless = (name: string) =>
          (surface === 'eEcon Stones' && /Mastery/.test(name))
          || (surface === 'eDamage Keys' && name === 'UW Damage')
        const theirs = raw.map(s => (levelless(String(s.name))
          ? String(s.name)
          : `${s.name}@${sheetLevel(s.level)}`))
        let ours: string[]
        try {
          ours = ourPath(account, surface, theirs.length)
        } catch (err) {
          failures.push(`${account.id}: port threw — ${(err as Error).message}`)
          continue
        }
        ours = ours.map(step => (levelless(step.split('@')[0]) ? step.split('@')[0] : step))
        if (ours.length !== theirs.length) {
          failures.push(`${account.id}: ${ours.length} steps vs the sheet's ${theirs.length}`)
          continue
        }
        // The FIRST divergence is the diagnosis; everything after it is
        // downstream of a different board and says nothing on its own.
        const at = ours.findIndex((step, i) => step !== theirs[i])
        if (at >= 0) failures.push(`${account.id}: step ${at + 1} — port ${ours[at]}, sheet ${theirs[at]}`)
      }
      expect(failures).toEqual([])
      // Never all of them: a surface where every account was skipped has been
      // reported as passing while comparing nothing at all.
      expect(skipped, `${surface}: every account was skipped`)
        .toBeLessThan(SWEEP.states.length)
    })
  }

  /**
   * The same all-pairs comparison, on ROI, across ALL ELEVEN tabs.
   *
   * The gain-based ranking above covers the four eDamage tabs, because they are
   * the only ones whose ROI columns state `<value>/<base>-1` outright. The other
   * seven build the new value inline inside a LET, so there is no cell to read
   * and the per-candidate audit says so: "at most 0 candidate(s) live on both
   * sides; 2 are needed for a scale". `eHP Stone`, `eHP Coins` and
   * `eEcon Discount` had never been compared against anything.
   *
   * The ROI ITSELF is always a cell. And a peer ratio of two ROIs is the right
   * thing to check anyway: the path takes the largest ROI, so `roiA/roiB` is
   * exactly what decides a step -- gain AND cost, which the gain ranking cannot
   * see.
   */
  it('ranks every candidate on every tab the way the sheet ranks it', { timeout: 240_000 }, () => {
    const SURFACES = [
      'eHP', 'eHP Stone', 'eHP Coins', 'eRegen', 'eEcon', 'eEcon Stones',
      'eEcon Discount', 'eDamage', 'eDamage Coins', 'eDamage Stone', 'eDamage Keys',
    ]
    const offenders = new Map<string, { n: number, worst: number, example: string }>()
    const seen = new Map<string, number>()
    /** Surfaces whose scale was checked against the tab's own answer cell. */
    const anchored = new Map<string, number>()
    const unanchored = new Set<string>()
    const anchorRatio = new Map<string, number[]>()
    const offScale: string[] = []
    let compared = 0

    for (const account of SWEEP.states) {
      for (const surface of SURFACES) {
        const rois = ORACLE.accounts[account.id]?.[surface]?.rois
        if (!rois) continue
        const mine = new Map<string, number>()
        roiCollector = e => { if (e.step === 1) mine.set(e.name, e.roi) }
        try { ourPath(account, surface, 1) }
        catch { continue }
        finally { roiCollector = undefined }
        const peers: { name: string, ours: number, theirs: number }[] = []
        for (const [name, theirs] of Object.entries(rois)) {
          const ours = mine.get(name)
          if (typeof theirs !== 'number' || ours === undefined) continue
          // A zero on either side is not a ratio, and a negative ROI is the
          // sheet's own sign convention rather than a peer of a positive one.
          if (theirs <= 0 || ours <= 0) continue
          peers.push({ name, ours, theirs })
        }
        seen.set(surface, Math.max(seen.get(surface) ?? 0, peers.length))
        /*
         * A LONE candidate can still be checked, and on three tabs it is the
         * only thing there is.
         *
         * `eHP Stone`, `eHP Coins` and `eEcon Discount` never have two live
         * candidates at once for these accounts, so no peer ratio exists and
         * all-pairs skips them entirely. But `ours/theirs` for one candidate
         * must still be the SAME NUMBER on every account: the tabs scale their
         * ROI columns by a constant, and a constant cannot change a ranking. A
         * ratio that MOVES with the account is a real difference, whatever the
         * scale is.
         */
        /*
         * THE SCALE IS THE TAB'S ANSWER, and that is checkable with ONE
         * candidate.
         *
         * `theirs` is the sheet's ROI, whose gain is RELATIVE; `ours` is the
         * port's, whose gain is absolute. So `ours/theirs` is the tab's base,
         * and it comes out as the answer cell to every digit:
         *
         *   account-0 eDamage   ours/theirs 5.681641e+15   ES5 5.681641e+15
         *
         * That matters because three tabs never have two live candidates at
         * once -- `eHP Stone`, `eHP Coins`, `eEcon Discount` -- so all-pairs
         * skips them entirely and they were never checked by anything. This
         * needs no peer: one candidate, one answer cell, one ratio.
         */
        const cells = ORACLE.accounts[account.id]?.[surface] ?? {}
        /*
         * THE tab's answer cell, by name, not "the first numeric one".
         *
         * `ORACLE.cells[tab]` lists the answer first and any extra bases after
         * it -- `eDamage Coins` is `["EC5", "ET5"]`. Taking whichever happened
         * to be numeric picked `EC5` on some accounts and `ET5` on others, and
         * `ET5/EC5` is not a constant: that alone produced a clean x6.000000000
         * "drift" across every coin candidate at once, which is what a wrong
         * denominator looks like when every candidate shares it.
         */
        const answerRef = (ORACLE.cells[surface] ?? [])[0]
        const answerCell = answerRef ? (cells as Record<string, unknown>)[answerRef] : undefined
        const answers = typeof answerCell === 'number' && answerCell > 0 ? [answerCell] : []
        for (const p of peers) {
          const scale = p.ours / p.theirs
          if (!answers.length) { unanchored.add(surface); continue }
          anchored.set(surface, (anchored.get(surface) ?? 0) + 1)
          /*
           * Against the tab's ANSWER, up to the tab's own constant.
           *
           * On `eDamage` the two are equal outright. On `eDamage Coins` the
           * ROI column carries `*$EF$3` and other fixed scaling, so the ratio
           * is a per-tab constant instead of 1. Either way a CONSTANT cannot
           * change a ranking, and a ratio that MOVES is a real difference --
           * so what is asserted is that it holds still, not that it is one.
           */
          const answer = answers[0]
          const key = `${surface} :: ${p.name}`
          anchorRatio.set(key, [...(anchorRatio.get(key) ?? []), scale / answer])
        }
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
                hit.example = `${account.id} vs ${other.name}`
              }
              offenders.set(key, hit)
            }
          }
        }
      }
    }

    const material = [...offenders].filter(([, v]) => Math.abs(v.worst - 1) > 1e-3)
    material.sort((a, b) => b[1].n - a[1].n)
    console.log([
      '',
      `ROI RANKING: ${compared} comparisons across ${seen.size} tab(s), ${material.length} material`,
      ...[...seen].map(([tab, n]) => `  ${tab.padEnd(16)} ${n} comparable candidate(s)`),
      ...material.slice(0, 24).map(([k, v]) =>
        `  ${String(v.n).padStart(4)}x  ${k.padEnd(44)} worst ${v.worst.toFixed(6)}  ${v.example}`),
      '',
    ].join(NEWLINE))

    /*
     * ODD ONES OUT, by the same rule the gain ranking uses: all-pairs counts
     * BOTH sides, so one wrong candidate makes its whole tab look wrong. The
     * culprit disagrees with most of its peers; a bystander only with it.
     */
    const perSurface = new Map<string, number>()
    for (const [key] of offenders) {
      const tab = key.split(' :: ')[0]
      perSurface.set(tab, (perSurface.get(tab) ?? 0) + 1)
    }
    const oddOnes = material.filter(([key, v]) => {
      const tab = key.split(' :: ')[0]
      const busiest = Math.max(...material.filter(([k]) => k.startsWith(`${tab} ::`)).map(([, x]) => x.n))
      return (perSurface.get(tab) ?? 1) > 1 ? v.n === busiest : true
    })

    /*
     * The tabs whose BASE the port does not share, and only those.
     *
     * `pnpm epaths:seam` classifies `Base | eDamage Coins` as a SEAM:
     * 0.245193093 as captured, 1.000000000 once the fixture's frozen player
     * block is restored. The port models eDamage's composition, so on those
     * tabs its base is legitimately not the sheet's, and `ours/theirs` carries
     * exactly that difference. `eEcon Discount` is a six-answer tab with no
     * single base to anchor to at all.
     *
     * Everywhere else the anchor holds EXACTLY, so it is asserted.
     */
    const SEAMED_BASE = new Set([
      // `docs/effective-paths/tab-seam.baseline.json`: `Base|eDamage Coins` and
      // `Base|eDamage Keys` are both `seam`. `eHP Coins` records no answer cell
      // on most accounts (`CN5` is #N/A there) and `eEcon Discount` has six
      // answers and no single base to anchor to.
      'eDamage Coins', 'eDamage Keys', 'eHP Coins', 'eEcon Discount',
    ])
    /*
     * The sheet's own defect, already pinned by name in the odd-one-out
     * assertion above and reappearing here for the same reason.
     */
    const KNOWN_SHEET_DEFECT = 'eEcon Stones :: Wave Skip Mastery'
    for (const [key, xs] of anchorRatio) {
      if (xs.length < 2) continue
      if (SEAMED_BASE.has(key.split(' :: ')[0]) || key === KNOWN_SHEET_DEFECT) continue
      const lo = Math.min(...xs)
      const hi = Math.max(...xs)
      /*
       * 1e-5, and the two cells that need the room say why.
       *
       * `eDamage :: Death Wave Damage Amplifier` moves by 2e-9 and
       * `eDamage Stone :: DW Cooldown` by 1.5e-6. DW Cooldown's gain is
       * 9.92e-10, the smallest on any tab, so `(1+g)/g` turns half a machine
       * epsilon into a micro-scale ratio -- the same amplification the peer
       * ranking's `state` column exists to expose. A base error is a base
       * error: it does not arrive at 1e-6.
       */
      if (lo > 0 && hi / lo > 1 + 1e-5) {
        offScale.push(`${key} scale/answer moves ${lo.toExponential(6)}..${hi.toExponential(6)}`
          + ` (x${(hi / lo).toFixed(9)}) over ${xs.length} account(s)`)
      }
    }
    console.log([
      `SCALE ANCHOR: ${[...anchored].reduce((n, [, v]) => n + v, 0)} candidate/account pair(s)`
        + ` checked against their tab's own answer cell, ${offScale.length} drifting`,
      ...[...anchored].map(([tab, n]) => `  ${tab.padEnd(16)} ${n}`),
      ...(unanchored.size ? [`  no answer cell recorded: ${[...unanchored].join(', ')}`] : []),
      ...offScale.slice(0, 10).map(x => `  OFF  ${x}`),
      '',
    ].join(NEWLINE))

    expect(compared).toBeGreaterThan(500)
    // Every tab that has two comparable candidates is now compared. Recorded so
    // a tab going quiet -- a driver that stops responding, a band that stops
    // being read -- fails here instead of passing silently.
    expect([...seen].filter(([, n]) => n >= 2).length).toBeGreaterThanOrEqual(8)

    /*
     * ONE, and it is the sheet's own defect rather than the port's.
     *
     * `eEcon!AX36` prices Wave Skip Mastery off the WRONG CARD -- `$AZ$35,
     * $AW$35` (Wave Skip, 0.09) where the base column uses Workshop Upgrades,
     * 0.04 -- so the sheet over-values it by 9.45% on 3 of 22 accounts. It is
     * write-tested on the live sheet and verified against canonical; see the
     * note on `names every candidate the port prices differently` and
     * `docs/EFFECTIVE_PATHS_SHEET_FINDINGS.md`.
     *
     * The ROI ranking rediscovers it independently and lands on the same
     * number to six digits -- 0.905505 here against the audit's 0.90550474 --
     * which is the best evidence available that the two measurements agree
     * about what they are measuring.
     *
     * Pinned by NAME, not by count. A second offender fails this even if this
     * one goes away.
     */
    expect(oddOnes.map(([k]) => k)).toEqual(['eEcon Stones :: Wave Skip Mastery'])

    /*
     * SCALE ANCHOR: reported, deliberately NOT asserted yet.
     *
     * `theirs` is the sheet's ROI, whose gain is RELATIVE; `ours` is the
     * port's, whose gain is absolute. So `ours/theirs` is the tab's base, and
     * on `eDamage` it comes out as the answer cell to every digit:
     *
     *   account-0   ours/theirs 5.681641e+15   ES5 5.681641e+15
     *
     * That would be an absolute check needing NO peer, which is exactly what
     * `eHP Stone`, `eHP Coins` and `eEcon Discount` lack -- they never have two
     * live candidates at once, so all-pairs skips them entirely.
     *
     * It does not hold uniformly, and the failures are not defects. Every
     * `eDamage Coins` candidate's ratio moves by EXACTLY x6.000000000 across
     * accounts, all of them together: that is a per-account, per-tab constant
     * -- `$EF$3` and its siblings -- and a factor every candidate on a tab
     * shares cannot change which one wins. `eEcon Discount` moves 0.51..0.995
     * the same way.
     *
     * IT IS NOT A SCALE CONSTANT, and that was worth finding out. `$EF$3` is
     * 1e9 on every one of the 22 accounts, so it cannot produce a x6 spread,
     * and picking the answer cell by NAME rather than "the first numeric one"
     * did not move the number either.
     *
     * Working it through: `ours` is gain_abs/price and `theirs` is
     * gain_rel/cost*1e9, so `ours/theirs/answer` is `cost/price/1e9` -- **the
     * sheet's cost over the port's price.** On `eDamage`, `eHP`, `eEcon` and
     * `eEcon Stones` it is exactly 1: the port's price IS the sheet's cost. On
     * the two coin tabs it moves 2.02..12.13, and the sheet's own costs are
     * account-INDEPENDENT there (`Critical Chance Mastery` is 1.3e6 on every
     * account), so it is the PORT's coin price that varies.
     *
     * And the port's coin PRICE is not the problem. Measured against the
     * sheet's own cost, recovered as `gain/roi*1e9`, it is 1.000000 on every
     * account and every candidate: `Critical Factor +` is 4.3890e13 on both
     * sides, `Super Crit Mult +` 6.5300e9, `Cash Bonus +` 5.0000e9.
     *
     * It is the BASE. `pnpm epaths:seam` classifies `Base | eDamage Coins` as
     * a SEAM -- 0.245193093 as captured, 1.000000000 once the fixture's frozen
     * player block is restored -- and the port models eDamage's composition, so
     * `ours/theirs` carries that and nothing else. The same two-player fixture,
     * one more time, in one more place.
     *
     * So the anchor IS asserted, everywhere the base is shared.
     */
    expect(anchored.size).toBeGreaterThanOrEqual(6)
    expect(offScale).toEqual([])
  })

  it('names every candidate the port prices differently', () => {
    /*
     * THE CLOSED LIST, and the reason the rest of this file could never
     * produce it.
     *
     * A path comparison reports the FIRST divergent step and stops, so ONE
     * mis-priced candidate hides every other on that surface. That is why every
     * round of this work looked like a short list that kept growing: Spotlight
     * on the keys band, the Golden Tower cooldown guard on the stone band, the
     * local ladder on eDamage Coins, the Wave Skip card on eEcon — each found
     * alone, each looking like the last one.
     *
     * They were samples. `scripts/effective-paths/candidate-vs-base-columns.mjs`
     * counts the population: the sheet has 157 hand-written candidate columns
     * freezing 1,670 base-row references between them, because each column
     * rebuilds only the terms its own upgrade moves and reads the rest off the
     * base row. The port recomputes everything, so any input that also feeds a
     * frozen term diverges.
     *
     * Reachability narrows that to 253 pairs and OVER-reports — `eDamage
     * Keys!CE5` reads `CY5`, which reads onward, so transitively almost
     * everything reaches everything. An upper bound is not a work list.
     *
     * So measure. The sheet's ROI band IS the frozen valuation; the port's
     * `onCandidateRoi` IS the recomputed one. Compared as ratios against each
     * surface's median, because the two are in different units and differ by a
     * constant per surface — comparing them raw flags all of them and means
     * nothing.
     *
     * Reported, not asserted, beyond the guard that it measured anything at
     * all. The point is a list that shrinks, not another red test.
     */
    /*
     * WHAT THIS CURRENTLY REPORTS, and what has been ruled out for each.
     *
     * Three env vars, in increasing narrowness, because each one was needed to
     * get past a wrong guess about the tier below it:
     *
     *   EPATHS_RATIOS=1              the offending ratios, not just the names
     *   EPATHS_PAIRS="<surface>"     every pair on that surface for account-0,
     *                                sorted by ratio, with the median scale
     *   EPATHS_PAIRS + EPATHS_ONE    one candidate across all accounts, with
     *                                the planner's own nextLevel/gain/price
     *
     * Printing ratios rather than a verdict is what showed the 1e-6 tolerance
     * was an artefact; printing gain and price separately is what showed the
     * `Assist Module Substats - Cannon` cost was exact and the gain was not.
     * They separate these tiers:
     *
     *   eDamage Coins  Assist Module Substats - Cannon   20/22
     *     Localised to one term, and then deliberately NOT fixed. Ruled out by
     *     measurement: the level matches the coin band (23 -> nextLevel 24),
     *     and the cost matches exactly — the sheet's
     *     `LABCOST_SINGLE_ADJUSTED("Assist Module Substats - Cannon", L)` is
     *     2.5e17*(L+1), read off the live sheet, which is the port's
     *     2.5e17*nextLevel. So the whole 5.83% (account-0) is in the GAIN.
     *
     *     `eDamage Coins!DL5`, the base column for Max Rend Armor Multiplier,
     *     is `EPG_ASSIST_SUB_CAP($AN$4, $BL$42, CJ5)` — `CJ5` is Assist Module
     *     BONUS - Cannon. Every other base column on that tab passes `CG5`,
     *     SUBSTATS - Cannon, and all twenty-two on `eDamage` pass `CO5`. The
     *     candidate `ET5` rebuilds the cap from `CG5+1`, so the sheet moves
     *     that term by `(CG5+1-CJ5)/100` where a consistent model moves it by
     *     0.01 — positive on some accounts, NEGATIVE on others, which is
     *     exactly the two-sided 0.808..1.421 spread.
     *
     *     It predicts its own exception and lands it: the two expressions
     *     coincide iff `CJ5 = CG5`, and of the twenty-one accounts that offer
     *     the candidate (account-2 sits at the cap of 30 and offers nothing),
     *     the single one that agrees is account-8 — the only one with
     *     `CJ5 = CG5 = 22`.
     *
     *     AND YET. Shadowing the base to match `DL5` takes this surface to 0
     *     disagree here and breaks 1,084 comparisons in
     *     `effective-paths-edamage-coin-sweep.test.ts`, which checks the port's
     *     ratio ABSOLUTELY rather than against a median, to bounds as tight as
     *     1e-9. That test is independent and pre-existing.
     *
     *     BOTH open questions are now answered, and the answer is not the one
     *     above. The evaluator's dependency graph settles the first: `EC5` DOES
     *     reach `DL5`, in two steps, through `DM5`. And `DL5` depends on `CJ5`
     *     and NOT on `CG5` — asked of the graph rather than read off a formula,
     *     which is why it could not be settled before.
     *
     *     The second is settled by the relative-gain comparison above, and it
     *     refutes the Max Rend story: the port's gain is low on all 21
     *     accounts, where that story requires it to run high on the eight with
     *     `CJ5 > CG5+1`. The real difference is that the port has ONE damage
     *     model and the coin tab computes its own composition — different base,
     *     extra Core substat terms — and for this candidate that does not
     *     cancel out of the ratio. Modelling the coin tab's own composition is
     *     the fix; shadowing Max Rend is not.
     *
     *   eDamage Keys   UW Damage                          11/22
     *       1.0011 1.0019 1.0023 1.0023 1.0038 1.0041 1.0060 1.0061
     *       1.0107 1.0115 1.1772
     *     Ten sit just over the 1e-3 tolerance and one does not. Note the
     *     RETRACTED claim about this candidate recorded elsewhere in this file:
     *     the sheet's key cost was inferred from its neighbours rather than
     *     read, and reading it showed no `POW(2, …)`. Do not re-derive it.
     *
     *   eEcon Stones   Wave Skip Mastery                   3/22
     *       0.906 0.912 0.968
     *     EXPLAINED and not a port defect — `eEcon!AX36`/`EF` feed `EPC_FUP`
     *     the Wave Skip card where the base row feeds the Free Upgrades card.
     *     See docs/EFFECTIVE_PATHS_SHEET_FINDINGS.md.
     *
     *   three singletons at 1.0011, 1.0016 and 1.0027 — one account each,
     *     barely over tolerance, and not yet distinguished from rounding.
     *
     * Three surfaces still cannot be priced, and the reason is NOT the one an
     * earlier version of this note gave. It said four surfaces lacked
     * `onCandidateRoi`. `eRegen` did, and now has one and prices clean. The
     * other three have the hook and still cannot be measured, because fewer
     * than two of their candidates are live on both sides at once:
     *
     *   eHP Stone       0 pairs — the sheet's one surviving candidate is at
     *                   ROI 0, which the pair filter drops as non-positive
     *   eHP Coins       1 pair
     *   eEcon Discount  1 pair — five of six are retroactive and hidden by
     *                   default on both sides
     *
     * A single pair normalises to exactly 1 against its own median, so such a
     * surface can never flag anything. That is a limit of this measurement, not
     * evidence of agreement, and the summary now says so rather than blaming
     * the wiring.
     */
    const summary: string[] = []
    let disagreeing = 0
    let priced = 0

    for (const surface of [...PLANNERS, ...SATELLITES]) {
      const offenders = new Map<string, number>()
      let seen = 0
      let pairCount = 0

      /*
       * The scale is per ACCOUNT, and an attempt to pool it across accounts was
       * wrong — recorded because it looks reasonable and the data killed it in
       * one run.
       *
       * The pooled version was meant to rescue three surfaces that never have
       * two comparable candidates in a single account: `eEcon Discount` hides
       * five of six as retroactive by default and `eHP Stone` hides two of
       * three, so exactly one is live on both sides, and a one-pair account
       * cannot yield a median. The argument was that a scale belongs to the
       * surface, so twenty-two accounts giving one ratio each determine it as
       * well as one account giving twenty-two.
       *
       * It does not. Pooling produced surface scales of 1.7e15, 4.0e13 and
       * 0.000000, and turned four clean surfaces into 9, 13, 21 and 19
       * disagreements. The scale moves with the ACCOUNT — the ROI denominators
       * carry that account's lab modifiers — so a pooled median is a median
       * over incomparable quantities.
       *
       * A surface with one live candidate per account is therefore not
       * measurable this way at all: its per-account median IS its only ratio,
       * so it normalises to exactly 1 and can never flag. Saying so is the
       * honest report; the old message blamed a missing `onCandidateRoi`, which
       * for two of the three was not even true.
       */
      for (const account of SWEEP.states) {
        const sheet = account.tabs[surface]?.roiByStep?.[0]
        if (!sheet) continue
        const mine = new Map<string, number>()
        roiCollector = e => {
          if (e.step !== 1) return
          mine.set(e.name, e.roi)
          if (process.env.EPATHS_ONE && e.name === process.env.EPATHS_ONE && surface === process.env.EPATHS_PAIRS) {
            const raw = (sheet as Record<string, unknown>)[e.name]
            const x = e as unknown as Record<string, number>
            console.log(`ONE ${account.id} ${surface} | ${e.name} | nextLevel=${x.nextLevel} `
              + `gain=${x.gain} price=${x.price} roi=${e.roi} sheet=${String(raw)}`)
          }
        }
        try { ourPath(account, surface, 1) } catch { /* reported elsewhere */ }
        roiCollector = undefined

        const pairs: { name: string, a: number, b: number }[] = []
        for (const [name, raw] of Object.entries(sheet)) {
          const theirs = typeof raw === 'number' ? raw : Number.NaN
          const ours = mine.get(name)
          if (!Number.isFinite(theirs) || theirs <= 0) continue
          if (ours === undefined || !Number.isFinite(ours) || ours <= 0) continue
          pairs.push({ name, a: ours, b: theirs })
        }
        if (process.env.EPATHS_PAIRS === surface && account === SWEEP.states[0]) {
          const sheetNames = Object.keys(sheet)
          console.log(`PAIRS ${surface} account-0`)
          const rs = pairs.map(p2 => p2.a / p2.b).sort((x, y) => x - y)
          const sc = rs[Math.floor(rs.length / 2)]
          for (const p2 of pairs.slice().sort((x, y) => (x.a / x.b) - (y.a / y.b))) {
            console.log(`   ${p2.name.padEnd(36)} ratio=${(p2.a / p2.b).toExponential(6)} norm=${(p2.a / p2.b / sc).toFixed(6)}`)
          }
          console.log(`   scale=${sc.toExponential(6)}  (${pairs.length} pairs)`)
          void sheetNames
        }
        pairCount = Math.max(pairCount, pairs.length)
        if (pairs.length < 2) continue
        seen += 1
        const scales = pairs.map(p => p.a / p.b).sort((x, y) => x - y)
        const scale = scales[Math.floor(scales.length / 2)]
        for (const p of pairs) {
          if (Math.abs(p.a / p.b / scale - 1) > 1e-3) {
            offenders.set(p.name, (offenders.get(p.name) ?? 0) + 1)
            if (process.env.EPATHS_RATIOS) {
              console.log(`RATIO ${surface} | ${p.name} | ours=${p.a} sheet=${p.b} `
                + `raw=${(p.a / p.b).toFixed(6)} normalised=${(p.a / p.b / scale).toFixed(6)} scale=${scale.toFixed(6)}`)
            }
          }
        }
      }

      if (seen === 0) {
        const band = SWEEP.states.some(a2 => a2.tabs[surface]?.roiByStep?.[0])
        summary.push(`  ${surface.padEnd(15)} ${band
          ? `at most ${pairCount} candidate(s) live on both sides; 2 are needed for a scale`
          : 'NO ROI RANGE IN THE CAPTURE'}`)
        continue
      }

      priced += 1
      disagreeing += offenders.size
      const listed = [...offenders.entries()].sort((x, y) => y[1] - x[1])
        .map(([name, n]) => `${name} (${n}/${seen})`)
      summary.push(`  ${surface.padEnd(15)} ${offenders.size} disagree  [${seen} account(s)]`
        + (listed.length ? `\n      ${listed.join('\n      ')}` : ''))
    }

    console.log('\nCANDIDATES PRICED DIFFERENTLY FROM THE SHEET\n')
    console.log(summary.join('\n'))
    console.log(`\n${disagreeing} candidate/surface pairs disagree across ${priced} priced surfaces.`)

    // The guard on the measurement: a run that priced nothing would print an
    // empty report and read as "everything agrees".
    expect(priced).toBeGreaterThan(3)
  })

  it('varies the whole account, not one tab of it', () => {
    /*
     * The property the per-tab fixtures cannot have. In those, four-fifths of
     * every account sits at the baseline, so a tab that misreads a shared input
     * cannot fail -- the value never moves there.
     *
     * Every planner must see real variation across the population. A tab whose
     * answers are all equal is not a passing tab, it is a tab nothing reached.
     */
    for (const tab of PLANNERS) {
      const answers = new Set(SWEEP.states.map(a => String(a.tabs[tab].answer)))
      expect(answers.size, `${tab} answers`).toBe(SWEEP.states.length)
    }
    // And the satellites, which mirror eDamage, must plan differently from each
    // other — three identical paths would mean the cost difference never landed.
    for (const account of SWEEP.states) {
      const shapes = new Set(SATELLITES.map(s =>
        JSON.stringify(account.tabs[s].path?.slice(0, 5).map(p => p.name))))
      expect(shapes.size, `${account.id} satellites all planned alike`).toBeGreaterThan(1)
    }
  })
})
