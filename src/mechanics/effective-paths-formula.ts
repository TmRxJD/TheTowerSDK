/**
 * Effective Paths — reading the spreadsheet's own functions.
 *
 * The sheet defines its maths as named `LAMBDA`s, and this turns one of those
 * into the typed {@link EffectivePathsStat} the rest of the package evaluates.
 * It is the step that lets a maintainer's edit in the sheet become data here
 * without anyone hand-transcribing a formula.
 *
 * ```text
 * LAMBDA(ws_val, lab_lvl, LET(
 *   WS,  ws_val,
 *   LAB, 1 + 0.03 * lab_lvl,
 *   WS * LAB))
 * ```
 *
 * becomes a stat with inputs `[ws_val, lab_lvl]`, terms `WS` and `LAB`, and a
 * result of `WS × LAB`.
 *
 * ## Deliberately narrow
 *
 * This understands the subset the `EPH_*` functions use: arithmetic,
 * comparisons, `IF`, `MIN`, `MAX`, `LET` and `LAMBDA`. Anything else — a
 * `XLOOKUP` into a data table, a dynamic-array function like `BYROW` — throws
 * {@link EffectivePathsFormulaError} rather than being approximated. A formula
 * we cannot read exactly is one a release should handle, not a sync.
 *
 * Nothing here evaluates anything. It produces data, which
 * `parseEffectivePathsDocument` then validates.
 */

import type { EffectivePathsExpr, EffectivePathsStat, EffectivePathsTerm } from './effective-paths-schema'

export class EffectivePathsFormulaError extends Error {
  constructor(message: string, public readonly functionName?: string) {
    super(functionName ? `${functionName}: ${message}` : message)
    this.name = 'EffectivePathsFormulaError'
  }
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

type TokenType = 'number' | 'name' | 'op' | 'punct' | 'string'
interface Token { type: TokenType, value: string, at: number }

const OPERATORS = ['<>', '>=', '<=', '+', '-', '*', '/', '^', '=', '>', '<']

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < source.length) {
    const char = source[i]

    if (/\s/.test(char)) { i++; continue }

    if (char === '"') {
      let j = i + 1
      while (j < source.length && source[j] !== '"') j++
      tokens.push({ type: 'string', value: source.slice(i + 1, j), at: i })
      i = j + 1
      continue
    }

    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(source[i + 1] ?? ''))) {
      let j = i
      while (j < source.length && /[0-9.]/.test(source[j])) j++
      tokens.push({ type: 'number', value: source.slice(i, j), at: i })
      i = j
      continue
    }

    if (/[A-Za-z_]/.test(char)) {
      let j = i
      while (j < source.length && /[A-Za-z0-9_.]/.test(source[j])) j++
      tokens.push({ type: 'name', value: source.slice(i, j), at: i })
      i = j
      continue
    }

    if (char === '%' || char === '(' || char === ')' || char === ',') {
      tokens.push({ type: 'punct', value: char, at: i })
      i++
      continue
    }

    const operator = OPERATORS.find(op => source.startsWith(op, i))
    if (operator) {
      tokens.push({ type: 'op', value: operator, at: i })
      i += operator.length
      continue
    }

    throw new EffectivePathsFormulaError(`unexpected character "${char}" at ${i}`)
  }

  return tokens
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Raw parse tree, before names are resolved to inputs or term references. */
type Node =
  | { kind: 'number', value: number }
  | { kind: 'string', value: string }
  | { kind: 'name', name: string }
  | { kind: 'unary', op: string, of: Node }
  | { kind: 'binary', op: string, left: Node, right: Node }
  | { kind: 'call', name: string, args: Node[] }

class Parser {
  private position = 0

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token | undefined { return this.tokens[this.position] }

  private take(value?: string): Token {
    const token = this.tokens[this.position]
    if (!token) throw new EffectivePathsFormulaError('unexpected end of formula')
    if (value !== undefined && token.value !== value) {
      throw new EffectivePathsFormulaError(`expected "${value}" but found "${token.value}"`)
    }
    this.position++
    return token
  }

  private at(value: string): boolean { return this.peek()?.value === value }

  atEnd(): boolean { return this.position >= this.tokens.length }

  /** comparison := additive (op additive)? */
  parseExpression(): Node {
    let left = this.parseAdditive()
    const token = this.peek()
    if (token?.type === 'op' && ['=', '<>', '>', '>=', '<', '<='].includes(token.value)) {
      this.take()
      left = { kind: 'binary', op: token.value, left, right: this.parseAdditive() }
    }
    return left
  }

