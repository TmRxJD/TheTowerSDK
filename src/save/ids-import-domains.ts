/**

 * The IDS blocks beyond Labs, turned into save-shaped fields.
 *
 * Same contract as `ids-import.ts`: read the player's IDS Master, emit a
 * `parsedRoot`-shaped object, and let the existing save readers, import
 * composables and `finishTrackerImportPersistence` do their own jobs unchanged.
 * Nothing here writes anything.
 *
 * ## Not every block is importable, and saying so is part of the job
 *
 * The IDS is the EP sheet's input layer, not a copy of the save. Some blocks
 * hold what a tracker needs (Cards levels, Workshop levels); others hold EP's
 * DERIVED aggregates -- the Vault block carries "Total Bonuses" per stat rather
 * than per-node levels, and the Relics block carries owned COUNTS and summed
 * bonuses rather than which relics a player owns. Neither can reconstruct the
 * array its tracker stores, so neither is mapped. `idsDomainCoverage()` reports
 * that rather than leaving it to be discovered as an empty tracker.
 */
import { aliasFor, asNumber, asText, cell, type Grid, normalizeName } from './ids-grid'
import { findPerkNameByIndex, listActivePerkIndices } from './catalogs/perks'
import { GUARDIANS_ASSET_TABLE } from '../data/assets'
import { CARD_IMPORT_CATALOG } from '../data/player-stats'
import { getWorkshopEnhancementDefinitions } from '../data/workshop-enhancement-tracker-definitions'
import { getWorkshopStatDefinitions } from '../data/workshop-tracker-definitions'
import { findCardCatalogFromSaveIndex } from './cards'
import { listGuardianChipSlotCatalogRows } from './catalogs/guardians'
import { HARMONY_VAULT_TRACKER_SLOT_BINDINGS } from './catalogs/vault'
import { listUltimateWeaponCatalogRows } from './catalogs/ultimate-weapons'
import {
  asLevel,
  type IdsBlock,
  readIdsBlocks,
} from './ids-import'
import {
  findIdsModuleGroupColumns,
  type IdsModuleCategory,
} from './ids-import-modules'
import {
  type IdsDomainExtract,
  findBlock,
  findPresetLevelColumns,
  findStatBlock,
} from './ids-import-blocks'




/**
 * Whether a bot's first preset slot is unlocked, read from the row that names it.
 *
 * `Active` is a LABEL, not the answer. Three pieces of evidence:
 *
 *  - the cell four rows below it reads `Sync`, and the game's save format
 *    defines the sync value as `synchronicityBots[botIndex] || null` -- a bot
 *    assignment or nothing, never the literal word `Sync`. So that cell is a
 *    label, and `Active` is its counterpart;
 *  - the format defines the active value as the slot's `unlocked` field, a
 *    BOOLEAN, and a boolean is exactly what sits one row under the label;
 *  - the booleans vary per bot while the labels never do, and on sheet-18 the
 *    two reading `false` are precisely the two whose every level is `00`.
 *
 * Reading `Active` itself therefore marked EVERY bot owned, on every master.
 *
 * Older masters do not use the label at all: they put the flag in the block's
 * first two columns as `true` beside the word `Unlocked`, the same shape the
 * Guardians block uses. Both forms are read.
 *
 * `null` means the sheet says nothing -- sheet-9 carries the labels but fills
 * their value cells with display strings -- and that is not the same as `false`.
 */
