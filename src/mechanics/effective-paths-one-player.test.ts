import { describe, expect, it } from 'vitest'
import eecon from '../../fixtures/mechanics/effective-paths-eecon-sweep.fixtures.json'
import ehp from '../../fixtures/mechanics/effective-paths-ehp-sweep.fixtures.json'

/**
 * Is `account-7` on eHP the same player as `account-7` on eEcon?
 *
 * It is not, and that is what this file records.
 *
 * Effective Paths answers one question — what should I buy next — and splits
 * the answer by the RESOURCE a purchase consumes: research time, coins, stone,
 * keys, discount. The objectives (eHP, eDamage, eEcon) are three views of ONE
 * account. A player does not have a health account and a separate economy
 * account.
 *
 * The captures do not work that way. Each script pins a single tab
 * (`const T = 'eHP'`), draws only the cells that tab reads, and restores. So a
 * sweep account is randomised on one tab and left at the sheet's baseline on
 * the other four. Every planner is therefore measured against a player whose
 * other four-fifths never move.
 *
 * That is this repository's recurring defect wearing a different hat: an input
 * the model supports, that the fixture never varies, and that nothing reports.
 * A bug where eEcon misreads a card eHP reads correctly cannot fail a sweep,
 * because on the eEcon fixture that card is constant.
 *
 * The satellites are already right, and show what right looks like: they hold
 * no inputs of their own, mirror `eDamage`, and are captured from the same
 * seeded generator, so `account-7` on `eDamage Stone` IS `account-7` on
 * `eDamage`. Only the three PLANNER tabs are drawn independently.
 *
 * ## Why `it.fails`
 *
 * The gap is real and unfixed, and a red suite is not allowed to be the way it
 * is remembered — a standing red test stops being read. `it.fails` passes while
 * the fixtures disagree and FAILS the moment a unified capture makes them
 * agree, which is the point at which this becomes a plain `it` and the
 * assertion below starts guarding the invariant instead of recording its
 * absence.
 */

interface Sweep {
  baseCells: Record<string, unknown>
  states: { id: string; cellDiff: Record<string, unknown> }[]
}

/** Each planner tab's lab block, read off the same columns the captures write. */
const EHP = { sweep: ehp as unknown as Sweep, name: 'BB', level: 'BC' }
const ECON = { sweep: eecon as unknown as Sweep, name: 'BD', level: 'BE' }
const ROWS = 40
const FIRST_ROW = 5

/** `labName -> row`, for one tab. */
function rowsByName(block: typeof EHP): Map<string, number> {
  const out = new Map<string, number>()
  const cells = block.sweep.baseCells
  for (let row = FIRST_ROW; row < FIRST_ROW + ROWS; row += 1) {
    const name = cells[`${block.name}${row}`]
    if (typeof name === 'string' && name.trim()) out.set(name.trim(), row)
  }
  return out
}

/** That account's level for that row, falling back to the tab's baseline. */
function levelAt(block: typeof EHP, id: string, row: number): number | null {
  const state = block.sweep.states.find(s => s.id === id)
  if (!state) return null
  const ref = `${block.level}${row}`
  const raw = ref in state.cellDiff ? state.cellDiff[ref] : block.sweep.baseCells[ref]
  return typeof raw === 'number' ? raw : null
}

describe('one account, every path', () => {
  const ehpRows = rowsByName(EHP)
  const econRows = rowsByName(ECON)
  const shared = [...ehpRows.keys()].filter(n => econRows.has(n))
  const ids = ehp.states
    .map(s => s.id)
    .filter(id => eecon.states.some(s => s.id === id))

  it('found labs and accounts the two tabs have in common', () => {
    // Guards the guard. With no shared lab or no shared id, the check below
    // would pass on an empty list and report agreement that was never tested.
    expect(shared).toEqual(['Standard Perks Bonus', 'Assist Module Substats - Generator'])
    expect(ids.length).toBeGreaterThan(50)
  })

  it.fails('gives a lab the same level on every tab that names it', () => {
    // Named, never counted — the disagreement IS the diagnosis.
    const disagreements: string[] = []
    for (const name of shared) {
      for (const id of ids) {
        const a = levelAt(EHP, id, ehpRows.get(name)!)
        const b = levelAt(ECON, id, econRows.get(name)!)
        if (a === null || b === null) continue
        if (a !== b) disagreements.push(`${id} ${name}: eHP ${a} vs eEcon ${b}`)
      }
    }
    expect(disagreements).toEqual([])
  })

  it('shows the disagreement reaches values a player would see', () => {
    /*
     * Not a second copy of the check above — that one compares inputs, this one
     * compares something the sheet DERIVED from an input, so it fails even
     * where a level column happens to agree.
     *
     * Both tabs render the coin trade-off perk, whose label the sheet builds as
     * `1.8 * (1 + 1% * ImproveTradeOffPerks)`. eHP says `x1.944` and eEcon says
     * `x1.908` — level 8 against level 6, for the same perk, in the same
     * workbook. One player cannot have both.
     */
    const label = (cells: Record<string, unknown>, col: string, rows: number[]) => rows
      .map(r => cells[`${col}${r}`])
      .find(v => typeof v === 'string' && /Coin/i.test(v) && /Health/i.test(v)) as string | undefined

    const fromEhp = label(ehp.baseCells as Record<string, unknown>, 'AT', [30, 31, 32, 33, 34, 35, 36, 37])
    const fromEcon = label(eecon.baseCells as Record<string, unknown>, 'AU', [45, 46, 47, 48, 49, 50])
    expect(fromEhp, 'eHP coin trade-off label').toBeDefined()
    expect(fromEcon, 'eEcon coin trade-off label').toBeDefined()

    const multiplier = (s: string) => Number(/x\s*([\d.]+)/.exec(s)?.[1])
    const level = (v: number) => Math.round((v / 1.8 - 1) / 0.01)
    expect(level(multiplier(fromEhp!))).toBe(8)
    expect(level(multiplier(fromEcon!))).toBe(6)
  })
})
