import { describe, expect, it } from 'vitest'
import {
  CHARGED_MINES_RATE_PER_SECOND,
  computeIlmCalculatorResult,
  computeIlmChargeMultiplier,
  defaultIlmCalcsSettings,
  ILM_CHARGE_INITIAL,
  ILM_COOLDOWN_FLOOR_SEC,
  ILM_MODULE_SUBSTAT_NONE,
  patchIlmCalcsSettings,
  resolveChargedMinesRatePerSecond,
  resolveInnerLandMinesCooldownSeconds,
  resolveInnerLandMinesDamageMult,
  resolveTowerDamageFromAttackLevel,
} from './ilm-charge'
import {
  buildIlmCalculatorInputFromSettings,
  resolveEnemyHitMultiplierFromIlmSettings,
  resolveIlmCannonModuleMult,
  resolveIlmDetonationModuleMult,
  resolveIlmHitMultiplierBreakdown,
  resolveIlmTowerDamage,
  resolveIlmUwDamageMult,
} from './ilm-calculator-resolve'
import { enemyHitMultiplier } from './bot-hit-multiplier'

describe('ilm-charge', () => {
  it('defaults attack damage level so detonation damage is non-zero', () => {
    const settings = defaultIlmCalcsSettings()
    expect(settings.static.attackDamageLevel).toBeGreaterThanOrEqual(1)
    const towerDamage = resolveIlmTowerDamage(settings.static)
    expect(towerDamage).toBeGreaterThan(0)

    const input = buildIlmCalculatorInputFromSettings(settings, 30)
    const result = computeIlmCalculatorResult(input)
    expect(result.hit.hitDamage).toBeGreaterThan(0)
  })

  it('supports unbounded mine age waves via scenario settings', () => {
    const settings = patchIlmCalcsSettings(defaultIlmCalcsSettings(), {
      scenario: { mineAgeWaves: 5000 },
    })
    const input = buildIlmCalculatorInputFromSettings(settings, 30)
    expect(input.mineAgeSeconds).toBe(150_000)
  })

  it('exposes charged mines rate table parity', () => {
    expect(CHARGED_MINES_RATE_PER_SECOND[0]).toBe(0.5)
    expect(CHARGED_MINES_RATE_PER_SECOND[14]).toBe(50.9)
    expect(resolveChargedMinesRatePerSecond(14)).toBe(50.9)
  })

  it('resolves ILM workshop damage mult from chart data', () => {
    expect(resolveInnerLandMinesDamageMult(0)).toBe(10)
    expect(resolveInnerLandMinesDamageMult(30)).toBe(3021)
  })

  it('applies ILM cooldown floor', () => {
    expect(resolveInnerLandMinesCooldownSeconds(15)).toBe(50)
    expect(resolveInnerLandMinesCooldownSeconds(0)).toBe(200)
    expect(resolveInnerLandMinesCooldownSeconds(15)).toBeGreaterThanOrEqual(ILM_COOLDOWN_FLOOR_SEC)
  })

  it('grows charge over mine lifetime without chrono', () => {
    const result = computeIlmChargeMultiplier({
      mineAgeSeconds: 10,
      chargedMinesLevel: 0,
      chronoJumpLabLevel: 0,
      timesHitByIlm: 0,
      chargedMinesActive: true,
    })
    expect(result.charge).toBe(ILM_CHARGE_INITIAL + 0.5 * 10)
    expect(result.chronoGrowth).toBe(0)
  })

  it('stacks hit multiplier amps on detonation', () => {
    const hitMult = enemyHitMultiplier({
      flameModuleDebuff: { active: true },
      chainLightningShock: { active: true, shockMultiplier: 1.1, shockStack: 2 },
    })
    const result = computeIlmCalculatorResult({
      towerDamage: 1e12,
      ilmDamageMult: 100,
      mineAgeSeconds: 20,
      chargedMinesLevel: 5,
      chronoJumpLabLevel: 0,
      timesHitByIlm: 0,
      chargedMinesActive: true,
      moduleBonus: 0.5,
      hitMultiplier: hitMult,
      ultimateCritDisplayFactor: 1,
    })
    expect(result.hit.hitDamage).toBeGreaterThan(0)
    expect(result.hit.hitMultiplier).toBe(hitMult)
  })
})

