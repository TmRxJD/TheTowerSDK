import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Every claim the port makes about a spreadsheet cell, enumerated.
 *
 * ## What a cell reference is
 *
 * The port is a transcription, and it cites its source constantly: `eEcon!E6`,
 * `eDamage Coins!EZ2`, `Master Sheet!$F$5`. Each of those is a factual claim
 * that can be checked in one oracle call — and a claim that quietly rots when
 * the sheet is revised.
 *
 * ## What this enforces
 *
 * Two things a comment cannot enforce for itself:
 *
 * 1. **The tab exists.** `eEcon Stones` and `eEcon Stone` differ by one letter
 *    and only one of them is real. A reference to the second sends the next
 *    reader to a tab that is not there, and nothing else would ever say so.
 * 2. **The set is deliberate.** The count is pinned, so adding a new citation
 *    is a moment where somebody confirms the cell against the sheet rather than
 *    a line that slips in beside a plausible-looking neighbour.
 *
 * It cannot check that a cell says what the comment claims — that needs the
 * live sheet. `docs/EFFECTIVE_PATHS_ORACLE.md` describes how to do that and
 * which of the oracle's answers are not to be trusted.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url))

/** The tabs the sheet actually has, from `sheet_info`. */
const SHEET_TABS = [
  'Version History', 'Home Page', 'IDS', 'Giveaways', 'eHP', '_IDS', 'eHP Stone', 'eHP Coins',
  'eRegen', 'eDamage', 'eDamage Stone', 'eDamage Coins', 'eDamage Keys', 'eEcon', 'eEcon Stones',
  'eEcon Discount', 'EP_HELPER', 'Master Sheet', 'Data_Val_Tables', 'DVT_Bot', 'Images', 'All UWs',
  'All Bots', 'Module Base Stat', 'WSValues', 'DVT_Laboratory', 'DVT_Workshop', 'DVT_Guardians',
  'DVT_Laboratory_Unlock', 'DVT_UWs',
] as const

/**
 * `Tab!Cell`, with or without the `$`s.
 *
 * Tab names carry spaces, so the alternation is spelled out rather than matched
 * as "any word" — which would also swallow `Math!PI` and every `foo!bar` in a
 * sentence.
 */
const REFERENCE = new RegExp(
  String.raw`(?<![A-Za-z_])(` + SHEET_TABS.map(tab => tab.replace(/[^\w ]/g, '\\$&')).join('|')
  + String.raw`)!\$?([A-Z]{1,2})\$?(\d{1,3})`,
  'g',
)

/** A tab-like reference, real tab or not, for the misspelling check. */
const ANY_TAB_REFERENCE = /(?<![A-Za-z_])([A-Za-z_][A-Za-z_ ]{2,20})!\$?[A-Z]{1,2}\$?\d{1,3}/g

function sourceFiles(): string[] {
  return fs.readdirSync(HERE)
    .filter(name => name.startsWith('effective-paths-') && name.endsWith('.ts'))
    .filter(name => !name.endsWith('.test.ts'))
    .map(name => path.join(HERE, name))
}

interface CellReference {
  file: string
  tab: string
  cell: string
}

function references(): CellReference[] {
  const found: CellReference[] = []
  for (const file of sourceFiles()) {
    const source = fs.readFileSync(file, 'utf8')
    for (const match of source.matchAll(REFERENCE)) {
      found.push({ file: path.basename(file), tab: match[1], cell: `${match[2]}${match[3]}` })
    }
  }
  return found
}

describe('the sheet cells the port cites', () => {
  const all = references()
  const distinct = new Set(all.map(entry => `${entry.tab}!${entry.cell}`))

  it('found them at all', () => {
    // The guard on the regex. A pattern that matched nothing would make every
    // check below pass while enforcing nothing whatsoever.
    expect(all.length).toBeGreaterThan(50)
    expect(distinct.size).toBeGreaterThan(30)
  })

  it('names only tabs the sheet has', () => {
    /*
     * Catches the near misses. `eEcon Stones` is real and `eEcon Stone` is not;
     * `eDamage Coins` is real and `eDamage Coin` is not. A reference to the
     * wrong one reads perfectly and sends the next person to an empty tab.
     */
    const suspicious = new Set<string>()
    for (const file of sourceFiles()) {
      const source = fs.readFileSync(file, 'utf8')
      for (const match of source.matchAll(ANY_TAB_REFERENCE)) {
        const name = match[1].trim()
        // Only names that look like one of ours, so `IDS_PS_PLAYERDATA` and
        // ordinary prose are not dragged in.
        if (!/^e(HP|Regen|Damage|Econ)/i.test(name)) continue
        if (!(SHEET_TABS as readonly string[]).includes(name)) suspicious.add(name)
      }
    }
    expect([...suspicious], 'these tabs do not exist').toEqual([])
  })

  it('cites a plausible cell in every case', () => {
    // Column then row, never the reverse, and no row 0 — a `!0` is a typo for
    // a range, not a cell.
    for (const entry of [...distinct]) {
      expect(entry, entry).toMatch(/^[\w ]+![A-Z]{1,2}[1-9]\d{0,2}$/)
    }
  })

  it('has the number of citations it is supposed to have', () => {
    /*
     * Pinned so a new claim about the sheet is a deliberate act.
     *
     * When this fails, the fix is not to bump the number. It is to check the
     * cell you just cited against the live sheet — one `eval_formula` with
     * `FORMULATEXT` — and then bump the number. `docs/EFFECTIVE_PATHS_ORACLE.md`
     * has the procedure and the traps, of which there are several: a spilled
     * range reads as empty through `read_range`, and `FORMULA` render returns
     * nothing for a cell whose formula lives in a different anchor.
     */
    expect(
      distinct.size,
      'a cell reference was added or removed — verify it against the sheet, then update this',
    ).toBe(74)
  })
})
