import {
  isModuleEffectsTablePopulated,
  MODULE_EFFECTS_TABLE,
} from '../data/assets'
import { MODULE_TYPE_ROWS } from '../data/module-enums'
import { resolveModuleEffect } from '../data/module-effect-resolver'
import type { ModuleSubstatCanonicalRarity } from '../data/module-substats'

export type ModuleSaveSlotCategory = 'Cannon' | 'Armor' | 'Generator' | 'Core'

const TYPE_TO_CATEGORY: Record<number, ModuleSaveSlotCategory> = {
  0: 'Cannon',
  1: 'Armor',
  2: 'Generator',
  3: 'Core',
}

function categoryForModuleType(moduleType: number): ModuleSaveSlotCategory | null {
  return TYPE_TO_CATEGORY[moduleType] ?? MODULE_TYPE_ROWS.find(entry => entry.value === moduleType)?.name ?? null
}

function buildCategoryLabelMaps(): Record<ModuleSaveSlotCategory, Record<number, string>> {
  const result: Record<ModuleSaveSlotCategory, Record<number, string>> = {
    Cannon: {},
    Armor: {},
    Generator: {},
    Core: {},
  }

  if (!isModuleEffectsTablePopulated()) return result

  for (const [effectId, row] of Object.entries(MODULE_EFFECTS_TABLE)) {
    if (!row) continue
    const resolved = resolveModuleEffect(Number(effectId))
    if (!resolved?.label) continue
    const category = categoryForModuleType(row.type)
    if (!category) continue
    result[category][Number(effectId)] = resolved.label
  }

  return result
}

export const MODULE_SAVE_EFFECT_ID_LABELS = buildCategoryLabelMaps()

export function resolveModuleSaveEffectLabel(
  effectId: number,
  category: ModuleSaveSlotCategory,
): string | null {
  void category
  if (!effectId) return null
  return resolveModuleEffect(effectId)?.label ?? null
}

export function resolveModuleSaveEffectTier(effectId: number): ModuleSubstatCanonicalRarity | string {
  const resolved = resolveModuleEffect(effectId)
  if (!resolved) return 'Unknown'
  return resolved.rarityName
}

export function resolveModuleSaveEffectCategory(effectId: number): ModuleSaveSlotCategory | null {
  const row = MODULE_EFFECTS_TABLE[String(effectId)]
  if (!row) return null
  return categoryForModuleType(row.type)
}

export function isKnownModuleSaveEffectId(effectId: number, category: ModuleSaveSlotCategory): boolean {
  if (!effectId) return false
  return resolveModuleSaveEffectCategory(effectId) === category
    && Boolean(resolveModuleSaveEffectLabel(effectId, category))
}
