/**
 * Effective Paths — the sync schema.
 *
 * The spreadsheet is maintained by people who know the game deeply and do not
 * write code. The point of this schema is that their ordinary edits — a changed
 * coefficient, a raised cap, a new term on a stat — reach the site as *data*,
 * validated, without anyone shipping a release.
 *
 * ## What syncs, and what does not
 *
 * A stat here is a list of named terms, and each term is a small typed
 * expression: a constant, a linear ramp over a level, a named input, or a
 * gated/summed/multiplied combination of those. That is the shape almost every
 * `EPH_*` function in the sheet already has, so most real edits are covered.
 *
 * It is deliberately *not* a formula language. Nothing here is parsed from
 * text or evaluated as code — a synced document cannot introduce behaviour,
 * only numbers and structure. A genuinely new formula shape still needs a
 * release, and that is the trade being made on purpose: a bad edit in the sheet
 * can produce a wrong number, but it can never execute anything.
 *
 * ## Using it
 *
 * Validate with {@link parseEffectivePathsDocument}, which never throws — a
 * document that fails validation should leave the caller on its bundled copy
 * rather than degrade to a half-applied state.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

/** A reference to a named value supplied at evaluation time. */
const InputRef = z.string().min(1).describe('Name of an input supplied by the caller')

export type EffectivePathsExpr =
  /** A fixed number. */
  | { kind: 'const', value: number }
  /** A named numeric input — a workshop value, a card multiplier. */
  | { kind: 'input', ref: string }
  /**
   * `base + perLevel × level`, the sheet's most common shape by far.
   * `1 + 0.03 × labLevel` is a lab that adds 3% a level.
   */
  | { kind: 'linear', base: number, perLevel: number, level: string }
  | { kind: 'sum', of: EffectivePathsExpr[] }
  | { kind: 'product', of: EffectivePathsExpr[] }
  /** `when ? then : otherwise` on a named boolean input. */
  | { kind: 'gated', when: string, then: EffectivePathsExpr, otherwise: EffectivePathsExpr }
  /** Clamp, for the caps the game applies — defense percent stops at 98%. */
  | { kind: 'clamp', value: EffectivePathsExpr, min?: number, max?: number }

export const EffectivePathsExprSchema: z.ZodType<EffectivePathsExpr> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('const'), value: z.number().finite() }),
    z.object({ kind: z.literal('input'), ref: InputRef }),
    z.object({
      kind: z.literal('linear'),
      base: z.number().finite(),
      perLevel: z.number().finite(),
      level: InputRef,
    }),
    z.object({ kind: z.literal('sum'), of: z.array(EffectivePathsExprSchema).min(1) }),
    z.object({ kind: z.literal('product'), of: z.array(EffectivePathsExprSchema).min(1) }),
    z.object({
      kind: z.literal('gated'),
      when: InputRef,
      then: EffectivePathsExprSchema,
      otherwise: EffectivePathsExprSchema,
    }),
    z.object({
      kind: z.literal('clamp'),
      value: EffectivePathsExprSchema,
      min: z.number().finite().optional(),
      max: z.number().finite().optional(),
    }),
  ]),
)

/** Values an expression may read: numbers for levels and stats, booleans for gates. */
export type EffectivePathsInputs = Readonly<Record<string, number | boolean>>

export class EffectivePathsInputError extends Error {
  constructor(public readonly ref: string) {
    super(`Effective Paths: no input named "${ref}"`)
    this.name = 'EffectivePathsInputError'
  }
}

function readNumber(inputs: EffectivePathsInputs, ref: string): number {
  const value = inputs[ref]
  if (value === undefined) throw new EffectivePathsInputError(ref)
  return typeof value === 'boolean' ? (value ? 1 : 0) : value
}

/**
 * Evaluate an expression.
 *
 * Throws {@link EffectivePathsInputError} for a missing input rather than
 * treating it as zero — a silently-absent level would produce a plausible wrong
 * answer, which is worse than a loud failure.
 */