export function readIdsBotUnlocked(grid: Grid, block: IdsBlock, nameRow: number): boolean | null {
  // How far the bot's own group runs: up to the next named bot.
  let end = nameRow + 1
  while (end < grid.length) {
    const marker = cell(grid, end, block.fromColumn)
    /*
     * Only a STRING name opens the next bot. On older masters that same column
     * carries the unlocked BOOLEAN partway down the group, and treating that as
     * a boundary stopped the scan one row short of the very flag it was looking
     * for -- which read as "the sheet says nothing" on every older master.
     */
    if (typeof marker === 'string' && marker.trim() && marker.trim() !== 'Bot +') break
    end += 1
  }

  // Older masters: `true | Unlocked` in the block's first two columns.
  for (let row = nameRow; row < end; row += 1) {
    const flag = cell(grid, row, block.fromColumn)
    if (typeof flag !== 'boolean') continue
    if (asText(cell(grid, row, block.fromColumn + 1)) === 'Unlocked') return flag
  }

  // Current masters: the boolean directly under the first `Active` label.
  for (let col = block.fromColumn; col <= block.toColumn; col += 1) {
    if (asText(cell(grid, nameRow, col)) !== 'Active') continue
    const value = cell(grid, nameRow + 1, col)
    return typeof value === 'boolean' ? value : null
  }
  return null
}





/* ------------------------------------------------------------------ cards */

export interface IdsCardRow {
  name: string
  level: number
  /**
   * Whether the card's MASTERY is unlocked -- not whether it is equipped.
   *
   * The column was read as "active" for a while, on a loose correlation with
   * the first preset's card list. It is mastery: sheets 1 and 2 have all thirty
   * cards at max level and not one flag set, which is normal for mastery nobody
   * has bought and impossible for a loadout. The Effective Paths import has
   * always called it mastery, written against the live export.
   */
  masteryUnlocked: boolean
  saveIndex: number | null
}

/**
 * Every card name to its save index, derived from the same resolver the save
 * reader uses -- so a card the asset table renames follows automatically.
 */
let cardIndexByName: Map<string, number> | null = null
function cardIndexLookup(): Map<string, number> {
  if (cardIndexByName) return cardIndexByName
  const map = new Map<string, number>()
  // The catalog is the floor; the asset table may carry more, so probe past it.
  const probeLimit = CARD_IMPORT_CATALOG.length + 32
  for (let index = 0; index < probeLimit; index += 1) {
    const { name } = findCardCatalogFromSaveIndex(index)
    if (!name) continue
    const key = normalizeName(name)
    if (!map.has(key)) map.set(key, index)
  }
  cardIndexByName = map
  return map
}

export function resolveIdsCardSaveIndex(name: string): number | null {
  return cardIndexLookup().get(normalizeName(name)) ?? null
}

/** The `Cards` block: name, level, and whether the player has it slotted. */
export function readIdsCards(grid: Grid): IdsDomainExtract<IdsCardRow> {
  const block = findBlock(grid, 'Cards')
  if (!block) {
    return { rows: [], unmatchedNames: [], missingFromSheet: [], warnings: ['No "Cards" block on _IDS.'] }
  }
  const rows: IdsCardRow[] = []
  const unmatchedNames: string[] = []
  const seen = new Set<number>()
  for (let row = 1; row < grid.length; row += 1) {
    const name = asText(cell(grid, row, block.fromColumn))
    if (!name) continue
    const level = asLevel(cell(grid, row, block.fromColumn + 1))
    // The block ends where the names stop being cards, not at a sentinel.
    if (level === null) continue
    const saveIndex = resolveIdsCardSaveIndex(name)
    if (saveIndex === null) unmatchedNames.push(name)
    else seen.add(saveIndex)
    rows.push({
      name,
      level,
      masteryUnlocked: cell(grid, row, block.fromColumn + 2) === true,
      saveIndex,
    })
  }
  const missingFromSheet: string[] = []
  for (const [key, index] of cardIndexLookup()) {
    if (!seen.has(index)) missingFromSheet.push(key)
  }
  return { rows, unmatchedNames, missingFromSheet, warnings: [] }
}

/* --------------------------------------------------------------- workshop */

