import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
// @ts-expect-error MCP helpers are plain ESM JavaScript.
import { readSaveDecodeOptions } from '../../mcp/save-options.mjs'

vi.mock('node:fs', () => ({ readFileSync: vi.fn(), statSync: vi.fn() }))
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks() })

describe('local MCP key configuration', () => {
  it('needs no key file for unencrypted saves', () => {
    vi.stubEnv('TOWER_SAVE_KEYS_FILE', undefined)
    expect(readSaveDecodeOptions()).toBeUndefined()
    expect(readFileSync).not.toHaveBeenCalled()
  })
  it('reads caller keys from the explicit local environment path', () => {
    vi.stubEnv('TOWER_SAVE_KEYS_FILE', '/private/keys.json')
    vi.mocked(statSync).mockReturnValue({ size: 150 } as ReturnType<typeof statSync>)
    const keys = { encryption: 'caller-a', authentication: 'caller-b', mask: 'caller-c' }
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(keys))
    expect(readSaveDecodeOptions()).toEqual({ keys })
    expect(readFileSync).toHaveBeenCalledWith('/private/keys.json', 'utf8')
  })
  it('bounds key file reads and does not expose contents in errors', () => {
    vi.stubEnv('TOWER_SAVE_KEYS_FILE', '/private/keys.json')
    vi.mocked(statSync).mockReturnValue({ size: 4097 } as ReturnType<typeof statSync>)
    expect(() => readSaveDecodeOptions()).toThrow('Unable to read TOWER_SAVE_KEYS_FILE')
    expect(readFileSync).not.toHaveBeenCalled()
    vi.mocked(statSync).mockReturnValue({ size: 200 } as ReturnType<typeof statSync>)
    vi.mocked(readFileSync).mockReturnValue('private-invalid-key')
    expect(() => readSaveDecodeOptions()).not.toThrow('private-invalid-key')
    expect(() => readSaveDecodeOptions()).toThrow('Unable to read TOWER_SAVE_KEYS_FILE')
  })
})
