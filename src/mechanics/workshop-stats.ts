/**
 * Workshop preview stats — the out-of-round value for each workshop stat.
 *
 * Battle values use `upgradeLevel[]` + labs + cards + modules.
 * Workshop preview uses `upgradeWorkshopLevel[]` through the same combiner family.
 *
 * ## Generic pipeline (all 48 stats share this shape; the curves differ)
 *
 *   base = labResearchTerm(statLabIndex, workshopLevel)
 *   raw = base × workshopLevelCurve(statUpgradeIndex, workshopLevel)
 *   raw += moduleSubstatAdd(statModuleGetter)
 *   raw ×= cardMultiplier(statCardSlot)
 *   raw ×= relicOrGlobalMult chain
 *   return formatForUI(raw)   // some stats use DPM scaling internally
 *
 * ## Documented stat-specific paths
 *
 * | Stat | Notes |
 * |------|-------|
 * | MaxDistance | See tower-range.ts getOutOfRoundMaxDistance |
 * | AttackLevelSkipChance / HealthLevelSkipChance | In-run per-wave roll — see `enemy-level-skip.ts` |
 * | ShockwaveFrequency | base 7, level mult 20 |
 * | ShockwaveSize | workshop level × module chain |
 * | Bounce* | module bounce bonuses + workshop curve |
 * | Critical* / SuperCrit* | module crit bonuses + upgrade bonuses |
 *
 * Per-level **curves** live in save/catalog data — this module documents **combination** only.
 * Workshop stat formulas from tower mechanics reference.
 */

export type WorkshopStatCategory = 'Attack' | 'Defense' | 'Utility' | 'Economy'

/** All GetOutOfRound* getter names grouped by workshop tab. */
export const WORKSHOP_GETTERS: Record<WorkshopStatCategory, readonly string[]> = {
  Attack: [
    'Damage', 'AttackSpeed', 'CriticalChance', 'CriticalMultiplier',
    'SuperCritChance', 'SuperCritMultiplier', 'Impetus', 'MaxDistance',
    'MultishotChance', 'MultishotTargets', 'BounceChance', 'BounceTargets',
    'BounceRange', 'RapidFireChance', 'RapidFireDuration',
    'RendArmorChance', 'RendArmorMultiplier',
  ],
  Defense: [
    'MaxHealth', 'DefenseRel', 'DefenseAbsolute', 'HealthRegen', 'Lifesteal',
    'RecoveryChance', 'RecoveryAmount', 'RecoveryMax', 'ThornDamage',
    'WallPercentOfTowerHealth', 'WallRebuild', 'DeathDefyChance',
  ],
  Utility: [
    'KnockbackChance', 'KnockbackForce', 'MineChance', 'MineDamage', 'MineRadius',
    'OrbCount', 'OrbSpeed', 'ShockwaveFrequency', 'ShockwaveSize',
    'FreeAttackUpgradeChance', 'FreeDefenseUpgradeChance', 'FreeUtilityUpgradeChance',
    'AttackLevelSkipChance', 'HealthLevelSkipChance',
  ],
  Economy: [
    'CashPerWave', 'CoinsPerWave', 'InterestPerWave', 'CashBonusUpgrade', 'CoinsBonusUpgrade',
  ],
}

export interface WorkshopStatPipelineInput {
  labTerm: number
  workshopCurveMult: number
  moduleAdd?: number
  cardMult?: number
  relicMult?: number
}

export function combineWorkshopPreviewStat(input: WorkshopStatPipelineInput): number {
  let raw = input.labTerm * input.workshopCurveMult
  if (input.moduleAdd != null) raw += input.moduleAdd
  if (input.cardMult != null) raw *= input.cardMult
  if (input.relicMult != null) raw *= input.relicMult
  return raw
}

/**
 * Shockwave frequency preview delegates to shockwave.ts in-run formula.
 */
export { shockwaveFrequencySeconds as shockwaveFrequencyPreview } from './shockwave'

export function workshopGetterMethodName(stat: string): string {
  return `GetOutOfRound${stat}`
}
