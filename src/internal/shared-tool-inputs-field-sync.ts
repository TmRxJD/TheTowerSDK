import {
  ELS_ATTACK_WORKSHOP_KEY,
  ELS_ENHANCEMENT_KEY,
  ELS_HEALTH_WORKSHOP_KEY,
  resolveElsEnhancementLevelFromTracker,
} from '../mechanics/els-upgrade-path'
import {
  VAULT_ELS_ATTACK_NODE_ID,
  VAULT_ELS_HEALTH_NODE_ID,
  VAULT_ELS_MAX_STARS,
} from '../mechanics/els-module-cluster'
import type {
  SharedElsPlannerInputs,
  SharedVaultLevels,
  SharedWorkshopStatLevels,
} from './shared-tool-inputs-extended'

function maxDefinedInt(...values: Array<number | null | undefined>): number {
  return values.reduce<number>((max, value) => {
    if (!Number.isFinite(value)) return max
    return Math.max(max, Math.floor(Number(value)))
  }, 0)
}

function readWorkshopLevel(levels: Record<string, number>, key: string): number {
  const value = levels[key]
  return Number.isFinite(value) ? Math.floor(value) : 0
}

export function readElsPlannerLevelsFromWorkshopStats(
  workshop: SharedWorkshopStatLevels,
): Pick<SharedElsPlannerInputs, 'elsAttackLevel' | 'elsHealthLevel' | 'elsEnhancementLevel'> {
  return {
    elsAttackLevel: readWorkshopLevel(workshop.levels, ELS_ATTACK_WORKSHOP_KEY),
    elsHealthLevel: readWorkshopLevel(workshop.levels, ELS_HEALTH_WORKSHOP_KEY),
    elsEnhancementLevel: resolveElsEnhancementLevelFromTracker(workshop.enhancementLevels),
  }
}

export function syncWorkshopStatsFromElsPlanner(
  workshop: SharedWorkshopStatLevels,
  els: Pick<SharedElsPlannerInputs, 'elsAttackLevel' | 'elsHealthLevel' | 'elsEnhancementLevel'>,
): SharedWorkshopStatLevels {
  return {
    ...workshop,
    levels: {
      ...workshop.levels,
      [ELS_ATTACK_WORKSHOP_KEY]: maxDefinedInt(workshop.levels[ELS_ATTACK_WORKSHOP_KEY], els.elsAttackLevel),
      [ELS_HEALTH_WORKSHOP_KEY]: maxDefinedInt(workshop.levels[ELS_HEALTH_WORKSHOP_KEY], els.elsHealthLevel),
    },
    enhancementLevels: {
      ...workshop.enhancementLevels,
      [ELS_ENHANCEMENT_KEY]: maxDefinedInt(
        workshop.enhancementLevels[ELS_ENHANCEMENT_KEY],
        els.elsEnhancementLevel,
      ),
    },
  }
}

export function readElsVaultStarsFromVaultLevels(
  vault: SharedVaultLevels,
): Pick<SharedElsPlannerInputs, 'elsVaultAttackStars' | 'elsVaultHealthStars'> {
  return {
    elsVaultAttackStars: Math.min(
      VAULT_ELS_MAX_STARS,
      maxDefinedInt(vault.levels[VAULT_ELS_ATTACK_NODE_ID]),
    ),
    elsVaultHealthStars: Math.min(
      VAULT_ELS_MAX_STARS,
      maxDefinedInt(vault.levels[VAULT_ELS_HEALTH_NODE_ID]),
    ),
  }
}

export function syncVaultLevelsFromElsPlanner(
  vault: SharedVaultLevels,
  els: Pick<SharedElsPlannerInputs, 'elsVaultAttackStars' | 'elsVaultHealthStars'>,
): SharedVaultLevels {
  return {
    ...vault,
    levels: {
      ...vault.levels,
      [VAULT_ELS_ATTACK_NODE_ID]: maxDefinedInt(vault.levels[VAULT_ELS_ATTACK_NODE_ID], els.elsVaultAttackStars),
      [VAULT_ELS_HEALTH_NODE_ID]: maxDefinedInt(vault.levels[VAULT_ELS_HEALTH_NODE_ID], els.elsVaultHealthStars),
    },
  }
}

export function enrichElsPlannerFromLinkedSources(
  els: SharedElsPlannerInputs,
  workshop: SharedWorkshopStatLevels,
  vault: SharedVaultLevels,
): SharedElsPlannerInputs {
  const fromWorkshop = readElsPlannerLevelsFromWorkshopStats(workshop)
  const fromVault = readElsVaultStarsFromVaultLevels(vault)
  return {
    ...els,
    elsAttackLevel: maxDefinedInt(els.elsAttackLevel, fromWorkshop.elsAttackLevel),
    elsHealthLevel: maxDefinedInt(els.elsHealthLevel, fromWorkshop.elsHealthLevel),
    elsEnhancementLevel: maxDefinedInt(els.elsEnhancementLevel, fromWorkshop.elsEnhancementLevel),
    elsVaultAttackStars: maxDefinedInt(els.elsVaultAttackStars, fromVault.elsVaultAttackStars),
    elsVaultHealthStars: maxDefinedInt(els.elsVaultHealthStars, fromVault.elsVaultHealthStars),
  }
}
