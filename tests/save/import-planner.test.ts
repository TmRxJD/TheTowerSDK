import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { planSaveImportTarget, planSaveImports } from '../../src/save/import/planner'
import { SAVE_IMPORT_TARGET_LABELS, type SaveImportTargetKey } from '../../src/save/import/discovery'
import { decodePlayerInfoSaveBytes } from '../../src/node/decode-save'

/**
 * The planner that decides what a save file writes into a player's targets.
 *
 * ## Why this file exists
 *
 * It had no tests. Not thin ones — none. It is the step between "we decoded a
 * save" and "we are about to overwrite twelve targets", every extractor feeds
 * it, and it is the most complex function in the package.
 *
 * The properties below are the ones that matter when the input is not a good
 * save, which is the only interesting case: a truncated download, a save from
 * a version that predates half these features, a file that is not a save at
 * all. **None of those may throw, and none may produce a payload**, because a
 * payload is a write.
 *
 * The real-save cases run only with `TOWER_TEST_SAVE` pointing at a
 * `playerInfo.dat`; without one they skip and the adversarial half still runs,
 * so this stays useful on a fresh clone.
 */

const KEYS = Object.keys(SAVE_IMPORT_TARGET_LABELS) as SaveImportTargetKey[]

const savePath = process.env.TOWER_TEST_SAVE
const hasSave = Boolean(savePath && existsSync(savePath))
const describeSave = hasSave ? describe : describe.skip

/** Inputs that are not a save root, in the shapes a real failure produces. */
const NOT_A_SAVE: Array<{ what: string, value: unknown }> = [
  { what: 'null', value: null },
  { what: 'undefined', value: undefined },
  { what: 'an empty object', value: {} },
  { what: 'an array', value: [] },
  { what: 'a string', value: 'playerInfo' },
  { what: 'a number', value: 42 },
  { what: 'a boolean', value: true },
  { what: 'keys with null values', value: { currentWave: null, coins: null } },
  { what: 'keys with wrong types', value: { currentWave: 'lots', relicsUnlocked: 'yes' } },
  { what: 'an array where a record belongs', value: { labs: [] } },
  { what: 'a nested null', value: { profileRelics: null, relicsUnlocked: null } },
  { what: 'something recursive', value: (() => {
    const loop: Record<string, unknown> = {}
    loop.self = loop
    return loop
  })() },
]

describe('planning an import from something that is not a save', () => {
  for (const { what, value } of NOT_A_SAVE) {
    it(`never throws on ${what}`, () => {
      // A throw here takes down the import page mid-flow, after the player has
      // already picked a file.
      for (const key of KEYS) {
        expect(() => planSaveImportTarget(key, value), key).not.toThrow()
      }
      expect(() => planSaveImports(value, KEYS)).not.toThrow()
    })

    it(`offers nothing importable from ${what}`, () => {
      /*
       * The property that protects the account. `canImport` is what the page
       * gates the write on, so a broken save that reports `canImport: true`
       * with an empty payload is how twelve targets get overwritten with
       * nothing.
       *
       * Battle reports are exempt: their plan is a list of *new runs*, and an
       * empty list is a legitimate answer meaning "nothing new", not a claim
       * about the save.
       */
      for (const key of KEYS) {
        if (key === 'battleReports') continue
        const result = planSaveImportTarget(key, value)
        expect(result.canImport, `${key} claims it can import from ${what}`).toBe(false)
      }
    })

    it(`says why, for every tracker it turned down, from ${what}`, () => {
      // A refusal with no reason is a page that shows a disabled button and no
      // explanation, which reads as a broken import rather than an old save.
      for (const key of KEYS) {
        const result = planSaveImportTarget(key, value)
        if (result.canImport) continue
        expect(result.skipReason, `${key} refused silently`).toBeTruthy()
      }
    })

    it(`labels every tracker from ${what}`, () => {
      for (const key of KEYS) {
        expect(planSaveImportTarget(key, value).label, key).toBeTruthy()
      }
    })
  }

  it('says the file is not a save, rather than twelve different things', () => {
    /*
     * The root check earns its place here or not at all.
     *
     * Each tracker can refuse on its own — "No workshop data in save.", "No
     * dissonance data in save." — and for a file that is not a save at all,
     * twelve such messages describe the wrong problem. The player did not pick
     * a save with no workshop in it; they picked the wrong file.
     *
     * Written because removing the root check left every other case in this
     * file green: the per-tracker fixes cover the same inputs, so without this
     * the check would be a guard nobody has ever seen fail.
     */
    for (const value of [null, undefined, {}, [], 'playerInfo', 42]) {
      for (const key of KEYS) {
        const result = planSaveImportTarget(key, value)
        expect(result.canImport, key).toBe(false)
        expect(result.skipReason, `${key} for ${String(value)}`).toBe('This file is not a save.')
      }
    }
  })

  it('refuses a key it does not know rather than inventing a plan', () => {
    const result = planSaveImportTarget('nonsense' as SaveImportTargetKey, {})
    expect(result.canImport).toBe(false)
  })
})

