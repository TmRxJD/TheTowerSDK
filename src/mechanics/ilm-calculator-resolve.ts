import { clampAssistMultiplierEfficiencyPct } from '../internal/assist-module-efficiency'
import { computeModuleStat, type ModuleCalcType } from '../data/module-bonus'
import { getSharedToolLabs, resolveLabValueAtLevel } from '../data/index'
import {
  chainLightningShockMultiplier,
  enemyHitMultiplier,
  type EnemyHitMultiplierInput,
} from './bot-hit-multiplier'
import {
  ILM_MODULE_SUBSTAT_NONE,
  ILM_UNIQUE_MODULE_IDS,
  ilmModuleSubstatBonusFromRarity,
  type IlmUniqueModuleRarityChoice,
  resolveAmplifyBotBonusMultiplierFromLevel,
  resolveIlmUniqueModuleRarityBonus,
} from './ilm-calculator-options'
import type {
  IlmCalcsScenarioSettings,
  IlmCalcsSettings,
  IlmCalcsStaticSettings,
  IlmCalculatorInput,
  IlmModuleLevelRarity,
} from './ilm-charge'
import {
  DEFAULT_PROTECTOR_DAMAGE_REDUCTION_MULT,
  PROTECTOR_DAMAGE_REDUCTION_LAB_SLUG,
  resolveInnerLandMinesDamageMult,
  resolveMineAgeSecondsFromWaves,
  resolveTowerDamageFromAttackLevel,
  SHOCK_MULTIPLIER_LAB_SLUG,
} from './ilm-charge'

export type { IlmCoreModuleLevelRarity, IlmModuleLevelRarity } from './ilm-charge'

export interface IlmHitMultiplierBreakdown {
  total: number
  shockMultiplier: number
  shockStack: number
  effectiveShockLabMultiplier: number
  dimensionCoreDoublesShock: boolean
  dimensionCoreMaxShockStack: number
  amplifyBotMultiplier: number
  singularityHarnessActive: boolean
  acpShockwaveMultiplier: number
  protectorDamageReduction: number
}

export interface IlmDamageChainBreakdown {
  towerDamageBase: number
  cannonModuleMult: number
  towerDamage: number
  uwDamageMultBase: number
  uwDamageSubstatAdditive: number
  uwDamageMult: number
  coreModuleMult: number
  charge: number
  hitMultiplier: number
}

function clampPct(value: unknown, fallback: number): number {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n)) return fallback
  return clampAssistMultiplierEfficiencyPct(n)
}

function assistEffectiveBonus(baseMult: number, assistEffPct: number): number {
  const efficiency = clampPct(assistEffPct, 0) / 100
  return 1 + (baseMult - 1) * efficiency
}

function resolveModuleMult(type: ModuleCalcType, slot: IlmModuleLevelRarity): number {
  return computeModuleStat({
    type,
    rarityLabel: slot.rarity || 'Common',
    level: Math.max(1, slot.level),
  })
}

function resolveCombinedModuleMult(
  primary: IlmModuleLevelRarity,
  assist: IlmModuleLevelRarity,
  assistEffPct: number,
  type: ModuleCalcType,
): number {
  const primaryMult = resolveModuleMult(type, primary)
  const assistBase = resolveModuleMult(type, assist)
  return primaryMult * assistEffectiveBonus(assistBase, assistEffPct)
}

function isDimensionCoreEquipped(rarity: IlmUniqueModuleRarityChoice): boolean {
  return rarity !== ILM_MODULE_SUBSTAT_NONE
}

function isAcpEquipped(rarity: IlmUniqueModuleRarityChoice): boolean {
  return rarity !== ILM_MODULE_SUBSTAT_NONE
}

/** Attack (Cannon) modules scale tower damage before ILM detonation. */
export function resolveIlmCannonModuleMult(staticSettings: IlmCalcsStaticSettings): number {
  return resolveCombinedModuleMult(
    staticSettings.primaryCannon,
    staticSettings.assistCannon,
    staticSettings.assistEffPct,
    'cannon',
  )
}

export function resolveIlmTowerDamage(staticSettings: IlmCalcsStaticSettings): number {
  const base = resolveTowerDamageFromAttackLevel(staticSettings.attackDamageLevel)
  return base * resolveIlmCannonModuleMult(staticSettings)
}

/** Core modules supply GetModuleBonus at ILM detonation. */
export function resolveIlmDetonationModuleMult(staticSettings: IlmCalcsStaticSettings): number {
  return resolveCombinedModuleMult(
    staticSettings.primaryCore,
    staticSettings.assistCore,
    staticSettings.assistEffPct,
    'core',
  )
}

