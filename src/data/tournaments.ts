import {
  TIER_BATTLE_CONDITION_DEFINITIONS,
  type TierBattleConditionDefinition,
} from './tiers'
import { clampCampaignTier, MAX_CAMPAIGN_TIER } from './campaign-tier'

export type TournamentLeague = 'Copper' | 'Silver' | 'Gold' | 'Platinum' | 'Champion' | 'Legend'

export interface TournamentScheduleSlot {
  day: 'Wednesday' | 'Saturday'
  startUtc: string
}

export interface TournamentUnlockRequirement {
  tier: number
  wave: number
  milestoneLabel: string
}

export interface TournamentTicketModel {
  runCostTickets: number
  freeTicketsPerStart: number
  adTicketsAvailable: boolean
  baseGemCost: number
  incrementalGemCost: number
  cannotJoinDuringActiveRun: boolean
  highestWaveDeterminesRank: boolean
}

export interface TournamentLeagueDefinition {
  league: TournamentLeague
  order: number
  playerCount: number
  rewardCurrencies: readonly string[]
}

export interface TournamentPromotionRule {
  league: TournamentLeague
  promotedRankMax: number
  promotesTo: TournamentLeague | null
  demotedRankMin: number | null
  demotesTo: TournamentLeague | null
  protectedFromDemotionOnceLeft: boolean
}

export interface TournamentHeatProfile {
  league: TournamentLeague
  hasHeat: boolean
  moreBossesEveryWaves: number
  randomBattleConditionCount: number
  guaranteedHeatRules: readonly string[]
}

export interface TournamentRewardRow {
  league: TournamentLeague
  rank: string
  gems: number
  stones: number
  keys: number
}

export interface TournamentLeagueRewardTable {
  league: TournamentLeague
  rewards: readonly TournamentRewardRow[]
}

export type TournamentBattleConditionDefinition = TierBattleConditionDefinition

function createLeagueDefinition(
  league: TournamentLeague,
  order: number,
  rewardCurrencies: readonly string[],
): TournamentLeagueDefinition {
  return {
    league,
    order,
    playerCount: 30,
    rewardCurrencies,
  }
}

function createPromotionRule(
  league: TournamentLeague,
  promotesTo: TournamentLeague | null,
  demotedRankMin: number | null,
  demotesTo: TournamentLeague | null,
  protectedFromDemotionOnceLeft = false,
): TournamentPromotionRule {
  return {
    league,
    promotedRankMax: 4,
    promotesTo,
    demotedRankMin,
    demotesTo,
    protectedFromDemotionOnceLeft,
  }
}

function createHeatProfile(
  league: TournamentLeague,
  moreBossesEveryWaves: number,
  randomBattleConditionCount: number,
  guaranteedHeatRules: readonly string[] = [],
): TournamentHeatProfile {
  return {
    league,
    hasHeat: league !== 'Copper',
    moreBossesEveryWaves,
    randomBattleConditionCount,
    guaranteedHeatRules,
  }
}

function createRewardRow(
  league: TournamentLeague,
  rank: string,
  gems: number,
  stones: number,
  keys = 0,
): TournamentRewardRow {
  return {
    league,
    rank,
    gems,
    stones,
    keys,
  }
}

export const TOURNAMENT_OVERVIEW_FACTS = [
  'Tournaments are competitive events with 30 players per bracket.',
  'The six tournament leagues are Copper, Silver, Gold, Platinum, Champion, and Legend.',
  'Primary rewards are gems and power stones, and Legend additionally rewards keys used in the Vault tech trees.',
  'Tournaments are the main recurring source of power stones for Ultimate Weapon progression.',
] as const

export const TOURNAMENT_ENTRY_FACTS = [
  'Tournaments unlock at Milestones Tier 1 Wave 60.',
  'Entering a tournament run costs one tournament ticket.',
  'The highest wave reached in that run is the score used for tournament ranking and rewards.',
  'Tournaments cannot be joined while the account is already inside another active run.',
] as const

export const TOURNAMENT_TICKET_FACTS = [
  'One free ticket is granted whenever a tournament starts.',
  'Extra tickets can be earned by watching an ad or by spending gems.',
  'Gem ticket price starts at 10 gems and increases by 10 gems for each additional ticket purchased during the same tournament window.',
] as const

export const TOURNAMENT_PROMOTION_FACTS = [
  'As of v25, the top four players in each league are promoted to the next league.',
  'From Platinum onward, the bottom six players are demoted to the league below.',
  'Copper and Silver are protected leagues in the sense that once they are left, the account cannot be demoted back into them.',
] as const

