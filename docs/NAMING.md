# Naming

One rule per idea, applied the same way in every domain. This exists because the SDK grew four
different words for "fetch a value" and names like
`computeChainThunderReductionFractionFromAccumulated` (51 characters), and a reader cannot tell from
`resolveX` and `getX` whether one of them costs more than the other.

## Verbs

Pick by **what the call does**, not by which word sounds better. Every exported function starts with
exactly one of these.

| Verb | Means | Returns |
|---|---|---|
| `get` | direct lookup, no work worth thinking about | the value |
| `find` | a search that can come up empty | `T \| undefined` |
| `is` / `has` | a question | `boolean` |
| `list` | everything of a kind | `T[]` |
| `build` | assemble a new object or collection | the new thing |
| `read` | pull structure out of a save or file | `T \| null`, plus `warnings` |
| `parse` | text to structure | `T \| null` |
| `format` | value to text for a human | `string` |
| `to` | a total conversion between two shapes | the other shape |
| `compute` | real calculation, formulas, iteration | a number or record |
| `sum` / `count` / `clamp` | exactly what they say | a number |
| `apply` | fold a change into existing state | the updated state |
| `normalize` | coerce ragged input into the canonical shape | the canonical shape |

Retired, and what replaced them:

- `resolve*` — meant lookup, computation and coercion in different files. Use `get`, `find` or
  `compute`.
- `calculate*` — the same as `compute`. Use `compute`.
- `create*` / `make*` — the same as `build`. Use `build`, **except when the call actually creates a
  record in a remote system.** `createOrUpdateDocument` and `createOrUpdateCloudDocument` write to
  Appwrite, and `build` promises a pure value you can throw away. Those keep `create`. This is the
  one place the verb table bends, and it bent because a codemod renamed all three and the failing
  test was the only thing that noticed.
- `derive*` / `extract*` — the same as `read` when the source is a save. Use `read`.

## Shape

```
verb + subject + qualifier?
```

- **Say the subject once.** `formatWorkshopTrackerCategoryFilterOptionLabel` says four kinds of thing
  and returns one string; `buildWorkshopFilterLabel` is the same function.
- **Drop the preposition tail.** `FromSaveRoot`, `FromSettings`, `FromAccumulated` describe the
  parameter, and the parameter is right there in the signature. Keep it only where two functions
  genuinely differ by source: `readLabsFromSave` beside `readLabsFromReport`.
- **Aim for four words, hard-stop at five.** Anything longer is a sign the function does more than
  one thing.
- **No abbreviations except the game's own.** `ILM`, `UW`, `BC` and `GT` are what the game calls
  them; `redux`, `cfg` and `calc` are not words.

## Constants

`SCREAMING_SNAKE_CASE`, grouped by the domain first so related constants sort together:

```
WAVE_INFO_BOSS_HP_DIVISOR        not  BOSS_HP_DIVISOR_WAVE_INFO
LAB_CATALOG                      not  CATALOG_OF_LABS
```

## Per-domain consistency

The same concept keeps the same word everywhere. A lab's ceiling is `levelMax` in every file that
has one — not `maxLevel` in the tracker and `levelCap` in the calculator. Where the game has a word,
the game wins.

| Concept | Name |
|---|---|
| a lab, workshop stat or module's ceiling | `levelMax` |
| a cost in coins | `cost`, always absolute coins |
| a duration on a data row | `duration`, a string the game's format |
| the position a thing occupies in the save | `saveIndex` |
| the catalog key | `slug` |
| what a human sees | `displayName` |

## What is still not conforming

Run it rather than reading a number here — a count written into a document is wrong the week after
it is written:

```bash
node scripts/naming-inventory.mjs
```

At the last sweep it reported 2,706 identifiers, and the shape of that number matters more than the
number:

| Area | Off-contract | Retired verb | Over five words | Methods |
|---|---|---|---|---|
| sdk | 633 | 57 | 582 | 0 |
| platform | 442 | 159 | 340 | 2 |
| app (`src/`) | 1,397 | 426 | 1,026 | 33 |
| towerai | 92 | 13 | 81 | 0 |
| scripts | 142 | 104 | 41 | 13 |

**Nothing in that table is a published API.** Every retired verb left in the SDK and platform is
file-local — checked, not assumed — so the 0.3.0 changelog still describes the exported surface
accurately, and finishing this is cosmetic rather than another breaking release.

Three things the earlier passes never looked at, which is why they survived:

- **Methods.** The sweep matched `function name(`, so members like
  `botSettingsService.deriveUptimeFields` were invisible to it. These are also the ones a compiler
  rename cannot fully verify, because `service[key]` reaches them without a resolved symbol.
- **`scripts/`.** Never in the sweep's roots. Not shipped, but it holds the highest retired-verb
  density in the repo.
- **`resolve*`, 211 of them.** The mechanical mappings are done — `create`→`build` and
  `calculate`→`compute` are one-to-one and were applied. `resolve` is not: it split three ways in
  0.3.0 (`get` / `find` / `compute`) and choosing correctly means reading each return type. The
  0.3.0 pass did this with the TypeScript compiler API rather than by eye, and 124 of 265 turned out
  to be arithmetic — a guess from the name alone would have been wrong about half the time.

### Blocked, not merely unfinished

`redux` → `reduction` (`damage-redux-layers.ts`, `computeChainThunderReductionFractionFromAccumulated`
and its neighbours) is the one item that is not a free rename. The word is load-bearing outside the
code:

- **RxDB and Appwrite keys.** `domain:damage-redux-calcs-settings-v1` is what users' saved settings
  are filed under. Renaming the symbol without a migration orphans real data, silently, on next load.
- **15 governed-i18n locale catalogs.** Text IDs are derived from function names, so the catalogs
  regenerate and every locale needs re-checking.

Do it as its own change with the migration written first, or leave it alone.

## Changing a name

The SDK is published. A rename is a breaking change for anyone using it, so it is a minor bump under
0.x and it goes in the changelog — not a quiet edit. Rename in one commit per group, with the
consumers updated in the same commit, so the tree never sits in a state where half the callers use
the old name.
