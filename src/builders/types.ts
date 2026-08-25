/**
 * The shape every calculator builder shares.
 *
 * A builder is the plumbing between "what the player has" and "what to show", so building a
 * tool on this package is a UI job rather than a maths job. Each one carries:
 *
 *   - `defaults`  — a complete, valid input, so a page renders before anyone types
 *   - `fields`    — enough description to render the form without hard-coding it
 *   - `compute`   — pure, total, and safe to call on partial input
 *   - `notes`     — on the result, saying what it could not do
 *
 * `compute` takes a `Partial` on purpose. A form hands you half-filled state constantly —
 * a cleared box, a select nobody touched — and a calculator that throws or returns `NaN`
 * on that pushes the problem back into the UI. Every builder normalises first.
 *
 * Nothing here does I/O, reads a clock, or touches the DOM, so a builder runs identically
 * in a browser, in Node, and in a worker.
 */

/** A single input, described well enough to render a control for it. */
export interface CalculatorField {
  /** Key on the input object. */
  readonly key: string
  readonly label: string
  /**
   * `number-list` is a variable-length row of numbers — one per tier, one per slot.
   * It exists because collapsing such a row to a single total is wrong wherever the
   * per-entry contribution is non-linear, which is exactly where it gets used.
   */
  readonly kind: 'number' | 'select' | 'boolean' | 'number-list'
  /** `coins`, `stones`, `seconds`, `percent`, `waves`… — for a suffix or a formatter. */
  readonly unit?: string
  readonly min?: number
  readonly max?: number
  /** Present for `select`. */
  readonly options?: readonly { readonly value: string | number, readonly label: string }[]
  /** One line a tooltip can use. */
  readonly help?: string
}

/**
 * Every result carries `notes`.
 *
 * A calculator that cannot answer must say so rather than return a confident zero — an
 * unknown lab, a target below the current level, a weapon that is locked. The number and
 * the reason travel together so a UI never has to guess which zeros are real.
 */
export interface CalculatorResultBase {
  readonly notes: readonly string[]
}

export interface CalculatorBuilder<TInput, TResult extends CalculatorResultBase> {
  /** Stable id, dotted, safe as a key or a route segment. */
  readonly id: string
  readonly title: string
  /** One sentence: what question this answers. */
  readonly summary: string
  readonly fields: readonly CalculatorField[]
  readonly defaults: TInput
  /** Fill in what is missing and clamp what is out of range. Never throws. */
  normalize(input?: Partial<TInput>): TInput
  /** Normalises, then computes. Never throws. */
  compute(input?: Partial<TInput>): TResult
}

/**
 * The largest magnitude an open-ended numeric input is allowed to take.
 *
 * Some inputs have no catalog cap — a wave number, a damage figure, a multiplier — and
 * clamping those to `Number.MAX_SAFE_INTEGER` is the same as not clamping them: the value
 * is finite, but a formula that squares it or raises it to a power is not, and the result
 * is `Infinity` or `NaN` with nothing to say which input caused it.
 *
 * 1e12 is far past any figure the game produces and far short of where the exponential
 * wave curves overflow, so a result computed from a clamped input is still a real number.
 */
export const MAX_INPUT_MAGNITUDE = 1e12

/**
 * The highest wave the enemy-scaling model can still answer for.
 *
 * The game does not cap waves — tower-oracle `enemy.waveScaling` gives the valid range as
 * "wave 1 upward" — so this is a bound on the model, not on the game. Base health is a
 * banded polynomial raised to a tier exponent, and at tier 24 it reaches 2.1e282 by wave
 * 100,000 and overflows to `Infinity` before wave 1,000,000. Clamping here keeps every
 * answer a real number, and it sits orders of magnitude beyond any run anyone plays.
 */
export const MAX_MODEL_WAVE = 100_000

/**
 * A level, as a whole number between 0 and this ladder's cap.
 *
 * Every ladder in this package caps at what its own catalog prices rather than at a shared
 * constant, because the curves genuinely differ in length — workshop Attack Speed stops at
 * 75 where Damage runs to 400. Deriving the cap per stat is the only way a builder cannot
 * quote a price for a level that does not exist.
 */
export function clampLevel(value: unknown, cap: number, fallback: number): number {
  const safeCap = Number.isFinite(cap) && cap > 0 ? Math.floor(cap) : 0
  return Math.floor(clampNumber(value, 0, safeCap, Math.min(fallback, safeCap)))
}

/**
 * An open-ended quantity — a wave, a damage figure, a multiplier — bounded so that whatever
 * is computed from it stays finite. See `MAX_INPUT_MAGNITUDE`.
 */
export function clampMagnitude(value: unknown, fallback: number, min = 0): number {
  return clampNumber(value, min, MAX_INPUT_MAGNITUDE, fallback)
}

/**
 * The index in a cost table that prices buying `level`.
 *
 * Levels are 1-based and cost tables are 0-based, and the offset is not a formatting
 * detail: tower-oracle `workshop.upgradeTable` records that a row's cost buys the **next**
 * level, so reading a row as "what this level cost" is off by one. Both conventions were
 * live in this codebase at once. This is the one to use.
 */
export function costIndexForLevel(level: number): number {
  return Math.max(0, Math.floor(level) - 1)
}

/**
 * Clamp helper shared by the builders; keeps `NaN` out of every downstream formula.
 *
 * Only a finite number or a string that parses as one is accepted. Everything else falls
 * back, because `Number()` coerces far too willingly to be safe on form state: `Number([])`
 * and `Number('')` are both `0`, and `Number(true)` is `1`. A cleared input box arrives as
 * `''`, so the old coercion turned "the user emptied this field" into a confident zero
 * rather than the default — and an array or a boolean left over from a stale saved
 * preference became a real-looking value instead of being rejected.
 *
 * It also never throws. `Number(value)` runs the value's own `valueOf`/`toString`, so a
 * coercion on unvetted input is a call into code this package does not control.
 */
export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  let numeric: number
  if (typeof value === 'number') numeric = value
  else if (typeof value === 'string') {
    const trimmed = value.trim()
    numeric = trimmed === '' ? Number.NaN : Number(trimmed)
  }
  else return fallback

  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

/**
 * Coerce anything a form hands over into a fixed-length row of numbers.
 *
 * A `number-list` control produces sparse and stringy arrays constantly — a cleared box is
 * `''`, an untouched row is `undefined`. Each entry falls back independently so one bad
 * cell cannot blank the row.
 */
export function clampNumberList(
  value: unknown,
  length: number,
  min: number,
  max: number,
  fallback: number,
): number[] {
  const source = Array.isArray(value) ? value : []
  return Array.from({ length }, (_, i) => clampNumber(source[i], min, max, fallback))
}

/** Build a `select`'s options from a list of labels. */
export function optionsFrom(values: readonly string[]): CalculatorField['options'] {
  return values.map(value => ({ value, label: value }))
}
