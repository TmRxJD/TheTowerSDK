#!/usr/bin/env node
/**
 * MCP server for thetowersdk.
 *
 * Lets an agent explore the SDK and try it against a real save without writing
 * a scratch script first: list what exists, read a table, decode a save, run an
 * extractor, look up a schema.
 *
 * Speaks MCP over stdio with no SDK dependency — the protocol surface used here
 * is small enough that adding one would cost more than it saves.
 *
 *   node mcp/server.mjs
 *
 * Register it with your agent as a stdio server. See mcp/README.md.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const HERE = path.dirname(fileURLToPath(import.meta.url))

/** Prefer the built package; fall back to a sibling install. */
function loadSdk() {
  const candidates = [path.join(HERE, '..', 'dist'), path.join(HERE, '..', '..', 'thetowersdk', 'dist')]
  for (const base of candidates) {
    if (!fs.existsSync(path.join(base, 'index.js'))) continue
    return {
      data: require(path.join(base, 'data', 'index.js')),
      save: require(path.join(base, 'save', 'index.js')),
      node: require(path.join(base, 'node', 'index.js')),
      mechanics: require(path.join(base, 'mechanics', 'index.js')),
      formatting: require(path.join(base, 'formatting', 'index.js')),
    }
  }
  throw new Error('thetowersdk build not found — run `pnpm build` first')
}

const sdk = loadSdk()
/** Read, not hard-coded, so it cannot drift from the package on a release. */
const { version: VERSION } = require(path.join(HERE, '..', 'package.json'))
const ENTRIES = ['data', 'save', 'node', 'mechanics', 'formatting']

/** Values are often huge tables; never return one whole by accident. */
const preview = (value, limit = 40) => {
  if (Array.isArray(value)) {
    return { kind: 'array', length: value.length, sample: value.slice(0, limit) }
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
    return {
      kind: 'object',
      keyCount: keys.length,
      keys: keys.slice(0, limit),
      sample: Object.fromEntries(keys.slice(0, 5).map(k => [k, value[k]])),
    }
  }
  return { kind: typeof value, value }
}

