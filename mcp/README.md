# MCP server

Lets an AI agent explore this SDK and try it against a real save without writing a scratch script
first. Useful when you're building a tool with an agent and want it to check a value rather than
guess at one.

## Run it

```bash
pnpm build          # the server reads dist/
pnpm mcp
```

It speaks MCP over stdio, so register it as a stdio server.

**Tracker monorepo:** use the slim pair — `tools/tower-mcp/mechanics-server.mjs` (`tower`) for
mechanics and `tools/tower-mcp/gov-server.mjs` (`tower-gov`) for commits/governance. Do **not**
register this package server and the monorepo servers together (duplicate tools / catalog overflow).
The full CI harness is `tools/tower-mcp/server.mjs` (not for IDE CallMcpTool).

Standalone package consumers:

```json
{
  "mcpServers": {
    "thetowersdk": {
      "command": "node",
      "args": ["./node_modules/thetowersdk/mcp/server.mjs"]
    }
  }
}
```

Claude Code: `claude mcp add thetowersdk -- node ./node_modules/thetowersdk/mcp/server.mjs`

## Tools

| Tool | What it does |
|---|---|
| **`sdk_graph_get` / `sdk_graph_context`** | **Mount the mechanics graph** (full or compact context pack) before editing |
| **`sdk_graph_mutate` / `validate`** | Atomic core-module graph mutations + health checks |
| **`begin_mechanic_task`** | **Mandatory gate** before mechanic work — compliance token, map hits, wiki titles to fetch |
| **`record_mechanic_note`** | Append verified relationships to `docs/mechanics-map/MAP.md` |
| **`record_work_status`** | Append ledger entry (`awaiting_user` until human approval — never `done`) |
| `compliance_contract` · `mcp_contract` | Compliance instructions + MCP taxonomy |
| `list_exports` | What an entry point exports, filterable. Start here rather than guessing a name. |
| `get_export` | One export, previewed — length plus a sample, so a 300-row table doesn't flood the context. |
| `define_term` | What a game term, acronym or set of module initials means, and whether it is ambiguous. |
| `describe_schema` | The declared shape of a data table, rather than one inferred from a sample row. |
| `decode_save` | Decode a `playerInfo.dat` and summarise what's in it. |
| `run_extractor` | Run one `extract*FromSaveRoot` against a save, with its warnings. |
| `plan_effective_path` | Plan an Effective Paths route, with the candidates it left out and why. |
| `wiki_search` | Find the community wiki's real page titles for a mechanic. |
| `wiki_page` | Read a wiki page as Markdown, whole or one section. |
| `trust_coverage_report` · `trust_drift_check` | TrustReport / drift (when wired on the surface you use) |
| `ep_graph_*` · sheet tools | On monorepo `tower` / full harness — Effective Paths oracle |

Monorepo slim `tower` tool list: [`tools/tower-mcp/slim-catalog.mjs`](../../../tools/tower-mcp/slim-catalog.mjs).  
Governance (`commit_*`, `schema_*`, `pointer_*`, …): [`packages/governance-engine/README.md`](../../governance-engine/README.md).

`initialize` returns `instructions` with the compliance pipeline so clients inject it into context.

`decode_save` and `run_extractor` are read-only on the save file. Map/ledger tools **append** to
`docs/mechanics-map/` (override with `TOWER_MECHANICS_MAP_DIR`).

## Compliance pipeline

Full contract in the monorepo: `docs/AGENT_GAME_MECHANICS_CONTRACT.md`.

```
begin_mechanic_task → wiki_page (all related) → [oracle if EP] → record_mechanic_note
→ implement → record_work_status(awaiting_user) → human tests → user_approved
```

## Reading the wiki

The SDK supplies data and formulas, not documentation of game behaviour. Confirm how a mechanic
works against the wiki before describing it.

```
wiki_search { query: "wave skip" }               page titles matching a topic
wiki_page   { title: "Cards" }                   sections, plus the page
wiki_page   { title: "Cards", section: "Costs" } one section
```

Pages are cached in the OS temp directory after the first read. An unknown title returns an error
object naming `wiki_search` rather than throwing.

### Working offline

Set `TOWER_WIKI_DIR` to a directory of `slug.md` files and both tools read it **before** the
network — so an agent with no connection still has the game knowledge:

```bash
TOWER_WIKI_DIR=/path/to/wiki-pages pnpm mcp
```

Every response reports `source: "local" | "cache" | "fandom"`, so a local page that may be stale is
distinguishable from a fresh fetch.

This is the integration point for a separate content package. Wiki text is **CC-BY-SA** and this
package is MIT, so pages are fetched rather than bundled; content distributed under its own licence
can be installed alongside and pointed at with `TOWER_WIKI_DIR`. Attribute the wiki if you reproduce
its text.

## Notes

`run_extractor` returning `null` is not a failure — it means the save has no data for that feature,
which is what happens with a save written before the feature existed. The response says so.

`define_term` says `found: false` rather than offering a near-miss. Several acronyms mean more than
one thing — `SR` is both Shrink Ray and Solar Reflector — so pass `domain` when you need one answer.

Results are previewed rather than returned whole. Some tables here have thousands of rows, and
pulling one into context wholesale is rarely what you wanted.

`plan_effective_path` plans from a **zero config**, so its numbers are shaped rather than real. It is
for reading which candidates a variant offers and why the others are out — not for advice. Two things
it is good at:

- **Why a path is short.** Every planner reports the candidates it passed over with a reason, so
  "one step and then nothing" resolves to *everything else is already at its cap* rather than to a
  guess. A candidate is planned, or it is explained; never neither.
- **Which variants exist.** Pass a wrong one and the planner refuses by name and lists what it does
  publish. `lab` is a damage *band* and `lab-time` is a *variant*, one character apart, and passing
  the band used to plan nothing at all in silence.

All four families are here — `damage`, `economy`, `health`, `regen` — since `zeroEffectiveHealthConfig`
gave the last two a complete config to start from. An unknown family is answered with the list of
real ones rather than a failure.
