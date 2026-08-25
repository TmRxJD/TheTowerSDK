import type { EnemyWaveEnemyType } from './enemy-wave-stats'
import { clampCampaignTier } from '../data/index'
import { getBasicEnemyWaveStats } from './enemy-wave-stats'
import { getTierBattleConditionLevel } from '../data/index'
import type { TournamentLeague } from '../data/index'
import { applyTierBattleConditionsToSkipChance } from './enemy-level-skip'
import {
  type BattleConditionSelection,
  BC_TIER_MIN,
  computeBossUltimateHeatFactor,
  ENEMY_STATS_BATTLE_CONDITION_NAMES,
  type EnemyStatsBattleConditionName,
  filterEnemyStatsBattleConditions,
  getBattleConditionLevel,
  getWaveInfoBattleConditions,
  mergeEnemyStatsBattleConditions,
} from './battle-condition-config'
import {
  bcCounterLabBenefitIncreaseAtLevel,
  computeEnemyStatLevelWithBcLabs,
  mergeWorkshopBcLabLevels,
} from './bc-counter-labs'
import {
  type EnemyHeaderPerkToggles,
  waveBaseDamageForHeader,
  waveInfoDisplayMultipliers,
} from './enemy-stat-display'
import { getWaveInfoEnemyStats } from './wave-info-enemy-stats'

export type SimplifiedEnemyStatsMode = 'wave' | 'hp' | 'damage' | 'els'

export type EnemyStatsPerkState = EnemyHeaderPerkToggles

export const ENEMY_STATS_PERK_KEYS = [
  'perkEnemyHpMinus50',
  'perkBossHpX8',
  'perkBossHpMinus70',
  'perkEnemyDmgMinus50',
  'perkEnemyDmgX25',
  'perkRangedDmgX3',
] as const satisfies readonly (keyof EnemyStatsPerkState)[]

export const defaultEnemyStatsPerkState: Readonly<EnemyStatsPerkState> = {
  perkEnemyHpMinus50: false,
  perkBossHpX8: false,
  perkBossHpMinus70: false,
  perkEnemyDmgMinus50: false,
  perkEnemyDmgX25: false,
  perkRangedDmgX3: false,
}

export const SIMPLIFIED_ENEMY_WAVE_TYPES: EnemyWaveEnemyType[] = [
  'Basic',
  'Fast',
  'Tank',
  'Ranged',
  'Boss',
  'Protector',
  'Vampire',
  'Scatter',
  'Ray',
  'Saboteur',
  'Commander',
  'Overcharge',
]

export type EnemyStatsModifierInput = {
  tier: number
  healthSkipPct: number
  attackSkipPct: number
  healthSkipCount?: number | null
  attackSkipCount?: number | null
  perks: EnemyStatsPerkState
  enabledBattleConditions: readonly EnemyStatsBattleConditionName[]
  /** Full BC rows (levels for tournament heat). Falls back to enabled-only names when omitted. */
  battleConditions?: readonly BattleConditionSelection[]
  bcCounterLabLevels?: Readonly<Record<string, number>>
  researchLabLevels?: Readonly<Record<string, number>>
  tournament?: boolean
  tournamentLeague?: TournamentLeague | null
  /** Wave Info raw stats — skip trade-off page perk display layer (Damage Reduction applies perks separately). */
  skipPagePerkMults?: boolean
}

export type SimplifiedEnemyStatsInput = EnemyStatsModifierInput & {
  wave: number
}

export type SimplifiedEnemyWaveRow = {
  enemyType: EnemyWaveEnemyType
  hp: number
  damage: number
}

export type SimplifiedEnemyReverseRow = {
  enemyType: EnemyWaveEnemyType
  foundWave: number
  hp: number
  damage: number
}

const MAX_WAVE_SEARCH = 10_000_000

function clampTier(tier: number): number {
  return clampCampaignTier(tier)
}

function clampWave(wave: number): number {
  return Math.max(1, Math.floor(wave))
}

