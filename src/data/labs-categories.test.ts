import { describe, expect, it } from 'vitest'
import {
  resolveSiteLabCategoryForSaveIndex,
  resolveSiteLabDisplayNameForSaveIndex,
  resolveSiteLabSlugFromApiName,
} from './labs-categories'

describe('lab-research-site-map', () => {
  it('maps legacy API bot slugs to save indices', () => {
    expect(resolveSiteLabSlugFromApiName('gold_bot_cooldown')).toMatchObject({
      saveIndex: 104,
      saveSlug: 'golden_bot_cooldown',
    })
    expect(resolveSiteLabDisplayNameForSaveIndex(104)).toBe('Golden Bot - Cooldown')
  })

  it('maps lab categories when the catalog category is missing', () => {
    expect(resolveSiteLabCategoryForSaveIndex(131)).toBe('Attack')
    expect(resolveSiteLabCategoryForSaveIndex(132)).toBe('Attack')
    expect(resolveSiteLabCategoryForSaveIndex(199)).toBe('Main')
  })

  it('maps shock API slugs to ultimate weapon save indices', () => {
    expect(resolveSiteLabSlugFromApiName('chain_lightning_shock_chance')).toMatchObject({
      saveIndex: 63,
      saveSlug: 'shock_chance',
    })
    expect(resolveSiteLabDisplayNameForSaveIndex(63)).toBe('Shock Chance')
  })
})
