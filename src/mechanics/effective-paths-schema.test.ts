import { describe, expect, it } from 'vitest'
import {
  EFFECTIVE_PATHS_ALIASES,
  getEffectivePathsAliasesByDomain,
  resolveEffectivePathsAlias,
} from './effective-paths-aliases'
import {
  EffectivePathsInputError,
  collectExprInputs,
  evaluateExpr,
  evaluateStat,
  findAliasBySheetName,
  parseEffectivePathsDocument,
  type EffectivePathsExpr,
  type EffectivePathsStat,
} from './effective-paths-schema'

describe('expressions', () => {
  const inputs = { labLevel: 10, spb: 25, cardValue: 2.4, hasPerk: true, hasCard: false }

  it('evaluates the shapes the sheet actually uses', () => {
    expect(evaluateExpr({ kind: 'const', value: 0.3 }, inputs)).toBe(0.3)
    expect(evaluateExpr({ kind: 'input', ref: 'cardValue' }, inputs)).toBe(2.4)
    // 1 + 0.03 * 10 — a lab that adds 3% a level.
    expect(evaluateExpr(
      { kind: 'linear', base: 1, perLevel: 0.03, level: 'labLevel' }, inputs,
    )).toBeCloseTo(1.3, 12)
  })

  it('gates on a boolean input, falling back to the identity', () => {
    const perk: EffectivePathsExpr = {
      kind: 'gated',
      when: 'hasPerk',
      then: {
        kind: 'product',
        of: [
          { kind: 'const', value: 2 },
          { kind: 'linear', base: 1, perLevel: 0.01, level: 'spb' },
        ],
      },
      otherwise: { kind: 'const', value: 1 },
    }
    expect(evaluateExpr(perk, inputs)).toBeCloseTo(2 * 1.25, 12)
    expect(evaluateExpr(perk, { ...inputs, hasPerk: false })).toBe(1)
  })

  it('clamps, for the caps the game applies', () => {
    const capped: EffectivePathsExpr = {
      kind: 'clamp',
      value: { kind: 'linear', base: 0, perLevel: 0.5, level: 'labLevel' },
      max: 0.98,
    }
    expect(evaluateExpr(capped, inputs)).toBe(0.98)
    expect(evaluateExpr(capped, { ...inputs, labLevel: 1 })).toBe(0.5)
  })

  it('fails loudly on a missing input rather than treating it as zero', () => {
    expect(() => evaluateExpr({ kind: 'input', ref: 'nope' }, inputs))
      .toThrow(EffectivePathsInputError)
    expect(() => evaluateExpr(
      { kind: 'linear', base: 1, perLevel: 1, level: 'missingLevel' }, inputs,
    )).toThrow(/missingLevel/)
  })

  it('reports every input it reads, including inside gates', () => {
    const expr: EffectivePathsExpr = {
      kind: 'gated',
      when: 'hasCard',
      then: { kind: 'input', ref: 'cardValue' },
      otherwise: { kind: 'linear', base: 1, perLevel: 0.03, level: 'labLevel' },
    }
    expect([...collectExprInputs(expr)].sort()).toEqual(['cardValue', 'hasCard', 'labLevel'])
  })
})

describe('stats', () => {
  const health: EffectivePathsStat = {
    id: 'health',
    label: 'Health',
    combine: 'product',
    terms: [
      { id: 'WS', label: 'Workshop', expr: { kind: 'input', ref: 'workshopValue' } },
      { id: 'LAB', label: 'Lab', expr: { kind: 'linear', base: 1, perLevel: 0.03, level: 'labLevel' } },
    ],
  }

  it('multiplies its terms and reports each contribution', () => {
    const result = evaluateStat(health, { workshopValue: 100, labLevel: 10 })
    expect(result.value).toBeCloseTo(130, 9)
    expect(result.terms).toEqual([
      { id: 'WS', label: 'Workshop', value: 100 },
      { id: 'LAB', label: 'Lab', value: 1.3 },
    ])
  })

  it('sums an additive stat and applies its cap', () => {
    const defense: EffectivePathsStat = {
      id: 'defense-percent',
      label: 'Defense %',
      combine: 'sum',
      terms: [
        { id: 'LAB', label: 'Lab', expr: { kind: 'linear', base: 0, perLevel: 0.002, level: 'labLevel' } },
        { id: 'PERK', label: 'Perk', expr: { kind: 'const', value: 0.9 } },
      ],
      clamp: { max: 0.98 },
    }
    expect(evaluateStat(defense, { labLevel: 10 }).value).toBeCloseTo(0.92, 9)
    expect(evaluateStat(defense, { labLevel: 100 }).value).toBe(0.98)
  })
})

