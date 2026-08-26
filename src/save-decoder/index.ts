/**
 * Decoding a save in the browser, with nothing behind it.
 *
 * `playerInfo.dat` is gzip-compressed .NET Binary Format (NRBF) — the wire format
 * `BinaryFormatter` writes. Reading it normally means .NET: a server that accepts an upload,
 * deserializes it and hands back JSON. That is a backend to run, and it means every player who
 * wants to use your tool has to send their save file somewhere.
 *
 * The NRBF reader in this package is a port of that format to TypeScript, written against the
 * record types themselves rather than a .NET runtime. It has no dependencies and touches nothing
 * platform-specific, so the whole decode runs in the page: the file goes from a file input to a
 * parsed object without leaving the machine it is on.
 *
 * This entry point is that path, separated from `thetowersdk/node` so a browser bundle never sees
 * `node:zlib`. Same reader either side; only the gunzip differs, and the browser has one built in.
 *
 * ```ts
 * import { decodeSaveFile } from 'thetowersdk/save-decoder'
 * import { listImportableBattleRuns } from 'thetowersdk/save'
 *
 * const root = await decodeSaveFile(await file.arrayBuffer())
 * const runs = listImportableBattleRuns(root)
 * ```
 *
 * For a large save, do it in a Web Worker — the decode is CPU-bound and will hold the main thread
 * for as long as it takes. The Run Tracker does exactly that, and falls back to the main thread
 * where `Worker` is unavailable.
 */

export { NRBFReader, RecordType, PrimitiveType, BinaryType, BinaryArrayType, BinaryObject } from '../node/nrbf/nrbf-reader'
export { nrbfToJSON } from '../node/nrbf/nrbf-to-json'

import { NRBFReader } from '../node/nrbf/nrbf-reader'
import { nrbfToJSON } from '../node/nrbf/nrbf-to-json'

/** A save file's first two bytes when it is gzip-compressed, which it normally is. */
const GZIP_MAGIC = [0x1f, 0x8b] as const

function toBytes(input: Uint8Array | ArrayBuffer): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input)
}

export function isGzipped(input: Uint8Array | ArrayBuffer): boolean {
  const bytes = toBytes(input)
  return bytes.length >= 2 && bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1]
}

/**
 * Gunzip in the browser, using the platform's own decompressor.
 *
 * `DecompressionStream` has been in every current browser since 2023. Where it is missing this
 * says so rather than returning the compressed bytes, which would reach the reader as a stream
 * whose header does not match anything and fail somewhere much less obvious.
 */
export async function gunzipBytes(input: Uint8Array | ArrayBuffer): Promise<Uint8Array> {
  const bytes = toBytes(input)
  if (!isGzipped(bytes)) return bytes

  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'This save is gzip-compressed and DecompressionStream is unavailable here. '
      + 'Use thetowersdk/node in Node, or supply already-decompressed bytes.',
    )
  }

  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/**
 * A save file's bytes to a save root, entirely on the client.
 *
 * The result is the object every extractor in `thetowersdk/save` takes.
 */
export async function decodeSaveFile(
  input: Uint8Array | ArrayBuffer,
): Promise<Record<string, unknown>> {
  const inflated = await gunzipBytes(input)
  const parsed = nrbfToJSON(NRBFReader.readStream(inflated))

  /*
   * A non-object root means the bytes were not a save, and saying so here is the difference
   * between one clear error and a dozen extractors each reporting that it found nothing.
   */
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Not a playerInfo.dat: the NRBF root decoded to something other than an object.')
  }
  return parsed as Record<string, unknown>
}

/**
 * The same decode, when the caller has already handled the gunzip.
 *
 * Useful inside a Worker that receives inflated bytes, or with a save that was never compressed.
 */
export function decodeInflatedSave(inflated: Uint8Array): Record<string, unknown> {
  const parsed = nrbfToJSON(NRBFReader.readStream(inflated))
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Not a playerInfo.dat: the NRBF root decoded to something other than an object.')
  }
  return parsed as Record<string, unknown>
}
