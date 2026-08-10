#!/usr/bin/env node
/**
 * Enforces the package's structural conventions.
 *
 * Types and tests check behaviour; this checks shape — that every public module
 * is reachable, that names are predictable, and that nothing is a one-off. The
 * point is that a contributor (or an agent) can infer the rest of the package
 * from any one file, because every file follows the same rules.
 *
 * Exit codes: 0 = clean, 1 = violations.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')
const norm = (p) => p.split(path.sep).join('/')

/** Areas with a public barrel. Everything else is internal. */
const PUBLIC_AREAS = ['data', 'save', 'node', 'formatting', 'mechanics']

/** Generated tables are allowed to be enormous; hand-written code is not. */
const MAX_LINES = 1200
const GENERATED = /(generated|catalog|-tables|-data|player-stats|labs-research|labs-levels|workshop|reference|indexes|assets|relics|modules|cards|perks|tiers|substats|chart|milestones|schemas|vocabulary)/i

const problems = []
const files = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = norm(path.join(dir, entry.name))
    if (entry.isDirectory()) walk(p)
    else if (entry.name.endsWith('.ts')) files.push(p)
  }
}
walk(SRC)

for (const file of files) {
  const rel = norm(path.relative(SRC, file))
  const base = path.basename(rel)
  const raw = fs.readFileSync(file, 'utf8')
  const isTest = base.endsWith('.test.ts')
  // Doc comments show consumers the published specifier; that is not an import.
  const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  // 1. kebab-case names.
  // `.generated.ts` marks emitted files, and tests may carry a descriptive
  // qualifier (`wave-base-scaling.t10-parity.test.ts`). Both are intentional.
  const stem = base.replace(/\.test\.ts$|\.generated\.ts$|\.ts$/, '')
  const segments = isTest ? stem.split('.') : [stem]
  for (const segment of segments) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(segment) && !segment.startsWith('_')) {
      problems.push(`${rel}: file name is not kebab-case`)
      break
    }
  }

  // 2. No default exports — they make re-exports and tooling unpredictable.
  if (/^export default/m.test(source)) {
    problems.push(`${rel}: uses a default export; this package is named-exports only`)
  }

  // 3. Never import the barrel of your own area — that is a cycle.
  const area = rel.split('/')[0]
  if (PUBLIC_AREAS.includes(area) && base !== 'index.ts' && !isTest) {
    if (/from '\.\/index'/.test(source) || new RegExp(`from '\\.\\./${area}/index'`).test(source)) {
      problems.push(`${rel}: imports its own area barrel; import the sibling module directly`)
    }
  }

  // 4. The package must never import itself by name.
  if (/from '(thetowersdk[^']*)'/.test(source) && !isTest) {
    const m = source.match(/from '(thetowersdk[^']*)'/)
    problems.push(`${rel}: imports ${m[1]}; inside src/ use a relative path`)
  }

  // 5. Keep hand-written files readable.
  const lines = source.split('\n').length
  if (lines > MAX_LINES && !GENERATED.test(rel)) {
    problems.push(`${rel}: ${lines} lines; split it or name it so it reads as generated data`)
  }
}

// 6. Every public module is exported from its barrel.
for (const area of PUBLIC_AREAS) {
  const barrelPath = path.join(SRC, area, 'index.ts')
  if (!fs.existsSync(barrelPath)) {
    problems.push(`${area}/index.ts is missing`)
    continue
  }
  const barrel = fs.readFileSync(barrelPath, 'utf8')
  const modules = fs
    .readdirSync(path.join(SRC, area), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') && e.name !== 'index.ts')
    .map((e) => e.name.replace(/\.ts$/, ''))

  for (const mod of modules) {
    if (!barrel.includes(`'./${mod}'`)) {
      problems.push(`${area}/${mod}.ts is not exported from ${area}/index.ts; nobody can import it`)
    }
  }
}

// 7. Extractors follow one shape.
const saveDir = path.join(SRC, 'save')
if (fs.existsSync(saveDir)) {
  for (const entry of fs.readdirSync(saveDir)) {
    if (!entry.endsWith('.ts') || entry.endsWith('.test.ts')) continue
    const source = fs.readFileSync(path.join(saveDir, entry), 'utf8')
    for (const m of source.matchAll(/export function (extract\w+FromSaveRoot)\s*\(([^)]*)\)\s*:\s*([^{]+)\{/g)) {
      const [, name, , returnType] = m
      // `T | null` is the rule for a record-shaped result. A collection result
      // (array, Partial, Record, Set, Map) signals "absent" by being empty,
      // which is friendlier than null and just as safe — allow it.
      const nullable = /\|\s*null/.test(returnType) || /\bnull\b/.test(returnType)
      const collection = /(\[\]|Partial<|Record<|ReadonlyArray<|Set<|Map<)/.test(returnType)
      if (!nullable && !collection) {
        problems.push(
          `save/${entry}: ${name} returns ${returnType.trim()}; use \`| null\` or an empty collection`,
        )
      }
    }
  }
}

if (problems.length) {
  console.error(`convention violations: ${problems.length}\n`)
  for (const p of problems.slice(0, 40)) console.error(`  ${p}`)
  if (problems.length > 40) console.error(`  ... and ${problems.length - 40} more`)
  process.exit(1)
}
console.log(`conventions OK (${files.length} files checked)`)
