import { formatModuleSaveEffectDisplayValue } from './module-effects-display'
import { type ResolvedModuleEffect, findModuleEffect } from '../data/module-effect-resolver'
import {
  isKnownModuleSaveEffectId,
  type ModuleSaveSlotCategory,
  findModuleSaveEffectCategory,
  findModuleSaveEffectLabel,
  getModuleSaveEffectTier,
} from './module-effects-registry'
import type { ModuleSubstatCanonicalRarity } from '../data/module-substats'

export type { ModuleSaveSlotCategory } from './module-effects-registry'

export interface DecodedSubstat {
  effectId: number
  label: string
  tier: string
  rarityValue: number
  clusterIndex: number
  benefitValue: number
  displayValue: string | null
  error?: string
}

export interface DecodedModuleSaveEffect {
  effectId: number
  label: string
  rarity: ModuleSubstatCanonicalRarity
  moduleType: number
  clusterIndex: number
  benefitValue: number
  benefitType: number
  displayValue: string | null
  error?: string
}

function asTrackerRarity(tier: string): ModuleSubstatCanonicalRarity {
  const known: readonly string[] = ['Common', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Ancestral']
  if (known.includes(tier)) return tier as ModuleSubstatCanonicalRarity
  return 'Common'
}

/**
 * Decode one module effect index via the module effects catalog table.
 */
export function decodeSingleEffectId(
  effectId: number,
  category: ModuleSaveSlotCategory,
): DecodedSubstat | null {
  if (!effectId) return null

  const resolved = findModuleEffect(effectId)
  if (!resolved) {
    return {
      effectId,
      label: `Unknown Effect ${effectId}`,
      tier: 'Unknown',
      rarityValue: 0,
      clusterIndex: -1,
      benefitValue: 0,
      displayValue: null,
      error: 'Effect ID not in module effects table',
    }
  }

  const expectedCategory = findModuleSaveEffectCategory(effectId)
  let error: string | undefined
  if (expectedCategory && expectedCategory !== category) {
    error = `Effect ${effectId} belongs to ${expectedCategory}, not ${category}`
  }

  const tier = getModuleSaveEffectTier(effectId)

  return {
    effectId,
    label: resolved.label,
    tier,
    rarityValue: resolved.rarityValue,
    clusterIndex: resolved.clusterIndex,
    benefitValue: resolved.benefitValue,
    displayValue: formatModuleSaveEffectDisplayValue(resolved.label, category, tier, resolved.benefitValue),
    error,
  }
}

/** Decode up to 8 slots; flags duplicate labels on one module. */
export function decodeModuleSubstats(
  effectIds: readonly number[],
  category: ModuleSaveSlotCategory,
): Array<DecodedSubstat | null> {
  const decodedSlots: Array<DecodedSubstat | null> = new Array(8).fill(null)
  const seenLabels = new Set<string>()

  for (let slotIndex = 0; slotIndex < Math.min(effectIds.length, 8); slotIndex += 1) {
    const effectId = effectIds[slotIndex] ?? 0
    if (!effectId) continue

    const result = decodeSingleEffectId(effectId, category)
    if (!result) continue

    if (seenLabels.has(result.label)) {
      result.error = result.error
        ? `${result.error}; duplicate substat '${result.label}' on this module`
        : `Duplicate substat '${result.label}' on this module`
    } else {
      seenLabels.add(result.label)
    }

    decodedSlots[slotIndex] = result
  }

  return decodedSlots
}

export function decodeModuleSaveEffect(
  effectId: number,
  category: ModuleSaveSlotCategory,
): DecodedModuleSaveEffect | null {
  const decoded = decodeSingleEffectId(effectId, category)
  if (!decoded) return null

  const resolved = findModuleEffect(effectId)

  return {
    effectId: decoded.effectId,
    label: decoded.label,
    rarity: asTrackerRarity(decoded.tier),
    moduleType: resolved?.moduleType ?? 0,
    clusterIndex: decoded.clusterIndex,
    benefitValue: decoded.benefitValue,
    benefitType: resolved?.benefitType ?? 0,
    displayValue: decoded.displayValue,
    error: decoded.error,
  }
}

export function findModuleEffectForSlot(
  effectId: number,
  category: ModuleSaveSlotCategory,
): ResolvedModuleEffect | null {
  const decoded = decodeModuleSaveEffect(effectId, category)
  if (!decoded) return null

  return {
    label: decoded.label,
    category,
    rarityName: decoded.rarity,
    rarityValue: findModuleEffect(effectId)?.rarityValue ?? 0,
    benefitValue: decoded.benefitValue,
    benefitType: decoded.benefitType,
    moduleType: decoded.moduleType,
    clusterIndex: decoded.clusterIndex,
  }
}

export { isKnownModuleSaveEffectId, findModuleSaveEffectLabel, getModuleSaveEffectTier }
