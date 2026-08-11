/**
 * Drives `mcp/server.mjs` the way an agent would: spawn it, speak JSON-RPC over
 * stdio, assert on the replies.
 *
 * The save-file cases need a real `playerInfo.dat`; point `TOWER_TEST_SAVE` at one
 * to run them. Without it those cases skip and the rest still run, so the server
 * stays covered on a fresh clone where nobody has a save to hand.
 */
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SERVER = path.join(HERE, '..', 'mcp', 'server.mjs')
const DIST = path.join(HERE, '..', 'dist', 'index.js')

const savePath = process.env.TOWER_TEST_SAVE
const hasSave = Boolean(savePath && existsSync(savePath))

/** The server reads `dist/`, so there is nothing to talk to before a build. */
const describeServer = existsSync(DIST) ? describe : describe.skip

describeServer('mcp server', () => {
  let child: ChildProcessWithoutNullStreams
  let buffer = ''
  let nextId = 1
  const pending = new Map<number, (msg: Record<string, any>) => void>()

  beforeAll(() => {
    child = spawn('node', [SERVER], { stdio: ['pipe', 'pipe', 'inherit'] })
    child.stdout.on('data', (chunk) => {
      buffer += chunk
      let newline: number
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (!line) continue
        const message = JSON.parse(line)
        pending.get(message.id)?.(message)
        pending.delete(message.id)
      }
    })
  })

  afterAll(() => child?.kill())

  const rpc = (method: string, params?: unknown) =>
    new Promise<Record<string, any>>((resolve, reject) => {
      const id = nextId++
      pending.set(id, resolve)
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
      setTimeout(() => reject(new Error(`timeout: ${method}`)), 20_000)
    })

  const call = async (name: string, args: Record<string, unknown>) => {
    const response = await rpc('tools/call', { name, arguments: args })
    const text = response.result?.content?.[0]?.text
    return text ? JSON.parse(text) : null
  }

  it('handshakes and advertises its tools', async () => {
    const init = await rpc('initialize', {})
    expect(init.result.protocolVersion).toBe('2024-11-05')
    expect(init.result.serverInfo.name).toBe('thetowersdk')
    // Must track package.json rather than a literal, or it silently goes stale.
    expect(init.result.serverInfo.version).toBe(
      JSON.parse(readFileSync(path.join(HERE, '..', 'package.json'), 'utf8')).version,
    )

    const list = await rpc('tools/list', {})
    const names = list.result.tools.map((tool: { name: string }) => tool.name).sort()
    expect(names).toEqual([
      'decode_save', 'define_term', 'describe_schema', 'get_export', 'list_exports', 'run_extractor',
    ])
    for (const tool of list.result.tools) {
      expect(tool.description).toBeTruthy()
      expect(tool.inputSchema.type).toBe('object')
    }
  })

  it('answers an unknown method with a JSON-RPC error', async () => {
    const response = await rpc('no/such/method', {})
    expect(response.error.code).toBe(-32601)
  })

  it('lists exports for every entry point', async () => {
    for (const entry of ['data', 'save', 'node', 'mechanics', 'formatting']) {
      const result = await call('list_exports', { entry })
      expect(result.total, entry).toBeGreaterThan(0)
    }
  })

  it('filters exports by substring', async () => {
    const result = await call('list_exports', { entry: 'save', filter: 'extract' })
    expect(result.matched).toBeGreaterThan(0)
    expect(result.matched).toBeLessThan(result.total)
    for (const entry of result.exports) expect(entry.name.toLowerCase()).toContain('extract')
  })

  it('previews a large table instead of returning it whole', async () => {
    const result = await call('get_export', { name: 'LAB_CATALOG', limit: 3 })
    expect(result.kind).toBe('array')
    expect(result.length).toBeGreaterThan(3)
    expect(result.sample).toHaveLength(3)
  })

  it('describes declared schemas and names unknown ones', async () => {
    const all = await call('describe_schema', {})
    expect(all.tables.length).toBeGreaterThan(0)

    const first = await call('describe_schema', { table: all.tables[0] })
    expect(typeof first.kind).toBe('string')

    const missing = await call('describe_schema', { table: 'not-a-table' })
    expect(missing.error).toContain('not-a-table')
    expect(missing.tables).toEqual(all.tables)
  })

  it('reports bad input by name rather than throwing', async () => {
    expect((await call('list_exports', { entry: 'nope' })).entries).toBeTruthy()
    expect((await call('get_export', { name: 'nope' })).error).toContain('nope')
    expect((await call('decode_save', { path: 'C:/no/such/file.dat' })).error).toBeTruthy()
  })

  it('defines terms and refuses to guess at unknown ones', async () => {
    const ilm = await call('define_term', { term: 'ILM' })
    expect(ilm.found).toBe(true)
    expect(ilm.meanings[0].expansion).toBe('Inner Land Mines')

    const ambiguous = await call('define_term', { term: 'SR' })
    expect(ambiguous.ambiguous).toBe(true)

    const narrowed = await call('define_term', { term: 'Damage', domain: 'workshop' })
    expect(narrowed.meanings).toHaveLength(1)

    const invented = await call('define_term', { term: 'Chronofield' })
    expect(invented.found).toBe(false)
    expect(invented.note).toContain('do not invent')
  })

  it.runIf(hasSave)('decodes a save and runs an extractor against it', async () => {
    const decoded = await call('decode_save', { path: savePath })
    expect(decoded.rootKeys).toBeGreaterThan(100)
    expect(decoded.trackers.length).toBeGreaterThan(0)

    const labs = await call('run_extractor', { extractor: 'readLabsFromSaveRoot', path: savePath })
    expect(Array.isArray(labs.warnings)).toBe(true)
    expect(labs.keyCount).toBeGreaterThan(0)

    const unknown = await call('run_extractor', { extractor: 'nope', path: savePath })
    expect(unknown.error).toContain('nope')
  })
})
