import { CARD_TEMPLATE_MAP } from '../data/cards'
import { WORKSHOP_DATA } from '../data/workshop-table'
import { DEFAULT_HARMONY_VAULT_NODES, DEFAULT_POWER_VAULT_NODES } from '../data/vault-tree'
import { resolveUltimateWeaponStat, ultimateWeaponMaxLevel } from './effective-paths-edamage-costs'
import { labMaxCatalogLevel } from './effective-paths-lab-costs'
import { EFFECTIVE_DAMAGE_UPGRADES } from './effective-paths-edamage-plan'
import { EFFECTIVE_HEALTH_UPGRADES } from './effective-paths-ehp-plan'

/**
 * The valid range of every input an Effective Paths test may set.
 *
 * ## Why this exists
 *
 * A test account whose stats are at maximum cannot test anything that filters
 * or plans upgrades. That was not a hypothetical: the damage tab's
 * `Hide UW Cooldown` filter was verified against an account with all seven
 * cooldowns maxed, so the filtered and unfiltered tables were identical and
 * the check would have passed no matter how the filter was written — including
 * the version that matched nothing at all, which is the version that shipped
 * to that check.
 *
 * The lesson is not "look at the levels next time". It is that a harness which
 * does not know what a *valid, mid-range* value looks like cannot tell a
 * working feature from a dormant one. So the ranges are derived here, once,
 * from the same tables the model prices against.
 *
 * ## Derived, never assumed
 *
 * Every entry carries the `source` it came from, and
 * `effective-paths-input-ranges.test.ts` fails on any entry whose maximum is
 * missing. Nothing here is a guessed cap: a lab's maximum is the highest level
 * its catalog prices, a workshop stat's is the highest level in its chart, an
 * ultimate weapon stat's is the highest level its chart prices, and a card's
 * is how many level values it has.
 *
 * A range that cannot be derived is reported as such rather than filled in
 * with a plausible number — a wrong maximum would put the test account into a
 * state the game cannot reach, and every number computed from it would be
 * confidently wrong in a way nothing else would catch.
 */

/** What kind of value an input takes, which decides how a test may vary it. */
export type InputRangeKind = 'level' | 'boolean' | 'enum' | 'number'

export interface InputRange {
  /** Stable id — `lab.Damage`, `uw.Death Wave.Cooldown`, `control.hideUwCooldown`. */
  id: string
  kind: InputRangeKind
  /** Where the range came from, so a reader can check it rather than trust it. */
  source: string
  min: number
  /** Null when nothing in the data answers it, which is a reportable gap. */
  max: number | null
  /** For `enum`, every value the input accepts. */
  options?: readonly (string | number | boolean)[]
}

const numericKeys = (table: Record<string, unknown> | undefined) =>
  Object.keys(table ?? {}).map(Number).filter(Number.isFinite)

const highest = (values: number[]) => (values.length ? Math.max(...values) : null)

/**
 * Upgrade names that look like labs on the path and are not.
 *
 * Each one is here with the reason it does not resolve to the lab catalog, so
 * that "the catalog has no maximum for this" stays a real signal. `NOT_LABS`
 * is asserted exactly in the test: a *new* name failing to resolve fails the
 * suite rather than joining a silent exception list.
 */
export const NOT_LABS: Readonly<Record<string, string>> = {
  'Primary Module - Armor': 'a module level, bought with coins rather than a lab',
  'Assist Module - Armor': 'a module level, bought with coins rather than a lab',
  'Recovery Package +': 'a module level, bought with coins rather than a lab',
  'Shock Multiplier': 'an unlock, not a level — the model reads it as a boolean',
}

