import { describe, expect, it } from 'vitest'

import {
  buildVaultImportPayload,
  readVaultFromSaveRoot,
} from '../../src/save/vault/read'
import {
  readVaultV29ProgressFromSaveRoot,
  vaultV29RowKey,
} from '../../src/save/vault/v29-progress'

function buildSyntheticV29VaultRoot(): Record<string, unknown> {
  return {
    vault: {
      UnlockedGroups: {
        Elements: [100],
      },
      UpgradesLevel: {
        KeyValuePairs: [
          { key: 1, value: 10 },
        ],
      },
    },
  }
}

describe('readVaultV29ProgressFromSaveRoot', () => {
  it('maps VaultGroup 100 to harmony Gameplay unlock key', () => {
    const progress = readVaultV29ProgressFromSaveRoot(buildSyntheticV29VaultRoot())
    expect(progress).not.toBeNull()
    expect(progress!.levels[vaultV29RowKey('harmony', 'Gameplay', '__unlock__')]).toBe(1)
  })

  it('maps VaultID 1 to power Attack Damage with level capped', () => {
    const progress = readVaultV29ProgressFromSaveRoot(buildSyntheticV29VaultRoot())
    expect(progress).not.toBeNull()
    const damageKey = vaultV29RowKey('power', 'Attack', 'Damage')
    expect(progress!.levels[damageKey]).toBe(5)
  })

  it('buildVaultImportPayload uses v29 keys when vault object present', () => {
    const root = buildSyntheticV29VaultRoot()
    const extract = readVaultFromSaveRoot(root)
    expect(extract).not.toBeNull()
    expect(extract!.v29).not.toBeNull()

    const payload = buildVaultImportPayload(extract!)
    expect(payload).not.toBeNull()
    expect(Object.keys(payload!.levels).every(key => key.startsWith('v29:'))).toBe(true)
    expect(payload!.levels[vaultV29RowKey('harmony', 'Gameplay', '__unlock__')]).toBe(1)
    expect(payload!.levels[vaultV29RowKey('power', 'Attack', 'Damage')]).toBe(5)
  })
})
