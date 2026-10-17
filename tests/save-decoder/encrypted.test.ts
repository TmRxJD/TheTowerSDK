import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomBytes, createCipheriv, createHmac } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { decodeSaveFile, gunzipBytes, decryptSave, isEncryptedSave } from '../../src/save-decoder'
import { decodePlayerInfoSaveBytes, decodePlayerInfoSaveBytesAsync } from '../../src/node/decode-save'

// Ephemeral test keys are unrelated to game key material.
const keys = { encryption: randomBytes(32), authentication: randomBytes(32), mask: randomBytes(32) }
const root = { ResearchLevel: [4, 2, 0], BattleHistory: [], PlayerName: 'fixture' }
const expectedRoot = { researchLevel: [4, 2, 0], battleHistory: [], playerName: 'fixture' }
const plain = gzipSync(Buffer.from(JSON.stringify(root)))
function encrypt(bytes: Uint8Array) {
  const masked = Buffer.alloc(bytes.length)
  let state = 2166136261
  for (const value of keys.mask) state = Math.imul(state ^ value, 16777619) >>> 0
  for (let i = 0; i < bytes.length; i++) {
    state = (Math.imul(state, 1664525) + keys.mask[i & 31] + 1013904223) >>> 0
    const mask = (keys.mask[(i * 5 + 3) & 31] ^ (state >>> 24) ^ (state >>> 9)) & 255
    const shift = (state >>> 6) & 7
    const rotated = ((bytes[i] ^ mask) + (state >>> 13)) & 255
    masked[i] = ((rotated << shift) | (rotated >>> (8 - shift))) & 255
  }
  const iv = randomBytes(16)
  const aes = createCipheriv('aes-256-cbc', keys.encryption, iv)
  const ciphertext = Buffer.concat([aes.update(masked), aes.final()])
  const mac = createHmac('sha256', keys.authentication).update(Buffer.concat([Buffer.from([1]), iv, ciphertext])).digest()
  return Buffer.concat([Buffer.from('TDS1'), Buffer.from([1]), iv, mac, ciphertext])
}
const encrypted = encrypt(plain)
afterEach(() => vi.unstubAllGlobals())

describe('caller-key local save decryption', () => {
  it('decrypts exact compressed bytes and parses through browser and Node entry points without network', async () => {
    const fetch = vi.fn(() => { throw new Error('Network must not be used') }); vi.stubGlobal('fetch', fetch)
    expect(Buffer.from(await decryptSave(encrypted, { keys }))).toEqual(plain)
    expect(await decodeSaveFile(encrypted, { keys })).toEqual(expectedRoot)
    expect((await decodePlayerInfoSaveBytesAsync(encrypted, { keys })).parsedRoot).toEqual(expectedRoot)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('requires caller keys for encrypted input, with no built-in key or service fallback', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    await expect(decodeSaveFile(encrypted)).rejects.toThrow('caller-supplied decryption keys')
    await expect(decodePlayerInfoSaveBytesAsync(encrypted)).rejects.toThrow('caller-supplied decryption keys')
    expect(() => decodePlayerInfoSaveBytes(encrypted)).toThrow('decodePlayerInfoSaveBytesAsync')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('accepts a caller-owned JSON bundle of canonical base64 keys', async () => {
    const encoded = Object.fromEntries(Object.entries(keys).map(([name, value]) => [name, value.toString('base64')])) as unknown as typeof keys
    expect(Buffer.from(await decryptSave(encrypted, { keys: encoded }))).toEqual(plain)
  })
  it('reads unencrypted gzip, NRBF-compatible JSON and plain exports without keys or crypto', async () => {
    vi.stubGlobal('crypto', undefined)
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    const raw = Buffer.from(JSON.stringify(root))
    expect(await decodeSaveFile(raw)).toEqual(expectedRoot)
    expect(await decodeSaveFile(plain)).toEqual(expectedRoot)
    expect(await decryptSave(raw)).toBe(raw)
    expect(decodePlayerInfoSaveBytes(plain).parsedRoot).toEqual(expectedRoot)
    expect(fetch).not.toHaveBeenCalled()
  })
  it.each([5, 21, 53])('rejects tampering at byte %i before AES decrypt', async offset => {
    const bytes = Uint8Array.from(encrypted); bytes[offset] ^= 1
    const decrypt = vi.spyOn(globalThis.crypto.subtle, 'decrypt')
    try {
      await expect(decryptSave(bytes, { keys })).rejects.toThrow('integrity check')
      expect(decrypt).not.toHaveBeenCalled()
    } finally { decrypt.mockRestore() }
  })
  it('rejects incorrect authentication keys', async () => {
    await expect(decryptSave(encrypted, { keys: { ...keys, authentication: randomBytes(32) } })).rejects.toThrow('integrity check')
  })
  it('snapshots offset views and key bytes before the first await', async () => {
    const padded = new Uint8Array(encrypted.length + 11); padded.set(encrypted, 7)
    const view = padded.subarray(7, 7 + encrypted.length)
    const owned = { encryption: Uint8Array.from(keys.encryption), authentication: Uint8Array.from(keys.authentication), mask: Uint8Array.from(keys.mask) }
    const pending = decryptSave(view, { keys: owned })
    view.fill(0); for (const key of Object.values(owned)) key.fill(0)
    expect(Buffer.from(await pending)).toEqual(plain)
    expect(padded[0]).toBe(0)
  })
  it('validates all three keys without reflecting supplied values', async () => {
    for (const invalid of [{}, { ...keys, mask: new Uint8Array(31) }, { ...keys, encryption: 'private-invalid-value' }, { ...keys, authentication: '='.repeat(44) }]) {
      await expect(decryptSave(encrypted, { keys: invalid as unknown as typeof keys })).rejects.toThrow()
      await expect(decryptSave(encrypted, { keys: invalid as unknown as typeof keys })).rejects.not.toThrow('private-invalid-value')
    }
  })
  it('rejects oversized, incomplete and unsupported containers', async () => {
    const oversized = new Uint8Array(8 * 1024 * 1024 + 1); oversized.set(encrypted)
    await expect(decryptSave(oversized, { keys })).rejects.toThrow('size limit')
    await expect(decryptSave(encrypted.subarray(0, -1), { keys })).rejects.toThrow('incomplete')
    const unsupported = Uint8Array.from(encrypted); unsupported[4] = 2
    await expect(decryptSave(unsupported, { keys })).rejects.toThrow('version')
    expect(isEncryptedSave(encrypted)).toBe(true)
  })
  it('explains a missing Web Crypto runtime without contacting a server', async () => {
    vi.stubGlobal('crypto', undefined)
    await expect(gunzipBytes(encrypted, { keys })).rejects.toThrow('Web Crypto')
  })
})
