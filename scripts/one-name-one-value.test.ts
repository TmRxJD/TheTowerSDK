import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * A name exported from two entry points must mean the same thing in both.
 *
 * `TOURNAMENT_LEAGUES` meant a list of six league objects through `thetowersdk/data` and a list of
 * six strings through `thetowersdk/knowledge` — a compartment had typed the names out again
 * directly beneath its import of the catalog rows they duplicate. The two agreed on the names, so
 * nothing looked wrong; what was wrong is that a reader who found the name in one place and used
 * it from the other got a different shape, and neither list was checked against the other.
 *
 * Re-exporting the same value under two doors is fine and deliberate in places — the NRBF reader
 * is reached from both `node` and `save-decoder`. What this refuses is two DIFFERENT values
 * wearing one name.
 */
type Loaded = { name: string, module: Record<string, unknown> }

async function entryPoints(): Promise<Loaded[]> {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
    exports: Record<string, unknown>
  }
  const subpaths = Object.keys(manifest.exports)
    .filter(key => key.startsWith('./') && !key.includes('*') && !key.endsWith('.json'))
    .map(key => key.slice(2))

  const loaded: Loaded[] = []
  for (const name of subpaths) {
    try {
      loaded.push({ name, module: (await import(`thetowersdk/${name}`)) as Record<string, unknown> })
    } catch {
      /* An entry point that cannot load in this environment is another test's problem. */
    }
  }
  return loaded
}

/** CommonJS interop artifacts, present on every namespace and meaning nothing. */
const NOT_REAL_EXPORTS = new Set(['default', '__esModule'])

describe('the README names every entry point, and only real ones', () => {
  it('lists exactly the exports map', () => {
    /*
     * The table is the first place anyone looks for what they can import, and it went two entry
     * points stale without anything noticing — `save-decoder` and `contributions` shipped,
     * documented on the site, and absent from the README.
     */
    const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
      exports: Record<string, unknown>
    }
    const exported = Object.keys(manifest.exports)
      .filter(key => key.startsWith('./') && !key.includes('*') && !key.endsWith('.json'))
      .map(key => key.slice(2))
      .sort()

    const readme = readFileSync('README.md', 'utf8')
    const listed = [...readme.matchAll(/^\| `thetowersdk\/([a-z-]+)`/gm)].map(match => match[1]!).sort()

    expect(listed).toEqual(exported)
  })
})

describe('one name means one thing across the package', () => {
  it('never exports two different values under the same name', async () => {
    const modules = await entryPoints()
    expect(modules.length).toBeGreaterThan(10)

    const seen = new Map<string, { from: string, value: unknown }>()
    const conflicts: string[] = []

    for (const { name: entry, module } of modules) {
      for (const key of Object.keys(module)) {
        if (NOT_REAL_EXPORTS.has(key)) continue

        const previous = seen.get(key)
        if (!previous) {
          seen.set(key, { from: entry, value: module[key] })
          continue
        }

        /*
         * Reference equality first: a re-export is the same object and passes immediately. Only
         * when the references differ is the value compared, because two structurally identical
         * literals defined twice are still two sources that can drift apart.
         */
        if (previous.value === module[key]) continue

        const same = JSON.stringify(previous.value) === JSON.stringify(module[key])
        conflicts.push(
          `${key}: ${previous.from} and ${entry} export ${same ? 'equal but separate values' : 'DIFFERENT values'}`,
        )
      }
    }

    expect(
      conflicts,
      'Re-export one definition instead of defining it twice, or give one of them its own name.',
    ).toEqual([])
  })
})
