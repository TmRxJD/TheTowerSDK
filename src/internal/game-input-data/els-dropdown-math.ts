import {
  buildAssistSubstatEfficiencyOptions,
  buildElsModuleSubstatRarityOptions,
  buildVaultElsStarOptions,
  buildWorkshopEnhancementDiscountOptions,
  buildWorkshopUtilityDiscountOptions,
  buildWorkshopVaultDiscountOptions,
  ELS_MODULE_SUBSTAT_NONE,
  type ElsModuleSubstatRarityChoice,
} from '../../mechanics/els-calculator-options'
import {
  ELS_ATTACK_MODULE_SUBSTAT_LABEL,
  ELS_HEALTH_MODULE_SUBSTAT_LABEL,
} from '../../mechanics/els-module-cluster'
import type { GameDropdownOptionEntry } from './types'

export type ElsModuleSubstatLabel =
  | typeof ELS_ATTACK_MODULE_SUBSTAT_LABEL
  | typeof ELS_HEALTH_MODULE_SUBSTAT_LABEL

export function buildElsModuleSubstatRarityEntries(label: ElsModuleSubstatLabel): readonly GameDropdownOptionEntry[] {
  return buildElsModuleSubstatRarityOptions(label).map((option, index) => ({
    value: index,
    baseValue: index,
    meta: { choice: option.value },
  }))
}

export function buildElsModuleSubstatRarityOptionLabel(label: ElsModuleSubstatLabel, index: number): string {
  const options = buildElsModuleSubstatRarityOptions(label)
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.title ?? String(index)
}

export function resolveElsModuleSubstatRarityIndex(
  label: ElsModuleSubstatLabel,
  choice: ElsModuleSubstatRarityChoice | null | undefined,
): number {
  const options = buildElsModuleSubstatRarityOptions(label)
  const idx = options.findIndex(option => option.value === (choice ?? ELS_MODULE_SUBSTAT_NONE))
  return idx >= 0 ? idx : 0
}

export function resolveElsModuleSubstatRarityByIndex(
  label: ElsModuleSubstatLabel,
  index: number,
): ElsModuleSubstatRarityChoice {
  const options = buildElsModuleSubstatRarityOptions(label)
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.value ?? ELS_MODULE_SUBSTAT_NONE
}

export function buildElsWorkshopUtilityDiscountEntries(): readonly GameDropdownOptionEntry[] {
  return buildWorkshopUtilityDiscountOptions().map(option => ({
    value: option.value,
    baseValue: option.value,
  }))
}

export function buildElsWorkshopUtilityDiscountOptionLabel(pct: number): string {
  const value = Number(pct)
  return `${value.toFixed(1)}%`
}

export function buildElsWorkshopEnhancementDiscountEntries(): readonly GameDropdownOptionEntry[] {
  return buildWorkshopEnhancementDiscountOptions().map(option => ({
    value: option.value,
    baseValue: option.value,
  }))
}

export function buildElsWorkshopEnhancementDiscountOptionLabel(pct: number): string {
  const value = Number(pct)
  return `${value.toFixed(1)}%`
}

export function buildElsWorkshopVaultDiscountEntries(): readonly GameDropdownOptionEntry[] {
  return buildWorkshopVaultDiscountOptions().map(option => ({
    value: option.value,
    baseValue: option.value,
  }))
}

export function buildElsWorkshopVaultDiscountOptionLabel(pct: number): string {
  const value = Number(pct)
  return `${value.toFixed(1)}%`
}

export function buildElsVaultStarEntries(): readonly GameDropdownOptionEntry[] {
  return buildVaultElsStarOptions().map(option => ({
    value: option.value,
    baseValue: option.value,
  }))
}

export function buildElsVaultStarOptionLabel(stars: number): string {
  const options = buildVaultElsStarOptions()
  const match = options.find(option => option.value === Math.floor(Number(stars) || 0))
  return match?.title ?? `${stars} stars`
}

export function buildElsAssistSubstatEfficiencyEntries(): readonly GameDropdownOptionEntry[] {
  return buildAssistSubstatEfficiencyOptions().map(option => ({
    value: option.value,
    baseValue: option.value,
  }))
}

export function buildElsAssistSubstatEfficiencyOptionLabel(pct: number): string {
  return `${Math.max(1, Math.min(100, Math.floor(Number(pct) || 1)))}%`
}
