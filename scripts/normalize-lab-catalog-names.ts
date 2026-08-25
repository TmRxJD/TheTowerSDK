/**
 * One-shot: rewrite labs-catalog.ts so every record has
 *   slug  — stable research / lookup identity (snake_case)
 *   name  — player-facing display name (never a raw code)
 *
 * Run from packages/sdk: `npx tsx scripts/normalize-lab-catalog-names.ts`
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LAB_CATALOG, type LabCatalogRecord } from '../src/data/labs-catalog'
import {
  displayNameToLabSlug,
  findLabResearchByDisplayName,
  findLabResearchBySlug,
} from '../src/data/labs-research'
import { SITE_LAB_SLUG_ALIASES } from '../src/data/labs-categories'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../src/data/labs-catalog.ts')

/** Catalog rows that are filed under a display spelling of a research slug. */
const DISPLAY_FILED_SLUGS: Readonly<Record<string, string>> = {
  'Berzerker Mastery': 'berserker_mastery',
  'Recovery Package Chance Mastery': 'recovery_package_mastery',
}

/** Prefer these display spellings over research.displayName when they disagree. */
const SLUG_DISPLAY_OVERRIDES: Readonly<Record<string, string>> = {
  berserker_mastery: 'Berzerker Mastery',
  recovery_package_mastery: 'Recovery Package Chance Mastery',
}

function looksLikeSlug(value: string): boolean {
  return /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(value) || /^[a-z][a-z0-9_]*$/.test(value) && value.includes('_')
}

