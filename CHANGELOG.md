# Changelog

## 0.8.0

**Two new entry points.**

- **`thetowersdk/save-decoder`** — the save reader with no Node imports, for decoding
  `playerInfo.dat` in a browser tab. Gunzip comes from `DecompressionStream`; the NRBF reader is
  the same one `thetowersdk/node` uses. A save never has to leave the machine it is on.
- **`thetowersdk/contributions`** — the roster of whose work this package carries, as data, so a
  tool can render the credit it is actually using.

**Calculator labels are the game's.** Every builder field is now named the way the Run Tracker and
the community name it: `Enable Chrono Field (CF)`, `CF Reduction (%)`, `Defense Absolute Value`,
`Current Level`. The workshop picker offered `WSP_SUPER_CRIT_MULTI` and now offers `Super Crit
Mult`, read from the enhancement definitions the package already carries.

**Thorns is the calculator players use.** It asked for an enemy factor, a thorn multiplier and a
module benefit — parameters of a formula, none of which a player can read anywhere — and returned
damage per hit. It now takes base thorns, tier, plasma cannon and its mastery, the BC reduction
labs and Sharp Fortitude, and answers in hits to kill. `thornDamageOnHit` is unchanged in
`thetowersdk/mechanics` for a caller who has the formula's own inputs.

**The MCP scratchpad works outside this repository.** `sdk_sandbox_run` shelled out to a script in
the development monorepo, so for anyone who installed the package it was advertised and failed to
spawn. It is now built from what the package ships — `list`, `export`, `calc`, `format`, `decode` —
and the tools that genuinely need the monorepo are no longer advertised where they cannot run.

## 0.6.0

**Removed: `thetowersdk/inputs`.** It held the account-state shapes the Run Tracker's own pages
persist — hub merge helpers, storage compaction, per-page local-state schemas. That is one
website's plumbing, not a description of The Tower, and it does not belong in a package about the
game.

Nothing is lost. Every calculator already describes the inputs it takes:

```ts
import { CALCULATOR_BUILDERS } from 'thetowersdk/builders'

const calc = CALCULATOR_BUILDERS.find((entry) => entry.id === 'assist.stones')

calc.fields     // [{ key: 'currentLevel', label: 'Current level', kind: 'number', min: 0, max: 69 }, …]
calc.defaults   // { currentLevel: 0, targetLevel: 10 }
calc.normalize  // whatever you have stored -> a complete, valid input record
calc.compute    // the result
```

That is the same guarantee — pass what you have, get back a complete record with defaults filled
in — for all fifteen calculators, described per calculator rather than as one shared blob.

Twelve entry points now. Everything else is unchanged.

## 0.5.4

Nine new entry points. Nothing was removed or renamed, so this is additive for anything already
on 0.5.2.

> **Skip 0.5.3.** It reached npm before any of this landed, carrying the 0.5.2 export set, and a
> published version cannot be replaced. Everything below ships as 0.5.4.

Enough to build a tool end to end without writing any of the plumbing:

- **`thetowersdk/builders`** — the calculators as data. Each one declares its
  fields, their units and their caps, so a UI, a bot command or a test can be
  generated from the same declaration rather than hand-written three times.
- **`thetowersdk/bot`** — `createTowerBot()` and `calculatorCommands()`, which
  turn every builder into a slash command. Transport-agnostic: it produces
  commands and replies, and never touches a Discord client.
- **`thetowersdk/sheets`** — a Google Sheets reader that knows the two ways a
  sheet lies to you. A spilled cell carries no formula, and the API truncates
  trailing empties, so a short row means "unknown", not "zero".
- **`thetowersdk/inputs`** — the shared input vocabulary the builders parse,
  including a decimal separator that follows the reader's locale.
- **`thetowersdk/assets`** — which image file is a given module or card. A
  module's file is named after its INITIALS and rarity (`Om Chip` at Epic is
  `epic_oc.png`), which is not guessable from its name. Every function returns
  `null` for something with no art, so a caller can tell that apart from a
  wrong path. The artwork itself is NOT in this package: it belongs to
  TechTree Games and ships separately.

Conventions that now hold across every calculator, because each was a real bug
first: a level past the end of a cost table is refused rather than priced at
zero, caps come from each curve rather than a shared constant, and any lookup
keyed by a name from a save, a sheet or a URL uses own-key access — `??` cannot
reject an inherited function.

