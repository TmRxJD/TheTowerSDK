import { describe, expect, it } from 'vitest'
import { computeEffectiveDamage } from './effective-paths-edamage-compute'
import {
  DAMAGE_SUBSTATS,
  DAMAGE_WORKSHOP_STATS,
  ZERO_DAMAGE_STAT_SOURCE,
  zeroEffectiveDamageConfig,
} from './effective-paths-edamage-config'
import type {
  DamageCard,
  DamageModuleUnique,
  DamagePerk,
  DamageSubstat,
  DamageUltimateWeapon,
  DamageWorkshopStat,
  EffectiveDamageConfig,
  ModuleSlot,
} from './effective-paths-edamage-config'
import { ZERO_EFFECTIVE_DAMAGE_LEVELS } from './effective-paths-edamage-levels'
import type { EffectiveDamageLevels } from './effective-paths-edamage-levels'
import type { DamageRunType } from './effective-paths-damage-base'
import cells from './effective-paths-edamage.fixtures.json'

/**
 * Effective damage against the sheet's own grid.
 *
 * The fixture is a raw dump of `eDamage` — every input cell and every output
 * column, exactly as the live sheet had them. The config is assembled here, in
 * type-checked code, so the thing under test is the mapping from cells to
 * model and not a second copy of it written in the dump script.
 *
 * **What this covers.** The sheet's own state is an untouched account: no
 * ultimate weapon is unlocked, so `EO5` is zero and `ED5` and `ER5` are one.
 * That exercises the base, both crit factors, the whole bullet multiplier and
 * the composition — but *not* the ultimate weapon half end to end. That half
 * is covered instead by `effective-paths-uw-dps.test.ts`, whose every case was
 * evaluated by the sheet's own lambdas. Saying so here rather than letting a
 * green suite imply more than it proves.
 */

const cell = (ref: string): number => {
  const value = (cells as Record<string, unknown>)[ref]
  return typeof value === 'number' ? value : 0
}
const flag = (ref: string): boolean => (cells as Record<string, unknown>)[ref] === true
const text = (ref: string): string => String((cells as Record<string, unknown>)[ref] ?? '')
/** The sheet reads a card's level as the last character of `"Lvl 4"`. */
const cardLevel = (ref: string): number => Number(text(ref).slice(-1)) || 0

/** The workshop block's rows — column `BB`. */
const WORKSHOP_ROW: Record<DamageWorkshopStat, number> = {
  'Damage': 8,
  'Attack Speed': 9,
  'Critical Chance': 10,
  'Critical Factor': 11,
  'Range': 12,
  'Damage / Meter': 13,
  'Multishot Chance': 14,
  'Multishot Targets': 15,
  'Rapid Fire Chance': 16,
  'Rapid Fire Duration': 17,
  'Bounce Shot Chance': 18,
  'Bounce Shot Targets': 19,
  'Super Critical Chance': 20,
  'Super Critical Mult': 21,
  'Max Rend Armor Multiplier': 22,
}

/** The substat block's rows — column `AL`. A different order, deliberately. */
const SUBSTAT_ROW: Record<DamageSubstat, number> = {
  'Attack Speed': 9,
  'Critical Chance': 10,
  'Critical Factor': 11,
  'Attack Range': 12,
  'Damage / Meter': 13,
  'Super Crit Chance': 14,
  'Super Crit Multi': 15,
  'Max Rend Armor Multi': 16,
  'MultiShot Chance': 17,
  'Multishot Targets': 18,
  'Rapid Fire Chance': 19,
  'Rapid Fire Duration': 20,
  'Bounce Shot Chance': 21,
  'Bounce Shot Targets': 22,
  'Death Wave - Damage': 26,
  'Death Wave - Quantity': 27,
  'Death Wave - Cooldown': 28,
  'Spotlight - Bonus': 29,
  'Spotlight - Angle': 30,
  'Smart Missiles - Damage': 31,
  'Smart Missiles - Quantity': 32,
  'Smart Missiles - Cooldown': 33,
  'Chain Lightning - Damage': 34,
  'Chain Lightning - Quantity': 35,
  'Chain Lightning - Chance': 36,
  'Poison Swamp - Damage': 37,
  'Chrono Field - Speed Reduction': 38,
  'Inner Land Mines - Damage': 39,
  'Inner Land Mines - Quantity': 40,
  'Inner Land Mines - Cooldown': 41,
  'Shockwave Frequency': 51,
  'Land Mine Chance': 52,
}

