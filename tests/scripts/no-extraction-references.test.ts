import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { PACKAGE_ROOT } from '../helpers/paths'

/**
 * The published source must not describe how a value was obtained.
 *
 * The knowledge graph's job is to say a number is verified and where you can see it. Naming a
 * symbol, an address or a toolchain says something else, and it is not something this package
 * should carry — a claim sourced `game` should read as "you can see this in the game".
 *
 * This runs the scrubber in `--check` mode rather than reimplementing its patterns, so the rule
 * lives in one place and the fixer and the guard cannot disagree about what counts.
 */
describe('the published source carries no extraction detail', () => {
  it('scripts/scrub-extraction-references.mjs --check finds nothing', () => {
    /*
     * Resolved from this file, not from the working directory. Run from the monorepo root — which
     * is how the pre-push suite runs it — a relative path looked for the scrubber in the root's
     * own `scripts/`, and the guard failed on not finding itself rather than on anything it
     * checks. A guard that cannot run is indistinguishable from one that has nothing to report.
     */
    const packageRoot = PACKAGE_ROOT
    const script = path.join(packageRoot, 'scripts', 'scrub-extraction-references.mjs')

    let output = ''
    let failed = false
    try {
      output = execFileSync(process.execPath, [script, '--check'], {
        cwd: packageRoot,
        encoding: 'utf8',
      })
    }
    catch (error) {
      failed = true
      output = String((error as { stdout?: string }).stdout ?? error)
    }

    expect(failed, output).toBe(false)
    expect(output).toContain('no extraction references remain')
  })
})
