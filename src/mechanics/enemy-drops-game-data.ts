/**
 * Module drop, shatter, and reroll constants from tower mechanics tables.
 */

import { MAX_CAMPAIGN_TIER } from '../data/index'
import { findLabResearchBySlug } from '../data/index'
import { getSharedToolLabs, resolveLabValueAtLevel } from '../data/index'
import type { SharedEnemyDropsInputs } from '../internal/enemy-drops-calcs-local-state'
import { clamp } from './math'

/** labBenefit × 0.01 + base. */
export const MODULE_DROP_LAB_MULT = 0.01

/** Common module drop base before lab. */
export const COMMON_MODULE_DROP_BASE = 0.02

/** Rare module drop base before lab. */
export const RARE_MODULE_DROP_BASE = 0.005

/** Boss reroll shard proc chance (`TryRerollShardsDrop`). */
export const BOSS_REROLL_SHARDS_PROC = 0.15

/**
 * Base reroll shards by tier before reroll_shards lab.
 * GetNumberOfRerollShards / GetNumberOfFetchRerollShards tier table (tiers 2–24).
 */
export const REROLL_SHARDS_BY_TIER: readonly number[] = [
  2, 3, 4, 6, 8, 12, 18, 25, 32, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105,
] as const

export type ModuleShatterRarity = 'common' | 'rare' | 'rarePlus' | 'epic'

const SHATTER_RARITY_CONFIG: Record<ModuleShatterRarity, { scale: number, constant: number }> = {
  common: { scale: 5, constant: 5 },
  rare: { scale: 30, constant: 30 },
  rarePlus: { scale: 10, constant: 10 },
  epic: { scale: 90, constant: 90 },
}

export interface ResolvedEnemyDropsLabs {
  commonDropChance: number
  rareDropChance: number
  rerollShardsBenefit: number
  shatterBenefit: number
  deathWaveCellsBonus: number
}

function resolveLabBenefitBySlug(slug: string, level: number): number {
  if (level <= 0) return 0
  const labs = getSharedToolLabs()
  const research = findLabResearchBySlug(slug)
  const lab = labs.find(entry => entry.name === slug || (research && entry.displayName === research.displayName))
  if (!lab) return 0
  return resolveLabValueAtLevel(lab, level)
}

export function getCommonModuleDropChance(labBenefit: number): number {
  return clamp(labBenefit * MODULE_DROP_LAB_MULT + COMMON_MODULE_DROP_BASE, 0, 1)
}

export function getRareModuleDropChance(labBenefit: number): number {
  return clamp(labBenefit * MODULE_DROP_LAB_MULT + RARE_MODULE_DROP_BASE, 0, 1)
}

export function getRerollShardsBaseForTier(tier: number): number {
  const t = clamp(Math.floor(tier), 1, MAX_CAMPAIGN_TIER)
  if (t < 2) return 1
  const index = t - 2
  return REROLL_SHARDS_BY_TIER[index] ?? REROLL_SHARDS_BY_TIER[REROLL_SHARDS_BY_TIER.length - 1] ?? 1
}

/** Rounds reroll_shards lab benefit and adds to tier base. */
export function getBossRerollShardCount(tier: number, rerollShardsLabBenefit: number): number {
  const base = getRerollShardsBaseForTier(tier)
  const labBonus = Number.isFinite(rerollShardsLabBenefit) ? Math.round(rerollShardsLabBenefit) : 0
  return base + labBonus
}

export function getFetchRerollShardCount(tier: number, rerollShardsLabBenefit: number): number {
  return getBossRerollShardCount(tier, rerollShardsLabBenefit)
}

/** Expected boss reroll shards per kill (15% proc × count). */
export function getExpectedBossRerollShardsPerKill(tier: number, rerollShardsLabBenefit: number): number {
  return getBossRerollShardCount(tier, rerollShardsLabBenefit) * BOSS_REROLL_SHARDS_PROC
}

/** floor(shatterBenefit / 100 × scale) + constant per GetShatterShards rarity branch. */
export function getShatterShards(rarity: ModuleShatterRarity, shatterLabBenefit: number): number {
  const config = SHATTER_RARITY_CONFIG[rarity]
  const benefit = Math.max(0, shatterLabBenefit)
  return Math.floor(benefit / 100 * config.scale) + config.constant
}

export function resolveEnemyDropsLabBenefits(
  levels: {
    commonDropLabLevel: number
    rareDropLabLevel: number
    rerollShardsLabLevel: number
    shatterShardsLabLevel: number
    deathWaveCellsBonusLevel: number
  },
): ResolvedEnemyDropsLabs {
  const commonBenefit = resolveLabBenefitBySlug('common_drop_chance', levels.commonDropLabLevel)
  const rareBenefit = resolveLabBenefitBySlug('rare_drop_chance', levels.rareDropLabLevel)
  const rerollBenefit = resolveLabBenefitBySlug('reroll_shards', levels.rerollShardsLabLevel)
  const shatterBenefit = resolveLabBenefitBySlug('shatter_shards', levels.shatterShardsLabLevel)
  const deathWaveBenefit = resolveLabBenefitBySlug('death_wave_cells_bonus', levels.deathWaveCellsBonusLevel)

  return {
    commonDropChance: getCommonModuleDropChance(commonBenefit),
    rareDropChance: getRareModuleDropChance(rareBenefit),
    rerollShardsBenefit: rerollBenefit,
    shatterBenefit,
    deathWaveCellsBonus: deathWaveBenefit,
  }
}

/**
 * In-game Fetch drop table (Drop Table UI, confirmed Jun 2026).
 * Percents are per successful find proc; coins (86.5%) omitted from resource EV sim.
 * Daily caps: gems 20, medals 10, common modules 5, rare modules 2.
 */
export const FETCH_LOOT_OUTCOME_WEIGHTS = {
  gems: 0.04,
  medals: 0.02,
  rerollShards: 0.03,
  cannonShard: 0.01,
  armorShard: 0.01,
  generatorShard: 0.01,
  coreShard: 0.01,
  commonModule: 0.004,
  rareModule: 0.001,
  coins: 0.865,
} as const

export const FETCH_LOOT_DAILY_CAPS = {
  gems: 20,
  medals: 10,
  commonModule: 5,
  rareModule: 2,
} as const
