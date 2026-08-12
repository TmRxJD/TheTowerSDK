/**
 * Effective Paths — what each eDamage candidate costs.
 *
 * Four currencies, four cost sources, and none of them needed inventing: the
 * ultimate weapon ladders, the vault tree and the module tables were all
 * already in the SDK for other tools. What was missing was the mapping from a
 * candidate's name on the sheet to the row that prices it.
 *
 * That mapping is the fiddly part, because the sheet abbreviates. `DW Damage`
 * is Death Wave's Damage stat, `CF Chrono Loop` is Chrono Field's fourth, and
 * `SL Damage` is Spotlight's — which the stone chart calls `Multiplier`.
 */

import { uwStoneChartData } from '../data/ultimate-weapon-stones'
import { DEFAULT_HARMONY_VAULT_NODES, DEFAULT_POWER_VAULT_NODES } from '../data/vault-tree'

/** The sheet's two-or-three letter prefix for each ultimate weapon. */
export const ULTIMATE_WEAPON_ABBREVIATIONS: Readonly<Record<string, string>> = {
  DW: 'Death Wave',
  CL: 'Chain Lightning',
  SM: 'Smart Missiles',
  SL: 'Spotlight',
  PS: 'Poison Swamp',
  ILM: 'Inner Land Mines',
  CF: 'Chrono Field',
  GT: 'Golden Tower',
  BH: 'Black Hole',
}

/**
 * Stat names the sheet spells differently from the stone chart.
 *
 * Spotlight's damage stat is `Multiplier` on the chart, and Chrono Field's
 * slow is `Speed`. Everything else matches.
 */
const STAT_ALIASES: Readonly<Record<string, string>> = {
  'Spotlight/Damage': 'Multiplier',
  'Chrono Field/Slow': 'Speed',
}

/**
 * Display name to the key the stone chart is actually stored under.
 *
 * The chart is keyed by slug — `death_wave` — and carries the display name as
 * a field. Deriving the index from the data rather than writing a second list
 * of slugs keeps the two from drifting apart.
 */
const WEAPON_SLUGS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(uwStoneChartData).map(([slug, weapon]) => [weapon.name, slug]),
)

function statLevels(weapon: string, stat: string) {
  const slug = WEAPON_SLUGS[weapon] ?? weapon
  return uwStoneChartData[slug]?.stats?.find(entry => entry.name === stat)?.levels
}

/** The stat names a weapon's stone chart prices, in chart order. */
export function ultimateWeaponStats(weapon: string): readonly string[] {
  const slug = WEAPON_SLUGS[weapon] ?? weapon
  return uwStoneChartData[slug]?.stats?.map(entry => entry.name) ?? []
}

export interface UltimateWeaponStat {
  weapon: string
  stat: string
}

/**
 * Resolve a stone candidate's name — `"DW Damage"` — to its weapon and stat.
 *
 * Returns `null` for a name that is not an ultimate weapon stat at all, which
 * is how the five assist capacities on that path fall through to their own
 * cost source.
 */
export function resolveUltimateWeaponStat(sheetName: string): UltimateWeaponStat | null {
  const [prefix, ...rest] = sheetName.split(' ')
  const weapon = ULTIMATE_WEAPON_ABBREVIATIONS[prefix]
  if (!weapon || rest.length === 0) return null

  const stat = rest.join(' ')
  return { weapon, stat: STAT_ALIASES[`${weapon}/${stat}`] ?? stat }
}

/**
 * Power Stones to take an ultimate weapon stat to `level`.
 *
 * Level 0 is the weapon's unlock, which the chart prices as the string
 * `"Unlock"` rather than a number — so it returns `null` rather than pretending
 * a stat can be bought before the weapon is.
 */
export function ultimateWeaponStoneCost(
  weapon: string,
  stat: string,
  level: number,
): number | null {
  const row = statLevels(weapon, stat)?.find(entry => entry.level === level)
  return typeof row?.cost === 'number' ? row.cost : null
}

/** The highest level an ultimate weapon stat's chart prices. */
export function ultimateWeaponMaxLevel(weapon: string, stat: string): number | null {
  const rows = statLevels(weapon, stat)
  if (!rows?.length) return null
  const priced = rows.filter(entry => typeof entry.cost === 'number')
  return priced.length ? Math.max(...priced.map(entry => entry.level)) : null
}

/**
 * An ultimate weapon stat's value at a level, as a number.
 *
 * The chart stores what the game displays — `"x2.0"`, `"30°"`, `"1#"`,
 * `"300s"`, `"20%"` — because that is what a tracker shows a player. The model
 * wants the number, with a percentage as a fraction.
 *
 * Returns `null` when the chart has no such level, which for level 0 means the
 * weapon is not unlocked.
 */