export function resolveIlmDamageSubstatAdditive(staticSettings: IlmCalcsStaticSettings): number {
  const primary = ilmModuleSubstatBonusFromRarity(staticSettings.primaryCore.ilmDamageSubstatRarity)
  const assist = ilmModuleSubstatBonusFromRarity(staticSettings.assistCore.ilmDamageSubstatRarity)
  const efficiency = clampPct(staticSettings.assistEffPct, 0) / 100
  return primary + assist * efficiency
}

export function resolveIlmUwDamageMult(staticSettings: IlmCalcsStaticSettings): number {
  const base = resolveInnerLandMinesDamageMult(staticSettings.damageLevel)
  return base + resolveIlmDamageSubstatAdditive(staticSettings)
}

export function resolveIlmUwModuleBonus(staticSettings: IlmCalcsStaticSettings): number {
  const mult = resolveIlmDetonationModuleMult(staticSettings)
  return Math.max(0, mult - 1)
}

export function resolveShockMultiplierFromLabLevel(level: number): number {
  const lab = getSharedToolLabs().find(entry => entry.name === SHOCK_MULTIPLIER_LAB_SLUG)
  if (!lab) return 1
  return Math.max(1, resolveLabValueAtLevel(lab, Math.max(0, Math.floor(level))))
}

export function resolveProtectorDamageReductionMult(labLevel: number): number {
  const lab = getSharedToolLabs().find(entry => entry.name === PROTECTOR_DAMAGE_REDUCTION_LAB_SLUG)
  if (!lab) return DEFAULT_PROTECTOR_DAMAGE_REDUCTION_MULT
  const benefit = resolveLabValueAtLevel(lab, Math.max(0, Math.floor(labLevel)))
  return Math.min(1, Math.max(0, DEFAULT_PROTECTOR_DAMAGE_REDUCTION_MULT + benefit))
}

export function resolveDimensionCoreMaxShockStack(
  dimensionCoreRarity: IlmUniqueModuleRarityChoice,
): number {
  if (!isDimensionCoreEquipped(dimensionCoreRarity)) return 0
  return resolveIlmUniqueModuleRarityBonus(ILM_UNIQUE_MODULE_IDS.dimensionCore, dimensionCoreRarity)
}

export function resolveEffectiveShockMultiplier(
  shockMultiplierLabLevel: number,
  dimensionCoreRarity: IlmUniqueModuleRarityChoice,
): number {
  const labMult = resolveShockMultiplierFromLabLevel(shockMultiplierLabLevel)
  return isDimensionCoreEquipped(dimensionCoreRarity) ? labMult * 2 : labMult
}

export function resolveAcpShockwaveMultiplier(
  acpRarity: IlmUniqueModuleRarityChoice,
): number {
  if (!isAcpEquipped(acpRarity)) return 0
  return resolveIlmUniqueModuleRarityBonus(ILM_UNIQUE_MODULE_IDS.antiCubePortal, acpRarity)
}

export function buildEnemyHitMultiplierInput(
  staticSettings: IlmCalcsStaticSettings,
  scenario: IlmCalcsScenarioSettings,
): EnemyHitMultiplierInput {
  const dcMaxStack = resolveDimensionCoreMaxShockStack(staticSettings.dimensionCoreRarity)
  const shockStack = scenario.enemyShocked
    ? (dcMaxStack > 0
      ? Math.min(dcMaxStack, Math.max(0, Math.floor(scenario.shockStack)))
      : Math.max(0, Math.floor(scenario.shockStack)))
    : 0

  const shActive = staticSettings.singularityHarnessEquipped && scenario.enemyFlameTagged

  const acpMult = scenario.acpShockwaveActive
    ? resolveAcpShockwaveMultiplier(staticSettings.acpRarity)
    : 0

  return {
    chainLightningShock: scenario.enemyShocked
      ? {
        active: true,
        shockMultiplier: resolveEffectiveShockMultiplier(
          staticSettings.shockMultiplierLabLevel,
          staticSettings.dimensionCoreRarity,
        ),
        shockStack,
      }
      : undefined,
    amplifyBot: scenario.amplifyBotOnEnemy
      ? {
        active: true,
        amplifyBonusMultiplier: resolveAmplifyBotBonusMultiplierFromLevel(
          staticSettings.amplifyBotBonusLevel,
        ),
      }
      : undefined,
    flameModuleDebuff: shActive ? { active: true } : undefined,
    shockwaveMultiplier: acpMult > 0 ? acpMult : undefined,
    protectorDamageReduction: scenario.protectorAuraActive
      ? resolveProtectorDamageReductionMult(staticSettings.protectorReductionLabLevel)
      : undefined,
  }
}

