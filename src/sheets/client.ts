/**
 * Reading and writing Google Sheets, with the traps already handled.
 *
 * **This module does not depend on `googleapis`.** It describes the two calls it needs and
 * you supply something that makes them, so the SDK stays browser-safe and adds no transport
 * dependency — and so a bot can hand over a client it already has, a cache, or a fake in a
 * test. `templates/sheets-client.ts` is the twenty-line googleapis adapter.
 *
 * What this adds over calling the API directly is the set of things that are wrong in a way
 * you cannot see:
 *
 *   - **A spilled cell has no formula.** Only the anchor of an ARRAYFORMULA carries one, so
 *     a formula read of a spilled range comes back empty and reads as "no formulas here"
 *     rather than "these are mirrors". `readFormulas` reports the discrepancy.
 *   - **Blank is not missing.** An empty cell and an absent column look identical in a
 *     values read, because the API truncates trailing empties. `readGrid` pads to the
 *     requested rectangle so a caller can tell a short row from an empty one.
 *   - **Writing to the wrong sheet is silent and permanent.** A published community sheet
 *     is not yours; `protectSpreadsheets` refuses writes to ids you name.
 */
import { a1RangeCellCount, parseA1RangeToCoordinates, splitA1Range } from './a1'

/** How values come back. `FORMULA` returns what was typed; `UNFORMATTED_VALUE` the result. */
export type ValueRenderOption = 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA'

export interface SheetsReadRequest {
  readonly spreadsheetId: string
  readonly range: string
  readonly valueRenderOption?: ValueRenderOption
}

export interface SheetsWriteRequest {
  readonly spreadsheetId: string
  readonly range: string
  readonly values: readonly (readonly unknown[])[]
  /** `USER_ENTERED` parses formulas and dates; `RAW` stores exactly what you send. */
  readonly valueInputOption?: 'RAW' | 'USER_ENTERED'
}

/**
 * The two calls this module needs.
 *
 * Deliberately smaller than the Sheets API. Anything that can rename a tab, delete rows or
 * change permissions is out of scope, so a bot wiring this up is not one typo away from
 * restructuring a spreadsheet.
 */
export interface SheetsTransport {
  readValues(request: SheetsReadRequest): Promise<readonly (readonly unknown[])[]>
  writeValues?(request: SheetsWriteRequest): Promise<void>
}

export interface TowerSheetsOptions {
  readonly transport: SheetsTransport
  readonly spreadsheetId: string
  /**
   * Spreadsheet ids that must never be written to.
   *
   * Include every published or community sheet you read. The Effective Paths workbook is
   * read by many tools and owned by none of them; a write there is not recoverable by the
   * person who made it. Make a copy, share it with your service account, and point at that.
   */
  readonly protectSpreadsheets?: readonly string[]
  /** Split reads larger than this many cells. Sheets rejects very large single ranges. */
  readonly maxCellsPerRead?: number
}

export interface FormulaReadResult {
  /** What was typed, per cell. Empty where a cell holds a literal or is a spill target. */
  readonly formulas: readonly (readonly string[])[]
  /** How many cells hold a value. */
  readonly cellsWithValues: number
  /** How many hold a formula of their own. */
  readonly cellsWithFormulas: number
  /**
   * Set when cells have values but far fewer have formulas — the signature of a spilled
   * range. Reading the formulas alone would have said the range was plain data.
   */
  readonly likelySpilled: boolean
  readonly notes: readonly string[]
}

const DEFAULT_MAX_CELLS = 50_000

export class TowerSheets {
  private readonly transport: SheetsTransport
  private readonly spreadsheetId: string
  private readonly protectedIds: ReadonlySet<string>
  private readonly maxCellsPerRead: number

  constructor(options: TowerSheetsOptions) {
    this.transport = options.transport
    this.spreadsheetId = options.spreadsheetId
    this.protectedIds = new Set(options.protectSpreadsheets ?? [])
    this.maxCellsPerRead = options.maxCellsPerRead ?? DEFAULT_MAX_CELLS
  }

  /** Whether writes to the configured spreadsheet are refused. */
  get isReadOnly(): boolean {
    return this.protectedIds.has(this.spreadsheetId)
  }