export const TOURNAMENT_DIFFICULTY_FACTS = [
  'Tournament leagues use tier-plus difficulty, which scales enemy stats more aggressively than the normal tier ladder.',
  'League tier+ bases (v25+): Copper T1+, Silver T3+, Gold T5+, Platinum T8+, Champion T12+, Legend T17+.',
  'Copper is harder than Tier 1 but easier than Tier 2, while Champion sits between Tier 11 and Tier 12 in raw stat scaling.',
  'Enemy stat growth increases across leagues for health, attack, mass, and effective movement pressure.',
  'Heat ramps up over the run and reaches maximum strength at wave 1000 for most modifiers, while More Bosses stays fixed by league.',
] as const

export const TOURNAMENT_HEAT_FACTS = [
  'Heat is active in every league above Copper and adds static plus random battle-condition pressure to tournament runs.',
  'More Bosses is always present and shortens the boss cycle by league, from every 10 waves in Copper to every 5 waves in Legend.',
  'Gold, Platinum, Champion, and Legend also guarantee an enemy level skip reduction heat at 10%, 20%, 30%, and 50% respectively.',
  'From Platinum upward, either Death Defy Down or Energy Shields Down is also active alongside the league-specific random conditions.',
] as const

export const TOURNAMENT_REWARD_RULE_FACT = 'If players tie, every tied player receives the rewards of the lowest rank held within that tied group.'

export const TOURNAMENT_SCHEDULE = [
  { day: 'Wednesday', startUtc: '00:00' },
  { day: 'Saturday', startUtc: '00:00' },
] as const satisfies readonly TournamentScheduleSlot[]

export const TOURNAMENT_UNLOCK_REQUIREMENT = {
  tier: 1,
  wave: 60,
  milestoneLabel: 'Tier 1 Wave 60',
} as const satisfies TournamentUnlockRequirement

export const TOURNAMENT_TICKET_MODEL = {
  runCostTickets: 1,
  freeTicketsPerStart: 1,
  adTicketsAvailable: true,
  baseGemCost: 10,
  incrementalGemCost: 10,
  cannotJoinDuringActiveRun: true,
  highestWaveDeterminesRank: true,
} as const satisfies TournamentTicketModel

export const TOURNAMENT_LEAGUES = [
  createLeagueDefinition('Copper', 1, ['Gems', 'Power Stones']),
  createLeagueDefinition('Silver', 2, ['Gems', 'Power Stones']),
  createLeagueDefinition('Gold', 3, ['Gems', 'Power Stones']),
  createLeagueDefinition('Platinum', 4, ['Gems', 'Power Stones']),
  createLeagueDefinition('Champion', 5, ['Gems', 'Power Stones']),
  createLeagueDefinition('Legend', 6, ['Gems', 'Power Stones', 'Keys']),
] as const satisfies readonly TournamentLeagueDefinition[]

export const TOURNAMENT_PROMOTION_RULES = [
  createPromotionRule('Copper', 'Silver', null, null, true),
  createPromotionRule('Silver', 'Gold', null, null, true),
  createPromotionRule('Gold', 'Platinum', null, null, false),
  createPromotionRule('Platinum', 'Champion', 25, 'Gold', false),
  createPromotionRule('Champion', 'Legend', 25, 'Platinum', false),
  createPromotionRule('Legend', null, 25, 'Champion', false),
] as const satisfies readonly TournamentPromotionRule[]

export const TOURNAMENT_HEAT_PROFILES = [
  createHeatProfile('Copper', 10, 0),
  createHeatProfile('Silver', 9, 1),
  createHeatProfile('Gold', 8, 2, ['Enemy Level Skip Reduction 10%']),
  createHeatProfile('Platinum', 7, 3, ['Enemy Level Skip Reduction 20%', 'Death Defy Down or Energy Shields Down']),
  createHeatProfile('Champion', 6, 4, ['Enemy Level Skip Reduction 30%', 'Death Defy Down or Energy Shields Down']),
  createHeatProfile('Legend', 5, 5, ['Enemy Level Skip Reduction 50%', 'Death Defy Down or Energy Shields Down']),
] as const satisfies readonly TournamentHeatProfile[]

export const TOURNAMENT_BATTLE_CONDITION_DEFINITIONS =
  TIER_BATTLE_CONDITION_DEFINITIONS as readonly TournamentBattleConditionDefinition[]