const UNIQUE_ROW: Record<DamageModuleUnique, number> = {
  'Astral Deliverance': 6,
  'Being Annihilator': 7,
  'Amplifying Strike': 8,
  'Dimension Core': 25,
  'Galaxy Compressor': 44,
  'Project Funding': 45,
  'Anti-Cube Portal': 49,
  'Space Displacer': 50,
}

const CARD_ROW: Record<DamageCard, number> = {
  'Damage': 42,
  'Damage Mastery': 43,
  'Berserker': 44,
  'Attack Speed': 45,
  'Attack Speed Mastery': 46,
  'Critical Chance': 47,
  'Critical Chance Mastery': 48,
  'Range': 49,
  'Range Mastery': 50,
  'Enemy Balance': 51,
  'Super Tower': 52,
  'Super Tower Mastery': 53,
  'Ultimate Crit': 54,
  'Ultimate Crit Mastery': 55,
  'Demon Mode Mastery': 58,
  'Area of Effect': 59,
}

const PERK_ROW: Record<DamagePerk, number> = {
  'Damage': 63,
  'Bounce Shot': 64,
  'Boss Health Trade-off': 65,
  'Enemy Damage Trade-off': 66,
  'Death Wave Quantity': 67,
  'Spotlight Damage Bonus': 68,
  'More Smart Missiles': 69,
  'Chain Lightning Damage': 70,
  'Extra Inner Mines': 71,
}

const WEAPON_ROW: Record<DamageUltimateWeapon, number> = {
  'Death Wave': 30,
  'Chain Lightning': 31,
  'Smart Missiles': 32,
  'Spotlight': 33,
  'Spotlight Missiles': 34,
  'Poison Swamp': 35,
  'Chrono Field': 36,
  'Inner Land Mines': 37,
}

/** The module blocks, and the two stone ladders each one has. */
const MODULE_ROW: Record<ModuleSlot, { block: number, bonus: number, substat: number }> = {
  cannon: { block: 4, bonus: 41, substat: 42 },
  armor: { block: 47, bonus: 43, substat: 44 },
  generator: { block: 42, bonus: 45, substat: 46 },
  core: { block: 23, bonus: 47, substat: 48 },
}

