/**
 * tower-oracle — the game-knowledge MCP surface.
 *
 * The rest of the SDK's tools answer "what is this number". These answer "what
 * is this thing, what does it depend on, and what will I get wrong about it".
 *
 * ## Why it is a tool and not a document
 *
 * The knowledge existed before this — on a wiki, in patch notes, in the head of
 * whoever last touched a formula. It was not *reachable at the moment of the
 * mistake*. An agent about to write `stripStars(rarity)` does not stop to read
 * a wiki page; it will call a tool that answers in one hop.
 *
 * So the contract is: **`oracle_traps` before you touch a mechanic.** One call,
 * and every way that mechanic has already been got wrong comes back.
 *
 * ## Honesty
 *
 * `oracle_coverage` exists so the oracle can say "I do not know that yet". A
 * knowledge base that answers confidently for everything is worse than none,
 * because its silence stops meaning anything. Every tool that finds nothing
 * says so plainly and says what *is* known nearby.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const HERE = path.dirname(fileURLToPath(import.meta.url))

function loadKnowledge() {
  const candidates = [
    path.join(HERE, '..', 'dist'),
    path.join(HERE, '..', '..', 'thetowersdk', 'dist'),
  ]
  for (const base of candidates) {
    const entry = path.join(base, 'knowledge', 'index.js')
    if (fs.existsSync(entry)) return require(entry)
  }
  throw new Error('thetowersdk build not found — run `pnpm build` in packages/sdk first')
}

let cached = null
function knowledge() {
  if (!cached) cached = loadKnowledge()
  return cached
}

/**
 * Score a node against free-text terms. Label hits beat summary hits.
 *
 * Whole-query match is scored before per-term match, and deliberately so: with
 * per-term scoring alone, "assist module" matched `module` exactly on one term
 * (+100) and beat `assistModule`, which only matched both terms partially
 * (+20). The oracle answered a question about assists with facts about
 * primaries — the exact confusion it exists to prevent.
 */
function scoreNode(node, terms) {
  const label = node.label.toLowerCase()
  const id = node.id.toLowerCase()
  const body = `${node.summary} ${(node.traps ?? []).join(' ')}`.toLowerCase()
  const phrase = terms.join(' ')
  const squashed = phrase.replace(/\s+/g, '')

  if (id === phrase || label === phrase || id === squashed) return 1000

  /* "module levels" must find `module.level`. Without this the plural misses
   * the id entirely and the query lands on whichever node happens to mention
   * "levels" in its prose — which was `module.subEffect`, the one thing a
   * level calculator does not need. */
  const singular = terms.map(term => (term.length > 3 && term.endsWith('s')
    ? term.slice(0, -1)
    : term))
  const singularPhrase = singular.join(' ')
  if (id === singularPhrase || label === singularPhrase
    || id === singularPhrase.replace(/\s+/g, '')
    || id === `${node.id.split('.')[0].toLowerCase()}.${singular[singular.length - 1]}`) {
    return 900
  }

  let score = 0
  for (const [index, term] of terms.entries()) {
    const stem = singular[index]
    const hitId = id.includes(term) || id.includes(stem)
    const hitLabel = label.includes(term) || label.includes(stem)
    if (id === term || label === term || id === stem || label === stem) score += 100
    else if (hitId || hitLabel) score += 10
    else if (body.includes(term) || body.includes(stem)) score += 1
  }
  // Matching every term beats matching one of them very well.
  const matchedAll = terms.every((term, index) => {
    const stem = singular[index]
    return id.includes(term) || label.includes(term) || body.includes(term)
      || id.includes(stem) || label.includes(stem) || body.includes(stem)
  })
  return matchedAll ? score + 150 : score
}

/**
 * Split traps by whether they came from a fact or an opinion.
 *
 * A `sentiment` node's traps are community judgement — real and worth knowing,
 * but never something to compute with or hard-code. Returning them in the same
 * list as mechanical facts is how an opinion ends up baked into a calculator.
 */
