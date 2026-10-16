import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeSaveFile, gunzipBytes, SAVE_DECODE_PUBLIC_KEY, SAVE_DECODE_API_ENDPOINT, SAVE_DECODE_PROJECT_ID } from '../../src/save-decoder'
import { decodePlayerInfoSaveBytes, decodePlayerInfoSaveBytesAsync } from '../../src/node/decode-save'

const encrypted = Uint8Array.from([0x54, 0x44, 0x53, 0x31, 1, ...Array(80).fill(7)])
const compressed = gzipSync(Buffer.from(JSON.stringify({ ResearchLevel: [4, 2, 0], BattleHistory: [] })))
const endpoint = 'https://save-api.example/decode'
const reply = (bytes: Uint8Array = compressed) => new Response(JSON.stringify({ status: 'completed', responseStatusCode: 200, responseBody: JSON.stringify({ decryptedBase64: Buffer.from(bytes).toString('base64') }) }), { headers: { 'content-type': 'application/json' } })
afterEach(() => vi.unstubAllGlobals())

describe('API-backed encrypted save decoding', () => {
  it('decrypts remotely and parses locally through both public asynchronous readers', async () => {
    const fetch = vi.fn(async () => reply())
    vi.stubGlobal('fetch', fetch)
    const browser = await decodeSaveFile(encrypted, { endpoint })
    const node = await decodePlayerInfoSaveBytesAsync(encrypted, { endpoint })
    expect(browser).toEqual({ researchLevel: [4, 2, 0], battleHistory: [] })
    expect(node).toEqual({ parsedRoot: browser, wasGzip: true, battleRunCount: 0 })
    const request = fetch.mock.calls[0] as unknown as [URL, RequestInit]
    expect(String(request[0])).toBe(endpoint)
    expect(request[1].headers).toEqual({ 'content-type': 'application/json', 'x-appwrite-project': SAVE_DECODE_PROJECT_ID })
    const execution = JSON.parse(request[1].body as string)
    expect(execution).toMatchObject({ async: false, method: 'POST', headers: { 'x-save-api-key': SAVE_DECODE_PUBLIC_KEY } })
    expect(Buffer.from(JSON.parse(execution.body).saveBase64, 'base64')).toEqual(Buffer.from(encrypted))
    expect(request[1]).toMatchObject({ method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error' })
  })
  it('never uploads unencrypted saves', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    expect(await decodeSaveFile(compressed)).toEqual(decodePlayerInfoSaveBytes(compressed).parsedRoot)
    expect(await decodePlayerInfoSaveBytesAsync(compressed)).toEqual(decodePlayerInfoSaveBytes(compressed))
    expect(fetch).not.toHaveBeenCalled()
  })
  it('uses the free endpoint by default and never decrypts synchronously', async () => {
    const fetch = vi.fn(async () => reply()); vi.stubGlobal('fetch', fetch)
    await gunzipBytes(encrypted)
    expect(String((fetch.mock.calls[0] as unknown as [URL])[0])).toBe(SAVE_DECODE_API_ENDPOINT)
    expect(() => decodePlayerInfoSaveBytes(encrypted)).toThrow('decodePlayerInfoSaveBytesAsync')
    await expect(gunzipBytes(encrypted, { endpoint: 'http://unsafe.example' })).rejects.toThrow('HTTPS')
  })
  it('owns an offset byte view before awaiting the response', async () => {
    const padded = new Uint8Array(encrypted.length + 11); padded.set(encrypted, 7)
    const input = padded.subarray(7, 7 + encrypted.length)
    const expected = Uint8Array.from(input)
    let finish!: (value: Response) => void
    const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve }))
    vi.stubGlobal('fetch', fetch)
    const pending = gunzipBytes(input, { endpoint })
    input[5] = 99
    finish(reply())
    await pending
    const request = fetch.mock.calls[0] as unknown as [URL, RequestInit]
    expect(Buffer.from(JSON.parse(JSON.parse(request[1].body as string).body).saveBase64, 'base64')).toEqual(Buffer.from(expected))
    expect(padded[0]).toBe(0)
  })
  it.each([400, 403, 413, 429, 503])('reports service HTTP %i without reflecting response contents', async status => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('private-server-detail', { status })))
    await expect(gunzipBytes(encrypted, { endpoint })).rejects.toThrow(`HTTP ${status}`)
    await expect(gunzipBytes(encrypted, { endpoint })).rejects.not.toThrow('private-server-detail')
  })
  it('rejects non-binary, empty, encrypted and oversized responses', async () => {
    for (const response of [
      new Response('unexpected html'),
      reply(new Uint8Array()),
      reply(encrypted),
      new Response(new Uint8Array(Math.ceil(8 * 1024 * 1024 / 3) * 4 + 65537)),
    ]) {
      vi.stubGlobal('fetch', vi.fn(async () => response))
      await expect(gunzipBytes(encrypted, { endpoint })).rejects.toThrow()
    }
  })
  it('bounds uploads before fetch and forwards cancellation and a changed public key', async () => {
    const fetch = vi.fn(async () => reply()); vi.stubGlobal('fetch', fetch)
    const large = new Uint8Array(8 * 1024 * 1024 + 1); large.set(encrypted)
    await expect(gunzipBytes(large, { endpoint })).rejects.toThrow('upload limit')
    expect(fetch).not.toHaveBeenCalled()
    const signal = new AbortController().signal
    await gunzipBytes(encrypted, { endpoint, apiKey: 'rotated-public-key', signal })
    const request = fetch.mock.calls[0] as unknown as [URL, RequestInit]
    expect(request[1].signal).toBe(signal)
    expect(JSON.parse(request[1].body as string).headers).toMatchObject({ 'x-save-api-key': 'rotated-public-key' })
  })
})