export interface IdsWorkshopRow {
  name: string
  level: number
  /** One entry per preset column, in the order the sheet lists them. */
  presetLevels: Array<number | null>
  /**
   * The IN-ROUND cash level per preset, from the sheet's `$ Level` columns.
   *
   * The workshop has two currencies and they are not interchangeable. Coins
   * (`¢`) are earned in a round and spent after it on PERMANENT upgrades, which
   * is what the save stores and what `presetLevels` above holds. Cash (`$`) is
   * earned during a round and spent during it, and both the cash and the levels
   * it bought are gone when the round ends.
   *
   * So this is a within-round quantity with deliberately no save field, and
   * writing it into `upgradeWorkshopLevel` would have told the tracker a player
   * permanently owned levels that expire every run. It reads at or near the
   * stat cap in 827 of 835 numeric cases -- in-round cash reaches the ceiling
   * on most stats -- with the exceptions being stats the player does not buy
   * in-round at all (`Range` at 0) or stops short on (`Rend Armor Chance` at
   * 200 against a cap of 299).
   *
   * Surfaced rather than dropped: it is the player's own round plan, and it is
   * what the EP sheet simulates a run with.
   */
  cashLevels: Array<number | null>
  /** Which of the three workshop level arrays this belongs in. */
  category: 'attack' | 'defense' | 'utility' | null
  /** Position inside that category array, which is how the save orders them. */
  categoryIndex: number | null
}


/**
 * Workshop stat name to (category, position).
 *
 * The save stores three separate index-ordered arrays -- `upgradeWorkshopLevel`,
 * `...DefenseLevel`, `...UtilityLevel` -- and the reader maps each one onto the
 * stat keys of that category, in definition order. So the join needs BOTH which
 * array a stat belongs to and where it sits inside it, and both come from
 * `getWorkshopStatDefinitions()` rather than from the order the sheet lists.
 */
let workshopSlotByName: Map<string, { category: IdsWorkshopRow['category'], categoryIndex: number }> | null = null
function workshopSlotLookup(): NonNullable<typeof workshopSlotByName> {
  if (workshopSlotByName) return workshopSlotByName
  const map = new Map<string, { category: IdsWorkshopRow['category'], categoryIndex: number }>()
  const perCategory: Record<string, number> = { attack: 0, defense: 0, utility: 0 }
  for (const stat of getWorkshopStatDefinitions()) {
    const category = stat.category as 'attack' | 'defense' | 'utility'
    const categoryIndex = perCategory[category]
    perCategory[category] = categoryIndex + 1
    for (const candidate of [stat.label, stat.key]) {
      const key = normalizeName(candidate)
      if (!map.has(key)) map.set(key, { category, categoryIndex })
    }
  }
  workshopSlotByName = map
  return map
}

/**
 * Where the IDS spells a workshop stat differently from the definitions.
 *
 * Same elimination discipline as the labs aliases: these were taken from the
 * names that fail to resolve across all nine captured sheets, each checked
 * against the definition list for a single free slot.
 */
const IDS_WORKSHOP_NAME_ALIASES: Readonly<Record<string, string>> = {
  'Super Critical Chance': 'Super Crit Chance',
  'Super Critical Mult': 'Super Crit Mult',
  'Coin / Kill Bonus': 'Coins / Kill Bonus',
  'Coin / Wave': 'Coins / Wave',
  'Max Amount': 'Max Recovery',
}

/**
 * A workshop stat the sheet has and this repo's definitions do not.
 *
 * `Death Defy` sits among the defense stats in every captured sheet, v5.07
 * through v5.09, and `getWorkshopStatDefinitions()` has no entry for it -- the
 * elimination pass leaves it with no free slot, where every other unresolved
 * name had exactly one. So it is NOT an alias, and inventing a slot for it
 * would push a real level onto some other stat.
 *
 * It reads exactly 75 for all nine players on all three releases, so it is
 * invariant and carries no per-player information; nothing is lost by leaving
 * it unmapped. It is named here, and asserted in the tests as the ONLY
 * unresolved workshop name, so that a future release adding a second one fails
 * loudly instead of quietly widening the gap.
 */
export const IDS_WORKSHOP_STATS_NOT_MODELLED = ['Death Defy'] as const

