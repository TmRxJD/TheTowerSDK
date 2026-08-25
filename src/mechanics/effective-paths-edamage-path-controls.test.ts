import { describe, expect, it } from 'vitest'

import { configFromSheet, levelsFromSheet } from './effective-paths-edamage-compute.test'
import type { SheetCells } from './effective-paths-edamage-compute.test'
import { parseNumberInput } from '../formatting/numbers'
import { planEffectiveDamagePath } from './effective-paths-edamage-plan'
import fixture from '../../fixtures/mechanics/effective-paths-edamage-path-controls.fixtures.json'

/**
 * The port's path ordering against the sheet's, under toggled controls.
 *
 * Captured from `_EPPATH` — a duplicate of `eDamage` with only the
 * IDS-dependent inputs frozen to literals, so the fill-down, the ROI band and
 * the pick matrix are all live. Seven control settings on an account that owns
 * every ultimate weapon, and the driver is verified to MOVE before any capture
 * is taken.
 *
 * ## Why the driver took three attempts
 *
 * Two earlier captures produced seven identical paths and looked like results:
 * the first drove the live `eDamage` tab, where a copy has no IDS import so
 * nothing is owned and no control has anything to gate; the second drove
 * `_EPTEST`, whose path display is a frozen snapshot — the numbers moved, the
 * table never did. Both would have shipped with the same plausible story. The
 * build script now refuses to finish unless both the computation and the path
 * move, and the capture refuses to write a fixture where every state agrees.
 *
 * ## What is compared
 *
 * Each state carries the input block as a flat cell map, so the port can be
 * given the same account the sheet had. `baseCells` is the full dump; every
 * other state records only what it changed.
 */

interface Step { step: number, name: string, level: string | null }
interface State {
  id: string
  overrides: Record<string, unknown>
  steps: Step[]
  cellDiff?: Record<string, unknown>
}

const CAPTURE = fixture as unknown as {
  sheetVersion: string
  tab: string
  distinctPaths: number
  baseCells: SheetCells
  states: State[]
}

const signature = (steps: Step[]) => steps.map(x => `${x.name}@${x.level}`).join(' > ')

/**
 * What a live cell shows, turned into what the reader expects.
 *
 * `_EPTEST` dumps were literalised by hand, so every input already had the
 * right type. `_EPPATH` keeps its cells live, so the same inputs arrive as the
 * strings the sheet DISPLAYS: `"100B"` for a formatted number, `"-"` where a
 * stat does not apply, `"+4"` for a signed count. `configFromSheet` keeps only
 * `typeof value === 'number'`, so each of those reads as 0 — and `log10(0)`
 * turned the whole effective damage into NaN.
 *
 * This belongs on the reading side, not on the sheet: mutating the driver to
 * suit the reader was tried and broke a workshop VLOOKUP.
 */
function normaliseCell(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const text = value.trim()
  if (text === '-' || text === '') return 0
  if (/^[+-]?\d+(\.\d+)?$/.test(text)) return Number(text)
  // The game's own notation, which the sheet writes with an optional space.
  if (/^\d+(\.\d+)?\s*[KMBTqQsSOND]$/i.test(text)) return parseNumberInput(text.replace(/\s+/g, ''))
  return value
}

const cellsFor = (state: State): SheetCells => Object.fromEntries(
  Object.entries({ ...CAPTURE.baseCells, ...(state.cellDiff ?? {}) })
    .map(([key, value]) => [key, normaliseCell(value)]),
)

/** The sheet's own level label is `"lvl 4"`; the port returns the number. */
const sheetLevel = (raw: string | null) => Number(String(raw ?? '').replace(/[^\d]/g, '')) || 0

