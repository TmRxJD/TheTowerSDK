# Changelog

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
