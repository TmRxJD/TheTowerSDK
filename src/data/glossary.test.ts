/**
 * The glossary is only worth shipping if its names are real. These tests are the
 * thing that makes that true: an expansion that does not resolve to a catalog
 * name fails the build, so a plausible-sounding but invented term cannot land.
 */
import { describe, expect, it } from 'vitest'
import * as data from './index'
import * as save from '../save/index'
import {
  expandAcronym,
  GLOSSARY,
  GLOSSARY_CONCEPTS,
  GLOSSARY_NAMES,
  listAmbiguousGlossaryTerms,
  lookupGlossary,
} from './glossary'

const catalog = { ...data, ...save } as Record<string, unknown>

/** Every player-facing name the shipped catalogs contain. */
function collectCatalogNames(): Set<string> {
  const names = new Set<string>()
  const push = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) names.add(value.trim().toLowerCase())
  }

  for (const weapon of (catalog.ULTIMATE_WEAPON_IMPORT_CATALOG as any[]) ?? []) {
    push(weapon.name)
    push(weapon.plusName)
  }
  for (const bot of (catalog.BOT_IMPORT_CATALOG as any[]) ?? []) push(bot.name)
  for (const module of (catalog.MODULE_TEMPLATES as any[]) ?? []) push(module.name)
  for (const card of (catalog.CARD_IMPORT_CATALOG as any[]) ?? []) push(card.name)
  for (const currency of (catalog.CURRENCY_DEFINITIONS as any[]) ?? []) push(currency.name)
  for (const type of (catalog.TOWER_MODULE_TYPE_ENUM as any[]) ?? []) push(type.name)
  const workshop = (catalog.getWorkshopStatDefinitions as (() => any[]) | undefined)?.() ?? []
  for (const stat of workshop) push(stat.name ?? stat.label)

  return names
}

describe('glossary', () => {
  const catalogNames = collectCatalogNames()

  it('has entries', () => {
    expect(GLOSSARY_NAMES.length).toBeGreaterThan(100)
    expect(GLOSSARY_CONCEPTS.length).toBeGreaterThan(10)
  })

  it('every acronym expands to a name that exists in the catalogs', () => {
    const unresolved = GLOSSARY
      .filter(entry => entry.expansion)
      .filter(entry => !catalogNames.has(entry.expansion!.trim().toLowerCase()))
      .map(entry => `${entry.term} → ${entry.expansion}`)

    expect(unresolved).toEqual([])
  })

  it('every entry is fully described', () => {
    for (const entry of GLOSSARY) {
      expect(entry.term.trim(), JSON.stringify(entry)).toBeTruthy()
      expect(entry.definition.trim().length, entry.term).toBeGreaterThan(10)
      expect(['name', 'acronym', 'concept']).toContain(entry.kind)
    }
  })

  it('does not define the same meaning twice', () => {
    const keys = GLOSSARY.map(entry =>
      `${entry.kind}|${entry.domain}|${entry.term.toLowerCase()}|${entry.expansion ?? ''}`)
    expect(keys.length).toBe(new Set(keys).size)
  })

  it('flags terms that mean more than one thing', () => {
    const ambiguous = listAmbiguousGlossaryTerms()
    expect(ambiguous).toContain('SR')

    const shrinkOrSolar = lookupGlossary('SR')
    expect(shrinkOrSolar.length).toBeGreaterThan(1)
    // Ambiguous on its own, resolvable once a caller commits to a domain.
    expect(expandAcronym('SR')).toBeNull()
  })

  it('resolves unambiguous acronyms', () => {
    expect(expandAcronym('ILM')).toBe('Inner Land Mines')
    expect(expandAcronym('GT')).toBe('Golden Tower')
    expect(expandAcronym('CPK')).toBe('Coins / Kill Bonus')
  })

  it('lookup is case-insensitive and trims', () => {
    expect(lookupGlossary('  ilm  ')).toEqual(lookupGlossary('ILM'))
  })

  it('does not contain names the game does not use', () => {
    // Regressions caught in review; each was a plausible-looking invention.
    for (const invented of ['Chronofield', 'Energy Bender', 'Gold Bot', 'Wildfire Ultimate']) {
      expect(lookupGlossary(invented), invented).toEqual([])
    }
  })
})
