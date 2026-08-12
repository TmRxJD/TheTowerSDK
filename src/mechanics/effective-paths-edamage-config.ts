/**
 * Effective Paths — the player state the eDamage grid reads.
 *
 * The eHP model needed a dozen inputs. Damage needs about seventy, because
 * every bullet stat is built from a workshop level, a workshop enhancement, a
 * relic, a vault node, a module substat and often a card — and then the
 * ultimate weapons repeat the exercise nine more times.
 *
 * Rather than invent a name for each, the tables here are keyed by the sheet's
 * own labels, and every field carries the cell it comes from. A reader
 * checking this against the sheet should never have to guess which row a value
 * came out of.
 */

import type { DamageRunType } from './effective-paths-damage-base'
import type { SubstatPair } from './effective-paths-damage-substats'

// ---------------------------------------------------------------------------
// Bullet stats
// ---------------------------------------------------------------------------

/**
 * The workshop rows, `eDamage` 8 to 22, under the labels in column `BB`.
 *
 * **These are not the substat rows.** The sheet keeps two blocks with two
 * different row orders — row 14 is Multishot Chance in the workshop block and
 * Super Crit Chance in the substat block — and formulas read across both, so
 * `EPD_MSC($BG$14, $AM$17 + cap * $AO$17, $BM$14)` is correct rather than a
 * typo. The two lists are deliberately spelled differently, exactly as the
 * sheet spells them, so no name can belong to both.
 */
export const DAMAGE_WORKSHOP_STATS = [
  'Damage',
  'Attack Speed',
  'Critical Chance',
  'Critical Factor',
  'Range',
  'Damage / Meter',
  'Multishot Chance',
  'Multishot Targets',
  'Rapid Fire Chance',
  'Rapid Fire Duration',
  'Bounce Shot Chance',
  'Bounce Shot Targets',
  'Super Critical Chance',
  'Super Critical Mult',
  'Max Rend Armor Multiplier',
] as const

export type DamageWorkshopStat = typeof DAMAGE_WORKSHOP_STATS[number]

/**
 * One stat's four sources.
 *
 * The sheet keeps a stat's workshop level (`BG`) apart from its resolved value
 * (`BF`), because some stats scale linearly off the level and others read the
 * table. Both are here for the same reason: which one a formula wants is the
 * formula's business, not this type's.
 */
export interface DamageStatSource {
  /** `BG` — the workshop upgrade level. */
  workshopLevel: number
  /**
   * `BH` — the workshop block's resolved value at that level.
   *
   * Only Damage / Meter reads it, and the sheet has already applied the ÷1000
   * that `EPD_DPM` applies again to its own lookup — so the compute multiplies
   * it back out. Everything else scales off the level.
   */
  workshopValue: number
  /** `BI` — the workshop enhancement, the `+` levels. */
  enhancementLevel: number
  /** `BK` — the multiplier those enhancement levels come to. */
  enhancementMultiplier: number
  /** `BL` — the relic bonus, as a fraction. */
  relicPct: number
  /** `BM` — the vault bonus, as a fraction. */
  vaultPct: number
}

export const ZERO_DAMAGE_STAT_SOURCE: DamageStatSource = {
  workshopLevel: 0,
  workshopValue: 0,
  enhancementLevel: 0,
  enhancementMultiplier: 1,
  relicPct: 0,
  vaultPct: 0,
}

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

/** The four module slots, which the sheet blocks out at rows 4, 23, 42 and 47. */
export const MODULE_SLOTS = ['cannon', 'core', 'generator', 'armor'] as const
export type ModuleSlot = typeof MODULE_SLOTS[number]

/**
 * A module pair, and the two stone ladders that decide how much of the assist
 * module counts.
 *
 * The bonus and substat efficiencies are separate purchases with separate caps
 * — 99 and 69 — so they are separate fields. Treating them as one was the
 * error that took three passes to find.
 */
export interface DamageModuleSource {
  /** `AM` — the primary module's bonus, already resolved. */
  primaryBonus: number
  /** `AN` — whether an assist module is equipped at all. */
  hasAssist: boolean
  /** `AO` — the assist module's bonus at full efficiency. */
  assistBonus: number
  /** `BL41`, `BL43`, `BL45`, `BL47` — the stone-bought bonus efficiency. */
  bonusStoneLevel: number
  /** `BL42`, `BL44`, `BL46`, `BL48` — the stone-bought substat efficiency. */
  substatStoneLevel: number
}

export const ZERO_DAMAGE_MODULE_SOURCE: DamageModuleSource = {
  primaryBonus: 1,
  hasAssist: false,
  assistBonus: 1,
  bonusStoneLevel: 0,
  substatStoneLevel: 0,
}

