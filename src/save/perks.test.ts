import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { listActivePerkIndices } from './catalogs/perks'
import {
  readPerkPreferencesFromSaveRoot,
  computeUnbannedPerkIndices,
  resolveOverviewAutopickPerkIndices,
} from './perks'

/** Synthetic, and inside the package, so a fork can run this without a save of its own. */
const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
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
    expect(result.firstPerkName).toBe('Free Upgrade Chance for All +5.0%')
    expect(result.firstTradeOffPerkIndex).toBeNull()
    expect(result.autoPickPerk).toBe(true)
    expect(result.autoPickOrder).toHaveLength(34)
    expect(result.autoPickOrder[0]).toBe(10)
    expect(result.bannedPerkNames).toContain('Interest x1.50')
    expect(result.bannedPerkNames).toContain('x1.80 Coins, but Tower Max Health -70%')
    expect(result.unbannedPerkNames).toContain('Perk Wave Requirement -20.00%')
    expect(result.unbannedPerkNames).toContain('Black Hole Duration +12.0s')
  })

  it('returns defaults for null root', () => {
    const result = readPerkPreferencesFromSaveRoot(null)
    expect(result.bannedIndices).toEqual([])
    expect(result.unbannedIndices).toHaveLength(listActivePerkIndices().length)
    expect(result.autoPickPerk).toBe(false)
  })
})

describe('resolveOverviewAutopickPerkIndices', () => {
  it('uses only autoPickOrder entries and excludes banned perks', () => {
    const indices = resolveOverviewAutopickPerkIndices({
      autoPickPerk: true,
      autoPickOrder: [20, 40, 1, 2],
      bannedIndices: [40],
    })
    expect(indices).toEqual([20, 1, 2])
  })

  it('does not include unbanned perks missing from autoPickOrder', () => {
    const indices = resolveOverviewAutopickPerkIndices({
      autoPickPerk: true,
      autoPickOrder: [20, 1],
      bannedIndices: [],
    })
    expect(indices).toEqual([20, 1])
  })

  it('returns empty when auto pick is disabled', () => {
    const indices = resolveOverviewAutopickPerkIndices({
      autoPickPerk: false,
      autoPickOrder: [20, 1, 2],
      bannedIndices: [],
    })
    expect(indices).toEqual([])
  })
})
