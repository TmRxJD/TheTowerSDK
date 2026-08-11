import { describe, expect, it } from 'vitest'
import { RELIC_TEMPLATES } from '../../data/relics'
import {
  buildRelicTemplateIdLookup,
  normalizeRelicMatchKey,
  findRelicTemplateIdFromSaveIndex,
} from './relic-template-match'

describe('relic-template-match', () => {
  it('normalizes spaced and roman tier relic names', () => {
    expect(normalizeRelicMatchKey('Gold Badge')).toBe('goldbadge')
    expect(normalizeRelicMatchKey('GoldBadge')).toBe('goldbadge')
    expect(normalizeRelicMatchKey('T:II Lumin')).toBe('t:2lumin')
    expect(normalizeRelicMatchKey('T:2 Lumin')).toBe('t:2lumin')
    expect(normalizeRelicMatchKey('T: VI Nova')).toBe('t:6nova')
  })

  it('resolves catalog save indices to tracker template ids', () => {
    const lookup = buildRelicTemplateIdLookup(RELIC_TEMPLATES)
    expect(findRelicTemplateIdFromSaveIndex(4, RELIC_TEMPLATES, lookup)).toBe('2-Epic-2')
    expect(findRelicTemplateIdFromSaveIndex(9, RELIC_TEMPLATES, lookup)).toBe('1-Rare-5')
    expect(findRelicTemplateIdFromSaveIndex(13, RELIC_TEMPLATES, lookup)).toBe('2-Epic-4')
    expect(findRelicTemplateIdFromSaveIndex(14, RELIC_TEMPLATES, lookup)).toBe('2-Epic-5')
    expect(findRelicTemplateIdFromSaveIndex(15, RELIC_TEMPLATES, lookup)).toBe('2-Epic-6')
    expect(findRelicTemplateIdFromSaveIndex(87, RELIC_TEMPLATES, lookup)).toBe('3-Legendary-10')
  })
})
