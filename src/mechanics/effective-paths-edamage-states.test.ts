import { describe, expect, it } from 'vitest'
import { computeEffectiveDamage } from './effective-paths-edamage-compute'
import { configFromSheet, levelsFromSheet } from './effective-paths-edamage-compute.test'
import type { SheetCells } from './effective-paths-edamage-compute.test'
import type { EffectiveDamageLabLevels } from './effective-paths-edamage-levels'
import states from '../../fixtures/mechanics/effective-paths-edamage-states.fixtures.json'

/**
 * Effective damage across ten accounts, and every single-level move on each.
 *
 * The fixture is not hand-written. A copy of the `eDamage` tab was built with
 * its input block as literals and its computed columns as the real formulas,
 * then driven through ten randomised accounts — one barren, one with
 * everything switched on, and every run type — and the sheet's own answers
 * read back.
 *
 * Two things are checked per account:
 *
 * - **Every intermediate column**, not just the seven factors — `CZ5` through
 *   `ES5`, thirty-odd of them. Comparing only the total hides an error in one
 *   column cancelling an error in another, and localises nothing when it does
 *   fail.
 * - **Every single-point movement.** The sheet keeps a shadow column per
 *   candidate that recomputes the whole of `ES5` with exactly one level bumped
 *   — `FA5` for Attack Speed, and so on. Those are compared against the model
 *   doing the same thing. This is what proves the path *ordering* matches and
 *   not merely the starting number.
 */

interface SheetState {
  cells: SheetCells
  outputs: Record<string, number>
  singlePoint: Record<string, number>
}

/**
 * The three columns a Spotlight-unlocked state cannot check.
 *
 * `EPD_SUPERTOWER_EFFECTIVE_BONUS` declares a `has_sl` parameter, ignores it,
 * and reads `eDamage!$BH$33` by name instead. A copy of the tab therefore
 * cannot drive that branch — the function keeps reading the real sheet, where
 * Spotlight is not unlocked. Half the states hold Spotlight off so these three
 * are compared; the other half turn it on so Spotlight's own columns are.
 *
 * The port takes the parameter and means it, which is the same thing for every
 * call the sheet itself makes.
 */
const SPOTLIGHT_BLIND_COLUMNS = new Set(['DX5', 'EA5', 'ES5'])

/**
 * Two candidates whose shadow column disagrees with its own base column.
 *
 * These are differences *inside* the sheet, not between the sheet and this
 * port — and the model agrees with the base column in both cases, which is
 * what `ES5` actually is:
 *
 * - `FP5` builds its base damage as
 *   `DMG * PerkDMG * TODMG * Shock * CardDMMastery * CannonAssist * Acp * AmpStrike`,
 *   which is `DI5` **without** `PF`. Perfect Freeze runs to five times damage
 *   on a developed account, so the shadow lands far below the real figure.
 * - `FN5` writes `CardUC` as `1 + ($AV$54 + 0.33%*(1+CM5+1)) * (DK5-1)` with no
 *   gate, where `EO5` wraps the same expression in `AND($AY$39, $AY$54)` and
 *   `IF($AY$55, …)`. It therefore credits an Ultimate Crit mastery to a player
 *   who has not equipped the card.
 *
 * Both affect only where those two candidates rank, never the value the page
 * reports. Left as a note rather than matched, because matching either would
 * mean disagreeing with `ES5`.
 */
const SHADOW_DIVERGES_FROM_BASE = new Set([
  'Assist Module Substats - Armor',
  'Ultimate Crit Mastery',
])

const SHEET_STATES = states as unknown as SheetState[]

/**
 * The lab level behind each of the sheet's shadow columns.
 *
 * One entry is not what its header says. `FR4` is labelled "Assist Module
 * Bonus - Armor", but `FR5` bumps `CR5` and recomputes the *Core* bonus, and
 * its consumer `GY5` is labelled "Assist Module Bonus - Core". The formula and
 * the consumer agree with each other; only the shadow's own header is stale,
 * so the level it moves is the Core one.
 */
const SHADOW_LEVEL_KEYS: Record<string, keyof EffectiveDamageLabLevels> = {
  'Attack Speed': 'attackSpeed',
  'Attack Speed Mastery': 'attackSpeedMastery',
  'Range': 'range',
  'Damage / Meter': 'damagePerMeter',
  'Range Mastery': 'rangeMastery',
  'Super Tower Bonus': 'superTowerBonus',
  'Super Tower Mastery': 'superTowerMastery',
  'Max Rend Armor Multiplier': 'maxRendArmorMultiplier',
  'Spotlight Missiles': 'spotlightMissiles',
  'Swamp Rend': 'swampRend',
  'Death Wave Damage Amplifier': 'deathWaveDamageAmplifier',
  'Missile Amplifier': 'missileAmplifier',
  'Inner Land Mine - Chrono Jump': 'innerLandMineChronoJump',
  'Ultimate Crit Mastery': 'ultimateCritMastery',
  'Assist Module Substats - Cannon': 'assistSubstatCannon',
  'Assist Module Substats - Armor': 'assistSubstatArmor',
  'Assist Module Bonus - Armor': 'assistBonusCore',
  'Assist Module Substats - Core': 'assistSubstatCore',
  'Dissonant Echo - Ultimate Weapons': 'dissonantEchoUltimateWeapons',
}

