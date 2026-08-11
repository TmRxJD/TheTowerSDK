/**
 * Battle condition selection, tier defaults, counter-lab mapping.
 *
 * Standard tiers (14+): BC set is fixed per tier — auto-enabled, not user-editable.
 * Tournament leagues: random BC toggles are user-editable; levels come from heat @ current wave.
 */
import {
  getTierData,
  TIER_BATTLE_CONDITION_DEFINITIONS,
  type TierBattleConditionValue,
} from '../data/tiers'
import type { TournamentLeague } from '../data/tournaments'
import { WAVE_INFO_WORKSHOP_OFFSETS, WAVE_INFO_WORKSHOP_SCALE } from './wave-info-enemy-constants'
import { getTotalBcModifierFraction } from './battle-conditions'
import {
  computeElsReductionHeatLevel,
  computeRandomHeatBcLevel,
  tournamentLeagueHasHeat,
} from './tournament-heat-bc'
export {
  computeBossUltimateHeatFactor,
  computeCampaignElsReductionHeatLevel,
  computeElsReductionHeatLevel,
  computeMoreBossesHeatLevel,
  computeRandomHeatBcLevel,
  getHeatEffectivenessPercent,
  getTournamentHeatProfile,
  GUARANTEED_ELS_REDUCTION_MAX,
  HEAT_BC_INDEX_ELS_REDUCTION,
  tournamentLeagueHasHeat,
  TOURNAMENT_HEAT_WAVE_TABLE,
} from './tournament-heat-bc'

export type BattleConditionName =
  | (typeof TIER_BATTLE_CONDITION_DEFINITIONS)[number]['name']
  | 'ELS Reduction'

export const ENEMY_STATS_BATTLE_CONDITION_NAMES = [
  'ELS Reduction',
  "Boss's Ultimate",
] as const satisfies readonly BattleConditionName[]

export type EnemyStatsBattleConditionName = typeof ENEMY_STATS_BATTLE_CONDITION_NAMES[number]

const TIER_BC_DEF_BY_NAME = new Map(
  TIER_BATTLE_CONDITION_DEFINITIONS.map(def => [def.name, def]),
)

export const ENEMY_STATS_BATTLE_CONDITION_DEFINITIONS: ReadonlyArray<{
  name: EnemyStatsBattleConditionName
  description: string
}> = ENEMY_STATS_BATTLE_CONDITION_NAMES.map(name => {
  if (name === 'ELS Reduction') {
    return {
      name,
      description: 'Reduces enemy level skip chance by chance × level × 0.5% (heat-derived on tournaments).',
    }
  }
  const def = TIER_BC_DEF_BY_NAME.get(name)
  return { name, description: def?.description ?? name }
})

export interface BattleConditionSelection {
  name: BattleConditionName
  enabled: boolean
  level: number
}

/** CustomizeGame workshop table float offsets used by WaveInfoPanel (hex). */
export type WorkshopTableOffset = number

export interface BattleConditionEnemyStatEffect {
  workshopHpOffset?: WorkshopTableOffset
  workshopDamageOffset?: WorkshopTableOffset
  floatPerLevel?: number
  counterLabSlug?: string
  skipOnly?: boolean
}

/** Resistance BCs → all Wave Info workshop hp/damage offsets (GetResistanceLevel chain). */
export const WAVE_INFO_RESISTANCE_BATTLE_CONDITION_NAMES = [
  'Orb Resistance',
  'Death Ray Resistance',
  'Thorns Resistance',
  'Knockback Resistance',
  'Plasma Cannon Resistance',
] as const satisfies readonly BattleConditionName[]

/** Per-resistance BC counter-lab slugs (`researchBenefitIncrease[201–205]`). */
export const WAVE_INFO_RESISTANCE_BC_COUNTER_LAB_SLUGS: Readonly<
  Record<(typeof WAVE_INFO_RESISTANCE_BATTLE_CONDITION_NAMES)[number], string>
> = {
  'Orb Resistance': 'orb_resistance',
  'Death Ray Resistance': 'death_ray_resistance',
  'Thorns Resistance': 'thorns_resistance',
  'Knockback Resistance': 'knockback_resistance',
  'Plasma Cannon Resistance': 'plasma_cannon_resistance',
}

const WAVE_INFO_RESISTANCE_BC_NAME_SET = new Set<string>(WAVE_INFO_RESISTANCE_BATTLE_CONDITION_NAMES)

