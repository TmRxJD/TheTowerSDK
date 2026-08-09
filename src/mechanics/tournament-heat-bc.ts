/**
 * Tournament heat → BC level math.
 *
 * - `GetEnemyLevelSkipReductionSubtract`: `GetTotalBCModifier(209) × heatLevel[22] × 0.005`
 * - Guaranteed league ELS caps: Gold 10, Platinum 20, Champion 30, Legend 50
 * - Heat ramps with wave via the same breakpoint table used by thorns / Wave Info
 */
import { getTierBattleConditionLevel } from '../data/tiers'
import { V283_HEAT_BC_INDEX } from '../data/generated/index'
import type { TournamentHeatProfile, TournamentLeague } from '../data/tournaments'
import { TOURNAMENT_HEAT_PROFILES } from '../data/tournaments'

/** `CustomizeGame.heatLevel` index for ELS Reduction (v28.3 native-confirmed). */
export const HEAT_BC_INDEX_ELS_REDUCTION = V283_HEAT_BC_INDEX.elsReduction

/** League guaranteed ELS Reduction max level (percent points before heat ramp). */
export const GUARANTEED_ELS_REDUCTION_MAX: Readonly<Record<TournamentLeague, number>> = {
  Copper: 0,
  Silver: 0,
  Gold: 10,
  Platinum: 20,
  Champion: 30,
  Legend: 50,
}

/** Heat wave breakpoints → effectiveness % (shared with thorns calculator). */
export const TOURNAMENT_HEAT_WAVE_TABLE = [
  { wave: 0, t11: 95, t14: 95 },
  { wave: 20, t11: 90, t14: 90 },
  { wave: 40, t11: 80, t14: 80 },
  { wave: 60, t11: 75, t14: 75 },
  { wave: 80, t11: 70, t14: 70 },
  { wave: 100, t11: 65, t14: 65 },
  { wave: 150, t11: 60, t14: 60 },
  { wave: 200, t11: 58, t14: 58 },
  { wave: 250, t11: 56, t14: 56 },
  { wave: 300, t11: 54, t14: 54 },
  { wave: 350, t11: 52, t14: 50 },
  { wave: 400, t11: 50, t14: 45 },
  { wave: 450, t11: 48, t14: 40 },
  { wave: 500, t11: 46, t14: 35 },
  { wave: 600, t11: 44, t14: 30 },
  { wave: 700, t11: 40, t14: 25 },
  { wave: 800, t11: 35, t14: 20 },
  { wave: 900, t11: 30, t14: 15 },
  { wave: 1000, t11: 20, t14: 5 },
] as const

export function getTournamentHeatProfile(league: TournamentLeague | null): TournamentHeatProfile | undefined {
  if (!league) return undefined
  return TOURNAMENT_HEAT_PROFILES.find(row => row.league === league)
}

export function tournamentLeagueHasHeat(league: TournamentLeague | null): boolean {
  return getTournamentHeatProfile(league)?.hasHeat ?? false
}

function useT14HeatColumn(league: TournamentLeague | null): boolean {
  return league === 'Gold' || league === 'Platinum' || league === 'Champion' || league === 'Legend'
}

/**
 * Resistance BC retention % at a run wave (thorns, random heat BCs, etc.).
 * Decreases as tournament heat builds; see {@link getHeatRampPercent} for ramp-up strength.
 */
export function getHeatEffectivenessPercent(
  wave: number,
  league: TournamentLeague | null,
): number {
  if (!tournamentLeagueHasHeat(league)) return 0
  const w = Math.max(0, Math.floor(wave))
  let selected: (typeof TOURNAMENT_HEAT_WAVE_TABLE)[number] = TOURNAMENT_HEAT_WAVE_TABLE[0]
  for (const row of TOURNAMENT_HEAT_WAVE_TABLE) {
    if (w >= row.wave) selected = row
  }
  return useT14HeatColumn(league) ? selected.t14 : selected.t11
}

/**
 * Tournament heat ramp % (0 at run start → ~95 at wave 1000).
 * Complement of {@link getHeatEffectivenessPercent}; used by debuff heat BCs such as ELS Reduction.
 */
export function getHeatRampPercent(
  wave: number,
  league: TournamentLeague | null,
): number {
  if (!tournamentLeagueHasHeat(league)) return 0
  return 100 - getHeatEffectivenessPercent(wave, league)
}

/** ELS Reduction BC level from league cap × heat ramp (heatLevel[22] in binary). */
export function deriveElsReductionHeatLevel(
  league: TournamentLeague | null,
  wave: number,
): number {
  if (!league) return 0
  const max = GUARANTEED_ELS_REDUCTION_MAX[league]
  if (max <= 0) return 0
  const rampPct = getHeatRampPercent(wave, league)
  return Math.round(max * rampPct / 100)
}

/**
 * Campaign Wave Info `heatLevel[22]` — tier ELS cap plus one level per heat wave step.
 * Matches in-game BC tooltip level at high wave (e.g. tier 20 wave 7324 → 55, not static 35).
 */
export const CAMPAIGN_ELS_REDUCTION_HEAT_WAVES_PER_LEVEL = 366

export function deriveCampaignElsReductionHeatLevel(
  tier: number,
  wave: number,
): number {
  const tierCap = getTierBattleConditionLevel(tier, 'ELS Reduction')
  if (tierCap <= 0) return 0
  const w = Math.max(1, Math.floor(wave))
  return tierCap + Math.floor((w - 1) / CAMPAIGN_ELS_REDUCTION_HEAT_WAVES_PER_LEVEL)
}

/**
 * Random tournament BC level when heat tier exceeds 18 → level 100.
 * Below that, scale resistance BCs with the same heat effectiveness curve.
 */
export function deriveRandomHeatBcLevel(
  league: TournamentLeague | null,
  wave: number,
): number {
  const profile = getTournamentHeatProfile(league)
  if (!profile?.hasHeat) return 0
  const every = profile.moreBossesEveryWaves
  const heatTier = every > 0 ? Math.floor(Math.max(0, wave) / every) : 0
  if (heatTier > 18) return 100
  return getHeatEffectivenessPercent(wave, league)
}

/** heatLevel[18] scale used by GetUltimateBossModifier (Wave Info Boss HP only). */
export function deriveBossUltimateHeatFactor(
  league: TournamentLeague | null,
  wave: number,
): number {
  if (!tournamentLeagueHasHeat(league)) return 1
  return getHeatEffectivenessPercent(wave, league) / 100
}

/** More Bosses BC level from league profile (boss interval is fixed per league). */
export function deriveMoreBossesHeatLevel(league: TournamentLeague | null): number {
  const profile = getTournamentHeatProfile(league)
  if (!profile) return 0
  return Math.max(0, 11 - profile.moreBossesEveryWaves)
}