export function ultimateWeaponStatValue(
  weapon: string,
  stat: string,
  level: number,
): number | null {
  const row = statLevels(weapon, stat)?.find(entry => entry.level === level)
  if (row === undefined) return null
  if (typeof row.value === 'number') return row.value

  const text = String(row.value).trim()
  const parsed = Number.parseFloat(text.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(parsed)) return null
  return text.includes('%') ? parsed / 100 : parsed
}

const VAULT_NODES = [...DEFAULT_HARMONY_VAULT_NODES, ...DEFAULT_POWER_VAULT_NODES]

/**
 * The vault node behind each keys candidate.
 *
 * The keys path *is* the vault tech tree — keys buy nothing else in the game —
 * and the sheet confirms it arithmetically. Each candidate's level is the
 * player's vault bonus divided by that node's per-level percentage:
 *
 * ```text
 * eDamage Keys!BO5 = BM8 / 5%     Damage,            "5% Damage"
 * eDamage Keys!BP5 = BM10 / 1%    Critical Chance,   "1% Critical Chance"
 * eDamage Keys!BU5 = BM14 / 4%    Multishot Chance,  "4% Multishot Chance"
 * ```
 *
 * All eleven divisors match a node's own name, which is what makes the mapping
 * a fact rather than a guess — and it caught two node ids being wrong here:
 * the tree calls them `multichance` and `bouncchance`, not the names their
 * stats would suggest.
 */
export interface KeysCandidateNode {
  /** The vault node, or nodes — Ultimate Weapon Damage is spread over four. */
  nodeIds: readonly string[]
  /** What one level grants, as a fraction. The sheet divides by exactly this. */
  perLevel: number
}

export const KEYS_CANDIDATE_NODES: Readonly<Record<string, KeysCandidateNode>> = {
  'Damage': { nodeIds: ['dmg'], perLevel: 0.05 },
  'Critical Chance': { nodeIds: ['crit1'], perLevel: 0.01 },
  'Critical Factor': { nodeIds: ['critfactor'], perLevel: 0.05 },
  'Super Crit Chance': { nodeIds: ['supercrit'], perLevel: 0.02 },
  'Super Crit Mult': { nodeIds: ['supercritmult'], perLevel: 0.05 },
  'Attack Speed': { nodeIds: ['attackspeed'], perLevel: 0.05 },
  'Multishot Chance': { nodeIds: ['multichance'], perLevel: 0.04 },
  'Damage / Meter': { nodeIds: ['dmgmeter'], perLevel: 0.05 },
  'Rapid Fire Chance': { nodeIds: ['rapidfire'], perLevel: 0.04 },
  'Bounce Shot Chance': { nodeIds: ['bouncchance'], perLevel: 0.04 },
  /**
   * Four separate single-level nodes rather than one four-level node, each
   * worth 5% for 15 keys. The sheet reads the total and divides, so it does
   * not care — but a cost function does.
   */
  'UW Damage': { nodeIds: ['ultdmg1', 'ultdmg2', 'ultdmg3', 'ultdmg4'], perLevel: 0.05 },
}

/**
 * Keys to take a vault node to `level`.
 *
 * A node's cost is either a single number — one level and that is it — or a
 * list, one entry a level. Returns `null` past what the tree prices.
 */
export function vaultNodeKeysCost(nodeId: string, level: number): number | null {
  const node = VAULT_NODES.find(entry => entry.id === nodeId)
  if (!node || !Number.isInteger(level) || level < 1) return null

  if (typeof node.cost === 'number') return level === 1 ? node.cost : null
  return node.cost[level - 1] ?? null
}

/** The highest level a vault node can be taken to. */
export function vaultNodeMaxLevel(nodeId: string): number | null {
  const node = VAULT_NODES.find(entry => entry.id === nodeId)
  if (!node) return null
  return typeof node.cost === 'number' ? 1 : node.cost.length
}

/**
 * Keys for the next level of a keys candidate.
 *
 * Candidates spread over several nodes are bought in order, so level 3 of
 * Ultimate Weapon Damage is the third node's only level.
 */
export function keysCandidateCost(sheetName: string, level: number): number | null {
  const entry = KEYS_CANDIDATE_NODES[sheetName]
  if (!entry || !Number.isInteger(level) || level < 1) return null

  let remaining = level
  for (const nodeId of entry.nodeIds) {
    const max = vaultNodeMaxLevel(nodeId)
    if (max === null) return null
    if (remaining <= max) return vaultNodeKeysCost(nodeId, remaining)
    remaining -= max
  }
  return null
}

/** How many levels of a keys candidate the vault offers in total. */
export function keysCandidateMaxLevel(sheetName: string): number | null {
  const entry = KEYS_CANDIDATE_NODES[sheetName]
  if (!entry) return null

  let total = 0
  for (const nodeId of entry.nodeIds) {
    const max = vaultNodeMaxLevel(nodeId)
    if (max === null) return null
    total += max
  }
  return total
}
