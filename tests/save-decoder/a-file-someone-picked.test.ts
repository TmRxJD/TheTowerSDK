import { existsSync, readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { decodeInflatedSave, isGzipped } from '../../src/save-decoder'

/**
 * The input here is a file a person chose, so every failure has to be a sentence.
 *
 * This decoder is the one path in the package that takes bytes from outside — a file input, a
 * phone, a download that may not have finished. Noise and truncation are the ordinary cases, not
 * the exotic ones.
 *
 * The reader already explained what it could: `Invalid NRBF stream` for noise, `RecordType not
 * supported` for a byte that is not a record type. A file cut in half is different — it reads a
 * record header, believes it, and runs off the end. That surfaced as `TypeError: Cannot read
 * properties of undefined (reading '…')` from the middle of the parser: unactionable in a browser,
 * where the usual cause is a partial copy and is the one thing a user can fix.
 */
/*
 * A real save comes from `TOWER_TEST_SAVE`, the way every other suite here takes one. Nothing
 * reaches outside the package: a fork has only what is committed, and `check-conventions` refuses
 * a path that climbs out of it — which it did to the first version of this file.
 */
const FIXTURE = process.env.TOWER_TEST_SAVE ?? ''

const noise = Uint8Array.from({ length: 4096 }, (_, index) => (index * 7919) % 256)

describe('a save file that is not a save file', () => {
  it('refuses empty input', () => {
    expect(() => decodeInflatedSave(new Uint8Array(0))).toThrow()
  })

  it('refuses noise, and says it is not the format', () => {
    expect(() => decodeInflatedSave(noise)).toThrow(/NRBF/i)
  })

  it('never hangs on hostile bytes', () => {
    /*
     * A length field is read from the file itself, so corrupting one is the obvious way to ask a
     * parser to allocate or loop forever. Every case here has to end.
     */
    const cases = [
      new Uint8Array(2048).fill(0xff),
      new Uint8Array(2048).fill(0x00),
      Uint8Array.from({ length: 2048 }, (_, index) => (index % 2 ? 0xff : 0x00)),
    ]

    for (const bytes of cases) {
      const started = Date.now()
      try {
        decodeInflatedSave(bytes)
      }
      catch {
        /* Throwing is the expected outcome; taking forever is the one being tested against. */
      }
      expect(Date.now() - started, 'decode should fail fast, not spin').toBeLessThan(5000)
    }
  })

  it('recognises gzip without decoding it', () => {
    expect(isGzipped(new Uint8Array([0x1f, 0x8b, 0x08]))).toBe(true)
    expect(isGzipped(new Uint8Array([0x00, 0x01]))).toBe(false)
    expect(isGzipped(new Uint8Array(0))).toBe(false)
  })

  describe.skipIf(!FIXTURE || !existsSync(FIXTURE))('against a real save', () => {
    /*
     * Read inside each test, not in the describe body.
     *
     * `skipIf` skips the TESTS; vitest still executes the body to discover them, so a read here
     * fails collection even when the suite is meant to be skipped. This package's publish notes
     * record that exact trap, and this file was written straight into it anyway.
     */
    const realSave = () => gunzipSync(readFileSync(FIXTURE))

    it('explains a truncated file instead of leaking a TypeError', () => {
      const real = realSave()
      const half = real.subarray(0, Math.floor(real.length / 2))

      let thrown: Error | undefined
      try {
        decodeInflatedSave(new Uint8Array(half))
      }
      catch (error) {
        thrown = error as Error
      }

      expect(thrown, 'half a save should not decode').toBeDefined()
      expect(thrown!.message).toMatch(/incomplete or corrupt/)
      expect(thrown!.message).not.toMatch(/Cannot read properties/)

      /* The original stays reachable, so a bug report still says where it happened. */
      expect((thrown as Error & { cause?: unknown }).cause).toBeInstanceOf(TypeError)
    })

    it('still decodes the whole file', () => {
      expect(Object.keys(decodeInflatedSave(new Uint8Array(realSave()))).length).toBeGreaterThan(100)
    })
  })
})
