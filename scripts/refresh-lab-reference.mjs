#!/usr/bin/env node
/**
 * Refreshes `src/data/fixtures/effective-paths-labs.json` from the community
 * Effective Paths spreadsheet.
 *
 * This is a *reference*, not a source: nothing in the SDK is generated from it.
 * It exists so `lab-reference.test.ts` can check our lab cost and duration
 * tables against an independent authority. The sheet's author gets the numbers
 * from the developers, which makes it the best cross-check available short of
 * re-extracting the game.
 *
 * The sheet is public. Only the DVT_Laboratory tab is read; its gid is pinned
 * below because the `sheet=` query parameter is ignored by both the export and
 * gviz endpoints -- they always return the first tab -- so the gid is the only
 * way to select it.
 *
 *   node scripts/refresh-lab-reference.mjs
 *
 * Re-run when the sheet publishes a new game version, then run the tests: a
 * diff there is either a game balance change to absorb or a real error in our
 * tables, and both are worth looking at deliberately.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, 'src', 'data', 'fixtures', 'effective-paths-labs.json')

const SHEET_ID = '1YwZtKP6B4WYhRba5T6APJ1YxKNdfnIGQnprgnxmO7zc'
const LAB_TAB_GID = '1095671409'
const SOURCE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${LAB_TAB_GID}`

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char !== '"') field += char
      else if (text[i + 1] === '"') { field += '"'; i += 1 }
      else quoted = false
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(field); field = '' }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (char !== '\r') field += char
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

/** "1,000,000" and "2.5E+17" are both costs; blank is a hole, not a zero. */
function parseCost(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return null
  const value = Number(text.replace(/,/g, ''))
  return Number.isFinite(value) ? value : null
}

/** "27:46:00" and "199:59:59.000" -> seconds. Hours are unbounded, not 0-23. */
function parseDurationSeconds(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return null
  const parts = text.split(':')
  if (parts.length !== 3) return null
  const seconds = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])
  return Number.isFinite(seconds) ? Math.round(seconds) : null
}

const response = await fetch(SOURCE_URL)
if (!response.ok) {
  console.error(`sheet fetch failed: ${response.status} ${response.statusText}`)
  process.exit(1)
}
const rows = parseCsv(await response.text())
const header = rows[0] ?? []
const body = rows.slice(1).filter(row => String(row[0] ?? '').trim())

if (String(header[0] ?? '').trim() !== 'Lvl') {
  // The endpoints silently fall back to the first tab, so a wrong gid returns
  // the changelog rather than an error. Fail instead of writing that out.
  console.error(`unexpected first column "${header[0]}" -- expected "Lvl". Has the gid changed?`)
  process.exit(1)
}

// Columns repeat as "<Lab Name> Duration", "Cost".
const labs = []
for (let column = 1; column < header.length; column += 2) {
  const rawName = String(header[column] ?? '').trim()
  if (!rawName) continue
  if (String(header[column + 1] ?? '').trim() !== 'Cost') {
    console.warn(`skipping column ${column} (${rawName}): no Cost column follows it`)
    continue
  }

  const levels = []
  for (const row of body) {
    const level = Number(String(row[0]).trim())
    const cost = parseCost(row[column + 1])
    const durationSeconds = parseDurationSeconds(row[column])
    // Levels past a lab's cap are blank in both columns; keep only real rows.
    if (cost === null && durationSeconds === null) continue
    levels.push({ level, durationSeconds, cost })
  }

  labs.push({ name: rawName.replace(/\s+Duration$/, ''), levels })
}

const payload = {
  source: 'Effective Paths spreadsheet, DVT_Laboratory tab',
  url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?gid=${LAB_TAB_GID}`,
  note: 'Reference data for validation only. Nothing in the SDK is generated from this file.',
  labCount: labs.length,
  labs: labs.sort((left, right) => left.name.localeCompare(right.name)),
}

await fs.mkdir(path.dirname(OUT), { recursive: true })
await fs.writeFile(OUT, `${JSON.stringify(payload, null, 1)}\n`, 'utf8')

const levelCount = labs.reduce((total, lab) => total + lab.levels.length, 0)
console.log(`wrote ${path.relative(ROOT, OUT)}: ${labs.length} labs, ${levelCount} levels`)
