/**
 * Decoding `playerInfo.dat`.
 *
 * Save files are gzip-compressed .NET binary serialization (NRBF).
 * `decodePlayerInfoSaveBytes` handles both and gives you a save root to pass to
 * `thetowersdk/save`.
 *
 * This entry needs Node because it uses `node:zlib`. In a browser, gunzip with
 * `DecompressionStream` and call the NRBF reader directly — both are exported
 * here and are pure:
 *
 * ```ts
 * import { NRBFReader, nrbfToJSON } from 'thetowersdk/node'
 *
 * async function decodeInBrowser (file: File): Promise<Record<string, unknown>> {
 *   let bytes = new Uint8Array(await file.arrayBuffer())
 *   if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
 *     const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
 *     bytes = new Uint8Array(await new Response(stream).arrayBuffer())
 *   }
 *   return nrbfToJSON(NRBFReader.readStream(bytes)) as Record<string, unknown>
 * }
 * ```
 */
export * from './decode-save'
export * from './nrbf/nrbf-reader'
export * from './nrbf/nrbf-to-json'
