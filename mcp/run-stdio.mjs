/**
 * Shared MCP JSON-RPC stdio loop (shipped with thetowersdk; reused by monorepo tower-mcp).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function runStdioMcp({ name, version, instructions, tools }) {
  const send = msg => process.stdout.write(`${JSON.stringify(msg)}\n`)

  const handlers = {
    initialize: () => ({
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name, version },
      instructions,
    }),
    'tools/list': () => ({
      // Compact descriptions so large tool sets fit Cursor's catalog (~40–100 tools).
      tools: Object.entries(tools).map(([toolName, t]) => {
        const desc = String(t.description ?? '')
        return {
          name: toolName,
          description: desc.length > 180 ? `${desc.slice(0, 177)}...` : desc,
          inputSchema: t.inputSchema ?? { type: 'object', properties: {} },
        }
      }),
    }),
    'tools/call': async ({ name: toolName, arguments: args }) => {
      const tool = tools[toolName]
      if (!tool) {
        return { isError: true, content: [{ type: 'text', text: `unknown tool: ${toolName}` }] }
      }
      try {
        const result = await tool.run(args ?? {})
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `${toolName} failed: ${error.message}` }],
        }
      }
    },
  }

  let buffer = ''
  process.stdin.on('data', chunk => {
    buffer += chunk
    let newline
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (!line) continue

      let request
      try {
        request = JSON.parse(line)
      } catch {
        continue
      }

      const handler = handlers[request.method]
      if (!handler) {
        if (request.id !== undefined) {
          send({
            jsonrpc: '2.0',
            id: request.id,
            error: { code: -32601, message: `unknown method: ${request.method}` },
          })
        }
        continue
      }
      Promise.resolve()
        .then(() => handler(request.params ?? {}))
        .then(result => send({ jsonrpc: '2.0', id: request.id, result }))
        .catch(error =>
          send({
            jsonrpc: '2.0',
            id: request.id,
            error: { code: -32603, message: error.message },
          }),
        )
    }
  })
}

export function isDirectRun(importMetaUrl) {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return normalizePath(path.resolve(entry)) === normalizePath(fileURLToPath(importMetaUrl))
  } catch {
    return false
  }
}

function normalizePath(p) {
  return String(p).replace(/\\/g, '/').toLowerCase()
}