/**
 * The module substats the damage grid reads, by the label in column `AL`.
 *
 * Each is a `{ primary, assist }` pair: `AM` and `AO`. The assist half is
 * multiplied by that module's substat efficiency before it counts, which is
 * why the pair cannot be pre-summed.
 */
export const DAMAGE_SUBSTATS = [
  // Cannon, rows 9–22, in the sheet's order — which is not the workshop's.
  'Attack Speed',
  'Critical Chance',
  'Critical Factor',
  'Attack Range',
  'Damage / Meter',
  'Super Crit Chance',
  'Super Crit Multi',
  'Max Rend Armor Multi',
  'MultiShot Chance',
  'Multishot Targets',
  'Rapid Fire Chance',
  'Rapid Fire Duration',
  'Bounce Shot Chance',
  'Bounce Shot Targets',
  // Core, rows 26–41.
  'Death Wave - Damage',
  'Death Wave - Quantity',
  'Death Wave - Cooldown',
  'Spotlight - Bonus',
  'Spotlight - Angle',
  'Smart Missiles - Damage',
  'Smart Missiles - Quantity',
  'Smart Missiles - Cooldown',
  'Chain Lightning - Damage',
  'Chain Lightning - Quantity',
  'Chain Lightning - Chance',
  'Poison Swamp - Damage',
  'Chrono Field - Speed Reduction',
  'Inner Land Mines - Damage',
  'Inner Land Mines - Quantity',
  'Inner Land Mines - Cooldown',
  // Armor, rows 51–52.
  'Shockwave Frequency',
  'Land Mine Chance',
] as const

export type DamageSubstat = typeof DAMAGE_SUBSTATS[number]

/** Which module's efficiency scales each substat's assist half. */
export const SUBSTAT_MODULE: Readonly<Record<DamageSubstat, ModuleSlot>> = {
  'Attack Speed': 'cannon',
  'Critical Chance': 'cannon',
  'Critical Factor': 'cannon',
  'Attack Range': 'cannon',
  'Damage / Meter': 'cannon',
  'Super Crit Chance': 'cannon',
  'Super Crit Multi': 'cannon',
  'Max Rend Armor Multi': 'cannon',
  'MultiShot Chance': 'cannon',
  'Multishot Targets': 'cannon',
  'Rapid Fire Chance': 'cannon',
  'Rapid Fire Duration': 'cannon',
  'Bounce Shot Chance': 'cannon',
  'Bounce Shot Targets': 'cannon',
  'Death Wave - Damage': 'core',
  'Death Wave - Quantity': 'core',
  'Death Wave - Cooldown': 'core',
  'Spotlight - Bonus': 'core',
  'Spotlight - Angle': 'core',
  'Smart Missiles - Damage': 'core',
  'Smart Missiles - Quantity': 'core',
  'Smart Missiles - Cooldown': 'core',
  'Chain Lightning - Damage': 'core',
  'Chain Lightning - Quantity': 'core',
  'Chain Lightning - Chance': 'core',
  'Poison Swamp - Damage': 'core',
  'Chrono Field - Speed Reduction': 'core',
  'Inner Land Mines - Damage': 'core',
  'Inner Land Mines - Quantity': 'core',
  'Inner Land Mines - Cooldown': 'core',
  'Shockwave Frequency': 'armor',
  'Land Mine Chance': 'armor',
}

/**
 * The unique module effects, which are not substats.
 *
 * Every one is read as `AM + AR` — the primary's and the assist's — because a
 * player can be running the same unique on both.
 */
export const DAMAGE_MODULE_UNIQUES = [
  'Astral Deliverance',
  'Being Annihilator',
  'Amplifying Strike',
  'Dimension Core',
  'Galaxy Compressor',
  'Project Funding',
  'Anti-Cube Portal',
  'Space Displacer',
] as const

export type DamageModuleUnique = typeof DAMAGE_MODULE_UNIQUES[number]

// ---------------------------------------------------------------------------
// Cards, perks and ultimate weapons
// ---------------------------------------------------------------------------

/** The cards the damage grid reads — `eDamage!AT42:AY59`. */
export const DAMAGE_CARDS = [
  'Damage',
  'Damage Mastery',
  'Berserker',
  'Attack Speed',
  'Attack Speed Mastery',
  'Critical Chance',
  'Critical Chance Mastery',
  'Range',
  'Range Mastery',
  'Enemy Balance',
  'Super Tower',
  'Super Tower Mastery',
  'Ultimate Crit',
  'Ultimate Crit Mastery',
  'Demon Mode Mastery',
  'Area of Effect',
] as const

export type DamageCard = typeof DAMAGE_CARDS[number]

/**
 * A card as the grid reads it.
 *
 * `active` is column `AY` — whether it is in the preset — and `level` is the
 * digit the sheet pulls off `"Lvl 4"` with `RIGHT(...,1)`.
 */