/** Re-exported from generated resistance BC constants (`GetResistanceLevel`). */
export { WAVE_INFO_RESISTANCE_HP_FLOAT_PER_LEVEL, WAVE_INFO_RESISTANCE_DAMAGE_FLOAT_PER_LEVEL } from './wave-info-enemy-constants'

const F32 = Math.fround

function f32Add(a: number, b: number): number {
  return F32(F32(a) + F32(b))
}

function f32Mul(a: number, b: number): number {
  return F32(F32(a) * F32(b))
}

const WAVE_INFO_HP_OFFSETS = new Set(
  Object.values(WAVE_INFO_WORKSHOP_OFFSETS)
    .map(row => row.hp)
    .filter((offset): offset is NonNullable<typeof offset> => offset != null),
)

const WAVE_INFO_DAMAGE_OFFSETS = new Set(
  Object.values(WAVE_INFO_WORKSHOP_OFFSETS)
    .flatMap(row => ('damage' in row && row.damage != null ? [row.damage] : [])),
)

export const BC_ENEMY_STAT_EFFECTS: Partial<Record<BattleConditionName, BattleConditionEnemyStatEffect>> = {
  'ELS Reduction': { skipOnly: true, counterLabSlug: 'enemy_level_skip_reduction' },
  'Skip Reduction - Multiply': { skipOnly: true },
  'Skip Reduction - Subtract': { skipOnly: true },
  'Skip Decay': { skipOnly: true },
  "Boss's Ultimate": {
    skipOnly: true,
    counterLabSlug: 'bosss_ultimate',
  },
  "Tank's Ultimate": {
    counterLabSlug: 'tanks_ultimate',
  },
  'Scatter Ultimate': {
    counterLabSlug: 'scatter_ultimate',
  },
  'Saboteur\'s Ultimate': {
    skipOnly: true,
  },
  'Commander\'s Ultimate': {
    skipOnly: true,
  },
  'Overcharge\'s Ultimate': {
    skipOnly: true,
  },
}

/** Counter-labs shown in Enemy Stats / Damage Reduction (Wave Info panel labs only). */
export const ENEMY_STATS_BC_COUNTER_LAB_SLUGS = [
  'battle_condition_reduction',
  'enemy_level_skip_reduction',
] as const

export const ENEMY_STATS_BC_GLOBAL_REDUCTION_SLUG = 'battle_condition_reduction' as const

/** Wave Info workshop — BC counter-labs exposed in the calculator UI (not per-resistance research). */
export function waveInfoDisplayBcLabLevels(
  bcCounterLabLevels: Readonly<Record<string, number>> | undefined,
): Record<string, number> {
  return Object.fromEntries(
    ENEMY_STATS_BC_COUNTER_LAB_SLUGS.map(slug => [
      slug,
      Math.max(0, Math.floor(bcCounterLabLevels?.[slug] ?? 0)),
    ]),
  )
}

/** @deprecated Use `ENEMY_STATS_BC_COUNTER_LAB_SLUGS` in the enemy stats calculator. */
export const BC_COUNTER_LAB_SLUGS = ENEMY_STATS_BC_COUNTER_LAB_SLUGS

export type BcCounterLabSlug = typeof BC_COUNTER_LAB_SLUGS[number]

export const BC_TIER_MIN = 14

const ENEMY_STATS_BC_NAME_SET = new Set<string>(ENEMY_STATS_BATTLE_CONDITION_NAMES)

export function isEnemyStatsBattleCondition(name: string): name is EnemyStatsBattleConditionName {
  return ENEMY_STATS_BC_NAME_SET.has(name)
}

export function filterEnemyStatsBattleConditions(
  conditions: readonly BattleConditionSelection[],
): BattleConditionSelection[] {
  return conditions.filter(row => isEnemyStatsBattleCondition(row.name))
}

function applyHeatDerivedBattleConditions(
  conditions: readonly BattleConditionSelection[],
  league: TournamentLeague | null,
  wave: number,
): BattleConditionSelection[] {
  if (!league || !tournamentLeagueHasHeat(league)) {
    return conditions.map(row => ({ ...row }))
  }

  const elsLevel = computeElsReductionHeatLevel(league, wave)
  const randomLevel = computeRandomHeatBcLevel(league, wave)

  return conditions.map(row => {
    if (row.name === 'ELS Reduction') {
      return { ...row, enabled: elsLevel > 0, level: elsLevel }
    }
    if (!row.enabled) {
      return { ...row, level: 0 }
    }
    return { ...row, level: randomLevel }
  })
}

