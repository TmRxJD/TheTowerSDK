import { clampCampaignTier } from '../data/campaign-tier'
import {
  computeWaveBaseDamage,
  computeWaveBaseHealth,
} from '../mechanics/wave-base-scaling'
import { ENEMY_TYPE_MULT_TABLE } from '../mechanics/enemy-type-mults'

export type EnemyWaveEnemyType = keyof typeof ENEMY_TYPE_MULT_TABLE

export interface EnemyWaveBaseStats {
  hp: number
  damage: number
}

export interface EnemyWaveStats extends EnemyWaveBaseStats {
  tier: number
  wave: number
  enemyType: EnemyWaveEnemyType
  tournament: boolean
}

export const ENEMY_TYPE_MULT = ENEMY_TYPE_MULT_TABLE

export interface EnemyWaveScalingContext {
  tournament?: boolean
  /** CustomizeGame.isTestingTournamentConditions — dev BC test mode only. */
  isTestingTournamentConditions?: boolean
  /** @deprecated Use isTestingTournamentConditions */
  tournamentLeague?: boolean
}

function resolveWaveInput(
  tier: number,
  wave: number,
  context: boolean | EnemyWaveScalingContext = false,
) {
  const t = clampCampaignTier(tier)
  const w = Math.max(1, Math.floor(wave))
  const tournament = typeof context === 'boolean' ? context : (context.tournament ?? false)
  const tournamentLeague = typeof context === 'boolean'
    ? undefined
    : context.tournamentLeague
  const isTesting = typeof context === 'boolean'
    ? undefined
    : context.isTestingTournamentConditions
  return {
    wave: w,
    tier: t,
    tournament,
    ...(isTesting != null ? { isTestingTournamentConditions: isTesting } : {}),
    ...(tournamentLeague != null && isTesting == null
      ? { tournamentLeague }
      : {}),
  }
}

export function getBasicEnemyWaveStats(
  tier: number,
  wave: number,
  context: boolean | EnemyWaveScalingContext = false,
): EnemyWaveBaseStats {
  const input = resolveWaveInput(tier, wave, context)
  return {
    hp: computeWaveBaseHealth(input),
    damage: computeWaveBaseDamage(input),
  }
}

export function getWaveBaseStats(wave: number): EnemyWaveBaseStats {
  return getBasicEnemyWaveStats(1, wave, false)
}

export function getEnemyWaveStats(
  tier: number,
  wave: number,
  enemyType: EnemyWaveEnemyType = 'Basic',
  context: boolean | EnemyWaveScalingContext = false,
): EnemyWaveStats | null {
  const input = resolveWaveInput(tier, wave, context)
  const typeMult = ENEMY_TYPE_MULT[enemyType]
  if (!typeMult) return null

  const base = getBasicEnemyWaveStats(input.tier, input.wave, context)

  return {
    tier: input.tier,
    wave: input.wave,
    enemyType,
    tournament: input.tournament,
    hp: Math.floor(base.hp * typeMult.hp),
    damage: Math.floor(base.damage * typeMult.damage),
  }
}
