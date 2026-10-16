import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { decodeSaveFile, gunzipBytes } from '../../src/save-decoder'
import { decryptSaveSync } from '../../src/node/decrypt-save'
import { decodePlayerInfoSaveBytes } from '../../src/node/decode-save'

// Frozen vector: byte mask executed by the native writer, then independently encrypted.
const VECTOR = 'VERTMQEAAQIDBAUGBwgJCgsMDQ4PEJow5RZkGee00ORN3xrTSy4B1txvpP0KjzTm54W2amtivuCrO8KSsi9wmzADP79bfpkZtdDO8TKIQi1a80oa3MlbDPkwIj/VNFHDpVcChIb2BBmMiabwL/gkkYccDHTN'
const fixture = () => new Uint8Array(Buffer.from(VECTOR, 'base64'))
const expected = Buffer.concat([Buffer.from('Tower encrypted-save fixture'), Buffer.from([0, 1, 255])])

describe('TDS1 encrypted saves', () => {
  it('reads the native writer vector in both runtimes', async () => {
    expect(Buffer.from(await gunzipBytes(fixture()))).toEqual(expected)
    expect(gunzipSync(decryptSaveSync(fixture()))).toEqual(expected)
  })

  it('honours byte offsets and leaves the input untouched', async () => {
    const padded = new Uint8Array(fixture().length + 18)
    padded.set(fixture(), 7)
    const input = padded.subarray(7, 7 + fixture().length)
    await gunzipBytes(input)
    decryptSaveSync(input)
    expect(input).toEqual(fixture())
  })

  it.each([5, 21, 53, 116])('rejects changes at offset %i before parsing', async (offset) => {
    const bytes = fixture()
    bytes[offset] ^= 1
    await expect(gunzipBytes(bytes)).rejects.toThrow(/integrity check/)
    expect(() => decryptSaveSync(bytes)).toThrow(/integrity check/)
  })

  it.each([4, 52, 53, 54, 116])('rejects truncation to %i bytes', async (length) => {
    const bytes = fixture().subarray(0, length)
    await expect(gunzipBytes(bytes)).rejects.toThrow(/incomplete|corrupt/)
    expect(() => decryptSaveSync(bytes)).toThrow(/incomplete|corrupt/)
  })

  it('refuses unknown container versions', async () => {
    const bytes = fixture()
    bytes[4] = 2
    await expect(gunzipBytes(bytes)).rejects.toThrow(/version: 2/)
    expect(() => decryptSaveSync(bytes)).toThrow(/version: 2/)
  })

  it('preserves unencrypted input', async () => {
    const bytes = Uint8Array.from([0, 1, 2, 3])
    expect(decryptSaveSync(bytes)).toBe(bytes)
    expect(await gunzipBytes(bytes)).toBe(bytes)
  })

  const realPaths = (process.env.TOWER_ENCRYPTED_TEST_SAVES ?? '').split('|').filter(Boolean)
  it.each(realPaths)('decodes a supplied real save through both public readers: %s', async (path) => {
    const bytes = readFileSync(path)
    const node = decodePlayerInfoSaveBytes(bytes)
    expect(await decodeSaveFile(bytes)).toEqual(node.parsedRoot)
    expect(Object.keys(node.parsedRoot).length).toBeGreaterThan(100)
    expect(node.wasGzip).toBe(true)
  })
})
