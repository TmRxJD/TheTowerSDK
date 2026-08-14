# TheTowerSDK

Game data and save-file reading for **The Tower**, so you can build your own calculators, planners
and tools.

```bash
npm install thetowersdk
```

- **Game data** — labs, workshop, modules, cards, perks, relics, guardians, bots, ultimate weapons
  and the vault, with their cost curves and effect values, as typed arrays.
- **Save reading** — turn a player's `playerInfo.dat` into typed values: what they've researched,
  what they own, what's equipped, their run history.
- **Formulas** — enemy scaling, damage, ultimates, drops, workshop stats: the calculation layer
  behind the Run Tracker's own calculators.

TypeScript, one runtime dependency (`zod`), MIT licensed.

---

## Quick start

### Use the game data

```ts
import { LAB_CATALOG } from 'thetowersdk/data'

const costToMax = (lab) => lab.levels.reduce((sum, level) => sum + level.cost, 0)

const priciest = LAB_CATALOG
  .map((lab) => ({ name: lab.name, total: costToMax(lab) }))
  .sort((a, b) => b.total - a.total)[0]
```

Every `cost` is a plain number of coins. There is no scaling factor to apply and no currency field
to read first — a lab that costs 1.1 quadrillion is `1.1e15`, so you can add two labs together
without checking where either came from.

### Read a save file

```ts
import { readFile } from 'node:fs/promises'
import { decodePlayerInfoSaveBytes } from 'thetowersdk/node'
import { readLabsFromSaveRoot } from 'thetowersdk/save'

const { parsedRoot } = decodePlayerInfoSaveBytes(await readFile('playerInfo.dat'))

const labs = readLabsFromSaveRoot(parsedRoot)
console.log(`${labs.researchedCount} researched, ${labs.maxedCount} maxed`)
```

Decode once, then extract whatever you need.

---

## How it fits together

```
playerInfo.dat ──decodePlayerInfoSaveBytes()──► save root (plain object)
                                                     │
                     ┌───────────────────────────────┼──────────────────────────────┐
                     ▼                               ▼                              ▼
           readLabsFromSaveRoot()   readModulesFromSaveRoot()   discoverSaveImportTrackers()
                     │                               │                              │
                     ▼                               ▼                              ▼
               typed lab data                 typed module data          "what's in this save?"
```

The **save root** is a plain JavaScript object. Extractors read from it and never modify it, so you
can run as many as you like over the same root.

---

## Entry points

