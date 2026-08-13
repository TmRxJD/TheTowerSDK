import { describe, expect, it } from 'vitest'
import { EFFECTIVE_ECONOMY_UPGRADES, planEffectiveEconomyPath } from './effective-paths-eecon-plan'
import { ZERO_EFFECTIVE_ECONOMY_LEVELS } from './effective-paths-eecon-levels'
import { zeroEffectiveEconomyConfig } from './effective-paths-eecon-compute'

/**
 * `eEcon!O3` — counting research days only.
 *
 * ## What it is for
 *
 * Twenty-three candidates share the time path and four of them cost coins with
 * no research time at all: the two workshop enhancements and the two Generator
 * module levels. Ranked by return per *day*, a purchase that takes no days is
 * free — and free beats everything, forever.
 *
 * The sheet's answer is the tab's cost mode. `EO2`, `EP2`, `EQ2` and `ER2` —
 * the hide rows of those four and of nothing else — each open with
 * `NOT(O$3<>"DO")`, so all four leave the path when the mode is `DO`. Under
 * `D+FT` they stay, priced by how long farming their coins takes at the
 * `Coin / Hour` rate.
 *
 * Only `DO` is modelled, and this pins that: the `D+FT` conversion is not here,
 * and the tests below say what the mode does rather than what it should
 * eventually do.
 */

/** An account with enough of everything for the path to have somewhere to go. */
function account() {
  const zero = zeroEffectiveEconomyConfig()
  return {
    ...zero,
    unlockedUltimateWeaponCount: 12,
    baseCoinsPerKill: 1,
    waveDurationSeconds: 35,
    timeMultiplier: 1,
    coinsPerKill: { value: 12, relicPct: 0.05, vaultPct: 0.05 },
  }
}
const FOUR = [
  'Coin Bonus',
  'Free Upgrades',
  'Primary Module - Generator',
  'Assist Module - Generator',
]

const plan = (daysOnly: boolean) => planEffectiveEconomyPath({
  config: account() as never,
  levels: ZERO_EFFECTIVE_ECONOMY_LEVELS,
  variant: 'time',
  steps: 60,
  daysOnly,
  workshopEnhancementsUnlocked: true,
})

describe('the four coin-priced candidates', () => {
  it('are all in the time path’s list to begin with', () => {
    // The precondition. If the names drifted, every check below would pass by
    // matching nothing.
    const names = new Set(
      EFFECTIVE_ECONOMY_UPGRADES
        .filter(upgrade => upgrade.variants.includes('time'))
        .map(upgrade => upgrade.sheetName),
    )
    for (const name of FOUR) expect(names, name).toContain(name)
  })

  it('leave the path when days only is on, and say why', () => {
    const excluded = new Map(plan(true).excluded.map(entry => [entry.sheetName, entry.reason]))
    for (const name of FOUR) {
      expect(excluded.get(name), name).toMatch(/counting days only/)
    }
  })

  it('are never planned as a step under days only', () => {
    // Excluding them from the candidate list and still planning one would mean
    // two lists disagreeing, which is worse than either behaviour alone.
    const names = plan(true).steps.map(step => step.name)
    for (const name of FOUR) expect(names, name).not.toContain(name)
  })

  it('are not excluded for that reason when it is off', () => {
    const excludedForMode = plan(false).excluded
      .filter(entry => /counting days only/.test(entry.reason))
    expect(excludedForMode).toEqual([])
  })
})

describe('the rest of the path', () => {
  it('still plans without them', () => {
    // A mode that empties the tab is not a mode, it is an outage.
    expect(plan(true).steps.length).toBeGreaterThan(0)
  })

  it('excludes nothing else for the mode', () => {
    /*
     * The clause names four columns on the sheet and no others. Hiding a fifth
     * would be this port inventing a rule, which is the failure the whole
     * candidate transcription exists to avoid.
     */
    const namedByMode = plan(true).excluded
      .filter(entry => /counting days only/.test(entry.reason))
      .map(entry => entry.sheetName)
      .sort()
    expect(namedByMode).toEqual([...FOUR].sort())
  })

  it('defaults to leaving them in', () => {
    // The sheet ships `D+FT`, so an absent option has to behave as `D+FT` does.
    const withoutOption = planEffectiveEconomyPath({
      config: account() as never,
      levels: ZERO_EFFECTIVE_ECONOMY_LEVELS,
      variant: 'time',
      steps: 60,
      workshopEnhancementsUnlocked: true,
    })
    const excludedForMode = withoutOption.excluded
      .filter(entry => /counting days only/.test(entry.reason))
    expect(excludedForMode).toEqual([])
  })
})
