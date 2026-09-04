import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { decodePlayerInfoSaveBytes } from '../../src/node/decode-save'
import { readModulesFromSaveRoot } from '../../src/save/modules/read'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REAL_SAVE = path.resolve(HERE, '..', '..', '..', '..', 'test', 'playerInfo.dat')
// Monorepo-root fixture, absent when the published surface is cloned and verified.
const HAS_SAVE = existsSync(REAL_SAVE)

describe.skipIf(!HAS_SAVE)('v29 emulator save — module slot levels', () => {
  it('reads primary levels from slotLevels after migration', () => {
    const root = decodePlayerInfoSaveBytes(readFileSync(REAL_SAVE)).parsedRoot as Record<string, unknown>
    expect(root.versionNumber).toBe(1174)
    expect(root.hasMigratedModuleLevelsToSlots).toBe(true)
    expect(root.slotLevels).toEqual([251, 250, 255, 255])

    const mods = readModulesFromSaveRoot(root)
    expect(mods).not.toBeNull()

    const primary = mods!.equipped.filter((e) => e.role === 'primary')
    expect(primary.map((e) => e.level)).toEqual([251, 250, 255, 255])
  })

  it('reads assist levels from AssistModuleSlot.level after migration', () => {
    const root = decodePlayerInfoSaveBytes(readFileSync(REAL_SAVE)).parsedRoot as Record<string, unknown>
    const mods = readModulesFromSaveRoot(root)
    expect(mods).not.toBeNull()

    const assist = mods!.equipped.filter((e) => e.role === 'assist')
    expect(assist.map((e) => e.level)).toEqual([241, 241, 255, 241])
  })

  it('still reads ModuleItem.level when migration flag is absent', () => {
    const mods = readModulesFromSaveRoot({
      moduleEquipped: [{ infoIndex: 9, level: 241, currentRarity: { value__: 15 }, effects: [1] }],
    })
    expect(mods?.equipped[0]?.level).toBe(241)
  })
})