export function resolveIlmHitMultiplierBreakdown(
  staticSettings: IlmCalcsStaticSettings,
  scenario: IlmCalcsScenarioSettings,
): IlmHitMultiplierBreakdown {
  const input = buildEnemyHitMultiplierInput(staticSettings, scenario)
  const effectiveShockLabMultiplier = resolveEffectiveShockMultiplier(
    staticSettings.shockMultiplierLabLevel,
    staticSettings.dimensionCoreRarity,
  )
  const dcMaxStack = resolveDimensionCoreMaxShockStack(staticSettings.dimensionCoreRarity)
  const shockStack = input.chainLightningShock?.active
    ? (input.chainLightningShock.shockStack ?? 0)
    : 0
  const shockMultiplier = input.chainLightningShock?.active
    ? chainLightningShockMultiplier(effectiveShockLabMultiplier, shockStack)
    : 1

  return {
    total: enemyHitMultiplier(input),
    shockMultiplier,
    shockStack,
    effectiveShockLabMultiplier,
    dimensionCoreDoublesShock: isDimensionCoreEquipped(staticSettings.dimensionCoreRarity),
    dimensionCoreMaxShockStack: dcMaxStack,
    amplifyBotMultiplier: scenario.amplifyBotOnEnemy
      ? resolveAmplifyBotBonusMultiplierFromLevel(staticSettings.amplifyBotBonusLevel)
      : 1,
    singularityHarnessActive: Boolean(input.flameModuleDebuff?.active),
    acpShockwaveMultiplier: input.shockwaveMultiplier ?? 0,
    protectorDamageReduction: input.protectorDamageReduction ?? 1,
  }
}

export function resolveEnemyHitMultiplierFromIlmSettings(settings: IlmCalcsSettings): number {
  return enemyHitMultiplier(buildEnemyHitMultiplierInput(settings.static, settings.scenario))
}

export function buildIlmCalculatorInputFromSettings(
  settings: IlmCalcsSettings,
  waveTimeSeconds: number,
): IlmCalculatorInput {
  const hitMultiplier = resolveEnemyHitMultiplierFromIlmSettings(settings)
  return {
    towerDamage: resolveIlmTowerDamage(settings.static),
    ilmDamageMult: resolveIlmUwDamageMult(settings.static),
    mineAgeSeconds: resolveMineAgeSecondsFromWaves(
      settings.scenario.mineAgeWaves,
      waveTimeSeconds,
    ),
    chargedMinesLevel: settings.static.chargedMinesLevel,
    chronoJumpLabLevel: settings.static.chronoJumpLabLevel,
    timesHitByIlm: settings.scenario.timesHitByIlm,
    chargedMinesActive: settings.static.chargedMinesActive,
    moduleBonus: resolveIlmUwModuleBonus(settings.static),
    hitMultiplier,
    ultimateCritDisplayFactor: 1,
  }
}

export function resolveIlmDamageChainBreakdown(
  settings: IlmCalcsSettings,
  waveTimeSeconds: number,
): IlmDamageChainBreakdown {
  const input = buildIlmCalculatorInputFromSettings(settings, waveTimeSeconds)
  const staticSettings = settings.static
  return {
    towerDamageBase: resolveTowerDamageFromAttackLevel(staticSettings.attackDamageLevel),
    cannonModuleMult: resolveIlmCannonModuleMult(staticSettings),
    towerDamage: input.towerDamage,
    uwDamageMultBase: resolveInnerLandMinesDamageMult(staticSettings.damageLevel),
    uwDamageSubstatAdditive: resolveIlmDamageSubstatAdditive(staticSettings),
    uwDamageMult: input.ilmDamageMult,
    coreModuleMult: resolveIlmDetonationModuleMult(staticSettings),
    charge: 1,
    hitMultiplier: input.hitMultiplier ?? 1,
  }
}

export function resolveIlmCoreModuleCombinedMult(staticSettings: IlmCalcsStaticSettings): number {
  return resolveIlmDetonationModuleMult(staticSettings)
}

export function resolveIlmDamageSubstatBonus(staticSettings: IlmCalcsStaticSettings): number {
  return resolveIlmDamageSubstatAdditive(staticSettings)
}

// Back-compat: callers pass full static settings
export function resolveDimensionCoreMaxShockStackFromSettings(
  staticSettings: IlmCalcsStaticSettings,
): number {
  return resolveDimensionCoreMaxShockStack(staticSettings.dimensionCoreRarity)
}

export function resolveEffectiveShockMultiplierFromSettings(
  shockMultiplierLabLevel: number,
  staticSettings: IlmCalcsStaticSettings,
): number {
  return resolveEffectiveShockMultiplier(shockMultiplierLabLevel, staticSettings.dimensionCoreRarity)
}

export function resolveAcpShockwaveMultiplierFromSettings(
  staticSettings: IlmCalcsStaticSettings,
): number {
  return resolveAcpShockwaveMultiplier(staticSettings.acpRarity)
}