describeSave('planning an import from a real save', () => {
  const parsedRoot = hasSave
    ? decodePlayerInfoSaveBytes(readFileSync(savePath as string)).parsedRoot
    : {}

  it('finds something to import', () => {
    const importable = planSaveImports(parsedRoot, KEYS).filter(entry => entry.canImport)
    expect(importable.length, 'a real save offered nothing at all').toBeGreaterThan(0)
  })

  it('gives every tracker a verdict, and a reason when it is no', () => {
    for (const entry of planSaveImports(parsedRoot, KEYS)) {
      expect(entry.label, entry.key).toBeTruthy()
      if (!entry.canImport) expect(entry.skipReason, entry.key).toBeTruthy()
    }
  })

  it('never says yes without a payload to write', () => {
    /*
     * The pairing the page depends on: it reads `canImport` to enable the
     * button and `payload` to do the work. A yes with a null payload is a
     * button that does nothing, or throws downstream.
     */
    for (const entry of planSaveImports(parsedRoot, KEYS)) {
      if (!entry.canImport) continue
      expect(entry.payload, `${entry.key} can import but has no payload`).not.toBeNull()
    }
  })

  it('plans the same thing twice', () => {
    // Planning is a read. If it were not, the second look at an import preview
    // would disagree with the first.
    const once = planSaveImports(parsedRoot, KEYS).map(e => `${e.key}:${e.canImport}`)
    const twice = planSaveImports(parsedRoot, KEYS).map(e => `${e.key}:${e.canImport}`)
    expect(twice).toEqual(once)
  })

  it('does not mutate the save root it was given', () => {
    /*
     * Every extractor runs over the same object, so a planner that wrote to it
     * would change what the next one reads — and the order they run in is not
     * something any caller thinks about.
     */
    const before = JSON.stringify(parsedRoot)
    planSaveImports(parsedRoot, KEYS)
    expect(JSON.stringify(parsedRoot)).toBe(before)
  })

  it('agrees with itself about each tracker, whole or one at a time', () => {
    // `planSaveImports` is the page's entry point and
    // `planSaveImportTarget` is the one the tests reach for. They must not
    // drift.
    const all = new Map(planSaveImports(parsedRoot, KEYS).map(e => [e.key, e]))
    for (const key of KEYS) {
      const single = planSaveImportTarget(key, parsedRoot)
      expect(single.canImport, key).toBe(all.get(key)?.canImport)
    }
  })

  it('survives a save with half its keys removed', () => {
    /*
     * What an older save looks like: the same shape, minus everything added
     * since. Every extractor is documented as returning `null` rather than
     * throwing for exactly this, and this is the check that they all do.
     */
    const keys = Object.keys(parsedRoot as Record<string, unknown>)
    const half = Object.fromEntries(
      keys.filter((_, index) => index % 2 === 0).map(key => [key, (parsedRoot as never)[key]]),
    )

    expect(() => planSaveImports(half, KEYS)).not.toThrow()
    for (const entry of planSaveImports(half, KEYS)) {
      if (entry.canImport) expect(entry.payload, entry.key).not.toBeNull()
      else expect(entry.skipReason, entry.key).toBeTruthy()
    }
  })

  it('survives every single key being removed in turn', () => {
    /*
     * The blunt version, and the one that finds a required key nobody declared
     * required. One missing field should cost one tracker, never the run.
     */
    const keys = Object.keys(parsedRoot as Record<string, unknown>)
    /*
     * A spread across the save rather than all six hundred keys. Each one costs
     * a full plan over twelve targets, and the complete set ran long enough to
     * trip the default timeout on a loaded machine — a test that fails for
     * being slow teaches nobody anything, and it failed under `pnpm verify`
     * while passing when run alone, which is the worst way to learn that.
     *
     * Sampling alone did not settle it: this still takes about three seconds
     * by itself and over seven under a full parallel run, against a five
     * second default. The timeout below is explicit so the next person sees a
     * budget rather than a mystery, and so the fix is not to keep shrinking
     * the sample until the coverage is gone.
     */
    const step = Math.max(1, Math.floor(keys.length / 24))
    for (const dropped of keys.filter((_, index) => index % step === 0)) {
      const partial = { ...(parsedRoot as Record<string, unknown>) }
      delete partial[dropped]
      expect(() => planSaveImports(partial, KEYS), `without ${dropped}`).not.toThrow()
    }
  }, 30_000)
})