/**
 * Compare as a relative difference.
 *
 * These states run to seventeen digits, where an absolute tolerance is
 * meaningless — a hundredth of a percent of 1e17 is 1e13.
 */
function expectClose(actual: number, expected: number, what: string): void {
  expect(Number.isFinite(actual), `${what}: not finite`).toBe(true)
  if (expected === 0) {
    expect(Math.abs(actual), what).toBeLessThan(1e-9)
    return
  }
  const relative = Math.abs(actual - expected) / Math.abs(expected)
  expect(relative, `${what}: got ${actual}, sheet says ${expected}`).toBeLessThan(1e-9)
}

describe('ten accounts, against the sheet', () => {
  it('has a fixture covering every run type', () => {
    expect(SHEET_STATES).toHaveLength(10)
    const runTypes = new Set(SHEET_STATES.map(state => state.cells.AX19))
    for (const runType of ['Regular', 'Tourney', 'Attack Disso', 'UW Disso', 'Util Disso'])
      expect(runTypes, runType).toContain(runType)
  })

  it('turns Spotlight on for half the states and off for half', () => {
    const on = SHEET_STATES.filter(state => state.cells.BH33 === true)
    expect(on).toHaveLength(5)
  })

  for (const [index, state] of SHEET_STATES.entries()) {
    const spotlightOn = state.cells.BH33 === true

    describe(`state ${index} — ${String(state.cells.AX19)}`, () => {
      const result = computeEffectiveDamage(
        configFromSheet(state.cells), levelsFromSheet(state.cells),
      )

      const refs = Object.keys(state.outputs)
        .filter(ref => result.columns[ref] !== undefined)
        .filter(ref => !(spotlightOn && SPOTLIGHT_BLIND_COLUMNS.has(ref)))

      it('compares a real number of columns', () => {
        expect(refs.length).toBeGreaterThanOrEqual(spotlightOn ? 25 : 28)
      })

      for (const ref of refs) {
        it(`matches ${ref}`, () => {
          expectClose(result.columns[ref], state.outputs[ref], ref)
        })
      }
    })
  }
})

describe('every single-level move, against the sheet', () => {
  it('covers what the sheet would actually show, and no more', () => {
    /**
     * The count varies by account on purpose.
     *
     * A shadow column computes whether or not its candidate is shown, and
     * without the unlock and run-type gates its base column applies — so a
     * hidden one holds a number the sheet never uses. Row 2 is the sheet's own
     * answer to which are shown, and the fixture records only those.
     */
    const counts = SHEET_STATES.map(state => Object.keys(state.singlePoint).length)
    expect(Math.min(...counts)).toBeGreaterThan(0)
    expect(Math.max(...counts)).toBeLessThanOrEqual(19)
    // Across ten accounts every candidate should surface at least once.
    const seen = new Set(SHEET_STATES.flatMap(state => Object.keys(state.singlePoint)))
    expect(seen.size).toBe(19)
    // And the two that are recorded but not compared are still recorded.
    for (const label of SHADOW_DIVERGES_FROM_BASE) expect(seen, label).toContain(label)
  })

  it('names a level for every shadow column the sheet publishes', () => {
    // A shadow column with no mapping would be a candidate the model cannot
    // move — which is exactly how a path silently optimises the wrong thing.
    for (const state of SHEET_STATES)
      for (const label of Object.keys(state.singlePoint))
        expect(SHADOW_LEVEL_KEYS[label], label).toBeDefined()
  })

  for (const [index, state] of SHEET_STATES.entries()) {
    // A Spotlight-unlocked state cannot be compared on `ES5` at all — see
    // SPOTLIGHT_BLIND_COLUMNS — and a single-point move is an `ES5` reading.
    if (state.cells.BH33 === true) continue


    const config = configFromSheet(state.cells)
    const levels = levelsFromSheet(state.cells)

    for (const [label, expected] of Object.entries(state.singlePoint)) {
      if (SHADOW_DIVERGES_FROM_BASE.has(label)) continue

      it(`state ${index}: buying one ${label}`, () => {
        const key = SHADOW_LEVEL_KEYS[label]
        const bumped = {
          ...levels,
          lab: { ...levels.lab, [key]: levels.lab[key] + 1 },
        }
        expectClose(
          computeEffectiveDamage(config, bumped).effectiveDamage,
          expected,
          `${label} on state ${index}`,
        )
      })
    }
  }
})

describe('a single level moves the value and nothing else', () => {
  /**
   * The property the path planner rests on: bumping one level changes the
   * answer, and bumping it back restores the answer exactly. A model that
   * carried state between evaluations would fail this even while matching the
   * sheet on a single reading.
   */
  for (const [index, state] of SHEET_STATES.entries()) {
    it(`is reversible on state ${index}`, () => {
      const config = configFromSheet(state.cells)
      const levels = levelsFromSheet(state.cells)
      const before = computeEffectiveDamage(config, levels).effectiveDamage

      for (const label of Object.keys(state.singlePoint)) {
        const key = SHADOW_LEVEL_KEYS[label]
        const bumped = { ...levels, lab: { ...levels.lab, [key]: levels.lab[key] + 1 } }
        computeEffectiveDamage(config, bumped)
      }

      expect(computeEffectiveDamage(config, levels).effectiveDamage).toBe(before)
    })
  }
})