/**
 * Whether a damage upgrade's id names a lab.
 *
 * The id prefix is the reliable classifier and the sheet name is not. The
 * damage upgrades divide into `lab.` (32), `stone.` (29, ultimate weapon
 * stats), `coin.` (25) and `keys.` (11, vault nodes) — and only the first two
 * groups are what their names suggest. Inside `coin.` sit real labs alongside
 * `coin.enhancement*`, which are workshop enhancements priced by
 * `WORKSHOP_DATA`, and `coin.*Module*`, which are module levels.
 *
 * Classifying by name instead produced six phantom gaps — `UW Damage` looks
 * like a weapon stat and is `keys.ultimateWeaponDamage`, a vault node;
 * `Rend Armor +` looks like a lab and is an enhancement of a workshop stat
 * spelled `Rend Armor Mult`.
 */
export function isDamageLabUpgrade(id: string): boolean {
  if (id.startsWith('lab.')) return true
  if (!id.startsWith('coin.')) return false
  return !/^coin\.(enhancement|primaryModule|assistModule)/.test(id)
}

/** Every lab either path can buy, by the sheet's own name for it. */
function labRanges(): InputRange[] {
  /*
   * Selected by what an upgrade *is*, not by its band.
   *
   * The first version filtered `band === 'lab' || band === 'time'`. The damage
   * bands are `keys`, `stone` and `coin`, so that matched nothing and every
   * damage lab was missing from the catalog without anything saying so — the
   * same silent-undercoverage shape this file exists to prevent. The compiler
   * caught it only because the band type is a union.
   *
   * An ultimate weapon stat is priced by its own chart and is excluded here;
   * whatever remains has to resolve to a lab, or be named in `NOT_LABS`.
   */
  const names = new Set<string>()
  for (const upgrade of EFFECTIVE_HEALTH_UPGRADES) names.add(upgrade.sheetName)
  for (const upgrade of EFFECTIVE_DAMAGE_UPGRADES) {
    if (isDamageLabUpgrade(upgrade.id)) names.add(upgrade.sheetName)
  }

  /*
   * A workshop stat is not a lab either.
   *
   * The paths buy `Critical Chance`, `Multishot Chance` and their `+`
   * enhancements alongside labs, and those are priced by `WORKSHOP_DATA` — they
   * already have a range under `workshop.`, so asking the lab catalog for them
   * only produces a phantom gap.
   */
  const isWorkshop = (name: string) =>
    name in WORKSHOP_DATA || (name.endsWith(' +') && name.slice(0, -2) in WORKSHOP_DATA)

  return [...names]
    .filter(name => !(name in NOT_LABS) && !isWorkshop(name))
    .map(name => {
      const max = labMaxCatalogLevel(name)
      return {
        id: `lab.${name}`,
        kind: 'level' as const,
        source: 'labMaxCatalogLevel — the highest level the lab catalog prices',
        min: 0,
        max: max > 0 ? max : null,
      }
    })
}

function workshopRanges(): InputRange[] {
  return Object.keys(WORKSHOP_DATA).map(stat => ({
    id: `workshop.${stat}`,
    kind: 'level' as const,
    source: 'WORKSHOP_DATA — the highest level in the stat’s chart',
    min: 0,
    max: highest(numericKeys(WORKSHOP_DATA[stat] as Record<string, unknown>)),
  }))
}

/**
 * The weapon stats come from the upgrade list rather than a chart map.
 *
 * The site keeps its own `ULTIMATE_WEAPON_CHART_STATS`, but this belongs in the
 * package, and every stat a path can buy is already named by an upgrade — so
 * the pairs are resolved from those, which also guarantees the catalog covers
 * exactly what the planner offers rather than a parallel list that can drift.
 */
function ultimateWeaponRanges(): InputRange[] {
  const seen = new Set<string>()
  const ranges: InputRange[] = []

  for (const upgrade of EFFECTIVE_DAMAGE_UPGRADES) {
    const stat = resolveUltimateWeaponStat(upgrade.sheetName)
    if (!stat) continue

    const id = `uw.${stat.weapon}.${stat.stat}`
    if (seen.has(id)) continue
    seen.add(id)

    ranges.push({
      id,
      kind: 'level',
      source: 'ultimateWeaponMaxLevel — the highest level the stat’s chart prices',
      min: 0,
      max: ultimateWeaponMaxLevel(stat.weapon, stat.stat),
    })
  }

  return ranges
}