export function isBattleConditionEditable(isTournament: boolean): boolean {
  return isTournament
}

export function tierHasFixedBattleConditions(tier: number): boolean {
  return tier >= BC_TIER_MIN
}

export function getTierBattleConditions(tier: number): readonly TierBattleConditionValue[] {
  return getTierData(tier)?.battleConditions ?? []
}

export function buildStandardTierBattleConditions(tier: number): BattleConditionSelection[] {
  return getTierBattleConditions(tier).map(bc => ({
    name: bc.name as BattleConditionName,
    enabled: true,
    level: bc.level,
  }))
}

export function buildDefaultTournamentBattleConditions(): BattleConditionSelection[] {
  return ENEMY_STATS_BATTLE_CONDITION_NAMES.map(name => ({
    name,
    enabled: false,
    level: 0,
  }))
}

export function mergeEnemyStatsBattleConditions(
  saved: readonly BattleConditionSelection[] | undefined,
): BattleConditionSelection[] {
  const defaults = buildDefaultTournamentBattleConditions()
  if (!saved?.length) return defaults
  const byName = new Map(defaults.map(row => [row.name, { ...row }]))
  for (const row of saved) {
    if (!isEnemyStatsBattleCondition(row.name)) continue
    byName.set(row.name, {
      name: row.name,
      enabled: row.enabled,
      level: 0,
    })
  }
  return [...byName.values()]
}

export function resolveBattleConditions(
  tier: number,
  tournament: boolean,
  league: TournamentLeague | null,
  wave: number,
  userSelections: BattleConditionSelection[] | undefined,
): BattleConditionSelection[] {
  if (tournament) {
    const base = mergeEnemyStatsBattleConditions(userSelections)
    return filterEnemyStatsBattleConditions(
      applyHeatDerivedBattleConditions(base, league, wave),
    )
  }
  if (tierHasFixedBattleConditions(tier)) {
    return filterEnemyStatsBattleConditions(buildStandardTierBattleConditions(tier))
  }
  return []
}

/** Full tier BC set for Wave Info / skip stat level — not limited to UI panel BCs. */
export function resolveWaveInfoBattleConditions(
  tier: number,
  tournament: boolean,
  league: TournamentLeague | null,
  wave: number,
  userSelections: BattleConditionSelection[] | undefined,
): BattleConditionSelection[] {
  if (tournament) {
    const base = mergeEnemyStatsBattleConditions(userSelections)
    return applyHeatDerivedBattleConditions(base, league, wave)
  }
  if (tierHasFixedBattleConditions(tier)) {
    return buildStandardTierBattleConditions(tier)
  }
  return []
}

function labBenefitIncreaseFraction(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0
  // Global BC reduction labs use percent points (10 → 10%); resistance labs use 0–1 fractions (0.2 → 20%).
  return raw >= 1 ? raw * 0.01 : raw
}

export function resolveBcBenefitIncreaseFractions(
  counterLabSlug: string | undefined,
  bcLabLevels: Readonly<Record<string, number>>,
  labBenefitIncreaseAtLevel: (slug: string, level: number) => number,
): { global: number, specific: number } {
  const globalLevel = Math.max(
    0,
    Math.min(10, Math.floor(bcLabLevels['battle_condition_reduction'] ?? 0)),
  )
  const globalRaw = globalLevel * 2
  const specificRaw = counterLabSlug
    ? labBenefitIncreaseAtLevel(counterLabSlug, bcLabLevels[counterLabSlug] ?? 0)
    : 0
  return {
    global: labBenefitIncreaseFraction(globalRaw),
    specific: labBenefitIncreaseFraction(specificRaw),
  }
}

/** Effective BC level after GetTotalBCModifier (researchBenefitIncrease[199|209]). */
export function getEffectiveBcLevel(
  bcLevel: number,
  counterLabSlug: string | undefined,
  bcLabLevels: Readonly<Record<string, number>>,
  labBenefitIncreaseAtLevel: (slug: string, level: number) => number,
): number {
  if (bcLevel <= 0) return 0
  const { global, specific } = resolveBcBenefitIncreaseFractions(
    counterLabSlug,
    bcLabLevels,
    labBenefitIncreaseAtLevel,
  )
  return bcLevel * getTotalBcModifierFraction(global, specific)
}

