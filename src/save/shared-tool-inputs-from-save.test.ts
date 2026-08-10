import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  deriveGemDiscountMultiplierFromSaveRoot,
  deriveLabRelicPctFromSaveRoot,
  deriveTradeOffPerksFromSaveRoot,
  extractSharedToolInputsFromSaveRoot,
  mergeSaveDerivedSharedToolInputs,
} from './shared-tool-inputs-from-save'
import { defaultSharedToolInputs } from '../internal/shared-tool-inputs'

/** Synthetic, and inside the package, so a fork can run this without a save of its own. */
const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const playerInfo = JSON.parse(
  readFileSync(join(fixtureDir, 'perk-preferences.sample.json'), 'utf8'),
) as Record<string, unknown>

describe('deriveTradeOffPerksFromSaveRoot', () => {
  it('maps perkLevel indices to shared trade-off toggles', () => {
    const perkLevel = Array.from({ length: 64 }, () => 0)
    perkLevel[42] = 1
    perkLevel[45] = 1
    perkLevel[48] = 1

    expect(deriveTradeOffPerksFromSaveRoot({ perkLevel })).toEqual({
      perkEnemyHpMinus50: true,
      perkBossHpX8: true,
      perkBossHpMinus70: false,
      perkEnemyDmgMinus50: false,
      perkEnemyDmgX25: true,
      perkRangedDmgX3: false,
    })
  })
})

describe('deriveGemDiscountMultiplierFromSaveRoot', () => {
  it('uses researchesComplete × 1.5% + 1 multiplier formula', () => {
    expect(deriveGemDiscountMultiplierFromSaveRoot({ researchesComplete: 20 })).toBeCloseTo(1.3, 5)
    expect(deriveGemDiscountMultiplierFromSaveRoot({ researchesComplete: 0 })).toBe(1)
  })
})

describe('deriveLabRelicPctFromSaveRoot', () => {
  it('sums profile relic lab-speed benefits as percent', () => {
    const result = deriveLabRelicPctFromSaveRoot({
      profileRelics: [5],
    })
    expect(result).toBeGreaterThan(0)
  })
})

describe('mergeSaveDerivedSharedToolInputs', () => {
  it('copies bot and guardian targets from imported levels', () => {
    const base = {
      ...defaultSharedToolInputs,
      botLevels: { 'Flame Bot': [1, 2, 3, 4] },
      botPlusLevels: { 'Bot Bot': [2] },
      guardianLevels: { Attack: [1, 2] },
    }

    const merged = mergeSaveDerivedSharedToolInputs(base, {
      tradeOffPerks: {
        perkEnemyHpMinus50: true,
        perkBossHpX8: false,
        perkBossHpMinus70: false,
        perkEnemyDmgMinus50: false,
        perkEnemyDmgX25: false,
        perkRangedDmgX3: false,
      },
      labsEconomy: {
        ...defaultSharedToolInputs.labsEconomy,
        labRelic: 8,
        gemDiscount: 1.45,
        speedUp: 3,
      },
    })

    expect(merged.botTargets['Flame Bot']).toEqual([1, 2, 3, 4])
    expect(merged.botPlusTargets['Bot Bot']).toEqual([2])
    expect(merged.guardianTargets.Attack).toEqual([1, 2])
    expect(merged.labsEconomy.labRelic).toBe(8)
    expect(merged.labsEconomy.gemDiscount).toBeCloseTo(1.45, 5)
    expect(merged.tradeOffPerks.perkEnemyHpMinus50).toBe(true)
  })

  it('merges save-derived dissonance wave tables into shared payload', () => {
    const merged = mergeSaveDerivedSharedToolInputs(defaultSharedToolInputs, {
      dissonanceCalculatorState: {
        echoLabsLocked: false,
        wavesByTier: {
          '19': { attack: 1800, defense: 5000, utility: 5000, uw: 1320 },
        },
        maxByTier: {
          '19': { attack: false, defense: true, utility: true, uw: false },
        },
      },
    })

    expect(merged.dissonanceCalculatorState.wavesByTier['19']?.attack).toBe(1800)
    expect(merged.dissonanceCalculatorState.maxByTier['19']?.defense).toBe(true)
    expect(merged.dissonanceCalculatorState.echoLabsLocked).toBe(false)
  })
})

describe('extractSharedToolInputsFromSaveRoot', () => {
  it('returns empty partial for null root', () => {
    expect(extractSharedToolInputsFromSaveRoot(null)).toEqual({})
  })

  it('includes perk ban preferences from save root', () => {
    const extracted = extractSharedToolInputsFromSaveRoot(playerInfo)
    expect(extracted.perkPreferences?.bannedIndices).toEqual([2, 4, 5, 14, 43, 46, 47, 49])
    expect(extracted.perkPreferences?.unbannedIndices).toHaveLength(26)
    expect(extracted.perkPreferences?.firstPerkIndex).toBe(10)
    expect(extracted.perkPreferences?.autoPickPerk).toBe(true)
  })
})