function cardRanges(): InputRange[] {
  return Object.entries(CARD_TEMPLATE_MAP).map(([id, template]) => ({
    id: `card.${id}`,
    kind: 'level' as const,
    source: 'CARD_TEMPLATE_MAP.levelValues — how many levels the card has',
    min: 0,
    max: template?.levelValues?.length ? template.levelValues.length : null,
  }))
}

/**
 * A vault node's levels are its costs.
 *
 * There is no `maxLevel` field: a node priced `25` has one level and a node
 * priced `[25, 50, 100]` has three, so the cost list *is* the range. Reading a
 * field that does not exist returned `undefined` for all ninety-odd nodes,
 * which the gap check caught rather than letting them all read as uncapped.
 */
function vaultRanges(): InputRange[] {
  return [...DEFAULT_POWER_VAULT_NODES, ...DEFAULT_HARMONY_VAULT_NODES].map(node => ({
    id: `vault.${node.id}`,
    kind: 'level' as const,
    source: 'the vault node’s cost list — one entry per level',
    min: 0,
    max: Array.isArray(node.cost) ? node.cost.length : 1,
  }))
}

/**
 * The feature controls, which are inputs too.
 *
 * These are the ones a test is most likely to get wrong, because nothing about
 * them is numeric: a switch has two states and a dropdown has a fixed list, and
 * a harness that does not know the list cannot tell "set it to a valid option"
 * from "set it to something the sheet silently ignores".
 *
 * The cells are the sheet's, so a reader can go and look.
 */
const CONTROL_RANGES: readonly InputRange[] = [
  { id: 'control.ignoreTargetLevels', kind: 'boolean', source: 'eHP!AY13', min: 0, max: 1, options: [false, true] },
  { id: 'control.ignoreUwTargetLevels', kind: 'boolean', source: 'eEcon Stones!AZ18', min: 0, max: 1, options: [false, true] },
  { id: 'control.hideNonUnlockedLabs', kind: 'boolean', source: 'eHP!AY14, eDamage!AY26, eEcon!AZ11', min: 0, max: 1, options: [false, true] },
  { id: 'control.hideUwCooldown', kind: 'boolean', source: 'eDamage!AY24', min: 0, max: 1, options: [false, true] },
  { id: 'control.hideNonUwUpgrades', kind: 'boolean', source: 'eDamage!AY25', min: 0, max: 1, options: [false, true] },
  { id: 'control.perksEquipped', kind: 'boolean', source: 'eDamage!AY61, eEcon!AZ43', min: 0, max: 1, options: [false, true] },
  { id: 'control.useCards', kind: 'boolean', source: 'eDamage!AY39', min: 0, max: 1, options: [false, true] },
  {
    id: 'control.rowsCalculated',
    kind: 'enum',
    source: 'eDamage!AI21 / eHP!AJ22 — the sheet ships this at 1',
    min: 1,
    max: 150,
    options: [1, 25, 50, 100, 150],
  },
]

export interface InputRangeCatalog {
  ranges: InputRange[]
  /** Entries whose maximum nothing in the data answers. Empty is the goal. */
  gaps: string[]
}

/** Every input, with the range it accepts. */
export function effectivePathsInputRanges(): InputRangeCatalog {
  const ranges = [
    ...labRanges(),
    ...workshopRanges(),
    ...ultimateWeaponRanges(),
    ...cardRanges(),
    ...vaultRanges(),
    ...CONTROL_RANGES,
  ]

  return { ranges, gaps: ranges.filter(r => r.max === null).map(r => r.id) }
}

/**
 * A level partway up, for a test account that must exercise every upgrade.
 *
 * Halfway rather than one-off-maximum: a stat one level from its cap offers
 * exactly one upgrade, so a path can plan it and a filter can hide it, but
 * nothing downstream of the *second* step is exercised. Halfway leaves room
 * for a full plan on every input at once.
 */
export function midpointOf(range: InputRange): number {
  if (range.max === null) return range.min
  return Math.floor((range.min + range.max) / 2)
}
