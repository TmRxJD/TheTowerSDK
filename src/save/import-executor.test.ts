import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { executeSaveImportTracker, executeSaveImportTrackers } from './import-executor'
import { planSaveImportTracker } from './import-planner'
import { SAVE_IMPORT_TRACKER_LABELS, type SaveImportTrackerKey } from './import-discovery'
import { decodePlayerInfoSaveBytes } from '../node/decode-save'

/**
 * The step that actually writes a save into a player's trackers.
 *
 * ## Why it matters more than its size suggests
 *
 * It is 164 lines and it had no tests. Everything above it — the extractors,
 * the planner — is a read. This is the only part that *writes*, it writes
 * twelve trackers in a loop, and a player who runs it has already committed:
 * there is no undo.
 *
 * So the properties are about damage control rather than correctness of any one
 * payload:
 *
 * - a tracker the planner turned down is never written, and says why;
 * - one tracker failing does not take the other eleven with it;
 * - a failure is reported as a failure rather than thrown at the page.
 */

const KEYS = Object.keys(SAVE_IMPORT_TRACKER_LABELS) as SaveImportTrackerKey[]

const savePath = process.env.TOWER_TEST_SAVE
const hasSave = Boolean(savePath && existsSync(savePath))
const describeSave = hasSave ? describe : describe.skip

/** A port that records what it was asked to write, and can be told to fail. */
function recordingPort(failOn: string[] = []) {
  const written: string[] = []
  /*
   * Returns the counts the executor reads back, not `undefined`.
   *
   * A port that returned nothing made battle reports fail with a type error
   * rather than import — so the first run of this file reported a bug in the
   * executor that was a bug in its own fixture. A fake has to keep the
   * contract it is standing in for.
   */
  const persist = (name: string) => async (...args: unknown[]) => {
    if (failOn.includes(name)) throw new Error(`${name} exploded`)
    written.push(name)
    void args
    return { added: 0, updated: 0 } as never
  }

  return {
    written,
    port: {
      persistBattleReports: persist('battleReports'),
      persistLifetime: persist('lifetime'),
      persistWorkshop: persist('workshop'),
      persistLabs: persist('labs'),
      persistUltimateWeapons: persist('ultimateWeapons'),
      persistModules: persist('modules'),
      persistCards: persist('cards'),
      persistVault: persist('vault'),
      persistBots: persist('bots'),
      persistGuardians: persist('guardians'),
      persistRelics: persist('relics'),
      persistDissonance: persist('dissonance'),
    } as never,
  }
}

describe('a tracker the planner turned down', () => {
  it('is never written, whatever the caller does with it', async () => {
    /*
     * The guard that matters most. A caller can hand any planner result
     * straight back, including one that said no — the page decides what to
     * offer, not this — so the refusal has to hold here too.
     */
    const { written, port } = recordingPort()

    for (const key of KEYS) {
      const planner = planSaveImportTracker(key, {})
      const outcome = await executeSaveImportTracker(planner, {}, port)
      if (!planner.canImport) expect(outcome.status, key).toBe('skipped')
    }

    expect(written, 'something was written from a file that is not a save').toEqual([])
  })

  it('carries the planner’s reason rather than a generic one', async () => {
    const { port } = recordingPort()
    const planner = planSaveImportTracker('workshop', {})
    const outcome = await executeSaveImportTracker(planner, {}, port)

    expect(outcome.status).toBe('skipped')
    expect(outcome.message, 'the reason was replaced').toBe(planner.skipReason)
  })
})