export interface DamageCardSource {
  active: boolean
  level: number
  /** `AV` — the card's own value at that level, where a formula reads it. */
  value: number
}

/** The perks the damage grid reads — `eDamage!AT63:AY71`. */
export const DAMAGE_PERKS = [
  'Damage',
  'Bounce Shot',
  'Boss Health Trade-off',
  'Enemy Damage Trade-off',
  'Death Wave Quantity',
  'Spotlight Damage Bonus',
  'More Smart Missiles',
  'Chain Lightning Damage',
  'Extra Inner Mines',
] as const

export type DamagePerk = typeof DAMAGE_PERKS[number]

/** The ultimate weapons, at `eDamage` rows 30 to 37. */
export const DAMAGE_ULTIMATE_WEAPONS = [
  'Death Wave',
  'Chain Lightning',
  'Smart Missiles',
  'Spotlight',
  'Spotlight Missiles',
  'Poison Swamp',
  'Chrono Field',
  'Inner Land Mines',
] as const

export type DamageUltimateWeapon = typeof DAMAGE_ULTIMATE_WEAPONS[number]

/**
 * One ultimate weapon's row.
 *
 * The three stats are always damage, then the weapon's quantity-or-equivalent,
 * then its cooldown-or-equivalent — `BI`, `BJ` and `BK`. `plus` is the `BL`
 * column, which reads the string `"Locked"` until the weapon's `+` is bought;
 * `null` here means the same thing.
 */
export interface DamageUltimateWeaponSource {
  /** `BH` — whether it is unlocked and enabled. */
  unlocked: boolean
  /** `BI`. */
  damage: number
  /** `BJ`. */
  quantity: number
  /** `BK`. */
  cooldown: number
  /** `BL`, or `null` for `"Locked"`. */
  plus: number | null
}

export const ZERO_ULTIMATE_WEAPON_SOURCE: DamageUltimateWeaponSource = {
  unlocked: false,
  damage: 0,
  quantity: 0,
  cooldown: 1,
  plus: null,
}

// ---------------------------------------------------------------------------
// The whole thing
// ---------------------------------------------------------------------------

export interface EffectiveDamageConfig {
  /** `AX19`. */
  runType: DamageRunType
  /**
   * `AX20` — the tier being simulated, which is the string `"Tourney"` on a
   * tournament run. The perk gate runs through this rather than off `runType`
   * directly, which is not where you would look for it.
   */
  simulatedTier: string

  /** `AY21`. */
  gameSpeed: number
  /** `AY22` — how far up the range band the damage-per-meter bonus is taken. */
  damageAtRangePct: number
  /**
   * `CX7` — how long a wave lasts, which Amplifying Strike is spread over and
   * which the Galaxy Compressor's time saving is measured against.
   */
  waveDurationSeconds: number
  /** `CX10` — enemy spawns a second, for Space Displacer's land mines. */
  enemySpawnsPerSecond: number
  /** `CX6` — the flat ultimate weapon damage bonus. */
  ultimateWeaponAdditionalDamage: number

  /** `AN55` — the tower's own damage, before anything multiplies it. */
  towerDamageBase: number
  /** `AN58`. */
  criticalFactorBase: number
  /** `AN67`. */
  superCritChanceBase: number
  /** `AN68`. */
  superCritMultiBase: number
  /** `AN70` — the wave accelerator's recovery contribution. */
  waveAcceleratorRecovery: number
  /** `AY34` — coins in hand, which Perfect Freeze scales off. */
  cash: number

  stats: Readonly<Record<DamageWorkshopStat, DamageStatSource>>
  modules: Readonly<Record<ModuleSlot, DamageModuleSource>>
  substats: Readonly<Record<DamageSubstat, SubstatPair>>
  uniques: Readonly<Record<DamageModuleUnique, SubstatPair>>

  /** `AY39` — the master switch. With it off no card counts, whatever its own. */
  cardsEquipped: boolean
  cards: Readonly<Record<DamageCard, DamageCardSource>>

  /** `AY61` — the master switch for perks, and the tournament gate. */
  perksEquipped: boolean
  perks: Readonly<Record<DamagePerk, boolean>>
  /** `AV63` and `AV64` — how many of the two stacking perks are taken. */
  perkQuantity: { damage: number, bounceShot: number }
  /** `AX64` — what one Bounce Shot perk is worth in targets. */
  bounceShotPerkTargets: number

  ultimateWeapons: Readonly<Record<DamageUltimateWeapon, DamageUltimateWeaponSource>>

  /** `BH25` — the base land mine chance, which Space Displacer converts. */
  landMineChance: number

  /**
   * `AY35` — how much of an enemy's health Amplifying Strike is set against.
   * A player estimate; the term is capped at five times damage regardless.
   */
  ampStrikeShare: number