export const TOURNAMENT_REWARD_ROWS = [
  createRewardRow('Copper', '1', 100, 20),
  createRewardRow('Copper', '2', 80, 18),
  createRewardRow('Copper', '3 - 4', 65, 16),
  createRewardRow('Copper', '5 - 6', 50, 12),
  createRewardRow('Copper', '7 - 8', 45, 10),
  createRewardRow('Copper', '9 - 10', 40, 9),
  createRewardRow('Copper', '11 - 12', 30, 8),
  createRewardRow('Copper', '13 - 15', 20, 7),
  createRewardRow('Copper', '16 - 22', 15, 6),
  createRewardRow('Copper', '23 - 30', 10, 5),
  createRewardRow('Silver', '1', 200, 40),
  createRewardRow('Silver', '2', 150, 35),
  createRewardRow('Silver', '3 - 4', 100, 30),
  createRewardRow('Silver', '5 - 6', 75, 20),
  createRewardRow('Silver', '7 - 8', 65, 19),
  createRewardRow('Silver', '9 - 10', 60, 18),
  createRewardRow('Silver', '11 - 12', 55, 17),
  createRewardRow('Silver', '13 - 15', 50, 16),
  createRewardRow('Silver', '16 - 22', 45, 14),
  createRewardRow('Silver', '23 - 30', 40, 12),
  createRewardRow('Gold', '1', 300, 80),
  createRewardRow('Gold', '2', 250, 70),
  createRewardRow('Gold', '3 - 4', 200, 60),
  createRewardRow('Gold', '5 - 6', 150, 40),
  createRewardRow('Gold', '7 - 8', 125, 30),
  createRewardRow('Gold', '9 - 10', 100, 28),
  createRewardRow('Gold', '11 - 12', 90, 26),
  createRewardRow('Gold', '13 - 15', 80, 24),
  createRewardRow('Gold', '16 - 22', 70, 22),
  createRewardRow('Gold', '23 - 30', 50, 20),
  createRewardRow('Platinum', '1', 400, 160),
  createRewardRow('Platinum', '2', 350, 140),
  createRewardRow('Platinum', '3 - 4', 300, 120),
  createRewardRow('Platinum', '5 - 6', 250, 70),
  createRewardRow('Platinum', '7 - 8', 225, 65),
  createRewardRow('Platinum', '9 - 10', 200, 60),
  createRewardRow('Platinum', '11 - 12', 175, 56),
  createRewardRow('Platinum', '13 - 15', 150, 53),
  createRewardRow('Platinum', '16 - 24', 125, 50),
  createRewardRow('Platinum', '25 - 30', 100, 20),
  createRewardRow('Champion', '1', 600, 320),
  createRewardRow('Champion', '2', 500, 300),
  createRewardRow('Champion', '3 - 4', 400, 280),
  createRewardRow('Champion', '5 - 6', 350, 200),
  createRewardRow('Champion', '7 - 8', 325, 175),
  createRewardRow('Champion', '9 - 10', 300, 150),
  createRewardRow('Champion', '11 - 12', 275, 125),
  createRewardRow('Champion', '13 - 15', 250, 100),
  createRewardRow('Champion', '16 - 24', 200, 90),
  createRewardRow('Champion', '25 - 30', 150, 20),
  createRewardRow('Legend', '1', 800, 425, 25),
  createRewardRow('Legend', '2', 700, 400, 20),
  createRewardRow('Legend', '3 - 4', 600, 375, 15),
  createRewardRow('Legend', '5 - 6', 500, 350, 10),
  createRewardRow('Legend', '7 - 8', 475, 325, 8),
  createRewardRow('Legend', '9 - 10', 450, 300, 6),
  createRewardRow('Legend', '11 - 12', 425, 275, 4),
  createRewardRow('Legend', '13 - 15', 400, 250, 2),
  createRewardRow('Legend', '16 - 24', 375, 225, 0),
  createRewardRow('Legend', '25 - 30', 200, 120, 0),
] as const satisfies readonly TournamentRewardRow[]

export const TOURNAMENT_REWARD_TABLES = TOURNAMENT_LEAGUES.map(league => ({
  league: league.league,
  rewards: TOURNAMENT_REWARD_ROWS.filter(row => row.league === league.league),
})) as readonly TournamentLeagueRewardTable[]

export function getTournamentLeagueDefinition(league: TournamentLeague): TournamentLeagueDefinition | undefined {
  return TOURNAMENT_LEAGUES.find(row => row.league === league)
}

export function getTournamentRewardsForLeague(league: TournamentLeague): readonly TournamentRewardRow[] {
  return TOURNAMENT_REWARD_ROWS.filter(row => row.league === league)
}

/**
 * @deprecated Misnamed legacy map — values are league ELS max levels ÷ 100, not flat skip subtracts.
 * Use `GUARANTEED_ELS_REDUCTION_MAX` from `tournament-heat-bc` and `computeElsReductionHeatLevel`.
 */
