import { describe, expect, it } from 'vitest'

/**
 * Example multipliers from the site's coin guide, inlined so this test does not
 * depend on site content. If the guide changes these, this test is measuring a
 * scenario the guide no longer describes -- update both together.
 */
const COIN_GUIDE_MULTIPLIER_EXAMPLE = {
  blackHoleMultiplier: 11,
  goldenTowerMultiplier: 20.75,
  combinedMultiplier: 228.25,
} as const
import { computePackCoinMultFromIapToggles, RESOURCE_DROPS_COIN_IAP_MULTIPLIERS } from '../../src/mechanics/resource-drops/coin-iap'
import { moduleCoinsKillBonusFromSubstats } from '../../src/mechanics/resource-drops/coin-module-cpk'
import { allCoinBonusesPerkMult } from '../../src/mechanics/resource-drops/coin-perks'
import {
  accumulateResourceDropsKillYields,
  buildResourceDropsCoinMultipliers,
  coinBonusEnhancementMult,
  computeGoldenTowerCoinMult,
  expectedTimedCoinKillMult,
  RESOURCE_DROPS_AVG_ENEMY_COIN_WEIGHT,
  RESOURCE_DROPS_ENEMIES_PER_SPAWN_TICK,
  type ResourceDropsCoinSimulationInput,
  simulateResourceDropsCoins,
  themePassiveCoinMult,
  themePassiveCoinMultFromBonusPct,
} from '../../src/mechanics/resource-drops/coin-simulation'
import {
  enemySpawnRateCapFromWaveAcceleratorChart,
  findWaveAcceleratorMasteryForSpawnCap,
} from '../../src/mechanics/waves/accelerator-spawn-rate-cap'

export function baseCoinInput(overrides: Partial<ResourceDropsCoinSimulationInput> = {}): ResourceDropsCoinSimulationInput {
  return {
    tier: 1,
    targetWave: 100,
    enemyBalanceCardLevel: 1,
    enemyBalanceMasteryLevel: 0,
    waveSkipCardLevel: 1,
    waveSkipMasteryLevel: 0,
    waveAcceleratorMasteryLevel: -1,
    commonDropLabLevel: 0,
    rareDropLabLevel: 0,
    rerollShardsLabLevel: 0,
    shatterShardsLabLevel: 0,
    deathWaveCellsBonusLevel: 0,
    cellsPerKillBonusLevel: 0,
    shatterCommonModules: true,
    shatterRareModules: false,
    fetchCooldownLevel: 1,
    fetchFindChanceLevel: 1,
    fetchDoubleFindLevel: 1,
    wavesPerBoss: 10,
    averageWaveSeconds: 30,
    coinsKillWorkshopLevel: 0,
    coinsWaveWorkshopLevel: 0,
    coinBonusEnhancementLevel: 0,
    coinsKillLabLevel: 0,
    coinsWaveLabLevel: 0,
    gtBonusLabLevel: 0,
    bhCoinLabLevel: 0,
    dwCoinLabLevel: 0,
    slCoinLabLevel: 0,
    coinsCardLevel: 1,
    coinsCardMastery: 0,
    themeCoinBonusPct: 0,
    relicCoinBonusPct: 0,
    iapToggles: { hasStarterPack: false, hasEpicPack: false, hasDisableAds: false },
    moduleCoinsKillBonus: 0,
    vaultCoinskillLevel: 0,
    allCoinPerkLevel: 0,
    standardPerkBonusPct: 0,
    hasCoinTradeOffPerk: false,
    improveTradeOffLabPct: 0,
    introSprintZeroCoinWaveCap: 0,
    bhdCpkBonusPct: 0,
    gtPlusLevel: 0,
    goldenBotCoverageFraction: 1,
    goldenBotBonusLevel: 0,
    useGoldenBotCoinBonus: false,
    assumeSyncedUwCoinWindows: true,
    uwLevels: {
      gtMultiplierLevel: 0,
      gtCdLevel: 0,
      gtDurLevel: 0,
      gtCdLab: 0,
      gtDurLab: 0,
      bhCdLevel: 0,
      bhDurLevel: 0,
      bhCdLab: 0,
      bhDurLab: 0,
      dwCdLevel: 0,
      dwQtyLevel: 0,
      slCdLevel: 0,
      slQtyLevel: 0,
      slAngleLevel: 0,
    },
    botLevels: {
      gbBonusLevel: 0,
      gbCdLevel: 0,
      gbDurLevel: 0,
      gbCdLab: 0,
      gbDurLab: 0,
    },
    uptime: null,
    ...overrides,
  }
}

