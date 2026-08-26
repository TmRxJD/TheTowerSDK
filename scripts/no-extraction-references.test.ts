import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

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
    const script = path.join('scripts', 'scrub-extraction-references.mjs')

    let output = ''
    let failed = false
    try {
      output = execFileSync(process.execPath, [script, '--check'], { encoding: 'utf8' })
    }
    catch (error) {
      failed = true
      output = String((error as { stdout?: string }).stdout ?? error)
    }

    expect(failed, output).toBe(false)
    expect(output).toContain('no extraction references remain')
  })
})
