import { describe, expect, it } from 'vitest'
import {
  findSiteLabCategoryForSaveIndex,
  findSiteLabDisplayNameForSaveIndex,
  findSiteLabSlugFromApiName,
} from './labs-categories'

describe('lab-research-site-map', () => {
  it('maps legacy API bot slugs to save indices', () => {
    expect(findSiteLabSlugFromApiName('gold_bot_cooldown')).toMatchObject({
      saveIndex: 104,
      saveSlug: 'golden_bot_cooldown',
    })
    expect(findSiteLabDisplayNameForSaveIndex(104)).toBe('Golden Bot - Cooldown')
  })

  it('maps lab categories when the catalog category is missing', () => {
    expect(findSiteLabCategoryForSaveIndex(131)).toBe('Attack')
    expect(findSiteLabCategoryForSaveIndex(132)).toBe('Attack')
    expect(findSiteLabCategoryForSaveIndex(199)).toBe('Main')
  })

  it('maps shock API slugs to ultimate weapon save indices', () => {
    expect(findSiteLabSlugFromApiName('chain_lightning_shock_chance')).toMatchObject({
      saveIndex: 63,
      saveSlug: 'shock_chance',
    })
    expect(findSiteLabDisplayNameForSaveIndex(63)).toBe('Shock Chance')
  })
})
