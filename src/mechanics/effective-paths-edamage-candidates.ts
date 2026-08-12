/**
 * Effective Paths — what each eDamage path may buy.
 *
 * The sheet writes every path's candidate list into an "UPDATE MATRIX" header
 * row, so these are transcribed from there rather than inferred from which
 * currency a thing happens to cost. Doing it the other way round on the eHP
 * side dropped six of seventeen candidates without any visible symptom.
 *
 * The four lists barely overlap, and that is the point:
 *
 * - **lab** buys the stats a lab levels — 33 of them.
 * - **stone** buys ultimate weapon upgrades, 29, almost none of which appear
 *   anywhere else. This is the path the eHP side had no equivalent of.
 * - **coin** buys workshop enhancements, card masteries and module levels, 25.
 * - **keys** buys 11, all of them raw stat unlocks.
 *
 * Credit for the original lists belongs to the Effective Paths maintainers —
 * see `effective-paths-credits.ts`.
 */

export type EffectiveDamagePathVariant = 'lab' | 'stone' | 'coin' | 'keys'

export interface EffectiveDamageCandidate {
  /** The sheet's own name for it. */
  sheetName: string
  /** The matrix column it occupies, kept so a reader can find it again. */
  column: string
}

/**
 * `eDamage!HD4:IJ4` — the lab path's 33.
 *
 * `IF` is blank in the sheet, and it is not padding: the level band's matching
 * column is Assist Module Substats — Generator, which the damage grid never
 * reads because the Generator substat feeds the economy stats rather than any
 * damage one. It is a level a player has, with no damage return, so the sheet
 * declines to rank it.
 */
export const EFFECTIVE_DAMAGE_LAB_CANDIDATES: readonly EffectiveDamageCandidate[] = [
  { column: 'HD', sheetName: 'Damage' },
  { column: 'HE', sheetName: 'Damage Mastery' },
  { column: 'HF', sheetName: 'Standard Perks Bonus' },
  { column: 'HG', sheetName: 'Improve Trade-off Perks' },
  { column: 'HH', sheetName: 'Shock Multiplier' },
  { column: 'HI', sheetName: 'Demon Mode Mastery' },
  { column: 'HJ', sheetName: 'Critical Chance Mastery' },
  { column: 'HK', sheetName: 'Critical Factor' },
  { column: 'HL', sheetName: 'Super Crit Chance' },
  { column: 'HM', sheetName: 'Super Crit Multi' },
  { column: 'HN', sheetName: 'Starting Cash' },
  { column: 'HO', sheetName: 'Attack Speed' },
  { column: 'HP', sheetName: 'Attack Speed Mastery' },
  { column: 'HQ', sheetName: 'Range' },
  { column: 'HR', sheetName: 'Damage / Meter' },
  { column: 'HS', sheetName: 'Range Mastery' },
  { column: 'HT', sheetName: 'Super Tower Bonus' },
  { column: 'HU', sheetName: 'Super Tower Mastery' },
  { column: 'HV', sheetName: 'Max Rend Armor Multiplier' },
  { column: 'HW', sheetName: 'Spotlight Missiles' },
  { column: 'HX', sheetName: 'Swamp Rend' },
  { column: 'HY', sheetName: 'Death Wave Damage Amplifier' },
  { column: 'HZ', sheetName: 'Missile Amplifier' },
  { column: 'IA', sheetName: 'Inner Land Mine - Chrono Jump' },
  { column: 'IB', sheetName: 'Ultimate Crit Mastery' },
  { column: 'IC', sheetName: 'Assist Module Bonus - Cannon' },
  { column: 'ID', sheetName: 'Assist Module Substats - Cannon' },
  { column: 'IE', sheetName: 'Assist Module Substats - Armor' },
  { column: 'IG', sheetName: 'Assist Module Bonus - Core' },
  { column: 'IH', sheetName: 'Assist Module Substats - Core' },
  { column: 'II', sheetName: 'Dissonant Echo - Attack' },
  { column: 'IJ', sheetName: 'Dissonant Echo - Ultimate Weapons' },
]

/**
 * `eDamage Stone!GQ4:HS4` — the stone path's 29.
 *
 * Almost entirely ultimate weapon upgrades, four stats apiece for the six
 * weapons plus Chrono Field. Nothing like it exists on the eHP side, where the
 * stone path buys three assist capacities and stops.
 */
