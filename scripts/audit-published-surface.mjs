#!/usr/bin/env node
/**
 * What does an installed copy of this package actually contain, and how much of it can a
 * consumer reach?
 *
 * `files: ["dist", ...]` ships the whole build output, but only what the `exports` map
 * names is importable. Anything else is weight in the tarball that no user can load — and
 * worse, it is where an import of a package that is not published can hide, because
 * nothing reachable ever evaluates it.
 *
 * Walks the module graph from every public entry point and reports:
 *   - modules a consumer can reach
 *   - shipped modules they cannot
 *   - any reachable module importing something outside `dependencies`
 *
 *   node scripts/audit-published-surface.mjs [--json]
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * `from '...'`, `import('...')` and `require('...')`.
 *
 * The build emits CommonJS, so nearly every edge in `dist` is a `require()` — matching only
 * ESM syntax made the whole package look like eleven reachable modules, which would have
 * declared 469 files dead that are not.
 */
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g

/** The `.js` files npm would put in the tarball, honouring `files` and its exclusions. */
function packedFiles() {
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: PACKAGE_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    shell: process.platform === 'win32',
  })
  const [manifest] = JSON.parse(raw)
  return manifest.files
    .map(entry => path.join(PACKAGE_ROOT, entry.path))
    .filter(file => file.endsWith('.js'))
}

function resolveRelative(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier)
  if (existsSync(`${base}.js`)) return `${base}.js`
  if (existsSync(path.join(base, 'index.js'))) return path.join(base, 'index.js')
  return existsSync(base) ? base : null
}

function main() {
  const pkg = JSON.parse(readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'))
  const declared = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ])

  const entries = Object.entries(pkg.exports ?? {})
    .filter(([key]) => !key.includes('*') && !key.endsWith('.json'))
    .map(([, value]) => (typeof value === 'string' ? value : value.import ?? value.default ?? value.require))
    .filter(Boolean)
    .map(target => path.resolve(PACKAGE_ROOT, target))

  /*
   * Reachability is bounded by what ships. A module excluded from `files` exists on this
   * machine but not in anyone's `node_modules`, so following an edge into it would report
   * a consumer can reach code that is not in their install — and would keep reporting the
   * excluded governance modules as reachable forever.
   */
  const shipped = packedFiles()
  const shippedSet = new Set(shipped)

  const reachable = new Set()
  const external = new Map()
  const stack = entries.filter(entry => shippedSet.has(entry))

  while (stack.length > 0) {
    const file = stack.pop()
    if (!file || reachable.has(file) || !existsSync(file) || !shippedSet.has(file)) continue
    reachable.add(file)

    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(SPECIFIER)) {
      const specifier = match[1]
      if (!specifier) continue
      if (specifier.startsWith('.')) {
        const resolved = resolveRelative(file, specifier)
        if (resolved) stack.push(resolved)
        continue
      }
      if (specifier.startsWith('node:')) continue
      /*
       * Prose in this package quotes phrases with `from '...'` in it, and a plain regex
       * reads those as imports — "not a league" was reported as a missing dependency.
       * A real specifier has no whitespace and is a valid package name.
       */
      if (!/^(?:@[\w.-]+\/)?[\w.-]+(?:\/[\w.-]+)*$/.test(specifier)) continue
      const packageName = specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0]
      if (packageName === pkg.name) continue // self-reference across its own subpaths
      if (!external.has(packageName)) external.set(packageName, new Set())
      external.get(packageName).add(path.relative(PACKAGE_ROOT, file).split(path.sep).join('/'))
    }
  }

  const unreachable = shipped.filter(file => !reachable.has(file))
  const rel = file => path.relative(PACKAGE_ROOT, file).split(path.sep).join('/')
  const undeclared = [...external].filter(([name]) => !declared.has(name))

  const report = {
    entryPoints: entries.length,
    reachable: reachable.size,
    shipped: shipped.length,
    unreachable: unreachable.map(rel).sort(),
    undeclaredImports: Object.fromEntries(undeclared.map(([name, files]) => [name, [...files].sort()])),
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(`Entry points:        ${report.entryPoints}`)
  console.log(`Reachable modules:   ${report.reachable}`)
  console.log(`Shipped dist modules:${String(report.shipped).padStart(5)}`)
  console.log(`Unreachable:         ${report.unreachable.length}`)

  if (undeclared.length > 0) {
    console.log('\nReachable code imports packages that are not declared dependencies:')
    for (const [name, files] of undeclared) {
      console.log(`  ${name}`)
      for (const file of [...files].sort().slice(0, 5)) console.log(`    ${file}`)
    }
    process.exitCode = 1
  }

  /*
   * Nothing that SHIPS may reference a package that is not on the registry. Six modules
   * once did — a top-level `require("@tmrxjd/governance-engine")` that throws
   * "Cannot find module" in any real install. They were invisible because the `exports`
   * map does not reach them, so every entry point imported fine and the tarball was
   * broken anyway. `files` now excludes them; this is what keeps them excluded.
   */
  const unpublished = shipped.filter(file => readFileSync(file, 'utf8').includes('@tmrxjd/'))
  if (unpublished.length > 0) {
    console.log('\nShipped modules referencing an unpublished workspace package:')
    for (const file of unpublished.map(rel).sort()) console.log(`  ${file}`)
    console.log('\nExclude them in package.json "files", or remove the dependency.')
    process.exitCode = 1
  }
}

main()
