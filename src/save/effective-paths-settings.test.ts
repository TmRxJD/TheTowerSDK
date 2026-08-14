import { describe, expect, it } from 'vitest'
import {
  canImportEffectivePathsSettings,
  readEffectivePathsSettingsFromSaveRoot,
} from './effective-paths-settings'

describe('the tier a player has actually reached', () => {
  it('takes the last tier with a wave, not the tier they are sitting on', () => {
    // The distinction that matters: `currentTier` is where they are, and it is
    // routinely lower than the furthest they have cleared. Ranking against the
    // lower one understates every path.
    const settings = readEffectivePathsSettingsFromSaveRoot({
      currentTier: 3,
      highestWaveThisTier: [100, 200, 300, 0, 450, 0],
    })
    expect(settings.highestTier).toBe(5)
    expect(settings.highestWave).toBe(450)
  })

  it('ignores the trailing zeros the save pads the array with', () => {
    const settings = readEffectivePathsSettingsFromSaveRoot({
      highestWaveThisTier: [100, 0, 0, 0, 0, 0, 0, 0],
    })
    expect(settings.highestTier).toBe(1)
  })

  it('reports nothing rather than tier 1 for a save with no waves', () => {
    // A brand-new player, and a save the reader could not understand, look the
    // same here. Defaulting to tier 1 would be indistinguishable from a real
    // answer, so both say "nothing to import".
    const settings = readEffectivePathsSettingsFromSaveRoot({ highestWaveThisTier: [] })
    expect(settings.highestTier).toBeNull()
    expect(settings.highestWave).toBeNull()
  })
})

describe('game speed', () => {
  it('comes from the remembered speed', () => {
    expect(readEffectivePathsSettingsFromSaveRoot({ gameSpeedMemory: 5 }).gameSpeed).toBe(5)
  })

  it('treats zero as unknown rather than as a speed', () => {
    // A zero game speed would divide every lab timing into infinity.
    expect(readEffectivePathsSettingsFromSaveRoot({ gameSpeedMemory: 0 }).gameSpeed).toBeNull()
  })
})

describe('whether to offer the import at all', () => {
  it('offers it when the save answered anything', () => {
    expect(canImportEffectivePathsSettings({
      highestTier: 21, highestWave: 7565, gameSpeed: null,
    })).toBe(true)
  })

  it('does not offer it when the save answered nothing', () => {
    expect(canImportEffectivePathsSettings({
      highestTier: null, highestWave: null, gameSpeed: null,
    })).toBe(false)
  })
})