  /** `AL75` — whether the Shock Multiplier is unlocked at all. */
  shockMultiplierUnlocked: boolean
  /** `AL69` — whether Rend Armour is in play. */
  hasRendArmour: boolean

  /** `AY8` — how many Spotlights are on the field. */
  spotlightQuantity: number
  /** `BL39` and `BM39` — the relic and vault bonuses to ultimate weapon damage. */
  ultimateWeaponDamageRelicPct: number
  ultimateWeaponDamageVaultPct: number

  /**
   * The shockwave, which spreads the Cannon module's bonus — `EPD_SHOCKWAVE_DAMAGE`.
   *
   * Its size and frequency come from two different workshop rows, and both the
   * vault and a substat shorten the frequency.
   */
  shockwave: {
    /** `BG23`. */
    sizeWorkshopLevel: number
    /** `BC23` — the size lab. */
    sizeLabLevel: number
    /** `BG24`. */
    frequencyWorkshopLevel: number
    /** `BM24`, which arrives negative. */
    frequencyVault: number
  }

  /**
   * How many times a weapon is assumed to hit the same target, which is what
   * its `+` heat-up scales off — `AY29` through `AY37`.
   */
  heatUpHits: {
    smartMissiles: number
    poisonSwamp: number
    innerLandMines: number
  }

  /**
   * Recovery packages, which shorten every cooldown by shortening the wave —
   * the `EC` column. Only the Galaxy Compressor pair moves it.
   */
  recovery: {
    /** `BF26` — the recovery package duration bonus. */
    durationBonus: number
    /** `BC27` — whether the boss-wave variant applies. */
    bossWave: boolean
    /** `AY28`. */
    bossWaveDivisor: number
  }

  /**
   * Dissonance, which multiplies the attack and ultimate weapon halves by
   * different amounts — see `effective-paths-ehp-model.ts` for the shared
   * wave-to-bonus curve.
   */
  dissonance: {
    active: boolean
    tierPersonalBest: number
    allTierPersonalBests: readonly number[]
  }
}

/**
 * A config with everything switched off.
 *
 * Not a sensible player — a starting point to spread over, so a caller
 * supplying six fields does not have to write the other sixty.
 */
export function zeroEffectiveDamageConfig(): EffectiveDamageConfig {
  const fromKeys = <K extends string, V>(keys: readonly K[], value: () => V) =>
    Object.fromEntries(keys.map(key => [key, value()])) as Record<K, V>

  return {
    runType: 'Regular',
    simulatedTier: '1',
    gameSpeed: 1,
    damageAtRangePct: 0.25,
    waveDurationSeconds: 35,
    enemySpawnsPerSecond: 0,
    ultimateWeaponAdditionalDamage: 0,
    towerDamageBase: 1,
    criticalFactorBase: 1,
    superCritChanceBase: 0,
    superCritMultiBase: 1,
    waveAcceleratorRecovery: 0,
    cash: 0,
    stats: fromKeys(DAMAGE_WORKSHOP_STATS, () => ({ ...ZERO_DAMAGE_STAT_SOURCE })),
    modules: fromKeys(MODULE_SLOTS, () => ({ ...ZERO_DAMAGE_MODULE_SOURCE })),
    substats: fromKeys(DAMAGE_SUBSTATS, () => ({ primary: 0, assist: 0 })),
    uniques: fromKeys(DAMAGE_MODULE_UNIQUES, () => ({ primary: 0, assist: 0 })),
    cardsEquipped: false,
    cards: fromKeys(DAMAGE_CARDS, () => ({ active: false, level: 0, value: 0 })),
    perksEquipped: false,
    perks: fromKeys(DAMAGE_PERKS, () => false),
    perkQuantity: { damage: 0, bounceShot: 0 },
    bounceShotPerkTargets: 0,
    ultimateWeapons: fromKeys(
      DAMAGE_ULTIMATE_WEAPONS, () => ({ ...ZERO_ULTIMATE_WEAPON_SOURCE }),
    ),
    landMineChance: 0,
    ampStrikeShare: 0,
    shockMultiplierUnlocked: false,
    hasRendArmour: false,
    spotlightQuantity: 0,
    ultimateWeaponDamageRelicPct: 0,
    ultimateWeaponDamageVaultPct: 0,
    shockwave: {
      sizeWorkshopLevel: 0,
      sizeLabLevel: 0,
      frequencyWorkshopLevel: 0,
      frequencyVault: 0,
    },
    heatUpHits: { smartMissiles: 1, poisonSwamp: 1, innerLandMines: 1 },
    recovery: { durationBonus: 0, bossWave: false, bossWaveDivisor: 1 },
    dissonance: { active: false, tierPersonalBest: 0, allTierPersonalBests: [] },
  }
}
