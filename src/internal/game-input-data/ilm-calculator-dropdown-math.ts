import {
  buildIlmAmplifyBotBonusLevelOptions,
  buildIlmModuleSubstatRarityOptions,
  buildIlmUniqueModuleRarityOptions,
  ILM_DAMAGE_MODULE_SUBSTAT_LABEL,
  ILM_MODULE_SUBSTAT_NONE,
  ILM_UNIQUE_MODULE_IDS,
  type IlmModuleSubstatRarityChoice,
  type IlmUniqueModuleId,
  type IlmUniqueModuleRarityChoice,
} from '../../mechanics/ilm-calculator-options'
import type { GameDropdownOptionEntry } from './types'

export { ILM_DAMAGE_MODULE_SUBSTAT_LABEL }

let amplifyBotLevelEntriesCache: readonly GameDropdownOptionEntry[] | null = null
let shockStackEntriesCache: readonly GameDropdownOptionEntry[] | null = null

export function buildIlmAmplifyBotBonusLevelEntries(): readonly GameDropdownOptionEntry[] {
  if (amplifyBotLevelEntriesCache) return amplifyBotLevelEntriesCache
  const entries = buildIlmAmplifyBotBonusLevelOptions().map(option => ({
    value: Number(option.value),
    baseValue: Number(option.value),
  }))
  amplifyBotLevelEntriesCache = entries
  return entries
}

export function formatIlmAmplifyBotBonusLevelOptionLabel(level: number): string {
  const match = buildIlmAmplifyBotBonusLevelOptions().find(option => option.value === level)
  return match?.title ?? `Level ${level}`
}

export function buildIlmModuleSubstatRarityEntries(): readonly GameDropdownOptionEntry[] {
  return buildIlmModuleSubstatRarityOptions().map((option, index) => ({
    value: index,
    baseValue: index,
    meta: { choice: option.value },
  }))
}

export function formatIlmModuleSubstatRarityOptionLabel(index: number): string {
  const options = buildIlmModuleSubstatRarityOptions()
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.title ?? String(index)
}

export function computeIlmModuleSubstatRarityIndex(
  choice: IlmModuleSubstatRarityChoice | null | undefined,
): number {
  const options = buildIlmModuleSubstatRarityOptions()
  const idx = options.findIndex(option => option.value === (choice ?? ILM_MODULE_SUBSTAT_NONE))
  return idx >= 0 ? idx : 0
}

export function getIlmModuleSubstatRarityByIndex(index: number): IlmModuleSubstatRarityChoice {
  const options = buildIlmModuleSubstatRarityOptions()
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.value ?? ILM_MODULE_SUBSTAT_NONE
}

export function buildIlmUniqueModuleRarityEntries(
  moduleId: IlmUniqueModuleId,
): readonly GameDropdownOptionEntry[] {
  return buildIlmUniqueModuleRarityOptions(moduleId).map((option, index) => ({
    value: index,
    baseValue: index,
    meta: { choice: option.value },
  }))
}

export function buildIlmUniqueModuleRarityOptionLabel(
  moduleId: IlmUniqueModuleId,
  index: number,
): string {
  const options = buildIlmUniqueModuleRarityOptions(moduleId)
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.title ?? String(index)
}

export function computeIlmUniqueModuleRarityIndex(
  moduleId: IlmUniqueModuleId,
  choice: IlmUniqueModuleRarityChoice | null | undefined,
): number {
  const options = buildIlmUniqueModuleRarityOptions(moduleId)
  const idx = options.findIndex(option => option.value === (choice ?? ILM_MODULE_SUBSTAT_NONE))
  return idx >= 0 ? idx : 0
}

export function getIlmUniqueModuleRarityByIndex(
  moduleId: IlmUniqueModuleId,
  index: number,
): IlmUniqueModuleRarityChoice {
  const options = buildIlmUniqueModuleRarityOptions(moduleId)
  const clamped = Math.max(0, Math.min(options.length - 1, Math.floor(Number(index) || 0)))
  return options[clamped]?.value ?? ILM_MODULE_SUBSTAT_NONE
}

export function buildIlmShockStackEntries(maxStack = 99): readonly GameDropdownOptionEntry[] {
  if (shockStackEntriesCache) return shockStackEntriesCache
  shockStackEntriesCache = Array.from({ length: maxStack + 1 }, (_, stack) => ({
    value: stack,
    baseValue: stack,
  }))
  return shockStackEntriesCache
}

export function formatIlmShockStackOptionLabel(stack: number): string {
  return stack === 0 ? 'No stacks' : `${stack} stack${stack === 1 ? '' : 's'}`
}

export const ILM_UNIQUE_MODULE_LABELS: Record<IlmUniqueModuleId, string> = {
  [ILM_UNIQUE_MODULE_IDS.dimensionCore]: 'Dimension Core',
  [ILM_UNIQUE_MODULE_IDS.magneticHook]: 'Magnetic Hook',
  [ILM_UNIQUE_MODULE_IDS.singularityHarness]: 'Singularity Harness',
  [ILM_UNIQUE_MODULE_IDS.antiCubePortal]: 'Anti-Cube Portal',
}