describe('resource-drops-coin-simulation', () => {
  it('coin bonus enhancement caps at 3× at level 200', () => {
    expect(coinBonusEnhancementMult(0)).toBe(1)
    expect(coinBonusEnhancementMult(200)).toBe(3)
    expect(coinBonusEnhancementMult(250)).toBe(3)
  })

  it('theme passive accepts collective bonus pct', () => {
    expect(themePassiveCoinMultFromBonusPct(15)).toBeCloseTo(1.15, 6)
    expect(themePassiveCoinMult({
      themeCoinBonusPct: 15,
      towerThemesOwned: 10,
      backgroundThemesOwned: 5,
      menuThemesOwned: 4,
      guardianThemesOwned: 2,
    })).toBeCloseTo(1.15, 6)
  })

  it('IAP toggles multiply to 9× when all owned', () => {
    expect(computePackCoinMultFromIapToggles({
      hasStarterPack: true,
      hasEpicPack: true,
      hasDisableAds: true,
    })).toBe(
      RESOURCE_DROPS_COIN_IAP_MULTIPLIERS.starterPack
      * RESOURCE_DROPS_COIN_IAP_MULTIPLIERS.epicPack
      * RESOURCE_DROPS_COIN_IAP_MULTIPLIERS.disableAds,
    )
  })

  it('module coins-per-kill substat uses assist substat efficiency', () => {
    expect(moduleCoinsKillBonusFromSubstats(0.4, 0.4, 25, 30)).toBeCloseTo(0.4 + 0.4 * 0.56, 6)
  })

  it('all coin perk stacks multiplicatively', () => {
    expect(allCoinBonusesPerkMult(5, 0)).toBeCloseTo(1.75, 6)
  })

  it('synced BH × GT timed mult matches guide example shape', () => {
    const timed = expectedTimedCoinKillMult({
      gtCoinMult: COIN_GUIDE_MULTIPLIER_EXAMPLE.goldenTowerMultiplier,
      bhCoinMult: COIN_GUIDE_MULTIPLIER_EXAMPLE.blackHoleMultiplier,
      dwCoinMult: 1,
      slCoinMult: 1,
      goldenBotMult: 1,
      gtUptimeRatio: 0.25,
      bhUptimeRatio: 0.25,
      dwUptimeRatio: 0,
      slUptimeRatio: 0,
      gbUptimeRatio: 0,
    }, true)
    expect(timed).toBeGreaterThan(COIN_GUIDE_MULTIPLIER_EXAMPLE.combinedMultiplier * 0.15)
  })

  it('BH coin lab reaches x11 at level 20', () => {
    const mults = buildResourceDropsCoinMultipliers(baseCoinInput({
      bhCoinLabLevel: 20,
      uptime: null,
    }))
    expect(mults.bhCoinMult).toBeCloseTo(11, 1)
  })

  it('higher CPK workshop increases total coins monotonically at fixed wave', () => {
    const low = simulateResourceDropsCoins(baseCoinInput({ coinsKillWorkshopLevel: 0 }))
    const high = simulateResourceDropsCoins(baseCoinInput({ coinsKillWorkshopLevel: 100 }))
    expect(high.coins.totalCoins).toBeGreaterThan(low.coins.totalCoins)
  })

  it('wave skip increases total coin estimate', () => {
    const base = simulateResourceDropsCoins(baseCoinInput({ waveSkipCardLevel: 1, waveSkipMasteryLevel: 0 }))
    const skipped = simulateResourceDropsCoins(baseCoinInput({ waveSkipCardLevel: 7, waveSkipMasteryLevel: 9 }))
    expect(skipped.coins.totalCoins).toBeGreaterThan(base.coins.totalCoins)
  })

  it('high wave skip total coins exceed low wave skip at fixed wave', () => {
    const low = simulateResourceDropsCoins(baseCoinInput({
      tier: 20,
      targetWave: 100,
      waveSkipCardLevel: 1,
      waveSkipMasteryLevel: 0,
    }))
    const high = simulateResourceDropsCoins(baseCoinInput({
      tier: 20,
      targetWave: 100,
      waveSkipCardLevel: 7,
      waveSkipMasteryLevel: 9,
    }))
    expect(high.coins.totalCoins).toBeGreaterThan(low.coins.totalCoins)
    expect(high.coins.coinsFromWavePayoutWaveSkipBonus).toBeGreaterThan(0)
  })

  it('GT stone multiplier level increases golden tower coin mult', () => {
    expect(computeGoldenTowerCoinMult(0, 0)).toBeGreaterThanOrEqual(5)
    expect(computeGoldenTowerCoinMult(20, 0)).toBeGreaterThan(computeGoldenTowerCoinMult(0, 0))
  })

  it('accumulateResourceDropsKillYields matches per-wave brute force', () => {
    function bruteForce(input: {
      targetWave: number
      enemyBalanceMult: number
      waveAcceleratorMastery: number | null
      introSprintZeroCoinWaveCap: number
    }) {
      let totalKills = 0
      let rawKillCoins = 0
      for (let wave = 1; wave <= input.targetWave; wave += 1) {
        const cap = enemySpawnRateCapFromWaveAcceleratorChart({
          wave,
          waveAcceleratorMastery: input.waveAcceleratorMastery,
        })
        // The chart gives spawn TICKS, not enemies: `Main.WaveUpdate` yields
        // several per tick. This brute force exists to check the segment-wise
        // sum against a per-wave loop, so it has to carry the same factor.
        const kills = cap * input.enemyBalanceMult * RESOURCE_DROPS_ENEMIES_PER_SPAWN_TICK
        totalKills += kills
        if (wave <= input.introSprintZeroCoinWaveCap) continue
        rawKillCoins += kills * wave * RESOURCE_DROPS_AVG_ENEMY_COIN_WEIGHT
      }
      return { totalKills, rawKillCoins }
    }

    for (const targetWave of [100, 4786, 50_000, 500_000]) {
      for (const mastery of [null, 0, 5, 9] as const) {
        const waMastery = findWaveAcceleratorMasteryForSpawnCap(mastery)
        const payload = {
          targetWave,
          enemyBalanceMult: 1.25,
          waveAcceleratorMastery: waMastery,
          introSprintZeroCoinWaveCap: mastery === 5 ? 120 : 0,
        }
        const fast = accumulateResourceDropsKillYields(payload)
        const slow = bruteForce(payload)
        expect(fast.totalKills).toBeCloseTo(slow.totalKills, 6)
        // Relative, not absolute: these totals reach 1e13, where an absolute
        // tolerance of 1e-3 is below the float64 spacing and fails on rounding
        // alone. The claim is that the segment sum and the loop agree, not that
        // they agree to a fixed number of decimal places at any magnitude.
        expect(Math.abs(fast.rawKillCoins - slow.rawKillCoins) / Math.max(1, slow.rawKillCoins))
          .toBeLessThan(1e-12)
      }
    }
  })
})