export function resolveIdsWorkshopSlot(name: string): { category: IdsWorkshopRow['category'], categoryIndex: number } | null {
  const lookup = workshopSlotLookup()
  const direct = lookup.get(normalizeName(name))
  if (direct) return direct
  const alias = aliasFor(IDS_WORKSHOP_NAME_ALIASES, name.trim())
  if (alias) return lookup.get(normalizeName(alias)) ?? null
  return null
}

/**
 * The `WS` block.
 *
 * Column layout is `flag | name | (¢ Level, $ Level) x presets | Max`. The
 * first level column is the player's CURRENT level -- confirmed by spread
 * across the captured sheets: Rend Armor Chance reads 0, 100, 130, 170, 200,
 * 254 and 299 on different players against a common cap of 299. The uniform
 * rows are uniform because most players have those stats maxed, which is why
 * one sheet on its own looked like a table of caps.
 */
export function readIdsWorkshop(grid: Grid): IdsDomainExtract<IdsWorkshopRow> {
  const located = findStatBlock(grid, 'WS', name => resolveIdsWorkshopSlot(name) !== null, 1)
  if (!located) {
    return { rows: [], unmatchedNames: [], missingFromSheet: [], warnings: ['No "WS" block on _IDS.'] }
  }
  const nameCol = located.nameColumn
  const block = findBlock(grid, 'WS')
    ?? { heading: 'WS', fromColumn: nameCol - 1, toColumn: located.blockEnd, filledCells: 0 }
  const markedPresets = findPresetLevelColumns(grid, block, '¢ Level')
  const cashColumns = findPresetLevelColumns(grid, block, '$ Level')
  /*
   * With no marker row the preset levels still start one column right of the
   * name and repeat every two, the `$ Level` column sitting between them --
   * the same shape the marked sheets have.
   */
  const presetColumns = markedPresets.length > 0
    ? markedPresets
    : Array.from({ length: 5 }, (_, index) => nameCol + 1 + index * 2)
      .filter(column => column <= located.blockEnd)
  const levelCol = presetColumns[0] ?? nameCol + 1
  const rows: IdsWorkshopRow[] = []
  const unmatchedNames: string[] = []
  const seen = new Set<string>()
  for (let row = 1; row < grid.length; row += 1) {
    const name = asText(cell(grid, row, nameCol))
    if (!name) continue
    const level = asLevel(cell(grid, row, levelCol))
    if (level === null) continue
    const slot = resolveIdsWorkshopSlot(name)
    if (!slot) unmatchedNames.push(name)
    else seen.add(`${slot.category}:${slot.categoryIndex}`)
    rows.push({
      name,
      level,
      presetLevels: presetColumns.map(col => asLevel(cell(grid, row, col))),
      cashLevels: cashColumns.map(col => asLevel(cell(grid, row, col))),
      category: slot?.category ?? null,
      categoryIndex: slot?.categoryIndex ?? null,
    })
  }
  const missingFromSheet: string[] = []
  for (const stat of getWorkshopStatDefinitions()) {
    const slot = resolveIdsWorkshopSlot(stat.label)
    if (slot && !seen.has(`${slot.category}:${slot.categoryIndex}`)) missingFromSheet.push(stat.label)
  }
  return { rows, unmatchedNames, missingFromSheet, warnings: [] }
}

/* ------------------------------------------------------------- save root */



/**
 * The level a UW display cell is really carrying.
 *
 * The IDS does not store a UW level as a number. It stores the sheet's rendered
 * string -- `"22 | x1607 | Cost 525 | Next 636"` -- whose LEADING field is the
 * level and whose second field is the resulting stat. A locked upgrade renders
 * `"Lo | Locked"` instead, which is why this returns null rather than 0: never
 * bought and bought-at-zero are different things, and only one of them should
 * overwrite a tracker.
 */
export function parseIdsDisplayLevel(display: unknown): number | null {
  const text = asText(display)
  const match = /^(\d+)\s*\|/.exec(text)
  if (!match) return null
  const level = Number(match[1])
  return Number.isFinite(level) ? level : null
}

