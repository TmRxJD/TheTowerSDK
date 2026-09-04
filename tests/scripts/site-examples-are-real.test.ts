import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PACKAGE_ROOT } from '../helpers/paths'

/**
 * Every symbol the site imports from this package actually exists in it.
 *
 * The site is a separate app with its own toolchain, and it pins a PUBLISHED version of
 * `thetowersdk` rather than the working tree. So a rename here does not break its build — the
 * examples keep compiling against the old package and quietly describe an API that is gone,
 * which is the worst possible place for that to happen: the page someone copies from.
 *
 * This checks the site's imports, and the code samples printed on it, against the package the site
 * INSTALLS — not the working tree. A drafted example calling `runCalculator`, which never existed,
 * was caught this way either.
 *
 * ## Why the installed copy, and not `dist`
 *
 * It was `dist`, and that demanded the site name symbols the version it runs on does not have.
 * Renaming `GLOSSARY_NAMES` here made the site reference a symbol absent from its installed 0.9.1,
 * and SvelteKit does not shrug at that: every page returned 500. A documentation site that will not
 * render is a worse failure than one that is briefly a version behind.
 *
 * The rename still has to reach the site — it does so when the release pins the site to the new
 * version, which is the moment this check starts demanding it.
 */

const SITE = path.join(PACKAGE_ROOT, 'site')
const INSTALLED = path.join(SITE, 'node_modules', 'thetowersdk')
const DIST = existsSync(INSTALLED) ? path.join(INSTALLED, 'dist') : path.join(PACKAGE_ROOT, 'dist')
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
/**
 * `import { … } from 'thetowersdk/…'`, capturing an optional leading `type`.
 *
 * The `type` group matters: a type-only import names things that are erased at runtime and cannot
 * be found on the module object, so those are skipped. Everything else is checked, constants
 * included.
 */
const IMPORT =
  /import\s+(type\s+)?\{([^}]+)\}\s*from\s*['"`]thetowersdk(?:\/([a-z-]+))?['"`]/g

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
        const typeOnlyImport = Boolean(match[1])
        const subpath = match[3] ?? '.'
        const available = exportsOf(subpath)
        if (!available) {
          unknownEntry.push(`${path.relative(SITE, file)} imports from 'thetowersdk/${subpath}'`)
          continue
        }
        if (typeOnlyImport) continue

        const symbols = match[2]
          /*
           * Comments are stripped before the names are read. A documentation example may annotate
           * each import to say what the catalog holds, and without this the comment is glued onto
           * the symbol beside it — the checker then reports a name nobody wrote as missing, which
           * looks like a broken example and is not one.
           */
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/[^\n]*/g, '')
          .split(',')
          // `type` is kept here so the loop below can recognise and skip inline type specifiers.
          .map(part => part.split(/\s+as\s+/)[0].trim().replace(/^type\s+/, 'type '))
          .filter(Boolean)
        for (const symbol of symbols) {
          /*
           * Inline `type` specifiers are erased at runtime, so they cannot be found on the module
           * object. This used to skip every name beginning with a capital instead, on the same
           * reasoning — which silently exempted every catalog constant in the package, the exact
           * symbols the site names most often. A planted `TOTALLY_FAKE_EXPORT` passed under that
           * rule. Only genuine type specifiers are skipped now.
           */
          if (symbol.startsWith('type ')) continue
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
        // Group 3 is the subpath — group 1 is the optional `type`, group 2 the specifier list.
        documented.add(match[3] ? `./${match[3]}` : '.')
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
