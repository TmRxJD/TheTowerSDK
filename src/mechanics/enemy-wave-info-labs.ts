/**
 * Enemy research labs on Wave Info rows.
 *
 * Each lab level adds −value% to that row (e.g. common enemy health: −0.4% per level).
 * Uses the same `computeLabValueAtLevel` totals as the Labs calculator chart.
 *
 * Boss HP reads persisted workshop table float: `waveBase × 20 × (1 + tf/−100)`.
 * LabCalculations writes tf as `benefitPct × labValue × hpFixedMult(20)`.
 */
import type { EnemyWaveEnemyType } from '../internal/enemy-wave-stats'
import { workshopMultFromTableFloat } from './battle-condition-config'
import { WAVE_INFO_ENEMY_RULES, WAVE_INFO_WORKSHOP_OFFSETS } from './wave-info-enemy-constants'

const F32 = Math.fround

/** Enemy lab slug per Wave Info workshop HP table offset. */
export const WAVE_INFO_ENEMY_LAB_HP_OFFSETS: Readonly<Record<number, string>> = {
  0x1D8: 'common_enemy_health',
  0x1E0: 'fast_enemy_health',
  0x1EC: 'tank_enemy_health',
  0x1F4: 'ranged_enemy_health',
  0x1FC: 'boss_health',
  0x204: 'protector_health',
}

/** Enemy lab slug per Wave Info workshop damage offset. */
export const WAVE_INFO_ENEMY_LAB_DAMAGE_OFFSETS: Readonly<Record<number, string>> = {
  0x1DC: 'common_enemy_attack',
  0x1E4: 'fast_enemy_attack',
  0x1F0: 'tank_enemy_attack',
  0x1F8: 'ranged_enemy_attack',
  0x200: 'boss_attack',
}

/** Wave Info row → enemy lab slug for HP / attack (undefined = no lab on this row). */
export const WAVE_INFO_ENEMY_LAB_SLUG_BY_TYPE: Partial<
  Record<EnemyWaveEnemyType, { health?: string, attack?: string }>
> = {
  Basic: { health: 'common_enemy_health', attack: 'common_enemy_attack' },
  Fast: { health: 'fast_enemy_health', attack: 'fast_enemy_attack' },
  Tank: { health: 'tank_enemy_health', attack: 'tank_enemy_attack' },
  Ranged: { health: 'ranged_enemy_health', attack: 'ranged_enemy_attack' },
  Boss: { health: 'boss_health', attack: 'boss_attack' },
  Protector: { health: 'protector_health' },
  Vampire: { health: 'vampire_enemy_health', attack: 'vampire_enemy_attack' },
  Scatter: { health: 'scatter_enemy_health', attack: 'scatter_enemy_attack' },
  Ray: { health: 'ray_enemy_health', attack: 'ray_enemy_attack' },
  Saboteur: { health: 'vampire_enemy_health', attack: 'vampire_enemy_attack' },
  Commander: { health: 'vampire_enemy_health', attack: 'vampire_enemy_attack' },
}

export function computeEnemyLabLevelFromMap(
  slug: string,
  labLevels: Readonly<Record<string, number>>,
  extraKeys: readonly string[] = [],
): number {
  for (const key of [slug, ...extraKeys]) {
    const value = labLevels[key]
    if (Number.isFinite(value)) return Math.max(0, Math.floor(value))
  }
  return 0
}

export function enemyLabSlugForWorkshopOffset(
  offset: number,
  stat: 'hp' | 'damage',
): string | undefined {
  const map = stat === 'hp' ? WAVE_INFO_ENEMY_LAB_HP_OFFSETS : WAVE_INFO_ENEMY_LAB_DAMAGE_OFFSETS
  return map[offset]
}

/** Lab slug that affects this Wave Info row (for UI metadata). */
export function waveInfoEnemyLabSlugForRow(
  enemyType: EnemyWaveEnemyType,
  stat: 'hp' | 'attack',
): string | undefined {
  const row = WAVE_INFO_ENEMY_LAB_SLUG_BY_TYPE[enemyType]
  if (!row) return undefined
  return stat === 'hp' ? row.health : row.attack
}

/**
 * Multiplier from enemy research lab levels: `1 − (additive % / 100)`.
 * Chart value 0.4 at L1 → −0.4% total → mult 0.996.
 */
export function waveInfoEnemyLabMultiplierForRow(
  enemyType: EnemyWaveEnemyType,
  stat: 'hp' | 'attack',
  labLevels: Readonly<Record<string, number>>,
  labBenefitAtLevel: (slug: string, level: number) => number,
): number {
  const slug = waveInfoEnemyLabSlugForRow(enemyType, stat)
  if (!slug) return 1

  const level = computeEnemyLabLevelFromMap(slug, labLevels)
  if (level <= 0) return 1

  const totalReductionPct = labBenefitAtLevel(slug, level)
  if (!Number.isFinite(totalReductionPct) || totalReductionPct <= 0) return 1

  return Math.max(0, 1 - totalReductionPct / 100)
}

export function waveInfoWorkshopOffsetForType(
  enemyType: EnemyWaveEnemyType,
  stat: 'hp' | 'damage',
): number | undefined {
  const row = WAVE_INFO_WORKSHOP_OFFSETS[enemyType as keyof typeof WAVE_INFO_WORKSHOP_OFFSETS]
  if (!row) return undefined
  return stat === 'hp' ? row.hp : ('damage' in row ? row.damage : undefined)
}

/**
 * Boss Wave Info workshop table float for boss_health slot.
 * Persisted value converts via `1 + tf/(−100)` at display time.
 * For boss_health this equals `benefitPct × labValue × hpFixedMult` (e.g. L30: 9 × 0.3 × 20 = 54).
 */
export function waveInfoBossHpTableFloat(
  labLevels: Readonly<Record<string, number>>,
  labBenefitAtLevel: (slug: string, level: number) => number,
  bossHealthLabValuePerLevel: number,
): number {
  const level = computeEnemyLabLevelFromMap('boss_health', labLevels)
  if (level <= 0) return 0
  const benefitPct = labBenefitAtLevel('boss_health', level)
  if (!Number.isFinite(benefitPct) || benefitPct <= 0) return 0
  const hpFixedMult = WAVE_INFO_ENEMY_RULES.Boss.hpFixedMult ?? 20
  const value = Number.isFinite(bossHealthLabValuePerLevel) ? bossHealthLabValuePerLevel : 0
  return F32(F32(benefitPct) * F32(F32(value) * F32(hpFixedMult)))
}

/** Workshop mult from boss_health table float. */
export function waveInfoBossHpWorkshopMult(
  labLevels: Readonly<Record<string, number>>,
  labBenefitAtLevel: (slug: string, level: number) => number,
  bossHealthLabValuePerLevel: number,
): number {
  const tableFloat = waveInfoBossHpTableFloat(labLevels, labBenefitAtLevel, bossHealthLabValuePerLevel)
  if (tableFloat <= 0) return 1
  return workshopMultFromTableFloat(tableFloat)
}