const TOOLS = {
  list_exports: {
    description:
      'List what an entry point exports, optionally filtered. Use this first to find the right name '
      + 'instead of guessing.',
    inputSchema: {
      type: 'object',
      properties: {
        entry: { type: 'string', enum: ENTRIES, description: 'Which entry point to list' },
        filter: { type: 'string', description: 'Case-insensitive substring to match export names' },
      },
      required: ['entry'],
    },
    run: ({ entry, filter }) => {
      const mod = sdk[entry]
      if (!mod) return { error: `no entry point "${entry}"`, entries: ENTRIES }
      let names = Object.keys(mod).sort()
      if (filter) names = names.filter(n => n.toLowerCase().includes(String(filter).toLowerCase()))
      return {
        entry,
        total: Object.keys(mod).length,
        matched: names.length,
        exports: names.slice(0, 300).map(name => ({
          name,
          type: Array.isArray(mod[name]) ? `array(${mod[name].length})` : typeof mod[name],
        })),
      }
    },
  },

  get_export: {
    description:
      'Read one export by name, previewed rather than dumped whole. Tables here run to thousands of '
      + 'rows, so this returns a length plus a sample.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Export name, e.g. generatedLabs' },
        limit: { type: 'number', description: 'How many entries to sample (default 40)' },
      },
      required: ['name'],
    },
    run: ({ name, limit }) => {
      for (const entry of ENTRIES) {
        if (name in sdk[entry]) return { entry, name, ...preview(sdk[entry][name], limit ?? 40) }
      }
      return { error: `no export named "${name}"; try list_exports with a filter` }
    },
  },

  decode_save: {
    description:
      'Decode a playerInfo.dat and summarise it: how many keys, how many runs, and what each '
      + 'extractor finds. Read-only.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Absolute path to playerInfo.dat' } },
      required: ['path'],
    },
    run: ({ path: savePath }) => {
      if (!fs.existsSync(savePath)) return { error: `no file at ${savePath}` }
      const { parsedRoot, wasGzip, battleRunCount } = sdk.node.decodePlayerInfoSaveBytes(
        fs.readFileSync(savePath),
      )
      const discovered = sdk.save.discoverSaveImportTrackers(parsedRoot)
      return {
        gzip: wasGzip,
        rootKeys: Object.keys(parsedRoot).length,
        battleRuns: battleRunCount,
        trackers: discovered.trackers.map(t => ({ label: t.label, count: t.count, summary: t.summary })),
      }
    },
  },

  run_extractor: {
    description:
      'Run one extract*FromSaveRoot against a save and return its result previewed, including any '
      + 'warnings. Returns null when the save has no data for that feature — that is expected, not an error.',
    inputSchema: {
      type: 'object',
      properties: {
        extractor: { type: 'string', description: 'e.g. readLabsFromSaveRoot' },
        path: { type: 'string', description: 'Absolute path to playerInfo.dat' },
      },
      required: ['extractor', 'path'],
    },
    run: ({ extractor, path: savePath }) => {
      const fn = sdk.save[extractor]
      if (typeof fn !== 'function') {
        return { error: `no extractor named "${extractor}"; try list_exports on "save" with filter "extract"` }
      }
      if (!fs.existsSync(savePath)) return { error: `no file at ${savePath}` }
      const { parsedRoot } = sdk.node.decodePlayerInfoSaveBytes(fs.readFileSync(savePath))
      const result = fn(parsedRoot)
      if (result === null) return { extractor, result: null, note: 'this save has no data for that feature' }
      return { extractor, warnings: result?.warnings ?? [], ...preview(result) }
    },
  },

  define_term: {
    description:
      'Look up a game term, acronym or set of module initials in the SDK glossary. Use this before '
      + 'writing a name into docs or UI copy — several acronyms mean more than one thing, and the '
      + 'glossary is generated from the shipped catalogs so the names in it are real.',
    inputSchema: {
      type: 'object',
      properties: {
        term: { type: 'string', description: 'e.g. ILM, SR, Chrono Field, save root' },
        domain: {
          type: 'string',
          description: 'Narrow an ambiguous term, e.g. ultimate-weapon, module, card, workshop',
        },
      },
      required: ['term'],
    },
    run: ({ term, domain }) => {
      const matches = sdk.data.lookupGlossary?.(term) ?? []
      const filtered = domain ? matches.filter(entry => entry.domain === domain) : matches
      if (!filtered.length) {
        return {
          term,
          found: false,
          note: 'not in the glossary — do not invent an expansion; check the catalogs with list_exports',
        }
      }
      return { term, found: true, ambiguous: filtered.length > 1, meanings: filtered }
    },
  },

  plan_effective_path: {
    description:
      'Plan an Effective Paths route and show what it left out and why. Every planner reports both '
      + 'the steps it chose and the candidates it passed over with a reason, so an empty or '
      + 'surprising path can be read rather than guessed at — a path that stops after one step '
      + 'usually means everything else is already at its cap, and this says so.',
    inputSchema: {
      type: 'object',
      properties: {
        family: {
          type: 'string',
          enum: ['damage', 'economy', 'health', 'regen'],
          description: 'Which model to plan',
        },
        variant: {
          type: 'string',
          description:
            'The path. damage: lab-time, lab-coins, stone, coin, keys. economy: time, coin, stone. '
            + 'health: lab-time, lab-coins, stone, coin. regen: lab-time, lab-coins. '
            + 'A variant a planner does not publish is refused by name rather than planning nothing',
        },
        steps: { type: 'number', description: 'How many steps to plan (default 10)' },
        levels: {
          type: 'object',
          description:
            'Starting levels, merged over all-zero. Shape matches the family\'s levels type — use '
            + 'get_export on ZERO_EFFECTIVE_DAMAGE_LEVELS or ZERO_EFFECTIVE_ECONOMY_LEVELS to see it',
        },
      },
      required: ['family', 'variant'],
    },
    run: ({ family, variant, steps, levels }) => {
      const m = sdk.mechanics
      const count = steps ?? 10

      /** Merge a caller's partial levels over the model's zero. */
      const merge = zero => {
        const merged = { ...zero }
        for (const [key, value] of Object.entries(levels ?? {})) {
          merged[key] = merged[key] && typeof merged[key] === 'object'
            ? { ...merged[key], ...value }
            : value
        }
        return merged
      }

      const plans = {
        damage: () => m.planEffectiveDamagePath({
          config: m.zeroEffectiveDamageConfig(),
          levels: merge(m.ZERO_EFFECTIVE_DAMAGE_LEVELS),
          variant,
          steps: count,
        }),
        economy: () => m.planEffectiveEconomyPath({
          config: m.zeroEffectiveEconomyConfig(),
          levels: merge(m.ZERO_EFFECTIVE_ECONOMY_LEVELS),
          variant,
          steps: count,
          workshopEnhancementsUnlocked: true,
        }),
        health: () => m.planEffectiveHealthPath({
          config: m.zeroEffectiveHealthConfig(),
          levels: merge(m.ZERO_EFFECTIVE_HEALTH_LEVELS),
          variant,
          steps: count,
        }),
        regen: () => {
          const regen = m.zeroEffectiveRegenConfigSource()
          return m.planEffectiveRegenPath({
            config: {
              healthRegen: regen.healthRegen,
              card: regen.card,
              hasSecondWindMastery: regen.hasSecondWindMastery,
            },
            eHealth: m.zeroEffectiveHealthConfig(),
            levels: merge({ ...m.ZERO_EFFECTIVE_HEALTH_LEVELS, ...m.ZERO_EFFECTIVE_REGEN_LEVELS }),
            variant,
            steps: count,
          })
        },
      }

      if (!plans[family]) {
        return { error: `no family "${family}"`, families: Object.keys(plans) }
      }

      let plan
      try {
        plan = plans[family]()
      }
      catch (error) {
        // The variant guards throw by name and list what they do publish, so
        // the message is more use than a generic failure.
        return { error: String(error instanceof Error ? error.message : error) }
      }

      return {
        family,
        variant,
        note:
          'Planned from a zero config, so the values are shaped rather than real — this is for '
          + 'reading which candidates a variant offers and why others are out, not for advice.',
        steps: plan.steps.map(step => ({
          step: step.step, name: step.name, level: step.level, cost: step.cost, roi: step.roi,
        })),
        excluded: plan.excluded,
      }
    },
  },

  describe_schema: {
    description:
      'The declared runtime schema for a data table — the exact shape, rather than one inferred from '
      + 'a sample row.',
    inputSchema: {
      type: 'object',
      properties: { table: { type: 'string', description: 'Table name, or omit to list them all' } },
    },
    run: ({ table }) => {
      const schemas = sdk.data.DATA_TABLE_SCHEMAS ?? {}
      if (!table) return { tables: Object.keys(schemas) }
      const spec = schemas[table]
      if (!spec) return { error: `no schema for "${table}"`, tables: Object.keys(schemas) }
      return { table, kind: spec.kind, shape: JSON.parse(JSON.stringify(spec.schema.shape ?? {}, replacer)) }
    },
  },
}

/** Zod internals are circular; keep only what is readable. */
function replacer(key, value) {
  if (key === '_def' || key === 'parent') return undefined
  return value
}

// ---- stdio JSON-RPC --------------------------------------------------------

const send = msg => process.stdout.write(`${JSON.stringify(msg)}\n`)

const handlers = {
  initialize: () => ({
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    serverInfo: { name: 'thetowersdk', version: VERSION },
  }),
  'tools/list': () => ({
    tools: Object.entries(TOOLS).map(([name, t]) => ({
      name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }),
  'tools/call': ({ name, arguments: args }) => {
    const tool = TOOLS[name]
    if (!tool) return { isError: true, content: [{ type: 'text', text: `unknown tool: ${name}` }] }
    try {
      return { content: [{ type: 'text', text: JSON.stringify(tool.run(args ?? {}), null, 2) }] }
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: `${name} failed: ${error.message}` }] }
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
      // Notifications have no id and expect no reply.
      if (request.id !== undefined) {
        send({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: `unknown method: ${request.method}` } })
      }
      continue
    }
    try {
      send({ jsonrpc: '2.0', id: request.id, result: handler(request.params ?? {}) })
    } catch (error) {
      send({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message: error.message } })
    }
  }
})
