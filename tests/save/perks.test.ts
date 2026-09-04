import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { listActivePerkIndices } from '../../src/save/catalogs/perks'
import {
  computeUnbannedPerkIndices,
  getOverviewAutopickPerkIndices,
  readPerkPreferencesFromSaveRoot,
} from '../../src/save/perks/read'
import { FIXTURES } from '../helpers/paths'

/** Synthetic, and inside the package, so a fork can run this without a save of its own. */
const fixtureDir = join(FIXTURES, 'save')
const playerInfo = JSON.parse(
  readFileSync(join(fixtureDir, 'perk-preferences.sample.json'), 'utf8'),
) as Record<string, unknown>

describe('computeUnbannedPerkIndices', () => {
  it('returns active catalog indices minus banned set', () => {
    const banned = [5, 14, 2, 13, 4, 47, 43, 49]
    const unbanned = computeUnbannedPerkIndices(banned)
    expect(unbanned).toHaveLength(listActivePerkIndices().length - banned.length)
    for (const index of banned) {
      expect(unbanned).not.toContain(index)
    }
    expect(unbanned).toContain(10)
    expect(unbanned).toContain(27)
  })
})

describe('readPerkPreferencesFromSaveRoot', () => {
  it('imports banned/unbanned perks and auto-pick settings from playerInfo fixture', () => {
    const result = readPerkPreferencesFromSaveRoot(playerInfo)

    expect(result.bannedIndices).toEqual([2, 4, 5, 14, 43, 46, 47, 49])
    expect(result.unbannedIndices).toHaveLength(26)
    expect(result.firstPerkIndex).toBe(10)
    /*
     * These names come from PERK_IMPORT_CATALOG, and until 2026-08-18 thirteen
     * of its thirty-four entries were wrong — so this assertion restated the
     * defect rather than catching it. The indices below are real save data and
     * were always right; only the names moved.
     */
    expect(result.firstPerkName).toBe('Perk Wave Requirement -20.00%')
    expect(result.firstTradeOffPerkIndex).toBeNull()
    expect(result.autoPickPerk).toBe(true)
    expect(result.autoPickOrder).toHaveLength(34)
    expect(result.autoPickOrder[0]).toBe(10)
    expect(result.bannedPerkNames).toContain('Interest x1.50')
    // index 49, which the game applies to lifesteal.
    expect(result.bannedPerkNames).toContain('Lifesteal x2.50, but Knockback Force -70%')
    expect(result.unbannedPerkNames).toContain('Free Upgrade Chance for All +5.0%')
    expect(result.unbannedPerkNames).toContain('Black Hole Duration +12.0s')
  })

  it('returns defaults for null root', () => {
    const result = readPerkPreferencesFromSaveRoot(null)
    expect(result.bannedIndices).toEqual([])
    expect(result.unbannedIndices).toHaveLength(listActivePerkIndices().length)
    expect(result.autoPickPerk).toBe(false)
  })
})

describe('getOverviewAutopickPerkIndices', () => {
  it('uses only autoPickOrder entries and excludes banned perks', () => {
    const indices = getOverviewAutopickPerkIndices({
      autoPickPerk: true,
      autoPickOrder: [20, 40, 1, 2],
      bannedIndices: [40],
    })
    expect(indices).toEqual([20, 1, 2])
  })

  it('does not include unbanned perks missing from autoPickOrder', () => {
    const indices = getOverviewAutopickPerkIndices({
      autoPickPerk: true,
      autoPickOrder: [20, 1],
      bannedIndices: [],
    })
    expect(indices).toEqual([20, 1])
  })

  it('returns empty when auto pick is disabled', () => {
    const indices = getOverviewAutopickPerkIndices({
      autoPickPerk: false,
      autoPickOrder: [20, 1, 2],
      bannedIndices: [],
    })
    expect(indices).toEqual([])
  })
})