export function evaluateExpr(expr: EffectivePathsExpr, inputs: EffectivePathsInputs): number {
  switch (expr.kind) {
    case 'const':
      return expr.value
    case 'input':
      return readNumber(inputs, expr.ref)
    case 'linear':
      return expr.base + expr.perLevel * readNumber(inputs, expr.level)
    case 'sum':
      return expr.of.reduce((total, part) => total + evaluateExpr(part, inputs), 0)
    case 'product':
      return expr.of.reduce((total, part) => total * evaluateExpr(part, inputs), 1)
    case 'gated': {
      const gate = inputs[expr.when]
      if (gate === undefined) throw new EffectivePathsInputError(expr.when)
      return evaluateExpr(gate ? expr.then : expr.otherwise, inputs)
    }
    case 'clamp': {
      let value = evaluateExpr(expr.value, inputs)
      if (expr.min !== undefined) value = Math.max(expr.min, value)
      if (expr.max !== undefined) value = Math.min(expr.max, value)
      return value
    }
  }
}

/** Every input an expression reads, for checking a document against a caller. */
export function collectExprInputs(expr: EffectivePathsExpr, into = new Set<string>()): Set<string> {
  switch (expr.kind) {
    case 'input':
      into.add(expr.ref)
      break
    case 'linear':
      into.add(expr.level)
      break
    case 'sum':
    case 'product':
      for (const part of expr.of) collectExprInputs(part, into)
      break
    case 'gated':
      into.add(expr.when)
      collectExprInputs(expr.then, into)
      collectExprInputs(expr.otherwise, into)
      break
    case 'clamp':
      collectExprInputs(expr.value, into)
      break
    case 'const':
      break
  }
  return into
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export const EffectivePathsTermSchema = z.object({
  /** Stable key. The sheet's own `LET` name where there is one — `PERKHP`, `DWHP`. */
  id: z.string().min(1),
  /** What to show a reader: "Death Wave Health". */
  label: z.string().min(1),
  /** Why this term exists, for the people maintaining it. */
  note: z.string().optional(),
  expr: EffectivePathsExprSchema,
})
export type EffectivePathsTerm = z.infer<typeof EffectivePathsTermSchema>

export const EffectivePathsStatSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /**
   * How the terms come together. Health multiplies its terms; defense percent
   * adds them. Mixing the two in one stat is not expressible on purpose — a
   * stat that needs it is a composition, which lives in code.
   */
  combine: z.enum(['product', 'sum']),
  terms: z.array(EffectivePathsTermSchema).min(1),
  /** Applied after combining, for a game cap such as defense percent's 98%. */
  clamp: z.object({
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  }).optional(),
})
export type EffectivePathsStat = z.infer<typeof EffectivePathsStatSchema>

/** Evaluate a stat, returning the total and each term's contribution. */
export function evaluateStat(
  stat: EffectivePathsStat,
  inputs: EffectivePathsInputs,
): { value: number, terms: Array<{ id: string, label: string, value: number }> } {
  const terms = stat.terms.map(term => ({
    id: term.id,
    label: term.label,
    value: evaluateExpr(term.expr, inputs),
  }))

  let value = stat.combine === 'product'
    ? terms.reduce((total, term) => total * term.value, 1)
    : terms.reduce((total, term) => total + term.value, 0)

  if (stat.clamp?.min !== undefined) value = Math.max(stat.clamp.min, value)
  if (stat.clamp?.max !== undefined) value = Math.min(stat.clamp.max, value)

  return { value, terms }
}

// ---------------------------------------------------------------------------
// Aliases
// ---------------------------------------------------------------------------

/**
 * Where an upgrade lives. This is what stops a name being mapped to a
 * plausible-looking neighbour: an Ultimate Weapon lab and a Defense lab can
 * share a word without sharing a domain.
 */
export const EffectivePathsDomainSchema = z.enum([
  'lab',
  'workshop',
  'workshop-enhancement',
  'card',
  'module',
  'ultimate-weapon',
  'perk',
  'relic',
  'vault',
  'guardian',
  'bot',
])
export type EffectivePathsDomain = z.infer<typeof EffectivePathsDomainSchema>

/**
 * One upgrade, named three ways: as the sheet writes it, as this package keys
 * it, and as the save file stores it.
 *
 * Chrono Field is the reason this is explicit. It has three separate reduction
 * stats — a speed reduction the weapon has by default, a lab that *unlocks*
 * damage reduction, and a lab that *increases* it. Two of those are labs with
 * similar names, and only the third is what the eHP path scores.
 */
