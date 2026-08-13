# MCP server

Lets an AI agent explore this SDK and try it against a real save without writing a scratch script
first. Useful when you're building a tool with an agent and want it to check a value rather than
guess at one.

## Run it

```bash
pnpm build          # the server reads dist/
pnpm mcp
```

It speaks MCP over stdio, so register it as a stdio server:

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
| `list_exports` | What an entry point exports, filterable. Start here rather than guessing a name. |
| `get_export` | One export, previewed — length plus a sample, so a 300-row table doesn't flood the context. |
| `define_term` | What a game term, acronym or set of module initials means, and whether it is ambiguous. |
| `describe_schema` | The declared shape of a data table, rather than one inferred from a sample row. |
| `decode_save` | Decode a `playerInfo.dat` and summarise what's in it. |
| `run_extractor` | Run one `extract*FromSaveRoot` against a save, with its warnings. |
| `plan_effective_path` | Plan an Effective Paths route, with the candidates it left out and why. |

Everything is read-only. `decode_save` and `run_extractor` read the file you name and nothing else.

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

eHP and eRegen are not offered here. Both need a fully populated config that the package publishes no
zero for, and a hand-written one would drift from the model without anything saying so.
