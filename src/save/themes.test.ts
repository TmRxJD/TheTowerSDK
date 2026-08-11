import { describe, expect, it } from 'vitest'
import { listThemeCatalogRows } from './catalogs/themes'
import { readCollectedThemeNamesFromSaveRoot } from './themes'

describe('themes-from-save', () => {
  it('collects unlocked theme names from save unlock arrays', () => {
    const towerRow = listThemeCatalogRows().find(row => row.category === 'tower' && row.name === 'Star')
    expect(towerRow).toBeTruthy()

    const root: Record<string, unknown> = {
      towerUnlocked: Array.from({ length: (towerRow!.catalogIndex + 1) }, (_, index) => index === towerRow!.catalogIndex),
      menuUnlocked: [],
      backgroundUnlocked: [],
      profileBannerUnlocked: [],
      guardianSkinUnlocked: [],
      trackAvailable: [],
    }

    const names = readCollectedThemeNamesFromSaveRoot(root)
    expect(names).toContain('Star')
  })

  it('returns empty list when save has no unlock arrays', () => {
    expect(readCollectedThemeNamesFromSaveRoot({})).toEqual([])
    expect(readCollectedThemeNamesFromSaveRoot(null)).toEqual([])
  })
})