  private parseAdditive(): Node {
    let left = this.parseMultiplicative()
    while (this.at('+') || this.at('-')) {
      const op = this.take().value
      left = { kind: 'binary', op, left, right: this.parseMultiplicative() }
    }
    return left
  }

  private parseMultiplicative(): Node {
    let left = this.parseUnary()
    while (this.at('*') || this.at('/')) {
      const op = this.take().value
      left = { kind: 'binary', op, left, right: this.parseUnary() }
    }
    return left
  }

  private parseUnary(): Node {
    if (this.at('-')) {
      this.take()
      return { kind: 'unary', op: '-', of: this.parseUnary() }
    }
    if (this.at('+')) {
      this.take()
      return this.parseUnary()
    }
    return this.parsePower()
  }

  private parsePower(): Node {
    const base = this.parsePrimary()
    if (this.at('^')) {
      this.take()
      return { kind: 'binary', op: '^', left: base, right: this.parseUnary() }
    }
    return base
  }

  private parsePrimary(): Node {
    const token = this.take()
    let node: Node

    if (token.type === 'number') {
      node = { kind: 'number', value: Number(token.value) }
    } else if (token.type === 'string') {
      node = { kind: 'string', value: token.value }
    } else if (token.value === '(') {
      node = this.parseExpression()
      this.take(')')
    } else if (token.type === 'name') {
      if (this.at('(')) {
        this.take('(')
        const args: Node[] = []
        if (!this.at(')')) {
          args.push(this.parseExpression())
          while (this.at(',')) { this.take(','); args.push(this.parseExpression()) }
        }
        this.take(')')
        node = { kind: 'call', name: token.value, args }
      } else {
        node = { kind: 'name', name: token.value }
      }
    } else {
      throw new EffectivePathsFormulaError(`unexpected "${token.value}"`)
    }

    // The sheet writes percentages postfix: `2%` and `1% * lab_lvl`.
    while (this.at('%')) {
      this.take('%')
      node = { kind: 'binary', op: '/', left: node, right: { kind: 'number', value: 100 } }
    }

    return node
  }

  /** Parse a comma-separated argument list of a top-level call. */
  parseTopLevelCall(): { name: string, args: Node[] } {
    const first = this.take()
    if (first.type !== 'name') {
      throw new EffectivePathsFormulaError(`expected a function name, found "${first.value}"`)
    }
    this.take('(')
    const args: Node[] = []
    if (!this.at(')')) {
      args.push(this.parseExpression())
      while (this.at(',')) { this.take(','); args.push(this.parseExpression()) }
    }
    this.take(')')
    return { name: first.value, args }
  }
}

// ---------------------------------------------------------------------------
// Lowering to the typed expression
// ---------------------------------------------------------------------------

interface Scope {
  /** LAMBDA parameters, lower-cased — the sheet is case-insensitive. */
  inputs: Map<string, string>
  /** LET bindings declared so far, lower-cased. */
  terms: Map<string, string>
}

/** Constant-fold a fully numeric node, so `2%` lands as `0.02`, not a division. */
function foldConstant(expr: EffectivePathsExpr): EffectivePathsExpr {
  switch (expr.kind) {
    case 'const':
      return expr
    case 'sum': case 'product': case 'min': case 'max': {
      const of = expr.of.map(foldConstant)
      if (of.every(part => part.kind === 'const')) {
        const values = of.map(part => (part as { value: number }).value)
        const value = expr.kind === 'sum' ? values.reduce((a, b) => a + b, 0)
          : expr.kind === 'product' ? values.reduce((a, b) => a * b, 1)
            : expr.kind === 'min' ? Math.min(...values) : Math.max(...values)
        return { kind: 'const', value }
      }
      return { ...expr, of }
    }
    case 'divide': {
      const numerator = foldConstant(expr.numerator)
      const denominator = foldConstant(expr.denominator)
      if (numerator.kind === 'const' && denominator.kind === 'const') {
        return { kind: 'const', value: numerator.value / denominator.value }
      }
      return { kind: 'divide', numerator, denominator }
    }
    case 'negate': {
      const of = foldConstant(expr.of)
      if (of.kind === 'const') return { kind: 'const', value: -of.value }
      return { kind: 'negate', of }
    }
    default:
      return expr
  }
}

/**
 * Rewrite `base + perLevel × level` into a `linear`, the shape the sheet uses
 * most and the one a maintainer can most easily edit.
 */
