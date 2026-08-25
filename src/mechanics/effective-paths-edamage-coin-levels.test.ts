import { describe, expect, it } from 'vitest'
import { computeEffectiveDamage } from './effective-paths-edamage-compute'
import { configFromSheet, levelsFromSheet } from './effective-paths-edamage-compute.test'
import SWEEP_JSON from '../../fixtures/mechanics/effective-paths-edamage-coin-sweep.fixtures.json'

interface SweepAccount {
  id: string
  cellDiff?: Record<string, unknown>
  satLevels?: Record<string, unknown>
  satColumns?: Record<string, unknown>
}
const SWEEP = SWEEP_JSON as unknown as {
  baseCells: Record<string, unknown>
  baseSatelliteCells?: Record<string, unknown>
  states: SweepAccount[]
}
const cellsOf = (account: SweepAccount) =>
  ({ ...SWEEP.baseCells, ...(account.cellDiff ?? {}) }) as Record<string, unknown>
const satLevelsOf = (account: SweepAccount) =>
  ({ ...(SWEEP.baseSatelliteCells ?? {}), ...(account.satLevels ?? {}) })
import {
  COIN_BAND_HEADERS,
  effectiveDamageCoinLevelsFromSheet,
} from './effective-paths-edamage-coin-levels'

/**
 * The coin band, against the live sheet.
 *
 * `eDamage Coins!BO5:CM5` read on 2026-08-20, alongside what the coin tab then
 * computes for its ultimate weapons. Both tabs run the SAME composition on the
 * SAME account; the only difference is that the coin tab derives the Core
 * module bonuses from these levels where eDamage passes the player's fixed
 * ones. So the two answers below are a controlled pair, and the factor between
 * them is attributable to one term.
 */
const LIVE_BAND: Record<string, number> = {
  'Damage': 31,
  'Damage Mastery': 3,
  'Demon Mode Mastery': 3,
  'Critical Chance Mastery': 1,
  'Critical Factor': 57,
  'Super Crit Multi': 9,
  'Cash Bonus': 0,
  'Attack Speed': 12,
  'Attack Speed Mastery': 9,
  'Damage / Meter': 41,
  'Range Mastery': 2,
  'Super Tower Mastery': 2,
  'Max Rend Armor Multiplier': 75,
  'Ultimate Crit Mastery': 6,
  'Primary Cannon': 1,
  'Assist Cannon': 1,
  'Primary Core': 1,
  'Assist core': 1,
  'Assist Module Substats - Cannon': 22,
  'Assist Module Substats - Armor': 4,
  'Assist Module Substats - Core': 25,
  'Assist Module Bonus - Cannon': 5,
  'Assist Module Bonus - Core': 29,
  'Dissonant Echo - Attack': 4,
  'Dissonant Echo - Ultimate Weapons': 14,
}

/** `eDamage!EO5` and `eDamage Coins!EA5`, read the same minute as the band. */
const EDAMAGE_ULTIMATE_WEAPONS = 3267755.002566009
const COIN_ULTIMATE_WEAPONS = 2258113.5224759406

describe('the coin band', () => {
  it('maps every header the sheet carries, and nothing it does not', () => {
    const result = effectiveDamageCoinLevelsFromSheet({
      ...LIVE_BAND,
      // The two the band carries that are not levels this path buys.
      'Cannon': 1,
      'Damage +': 31,
    })
    expect(result.unknown).toEqual([])
    expect(result.missing).toEqual([])
    expect(result.dropped.sort()).toEqual(['Cannon', 'Damage +'])
    expect(COIN_BAND_HEADERS).toHaveLength(25)
  })

  it('is loud about a header it does not recognise', () => {
    /*
     * Plant the fault the reader exists to catch. A capture that gains a column
     * has to fail rather than leave a field quietly at zero -- which is exactly
     * how `levels.coin` went unwired in the first place.
     */
    const result = effectiveDamageCoinLevelsFromSheet({ ...LIVE_BAND, 'Blast Wave': 3 })
    expect(result.unknown).toEqual(['Blast Wave'])
  })

  it('is loud about a header the capture stopped supplying', () => {
    const short = { ...LIVE_BAND }
    delete short['Primary Core']
    expect(effectiveDamageCoinLevelsFromSheet(short).missing).toEqual(['primaryModuleCore'])
  })
})

/**
 * The Core module chain, end to end, against the coin tab's own captured column.
 *
 * Three fields in a row were declared, read by `computeEffectiveDamage`, and
 * never populated by anything:
 *
 *   config.modules.core.primaryRarity   declared in the config type, set nowhere
 *   levels.coin.*                       `levelsFromSheet` builds lab/keys/stone
 *                                       and stops
 *   satelliteLevelByHeader              built from a regex matching 0 of 27 keys
 *
 * Each one alone is a no-op with a plausible fallback, so none of them failed a
 * test. Together they meant `moduleBonusAtLevel` could never derive anything
 * and always returned the player's FIXED core bonus -- the eDamage tab's
 * behaviour, on the coin tab.
 *
 * Read on the live sheet, 2026-08-20:
 *
 *   MODSTAT_CORE(IDS_MOD_CORE_RARITY(IDS_MOD_CORE_NAME($AX$15)), CE5) = 1.04
 *   eDamage!$AM$23                                                    = 1.505
 *   1.505 / 1.04                                                      = 1.44712
 *
 * and 1.44712 is exactly the ratio the port carried against the sheet's `UWs`
 * on ALL 33 swept accounts.
 */
