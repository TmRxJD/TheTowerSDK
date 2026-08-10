import {
  listThemeCatalogRows,
  type ThemeCatalogCategory,
} from './catalogs/themes'

const THEME_UNLOCK_SAVE_KEYS: Record<ThemeCatalogCategory, readonly string[]> = {
  tower: ['towerUnlocked', 'diceTowers'],
  background: ['backgroundUnlocked', 'diceBackgrounds'],
  menu: ['menuUnlocked'],
  profileBanner: ['profileBannerUnlocked'],
  guardian: ['guardianSkinUnlocked'],
  song: ['trackAvailable'],
}

function readSaveBoolean(value: unknown): boolean {
  return value === true
}

function readBoolUnlockArray(value: unknown): boolean[] {
  if (!Array.isArray(value)) return []
  return value.map(readSaveBoolean)
}

function isThemeUnlockedInSave(
  root: Record<string, unknown>,
  category: ThemeCatalogCategory,
  catalogIndex: number,
): boolean {
  for (const key of THEME_UNLOCK_SAVE_KEYS[category]) {
    const flags = readBoolUnlockArray(root[key])
    if (flags[catalogIndex] === true) return true
  }
  return false
}

/** Theme names as used by the Relics tracker `collectedThemes` map (catalog label). */
export function extractCollectedThemeNamesFromSaveRoot(
  root: Record<string, unknown> | null,
): string[] {
  if (!root) return []

  const names = new Set<string>()
  for (const row of listThemeCatalogRows()) {
    if (!isThemeUnlockedInSave(root, row.category, row.catalogIndex)) continue
    const name = String(row.label || row.name || '').trim()
    if (name) names.add(name)
  }

  return [...names].sort((a, b) => a.localeCompare(b))
}