function normalizeLinear(expr: EffectivePathsExpr): EffectivePathsExpr {
  const asScaledInput = (part: EffectivePathsExpr): { perLevel: number, level: string } | null => {
    if (part.kind === 'input') return { perLevel: 1, level: part.ref }
    // `0.03 * lvl` has already become a linear by the time `1 + …` sees it.
    if (part.kind === 'linear' && part.base === 0) {
      return { perLevel: part.perLevel, level: part.level }
    }
    if (part.kind !== 'product' || part.of.length !== 2) return null
    const [left, right] = part.of
    if (left.kind === 'const' && right.kind === 'input') return { perLevel: left.value, level: right.ref }
    if (right.kind === 'const' && left.kind === 'input') return { perLevel: right.value, level: left.ref }
    return null
  }

  const scaled = asScaledInput(expr)
  if (scaled) return { kind: 'linear', base: 0, perLevel: scaled.perLevel, level: scaled.level }

  if (expr.kind === 'sum' && expr.of.length === 2) {
    const [left, right] = expr.of
    if (left.kind === 'const') {
      const part = asScaledInput(right)
      if (part) return { kind: 'linear', base: left.value, perLevel: part.perLevel, level: part.level }
    }
    if (right.kind === 'const') {
      const part = asScaledInput(left)
      if (part) return { kind: 'linear', base: right.value, perLevel: part.perLevel, level: part.level }
    }
  }

  return expr
}

const COMPARE_OPS: Record<string, EffectivePathsExpr extends never ? never : 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'> = {
  '=': 'eq', '<>': 'neq', '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte',
}