/**
 * Weapon name to its slot, and the stride the save actually uses.
 *
 * `ultimateWeaponLevel` is NOT one entry per weapon. The real save carries 27
 * values where `ultimateWeaponUnlocked`, `...On` and `...PlusLevel` carry 9 --
 * nine weapons times three base-stat levels, weapon-major -- and the save
 * reader already chunks it that way via `UW_SAVE_BASE_STAT_LEVELS_PER_SLOT`.
 * So the index is `weaponSlot * 3 + statOrdinal`.
 *
 * The stat ordinal comes from the ORDER the IDS lists a weapon's three rows,
 * because the catalog cannot supply it -- see
 * {@link IDS_UW_CATALOG_UPGRADE_NAMES_ARE_MIS_SLICED}. Two independent sources
 * agree that this order is right: the catalog's nine `upgradeNames` read
 * Damage, Quantity, Chance, Damage, Quantity, Cooldown, Damage, Quantity,
 * Cooldown, which is exactly Chain Lightning's three upgrades followed by Smart
 * Missiles' three followed by Death Wave's three -- and each of those triples
 * matches, in order, the three rows the IDS lists under that weapon.
 */
export const UW_BASE_STATS_PER_WEAPON = 3

/**
 * A catalog field that is populated, plausible and wrong.
 *
 * `ULTIMATE_WEAPON_IMPORT_CATALOG[i].upgradeNames` holds ONE name per weapon,
 * but every weapon has three upgrades. Read down the nine rows and the values
 * are the first nine entries of the flattened 27-name list, taken one per
 * weapon -- so weapon 3 is labelled with weapon 1's second upgrade name. It
 * therefore names the wrong upgrade for eight of the nine weapons, and nothing
 * reports it because a plausible name is exactly what it looks like.
 *
 * Not fixed here: the catalog is generated game data and this repo does not
 * hand-edit it. The adapter avoids the field entirely rather than trusting it.
 */
export const IDS_UW_CATALOG_UPGRADE_NAMES_ARE_MIS_SLICED = true

let uwSlotByWeapon: Map<string, number> | null = null
function uwSlotLookup(): Map<string, number> {
  if (uwSlotByWeapon) return uwSlotByWeapon
  const map = new Map<string, number>()
  for (const row of listUltimateWeaponCatalogRows()) {
    const name = normalizeName(String((row as { name?: unknown }).name ?? ''))
    const index = Number((row as { index?: unknown }).index)
    if (!name || !Number.isFinite(index)) continue
    if (!map.has(name)) map.set(name, index)
  }
  uwSlotByWeapon = map
  return map
}

export function resolveIdsUltimateWeaponSlot(weapon: string): number | null {
  return uwSlotLookup().get(normalizeName(weapon)) ?? null
}

export function resolveIdsUltimateWeaponIndex(weapon: string, statOrdinal: number): number | null {
  const slot = resolveIdsUltimateWeaponSlot(weapon)
  if (slot === null) return null
  if (statOrdinal < 0 || statOrdinal >= UW_BASE_STATS_PER_WEAPON) return null
  return slot * UW_BASE_STATS_PER_WEAPON + statOrdinal
}

/**
 * The `UWs` block.
 *
 * Layout per weapon is four rows sharing one name: three upgrades and a `UW+`.
 * The name sits in the first column of the FIRST row only; the same column then
 * carries the unlocked flag and the literal `UW+`, so the current weapon is
 * tracked forward rather than read per row.
 */
/**
 * One ultimate weapon row: a base stat, or a `UW+` upgrade.
 *
 * The two are read from the same block and must stay distinguishable.
 * `ultimateWeaponLevel` is 27 long -- nine weapons times three base stats,
 * weapon-major -- while the plus levels live in their own nine-slot array, so a
 * row carries either a `statOrdinal` or a `plusSlot` and never both.
 */
