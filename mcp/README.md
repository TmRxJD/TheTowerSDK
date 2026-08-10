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

Everything is read-only. `decode_save` and `run_extractor` read the file you name and nothing else.

## Notes

`run_extractor` returning `null` is not a failure — it means the save has no data for that feature,
which is what happens with a save written before the feature existed. The response says so.

`define_term` says `found: false` rather than offering a near-miss. Several acronyms mean more than
one thing — `SR` is both Shrink Ray and Solar Reflector — so pass `domain` when you need one answer.

Results are previewed rather than returned whole. Some tables here have thousands of rows, and
pulling one into context wholesale is rarely what you wanted.