export const TOURNAMENT_ENEMY_LEVEL_SKIP_HEAT_SUBTRACT: Readonly<Record<TournamentLeague, number>> = {
  Copper: 0,
  Silver: 0,
  Gold: 0.10,
  Platinum: 0.20,
  Champion: 0.30,
  Legend: 0.50,
}

export function getTournamentEnemyLevelSkipHeatSubtract(league: TournamentLeague | null | undefined): number {
  if (!league) return 0
  return TOURNAMENT_ENEMY_LEVEL_SKIP_HEAT_SUBTRACT[league] ?? 0
}

/**
 * Tier+ base used for tournament enemy stat scaling per league.
 *
 * Game scaling bands (v25+): Copper T1+, Silver T3+, Gold T5+, Platinum T8+,
 * Champion T12+, Legend T17+. Previously Champion/Legend used T11+/T14+.
 *
 * All league entries are tournament runs (`tournament: true` in enemy-wave-stats).
 */
export const TOURNAMENT_LEAGUE_TIER_BASES: Readonly<Record<TournamentLeague, number>> = {
  Copper: 1,
  Silver: 3,
  Gold: 5,
  Platinum: 8,
  Champion: 12,
  Legend: 17,
}

export const TOURNAMENT_LEAGUE_LIST = TOURNAMENT_LEAGUES.map(row => row.league)

export function isTournamentLeague(value: unknown): value is TournamentLeague {
  return typeof value === 'string' && value in TOURNAMENT_LEAGUE_TIER_BASES
}

export function getTournamentLeagueTierBase(league: TournamentLeague): number {
  return TOURNAMENT_LEAGUE_TIER_BASES[league]
}

export function formatTournamentLeagueTierLabel(league: TournamentLeague): string {
  return `${league} (T${TOURNAMENT_LEAGUE_TIER_BASES[league]}+ Tournament)`
}

/** @deprecated Legacy thorns/enemy-stats values before league-unified tier list. */
export const LEGACY_TOURNAMENT_TIER_ALIASES = {
  t11: 'Champion',
  t14: 'Legend',
  t17: 'Legend',
} as const satisfies Record<string, TournamentLeague>

export type LegacyTournamentTierAlias = keyof typeof LEGACY_TOURNAMENT_TIER_ALIASES

export function normalizeLegacyTournamentTierAlias(value: unknown): TournamentLeague | null {
  if (typeof value !== 'string') return null
  if (value in LEGACY_TOURNAMENT_TIER_ALIASES) {
    return LEGACY_TOURNAMENT_TIER_ALIASES[value as LegacyTournamentTierAlias]
  }
  return isTournamentLeague(value) ? value : null
}

/** Normal tier 1–24 or tournament league (tier+ run). */
export type TierSelectionInput = number | TournamentLeague

function isExplicitStandardTierNumber(value: unknown): value is number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 1 && value <= MAX_CAMPAIGN_TIER
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || normalizeLegacyTournamentTierAlias(trimmed)) return false
    const tier = Math.round(Number(trimmed))
    return Number.isFinite(tier) && tier >= 1 && tier <= MAX_CAMPAIGN_TIER
  }
  return false
}

export function normalizeTierSelection(
  value: unknown,
  legacyTournamentLeague?: unknown,
): TierSelectionInput {
  const legacy = normalizeLegacyTournamentTierAlias(value)
  if (legacy) return legacy
  if (isTournamentLeague(value)) return value
  if (isExplicitStandardTierNumber(value)) {
    return clampCampaignTier(Number(value))
  }
  const fromLegacyField = normalizeLegacyTournamentTierAlias(legacyTournamentLeague)
    ?? (isTournamentLeague(legacyTournamentLeague) ? legacyTournamentLeague : null)
  if (fromLegacyField) return fromLegacyField
  return 1
}

export interface ResolvedTier {
  tier: number
  tournament: boolean
  league: TournamentLeague | null
  selection: TierSelectionInput
}

export function resolveTierSelection(selection: TierSelectionInput): ResolvedTier {
  if (isTournamentLeague(selection)) {
    return {
      tier: getTournamentLeagueTierBase(selection),
      tournament: true,
      league: selection,
      selection,
    }
  }
  const tier = clampCampaignTier(Number(selection))
  return { tier, tournament: false, league: null, selection: tier }
}

export function buildTierSelectItems(): { title: string, value: TierSelectionInput }[] {
  return [
    ...Array.from({ length: MAX_CAMPAIGN_TIER }, (_, index) => {
      const value = index + 1
      return { title: `Tier ${value}`, value }
    }),
    ...TOURNAMENT_LEAGUE_LIST.map(league => ({
      title: formatTournamentLeagueTierLabel(league),
      value: league,
    })),
  ]
}
