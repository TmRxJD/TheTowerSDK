import { describe, expect, it } from 'vitest'

import { mergeEnemyStatsCoreHub, mergeSharedUptimeInputsHub, resolveSharedToolInputs } from './shared-tool-inputs'
import { compactSharedToolInputsForStorage } from './shared-tool-inputs-storage'
import { defaultSharedEnemyStatsCore } from './shared-tool-inputs-extended'

describe('shared-tool-inputs hub merge', () => {
  it('preserves hub wave when tool store still holds site default', () => {
    const existing = { ...defaultSharedEnemyStatsCore, wave: 2500 }
    const incoming = { ...defaultSharedEnemyStatsCore, wave: 100 }
    const merged = mergeEnemyStatsCoreHub(existing, incoming, new Set())
    expect(merged.wave).toBe(2500)
  })

  it('accepts tool wave edit even when site default is 100', () => {
    const existing = { ...defaultSharedEnemyStatsCore }
    const incoming = { ...defaultSharedEnemyStatsCore, wave: 500 }
    const merged = mergeEnemyStatsCoreHub(existing, incoming, new Set(['enemyStatsCore.wave']))
    expect(merged.wave).toBe(500)
  })

  it('stores sparse hub values and resolves defaults at read time', () => {
    const resolved = resolveSharedToolInputs({
      enemyStatsCore: { wave: 2500 },
      uptimeInputs: { waLevel: 6 },
    })
    const sparse = compactSharedToolInputsForStorage(resolved)
    expect(sparse.enemyStatsCore?.wave).toBe(2500)
    expect(sparse.uptimeInputs).toEqual({ waLevel: 6 })

    const reloaded = resolveSharedToolInputs(sparse)
    expect(reloaded.enemyStatsCore.wave).toBe(2500)
    expect(reloaded.enemyStatsCore.tierSelection).toBe(1)
    expect(reloaded.uptimeInputs.waLevel).toBe(6)
  })

  it('does not let uptime Math.max clobber lower hub wavesPerBoss on delta merge', () => {
    const existing = resolveSharedToolInputs({ uptimeInputs: { wavesPerBoss: 3 } }).uptimeInputs
    const incoming = resolveSharedToolInputs({ uptimeInputs: { wavesPerBoss: 10 } }).uptimeInputs
    const merged = mergeSharedUptimeInputsHub(existing, incoming, new Set())
    expect(merged.wavesPerBoss).toBe(3)
  })
})