describeSave('writing a real save', () => {
  const parsedRoot = hasSave
    ? decodePlayerInfoSaveBytes(readFileSync(savePath as string)).parsedRoot
    : {}

  it('writes every tracker it said it could', async () => {
    const { written, port } = recordingPort()
    const outcomes = await executeSaveImportTrackers({
      parsedRoot, selectedKeys: KEYS, port,
    })

    const imported = outcomes.filter(outcome => outcome.status === 'imported')
    expect(imported.length, 'a real save wrote nothing').toBeGreaterThan(0)
    expect(written.length).toBe(imported.length)
  })

  it('keeps going when one tracker throws', async () => {
    /*
     * The property a partial import depends on. Twelve trackers are written in
     * a loop; one that fails must cost that tracker and no other, or a player
     * whose relics happen to be unreadable also loses their labs, their
     * workshop and everything after it in the list.
     */
    const { written, port } = recordingPort(['workshop'])
    const outcomes = await executeSaveImportTrackers({
      parsedRoot, selectedKeys: KEYS, port,
    })

    const failed = outcomes.filter(outcome => outcome.status === 'failed')
    expect(failed.map(outcome => outcome.key)).toEqual(['workshop'])
    expect(failed[0].message, 'the reason was swallowed').toMatch(/exploded/)
    expect(written.length, 'the rest were skipped too').toBeGreaterThan(0)
    expect(written).not.toContain('workshop')
  })

  it('reports a verdict for every tracker asked for, in order', async () => {
    const { port } = recordingPort()
    const outcomes = await executeSaveImportTrackers({
      parsedRoot, selectedKeys: KEYS, port,
    })

    expect(outcomes.map(outcome => outcome.key)).toEqual(KEYS)
    for (const outcome of outcomes) {
      expect(['imported', 'skipped', 'failed']).toContain(outcome.status)
      expect(outcome.label, outcome.key).toBeTruthy()
    }
  })

  it('tells the caller how far along it is, once per tracker', async () => {
    const { port } = recordingPort()
    const seen: Array<{ index: number, total: number }> = []

    await executeSaveImportTrackers({
      parsedRoot,
      selectedKeys: KEYS,
      port,
      onProgress: event => { seen.push({ index: event.index, total: event.total }) },
    })

    expect(seen).toHaveLength(KEYS.length)
    expect(seen.map(entry => entry.index)).toEqual(KEYS.map((_, index) => index + 1))
    expect(new Set(seen.map(entry => entry.total))).toEqual(new Set([KEYS.length]))
  })

  it('writes nothing for a selection of nothing', async () => {
    const { written, port } = recordingPort()
    const outcomes = await executeSaveImportTrackers({ parsedRoot, selectedKeys: [], port })
    expect(outcomes).toEqual([])
    expect(written).toEqual([])
  })

  it('writes only what was selected', async () => {
    // The page offers a checkbox per tracker; importing one must not import
    // its neighbours.
    const { written, port } = recordingPort()
    await executeSaveImportTrackers({ parsedRoot, selectedKeys: ['labs'], port })
    expect(written.filter(name => name !== 'labs')).toEqual([])
  })

  it('does not mutate the save root while writing', async () => {
    const { port } = recordingPort()
    const before = JSON.stringify(parsedRoot)
    await executeSaveImportTrackers({ parsedRoot, selectedKeys: KEYS, port })
    expect(JSON.stringify(parsedRoot)).toBe(before)
  })

  it('stops rather than half-writing when the caller’s progress hook throws', async () => {
    /*
     * `onProgress` is awaited and not guarded, so a hook that throws aborts the
     * loop. That is a real partial write — some trackers persisted, the rest
     * not — and this pins it as *known* rather than discovered later.
     *
     * Left as-is deliberately: the hook belongs to the caller, and swallowing
     * an error from it would hide a bug in their code while still leaving the
     * import half-done. The honest fix is for a caller not to throw here.
     */
    const { port } = recordingPort()
    const onProgress = vi.fn(() => { throw new Error('caller blew up') })

    await expect(executeSaveImportTrackers({
      parsedRoot, selectedKeys: KEYS, port, onProgress,
    })).rejects.toThrow(/caller blew up/)

    expect(onProgress).toHaveBeenCalledTimes(1)
  })
})