function configFromSheet(): EffectiveDamageConfig {
  const zero = zeroEffectiveDamageConfig()

  const stats = { ...zero.stats } as Record<DamageWorkshopStat, typeof ZERO_DAMAGE_STAT_SOURCE>
  for (const name of DAMAGE_WORKSHOP_STATS) {
    const row = WORKSHOP_ROW[name]
    stats[name] = {
      workshopLevel: cell(`BG${row}`),
      workshopValue: cell(`BH${row}`),
      enhancementLevel: cell(`BI${row}`),
      enhancementMultiplier: cell(`BK${row}`) || 1,
      relicPct: cell(`BL${row}`),
      vaultPct: cell(`BM${row}`),
    }
  }

  const substats = { ...zero.substats } as Record<DamageSubstat, { primary: number, assist: number }>
  for (const name of DAMAGE_SUBSTATS) {
    const row = SUBSTAT_ROW[name]
    substats[name] = { primary: cell(`AM${row}`), assist: cell(`AO${row}`) }
  }

  const uniques = { ...zero.uniques }
  for (const [name, row] of Object.entries(UNIQUE_ROW))
    uniques[name as DamageModuleUnique] = { primary: cell(`AM${row}`), assist: cell(`AR${row}`) }

  const modules = { ...zero.modules }
  for (const [slot, rows] of Object.entries(MODULE_ROW))
    modules[slot as ModuleSlot] = {
      primaryBonus: cell(`AM${rows.block}`),
      hasAssist: flag(`AN${rows.block}`),
      assistBonus: cell(`AO${rows.block}`),
      bonusStoneLevel: cell(`BL${rows.bonus}`),
      substatStoneLevel: cell(`BL${rows.substat}`),
    }

  const cards = { ...zero.cards }
  for (const [name, row] of Object.entries(CARD_ROW))
    cards[name as DamageCard] = {
      active: flag(`AY${row}`),
      level: cardLevel(`AU${row}`),
      value: cell(`AV${row}`),
    }

  const perks = { ...zero.perks }
  for (const [name, row] of Object.entries(PERK_ROW))
    perks[name as DamagePerk] = flag(`AY${row}`)

  const ultimateWeapons = { ...zero.ultimateWeapons }
  for (const [name, row] of Object.entries(WEAPON_ROW)) {
    const plus = (cells as Record<string, unknown>)[`BL${row}`]
    ultimateWeapons[name as DamageUltimateWeapon] = {
      unlocked: flag(`BH${row}`),
      damage: cell(`BI${row}`),
      quantity: cell(`BJ${row}`),
      cooldown: cell(`BK${row}`) || 1,
      plus: typeof plus === 'number' ? plus : null,
    }
  }

  return {
    ...zero,
    runType: text('AX19') as DamageRunType,
    simulatedTier: text('AX20'),
    gameSpeed: cell('AY21'),
    damageAtRangePct: cell('AY22'),
    waveDurationSeconds: cell('CX7'),
    enemySpawnsPerSecond: cell('CX10'),
    ultimateWeaponAdditionalDamage: cell('CX6'),
    towerDamageBase: cell('AN55'),
    criticalFactorBase: cell('AN58'),
    superCritChanceBase: cell('AN67'),
    superCritMultiBase: cell('AN68'),
    waveAcceleratorRecovery: cell('AN70'),
    cash: cell('AY34'),
    stats,
    modules,
    substats,
    uniques,
    cardsEquipped: flag('AY39'),
    cards,
    perksEquipped: flag('AY61'),
    perks,
    perkQuantity: { damage: cell('AV63'), bounceShot: cell('AV64') },
    bounceShotPerkTargets: cell('AX64'),
    ultimateWeapons,
    landMineChance: cell('BH25'),
    ampStrikeShare: cell('AY35'),
    shockMultiplierUnlocked: flag('AL75'),
    hasRendArmour: flag('AL69'),
    spotlightQuantity: cell('AY8'),
    ultimateWeaponDamageRelicPct: cell('BL39'),
    ultimateWeaponDamageVaultPct: cell('BM39'),
    shockwave: {
      sizeWorkshopLevel: cell('BG23'),
      sizeLabLevel: cell('BC23'),
      frequencyWorkshopLevel: cell('BG24'),
      frequencyVault: cell('BM24'),
    },
    heatUpHits: {
      smartMissiles: cell('AY30'),
      poisonSwamp: cell('AY32'),
      innerLandMines: cell('AY37'),
    },
    recovery: {
      durationBonus: cell('BF26'),
      bossWave: cell('BC27') === 1,
      bossWaveDivisor: cell('AY28') || 1,
    },
    dissonance: { active: false, tierPersonalBest: 0, allTierPersonalBests: [] },
  }
}