function lower(node: Node, scope: Scope, functionName: string): EffectivePathsExpr {
  const recurse = (child: Node) => lower(child, scope, functionName)

  switch (node.kind) {
    case 'number':
      return { kind: 'const', value: node.value }

    case 'string':
      throw new EffectivePathsFormulaError(
        `text values are not supported ("${node.value}")`, functionName,
      )

    case 'name': {
      const key = node.name.toLowerCase()
      if (key === 'true') return { kind: 'const', value: 1 }
      if (key === 'false') return { kind: 'const', value: 0 }
      const term = scope.terms.get(key)
      if (term !== undefined) return { kind: 'ref', term }
      const input = scope.inputs.get(key)
      if (input !== undefined) return { kind: 'input', ref: input }
      throw new EffectivePathsFormulaError(`unknown name "${node.name}"`, functionName)
    }

    case 'unary':
      return foldConstant({ kind: 'negate', of: recurse(node.of) })

    case 'binary': {
      const left = recurse(node.left)
      const right = recurse(node.right)

      if (node.op in COMPARE_OPS) {
        return { kind: 'compare', op: COMPARE_OPS[node.op], left, right }
      }
      switch (node.op) {
        case '+': return normalizeLinear(foldConstant({ kind: 'sum', of: [left, right] }))
        case '-': return foldConstant({ kind: 'sum', of: [left, { kind: 'negate', of: right }] })
        case '*': return normalizeLinear(foldConstant({ kind: 'product', of: [left, right] }))
        case '/': return foldConstant({ kind: 'divide', numerator: left, denominator: right })
        case '^': return foldConstant({ kind: 'power', base: left, exponent: right })
        default:
          throw new EffectivePathsFormulaError(`operator "${node.op}" is not supported`, functionName)
      }
    }

    case 'call': {
      const name = node.name.toUpperCase()
      if (name === 'IF') {
        if (node.args.length !== 3) {
          throw new EffectivePathsFormulaError('IF needs all three arguments', functionName)
        }
        return {
          kind: 'gated',
          when: recurse(node.args[0]),
          then: recurse(node.args[1]),
          otherwise: recurse(node.args[2]),
        }
      }
      if (name === 'SUM') {
        return foldConstant({ kind: 'sum', of: node.args.map(recurse) })
      }
      if (name === 'POW' || name === 'POWER') {
        if (node.args.length !== 2) {
          throw new EffectivePathsFormulaError(`${name} needs two arguments`, functionName)
        }
        return foldConstant({
          kind: 'power', base: recurse(node.args[0]), exponent: recurse(node.args[1]),
        })
      }
      if (name === 'ABS') {
        return foldConstant({ kind: 'abs', of: recurse(node.args[0]) })
      }
      if (name === 'ROUND' || name === 'FLOOR' || name === 'CEILING') {
        // The sheet's second argument is decimal places for ROUND and a
        // multiple for FLOOR and CEILING; both default to 1 / 0 places.
        const value = recurse(node.args[0])
        const modifier = node.args.length > 1 ? recurse(node.args[1]) : undefined
        return {
          kind: 'round',
          mode: name === 'ROUND' ? 'nearest' : name === 'FLOOR' ? 'down' : 'up',
          value,
          ...(modifier === undefined ? {} : { modifier }),
        }
      }
      if (name === 'IFS') {
        // IFS(c1, v1, c2, v2, ...) is a chain of gates; the sheet errors when
        // nothing matches, and 0 is the closest honest fallback here.
        if (node.args.length < 2 || node.args.length % 2 !== 0) {
          throw new EffectivePathsFormulaError('IFS needs condition/value pairs', functionName)
        }
        let result: EffectivePathsExpr = { kind: 'const', value: 0 }
        for (let i = node.args.length - 2; i >= 0; i -= 2) {
          result = {
            kind: 'gated',
            when: recurse(node.args[i]),
            then: recurse(node.args[i + 1]),
            otherwise: result,
          }
        }
        return result
      }
      if (name === 'MIN' || name === 'MAX') {
        return foldConstant({
          kind: name === 'MIN' ? 'min' : 'max',
          of: node.args.map(recurse),
        })
      }
      if (name === 'AND' || name === 'OR') {
        // Both read as products/sums of truthiness in the sheet's arithmetic.
        const of = node.args.map(recurse)
        return name === 'AND'
          ? { kind: 'min', of }
          : { kind: 'max', of }
      }
      throw new EffectivePathsFormulaError(
        `function ${name} is not supported — this formula needs a release, not a sync`,
        functionName,
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export interface ParseSheetFunctionOptions {
  /** Stat id. Defaults to the function name lower-cased. */
  id?: string
  /** Human label. Defaults to the function name. */
  label?: string
  /** Human labels for terms, keyed by the sheet's `LET` name. */
  termLabels?: Readonly<Record<string, string>>
}

/**
 * Parse one of the sheet's named `LAMBDA` definitions into a stat.
 *
 * Throws {@link EffectivePathsFormulaError} for anything outside the supported
 * subset, rather than producing an approximation — a stat that is silently
 * slightly wrong is the worst outcome available here.
 */
export function parseSheetFunction(
  functionName: string,
  source: string,
  options: ParseSheetFunctionOptions = {},
): EffectivePathsStat {
  const parser = new Parser(tokenize(source))
  const top = parser.parseTopLevelCall()
  if (top.name.toUpperCase() !== 'LAMBDA') {
    throw new EffectivePathsFormulaError(`expected a LAMBDA, found ${top.name}`, functionName)
  }
  if (top.args.length < 1) {
    throw new EffectivePathsFormulaError('LAMBDA has no body', functionName)
  }

  const parameters = top.args.slice(0, -1)
  const body = top.args[top.args.length - 1]

  const scope: Scope = { inputs: new Map(), terms: new Map() }
  const inputs: string[] = []
  for (const parameter of parameters) {
    if (parameter.kind !== 'name') {
      throw new EffectivePathsFormulaError('LAMBDA parameters must be plain names', functionName)
    }
    scope.inputs.set(parameter.name.toLowerCase(), parameter.name)
    inputs.push(parameter.name)
  }

  const terms: EffectivePathsTerm[] = []
  let resultNode = body

  if (body.kind === 'call' && body.name.toUpperCase() === 'LET') {
    const args = body.args
    if (args.length % 2 === 0) {
      throw new EffectivePathsFormulaError('LET must end with a result expression', functionName)
    }
    for (let i = 0; i + 1 < args.length; i += 2) {
      const nameNode = args[i]
      if (nameNode.kind !== 'name') {
        throw new EffectivePathsFormulaError('LET binding names must be plain names', functionName)
      }
      const expr = lower(args[i + 1], scope, functionName)
      // Register only after lowering, so a binding cannot refer to itself.
      scope.terms.set(nameNode.name.toLowerCase(), nameNode.name)
      terms.push({
        id: nameNode.name,
        label: options.termLabels?.[nameNode.name] ?? nameNode.name,
        expr,
      })
    }
    resultNode = args[args.length - 1]
  }

  return {
    id: options.id ?? functionName.toLowerCase(),
    label: options.label ?? functionName,
    sheetFunction: functionName,
    inputs,
    terms,
    result: lower(resultNode, scope, functionName),
  }
}