export interface IdsUltimateWeaponRow {
  weapon: string
  attribute: string
  /** Null when the sheet renders the stat as locked rather than as a level. */
  level: number | null
  locked: boolean
  isPlus: boolean
  /** Which of the weapon's three base stats this is; null for a `UW+` row. */
  statOrdinal: number | null
  /** The weapon's slot in `ultimateWeaponPlusLevel`; null for a base row. */
  plusSlot: number | null
  /** Whether the sheet marks the weapon itself unlocked. */
  weaponUnlocked: boolean
  /** Index into `ultimateWeaponLevel`, or null when it is a `UW+` row. */
  saveIndex: number | null
}

export interface IdsUltimateWeaponsExtract extends IdsDomainExtract<IdsUltimateWeaponRow> {
  /** Weapon slots the sheet marks `UW Unlocked`. */
  unlockedSlots: number[]
}

export function readIdsUltimateWeapons(grid: Grid): IdsUltimateWeaponsExtract {
  const block = findBlock(grid, 'UWs')
  if (!block) {
    return {
      rows: [],
      unmatchedNames: [],
      missingFromSheet: [],
      warnings: ['No "UWs" block on _IDS.'],
      unlockedSlots: [],
    }
  }
  const rows: IdsUltimateWeaponRow[] = []
  const unmatchedNames: string[] = []
  const seenWeapons = new Set<number>()
  const unlockedSlots = new Set<number>()
  let weapon = ''
  let statOrdinal = 0
  for (let row = 1; row < grid.length; row += 1) {
    const marker = cell(grid, row, block.fromColumn)
    const markerText = typeof marker === 'string' ? marker.trim() : ''
    const isPlus = markerText === 'UW+'
    if (markerText && !isPlus) {
      weapon = markerText
      statOrdinal = 0
    }
    const attribute = asText(cell(grid, row, block.fromColumn + 2))
    if (!weapon || !attribute) continue
    const display = cell(grid, row, block.fromColumn + 4)
    const level = parseIdsDisplayLevel(display)
    const locked = /locked/i.test(asText(display))
    const slot = resolveIdsUltimateWeaponSlot(weapon)
    /*
     * The sheet states this outright: a `true` in the block's first column
     * beside the label `UW Unlocked`, on the weapon's third row. Deriving it
     * from "has a level above zero" instead would call an unlocked weapon
     * locked whenever the player has bought nothing on it yet.
     */
    const unlockedHere = marker === true && asText(cell(grid, row, block.fromColumn + 1)) === 'UW Unlocked'
    if (unlockedHere && slot !== null) unlockedSlots.add(slot)

    /*
     * The `UW+` row is the weapon's plus upgrade, which lives in
     * `ultimateWeaponPlusLevel` -- a nine-long array keyed by weapon, not by
     * upgrade. It is read and reported, and deliberately given no base-stat
     * index, because writing it into the 27-long array would overwrite a real
     * upgrade level.
     */
    const saveIndex = isPlus || slot === null
      ? null
      : resolveIdsUltimateWeaponIndex(weapon, statOrdinal)
    if (slot === null) unmatchedNames.push(weapon)
    else if (!isPlus) seenWeapons.add(slot)

    rows.push({
      weapon,
      attribute,
      level,
      locked,
      isPlus,
      statOrdinal: isPlus ? null : statOrdinal,
      plusSlot: isPlus ? slot : null,
      weaponUnlocked: unlockedHere,
      saveIndex,
    })
    if (!isPlus) statOrdinal += 1
  }
  const missingFromSheet: string[] = []
  for (const catalogRow of listUltimateWeaponCatalogRows()) {
    const index = Number((catalogRow as { index?: unknown }).index)
    if (Number.isFinite(index) && !seenWeapons.has(index)) {
      missingFromSheet.push(String((catalogRow as { name?: unknown }).name ?? index))
    }
  }
  return {
    rows,
    unmatchedNames: [...new Set(unmatchedNames)],
    missingFromSheet,
    warnings: [],
    unlockedSlots: [...unlockedSlots].sort((a, b) => a - b),
  }
}