export const EffectivePathsAliasSchema = z.object({
  /** Exactly as the sheet labels it, including its capitalisation. */
  sheetName: z.string().min(1),
  /** Alternate spellings the sheet uses for the same thing. */
  sheetAliases: z.array(z.string().min(1)).default([]),
  /** Stable id used everywhere in this package. */
  id: z.string().min(1),
  label: z.string().min(1),
  domain: EffectivePathsDomainSchema,
  /** The game's own grouping — "Defense", "Ultimate Weapon", "Perks". */
  category: z.string().min(1),
  /** Key in the lab catalog / save file, when this upgrade has one. */
  saveKey: z.string().min(1).optional(),
  /**
   * `true` when the upgrade is a one-off unlock rather than a level to climb.
   * The Chrono Field damage-reduction lab is one of these: a single level that
   * turns the stat on, with a second lab governing how much.
   */
  isUnlock: z.boolean().default(false),
  /** What this upgrade feeds, when it is not obvious from the name. */
  note: z.string().optional(),
})
export type EffectivePathsAlias = z.infer<typeof EffectivePathsAliasSchema>

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

export const EffectivePathsDocumentSchema = z.object({
  /** Schema version. Bump when the shape changes, not when the numbers do. */
  schemaVersion: z.literal(1),
  /** The spreadsheet release this was extracted from, e.g. "v5.09.02.01". */
  sheetVersion: z.string().min(1),
  /** ISO timestamp of extraction. */
  generatedAt: z.string().min(1),
  aliases: z.array(EffectivePathsAliasSchema),
  stats: z.array(EffectivePathsStatSchema),
})
export type EffectivePathsDocument = z.infer<typeof EffectivePathsDocumentSchema>

export type EffectivePathsParseResult =
  | { ok: true, document: EffectivePathsDocument }
  | { ok: false, errors: string[] }

/**
 * Validate a synced document.
 *
 * Never throws, and never returns a partly-valid document: a caller that gets
 * `ok: false` should stay on the copy it already has. Beyond the shape, this
 * rejects documents that are internally inconsistent — duplicate ids, or an
 * alias claiming a name another alias already uses — because those produce
 * silent mismappings rather than visible failures.
 */
export function parseEffectivePathsDocument(input: unknown): EffectivePathsParseResult {
  const parsed = EffectivePathsDocumentSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    }
  }

  const document = parsed.data
  const errors: string[] = []

  const seenIds = new Set<string>()
  const seenNames = new Set<string>()
  for (const alias of document.aliases) {
    if (seenIds.has(alias.id)) errors.push(`duplicate alias id: ${alias.id}`)
    seenIds.add(alias.id)

    for (const name of [alias.sheetName, ...alias.sheetAliases]) {
      const key = name.toLowerCase()
      if (seenNames.has(key)) errors.push(`sheet name claimed twice: ${name}`)
      seenNames.add(key)
    }
  }

  const seenStats = new Set<string>()
  for (const stat of document.stats) {
    if (seenStats.has(stat.id)) errors.push(`duplicate stat id: ${stat.id}`)
    seenStats.add(stat.id)

    const seenTerms = new Set<string>()
    for (const term of stat.terms) {
      if (seenTerms.has(term.id)) errors.push(`duplicate term id in ${stat.id}: ${term.id}`)
      seenTerms.add(term.id)
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, document }
}

/** Look an upgrade up by any name the sheet uses for it. */
export function findAliasBySheetName(
  document: EffectivePathsDocument,
  name: string,
): EffectivePathsAlias | null {
  const needle = name.trim().toLowerCase()
  return document.aliases.find(alias =>
    alias.sheetName.toLowerCase() === needle
    || alias.sheetAliases.some(other => other.toLowerCase() === needle),
  ) ?? null
}

/** Every input the document's stats read — what a caller has to supply. */
export function collectDocumentInputs(document: EffectivePathsDocument): Set<string> {
  const inputs = new Set<string>()
  for (const stat of document.stats) {
    for (const term of stat.terms) collectExprInputs(term.expr, inputs)
  }
  return inputs
}