function partitionByClaim(ids) {
  const { knowledgeFor } = knowledge()
  const objective = []
  const sentiment = []
  for (const id of ids) {
    const node = knowledgeFor(id)
    if (!node) continue
    const bucket = node.claimType === 'sentiment' ? sentiment : objective
    for (const trap of node.traps ?? []) bucket.push(trap)
  }
  const dedupe = list => list.filter((item, i, all) => all.indexOf(item) === i)
  return { objective: dedupe(objective), sentiment: dedupe(sentiment) }
}

/** The shape every lookup returns, so an agent never has to make a second call. */
function describe(id) {
  const { knowledgeFor, relationsOf, trapsFor } = knowledge()
  const node = knowledgeFor(id)
  if (!node) return null
  return {
    ...node,
    claimType: node.claimType ?? 'objective',
    relations: relationsOf(id).map(edge => ({
      from: edge.from,
      kind: edge.kind,
      to: edge.to,
      note: edge.note,
      direction: edge.from === id ? 'outgoing' : 'incoming',
      sources: edge.sources,
    })),
    /* Neighbour traps included deliberately: the mistake is usually made on the
     * entity next to the one being edited. */
    trapsIncludingNeighbours: trapsFor(id),
  }
}

/** What to say when we do not know — never an empty result with no guidance. */
function missSuggestions(query) {
  const { GAME_KNOWLEDGE, allNodes } = knowledge()
  const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean)
  return allNodes(GAME_KNOWLEDGE)
    .map(node => ({ id: node.id, label: node.label, score: scoreNode(node, terms) }))
    .filter(hit => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

export const TOWER_ORACLE_TOOLS = {
  oracle_traps: {
    description:
      'CALL THIS FIRST, before writing or changing any code that touches a game mechanic '
      + '(modules, cards, ultimate weapons, labs, bots, enhancements, relics, workshop, '
      + 'guardian, tiers). Returns every way that mechanic and its neighbours have already '
      + 'been got wrong. Each entry is a real defect that shipped, not a hypothetical. '
      + 'Cheaper than the bug: the star-tier trap alone silently zeroed a module for months.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'Entity id or plain name — "assistModule", "module.rarity", "assist module", "cards".',
        },
      },
      required: ['id'],
    },
    run: ({ id }) => {
      const { knowledgeFor, trapsFor } = knowledge()
      const direct = knowledgeFor(id)
      const resolved = direct ? id : (missSuggestions(id)[0]?.id ?? null)
      if (!resolved) {
        return {
          found: false,
          query: id,
          traps: [],
          warning:
            'tower-oracle has no entry for this. That means UNDOCUMENTED, not SAFE — read the '
            + 'wiki via wiki_page and record what you learn with oracle_coverage as your checklist.',
        }
      }
      const { relationsOf } = knowledge()
      const neighbourhood = [resolved, ...relationsOf(resolved)
        .flatMap(edge => [edge.from, edge.to])]
      const split = partitionByClaim([...new Set(neighbourhood)])

      return {
        found: true,
        query: id,
        resolvedTo: resolved,
        matchedExactly: Boolean(direct),
        // Kept for compatibility; prefer the split below.
        traps: trapsFor(resolved),
        objectiveTraps: split.objective,
        sentimentTraps: split.sentiment,
        note: split.sentiment.length
          ? 'sentimentTraps are community judgement, not mechanics. Never hard-code them into a '
            + 'calculation or present them as how the game works.'
          : undefined,
      }
    },
  },

  oracle_get: {
    description:
      'Look up one game entity: what it is, its units, every relationship in both directions, '
      + 'its traps, and the source behind each claim. Use when modelling a mechanic, naming a '
      + 'field, or deciding whether two values are linked. Every claim cites a source you can '
      + 're-check — nothing here is inferred from a table shape.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Entity id, e.g. "assistModule.efficiency".' },
      },
      required: ['id'],
    },
    run: ({ id }) => {
      const found = describe(id)
      if (found) return { found: true, entity: found }
      return {
        found: false,
        query: id,
        didYouMean: missSuggestions(id),
        warning: 'Not documented yet. Absence of an entry is not evidence a mechanic is simple.',
      }
    },
  },

  oracle_search: {
    description:
      'Free-text search across every documented entity — labels, summaries and traps. Use when '
      + 'you know what a player calls something but not what the graph calls it, or to sweep a '
      + 'topic ("stones", "cooldown", "multiplicative") before assuming how it works.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Words to search for.' },
        limit: { type: 'number', description: 'Max results (default 10).' },
      },
      required: ['query'],
    },
    run: ({ query, limit }) => {
      const { GAME_KNOWLEDGE, allNodes } = knowledge()
      const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean)
      const hits = allNodes(GAME_KNOWLEDGE)
        .map(node => ({ node, score: scoreNode(node, terms) }))
        .filter(hit => hit.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, Number(limit) > 0 ? Number(limit) : 10)
        .map(hit => ({
          id: hit.node.id,
          label: hit.node.label,
          kind: hit.node.kind,
          summary: hit.node.summary,
          trapCount: (hit.node.traps ?? []).length,
        }))
      return { query, matches: hits.length, results: hits }
    },
  },

  oracle_map: {
    description:
      'The whole knowledge graph, or one family of it — every entity and typed relationship. '
      + 'Use for orientation before a large piece of work, or to see how a system hangs together '
      + 'rather than querying it one node at a time.',
    inputSchema: {
      type: 'object',
      properties: {
        family: {
          type: 'string',
          description: 'Id prefix to filter to, e.g. "module" or "assistModule". Omit for all.',
        },
        includeSources: { type: 'boolean', description: 'Include per-claim sources (verbose).' },
      },
    },
    run: ({ family, includeSources }) => {
      const { GAME_KNOWLEDGE, allNodes, allEdges } = knowledge()
      const keep = id => !family || id === family || id.startsWith(`${family}.`)
      const nodes = allNodes(GAME_KNOWLEDGE).filter(node => keep(node.id))
      const edges = allEdges(GAME_KNOWLEDGE).filter(edge => keep(edge.from) || keep(edge.to))
      const strip = entry => (includeSources ? entry : { ...entry, sources: undefined })
      return {
        version: GAME_KNOWLEDGE.version,
        family: family ?? 'all',
        nodes: nodes.map(strip),
        edges: edges.map(strip),
        counts: { nodes: nodes.length, edges: edges.length },
      }
    },
  },

  oracle_expand: {
    description:
      'CALL THIS BEFORE INTERPRETING ANY ACRONYM OR SHORTHAND the user writes — GT+, CF, ELS, '
      + 'MVN, PBHGT, DW3, cc#. Returns every known expansion from a CLOSED SET with the entity '
      + 'each names. DO NOT expand an acronym from memory: a model asked to recall an expansion '
      + 'can produce a plausible wrong one even when only a single correct expansion exists, and '
      + 'a wrong expansion is invisible downstream. Choose from what this returns, or ask.',
    inputSchema: {
      type: 'object',
      properties: {
        term: {
          type: 'string',
          description: 'The acronym or shorthand exactly as the user wrote it, e.g. "gt+", "CF".',
        },
      },
      required: ['term'],
    },
    run: ({ term }) => {
      const { ACRONYM_EXPANSIONS, CANONICAL_SPELLINGS, knowledgeFor, resolveWithConfidence }
        = knowledge()

      const raw = String(term ?? '').trim()
      const key = raw.toLowerCase()

      /* Canonical spelling first — a single wrong letter is the whole problem. */
      const canonicalSpelling = Object.entries(CANONICAL_SPELLINGS)
        .find(([wrong]) => wrong.toLowerCase() === key)?.[1]

      const known = ACRONYM_EXPANSIONS[key]
      if (known) {
        return {
          term: raw,
          ambiguous: known.length > 1,
          expansions: known.map(entry => ({
            ...entry,
            entity: entry.entityId ? knowledgeFor(entry.entityId) ?? undefined : undefined,
          })),
          instruction: known.length > 1
            ? 'AMBIGUOUS. More than one expansion is valid. Pick using `whenToUse` and the '
              + 'surrounding context — and if the context does not settle it, ASK. Do not guess.'
            : 'One expansion only. Use it exactly as given; do not paraphrase or re-derive it.',
        }
      }

      /* Not a catalogued acronym — try the graph, but say how sure we are. */
      const resolution = resolveWithConfidence(raw)
      if (resolution.confidence === 'exact' || resolution.confidence === 'strong') {
        return {
          term: raw,
          ambiguous: false,
          canonicalSpelling,
          expansions: [{
            meaning: knowledgeFor(resolution.id)?.label ?? resolution.id,
            entityId: resolution.id,
            entity: knowledgeFor(resolution.id) ?? undefined,
          }],
          instruction: 'Resolved from the knowledge graph rather than the acronym table. '
            + 'Confidence is ' + resolution.confidence + '.',
        }
      }

      return {
        term: raw,
        ambiguous: false,
        canonicalSpelling,
        expansions: [],
        didYouMean: resolution.alternatives,
        instruction:
          'NOT KNOWN. Do NOT invent an expansion — that is the specific failure this tool exists '
          + 'to prevent. Ask the user what they meant, or consult oracle_search. If they tell '
          + 'you, add it to ACRONYM_EXPANSIONS so the next agent does not have to ask.',
      }
    },
  },

  oracle_brief: {
    description:
      'CALL THIS WHEN ASKED TO BUILD A TOOL, CALCULATOR OR PAGE for a game mechanic. Returns a '
      + 'build brief: what the entity means, its units and VALID RANGE, the SDK exports that '
      + 'already implement it (call these — do not reimplement), the formulas involved, related '
      + 'entities you will also need, and every trap. This is the difference between a calculator '
      + 'that renders and one that is correct.',
    inputSchema: {
      type: 'object',
      properties: {
        mechanic: {
          type: 'string',
          description: 'What you are building for — "module levels", "eHP", "coins per kill".',
        },
      },
      required: ['mechanic'],
    },
    run: ({ mechanic }) => {
      const { knowledgeFor, relationsOf } = knowledge()
      const direct = knowledgeFor(mechanic)
      const rootId = direct ? mechanic : (missSuggestions(mechanic)?.[0]?.id ?? null)

      if (!rootId) {
        return {
          found: false,
          query: mechanic,
          guidance:
            'Not documented. Do NOT proceed on assumption — read the wiki via wiki_page, and check '
            + 'oracle_coverage for what is known. An undocumented mechanic is unverified, not simple.',
        }
      }

      /* Immediate neighbours travel with the root: a module-level tool needs the
       * rarity caps and the cost tables, and asking for one should not silently
       * omit the others. */
      const neighbourIds = [...new Set(
        relationsOf(rootId).flatMap(edge => [edge.from, edge.to]).filter(id => id !== rootId),
      )]

      const asBrief = node => ({
        id: node.id,
        label: node.label,
        summary: node.summary,
        /* Immediately after the summary on purpose: most errors are not "I did
         * not know about X" but "I thought X was Y". */
        disambiguation: node.disambiguation,
        units: node.units,
        validRange: node.validRange,
        implementedBy: node.implementedBy,
      })

      const root = knowledgeFor(rootId)
      /* Opinion never enters a build brief's factual sections. It is returned
       * separately, labelled, so it informs a decision without being computed
       * with. */
      const neighbourNodes = neighbourIds.map(knowledgeFor).filter(Boolean)
      const neighbours = neighbourNodes
        .filter(node => node.claimType !== 'sentiment')
        .map(asBrief)
      const opinions = neighbourNodes
        .filter(node => node.claimType === 'sentiment')
        .map(node => ({ id: node.id, label: node.label, summary: node.summary }))
      const split = partitionByClaim([rootId, ...neighbourIds])

      const callFirst = [
        ...(root.implementedBy ?? []),
        ...neighbours.flatMap(n => n.implementedBy ?? []),
      ]

      return {
        found: true,
        query: mechanic,
        resolvedTo: rootId,
        entity: asBrief(root),
        alsoNeeded: neighbours,
        relationships: relationsOf(rootId).map(e => `${e.from} --${e.kind}--> ${e.to}: ${e.note}`),
        callTheseNotYourOwn: [...new Set(callFirst)],
        traps: split.objective,
        communityOpinion: opinions.length ? opinions : undefined,
        opinionCaveats: split.sentiment.length ? split.sentiment : undefined,
        rules: [
          ...(split.sentiment.length
            ? ['communityOpinion and opinionCaveats are judgement, not mechanics. Do not encode '
              + 'them as constants, defaults or rankings in what you build.']
            : []),
          'Validate input against validRange before computing. A tool that accepts an impossible '
          + 'level is wrong before it does any arithmetic.',
          'Call the exports listed in callTheseNotYourOwn. A parallel implementation beside a '
          + 'correct one is the defect this repo produces most.',
          'Read values from the catalogs, never from a copy pasted into your tool.',
        ],
      }
    },
  },

  oracle_footguns: {
    description:
      'CALL BEFORE GENERATING ANY UPGRADE RECOMMENDATION for a real account. Returns the '
      + 'irreversible upgrades and the known footguns — choices that set an account back for '
      + 'months and cannot be undone. "Improves the metric" and "safe to recommend" are different '
      + 'claims: lowering Black Hole cooldown improves uptime AND permanently raises the cost of '
      + 'Golden Tower sync. Optionally filter to one mechanic.',
    inputSchema: {
      type: 'object',
      properties: {
        mechanic: {
          type: 'string',
          description: 'Optional entity id or name to filter to, e.g. "bot.cooldown".',
        },
      },
    },
    run: ({ mechanic }) => {
      const { IRREVERSIBLE_UPGRADES, REVERSIBLE_UPGRADES, GAME_KNOWLEDGE, trapsFor, allNodes }
        = knowledge()

      const shape = node => ({ id: node.id, label: node.label, summary: node.summary,
        traps: node.traps ?? [] })
      const permanence = allNodes(GAME_KNOWLEDGE)
        .filter(node => ['upgradePermanence', 'cooldownSync'].includes(node.id))
        .map(shape)
      const opinion = allNodes(GAME_KNOWLEDGE)
        .filter(node => node.claimType === 'sentiment')
        .map(shape)

      return {
        warning:
          'Reversibility differs between sources of the SAME stat — bot medal cooldown can be '
          + 'respecced, bot cooldown LABS cannot. A tool editing a permanent value needs a '
          + 'confirmation step; one editing a respeccable value does not.',
        irreversible: IRREVERSIBLE_UPGRADES,
        reversible: REVERSIBLE_UPGRADES,
        objectiveRules: permanence,
        communityOpinion: opinion,
        opinionWarning:
          'communityOpinion is Category:Guides sentiment — what players think is ADVISABLE. It is '
          + 'not a mechanic, it ages with patches, and it must never be hard-coded as a ranking, '
          + 'default or constant.',
        ...(mechanic ? { mechanic, trapsForMechanic: trapsFor(mechanic) } : {}),
      }
    },
  },

  oracle_coverage: {
    description:
      'What tower-oracle knows, what it does NOT, and how far each compartment can be trusted. '
      + 'Returns falsifiable maturity per compartment — % primary-sourced, stale claims, '
      + 'unresolved contradictions, trap density. Use it to calibrate confidence before relying '
      + 'on an answer. An undocumented mechanic is unverified, not safe.',
    inputSchema: {
      type: 'object',
      properties: {
        asOf: {
          type: 'string',
          description: 'ISO date to measure staleness against. Defaults to today.',
        },
      },
    },
    run: ({ asOf }) => {
      const { GAME_KNOWLEDGE, compartmentMaturity, findContradictions, describeMaturity, allNodes,
        allEdges } = knowledge()
      const when = asOf ?? new Date().toISOString().slice(0, 10)
      const maturity = compartmentMaturity(when)

      return {
        graphVersion: GAME_KNOWLEDGE.version,
        asOf: when,
        compartments: maturity.map(entry => ({
          ...entry,
          readable: describeMaturity(entry),
        })),
        contradictions: findContradictions(),
        totals: {
          compartments: GAME_KNOWLEDGE.compartments.length,
          nodes: allNodes(GAME_KNOWLEDGE).length,
          edges: allEdges(GAME_KNOWLEDGE).length,
          traps: allNodes(GAME_KNOWLEDGE)
            .reduce((sum, node) => sum + (node.traps ?? []).length, 0),
          assertions: allNodes(GAME_KNOWLEDGE)
            .reduce((sum, node) => sum + (node.assertions ?? []).length, 0),
        },
        howToRead: [
          'primarySourcedPct — how much is checked against the game itself rather than a wiki.',
          'trapDensity 0 means UNEXERCISED, not clean. Traps only get written after something '
          + 'goes wrong.',
          'assertionCount 0 means contradictions in that compartment cannot be detected at all.',
          'A compartment absent from this list is undocumented — read primary sources, do not '
          + 'assume it is simple.',
        ],
      }
    },
  },

  oracle_contradictions: {
    description:
      'Every (subject, predicate) asserted with more than one value, ranked by source authority '
      + '(in-game > game-files > save > code > user > sheet > wiki > external-repo). This is how '
      + 'the tier 22-24 coin bonus error would have been caught: the catalog said 75, the game '
      + 'says 72, and nothing reported it for months. Check before trusting a numeric claim.',
    inputSchema: { type: 'object', properties: {} },
    run: () => {
      const { findContradictions } = knowledge()
      const contradictions = findContradictions()
      return {
        count: contradictions.length,
        contradictions,
        note: contradictions.length === 0
          ? 'No structural contradictions. Note this only covers claims carrying machine-comparable '
            + 'assertions — see oracle_coverage for which compartments have none.'
          : 'Ranked by source authority. The highest-authority value is LIKELY correct, not '
            + 'certainly — a human decides, and the losing value is evidence about that source.',
      }
    },
  },
}

