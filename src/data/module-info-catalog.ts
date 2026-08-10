import { MODULE_INFO_CATALOG } from '../save/catalogs/indexes'
import { MODULE_TEMPLATES, type ModuleCategory } from './modules'

export type ModuleInfoCatalogRow = (typeof MODULE_INFO_CATALOG)[number]

export interface ModuleInfoIdentity {
  name: string
  initials: string
  category: ModuleCategory
}

/**
 * Corrects catalog rows where icon names or legacy slots disagree with
 * module info catalog data (e.g. infoIndex 46 is NMP, not a second OA).
 */
const MODULE_INFO_INDEX_IDENTITY_OVERRIDES: Partial<Record<number, ModuleInfoIdentity>> = {
  18: { name: 'Space Displacer', initials: 'SD', category: 'Armor' },
  46: { name: 'Negative Mass Projector', initials: 'NMP', category: 'Armor' },
}

/**
 * Legacy epic sprite keys (cannon_epic_2, etc.) from module info catalog.
 * Names align with MODULE_TEMPLATES / localization catalog.
 */
const MODULE_GENERIC_EPIC_ICON_IDENTITIES: Record<string, Pick<ModuleInfoIdentity, 'name' | 'initials'>> = {
  cannon_epic_2: { name: 'Death Penalty', initials: 'DP' },
  cannon_epic_4: { name: 'Havoc Bringer', initials: 'HB' },
  armor_epic_4: { name: 'Space Displacer', initials: 'SD' },
  generator_epic_2: { name: 'Pulsar Harvester', initials: 'PH' },
  core_epic_1: { name: 'Multiverse Nexus', initials: 'MVN' },
}

function normalizeIconKey(iconName: string | null | undefined): string | null {
  if (iconName == null) return null
  const trimmed = String(iconName).replace(/\s*\(UnityEngine\.Sprite\)$/, '').trim()
  return trimmed || null
}

function findModuleTemplateByDisplayName(name: string, category: ModuleCategory) {
  const needle = name.trim().toLowerCase().replace(/\s+/g, ' ')
  return MODULE_TEMPLATES.find(template => {
    if (template.type !== category) return false
    const candidate = template.name.toLowerCase()
    return candidate === needle || candidate.replace(/\s+/g, '') === needle.replace(/\s+/g, '')
  }) ?? null
}

function resolveIdentityFromIconName(iconName: string, category: ModuleCategory): ModuleInfoIdentity | null {
  const icon = normalizeIconKey(iconName)
  if (!icon) return null

  const generic = MODULE_GENERIC_EPIC_ICON_IDENTITIES[icon.toLowerCase()]
  if (generic) {
    const template = findModuleTemplateByDisplayName(generic.name, category)
    return {
      name: template?.name ?? generic.name,
      initials: template?.initials ?? generic.initials,
      category,
    }
  }

  const humanName = icon.replace(/_\d+_\d+$/, '').replace(/_/g, ' ').trim()
  const template = findModuleTemplateByDisplayName(humanName, category)
  if (template) {
    return { name: template.name, initials: template.initials, category }
  }

  if (/^[A-Z]/.test(icon) && !icon.includes('_')) {
    const titled = findModuleTemplateByDisplayName(icon, category)
    if (titled) {
      return { name: titled.name, initials: titled.initials, category }
    }
  }

  return null
}

export function resolveModuleInfoIdentity(infoIndex: number): ModuleInfoIdentity | null {
  const override = MODULE_INFO_INDEX_IDENTITY_OVERRIDES[infoIndex]
  if (override) {
    const template = findModuleTemplateByDisplayName(override.name, override.category)
    return {
      name: template?.name ?? override.name,
      initials: template?.initials ?? override.initials,
      category: override.category,
    }
  }

  const row = MODULE_INFO_CATALOG.find(entry => entry.infoIndex === infoIndex) as {
    infoIndex: number; name: string | null; initials: string | null; category: string | null; iconName: string | null
  } | undefined
  if (!row?.category) return null

  const category = row.category as ModuleCategory

  if (row.name) {
    const template = findModuleTemplateByDisplayName(String(row.name), category)
    return {
      name: template?.name ?? String(row.name),
      initials: row.initials ?? template?.initials ?? String(row.name).slice(0, 2).toUpperCase(),
      category,
    }
  }

  if (row.iconName) {
    return resolveIdentityFromIconName(String(row.iconName), category)
  }

  return null
}

export function resolveModuleInfoCatalogRow(infoIndex: number): ModuleInfoCatalogRow | null {
  return MODULE_INFO_CATALOG.find(row => row.infoIndex === infoIndex) ?? null
}

export function resolveModuleInfoLabel(infoIndex: number): string | null {
  return resolveModuleInfoIdentity(infoIndex)?.name ?? resolveModuleInfoCatalogRow(infoIndex)?.name ?? null
}

export function listModuleInfoCatalogRows(): readonly ModuleInfoCatalogRow[] {
  return MODULE_INFO_CATALOG
}

export function buildModuleInfoIndexLookup(): ReadonlyMap<number, ModuleInfoCatalogRow> {
  return new Map(MODULE_INFO_CATALOG.map(row => [row.infoIndex, row]))
}
