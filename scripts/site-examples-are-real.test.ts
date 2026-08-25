import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every symbol the site imports from this package actually exists in it.
 *
 * The site is a separate app with its own toolchain, and it pins a PUBLISHED version of
 * `thetowersdk` rather than the working tree. So a rename here does not break its build — the
 * examples keep compiling against the old package and quietly describe an API that is gone,
 * which is the worst possible place for that to happen: the page someone copies from.
 *
 * This checks the site's imports, and the code samples printed on it, against the built `dist`.
 * A drafted example calling `runCalculator` — which never existed — was caught this way.
 */

const PACKAGE_ROOT = path.resolve(__dirname, '..')
const SITE = path.join(PACKAGE_ROOT, 'site')
const DIST = path.join(PACKAGE_ROOT, 'dist')
const require = createRequire(path.join(PACKAGE_ROOT, 'package.json'))

/** Entry point → the symbols it exports, read from the build. */
function exportsOf(subpath: string): Set<string> | null {
  const entry = path.join(DIST, subpath === '.' ? 'index.js' : `${subpath}/index.js`)
  if (!existsSync(entry)) return null
  try {
    return new Set(Object.keys(require(entry) as Record<string, unknown>))
  }
  catch {
    return null
  }
}

function siteFiles(): string[] {
  const found: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.svelte-kit' || entry === 'build') continue
      const full = path.join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(svelte|ts)$/.test(entry)) found.push(full)
    }
  }
  walk(path.join(SITE, 'src'))
  return found
}

/**
 * `import { a, b } from 'thetowersdk/x'` — in real source and inside printed code samples alike.
 *
 * The samples are template literals in `content.ts` and in the pages, so the same pattern finds
 * both. That is deliberate: a sample nobody can run is exactly as broken as an import that fails,
 * and only one of the two breaks a build.
 */
const IMPORT = /import\s*\{([^}]+)\}\s*from\s*['"`]thetowersdk(?:\/([a-z-]+))?['"`]/g

describe.skipIf(!existsSync(SITE) || !existsSync(DIST))('the site imports things that exist', () => {
  const files = siteFiles()

  it('found the site source', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it('every imported symbol is exported by the entry point it is imported from', () => {
    const missing: string[] = []
    const unknownEntry: string[] = []

    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(IMPORT)) {
        const subpath = match[2] ?? '.'
        const available = exportsOf(subpath)
        if (!available) {
          unknownEntry.push(`${path.relative(SITE, file)} imports from 'thetowersdk/${subpath}'`)
          continue
        }
        const symbols = match[1]
          .split(',')
          .map(part => part.replace(/\btype\b/, '').split(/\s+as\s+/)[0].trim())
          .filter(Boolean)
        for (const symbol of symbols) {
          // Types are erased at runtime and cannot be seen on the module object.
          if (/^[A-Z]/.test(symbol) && !available.has(symbol)) continue
          if (!available.has(symbol)) {
            missing.push(`${path.relative(SITE, file)}: '${symbol}' is not in thetowersdk/${subpath}`)
          }
        }
      }
    }

    expect(
      unknownEntry,
      `the site imports from entry point(s) this package does not have:\n  ${unknownEntry.join('\n  ')}`,
    ).toEqual([])
    expect(
      missing,
      `${missing.length} symbol(s) the site names but the package does not export:\n  `
      + `${missing.join('\n  ')}\n`
      + 'Either the example is out of date, or it was written without running it.',
    ).toEqual([])
  })

  /*
   * The site pins a PUBLISHED version, and documents whatever is in this tree.
   *
   * Those are two different things and they had come apart: the site was pinned to 0.5.2 while
   * four new pages documented entry points that only exist from 0.5.4. Nothing failed, because
   * the pages print code as text rather than importing it — so the site described a package it
   * was not running, which is the one place that must not happen.
   */
  it('the version the site installs has every entry point the site documents', () => {
    const installed = path.join(SITE, 'node_modules/thetowersdk/package.json')
    if (!existsSync(installed)) return

    const manifest = JSON.parse(readFileSync(installed, 'utf8')) as {
      version: string
      exports?: Record<string, unknown>
    }
    const available = new Set(Object.keys(manifest.exports ?? {}))

    const documented = new Set<string>()
    for (const file of files) {
      for (const match of readFileSync(file, 'utf8').matchAll(IMPORT)) {
        documented.add(match[2] ? `./${match[2]}` : '.')
      }
    }

    const absent = [...documented].filter(subpath => !available.has(subpath))
    expect(
      absent,
      `the site documents ${absent.join(', ')}, which thetowersdk@${manifest.version} does not `
      + 'have. Bump the site dependency, or stop documenting what it cannot run.',
    ).toEqual([])
  })
})