/** Row 5 is the "current levels" row, so the levels are the player's own. */
function levelsFromSheet(): EffectiveDamageLevels {
  const base = ZERO_EFFECTIVE_DAMAGE_LEVELS
  return {
    ...base,
    lab: {
      ...base.lab,
      damage: cell('BO5'),
      damageMastery: cell('BP5'),
      standardPerksBonus: cell('BQ5'),
      improveTradeOffPerks: cell('BR5'),
      shockMultiplier: cell('BS5'),
      demonModeMastery: cell('BT5'),
      criticalChanceMastery: cell('BU5'),
      criticalFactor: cell('BV5'),
      superCritChance: cell('BW5'),
      superCritMulti: cell('BX5'),
      startingCash: cell('BY5'),
      attackSpeed: cell('BZ5'),
      attackSpeedMastery: cell('CA5'),
      range: cell('CB5'),
      damagePerMeter: cell('CC5'),
      rangeMastery: cell('CD5'),
      superTowerBonus: cell('CE5'),
      superTowerMastery: cell('CF5'),
      maxRendArmorMultiplier: cell('CG5'),
      spotlightMissiles: cell('CH5'),
      swampRend: cell('CI5'),
      deathWaveDamageAmplifier: cell('CJ5'),
      missileAmplifier: cell('CK5'),
      innerLandMineChronoJump: cell('CL5'),
      ultimateCritMastery: cell('CM5'),
      assistBonusCannon: cell('CN5'),
      assistSubstatCannon: cell('CO5'),
      assistSubstatArmor: cell('CP5'),
      assistBonusCore: cell('CR5'),
      assistSubstatCore: cell('CS5'),
      dissonantEchoAttack: cell('CT5'),
      dissonantEchoUltimateWeapons: cell('CU5'),
    },
    /**
     * The vault, read the way the sheet reads it — a bonus divided by the
     * node's per-level percentage, which is `eDamage Keys!BO5 = BM8 / 5%`.
     */
    keys: {
      damage: cell('BM8') / 0.05,
      criticalChance: cell('BM10') / 0.01,
      criticalFactor: cell('BM11') / 0.05,
      superCritChance: cell('BM20') / 0.02,
      superCritMult: cell('BM21') / 0.05,
      attackSpeed: cell('BM9') / 0.05,
      multishotChance: cell('BM14') / 0.04,
      damagePerMeter: cell('BM13') / 0.05,
      rapidFireChance: cell('BM16') / 0.04,
      bounceShotChance: cell('BM18') / 0.04,
      ultimateWeaponDamage: cell('BM39') / 0.05,
    },
    stone: {
      ...base.stone,
      assistBonusCannonStone: cell('BL41'),
      assistSubstatCannonStone: cell('BL42'),
      assistSubstatArmorStone: cell('BL44'),
      assistBonusCoreStone: cell('BL47'),
      assistSubstatCoreStone: cell('BL48'),
    },
  }
}

describe('effective damage, against the live grid', () => {
  const result = computeEffectiveDamage(configFromSheet(), levelsFromSheet())

  const factors: Array<[string, keyof typeof result, string]> = [
    ['DI5', 'base', 'the base'],
    ['DN5', 'crit', 'the bullet crit'],
    ['DO5', 'ultimateWeaponCrit', 'the ultimate weapon crit'],
    ['EA5', 'bulletDamageMultiplier', 'the bullet multiplier'],
    ['ED5', 'spotlight', 'Spotlight'],
    ['EO5', 'ultimateWeapons', 'the ultimate weapons'],
    ['ER5', 'slow', 'the slow'],
    ['ES5', 'effectiveDamage', 'effective damage'],
  ]

  for (const [ref, key, what] of factors) {
    it(`matches ${what} — ${ref}`, () => {
      expect(result[key]).toBeCloseTo(cell(ref), 6)
    })
  }

  it('composes the two halves by adding them', () => {
    // The shape the whole model turns on, checked against the sheet's own
    // numbers rather than restated: DI × (DN × EA × ED + EO × DO) × ER.
    const expected = result.base
      * (result.crit * result.bulletDamageMultiplier * result.spotlight
        + result.ultimateWeapons * result.ultimateWeaponCrit)
      * result.slow
    expect(result.effectiveDamage).toBeCloseTo(expected, 9)
  })

  it('reads an account with no ultimate weapons, which bounds what this proves', () => {
    // If the fixture is ever refreshed from a developed account these should
    // start failing — at which point the end-to-end coverage got better, and
    // the docstring above needs rewriting rather than these expectations.
    expect(cell('EO5')).toBe(0)
    expect(cell('ED5')).toBe(1)
    expect(cell('ER5')).toBe(1)
  })
})

describe('an Attack Dissonance run', () => {
  it('keeps only the shockwave and Amp Strike in the base', () => {
    // The tower does not fire, so every bullet stat drops out — but the run
    // still has a number, which is the point of adding the halves.
    const config = configFromSheet()
    const levels = levelsFromSheet()
    const regular = computeEffectiveDamage({ ...config, runType: 'Regular' }, levels)
    const disso = computeEffectiveDamage({ ...config, runType: 'Attack Disso' }, levels)

    expect(disso.base).toBeLessThan(regular.base)
    expect(disso.crit).toBe(1)
    expect(disso.ultimateWeaponCrit).toBe(1)
  })
})
