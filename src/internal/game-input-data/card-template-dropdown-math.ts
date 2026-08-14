import { CARD_TEMPLATES } from '../../data/index'
import type { GameDropdownOptionEntry } from './types'

export function buildCardTemplatePickerEntries(excludeTemplateIds: readonly string[] = []): readonly GameDropdownOptionEntry[] {
  const excluded = new Set(excludeTemplateIds)
  return CARD_TEMPLATES
    .filter(template => !excluded.has(template.id))
    .map((template, index) => ({
      value: index,
      baseValue: index,
      meta: {
        templateId: template.id,
        label: template.name,
        subtitle: typeof template.description === 'string' ? template.description : undefined,
      },
    }))
}

export function filterCardTemplatesForPicker(excludeTemplateIds: readonly string[] = []) {
  const excluded = new Set(excludeTemplateIds)
  return CARD_TEMPLATES.filter(template => !excluded.has(template.id))
}

export function buildCardTemplatePickerOptionLabel(index: number, excludeTemplateIds: readonly string[] = []): string {
  const templates = filterCardTemplatesForPicker(excludeTemplateIds)
  const clamped = Math.max(0, Math.min(templates.length - 1, Math.floor(Number(index) || 0)))
  return templates[clamped]?.name ?? String(index)
}

export function buildCardTemplatePickerOptionSubtitle(index: number, excludeTemplateIds: readonly string[] = []): string | undefined {
  const templates = filterCardTemplatesForPicker(excludeTemplateIds)
  const clamped = Math.max(0, Math.min(templates.length - 1, Math.floor(Number(index) || 0)))
  const description = templates[clamped]?.description
  return typeof description === 'string' ? description : undefined
}

export function computeCardTemplatePickerIndex(templateId: unknown, excludeTemplateIds: readonly string[] = []): number {
  if (typeof templateId !== 'string' || !templateId) return -1
  const templates = filterCardTemplatesForPicker(excludeTemplateIds)
  return templates.findIndex(template => template.id === templateId)
}

export function findCardTemplatePickerByIndex(index: number, excludeTemplateIds: readonly string[] = []): string | null {
  const templates = filterCardTemplatesForPicker(excludeTemplateIds)
  const clamped = Math.max(0, Math.min(templates.length - 1, Math.floor(Number(index) || 0)))
  return templates[clamped]?.id ?? null
}