| Import | Contains | Browser-safe |
|---|---|---|
| `thetowersdk/data` | Game tables — costs, levels, effects, catalogs | Yes |
| `thetowersdk/save` | `extract*FromSaveRoot()` and save inspection | Yes |
| `thetowersdk/node` | The save decoder | Node — [see below](#decoding-in-a-browser) |
| `thetowersdk/formatting` | Number and duration formatting matching the game | Yes |
| `thetowersdk/mechanics` | Game formulas — see [below](#formulas) | Yes |
| `thetowersdk/wiki` | Fandom wikitext → Markdown — see [below](#reading-the-community-wiki) | Yes |

`import { … } from 'thetowersdk'` re-exports `data`, `save` and `formatting` together. Prefer the
subpaths in real projects so your bundler can drop what you don't use.

```ts
import { computeWaveBaseHealth, abilityDamage } from 'thetowersdk/mechanics'
import { formatDuration } from 'thetowersdk/formatting'
```

---

## Reading a save

| Function | Returns |
|---|---|
| `readLabsFromSaveRoot` | Research levels, what's maxed, the active queue |
| `readWorkshopFromSaveRoot` | Upgrade levels, enhancements, saved presets |
| `readModulesFromSaveRoot` | Owned modules, rarities, substats, equipped |
| `readCardsFromSaveRoot` | Card levels, copies, mastery, equipped slots |
| `readGuardiansFromSaveRoot` | Guardian levels and upgrades |
| `readBotsFromSaveRoot` | Bot levels, plus/sync unlocks, medals spent |
| `readUltimateWeaponsFromSaveRoot` | UW levels, unlocks, plus-levels, stones |
| `readVaultFromSaveRoot` | Vault power tree progress |
| `readRelicsFromSaveRoot` | Owned relics |
| `readCollectedThemeNamesFromSaveRoot` | Unlocked themes |
| `readLifetimeFromSaveRoot` | Lifetime totals |
| `readDissonanceFromSaveRoot` | Dissonance echo progress |
| `listImportableBattleRuns` | Run history |

Plus perks, "killed by" and per-run battle report fields — see [`src/save/index.ts`](src/save/index.ts).

### Check before you read

Extractors return `null` when a save has no data for that feature, rather than throwing, so older
saves degrade instead of failing:

```ts
const labs = readLabsFromSaveRoot(parsedRoot)
if (!labs) return

if (labs.warnings.length) {
  // Values the extractor could not interpret. Usually means the save shape changed.
  console.warn(labs.warnings)
}
```

### What's in this save?

```ts
import { discoverSaveImportTrackers } from 'thetowersdk/save'

for (const found of discoverSaveImportTrackers(parsedRoot).trackers) {
  console.log(`${found.label}: ${found.count} — ${found.summary}`)
}
// Labs: 166 — 166 labs found in save
// Modules: 25 — 25 modules found in save
```

Useful for showing someone what you found before doing anything with it.

### Run history and battle reports

Every completed run the game kept is available, with all of its stored fields:

```ts
import { listImportableBattleRuns, buildBattleReportStatFields } from 'thetowersdk/save'

const runs = listImportableBattleRuns(parsedRoot)

// The raw entry — tier, wave, duration, coins, cells, damage dealt and taken,
// per-source damage breakdowns, what killed you, and everything else the game
// recorded for that run.
console.log(Object.keys(runs[0]))

// Or the same run flattened into named stat fields.
const stats = buildBattleReportStatFields(runs[0])
```

`listImportableBattleRuns` hands back the decoded entries themselves, not a filtered view, so you
are not limited to the fields this SDK happens to name. There are also helpers for duration
formatting, date parsing and deduplication — see [`src/save/index.ts`](src/save/index.ts).

### Fields the SDK doesn't model

Nothing in the save is hidden behind this SDK. `parsedRoot` is the decoded file as a plain object,
so any field the game stores is reachable whether or not there is a named extractor for it — the
extractors are a convenience over that object, not a gate in front of it.

Values are loosely typed and arrays arrive in several shapes, so use the readers rather than
hand-parsing:

```ts
import { coerceSaveNumber, readSaveBoolean, readSaveIntList } from 'thetowersdk/save'

coerceSaveNumber(parsedRoot.someKey) // number | null
readSaveBoolean(parsedRoot.someFlag) // boolean
readSaveIntList(parsedRoot.someList) // number[]
```

Worked out a field that isn't covered? A PR adding an extractor is very welcome.

---

## Reading the community wiki

The Tower's wiki is on Fandom, which serves **wikitext** rather than anything you can render:
templates, infoboxes, `[[File:…]]` links and vertical wikitables. This converts it to Markdown.

```ts
import { fetchFandomPageAsMarkdown } from 'thetowersdk/wiki'

const markdown = await fetchFandomPageAsMarkdown('Cards')
```

Or the halves separately, if you fetch pages your own way — from a cache, a mirror, or a build step:

```ts
import { convertFandomWikitextToMarkdown, resolveFandomFileImages } from 'thetowersdk/wiki'

const markdown = convertFandomWikitextToMarkdown(wikitext, { pageTitle: 'Cards' })
```

A page that does not exist comes back `200 OK` with a `missing` marker rather than a 404, so
`fetchFandomWikitext` throws on it — a mistyped title should not read as an empty page.

**The conversion ships here; the wiki's content does not.** Fandom text is CC-BY-SA and this package
is MIT, so bundling the pages would put two incompatible licences in one install. Fetch what you
need and honour the wiki's licence in whatever you ship. It is a volunteer-run wiki: cache what you
fetch, and space out your requests when pulling many pages.

## Getting a save file

`playerInfo.dat` is The Tower's save file.

- **Android** — `Android/data/com.TechTreeGames.TheTower/files/playerInfo.dat`
- **Android emulator** (BlueStacks, LDPlayer, WSA…) — the same path inside the emulated device
- **iOS** — inside an encrypted device backup; not practical to read directly

There's no desktop build of the game, so on a PC the save always comes from an emulator.

[**adb-bridge**](https://github.com/TmRxJD/adb-bridge) is a small local helper that finds and copies
the save off a connected device or emulator, which is usually easier than doing it by hand:

```bash
npx adb-bridge
```

> Save files are personal data. If your tool uploads them anywhere, tell your users plainly.

### Decoding in a browser

The decoder is in `thetowersdk/node` only because it uses `node:zlib`. In a browser, gunzip with
`DecompressionStream` and call the NRBF reader directly — both are exported and pure:

```ts
import { NRBFReader, nrbfToJSON } from 'thetowersdk/node'

async function decodeInBrowser (file: File): Promise<Record<string, unknown>> {
  let bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
    bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  }
  return nrbfToJSON(NRBFReader.readStream(bytes)) as Record<string, unknown>
}
```

Everything in `thetowersdk/save` and `thetowersdk/data` then works on the result unchanged.

---

## Examples

Runnable, in [`examples/`](examples):

```bash
npx tsx examples/01-browse-game-data.ts
npx tsx examples/02-read-a-save-file.ts ~/playerInfo.dat
```

---

## Names and acronyms

The game and the community use a lot of shorthand, and plenty of it collides. `CF` is Chrono Field
to one player and critical factor to another; `GC` is Galaxy Compressor or glass cannon. The SDK
ships a glossary of 233 terms so you do not have to guess:

```ts
import { lookupGlossary, expandAcronym, listAmbiguousGlossaryTerms } from 'thetowersdk/data'

expandAcronym('CF')      // 'Chrono Field'
expandAcronym('GC')      // 'Galaxy Compressor'

lookupGlossary('CF')[0]  // { term, kind, domain: 'ultimate-weapon', expansion, definition }
listAmbiguousGlossaryTerms()   // 13 terms that resolve to more than one thing
```

Each entry carries a `domain`, which is usually enough to pick the one you meant. Usually, not
always: `SR` returns both Shrink Ray and Solar Reflector and *both* are modules, so for the terms in
`listAmbiguousGlossaryTerms()` you need the `expansion` rather than the domain.

The glossary only covers what the game calls things. Community shorthand that never became a game
name — critical factor for `CF`, glass cannon for `GC` — is not in it, so `expandAcronym` gives you
the game's meaning and nothing else.

Names in it are generated from the same catalogs the SDK ships, and every acronym is checked against
those names, so a term cannot appear unless it is real.

## Using it with an AI agent

There's an MCP server in [`mcp/`](mcp/README.md). Point your agent at it and it can list exports,
read a table, look up a term, decode a save and run an extractor directly — which beats having it
guess at an API and hand you code that does not compile.

```bash
claude mcp add thetowersdk -- node ./node_modules/thetowersdk/mcp/server.mjs
```

Agent instructions live in [AGENTS.md](AGENTS.md); `CLAUDE.md` and
`.github/copilot-instructions.md` point at the same file.

---

## Formulas

`thetowersdk/mechanics` is the calculation layer — the same one the Run Tracker's calculators use:

- **Enemy scaling** — wave/tier base health and damage, enemy type multipliers, level skip,
  elite spawn chance, wave-info panel values
- **Damage** — thorns, knockback, multishot and bounce shot, rend armor, projectile damage, crowd
  control, damage reduction, shockwave, land mines, tower fire and range
- **Ultimate weapons** — the shared hit and absorb pipeline, plus Chrono Field slow, Poison Swamp
  ticks and stun, and Inner Land Mines including Charge Mines
- **Economy** — coin and enemy drop simulation, interest, ROI scaling, workshop cost tables
- **Workshop stats** — attack, defense and utility stat tables and their build-up
- **Bots and guardians** — bot hit multipliers, effective range and coverage, Wildfire duration,
  medal planning and simulation, Bot Bot overlap, cooldowns
- **Battle conditions** — resistance levels, tournament heat, counter labs

```ts
import { computeWaveBaseHealth, abilityDamage, goldenComboBonus } from 'thetowersdk/mechanics'
```

---

## Effective Paths

[Effective Paths][ep] is the community spreadsheet that works out the cheapest order to buy things
in — which lab, workshop stat or module to put your next coins into for the most effect. Its authors
take the numbers from the developers, which is why the SDK already checks its own tables against it:
see [`src/data/fixtures/README.md`](src/data/fixtures/README.md).

The solver is ported. Four models, each with the sheet's own paths:

| Model | Planner | Paths |
|---|---|---|
| eHP | `planEffectiveHealthPath` | `lab-time` · `lab-coins` · `stone` · `coin` |
| eRegen | `planEffectiveRegenPath` | `lab-time` · `lab-coins` |
| eDamage | `planEffectiveDamagePath` | `lab-time` · `lab-coins` · `stone` · `coin` · `keys` |
| eEcon | `planEffectiveEconomyPath` | `time` · `coin` · `stone` |
| eEcon Discount | `planEffectiveEconomyDiscountPath` | its own, ranking coins **saved** |

The lab path appears twice everywhere because the sheet prices the same candidates two ways — in
research days or in coins — and which one binds depends on the player.

```ts
import {
  planEffectiveDamagePath,
  ZERO_EFFECTIVE_DAMAGE_LEVELS,
  zeroEffectiveDamageConfig,
} from 'thetowersdk/mechanics'

const plan = planEffectiveDamagePath({
  config: zeroEffectiveDamageConfig(),   // build this from a save or a tracker
  levels: ZERO_EFFECTIVE_DAMAGE_LEVELS,  // where the player is now
  variant: 'lab-time',
  steps: 25,
})

plan.steps      // what to buy, in order, with cost, gain and ROI
plan.excluded   // what it did not offer, and why
plan.issues     // why it could not plan at all — empty on every plan that ran
```

### An empty plan always says why

The four families — damage, eHP, economy and regen — check their levels before planning and refuse
rather than compute against a record they cannot use. When that happens `steps` is empty and
`issues` names the offending key and what was wrong with it: a `NaN`, a missing entry, a level
stored as text.

```ts
if (plan.issues.length > 0) {
  // Not "this player has nothing worth buying" — "these levels are unusable".
  console.error(plan.issues) // [{ path: 'time.coinsKillBonus', message: '…' }]
}
```

The distinction is the whole point. A `NaN` level makes every gain `NaN`, every candidate compares
false against every other, and the greedy loop returns an empty path that looks exactly like a
finished account. Levels are checked once per plan rather than inside the evaluation loop, which
runs thousands of times over inputs that do not change.

Levels are held to **completeness and finiteness, not magnitude**. Negative and fractional levels
are accepted: the sheet this port follows carries a negative stone level of its own, and rejecting
it would mean rejecting the authority being reproduced.

### `excluded` is half the answer

Every planner reports the candidates it passed over, each with a reason: `already at its cap of 99`,
`the weapon is not unlocked`, `priced at 0 for level 12, which is not a cost`. **A candidate is
planned, or it is explained — never neither.**

This matters more than it sounds. A path that stops after one step almost always means everything
else is already maxed, and without the exclusions that is indistinguishable from a bug. Read
`excluded` before concluding a short path is wrong.

Passing a variant a planner does not publish throws, naming the ones it does. `lab` is a damage
*band* and `lab-time` is a *variant*; the band used to plan nothing at all, in silence.

### Discount is a different quantity

`planEffectiveEconomyDiscountPath` ranks coins **saved**, not coins earned, so it is not comparable
to the others and has its own entry point. `planEffectiveEconomyPath` refuses `discount` and says so
rather than returning a table of zeroes.

### Checking it against the sheet

The port cites the cell behind every rule it implements — `eEcon!E6`, `eDamage Coins!EZ2` — and those
citations are enumerated by a test that checks the tab exists. If you are changing a formula, read
the cell first. `docs/EFFECTIVE_PATHS_ORACLE.md` in the tracker repo describes how, and which of the
spreadsheet API's answers are misleading: a spilled range reads as *empty* while `COUNTA` sees a
hundred rows of it.

The MCP server's `plan_effective_path` tool runs any of this without a scratch script — see
[`mcp/README.md`](mcp/README.md).

[`docs/EFFECTIVE_PATHS.md`](docs/EFFECTIVE_PATHS.md) is the longer version: how a config differs from
levels, why the damage and economy levels are banded, what a step guarantees, and the two testing
habits this port learned the hard way.

[ep]: https://docs.google.com/spreadsheets/d/1YwZtKP6B4WYhRba5T6APJ1YxKNdfnIGQnprgnxmO7zc/edit

---

## Accuracy

Data tables are exact values, keyed to a specific game version — see `V283_GAME_DATA_META`.

The formulas under `mechanics/` are **approximations**. They are fitted to observed in-game
behaviour and are close but not exact, particularly at very high waves and tiers. Don't rely on
them for anything that needs to match the game to the last digit.

Wave scaling in particular builds on earlier community work — see [Credits](#credits).

## Versioning

- **Patch** — fixes, new extractors, additive data.
- **Minor** — data updated for a new game version; existing values may change.
- **Major** — breaking API changes.

Pin the version if you need reproducible numbers.

Anything under `thetowersdk/internal/*` is not part of the public API and can change in any release.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Especially useful: extractors for save fields not yet
covered, data corrections (with a save file or screenshot showing the real value), and examples of
tools you've built.

## Credits

**Mattew** (`matteweon` on Discord) — the
[Effective Paths](https://docs.google.com/spreadsheets/d/1YwZtKP6B4WYhRba5T6APJ1YxKNdfnIGQnprgnxmO7zc)
spreadsheets for The Tower. A large amount of the reference data here, especially the cost, mastery
and substat tables, was compiled with the help of that work.

The wave scaling code builds on
[**tower-idle-toolkit**](https://github.com/tower-idle-toolkit/tower-idle-toolkit) by **skye**,
used under ISC. That project worked out the structure this scaler still uses, and several of its
constants come from there directly. It's no longer maintained, which is part of why this exists —
but the groundwork is theirs. See [NOTICE](NOTICE).

## License

MIT — see [LICENSE](LICENSE). Build open or closed source, commercial or not.

Includes work under other licenses; see [NOTICE](NOTICE).

Not affiliated with or endorsed by Tech Tree Games. "The Tower" is their trademark; this is a
community project.