describe('document validation', () => {
  const valid = {
    schemaVersion: 1 as const,
    sheetVersion: 'v5.09.02.01',
    generatedAt: '2026-08-10T00:00:00.000Z',
    aliases: [{
      sheetName: 'Health', sheetAliases: [], id: 'health', label: 'Health',
      domain: 'lab' as const, category: 'Defense', saveKey: 'health', isUnlock: false,
    }],
    stats: [{
      id: 'health', label: 'Health', combine: 'product' as const,
      terms: [{ id: 'LAB', label: 'Lab', expr: { kind: 'linear' as const, base: 1, perLevel: 0.03, level: 'labLevel' } }],
    }],
  }

  it('accepts a well-formed document', () => {
    const result = parseEffectivePathsDocument(valid)
    expect(result.ok).toBe(true)
    if (result.ok) expect(findAliasBySheetName(result.document, 'health')?.id).toBe('health')
  })

  it('rejects rather than throwing, so a caller can keep its bundled copy', () => {
    for (const bad of [null, {}, 'nonsense', { ...valid, schemaVersion: 2 }]) {
      const result = parseEffectivePathsDocument(bad)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.length).toBeGreaterThan(0)
    }
  })

  it('rejects a document that would mismap silently', () => {
    const duplicateId = { ...valid, aliases: [valid.aliases[0], { ...valid.aliases[0] }] }
    const dupes = parseEffectivePathsDocument(duplicateId)
    expect(dupes.ok).toBe(false)
    if (!dupes.ok) expect(dupes.errors.join()).toMatch(/duplicate alias id|claimed twice/)

    const stolenName = {
      ...valid,
      aliases: [
        valid.aliases[0],
        { ...valid.aliases[0], id: 'other', sheetName: 'Other', sheetAliases: ['health'] },
      ],
    }
    const stolen = parseEffectivePathsDocument(stolenName)
    expect(stolen.ok).toBe(false)
    if (!stolen.ok) expect(stolen.errors.join()).toMatch(/claimed twice/)
  })

  it('rejects an expression that is not one of the known shapes', () => {
    const result = parseEffectivePathsDocument({
      ...valid,
      stats: [{
        ...valid.stats[0],
        terms: [{ id: 'X', label: 'X', expr: { kind: 'eval', code: 'process.exit()' } }],
      }],
    })
    expect(result.ok).toBe(false)
  })
})

describe('the alias registry', () => {
  it('takes every lab category from the catalog, so none can be invented', () => {
    // buildAlias throws on an unknown saveKey, so merely importing proves this;
    // this pins the categories that resulted.
    const labs = getEffectivePathsAliasesByDomain('lab')
    expect(labs.length).toBeGreaterThan(10)
    for (const lab of labs) {
      expect(lab.saveKey, `${lab.sheetName} should have a saveKey`).toBeDefined()
      expect(lab.category.length).toBeGreaterThan(0)
    }
  })

  it('separates Chrono Field\'s unlock lab from the lab that increases it', () => {
    const amount = resolveEffectivePathsAlias('Chrono Field Reduction %')
    expect(amount?.id).toBe('chrono-field-reduction-amount')
    expect(amount?.saveKey).toBe('chrono_field_reduction')
    expect(amount?.isUnlock).toBe(false)
    expect(amount?.category).toBe('Ultimate Weapon')

    const unlock = resolveEffectivePathsAlias('Chrono Field Damage Reduction Unlock')
    expect(unlock?.saveKey).toBe('chrono_field_damage_reduction')
    expect(unlock?.isUnlock).toBe(true)

    // They are different upgrades and must never collapse onto one another.
    expect(amount?.id).not.toBe(unlock?.id)
    expect(amount?.saveKey).not.toBe(unlock?.saveKey)
  })

  it('accepts both spellings the sheet uses for the trade-off perks lab', () => {
    expect(resolveEffectivePathsAlias('Improve Trade-off Perks')?.id)
      .toBe('improve-trade-off-perks')
    expect(resolveEffectivePathsAlias('Improve Trade-Off Perks')?.id)
      .toBe('improve-trade-off-perks')
  })

  it('keeps non-lab upgrades out of the lab domain', () => {
    const substat = resolveEffectivePathsAlias('Assist Module Substats - Armor')
    expect(substat?.domain).toBe('module')
    expect(substat?.saveKey).toBeUndefined()

    expect(resolveEffectivePathsAlias('Health Mastery')?.domain).toBe('card')
    expect(resolveEffectivePathsAlias('Dissonant Echo - Defense')?.domain).toBe('relic')
  })

  it('has no duplicate ids or sheet names', () => {
    const ids = EFFECTIVE_PATHS_ALIASES.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)

    const names = EFFECTIVE_PATHS_ALIASES.flatMap(a => [a.sheetName, ...a.sheetAliases])
      .map(n => n.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })

  it('returns null for an unknown name instead of guessing', () => {
    expect(resolveEffectivePathsAlias('Chrono Field Speed Reduction')).toBeNull()
    expect(resolveEffectivePathsAlias('')).toBeNull()
  })
})