describe('ilm-calculator-resolve', () => {
  it('cannon modules scale Main.damage', () => {
    const base = defaultIlmCalcsSettings()
    const workshopOnly = resolveTowerDamageFromAttackLevel(base.static.attackDamageLevel)
    const withCannon = patchIlmCalcsSettings(base, {
      static: {
        primaryCannon: { rarity: 'Epic', level: 50 },
      },
    })
    expect(resolveIlmCannonModuleMult(withCannon.static)).toBeGreaterThan(1)
    expect(resolveIlmTowerDamage(withCannon.static)).toBeGreaterThan(workshopOnly)
  })

  it('core module level and rarity change detonation moduleMult', () => {
    const base = defaultIlmCalcsSettings()
    const low = resolveIlmDetonationModuleMult(base.static)
    const high = patchIlmCalcsSettings(base, {
      static: {
        primaryCore: { rarity: 'Ancestral', level: 120, ilmDamageSubstatRarity: ILM_MODULE_SUBSTAT_NONE },
      },
    })
    expect(resolveIlmDetonationModuleMult(high.static)).toBeGreaterThan(low)
  })

  it('ILM damage substat adds to uwDamageFactor, not moduleMult', () => {
    const base = defaultIlmCalcsSettings()
    const withSubstat = patchIlmCalcsSettings(base, {
      static: {
        primaryCore: {
          ...base.static.primaryCore,
          ilmDamageSubstatRarity: 'Epic',
        },
      },
    })
    expect(resolveIlmUwDamageMult(withSubstat.static)).toBeGreaterThan(resolveIlmUwDamageMult(base.static))
    expect(resolveIlmDetonationModuleMult(withSubstat.static)).toBe(resolveIlmDetonationModuleMult(base.static))
  })

  it('scenario toggles affect hit multiplier when static inputs are set', () => {
    const base = defaultIlmCalcsSettings()
    const staticReady = patchIlmCalcsSettings(base, {
      static: {
        dimensionCoreRarity: 'Epic',
        acpRarity: 'Ancestral',
        singularityHarnessEquipped: true,
        shockMultiplierLabLevel: 10,
        amplifyBotBonusLevel: 5,
      },
      scenario: {
        enemyShocked: true,
        shockStack: 2,
        enemyFlameTagged: true,
        amplifyBotOnEnemy: true,
        acpShockwaveActive: true,
        protectorAuraActive: true,
      },
    })
    const off = patchIlmCalcsSettings(staticReady, {
      scenario: {
        enemyShocked: false,
        enemyFlameTagged: false,
        amplifyBotOnEnemy: false,
        acpShockwaveActive: false,
        protectorAuraActive: false,
      },
    })
    expect(resolveEnemyHitMultiplierFromIlmSettings(staticReady)).toBeGreaterThan(
      resolveEnemyHitMultiplierFromIlmSettings(off),
    )
  })

  it('doubles shock lab multiplier when DC rarity is set', () => {
    const base = defaultIlmCalcsSettings()
    const withoutDc = resolveIlmHitMultiplierBreakdown(
      { ...base.static, shockMultiplierLabLevel: 10 },
      { ...base.scenario, enemyShocked: true, shockStack: 1 },
    )
    const withDc = resolveIlmHitMultiplierBreakdown(
      { ...base.static, shockMultiplierLabLevel: 10, dimensionCoreRarity: 'Epic' },
      { ...base.scenario, enemyShocked: true, shockStack: 1 },
    )
    expect(withDc.dimensionCoreDoublesShock).toBe(true)
    expect(withDc.total).toBeGreaterThan(withoutDc.total)
  })

  it('caps shock stacks to DC max from DC rarity', () => {
    const base = defaultIlmCalcsSettings()
    const breakdown = resolveIlmHitMultiplierBreakdown(
      { ...base.static, dimensionCoreRarity: 'Epic', shockMultiplierLabLevel: 5 },
      { ...base.scenario, enemyShocked: true, shockStack: 99 },
    )
    expect(breakdown.dimensionCoreMaxShockStack).toBe(5)
    expect(breakdown.shockStack).toBe(5)
  })
})
