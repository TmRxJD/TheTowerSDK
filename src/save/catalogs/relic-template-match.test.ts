import { describe, expect, it } from 'vitest'
import { RELIC_TEMPLATES } from '../../data/relics'
import {
  buildRelicTemplateIdLookup,
  normalizeRelicMatchKey,
  resolveRelicTemplateIdFromSaveIndex,
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
    expect(resolveRelicTemplateIdFromSaveIndex(4, RELIC_TEMPLATES, lookup)).toBe('2-Epic-2')
    expect(resolveRelicTemplateIdFromSaveIndex(9, RELIC_TEMPLATES, lookup)).toBe('1-Rare-5')
    expect(resolveRelicTemplateIdFromSaveIndex(13, RELIC_TEMPLATES, lookup)).toBe('2-Epic-4')
    expect(resolveRelicTemplateIdFromSaveIndex(14, RELIC_TEMPLATES, lookup)).toBe('2-Epic-5')
    expect(resolveRelicTemplateIdFromSaveIndex(15, RELIC_TEMPLATES, lookup)).toBe('2-Epic-6')
    expect(resolveRelicTemplateIdFromSaveIndex(87, RELIC_TEMPLATES, lookup)).toBe('3-Legendary-10')
  })
})