function resistanceBcCounterLabSlug(bcName: string): string | undefined {
  return WAVE_INFO_RESISTANCE_BC_COUNTER_LAB_SLUGS[
    bcName as keyof typeof WAVE_INFO_RESISTANCE_BC_COUNTER_LAB_SLUGS
  ]
}

function getEffectiveResistanceBcLevel(
  bcLevel: number,
  counterLabSlug: string | undefined,
  bcLabLevels: Readonly<Record<string, number>>,
  labBenefitIncreaseAtLevel: (slug: string, level: number) => number,
): number {
  if (bcLevel <= 0) return 0
  if (!counterLabSlug) {
    return getEffectiveBcLevel(bcLevel, undefined, bcLabLevels, labBenefitIncreaseAtLevel)
  }
  const specificRaw = labBenefitIncreaseAtLevel(counterLabSlug, bcLabLevels[counterLabSlug] ?? 0)
  const specific = labBenefitIncreaseFraction(specificRaw)
  return bcLevel * getTotalBcModifierFraction(0, specific)
}

/** Sum of tier resistance BC levels after counter-lab mitigation. */
export function sumResistanceBcLevels(
  conditions: readonly BattleConditionSelection[],
  bcLabLevels: Readonly<Record<string, number>> = {},
  labBenefitIncreaseAtLevel: (slug: string, level: number) => number = () => 0,
): number {
  let sum = 0
  for (const bc of conditions) {
    if (!bc.enabled || bc.level <= 0) continue
    if (!WAVE_INFO_RESISTANCE_BC_NAME_SET.has(bc.name)) continue
    sum += getEffectiveResistanceBcLevel(
      bc.level,
      resistanceBcCounterLabSlug(bc.name),
      bcLabLevels,
      labBenefitIncreaseAtLevel,
    )
  }
  return sum
}

export function getBattleConditionLevel(
  conditions: readonly BattleConditionSelection[],
  name: string,
): number {
  const row = conditions.find(c => c.name === name && c.enabled)
  return row?.level ?? 0
}

export function aggregateWorkshopTableFloat(
  offset: WorkshopTableOffset,
  conditions: readonly BattleConditionSelection[],
  bcLabLevels: Readonly<Record<string, number>>,
  labBenefitIncreaseAtLevel: (slug: string, level: number) => number,
): number {
  const onHpOffset = WAVE_INFO_HP_OFFSETS.has(offset as never)
  const onDamageOffset = WAVE_INFO_DAMAGE_OFFSETS.has(offset as never)
  if (!onHpOffset && !onDamageOffset) return 0

  let sum = 0

  // Resistance BCs are deliberately NOT accumulated here.
  //
  // Resistance applies on damage and knockback paths only — thorn, lightshot and
  // projectile damage, knockback, collisions, boss projectile hits and wave
  // updates. It is not a flat modifier on the run, so summing it here would
  // double-count. (The tile display reads it separately for the
  // UI label). No caller computes enemy health.
  //
  // They used to be summed into the HP offset, which made the multiplier
  // 1 - 0.0022216 * sum(resistance levels). That crosses zero once the levels
  // total 450, so tier 21+ (465) displayed every enemy at 0 HP and tier 20 at
  // 2.25% of true HP.
  for (const bc of conditions) {
    if (!bc.enabled || bc.level <= 0) continue
    const effect = BC_ENEMY_STAT_EFFECTS[bc.name]
    if (!effect || effect.skipOnly || effect.floatPerLevel == null) continue
    const matchesHp = effect.workshopHpOffset === offset
    const matchesDamage = effect.workshopDamageOffset === offset
    if (!matchesHp && !matchesDamage) continue
    const effectiveLevel = getEffectiveBcLevel(
      bc.level,
      effect.counterLabSlug,
      bcLabLevels,
      labBenefitIncreaseAtLevel,
    )
    sum = f32Add(sum, f32Mul(effect.floatPerLevel, effectiveLevel))
  }

  return sum
}

/** `CustomizeGame+0x210` float → Wave Info mult (`1 + float × WAVE_INFO_WORKSHOP_SCALE`, f32). */
export function workshopMultFromTableFloat(tableFloat: number): number {
  if (!Number.isFinite(tableFloat)) return 1
  const scaled = F32(F32(tableFloat) * F32(WAVE_INFO_WORKSHOP_SCALE))
  return Math.max(0, F32(1 + scaled))
}
