# Working in this repo (for AI agents)

This file is the canonical instruction set. `CLAUDE.md` and
`.github/copilot-instructions.md` point here rather than duplicating it — edit this one.

## What this package is

`thetowersdk` gives you the game's data and a reader for a player's save file, so you can build
calculators and tools for The Tower. It is pure TypeScript: no framework, no I/O outside the save
decoder, no global state.

## Read the wiki before you explain a mechanic. Every time.

**This package models the game. It does not explain it.** A table tells you a number changes; it
does not tell you what the number means, when it applies, or what it interacts with. Every wrong
answer this codebase has shipped came from reading a table and inferring the rest.

So before you describe how anything in the game works — in code, in a comment, in a commit message,
in an answer to a person — **look it up**:

```
wiki_search { query: "wave skip" }     → the real page titles
wiki_page   { title: "Wave Skip" }     → the page, as Markdown
wiki_page   { title: "Cards", section: "Card Slots" }
```

Those are MCP tools on this package's own server (`mcp/server.mjs`), so the lookup is one call, it
is cached on disk, and it costs you almost nothing. In code, the same thing is
`fetchFandomPageAsMarkdown` from `thetowersdk/wiki`.

**If the MCP server is not available to you, use the open web** —
`the-tower-idle-tower-defense.fandom.com`. Searching the internet is slower than the tool and
completely fine. What is not fine is skipping the step and writing down a guess.

You are looking for the thing you did not know to ask about. Real examples from this repo:

- Spotlight Missiles takes its damage from **Smart Missiles**. Nothing in the data says so.
- `UW+` requires **all nine** weapons — a threshold no table encodes.
- The community sheet's Spotlight Missiles fallback is `10`; the wiki says `14`. The wiki was right.
- Eight relic values were rendered as percentages when they are **metres and seconds**. The unit
  lives in the game's own description string, not in the number.

**Working offline.** Point `TOWER_WIKI_DIR` at a directory of `slug.md` pages and both tools read it
before the network, so a disconnected agent still has the knowledge. Every answer reports
`source: "local" | "cache" | "fandom"`, because a local page can be stale in a way a fresh fetch
cannot and quoting a stale one unknowingly is the failure to avoid.

### Why the pages are not in this package, and how they could ship

The wiki declares **CC-BY-SA** (confirmed from its own API: `action=query&meta=siteinfo&siprop=rightsinfo`).
This package is MIT. Bundling the text would put two incompatible licences in one install and would
mean shipping MIT-licensed files that are not, in fact, MIT.

That is a packaging constraint, not a prohibition. CC-BY-SA permits redistribution and adaptation —
wikitext converted to Markdown *is* an adaptation — provided the result carries the same licence,
credits the source, and says it was changed. So the content can ship as a **separate package** of
its own: `license: "CC-BY-SA-3.0"`, a NOTICE crediting the wiki and its contributors, and a line
recording that the pages were converted from wikitext. Install it, point `TOWER_WIKI_DIR` at it, and
the wiki is offline and instant. The seam already exists and is tested; only the package does not,
because publishing under someone else's licence is a decision for a person, not an agent.

`scripts/fetch-fandom-wiki-markdown.mjs` in the tracker repo already produces exactly that directory.

## The entry points, and which to use

| Import | Use it for |
|---|---|
| `thetowersdk/data` | Game tables — costs, levels, effects, catalogs, reference tables |
| `thetowersdk/save` | Reading a player's `playerInfo.dat` into typed values |
| `thetowersdk/node` | Decoding the save file (needs Node; browsers see the recipe in the README) |
| `thetowersdk/formatting` | Numbers and durations formatted the way the game shows them |
| `thetowersdk/mechanics` | Formulas — enemy scaling, damage, drops, workshop stats |
| `thetowersdk/wiki` | Fandom wikitext → Markdown, and fetching a page |

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

`wiki_search` and `wiki_page` are the ones to reach for **first** when the question is "how does X
work" rather than "what value does X have". See the top of this file.

## Traps that have already cost someone a day

Every one of these produced a confident wrong answer here. They are listed because none of them
looks like a mistake while you are making it.

**Do not read a source by counting its rows.** The module cost column was checked by counting rows
in a range read, which "showed" the tail was shifted by eight levels. It was not; the count was.
Using the source's own lookup — `INDEX(Data_Val_Tables!EV4:EV, level)` — answered it in one call and
disagreed with the counting. Prefer the accessor a source defines over an offset you worked out.

**Suspect the fixture before the source.** A too-fake fixture has accused working code here far more
often than a real bug has been found: invented module ids, an inverted nested record, a fake port
returning `undefined` where the real one returns counts. When a test fails, ask whether the fixture
is a faithful sample *before* you edit the thing it is testing.

**A test that restates the implementation tests nothing.** One compared `cost / (rate * 23)` against
`cost / (rate * 23)` and stayed green when the constant changed to `24`. Call the real export and
assert against a figure read from the source.

**Prove a guard by planting the fault it catches.** If you cannot make it fail, you have not shown it
works. Several "fixes" here passed only because a string replace silently did not match — always
confirm the file actually changed before trusting the red-then-green.

**Your assumption about a bound is not the source's.** A level schema was written `.min(0)` on the
reasoning that a negative level is impossible. The community sheet carries a negative one, so the
schema rejected the very authority being reproduced — and rejected it by returning an *empty
result*, which reads as "nothing to do" rather than "I refused".

**Screen-scraped numbers are a bad lens.** Working backwards from what a UI displayed produced an
arithmetic "discrepancy" that did not exist. Reproduce the calculation from its inputs instead.

**Check the artefact before diagnosing the code.** A page that renders nothing is more often a stale
bundle, a dev-server module cache, or the wrong host than a bug. Hard-load it, and check
`last-modified` on `index.html`, before reading a line of source.

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