  /** Raw values, exactly as the API returns them — ragged rows and all. */
  async readValues(range: string, renderAs: ValueRenderOption = 'UNFORMATTED_VALUE'): Promise<readonly (readonly unknown[])[]> {
    const chunks = a1RangeCellCount(range) > this.maxCellsPerRead
      ? splitA1Range(range, this.maxCellsPerRead)
      : [range]

    const rows: (readonly unknown[])[] = []
    for (const chunk of chunks) {
      const part = await this.transport.readValues({
        spreadsheetId: this.spreadsheetId,
        range: chunk,
        valueRenderOption: renderAs,
      })
      rows.push(...part)
    }
    return rows
  }

  /**
   * Values padded to the rectangle that was asked for.
   *
   * The API truncates trailing empty cells and trailing empty rows, so a 10x5 request can
   * come back as three rows of two. Code that then reads `rows[7][4]` gets `undefined` and
   * usually treats it as absent — when the honest reading is "that cell is empty". Padding
   * makes the shape match the question, so blank and missing stop looking alike.
   */
  async readGrid(range: string, renderAs: ValueRenderOption = 'UNFORMATTED_VALUE'): Promise<unknown[][]> {
    const at = parseA1RangeToCoordinates(range)
    const rows = await this.readValues(range, renderAs)
    if (!at) return rows.map(row => [...row])

    const height = at.endRow - at.startRow + 1
    const width = at.endCol - at.startCol + 1
    return Array.from({ length: height }, (_, r) =>
      Array.from({ length: width }, (_, c) => rows[r]?.[c] ?? null))
  }

  /**
   * Formulas, with an explicit warning when the range is mostly spill.
   *
   * Reading formulas to find out how a range is computed is the normal thing to do and it
   * is exactly where this misleads: an ARRAYFORMULA writes one formula and fills a hundred
   * cells, so ninety-nine of them report no formula at all. Reported rather than smoothed
   * over, because the follow-up is different — you go and find the anchor.
   */
  async readFormulas(range: string): Promise<FormulaReadResult> {
    const [formulaRows, valueRows] = await Promise.all([
      this.readGrid(range, 'FORMULA'),
      this.readGrid(range, 'UNFORMATTED_VALUE'),
    ])

    const formulas = formulaRows.map(row => row.map(cell =>
      typeof cell === 'string' && cell.startsWith('=') ? cell : ''))

    const cellsWithFormulas = formulas.reduce(
      (total, row) => total + row.filter(Boolean).length, 0)
    const cellsWithValues = valueRows.reduce(
      (total, row) => total + row.filter(cell => cell !== null && cell !== '').length, 0)

    const notes: string[] = []
    const likelySpilled = cellsWithValues > 0 && cellsWithFormulas * 4 < cellsWithValues
    if (likelySpilled) {
      notes.push(
        `${cellsWithValues} cells hold a value but only ${cellsWithFormulas} hold a formula. `
        + 'That is what a spilled range looks like: only the anchor carries the formula. '
        + 'Read the values instead, and look for the anchor above or to the left.',
      )
    }
    if (cellsWithValues === 0) {
      notes.push('Every cell in this range is empty. An empty range and a wrong tab name read the same.')
    }

    return { formulas, cellsWithValues, cellsWithFormulas, likelySpilled, notes }
  }

  /**
   * Write values, refusing protected spreadsheets.
   *
   * The guard is a throw rather than a no-op on purpose: a silent refusal means a bot
   * reports success and the sheet never changes, which is worse than failing.
   */
  async writeValues(
    range: string,
    values: readonly (readonly unknown[])[],
    valueInputOption: 'RAW' | 'USER_ENTERED' = 'RAW',
  ): Promise<void> {
    if (this.protectedIds.has(this.spreadsheetId)) {
      throw new Error(
        `Refusing to write to protected spreadsheet ${this.spreadsheetId}. `
        + 'Copy it, share the copy with your service account as an Editor, and point at the copy.',
      )
    }
    if (!this.transport.writeValues) {
      throw new Error('This transport is read-only: it provides no writeValues.')
    }
    await this.transport.writeValues({
      spreadsheetId: this.spreadsheetId,
      range,
      values,
      valueInputOption,
    })
  }
}
