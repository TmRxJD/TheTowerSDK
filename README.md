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
import { generatedLabs } from 'thetowersdk/data'

const costToMax = (lab) => (lab.levels ?? []).reduce((sum, level) => sum + (level.cost ?? 0), 0)

const priciest = generatedLabs
  .map((lab) => ({ name: lab.name, total: costToMax(lab) }))
  .sort((a, b) => b.total - a.total)[0]
```

### Read a save file

```ts
import { readFile } from 'node:fs/promises'
import { decodePlayerInfoSaveBytes } from 'thetowersdk/node'
import { extractLabsFromSaveRoot } from 'thetowersdk/save'

const { parsedRoot } = decodePlayerInfoSaveBytes(await readFile('playerInfo.dat'))

const labs = extractLabsFromSaveRoot(parsedRoot)
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
           extractLabsFromSaveRoot()   extractModulesFromSaveRoot()   discoverSaveImportTrackers()
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
| `extractLabsFromSaveRoot` | Research levels, what's maxed, the active queue |
| `extractWorkshopFromSaveRoot` | Upgrade levels, enhancements, saved presets |
| `extractModulesFromSaveRoot` | Owned modules, rarities, substats, equipped |
| `extractCardsFromSaveRoot` | Card levels, copies, mastery, equipped slots |
| `extractGuardiansFromSaveRoot` | Guardian levels and upgrades |
| `extractBotsFromSaveRoot` | Bot levels, plus/sync unlocks, medals spent |
| `extractUltimateWeaponsFromSaveRoot` | UW levels, unlocks, plus-levels, stones |
| `extractVaultFromSaveRoot` | Vault power tree progress |
| `extractRelicsFromSaveRoot` | Owned relics |
| `extractCollectedThemeNamesFromSaveRoot` | Unlocked themes |
| `extractLifetimeFromSaveRoot` | Lifetime totals |
| `extractDissonanceFromSaveRoot` | Dissonance echo progress |
| `listImportableBattleRuns` | Run history |

Plus perks, "killed by" and per-run battle report fields — see [`src/save/index.ts`](src/save/index.ts).

### Check before you read

Extractors return `null` when a save has no data for that feature, rather than throwing, so older
saves degrade instead of failing:

```ts
const labs = extractLabsFromSaveRoot(parsedRoot)
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
import { listImportableBattleRuns, buildBattleReportStatFieldsFromSaveEntry } from 'thetowersdk/save'

const runs = listImportableBattleRuns(parsedRoot)

// The raw entry — tier, wave, duration, coins, cells, damage dealt and taken,
// per-source damage breakdowns, what killed you, and everything else the game
// recorded for that run.
console.log(Object.keys(runs[0]))

// Or the same run flattened into named stat fields.
const stats = buildBattleReportStatFieldsFromSaveEntry(runs[0])
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

## Getting a save file

`playerInfo.dat` is The Tower's save file.

- **Android** — `Android/data/com.TechTreeGames.TheTower/files/playerInfo.dat`
- **Android emulator** (BlueStacks, LDPlayer, WSA…) — the same path inside the emulated device
- **iOS** — inside an encrypted device backup; not practical to read directly

There's no desktop build of the game, so on a PC the save always comes from an emulator.

[**Tracker Bridge**](https://github.com/TmRxJD/tracker-bridge) is a small local helper that finds
and copies the save off a connected device or emulator, which is usually easier than doing it by
hand:

```bash
npx tracker-bridge
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

## Formulas

`thetowersdk/mechanics` is the calculation layer — the same one the Run Tracker's calculators use:

- **Enemy scaling** — wave/tier base health and damage, enemy type multipliers, level skip,
  elite spawn chance, wave-info panel values
- **Damage** — thorns, knockback, multishot and bounce, rend armor, projectile damage, crowd
  control, damage reduction, tower fire and range
- **Ultimates** — chronofield, poison swamp, land mines and charge, wildfire, black hole, shockwave
- **Economy** — coin and enemy drop simulation, interest, ROI scaling, workshop cost tables
- **Workshop stats** — attack, defense and utility stat tables and their build-up
- **Bots and guardians** — bot hit multipliers, medal planning and simulation, overlap, cooldowns
- **Battle conditions** — resistance levels, tournament heat, counter labs

```ts
import { computeWaveBaseHealth, abilityDamage, goldenComboBonus } from 'thetowersdk/mechanics'
```

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

## Roadmap

- A documented calculation engine — wave scaling, enemy stats, damage and coin modelling
- Localized game text (currently English only)

Open an issue for what you're trying to build; that's what drives the order.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Especially useful: extractors for save fields not yet
covered, data corrections (with a save file or screenshot showing the real value), and examples of
tools you've built.

## Credits

**Matthew** — the "Effective Paths" spreadsheets for The Tower. A large amount of the reference
data here, especially the cost, mastery and substat tables, was compiled with the help of that work.

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