function titleFromSlug(slug: string): string {
  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

function resolveSlug(catalogName: string): string {
  const filed = DISPLAY_FILED_SLUGS[catalogName]
  if (filed) return filed

  // Keep the catalog filing key when the row was already a code — lookups and
  // LAB_LEVEL_TABLE_NAME_BY_SLUG still address tables by that spelling.
  if (looksLikeSlug(catalogName) || /^[a-z0-9_]+$/.test(catalogName)) {
    return catalogName
  }

  const byDisplay = findLabResearchByDisplayName(catalogName)
  if (byDisplay?.slug) return byDisplay.slug

  const fromDisplay = displayNameToLabSlug(catalogName)
  if (fromDisplay) return fromDisplay

  return catalogName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function resolveDisplayName(catalogName: string, slug: string): string {
  const override = SLUG_DISPLAY_OVERRIDES[slug]
  if (override) return override

  const canonical = SITE_LAB_SLUG_ALIASES[slug] ?? slug
  const research =
    findLabResearchBySlug(canonical)
    ?? findLabResearchBySlug(slug)
    ?? findLabResearchBySlug(catalogName)
    ?? findLabResearchByDisplayName(catalogName)

  if (research?.displayName?.trim()) return research.displayName.trim()

  if (!looksLikeSlug(catalogName) && !/^[a-z0-9_]+$/.test(catalogName)) {
    return catalogName
  }

  return titleFromSlug(canonical)
}

function serializeValue(value: unknown, indent: number): string {
  const pad = ' '.repeat(indent)
  const padInner = ' '.repeat(indent + 2)
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    // Lab levels: one compact object per line.
    const isLevelRows = value.every(
      (item) => item && typeof item === 'object' && 'level' in (item as object) && 'cost' in (item as object),
    )
    if (isLevelRows) {
      const items = value.map((item) => {
        const row = item as { level: number; duration: string; cost: number }
        return `${padInner}{ level: ${row.level}, duration: ${JSON.stringify(row.duration)}, cost: ${row.cost} }`
      })
      return `[\n${items.join(',\n')},\n${pad}]`
    }
    const items = value.map(item => `${padInner}${serializeValue(item, indent + 2)}`)
    return `[\n${items.join(',\n')},\n${pad}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    const lines = entries.map(([k, v]) => {
      const key = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k) ? k : JSON.stringify(k)
      return `${padInner}${key}: ${serializeValue(v, indent + 2)}`
    })
    return `{\n${lines.join(',\n')},\n${pad}}`
  }
  return JSON.stringify(value)
}

function serializeLab(lab: LabCatalogRecord & { slug: string }, indent = 2): string {
  const pad = ' '.repeat(indent)
  const padInner = ' '.repeat(indent + 2)
  const lines: string[] = ['{']
  lines.push(`${padInner}slug: ${JSON.stringify(lab.slug)},`)
  lines.push(`${padInner}name: ${JSON.stringify(lab.name)},`)
  lines.push(`${padInner}category: ${lab.category === null ? 'null' : JSON.stringify(lab.category)},`)
  if (lab.description !== undefined) {
    lines.push(`${padInner}description: ${JSON.stringify(lab.description)},`)
  }
  if (lab.unit !== undefined) {
    lines.push(`${padInner}unit: ${JSON.stringify(lab.unit)},`)
  }
  if (lab.base !== undefined) {
    lines.push(`${padInner}base: ${lab.base},`)
  }
  if (lab.value !== undefined) {
    lines.push(`${padInner}value: ${serializeValue(lab.value, indent + 2)},`)
  }
  lines.push(`${padInner}levels: ${serializeValue(lab.levels, indent + 2)},`)
  lines.push(`${pad}}`)
  return lines.join('\n')
}

const normalized = LAB_CATALOG.map((lab) => {
  const existingSlug = typeof (lab as { slug?: string }).slug === 'string'
    ? (lab as { slug: string }).slug
    : null
  const slug = existingSlug || resolveSlug(lab.name)
  const name = resolveDisplayName(lab.name, slug)
  return { ...lab, slug, name }
})

const slugSet = new Set(normalized.map(l => l.slug))
if (slugSet.size !== normalized.length) {
  const dups = normalized.map(l => l.slug).filter((s, i, a) => a.indexOf(s) !== i)
  throw new Error(`Duplicate slugs after normalize: ${[...new Set(dups)].join(', ')}`)
}

const nameSet = new Set(normalized.map(l => l.name))
if (nameSet.size !== normalized.length) {
  const dups = normalized.map(l => l.name).filter((s, i, a) => a.indexOf(s) !== i)
  throw new Error(`Duplicate display names after normalize: ${[...new Set(dups)].join(', ')}`)
}

const stillCode = normalized.filter(l => looksLikeSlug(l.name) || (/^[a-z0-9_]+$/.test(l.name) && l.name.includes('_')))
if (stillCode.length > 0) {
  console.warn('Still code-like names:', stillCode.map(l => `${l.slug}→${l.name}`).slice(0, 20))
}

const header = `/**
 * THE lab catalog: every lab, its levels, its coin cost and its time.
 *
 * Hand-owned and front-end only. There is NO lab API. There was one, years ago,
 * before this data moved into the front end; it is gone, and the script that
 * used to sync from it has been deleted. Do not go looking for an endpoint to
 * refresh this from, and do not reintroduce one.
 *
 * To change lab costs or times, edit this file, or extend it from the game dump
 * under extraction-core/. Nothing fetches it at build time or at runtime. The
 * numbers are checked against the community Effective Paths sheet by
 * lab-reference.test.ts -- see fixtures/data/README.md.
 *
 * Identity vs label:
 *  - \`slug\` is the stable research / save / lookup key (snake_case).
 *  - \`name\` is always the player-facing display name (never a raw code).
 * Older builds mixed the two in \`name\`; do not reintroduce that.
 *
 * This replaces labs-levels.ts and labs-static.ts, which were disjoint halves of
 * the same catalog split by category, and which disagreed about units:
 *
 *  - \`cost\` is ALWAYS absolute coins. labs-static used to store it pre-scaled
 *    with a \`currency\` of B/T/q/Q, so \`cost: 1.1\` meant 1.1 quadrillion and
 *    every consumer had to know which file a lab came from before it could
 *    format a number. Nothing needs to know that now: formatCompact(1.1e15)
 *    renders "1.1q" on its own.
 *  - \`value\` belongs to the lab, not the level. It was identical on every level
 *    of every lab and only the first was ever read.
 *
 * \`duration\` comes in two shapes, "27:46:00" and "10d 19h 11m". Both are real
 * and parseDurationToHours reads both; ad-hoc parsers usually do not.
 */
export interface LabCatalogLevel {
  level: number
  /** "27:46:00" or "10d 19h 11m". Use parseDurationToHours, not a split. */
  duration: string
  /** Absolute coins. Never pre-scaled by a currency suffix. */
  cost: number
}

export interface LabCatalogRecord {
  /** Stable research / save / lookup identity. */
  slug: string
  /** Player-facing display name. Never a snake_case code. */
  name: string
  category: string | null
  description?: string
  unit?: 'percent' | 'flat' | 'duration' | 'multi'
  /** Linear labs: value at a level is \`base + value * level\`. */
  base?: number
  /**
   * Either a per-level increment (linear labs) or the effect keyed by level.
   * One per lab, not one per level.
   */
  value?: number | Record<string, number>
  levels: LabCatalogLevel[]
}

export const LAB_CATALOG: readonly LabCatalogRecord[] = [
`

const body = normalized.map(lab => serializeLab(lab, 2)).join(',\n')
const footer = `\n]
`

writeFileSync(outPath, `${header}${body}${footer}`, 'utf8')
console.log(`Wrote ${normalized.length} labs → ${outPath}`)
console.log(`Sample: ${normalized.find(l => l.slug === 'attack_speed')?.name}`)
console.log(`Sample: ${normalized.find(l => l.slug === 'amplify_bot_cooldown' || l.slug === 'amp_bot_cooldown')?.slug} → ${normalized.find(l => l.slug.includes('amplify_bot_cooldown') || l.slug === 'amp_bot_cooldown')?.name}`)
