import {
  buildLevelSkipChanceRaw,
  getOutOfRoundLevelSkipChancePreview,
  type LevelSkipKind,
} from './enemy-level-skip'

/** Parse module substat display values like "+4%" into a skip-chance fraction (0.04). */
export function parseModuleElsBonusPercent(value: string | null | undefined): number {
  if (!value) return 0
  const trimmed = value.trim()
  if (!trimmed) return 0
  const match = /([+\-]?\d+(?:\.\d+)?)\s*%/.exec(trimmed)
  if (!match) return 0
  return Math.max(0, Number(match[1]) / 100)
}

export const ELS_ATTACK_MODULE_SUBSTAT_LABEL = 'Enemy Attack Level Skip'
export const ELS_HEALTH_MODULE_SUBSTAT_LABEL = 'Enemy Health Level Skip'

/** Power vault node ids — 0.5% additive skip per star before ELS+ multiplier. */
export const VAULT_ELS_ATTACK_NODE_ID = 'enemyatk'
export const VAULT_ELS_HEALTH_NODE_ID = 'enemyhealth'
export const VAULT_ELS_SKIP_PER_STAR = 0.005
export const VAULT_ELS_MAX_STARS = 3

export interface ElsModuleSlotBonusesPct {
  primaryAttackPct: number
  assistAttackPct: number
  primaryHealthPct: number
  assistHealthPct: number
}

export interface ElsSkipSourceInput extends ElsModuleSlotBonusesPct {
  vaultAttackStars?: number
  vaultHealthStars?: number
  /** `researchBenefitIncrease[124]` — enemy attack level skip lab. */
  labAttackBenefitIncrease?: number
  /** `researchBenefitIncrease[125]` — enemy health level skip lab. */
  labHealthBenefitIncrease?: number
}

/** Power vault skip bonus as a fraction (3 stars → 0.015). */
export function vaultElsSkipBenefit(starLevel: number): number {
  const stars = Math.max(0, Math.min(VAULT_ELS_MAX_STARS, Math.floor(starLevel)))
  return stars * VAULT_ELS_SKIP_PER_STAR
}

/**
 * Module cluster benefit for one track (fraction 0–1).
 * Primary + assist are additive; assist values should already include assist-efficiency when synced.
 */
export function buildElsModuleClusterFraction(
  kind: LevelSkipKind,
  slots: ElsModuleSlotBonusesPct,
): number {
  if (kind === 'attack') {
    return Math.max(0, ((slots.primaryAttackPct ?? 0) + (slots.assistAttackPct ?? 0)) / 100)
  }
  return Math.max(0, ((slots.primaryHealthPct ?? 0) + (slots.assistHealthPct ?? 0)) / 100)
}

/** `GetTechTreeBenefit(9|12)` — power-vault EALS stars (0.5%/star). */
export function buildElsTechTreeSkipBenefit(
  kind: LevelSkipKind,
  sources: ElsSkipSourceInput,
): number {
  return kind === 'attack'
    ? vaultElsSkipBenefit(sources.vaultAttackStars ?? 0)
    : vaultElsSkipBenefit(sources.vaultHealthStars ?? 0)
}

/** @deprecated Use {@link buildElsModuleClusterFraction} + {@link buildElsTechTreeSkipBenefit}. */
export function buildElsAdditiveSkipBonus(
  kind: LevelSkipKind,
  sources: ElsSkipSourceInput,
): number {
  return buildElsTechTreeSkipBenefit(kind, sources) + buildElsModuleClusterFraction(kind, sources)
}

function buildElsSkipChanceBuildInput(
  kind: LevelSkipKind,
  utilityLevel: number,
  enhancementLevel: number,
  sources: ElsSkipSourceInput,
): Parameters<typeof getOutOfRoundLevelSkipChancePreview>[0] {
  const labBenefitIncrease = kind === 'attack'
    ? sources.labAttackBenefitIncrease ?? 0
    : sources.labHealthBenefitIncrease ?? 0
  return {
    kind,
    utilityLevel,
    moduleClusterBenefit: buildElsModuleClusterFraction(kind, sources),
    techTreeBenefit: buildElsTechTreeSkipBenefit(kind, sources),
    enhancementLevel,
    labBenefitIncrease,
  }
}

/**
 * Stored skip chance for one track — `GetOutOfRound*LevelSkipChance` term order
 * via {@link buildLevelSkipChanceRaw}.
 */
export function computeElsTrackSkipChance(
  kind: LevelSkipKind,
  utilityLevel: number,
  enhancementLevel: number,
  sources: ElsSkipSourceInput = {} as ElsSkipSourceInput,
): number {
  return getOutOfRoundLevelSkipChancePreview(
    buildElsSkipChanceBuildInput(kind, utilityLevel, enhancementLevel, sources),
  )
}

export function computeElsTrackSkipChanceRaw(
  kind: LevelSkipKind,
  utilityLevel: number,
  enhancementLevel: number,
  sources: ElsSkipSourceInput = {} as ElsSkipSourceInput,
): number {
  return buildLevelSkipChanceRaw(
    buildElsSkipChanceBuildInput(kind, utilityLevel, enhancementLevel, sources),
  )
}
