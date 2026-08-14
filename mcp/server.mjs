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
import os from 'node:os'
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
      wiki: require(path.join(base, 'wiki', 'index.js')),
    }
  }
  throw new Error('thetowersdk build not found — run `pnpm build` first')
}

const sdk = loadSdk()

/**
 * Wiki pages, cached on disk between calls.
 *
 * Two reasons, and the second is the important one. It is a volunteer-run wiki
 * and an agent reading six pages to answer one question should not fetch six
 * pages twice. And an agent that has already looked something up should not be
 * tempted to guess the second time because the lookup felt expensive.
 */
const WIKI_CACHE_DIR = path.join(os.tmpdir(), 'thetowersdk-wiki-cache')

function cachedWikiPath(title) {
  return path.join(WIKI_CACHE_DIR, `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`)
}

async function wikiPageMarkdown(title, { refresh = false } = {}) {
  const cacheFile = cachedWikiPath(title)
  if (!refresh && fs.existsSync(cacheFile)) {
    return { markdown: fs.readFileSync(cacheFile, 'utf8'), cached: true }
  }

  const markdown = await sdk.wiki.fetchFandomPageAsMarkdown(title)
  fs.mkdirSync(WIKI_CACHE_DIR, { recursive: true })
  fs.writeFileSync(cacheFile, markdown, 'utf8')
  return { markdown, cached: false }
}
/** Read, not hard-coded, so it cannot drift from the package on a release. */
const { version: VERSION } = require(path.join(HERE, '..', 'package.json'))
const ENTRIES = ['data', 'save', 'node', 'mechanics', 'formatting', 'wiki']

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

  wiki_page: {
    description:
      'Read a page of The Tower community wiki as Markdown. USE THIS BEFORE describing how any game '
      + 'mechanic works. The SDK models the game; it does not explain it, and a formula that looks '
      + 'self-evident from a table has more than once meant something else. Cheap, cached, and '
      + 'always better than inferring. Try `wiki_search` first if you are unsure of the exact title.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Exact page title, e.g. "Cards" or "Ultimate Weapons"' },
        section: {
          type: 'string',
          description: 'Case-insensitive heading to return alone, when the page is long',
        },
        refresh: { type: 'boolean', description: 'Bypass the cache and refetch' },
      },
      required: ['title'],
    },
    run: async ({ title, section, refresh }) => {
      let page
      try {
        page = await wikiPageMarkdown(title, { refresh: Boolean(refresh) })
      } catch (error) {
        // A wrong title is the common case and is recoverable; say so rather
        // than letting it read as "the wiki has nothing on this".
        return {
          error: error instanceof Error ? error.message : String(error),
          hint: 'titles are case- and spelling-sensitive; run wiki_search to find the real one',
        }
      }

      const headings = [...page.markdown.matchAll(/^#{1,3} (.+)$/gm)].map(m => m[1].trim())
      if (!section) {
        return {
          title,
          cached: page.cached,
          sections: headings,
          markdown: page.markdown.slice(0, 12000),
          truncated: page.markdown.length > 12000,
          licence: 'Wiki text is CC-BY-SA. Attribute it if you reproduce it.',
        }
      }

      const wanted = String(section).toLowerCase()
      const lines = page.markdown.split('\n')
      const start = lines.findIndex(
        line => /^#{1,3} /.test(line) && line.replace(/^#+ /, '').trim().toLowerCase().includes(wanted),
      )
      if (start === -1) return { title, error: `no section matching "${section}"`, sections: headings }

      const depth = (lines[start].match(/^#+/) ?? ['#'])[0].length
      let end = lines.length
      for (let i = start + 1; i < lines.length; i += 1) {
        const match = lines[i].match(/^(#+) /)
        if (match && match[1].length <= depth) { end = i; break }
      }
      return { title, section: lines[start].replace(/^#+ /, ''), markdown: lines.slice(start, end).join('\n') }
    },
  },

  wiki_search: {
    description:
      'Search the community wiki for pages about a mechanic, and get their exact titles back. Use '
      + 'this when you do not know what a page is called, rather than guessing a title or searching '
      + 'the open web.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What you want to understand, e.g. "wave skip"' },
        limit: { type: 'number', description: 'How many titles to return (default 10)' },
      },
      required: ['query'],
    },
    run: async ({ query, limit }) => {
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        list: 'search',
        srsearch: String(query),
        srlimit: String(Math.min(Number(limit) || 10, 25)),
      })
      const response = await fetch(`${sdk.wiki.FANDOM_API_URL}?${params}`)
      if (!response.ok) return { error: `Fandom API HTTP ${response.status}` }

      const payload = await response.json()
      const hits = payload?.query?.search ?? []
      return {
        query,
        results: hits.map(hit => ({
          title: hit.title,
          // Snippets carry search-highlight markup; strip it so the text reads.
          snippet: String(hit.snippet ?? '').replace(/<[^>]*>/g, ''),
        })),
        next: 'pass one of these titles to wiki_page',
      }
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
  // Awaited: the wiki tools fetch, and a returned promise would serialise as
  // `{}` — an empty answer that reads like "the wiki has nothing" rather than
  // like a bug. Synchronous tools are unaffected.
  'tools/call': async ({ name, arguments: args }) => {
    const tool = TOOLS[name]
    if (!tool) return { isError: true, content: [{ type: 'text', text: `unknown tool: ${name}` }] }
    try {
      const result = await tool.run(args ?? {})
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
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
    // `handler` may be async — resolve before replying, and keep rejections on
    // the same error path a throw already took.
    Promise.resolve()
      .then(() => handler(request.params ?? {}))
      .then(result => send({ jsonrpc: '2.0', id: request.id, result }))
      .catch(error => send({
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32603, message: error.message },
      }))
  }
})
