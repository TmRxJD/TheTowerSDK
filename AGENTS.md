# Working in this repo (for AI agents)

This file is the canonical instruction set. `CLAUDE.md` and
`.github/copilot-instructions.md` point here rather than duplicating it — edit this one.

## What this package is

`thetowersdk` gives you the game's data and a reader for a player's save file, so you can build
calculators and tools for The Tower. It is pure TypeScript: no framework, no I/O outside the save
decoder, no global state.

## The five entry points, and which to use

| Import | Use it for |
|---|---|
| `thetowersdk/data` | Game tables — costs, levels, effects, catalogs, reference tables |
| `thetowersdk/save` | Reading a player's `playerInfo.dat` into typed values |
| `thetowersdk/node` | Decoding the save file (needs Node; browsers see the recipe in the README) |
| `thetowersdk/formatting` | Numbers and durations formatted the way the game shows them |
| `thetowersdk/mechanics` | Formulas — enemy scaling, damage, drops, workshop stats |

Import from the subpath, not the root barrel, unless you genuinely want everything.

**`thetowersdk/internal/*` is not the public API.** It has no stability guarantee and will move.
If you find yourself reaching into it, that is a gap worth reporting rather than a path to depend on.

## Rules that will save you a bad afternoon

**Extractors return `null`, they do not throw.** A save written before a feature existed has no data
for it. Always check:

```ts
const labs = readLabsFromSaveRoot(parsedRoot)
if (!labs) return
```

**Read `warnings`.** Extractors report what they could not interpret rather than dropping it
silently. A populated `warnings` usually means the save shape changed.

**Save arrays are positional and over-allocated.** `relicsUnlocked[112]` is relic 112. Arrays are
often longer than the number of real entities, and unused slots are not always zero — the card level
array pads with `1`, not `0`. Use the unlock flag when one exists, not the level.

**A save can be older than the catalog.** If the catalog has 305 relics and the save array has 236,
the rest are *absent*, not locked. Do not present them as things the player is missing.

**Never mutate `parsedRoot`.** Callers run many extractors over the same object.

**Do not invent a name.** The game's names, and the community shorthand for them, are in the
glossary: `lookupGlossary('SR')`, `expandAcronym('ILM')`. Several acronyms are ambiguous, and a
confident wrong expansion is worse than none. If a term is not in the glossary, look it up in the
catalogs rather than guessing — the MCP server's `define_term` does both.

**Formulas under `mechanics/` are approximations.** They are fitted to observed behaviour and drift
at very high waves and tiers. Do not use them where an exact match to the game matters.

**`effective-paths-*` is a transcription, and the sheet is the authority.** Not these files'
comments, not the wiki, not the game dump — the spreadsheet. Every rule cites the cell it came from
(`eEcon!E6`, `eDamage Coins!EZ2`) and `effective-paths-cell-references.test.ts` enumerates those
citations and pins how many there are. When it fails because you added one, **read the cell before
updating the count**; that failure is the prompt, not paperwork.

Before deriving a number in this area, read
[`EFFECTIVE_PATHS_ORACLE.md`](../../docs/EFFECTIVE_PATHS_ORACLE.md) in the tracker repo. It lists the
ways the spreadsheet API misleads — chiefly that a spilled range reads as *empty* through both
`read_range` and `FORMULA` render while `COUNTA` sees a hundred rows of it. That has twice been
mistaken for a missing feature.

**A planner explains everything it leaves out.** `plan.excluded` carries a reason per candidate, and
`planPath`'s `onSkip` reports the three ways the loop passes one over. Keep it that way: a path that
stops after one step usually means every other candidate is at its cap, and without a reason that is
indistinguishable from a bug. The rule is **planned, or explained — never neither.**

**A path variant is refused, not guessed at.** `lab` is a damage *band* and `lab-time` is a
*variant*. Passing the band matched no band's variant list, skipped every candidate, and returned an
empty path that looked exactly like a finished account. All four planners now throw and name what
they publish. Do not soften that into a default.

## Conventions this package enforces

`pnpm lint:conventions` checks these; it runs in CI and will fail a PR.

- **File names** are kebab-case and say what the file is. Inside `data/` and `save/` the directory
  already gives the context, so the file is named for the thing: `save/labs.ts`, not
  `save/labs-from-save.ts`.
- **Everything public is exported from its barrel** (`src/<area>/index.ts`). A module that is not
  exported cannot be imported by anyone, which is almost never what you meant.
- **No default exports.** Named exports only, so tooling and re-exports stay predictable.
- **Extractors are `extract<Thing>FromSaveRoot(root)`** and return `T | null`.
- **Data tables are `SCREAMING_SNAKE_CASE` `readonly` arrays or records.** Same shape every time —
  no one-off exports that behave differently from their neighbours.
- **No imports from a barrel inside the same area.** Import the sibling module directly; importing
  your own `index.ts` creates a cycle.
- **The package never imports itself by name.** Inside `src/`, use relative paths — `thetowersdk/...`
  only resolves when a build happens to exist and breaks as soon as `clean` runs.

## Checking things without writing a script

There is an MCP server in [`mcp/`](mcp/README.md). Point your agent at it and you can list exports,
read a table, define a term, decode a save, run an extractor, and plan an Effective Path directly —
useful for confirming a value instead of assuming one.

```bash
pnpm build && pnpm mcp
```

`plan_effective_path` is the quickest way to see which candidates a path offers and why the rest are
out, without writing a scratch script. It plans from a zero config, so read it for structure rather
than for numbers.

## Before you open a PR

```bash
pnpm install
pnpm verify      # lint + conventions + types + build + tests
```

Individually: `pnpm lint`, `pnpm lint:conventions`, `pnpm type-check`, `pnpm test`,
`pnpm test:schema`, `pnpm build`.

## Adding things

**A new extractor** — put it in `src/save/`, export it from `src/save/index.ts`, return `null` when
the data is absent, and add a test. Index-mapping bugs are silent: they misreport a player's data
rather than failing, so a test with a real shape is worth more than it looks.

**A new data table** — put it in `src/data/`, export it from `src/data/index.ts`, and declare its
schema in `src/data/schemas.ts` so `pnpm test:schema` validates it. If it introduces names, rerun
`node scripts/generate-glossary.mjs` so the glossary covers them.

**A new formula** — put it in `src/mechanics/`, export it from `src/mechanics/index.ts`, and say in
the doc comment whether it is exact or fitted.

**A test for any of it** — three rules, each of which has already caught a real fault here and each
of which was learned by shipping the opposite:

1. *Do not restate the implementation.* A test that computed `cost / (rate * 23)` and compared it
   against `cost / (rate * 23)` stayed green when the constant became `24`. Call the export.
2. *Pin several states, not one.* A constant agrees with a formula at exactly one input — four
   frozen rates here each matched at a different single point and were wrong everywhere else.
3. *Prove it by breaking what it guards.* Change the value the test exists to pin and watch it fail
   by name. If it does not, it is testing itself.

## What not to do

- Do not add a runtime dependency without a strong reason. There is exactly one (`zod`), and that
  keeps the package usable everywhere.
- Do not put site-specific concerns here — persistence, UI, cloud sync, analytics. This package
  models the game, not any one application.
- Do not describe where the data came from. Document what a value *is* and what breaks if it
  changes, not its provenance.