And the game data that used to live in the consuming application.

- **`thetowersdk/charts`** — the shared chart registry, its data, and the links
  from each chart to the mechanics it documents. A chart is a view over game
  data, so its definition is game data.
- **`thetowersdk/knowledge`** — the Tower Oracle graph: mechanics, how they
  relate, and the specific ways each has been misread.

Moved into `thetowersdk/data` from `@tmrxjd/platform`, which now re-exports them
so existing consumers keep working:

- Relic unlock methods and the published bonus-total categories.
- Theme category definitions, the passive coin-bonus coefficients, and the full
  theme catalog. The formula string and the 169 per-item bonus literals are gone
  — both are derived from one rate per category now.
- Vault tree summaries, derived from the node lists rather than transcribed.
- Daily mission tier and weekly reward tables, with weekly totals derived from
  the rows they sum.
- The module pull simulator: pity counters, rarity rates, pool sizes, RNG walk.

`@tmrxjd/platform` depends on this version for `thetowersdk/charts` and
`thetowersdk/knowledge`; neither existed in 0.5.2.

## 0.5.2

Keep `node:fs` modules (repo-root, planner codegen, debug-graph session/trace, coverage
citations, graph tooling, builders) off the public `thetowersdk/mechanics` barrel so
browser bundlers do not crash when importing wave/EP formulas.

## 0.5.1

Stop shipping the monorepo docs-gen/doctor/kernel chain through `builders` so the
published package no longer requires `@tmrxjd/governance-engine` at install time.

## 0.5.0

Labs catalog refresh, card gem costs, Effective Paths economy stone mastery / UW cooldown helpers,
and the public graph surfaces (`ep-graph`, `sdk-graph`, `save-graph`, `debug-graph`, coverage,
planner-engine, mcp-contract).

Doctor / kernel / governance-adapter / registry / sandbox / docs-gen / lsp stay in the monorepo
source tree for AGS tooling but are **not** part of the published `thetowersdk/mechanics` barrel —
they need `@tmrxjd/governance-engine`, which is not a public npm dependency of this package.

## 0.4.1

`sharedToolsCatalog` gains an Effective Paths entry, so a consumer building links or a menu from the
catalog gets the tool rather than a gap.

README: a worked example of planning for a real player — what a config is versus levels, how to fill
a zero record from the candidate lists, and the fact that mapping a save onto them is the caller's
job rather than something this package does. The MCP section now lists the tools and says which two
change how an agent works: `plan_effective_path` and `wiki_page`.

## 0.4.0

### New entry point: `thetowersdk/wiki`

Converts the community wiki's Fandom wikitext to Markdown, and fetches a page:

```ts
import { fetchFandomPageAsMarkdown } from 'thetowersdk/wiki'

const markdown = await fetchFandomPageAsMarkdown('Cards')
```

Wiki text is CC-BY-SA and this package is MIT, so pages are fetched rather than bundled.

The MCP server gains `wiki_search` and `wiki_page`, so an agent can confirm how a mechanic behaves
instead of inferring it from a table. Set `TOWER_WIKI_DIR` to a directory of `slug.md` pages to serve
them offline; every response reports whether it came from `local`, `cache` or `fandom`.

### Every plan family validates its levels

`planEffectiveHealthPath`, `planEffectiveEconomyPath` and `planEffectiveRegenPath` now carry
`issues` alongside `steps` and `excluded`, as `planEffectiveDamagePath` already did. Each checks its
levels before planning and returns an empty path with a populated `issues` rather than computing
against a record it cannot use.

**This is additive for callers reading a plan, and a new field for anyone constructing one.** If you
destructure a plan result, `issues` is `EffectiveLevelsIssue[]` — `{ path, message }`.

Levels are held to completeness and finiteness, not magnitude. Negative and fractional levels are
accepted deliberately: the source sheet carries a negative stone level of its own.

### The planner refuses a baseline it cannot compute

`planPath` checked each candidate's value for finiteness but not the value it ranked them against.
With a non-finite baseline every ROI was `NaN`, `NaN > NaN` is false, and the first candidate
examined won every step — a path in declaration order presented as a recommendation. Those
candidates are now skipped as `unevaluable` and reported.

### Renames