describe('eDamage path under toggled controls', () => {
  const byId = new Map(CAPTURE.states.map(s => [s.id, s]))
  const base = byId.get('owned-all-on')!

  it('came from a driver that is known to move', () => {
    expect(CAPTURE.tab).toBe('_EPPATH')
    expect(CAPTURE.sheetVersion).toBe('v5.09.03.07')
    expect(CAPTURE.states).toHaveLength(9)
    expect(Object.keys(CAPTURE.baseCells).length).toBeGreaterThan(3000)
    // Attack Disso plans NOTHING — the run type blanks every candidate — and
    // that is a state worth keeping rather than filtering out.
    for (const state of CAPTURE.states) {
      expect(state.steps.length, state.id).toBe(state.id === 'attack-disso' ? 0 : 40)
    }
  })

  it('is control-sensitive, which is the whole reason to keep it', () => {
    // Six distinct orderings across seven states. A capture where every state
    // agrees is what a BROKEN capture looks like on this driver, and two
    // earlier ones looked exactly like that.
    const distinct = new Set(CAPTURE.states.map(s => signature(s.steps)))
    expect(distinct.size).toBe(CAPTURE.distinctPaths)
    expect(distinct.size).toBeGreaterThan(1)
  })

  it('gives each state a different account, not a different label', () => {
    // The overrides have to actually reach the input dump, or every "state" is
    // the base state under another name and the comparison below is one case
    // repeated seven times.
    for (const state of CAPTURE.states.slice(1)) {
      expect(Object.keys(state.cellDiff ?? {}).length, state.id).toBeGreaterThan(0)
    }
  })

  describe('the port plans what the sheet plans', () => {
    // Step for step, name and level, for all seven control settings. This is
    // the claim the whole driver exists to support: two models can agree on
    // every number and still rank them differently, and the ranking is the
    // product.
    /**
     * RETRACTED: this was reported as a ranking defect in the port. It was not.
     *
     * `regular-run` and `uw-disso` disagreed, and the write-up said the port's
     * plan "does not move at all" with run type while the sheet's did. Both
     * halves were true and the conclusion was wrong: the SHEET side was
     * erroring. Counting ROI cells in `#N/A` per run type on a copy with no IDS
     * import gives
     *
     *     Regular 20 · Tourney 0 · Attack Disso 7 · UW Disso 20 · Util Disso 20
     *
     * — a failing workshop `VLOOKUP` that needs preset data the import supplies.
     * An `#N/A` there is invisible downstream: the pick matrix skips the column
     * and the path fills with whatever survives, which is how "forty steps of
     * Damage" arrived looking like the sheet's considered answer.
     *
     * So these two states measure the driver, not the port. They are kept
     * failing, renamed, because deleting them would erase the only record that
     * the driver is Tourney-only — and `build-eppath-driver.mjs` now refuses to
     * declare success unless every run type is clean, which it is not.
     */
    const DRIVER_INVALID = new Set(['regular-run', 'uw-disso'])

    for (const state of CAPTURE.states) {
      const run = DRIVER_INVALID.has(state.id) ? it.fails : it
      run(`${state.id}${DRIVER_INVALID.has(state.id) ? ' — DRIVER ERRORS ON THIS RUN TYPE' : ''}`, () => {
        const cells = cellsFor(state)
        const plan = planEffectiveDamagePath({
          config: configFromSheet(cells),
          levels: levelsFromSheet(cells),
          variant: 'lab-time',
          steps: state.steps.length,
        })
        expect(plan.steps.map(s => s.name)).toEqual(state.steps.map(s => s.name))
        expect(plan.steps.map(s => s.level)).toEqual(state.steps.map(s => sheetLevel(s.level)))
      })
    }

    it('attributes the two failures to the driver, not the port', () => {
      // The port's run type DOES reach its config — which is what made the
      // wrong conclusion plausible. What it cannot do is rank against a sheet
      // column that is #N/A.
      expect(configFromSheet(cellsFor(byId.get('regular-run')!)).runType).toBe('Regular')
      expect(configFromSheet(cellsFor(byId.get('uw-disso')!)).runType).toBe('UW Disso')

      // The sheet's captured answer for those states collapses onto a handful
      // of upgrades, which is the shape an erroring ROI band produces: the pick
      // matrix can only choose among the columns that still return a number.
      for (const id of DRIVER_INVALID) {
        const names = new Set(byId.get(id)!.steps.map(s => s.name))
        expect(names.size, `${id} has too much variety to be an error artifact`)
          .toBeLessThanOrEqual(3)
      }
      // Tourney, where no ROI cell errors, does not look like that.
      expect(new Set(base.steps.map(s => s.name)).size).toBeGreaterThan(3)
    })
  })

  it('reorders the front of the path when the weapons come off', () => {
    // owned: Critical Factor > Range > Damage > Attack Speed …
    // none:  Critical Factor > Damage > Range > Attack Speed …
    // Range and Damage swap, because Range only pays while the ultimate
    // weapons can use it.
    const off = byId.get('no-uws')!
    expect(signature(off.steps)).not.toBe(signature(base.steps))
    expect(base.steps.slice(0, 4).map(s => s.name))
      .toEqual(['Critical Factor', 'Range', 'Damage', 'Attack Speed'])
    expect(off.steps.slice(0, 4).map(s => s.name))
      .toEqual(['Critical Factor', 'Damage', 'Range', 'Attack Speed'])
  })

  it('records which controls bite, and which do not', () => {
    const moved = CAPTURE.states
      .filter(s => s.id !== 'owned-all-on')
      .filter(s => signature(s.steps) !== signature(base.steps))
      .map(s => s.id)
      .sort()
    expect(moved).toEqual([
      'attack-disso', 'cards-and-perks-off', 'cards-off', 'no-uws', 'perks-off',
      'regular-run', 'uw-disso',
    ])

    // CF Slow is the one that does not: it scales a damage multiplier, and
    // scaling every candidate equally cannot reorder them.
    expect(signature(byId.get('cf-slow-off')!.steps)).toBe(signature(base.steps))
  })
})
