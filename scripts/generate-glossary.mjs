#!/usr/bin/env node
/**
 * Regenerates `src/data/glossary-names.generated.ts` from the catalogs.
 *
 * Names in the glossary are never typed by hand — they are read out of the same
 * tables the SDK ships, so a term can only appear here if it exists in the data.
 * That is the whole point: a wrong name in a glossary is worse than no glossary.
 *
 *   node scripts/generate-glossary.mjs      # after `pnpm build`
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const DIST = path.join(ROOT, 'dist')

if (!(await fs.stat(path.join(DIST, 'index.js')).catch(() => null))) {
  console.error('run `pnpm build` first — the generator reads dist/')
  process.exit(1)
}

const data = require(path.join(DIST, 'data', 'index.js'))
const save = require(path.join(DIST, 'save', 'index.js'))
const catalog = { ...data, ...save }

/** @type {Array<{term: string, kind: string, domain: string, definition: string, expansion?: string}>} */
const entries = []
const add = (entry) => {
  if (!entry.term || typeof entry.term !== 'string') return
  entries.push(entry)
}

for (const weapon of catalog.ULTIMATE_WEAPON_IMPORT_CATALOG ?? []) {
  add({
    term: weapon.name,
    kind: 'name',
    domain: 'ultimate-weapon',
    definition: `Ultimate weapon ${weapon.index}. Its unlockable enhancement is "${weapon.plusName}".`,
  })
  add({
    term: weapon.plusName,
    kind: 'name',
    domain: 'ultimate-weapon',
    definition: `The "plus" enhancement unlocked on ${weapon.name}.`,
  })
}

for (const bot of catalog.BOT_IMPORT_CATALOG ?? []) {
  const stats = catalog.getBotStatNames?.(catalog.findBotByName?.(bot.name)) ?? []
  add({
    term: bot.name,
    kind: 'name',
    domain: 'bot',
    definition: stats.length
      ? `Bot ${bot.index}. Upgrade tracks: ${stats.join(', ')}.`
      : `Bot ${bot.index}, in save slot ${bot.index}.`,
  })
}

for (const module of catalog.MODULE_TEMPLATES ?? []) {
  add({
    term: module.name,
    kind: 'name',
    domain: 'module',
    definition: `${module.unique ? 'Unique' : 'Non-unique'} ${module.type} module.`,
  })
  if (module.initials) {
    add({
      term: module.initials,
      kind: 'acronym',
      domain: 'module',
      expansion: module.name,
      definition: `${module.type} module. These initials come from the module table, not from community usage.`,
    })
  }
}

for (const card of catalog.CARD_IMPORT_CATALOG ?? []) {
  if (!card.name) continue
  add({
    term: card.name,
    kind: 'name',
    domain: 'card',
    definition: `Card ${card.index}, stored in the save as \`${card.gameField}\`.`,
  })
}

for (const stat of catalog.getWorkshopStatDefinitions?.() ?? []) {
  const name = stat.name ?? stat.label
  if (!name) continue
  add({
    term: name,
    kind: 'name',
    domain: 'workshop',
    definition: `Workshop upgrade stat, in the ${stat.category ?? 'workshop'} category.`,
  })
}

for (const currency of catalog.CURRENCY_DEFINITIONS ?? []) {
  add({ term: currency.name, kind: 'name', domain: 'currency', definition: currency.summary })
}

for (const type of catalog.TOWER_MODULE_TYPE_ENUM ?? []) {
  add({
    term: type.name,
    kind: 'name',
    domain: 'module',
    definition: `One of the four module types (enum value ${type.value}).`,
  })
}

/**
 * A term can legitimately mean two things — `SR` is both Shrink Ray and Solar
 * Reflector, `Damage` is both a card and a workshop stat. Collapsing those would
 * hand readers one arbitrary answer, so every meaning is kept and the term is
 * flagged as ambiguous instead.
 */
const byTerm = new Map()
for (const entry of entries) {
  const key = `${entry.kind}:${entry.term.toLowerCase()}`
  const bucket = byTerm.get(key) ?? []
  const duplicate = bucket.some(other =>
    other.domain === entry.domain && other.expansion === entry.expansion)
  if (!duplicate) bucket.push(entry)
  byTerm.set(key, bucket)
}

const unique = []
let ambiguousCount = 0
for (const bucket of byTerm.values()) {
  const ambiguous = bucket.length > 1
  if (ambiguous) ambiguousCount++
  for (const entry of bucket) unique.push(ambiguous ? { ...entry, ambiguous: true } : entry)
}
unique.sort((a, b) => a.domain.localeCompare(b.domain) || a.term.localeCompare(b.term))

const body = `// Generated file — do not edit by hand. Run \`node scripts/generate-glossary.mjs\`.
import type { GlossaryEntry } from './glossary-types'

/** Every name and set of initials that appears in the shipped catalogs. */
export const GLOSSARY_NAMES: readonly GlossaryEntry[] = ${JSON.stringify(unique, null, 2)} as const
`

await fs.writeFile(path.join(ROOT, 'src', 'data', 'glossary-names.generated.ts'), body, 'utf8')

console.log(
  `wrote src/data/glossary-names.generated.ts — ${unique.length} entries, `
  + `${ambiguousCount} term(s) that mean more than one thing`,
)