- `mechanics/coverage.ts` → `mechanics/formula-coverage.ts`. Same exports, unchanged. The deploy
  build of a consuming app rejects any file named `coverage.ts` as a test artefact.
- `EffectiveRegenLevels` and `ZERO_EFFECTIVE_REGEN_LEVELS` now live in
  `mechanics/effective-paths-regen-levels.ts`, matching where the damage and economy models keep
  theirs. Both are still re-exported from the planner, so no import needs to change.

## 0.3.1

58 label builders became formatters: `buildWorkshopStatFieldLabel` is now
`formatWorkshopStatFieldLabel`, and so on for every `build*Label` that takes one
argument and returns a string. Turning one value into words for a human to read
is formatting, not assembly.

Scoped deliberately. 64 exported `build*` take one argument and return a string,
but six of them build keys -- `buildTrackerRunFingerprint`,
`buildBattleRunDeduplicationKey` -- and a key is assembled, not formatted. Those
kept `build`.

## 0.3.0

Breaking. Every lab table moved, and 562 exported functions were renamed. If you
are on 0.2.0 the compiler will point at each one; the rules below say what to
rename them to.

### The lab catalog is one thing now

`generatedLabs` and `labs` are gone. `LAB_CATALOG` replaces both.

```ts
// before
import { generatedLabs, labs } from 'thetowersdk/data'
// after
import { LAB_CATALOG } from 'thetowersdk/data'
```

They were two files split by category with no overlap — 150 labs in one, 75 in
the other — and, worse, two units. `labs` stored cost pre-scaled with a
`currency` of B/T/q/Q, so `cost: 1.1` meant 1.1 quadrillion, while
`generatedLabs` stored coins. Nothing in the shape said which you had.

**`cost` is now absolute coins everywhere, and `currency` no longer exists.** A
lab that costs 1.1 quadrillion reads `1.1e15`, so two labs can be added together
without checking where either came from. If you were multiplying by a currency
factor, delete that. If you were formatting with the suffix, `formatCompact`
already renders `1.1q` on its own.

`value` moved from the level to the lab. It was identical on every level and
only the first was ever read. `unit` moved with it.

Six labs gained cost data they never had (the three enemy Health labs and Wave
Skip Mastery among them), and `super_tower_bonus` had 25 corrupt levels
corrected against the community Effective Paths tables.

### Verbs

One verb per idea. The retired ones and what they became:

| Was | Now | Why |
|---|---|---|
| `resolve*` | `get*`, `find*`, `compute*` | meant three different things |
| `derive*`, `extract*` | `read*`, `compute*` | reading a save vs calculating |
| `calculate*` | `compute*` | same thing, two words |
| `create*` | `build*` | same thing, two words |

`find*` returns `T \| null \| undefined`; `get*` always returns a value; `read*`
pulls structure out of a save or file; `compute*` calculates. The split was made
from return types read out of the compiler, not from guessing at names — 124 of
the 265 `resolve*` functions turned out to be doing arithmetic.

34 names also lost a redundant `From<Source>` tail, but only where no sibling
function differed by source: `readDissonanceCalculatorStateFromSaveRoot` is now
`readDissonanceCalculatorState`, while `readLabsFromSave` keeps its tail because
`readLabsFromReport` exists beside it.

The rules are in [`docs/NAMING.md`](docs/NAMING.md).

### Glossary

The 297 hand-curated community acronyms — what players actually type, `dmg+`,
`zerk`, `aspd+` — are merged in. The glossary goes from 233 entries to 500 and
covers all 297, asserted by a test.

Entries now carry `source`. `catalog` means the expansion names something in the
shipped data and is held to it; `community` means real player shorthand the
catalogs have no row for. An expansion that resolves to nothing and is not
marked `community` fails the build, so nothing can quietly become a claim about
the game.

`GC` now returns two entries — Galaxy Compressor from the module table and glass
cannon from the community — flagged ambiguous rather than the SDK picking one.

### Also

- `computeModuleStat` (was `calculateModuleStat`) is unchanged in behaviour;
  module stats were checked against the Effective Paths tables and all 60
  level-1 values agree.
- A guardian cooldown max level and a Death Wave stone cost were corrected.

## 0.2.0

Lab catalog consolidation, first cut. Superseded by 0.3.0 — prefer that.

## 0.1.1

Initial public release.