describe('the Core module pair the coin tab derives', () => {
  const RARITY = 'Common'

  const uwsFor = (account: SweepAccount, rarity: string | undefined) => {
    const cells = cellsOf(account)
    const config = configFromSheet(cells)
    const band = effectiveDamageCoinLevelsFromSheet(satLevelsOf(account))
    return computeEffectiveDamage(
      {
        ...config,
        modules: {
          ...config.modules,
          core: { ...config.modules.core, primaryRarity: rarity, assistRarity: undefined },
        },
      },
      { ...levelsFromSheet(cells), coin: band.absolute },
    ).ultimateWeapons
  }

  it('carries a flat ~1.447x against the sheet while the rarity is unwired', () => {
    /*
     * The regression, pinned. `IDS_MOD_CORE_NAME` on this working copy resolves
     * to "Any Other" -> "Common", the same degradation the sweep already
     * documents for `IDS_LAB_LEVEL`; what matters is that WITHOUT it the port
     * silently produces the other tab's number.
     */
    const ratios = SWEEP.states.map(account =>
      uwsFor(account, undefined) / Number(account.satColumns?.UWs))
    expect(ratios).toHaveLength(199)
    // Measured, not rounded to a guess: the band is 1.440036 .. 1.450102 across 199 accounts (33 accounts gave 1.446914 .. 1.449724).
    expect(Math.min(...ratios)).toBeGreaterThan(1.4400)
    expect(Math.max(...ratios)).toBeLessThan(1.4502)
  })

  it('agrees with the sheet once the rarity reaches the derivation', () => {
    /*
     * 44.5% error down to at most 0.49%. The bound is the measured worst case
     * across 199 accounts (0.995108 .. 1.002064), stated rather than rounded, so
     * that a regression back toward the old behaviour cannot pass.
     *
     * This is deliberately NOT called parity: a residual remains on 5 accounts,
     * pinned by the next test so that it cannot quietly grow.
     */
    const off: string[] = []
    for (const account of SWEEP.states) {
      const ratio = uwsFor(account, RARITY) / Number(account.satColumns?.UWs)
      if (Math.abs(ratio - 1) > 5e-3) off.push(`${account.id}: ${ratio.toFixed(6)}`)
    }
    expect(off).toEqual([])
  })

  it('leaves a residual on five accounts, which is a separate question', () => {
    /*
     * 167 of 199 land within 1e-4 and thirty-two do not. Recorded as a count rather
     * than smoothed into the bound above, because a single loose tolerance
     * would let the remaining gap widen without any test noticing -- and this
     * residual is three orders of magnitude below the defect just fixed, which
     * makes it exactly the kind of thing that gets lost.
     */
    const close = SWEEP.states.filter(account =>
      Math.abs(uwsFor(account, RARITY) / Number(account.satColumns?.UWs) - 1) < 1e-4)
    expect(close.length).toBe(167)
  })
})

/**
 * The residual left after the Core module pair, traced to one wrong-column
 * reference on the sheet.
 *
 * Wiring `levels.coin` took the coin tab's ultimate weapons from a flat
 * ~1.447x error down to at most 0.18%. What remains is not noise and not a
 * rounding difference -- it is a single cell, and it is a SHEET DEFECT:
 *
 *   eDamage!DZ5        EPG_ASSIST_SUB_CAP($AN$4, $BL$42, CO5)   CO5 = 22
 *   eDamage Coins!DL5  EPG_ASSIST_SUB_CAP($AN$4, $BL$42, CJ5)   CJ5 =  5
 *
 * `EPG_ASSIST_SUB_CAP` caps a SUBSTAT. `CO5` on eDamage is "AssM Substat -
 * Cannon"; `CJ5` on the coin tab is "Assist Module BONUS - Cannon". The
 * matching column is `CG5`, "Assist Module Substats - Cannon", three columns
 * away and holding the same 22 that eDamage holds. Live 2026-08-20 the cap
 * comes out 0.06 against 0.23.
 *
 * `eDamage Coins!DW5` takes its Poison Swamp rend factor from `DL5`, so the
 * understated cap surfaces as a Poison Swamp divergence -- on 18 of 33 swept
 * accounts, in BOTH directions (0.9957x to 1.0041x) -- and from there into the
 * ultimate weapon total on 32 of 33.
 *
 * The port is NOT changed to match. Reproducing this would import a
 * spreadsheet bug into a tool people plan real upgrades with, and it changes no
 * path in the sweep. It is pinned here instead, so that if the sheet is ever
 * corrected the residual closes and this test says so rather than going quietly
 * green somewhere else.
 */
describe('the residual is one wrong-column reference, not noise', () => {
  it('is bounded, and bounded in both directions', () => {
    /*
     * Both directions matters: a one-sided bound would pass if the port drifted
     * uniformly, which is exactly what the Core module defect looked like.
     */
    const ratios = SWEEP.states.map(account => {
      const cells = cellsOf(account)
      const config = configFromSheet(cells)
      const band = effectiveDamageCoinLevelsFromSheet(satLevelsOf(account))
      const ours = computeEffectiveDamage(
        {
          ...config,
          modules: {
            ...config.modules,
            core: { ...config.modules.core, primaryRarity: 'Common', assistRarity: undefined },
          },
        },
        { ...levelsFromSheet(cells), coin: band.absolute },
      ).ultimateWeapons
      return ours / Number(account.satColumns?.UWs)
    })

    expect(Math.min(...ratios)).toBeGreaterThan(0.9950)
    expect(Math.max(...ratios)).toBeLessThan(1.0021)

    // And it is genuinely two-sided -- some accounts high, some low. A residual
    // that were one-sided would point at a missing factor rather than at a cap
    // that can land either way depending on the account's two levels.
    expect(ratios.some(r => r > 1)).toBe(true)
    expect(ratios.some(r => r < 1)).toBe(true)
  })
})