function clampSkipPct(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

function getTierElsReductionPct(tier: number): number {
  return getTierBattleConditionLevel(tier, 'ELS Reduction')
}

function resolveBattleConditionsForWave(
  tier: number,
  wave: number,
  modifiers: EnemyStatsModifierInput,
): BattleConditionSelection[] {
  const userSelections = modifiers.battleConditions?.length
    ? [...modifiers.battleConditions]
    : mergeEnemyStatsBattleConditions(
      ENEMY_STATS_BATTLE_CONDITION_NAMES.map(name => ({
        name,
        enabled: modifiers.enabledBattleConditions.includes(name),
        level: 0,
      })),
    )
  return getWaveInfoBattleConditions(
    tier,
    modifiers.tournament ?? false,
    modifiers.tournamentLeague ?? null,
    wave,
    userSelections,
  )
}

function resolveStatLevelFromModifiers(
  wave: number,
  skipPct: number,
  skipCount: number | null | undefined,
  modifiers: EnemyStatsModifierInput,
): number {
  const w = clampWave(wave)
  const battleConditions = resolveBattleConditionsForWave(modifiers.tier, w, modifiers)
  const bcLabs = modifiers.bcCounterLabLevels ?? {}
  return computeEnemyStatLevelWithBcLabs(
    w,
    skipPct,
    skipCount,
    bcLabs,
    modifiers.tier,
    modifiers.tournament ?? false,
    modifiers.tournamentLeague ?? null,
    battleConditions,
  )
}

export function getEnemyStatsBattleConditions(
  tier: number,
  wave: number,
  enabledBattleConditions: readonly EnemyStatsBattleConditionName[],
): BattleConditionSelection[] {
  const userSelections = mergeEnemyStatsBattleConditions(
    ENEMY_STATS_BATTLE_CONDITION_NAMES.map(name => ({
      name,
      enabled: enabledBattleConditions.includes(name),
      level: 0,
    })),
  )

  if (tier >= BC_TIER_MIN) {
    return getWaveInfoBattleConditions(tier, false, null, wave, userSelections)
  }

  return filterEnemyStatsBattleConditions(
    userSelections
      .filter(row => row.enabled)
      .map(row => ({ ...row, level: 1 })),
  )
}

export function computeEffectiveEnemySkipPct(
  skipPct: number,
  tier: number,
  wave: number,
  battleConditions: readonly BattleConditionSelection[],
): number {
  const stored = clampSkipPct(skipPct) / 100
  const elsFromConditions = getBattleConditionLevel(battleConditions, 'ELS Reduction')
  const elsFromTier = tier >= BC_TIER_MIN ? getTierElsReductionPct(tier) : 0
  const multiplyLevel = getBattleConditionLevel(battleConditions, 'Skip Reduction - Multiply')
    || (tier >= BC_TIER_MIN ? getTierBattleConditionLevel(tier, 'Skip Reduction - Multiply') : 0)

  const adjusted = applyTierBattleConditionsToSkipChance(stored, {
    elsReductionLevel: elsFromConditions > 0 ? elsFromConditions : elsFromTier,
    elsReductionLabMitigationPct: 0,
    skipReductionMultiplyLevel: multiplyLevel >= 1 ? multiplyLevel : undefined,
  })

  return Math.min(100, Math.max(0, adjusted * 100))
}

export function getEnemyStatsAtWave(
  tier: number,
  wave: number,
  enemyType: EnemyWaveEnemyType,
  modifiers: EnemyStatsModifierInput,
): { hp: number, damage: number } {
  const t = clampTier(tier)
  const w = clampWave(wave)
  const modifierCtx: EnemyStatsModifierInput = { ...modifiers, tier: t }
  const battleConditions = resolveBattleConditionsForWave(t, w, modifierCtx)
  const hpWave = resolveStatLevelFromModifiers(w, modifiers.healthSkipPct, modifiers.healthSkipCount, modifierCtx)
  const damageWave = resolveStatLevelFromModifiers(w, modifiers.attackSkipPct, modifiers.attackSkipCount, modifierCtx)
  const basicHp = getBasicEnemyWaveStats(t, hpWave, false)
  const basicDamage = getBasicEnemyWaveStats(t, damageWave, false)
  const bcLabLevels = mergeWorkshopBcLabLevels(
    modifiers.bcCounterLabLevels,
    modifiers.researchLabLevels,
  )
  const waveInfo = getWaveInfoEnemyStats({
    waveBaseHp: basicHp.hp,
    waveBaseDamage: basicDamage.damage,
    wave: w,
    tier: t,
    enemyType,
    battleConditions,
    bcLabLevels,
    labBenefitIncreaseAtLevel: bcCounterLabBenefitIncreaseAtLevel,
    bossUltimateHeatFactor: modifiers.tournament && modifiers.tournamentLeague
      ? computeBossUltimateHeatFactor(modifiers.tournamentLeague, w)
      : 1,
  })

  const perkMult = modifiers.skipPagePerkMults
    ? { hp: 1, damage: 1 }
    : waveInfoDisplayMultipliers({
      enemyType,
      toggles: modifiers.perks,
      improveTradeOffLabPct: 0,
    })

  return {
    hp: Math.floor(waveInfo.hp * perkMult.hp),
    damage: Math.floor(waveBaseDamageForHeader(waveInfo.damage) * perkMult.damage),
  }
}

function findWaveForTarget(
  tier: number,
  enemyType: EnemyWaveEnemyType,
  target: number,
  stat: 'hp' | 'damage',
  modifiers: EnemyStatsModifierInput,
): number | null {
  if (!Number.isFinite(target) || target <= 0) return null

  let hi = MAX_WAVE_SEARCH
  while (hi > 1) {
    const value = stat === 'hp'
      ? getEnemyStatsAtWave(tier, hi, enemyType, modifiers).hp
      : getEnemyStatsAtWave(tier, hi, enemyType, modifiers).damage
    if (value > 0) break
    hi = Math.floor(hi / 2)
  }

  const maxValue = stat === 'hp'
    ? getEnemyStatsAtWave(tier, hi, enemyType, modifiers).hp
    : getEnemyStatsAtWave(tier, hi, enemyType, modifiers).damage
  if (maxValue <= 0 || target > maxValue) return null

  let lo = 1
  let searchHi = hi
  let best: number | null = null

  while (lo <= searchHi) {
    const mid = Math.floor((lo + searchHi) / 2)
    const value = stat === 'hp'
      ? getEnemyStatsAtWave(tier, mid, enemyType, modifiers).hp
      : getEnemyStatsAtWave(tier, mid, enemyType, modifiers).damage
    if (value <= 0) {
      searchHi = mid - 1
      continue
    }
    if (value <= target) {
      best = mid
      lo = mid + 1
    } else {
      searchHi = mid - 1
    }
  }

  return best
}

export function computeSimplifiedEnemyWaveTable(input: SimplifiedEnemyStatsInput): {
  wave: number
  tier: number
  waveBaseHp: number
  waveBaseDamage: number
  rows: SimplifiedEnemyWaveRow[]
} {
  const tier = clampTier(input.tier)
  const wave = clampWave(input.wave)
  const modifiers: EnemyStatsModifierInput = {
    tier,
    healthSkipPct: input.healthSkipPct,
    attackSkipPct: input.attackSkipPct,
    perks: input.perks,
    enabledBattleConditions: input.enabledBattleConditions,
  }
  const waveBase = getEnemyStatsAtWave(tier, wave, 'Basic', modifiers)
  const rows = SIMPLIFIED_ENEMY_WAVE_TYPES.map(enemyType => {
    const stats = getEnemyStatsAtWave(tier, wave, enemyType, modifiers)
    return {
      enemyType,
      hp: stats.hp,
      damage: stats.damage,
    }
  })

  return {
    wave,
    tier,
    waveBaseHp: waveBase.hp,
    waveBaseDamage: waveBase.damage,
    rows,
  }
}

export function computeSimplifiedEnemyReverseTable(input: {
  mode: 'hp' | 'damage'
  tier: number
  target: number
  healthSkipPct: number
  attackSkipPct: number
  perks: EnemyStatsPerkState
  enabledBattleConditions: readonly EnemyStatsBattleConditionName[]
}): {
    tier: number
    target: number
    rows: SimplifiedEnemyReverseRow[]
  } {
  const tier = clampTier(input.tier)
  const target = Math.max(0, Math.floor(input.target))
  const modifiers: EnemyStatsModifierInput = {
    tier,
    healthSkipPct: input.healthSkipPct,
    attackSkipPct: input.attackSkipPct,
    perks: input.perks,
    enabledBattleConditions: input.enabledBattleConditions,
  }
  const rows = SIMPLIFIED_ENEMY_WAVE_TYPES.map(enemyType => {
    const foundWave = findWaveForTarget(tier, enemyType, target, input.mode, modifiers) ?? 0
    const displayWave = foundWave > 0 ? foundWave : 1
    const stats = getEnemyStatsAtWave(tier, displayWave, enemyType, modifiers)
    return {
      enemyType,
      foundWave,
      hp: stats.hp,
      damage: stats.damage,
    }
  })

  return {
    tier,
    target,
    rows,
  }
}