export const EFFECTIVE_DAMAGE_STONE_CANDIDATES: readonly EffectiveDamageCandidate[] = [
  { column: 'GQ', sheetName: 'DW Damage' },
  { column: 'GR', sheetName: 'DW Quantity' },
  { column: 'GS', sheetName: 'DW Cooldown' },
  { column: 'GT', sheetName: 'CL Damage' },
  { column: 'GU', sheetName: 'CL Quantity' },
  { column: 'GV', sheetName: 'CL Chance' },
  { column: 'GW', sheetName: 'SM Damage' },
  { column: 'GX', sheetName: 'SM Quantity' },
  { column: 'GY', sheetName: 'SM Cooldown' },
  { column: 'GZ', sheetName: 'SM Cover Fire' },
  { column: 'HA', sheetName: 'SL Damage' },
  { column: 'HB', sheetName: 'SL Angle' },
  { column: 'HC', sheetName: 'SL Quantity' },
  { column: 'HD', sheetName: 'SL Light Range' },
  { column: 'HE', sheetName: 'PS Damage' },
  { column: 'HF', sheetName: 'PS Duration' },
  { column: 'HG', sheetName: 'PS Cooldown' },
  { column: 'HH', sheetName: 'PS Death Creep' },
  { column: 'HI', sheetName: 'ILM Damage' },
  { column: 'HJ', sheetName: 'ILM Quantity' },
  { column: 'HK', sheetName: 'ILM Cooldown' },
  { column: 'HL', sheetName: 'ILM Charged Mines' },
  { column: 'HM', sheetName: 'CF Slow' },
  { column: 'HN', sheetName: 'CF Chrono Loop' },
  { column: 'HO', sheetName: 'Assist Module Bonus - Cannon' },
  { column: 'HP', sheetName: 'Assist Module Substats - Cannon' },
  { column: 'HQ', sheetName: 'Assist Module Substats - Armor' },
  { column: 'HR', sheetName: 'Assist Module Bonus - Core' },
  { column: 'HS', sheetName: 'Assist Module Substats - Core' },
]

/** `eDamage Coins!FZ4:GX4` — the coin path's 25. */
export const EFFECTIVE_DAMAGE_COIN_CANDIDATES: readonly EffectiveDamageCandidate[] = [
  { column: 'FZ', sheetName: 'Damage +' },
  { column: 'GA', sheetName: 'Damage Mastery' },
  { column: 'GB', sheetName: 'Demon Mode Mastery' },
  { column: 'GC', sheetName: 'Critical Chance Mastery' },
  { column: 'GD', sheetName: 'Critical Factor +' },
  { column: 'GE', sheetName: 'Super Crit Mult +' },
  { column: 'GF', sheetName: 'Cash Bonus +' },
  { column: 'GG', sheetName: 'Attack Speed +' },
  { column: 'GH', sheetName: 'Attack Speed Mastery' },
  { column: 'GI', sheetName: 'Damage/Meter +' },
  { column: 'GJ', sheetName: 'Range Mastery' },
  { column: 'GK', sheetName: 'Super Tower Mastery' },
  { column: 'GL', sheetName: 'Rend Armor +' },
  { column: 'GM', sheetName: 'Ultimate Crit Mastery' },
  { column: 'GN', sheetName: 'Primary Module - Cannon' },
  { column: 'GO', sheetName: 'Assist Module - Cannon' },
  { column: 'GP', sheetName: 'Primary Module - Core' },
  { column: 'GQ', sheetName: 'Assist Module - Core' },
  { column: 'GR', sheetName: 'Assist Module Substats - Cannon' },
  { column: 'GS', sheetName: 'Assist Module Substats - Armor' },
  { column: 'GT', sheetName: 'Assist Module Substats - Core' },
  { column: 'GU', sheetName: 'Assist Module Bonus - Cannon' },
  { column: 'GV', sheetName: 'Assist Module Bonus - Core' },
  { column: 'GW', sheetName: 'Dissonant Echo - Attack' },
  { column: 'GX', sheetName: 'Dissonant Echo - Ultimate Weapons' },
]

/**
 * `eDamage Keys!EI4:ES4` — the keys path's 11.
 *
 * The one currency the eHP paths never touch. Every entry is a raw stat rather
 * than a lab, a card or a module.
 */
export const EFFECTIVE_DAMAGE_KEYS_CANDIDATES: readonly EffectiveDamageCandidate[] = [
  { column: 'EI', sheetName: 'Damage' },
  { column: 'EJ', sheetName: 'Critical Chance' },
  { column: 'EK', sheetName: 'Critical Factor' },
  { column: 'EL', sheetName: 'Super Crit Chance' },
  { column: 'EM', sheetName: 'Super Crit Mult' },
  { column: 'EN', sheetName: 'Attack Speed' },
  { column: 'EO', sheetName: 'Multishot Chance' },
  { column: 'EP', sheetName: 'Damage / Meter' },
  { column: 'EQ', sheetName: 'Rapid Fire Chance' },
  { column: 'ER', sheetName: 'Bounce Shot Chance' },
  { column: 'ES', sheetName: 'UW Damage' },
]

export const EFFECTIVE_DAMAGE_CANDIDATES: Readonly<
  Record<EffectiveDamagePathVariant, readonly EffectiveDamageCandidate[]>
> = {
  lab: EFFECTIVE_DAMAGE_LAB_CANDIDATES,
  stone: EFFECTIVE_DAMAGE_STONE_CANDIDATES,
  coin: EFFECTIVE_DAMAGE_COIN_CANDIDATES,
  keys: EFFECTIVE_DAMAGE_KEYS_CANDIDATES,
}
