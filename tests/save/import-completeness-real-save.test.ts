import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { decodePlayerInfoSaveBytes } from '../../src/node/decode-save'
import { executeSaveImports } from '../../src/save/import/executor'
import { SAVE_IMPORT_TARGET_LABELS, type SaveImportTargetKey } from '../../src/save/import/discovery'

/**
 * The committed account save (`test/playerInfo.dat`) as a permanent tester of the
 * whole import pipeline — save → decode → every tracker store — the first half of
 * "import my save, then deposit it to an IDS". Unlike the env-gated
 * import-executor tests, this always runs against the repo's real save, so a
 * regression that stops a domain importing fails here without anyone having to
 * point TOWER_TEST_SAVE at a file.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url))
const REAL_SAVE = path.resolve(HERE, '..', '..', '..', '..', 'test', 'playerInfo.dat')
// The real save is a monorepo-root fixture, not shipped with the package. When the
// published surface is cloned and verified in isolation it is absent, so skip rather
// than fail on its absence.
const HAS_SAVE = existsSync(REAL_SAVE)
const ALL_KEYS = Object.keys(SAVE_IMPORT_TARGET_LABELS) as SaveImportTargetKey[]

/** A port that captures each domain's payload instead of writing to a store. */
function capturingPort() {
  const captured = new Map<string, unknown>()
  const persist = (name: string) => async (payload: unknown) => {
    captured.set(name, payload)
    return { added: 0, updated: 0 } as never
  }
  return {
    captured,
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

const decodeAccount = () =>
  decodePlayerInfoSaveBytes(readFileSync(REAL_SAVE)).parsedRoot as Record<string, unknown>

describe.skipIf(!HAS_SAVE)('account save → tracker stores (permanent import tester)', () => {
  it('imports without a single failure', async () => {
    const { port } = capturingPort()
    const outcomes = await executeSaveImports({ parsedRoot: decodeAccount(), selectedKeys: ALL_KEYS, port })
    const failed = outcomes.filter(outcome => outcome.status === 'failed')
    expect(failed.map(f => `${f.key}: ${f.message}`), 'a domain failed to import').toEqual([])
  })

  it('fills the core EP domains a real endgame account must have', async () => {
    const { captured, port } = capturingPort()
    await executeSaveImports({ parsedRoot: decodeAccount(), selectedKeys: ALL_KEYS, port })
    // These are the domains the IDS/EP pipeline depends on; a real account fills them.
    for (const domain of ['labs', 'modules', 'workshop', 'cards', 'bots']) {
      expect(captured.has(domain), `${domain} was never written from the save`).toBe(true)
    }
  })

  it('is deterministic: the same save imports the same domains twice', async () => {
    const run = async () => {
      const { port } = capturingPort()
      const outcomes = await executeSaveImports({ parsedRoot: decodeAccount(), selectedKeys: ALL_KEYS, port })
      return outcomes.map(o => `${o.key}:${o.status}`).sort()
    }
    expect(await run()).toEqual(await run())
  })
})