export const TOWER_ORACLE_INSTRUCTIONS = [
  'TOWER-ORACLE — game knowledge, not game data.',
  '',
  'PURPOSE: so that when you are asked to build a tool for a game mechanic, you already know',
  'what the mechanic IS — its units, its valid ranges, its identifiers, and which SDK exports',
  'already implement it. Correct tools, not just tools that render.',
  '',
  'MANDATORY: oracle_brief when building anything; oracle_traps before changing existing code.',
  '',
  '  oracle_expand   — expand an acronym from a CLOSED SET (never expand one from memory)',
  '  oracle_brief    — build brief for a tool (call when asked to build/calculate anything)',
  '  oracle_traps    — what goes wrong here (call before editing mechanic code)',
  '  oracle_footguns — irreversible upgrades vs community opinion, kept apart',
  '  oracle_contradictions — sources that disagree on the same value',
  '  oracle_get      — one entity: meaning, units, relations both ways, sources',
  '  oracle_search   — find the entity when you only know the player-facing name',
  '  oracle_map      — a whole system at once, for orientation',
  '  oracle_coverage — what is documented and what is NOT yet',
  '',
  'Every claim cites a source and a verification date. A missing entry means unverified,',
  'never safe-to-assume. When you verify something new, add it to packages/sdk/src/knowledge',
  'so the next agent gets it for free — that is the whole point.',
].join('\n')
