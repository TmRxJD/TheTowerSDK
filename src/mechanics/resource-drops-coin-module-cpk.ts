import { clampAssistModuleSlotEfficiencyPct } from '../internal/assist-module-efficiency'
import { MODULE_SUBSTAT_CANONICAL_DATA } from '../data/module-substats'
import type { SharedModuleEfficiencyLabs } from '../internal/shared-tool-inputs'
import type { SharedModuleProgressInputs } from '../internal/shared-tool-inputs-extended'

export const GENERATOR_CPK_SUBSTAT_LABEL = 'Coins / Kill Bonus'

/** Parse module substat display values like "+0.4x" into an additive multiplier term. */
export function parseModuleSubstatMultiplierAdd(value: string | null | undefined): number {
  if (!value) return 0
  const trimmed = value.trim()
  if (!trimmed) return 0
  const match = /([+-]?\d+(?:\.\d+)?)\s*x/i.exec(trimmed)
  if (!match) return 0
  return Math.max(0, Number(match[1]))
}

export function generatorCpkSubstatAddForRarity(rarity: string | null | undefined): number {
  if (!rarity || rarity === 'None' || rarity === 'none') return 0
  const definition = MODULE_SUBSTAT_CANONICAL_DATA.Generator.substats.find(
    entry => entry.label === GENERATOR_CPK_SUBSTAT_LABEL,
  )
  const raw = definition?.valuesByRarity[rarity as keyof typeof definition.valuesByRarity]
  return parseModuleSubstatMultiplierAdd(typeof raw === 'string' ? raw : undefined)
}

/**
 * Coins-per-kill contribution from module substats. The assist module's substat
 * counts only in part, scaled by its substat efficiency:
 *   primary + assist × (1 + assistSlotEfficiency% + substatEfficiencyLabLevel) × 0.01
 */
export function moduleCoinsKillBonusFromSubstats(
  primaryAdd: number,
  assistAdd: number,
  assistSlotEfficiencyPct: number,
  generatorSubstatEfficiencyLabLevel: number,
): number {
  const slotEfficiency = clampAssistModuleSlotEfficiencyPct(assistSlotEfficiencyPct)
  const labEfficiency = Math.max(0, Math.floor(Number(generatorSubstatEfficiencyLabLevel) || 0))
  const substatEfficiency = (1 + slotEfficiency + labEfficiency) * 0.01
  return Math.max(0, primaryAdd) + Math.max(0, assistAdd) * substatEfficiency
}

function readGeneratorSubstatEfficiencyLab(labs: SharedModuleEfficiencyLabs): number {
  const byType = labs.substatEfficiencyLabByType?.generator
  if (Number.isFinite(byType) && (byType as number) > 0) return Math.floor(byType as number)
  return Math.max(0, Math.floor(Number(labs.substatEfficiencyLab) || 0))
}

export interface GeneratorCpkSubstatAdds {
  primaryAdd: number
  assistAdd: number
}

export function computeModuleCoinsKillBonusFromHub(input: {
  moduleProgress: SharedModuleProgressInputs
  moduleEfficiencyLabs: SharedModuleEfficiencyLabs
  equippedSubstats?: GeneratorCpkSubstatAdds
}): number {
  const equipped = input.equippedSubstats ?? {
    primaryAdd: Math.max(0, Number(input.moduleProgress.generatorCpkPrimarySubstatAdd) || 0),
    assistAdd: Math.max(0, Number(input.moduleProgress.generatorCpkAssistSubstatAdd) || 0),
  }
  const assistEff = input.moduleProgress.costsAssistEffPctByType?.generator
    ?? input.moduleProgress.costsAssistEffPct
    ?? 0
  const labLevel = readGeneratorSubstatEfficiencyLab(input.moduleEfficiencyLabs)
  return moduleCoinsKillBonusFromSubstats(
    equipped.primaryAdd,
    equipped.assistAdd,
    assistEff,
    labLevel,
  )
}
