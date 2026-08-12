/**
 * Effective Paths — effective damage, end to end.
 *
 * `eDamage!ES5` is one multiplication of seven factors, and every one of those
 * is a column of its own reading a dozen more. This walks the grid in the
 * sheet's own order: the base, the crit pair, the bullet multiplier, Spotlight,
 * the ultimate weapons and the slow — with each step named for the column it
 * comes from, so it can be checked cell by cell.
 *
 * The one thing worth knowing before reading it: the two halves are **added**,
 * not multiplied. Bullets and ultimate weapons are separate sources of damage,
 * which is why a player with no ultimate weapons still has a number and why an
 * Attack Dissonance run — where the tower does not fire at all — still has one.
 */

import {
  ampStrike,
  damageBase,
  demonModeMastery,
  perfectFreeze,
  perfectFreezeCash,
  shockMultiplier,
  standardDamagePerk,
  towerDamage,
  tradeOffDamagePerk,
} from './effective-paths-damage-base'
import {
  areaOfEffectCardBoost,
  attackRange,
  attackSpeed,
  bounceShotChance,
  bounceShotMultiplier,
  bounceShotTargets,
  criticalChance,
  criticalMultiplier,
  damagePerMeter,
  maxRendArmourMultiplier,
  multishotChance,
  multishotMultiplier,
  multishotTargets,
  rangeDamageMultiplier,
  rapidFireChance,
  rapidFireDuration,
  rapidFireMultiplier,
  shockwaveDamage,
  spotlightCoverage,
  superTowerBonus,
  superTowerCooldown,
  superTowerEffectiveBonus,
  superTowerEffectiveUltimateBonus,
  ultimateWeaponCriticalMultiplier,
} from './effective-paths-damage-stats'
import { bulletsPerSecond } from './effective-paths-damage-substats'
import { bulletDamageMultiplier, composeEffectiveDamage, damageRunEffects } from './effective-paths-edamage-model'
import { assistSubstatCap, moduleBonus } from './effective-paths-generics'
import {
  chainLightningChance,
  chainLightningDamage,
  chainLightningQuantity,
  deathWaveCooldown,
  deathWaveDamage,
  deathWaveQuantity,
  innerLandMineDamage,
  innerLandMineQuantity,
  smartMissileCooldown,
  smartMissileDamage,
  smartMissileQuantity,
  spotlightAngle,
  spotlightDamage,
  spotlightLightRange,
  ultimateWeaponHeatUp,
  ultimateWeaponTotalDamage,
} from './effective-paths-ultimate-weapons'
import {
  chainLightningDps,
  deathWaveDps,
  innerLandMinesDps,
  poisonSwampDps,
  smartMissilesDps,
  spotlightFinalBonus,
  spotlightMissilesDps,
} from './effective-paths-uw-dps'
import { dissonantBoostOfType } from './effective-paths-ehp-model'
import { computeModuleStat } from '../data/module-bonus'
import { KEYS_CANDIDATE_NODES } from './effective-paths-edamage-costs'
import type {
  DamageSubstat,
  EffectiveDamageConfig,
  ModuleSlot,
} from './effective-paths-edamage-config'
import type { EffectiveDamageLevels } from './effective-paths-edamage-levels'

/**
 * Every factor of `ES5`, kept rather than collapsed.
 *
 * A planner only needs the last field, but a player looking at a path wants to
 * know *which* half moved — and a test comparing against the sheet can compare
 * a column at a time instead of bisecting one number.
 */
export interface EffectiveDamageBreakdown {
  /** `DI5`. */
  base: number
  /** `DN5`. */
  crit: number
  /** `DO5`. */
  ultimateWeaponCrit: number
  /** `EA5`. */
  bulletDamageMultiplier: number
  /** `ED5`. */
  spotlight: number
  /** `EO5`. */
  ultimateWeapons: number
  /** `ER5`. */
  slow: number
  /** `ES5`. */
  effectiveDamage: number
}

/**
 * `eDamage!ES5` — effective damage for a player at a given set of levels.
 *
 * `config` is who the player is; `levels` is what the path has bought so far.
 * Anything a path can buy lives in `levels` and *only* there, so a planner
 * moving a level never has to touch the config.
 */
export function computeEffectiveDamage(
  config: EffectiveDamageConfig,
  levels: EffectiveDamageLevels,
): EffectiveDamageBreakdown {
  const run = damageRunEffects(config.runType)
  const lab = levels.lab

  /**
   * A stat's four sources, with the vault share taken from `levels.keys`.
   *
   * The vault is the keys path's whole inventory, so its bonus has to move as
   * the path buys — the sheet reads the relationship the other way round and
   * *derives* the level from the bonus (`eDamage Keys!BO5 = BM8 / 5%`), which
   * is the same relationship read backwards. A `vaultPct` on the config would
   * be a second, stale copy of it, so for these ten stats it is ignored.
   */
  const stat = (name: Parameters<typeof statOf>[1]) => {
    const source = statOf(config, name)
    const keysKey = KEYS_STAT_LEVELS[name]
    if (!keysKey) return source
    const node = KEYS_CANDIDATE_NODES[keysKey.sheetName]
    return { ...source, vaultPct: levels.keys[keysKey.key] * node.perLevel }
  }

  // --- Assist capacities -------------------------------------------------
  // How much of an assist module's substat counts, per module. The stone half
  // is bought by the stone path and the lab half by the lab and coin paths,
  // and the two add rather than replacing each other.
  const capacity = (slot: ModuleSlot): number => {
    const module = config.modules[slot]
    const stone = slot === 'cannon'
      ? levels.stone.assistSubstatCannonStone
      : slot === 'core'
        ? levels.stone.assistSubstatCoreStone
        : slot === 'armor'
          ? levels.stone.assistSubstatArmorStone
          : module.substatStoneLevel
    const labLevel = slot === 'cannon'
      ? lab.assistSubstatCannon + levels.coin.assistSubstatCannon
      : slot === 'core'
        ? lab.assistSubstatCore + levels.coin.assistSubstatCore
        : slot === 'armor'
          ? lab.assistSubstatArmor + levels.coin.assistSubstatArmor
          : 0
    return assistSubstatCap(module.hasAssist, stone, labLevel)
  }

  const cannonCapacity = capacity('cannon')
  const coreCapacity = capacity('core')
  const armorCapacity = capacity('armor')

  /** `AM_n + capacity × AO_n` — a substat with its assist half weighted. */
  const substat = (name: DamageSubstat, capacityValue: number): number => {
    const pair = config.substats[name]
    return pair.primary + capacityValue * pair.assist
  }
  const cannonSubstat = (name: DamageSubstat) => substat(name, cannonCapacity)
  const coreSubstat = (name: DamageSubstat) => substat(name, coreCapacity)

  /** `AM_n + AR_n` — a unique effect, which both modules can carry. */
  const unique = (name: Parameters<typeof uniqueOf>[1]) => uniqueOf(config, name)

  const card = (name: Parameters<typeof cardOf>[1]) => cardOf(config, name)
  const perk = (name: Parameters<typeof perkOf>[1]) =>
    run.perksApply && config.perksEquipped && config.perks[name]

  // --- Dissonance --------------------------------------------------------
  const dissonanceBoost = (type: 'attack' | 'uw', level: number): number =>
    config.dissonance.active
      ? dissonantBoostOfType(
          type,
          config.dissonance.tierPersonalBest,
          config.dissonance.allTierPersonalBests,
          level,
        )
      : 1

  /** `CY5`. */
  const attackDisco = dissonanceBoost(
    'attack', lab.dissonantEchoAttack + levels.coin.dissonantEchoAttack,
  )
  /** `EB5`. */
  const ultimateDisco = dissonanceBoost(
    'uw',
    lab.dissonantEchoUltimateWeapons + levels.coin.dissonantEchoUltimateWeapons,
  )

  // --- The base, CZ5 through DI5 ----------------------------------------

  /** `DG5` — Perfect Freeze, which is also divided back out of `CZ5`. */
  const freeze = perfectFreeze({
    substat: unique('Project Funding'),
    cash: perfectFreezeCash(config.runType, lab.startingCash, config.cash),
  })

  /** `CZ5`. */
  const damage = towerDamage({
    baseDamage: config.towerDamageBase / (freeze || 1),
    labLevel: lab.damage,
    enhancementMultiplier: stat('Damage').enhancementMultiplier,
    hasDamageCard: config.cardsEquipped && card('Damage').active,
    cardValue: card('Damage').value,
    hasCardMastery: card('Damage Mastery').active,
    masteryLevel: lab.damageMastery,
    dissonance: attackDisco,
  })

  /**
   * A module's bonus at the level the path has taken it to, when the rarity is
   * known. The coin path buys module levels, so this has to move with them.
   */
  const atLevel = (
    type: 'cannon' | 'core', rarity: string | undefined, level: number, fallback: number,
  ): number => (rarity && level > 0
    ? computeModuleStat({ type, rarityLabel: rarity, level })
    : fallback)

  /** `DE5` — the Cannon module pair. */
  const cannonModule = moduleBonus({
    primaryBonus: atLevel(
      'cannon', config.modules.cannon.primaryRarity,
      levels.coin.primaryModuleCannon, config.modules.cannon.primaryBonus,
    ),
    hasAssist: config.modules.cannon.hasAssist,
    assistBonus: atLevel(
      'cannon', config.modules.cannon.assistRarity,
      levels.coin.assistModuleCannon, config.modules.cannon.assistBonus,
    ),
    stoneBonusCap: levels.stone.assistBonusCannonStone,
    labBonusCap: lab.assistBonusCannon + levels.coin.assistBonusCannon,
  })

  /** `DF5` — the shockwave, which is how the Cannon bonus reaches the field. */
  const shockwave = shockwaveDamage({
    cannonBonus: unique('Anti-Cube Portal'),
    sizeWorkshopLevel: config.shockwave.sizeWorkshopLevel,
    sizeLabLevel: config.shockwave.sizeLabLevel,
    frequencyWorkshopLevel: config.shockwave.frequencyWorkshopLevel,
    frequencyVault: config.shockwave.frequencyVault,
    frequencySubstat: substat('Shockwave Frequency', armorCapacity),
  })

  const base = damageBase({
    runType: config.runType,
    towerDamage: damage,
    damagePerk: standardDamagePerk(
      perk('Damage'), lab.standardPerksBonus, config.perkQuantity.damage,
    ),
    tradeOffPerk: tradeOffDamagePerk(
      perk('Boss Health Trade-off'), lab.improveTradeOffPerks,
    ),
    shock: shockMultiplier({
      hasShock: config.shockMultiplierUnlocked
        && config.ultimateWeapons['Chain Lightning'].unlocked,
      labLevel: lab.shockMultiplier,
      deathChainSubstat: unique('Dimension Core'),
    }),
    demonModeMastery: demonModeMastery(
      card('Demon Mode Mastery').active, lab.demonModeMastery + levels.coin.demonModeMastery,
    ),
    cannonAssist: cannonModule,
    shockwave,
    perfectFreeze: freeze,
    ampStrike: ampStrike({
      share: config.ampStrikeShare,
      substat: unique('Amplifying Strike'),
      divisor: config.waveDurationSeconds,
    }),
  })

  // --- The crit pair, DJ5 through DO5 -----------------------------------

  const critChanceMasteryLevel
    = lab.criticalChanceMastery + levels.coin.criticalChanceMastery

  // `DJ5` — every one of the four crit columns opens with the same Attack
  // Dissonance guard. The tower does not fire, so there is nothing to crit.
  const critInput = {
    criticalChance: config.runType === 'Attack Disso' ? 0 : criticalChance({
      workshopLevel: stat('Critical Chance').workshopLevel,
      hasCriticalChanceCard: config.cardsEquipped && card('Critical Chance').active,
      cardLevel: card('Critical Chance').level,
      relicPct: stat('Critical Chance').relicPct,
      vaultPct: stat('Critical Chance').vaultPct,
      substat: cannonSubstat('Critical Chance'),
      hasCardMastery: card('Critical Chance Mastery').active,
      masteryLevel: critChanceMasteryLevel,
    }),
    criticalFactor: critFactor(),
    superCritChance: superCritChance(),
    superCritMultiplier: superCritMultiplier(),
  }

  function critFactor(): number {
    if (config.runType === 'Attack Disso') return 1
    const source = stat('Critical Factor')
    return (config.criticalFactorBase * (1 + 0.03 * lab.criticalFactor)
      + cannonSubstat('Critical Factor'))
      * source.enhancementMultiplier
      * (1 + source.relicPct)
      * (1 + source.vaultPct)
  }

  function superCritChance(): number {
    if (config.runType === 'Attack Disso') return 0
    return config.superCritChanceBase
      + cannonSubstat('Super Crit Chance')
      + 0.001 * lab.superCritChance
      + (card('Critical Chance Mastery').active ? 0.01 * (1 + critChanceMasteryLevel) : 0)
      + unique('Being Annihilator')
  }

  function superCritMultiplier(): number {
    if (config.runType === 'Attack Disso') return 1
    const source = stat('Super Critical Mult')
    const mastery = card('Critical Chance Mastery').active
      ? 1 + 0.01 * (1 + critChanceMasteryLevel)
      : 1
    return (config.superCritMultiBase * (1 + 0.02 * lab.superCritMulti)
      + cannonSubstat('Super Crit Multi'))
      * source.enhancementMultiplier
      * (1 + source.relicPct)
      * (1 + source.vaultPct)
      * mastery
  }

  /** `DN5`. Being Annihilator lets bullets crit five times over. */
  const crit = criticalMultiplier({
    ...critInput,
    beingAnnihilator: unique('Being Annihilator') ? 5 : 0,
  })
  /** `DO5` — the ultimate weapons' own crit, which Being Annihilator misses. */
  const uwCrit = ultimateWeaponCriticalMultiplier(critInput)

  // --- The bullet multiplier, DP5 through EA5 ---------------------------

  const attacksPerSecond = config.runType === 'Attack Disso'
    ? 1
    : attackSpeed({
        workshopLevel: stat('Attack Speed').workshopLevel,
        enhancementLevel: stat('Attack Speed').enhancementLevel,
        labLevel: lab.attackSpeed,
        hasAttackSpeedCard: config.cardsEquipped && card('Attack Speed').active,
        cardLevel: card('Attack Speed').level,
        hasCardMastery: card('Attack Speed Mastery').active,
        masteryLevel: lab.attackSpeedMastery + levels.coin.attackSpeedMastery,
        substat: cannonSubstat('Attack Speed'),
        relicPct: stat('Attack Speed').relicPct,
        vaultPct: stat('Attack Speed').vaultPct,
      })

  /** `DT5`. */
  const bps = bulletsPerSecond(attacksPerSecond)

  /** `DP5`. */
  const multishot = config.runType === 'Attack Disso'
    ? 1
    : multishotMultiplier(
        multishotChance(
          stat('Multishot Chance').workshopLevel,
          cannonSubstat('MultiShot Chance'),
          stat('Multishot Chance').vaultPct,
        ),
        multishotTargets(
          stat('Multishot Targets').workshopLevel,
          cannonSubstat('Multishot Targets'),
        ),
      )

  const bounceChance = bounceShotChance(
    stat('Bounce Shot Chance').workshopLevel,
    cannonSubstat('Bounce Shot Chance'),
    stat('Bounce Shot Chance').vaultPct,
  )
  const bounceTargets = bounceShotTargets(
    stat('Bounce Shot Targets').workshopLevel,
    perk('Bounce Shot') ? config.bounceShotPerkTargets : 0,
    cannonSubstat('Bounce Shot Targets'),
  )

  /** `DQ5` — with Astral Deliverance, which the bullet multiplier uses. */
  const bounce = config.runType === 'Attack Disso'
    ? 1
    : bounceShotMultiplier(bounceChance, bounceTargets, unique('Astral Deliverance'))
  /**
   * `DR5` — the same without it. Chain Lightning reads this one, because
   * Astral Deliverance's extra bounces do not roll for a proc.
   */
  const bounceNoAstral = config.runType === 'Attack Disso'
    ? 1
    : bounceShotMultiplier(bounceChance, bounceTargets, 0)

  /** `DS5`. */
  const rapidFire = config.runType === 'Attack Disso'
    ? 1
    : rapidFireMultiplier(
        rapidFireChance(
          stat('Rapid Fire Chance').workshopLevel,
          cannonSubstat('Rapid Fire Chance'),
          stat('Rapid Fire Chance').vaultPct,
        ),
        rapidFireDuration(
          stat('Rapid Fire Duration').workshopLevel,
          cannonSubstat('Rapid Fire Duration'),
        ),
        bps,
      )

  /** `DU5` — range, which an Attack Dissonance run fixes at the base 30m. */
  const range = config.runType === 'Attack Disso'
    ? 30
    : attackRange({
        workshopLevel: stat('Range').workshopLevel,
        hasRangeCard: config.cardsEquipped && card('Range').active,
        cardLevel: card('Range').level,
        labLevel: lab.range,
        substat: cannonSubstat('Attack Range'),
      })

  /** `DV5`. */
  const perMeter = config.runType === 'Attack Disso'
    ? 0
    : damagePerMeter({
        workshopValue: stat('Damage / Meter').workshopValue,
        enhancementLevel: stat('Damage / Meter').enhancementLevel,
        labLevel: lab.damagePerMeter,
        substat: cannonSubstat('Damage / Meter'),
        relicPct: stat('Damage / Meter').relicPct,
        vaultPct: stat('Damage / Meter').vaultPct,
        hasRangeMastery: card('Range Mastery').active,
        masteryLevel: lab.rangeMastery + levels.coin.rangeMastery,
      })

  /** `DW5`. */
  const rangeDamage = config.runType === 'Attack Disso'
    ? 1
    : rangeDamageMultiplier(range, perMeter, config.damageAtRangePct)

  // --- Super Tower, DX5 and DY5 -----------------------------------------
  // The card multiplies bullet damage; the mastery passes a share of that
  // multiplier to the ultimate weapons. Two different quantities, which is why
  // the sheet computes them separately rather than reusing one.

  const superTowerLevel = card('Super Tower').level
  const superTowerMasteryLevel = lab.superTowerMastery + levels.coin.superTowerMastery
  const stBonus = superTowerBonus(superTowerLevel, lab.superTowerBonus)
  const stCooldown = superTowerCooldown(
    card('Super Tower Mastery').active, superTowerMasteryLevel,
  )

  const spotlightAngleDegrees = spotlightAngle(
    config.ultimateWeapons.Spotlight.quantity, coreSubstat('Spotlight - Angle'),
  )

  /** `DX5`. */
  const superTower = superTowerEffectiveBonus({
    hasCard: config.cardsEquipped && card('Super Tower').active,
    hasMastery: card('Super Tower Mastery').active,
    bonus: stBonus,
    cooldownSeconds: stCooldown,
    hasSpotlight: config.ultimateWeapons.Spotlight.unlocked,
    spotlightQuantity: config.spotlightQuantity,
    spotlightAngleDegrees,
  })

  /** `DY5`. */
  const superTowerUltimate = superTowerEffectiveUltimateBonus({
    hasCard: config.cardsEquipped && card('Super Tower').active,
    hasMastery: card('Super Tower Mastery').active,
    bonus: stBonus,
    cooldownSeconds: stCooldown,
  })

  /** `DZ5`. */
  const rend = config.runType === 'Attack Disso'
    ? 1
    : maxRendArmourMultiplier({
        hasRend: config.hasRendArmour,
        labLevel: lab.maxRendArmorMultiplier,
        substat: cannonSubstat('Max Rend Armor Multi'),
        enhancementLevel: stat('Max Rend Armor Multiplier').enhancementLevel,
      })

  /** `EA5`. */
  const bulletMultiplier = bulletDamageMultiplier({
    multishot,
    bounceShot: bounce,
    bulletsPerSecond: bps,
    rapidFire,
    rangeDamagePerMeter: rangeDamage,
    superTowerCard: superTower,
    maxRendArmour: rend,
  })

  // --- The ultimate weapons, EC5 through EO5 ----------------------------

  /** `BM39`, which the keys path buys four nodes' worth of. */
  const ultimateWeaponVaultPct = levels.keys.ultimateWeaponDamage
    * KEYS_CANDIDATE_NODES['UW Damage'].perLevel

  /** `EC5` — how much shorter recovery packages make the wave. */
  const timeBoost = waveTimeBoost(config)

  const weapon = (name: Parameters<typeof weaponOf>[1]) => weaponOf(config, name)

  /** `EE5`. */
  const deathWave = deathWaveDps({
    unlocked: weapon('Death Wave').unlocked,
    damage: deathWaveDamage(weapon('Death Wave').damage, coreSubstat('Death Wave - Damage')),
    quantity: deathWaveQuantity(
      weapon('Death Wave').quantity,
      coreSubstat('Death Wave - Quantity'),
      perk('Death Wave Quantity'),
    ),
    cooldownSeconds: deathWaveCooldown(
      weapon('Death Wave').cooldown, coreSubstat('Death Wave - Cooldown'), timeBoost,
    ),
    damageAmplifierLabLevel: lab.deathWaveDamageAmplifier,
  })

  /** `EF5` — the only weapon whose output moves when a bullet stat does. */
  const chainLightning = weapon('Chain Lightning').unlocked
    ? chainLightningDps({
        damage: chainLightningDamage(
          weapon('Chain Lightning').damage,
          coreSubstat('Chain Lightning - Damage'),
          perk('Chain Lightning Damage'),
        ),
        quantity: chainLightningQuantity(
          weapon('Chain Lightning').quantity,
          coreSubstat('Chain Lightning - Quantity'),
          unique('Dimension Core') > 0,
        ),
        chance: chainLightningChance(
          weapon('Chain Lightning').cooldown, coreSubstat('Chain Lightning - Chance'),
        ),
        attackSpeed: bps,
        rapidFire,
        multishot,
        bounce: bounceNoAstral,
        displayedGameSpeed: config.gameSpeed,
      })
    : 0

  const areaOfEffect = {
    hasAreaOfEffectCard: config.cardsEquipped && card('Area of Effect').active,
    areaOfEffectCardLevel: card('Area of Effect').level,
  }

  /** `EI5` — the Smart Missile heat-up, which Spotlight Missiles share. */
  const missileHeatUp = ultimateWeaponHeatUp(
    1 + 1.5 * lab.missileAmplifier, Math.max(1, config.heatUpHits.smartMissiles),
  )

  const smDamage = smartMissileDamage(
    weapon('Smart Missiles').damage, coreSubstat('Smart Missiles - Damage'),
  )
  const smCooldown = smartMissileCooldown(
    weapon('Smart Missiles').cooldown, coreSubstat('Smart Missiles - Cooldown'), timeBoost,
  )

  /** `EG5`. */
  const smartMissiles = weapon('Smart Missiles').unlocked
    ? smartMissilesDps({
        damage: smDamage,
        quantity: smartMissileQuantity(
          weapon('Smart Missiles').quantity,
          coreSubstat('Smart Missiles - Quantity'),
          perk('More Smart Missiles'),
        ),
        cooldownSeconds: smCooldown,
        coverFire: weapon('Smart Missiles').plus ?? 0,
        heatUp: missileHeatUp,
        areaOfEffect: 1,
        ...areaOfEffect,
      })
    : 0

  /** Spotlight's own damage, which every other weapon is measured against. */
  const spotlightLight = spotlightLightRange(weapon('Spotlight').plus, rangeDamage)
  const slDamage = spotlightDamage({
    base: weapon('Spotlight').damage,
    lightRange: spotlightLight,
    substat: coreSubstat('Spotlight - Bonus'),
    relicPct: config.ultimateWeaponDamageRelicPct,
    vaultPct: ultimateWeaponVaultPct,
    hasPerk: perk('Spotlight Damage Bonus'),
  }) * ultimateDisco

  /** `ED5` — the coverage-weighted bonus, on the bullet half only. */
  const spotlight = run.ultimateWeaponUtilityApplies && weapon('Spotlight').unlocked
    ? spotlightFinalBonus(
        spotlightCoverage(config.spotlightQuantity, spotlightAngleDegrees), slDamage,
      )
    : 1

  /** `EH5` — the missiles a lit Smart Missile fires. */
  const spotlightMissiles
    = weapon('Spotlight').unlocked && weapon('Spotlight Missiles').unlocked
      ? spotlightMissilesDps({
          smartMissileDamage: smDamage,
          spotlightDamage: slDamage,
          cooldownSeconds: 20 - lab.spotlightMissiles,
          heatUp: missileHeatUp,
          areaOfEffect: 1,
          ...areaOfEffect,
        })
      : 0

  /** `EK5` — Poison Swamp's own heat-up, from its Death Creep `+`. */
  const swampDeathCreep = ultimateWeaponHeatUp(
    1 + (weapon('Poison Swamp').plus ?? 0.5), Math.max(1, config.heatUpHits.poisonSwamp),
  )

  /** `EJ5`. */
  const poisonSwamp = poisonSwampDps({
    unlocked: weapon('Poison Swamp').unlocked,
    damage: weapon('Poison Swamp').damage + coreSubstat('Poison Swamp - Damage'),
    durationSeconds: weapon('Poison Swamp').quantity,
    cooldownSeconds: weapon('Poison Swamp').cooldown,
    deathCreep: swampDeathCreep,
    rend: 1 + (rend - 1) * lab.swampRend * 0.03,
    ...areaOfEffect,
  })

  /** `EL5` — the only weapon the Armor module reaches, via Space Displacer. */
  const landMineChance
    = config.landMineChance + substat('Land Mine Chance', armorCapacity)
  const spaceDisplacerMines
    = config.enemySpawnsPerSecond * landMineChance * unique('Space Displacer')
  const ilmQuantity = innerLandMineQuantity(
    weapon('Inner Land Mines').quantity,
    coreSubstat('Inner Land Mines - Quantity'),
    perk('Extra Inner Mines'),
  )
  const ilmCooldown
    = weapon('Inner Land Mines').cooldown + coreSubstat('Inner Land Mines - Cooldown')

  const innerLandMines = innerLandMinesDps({
    unlocked: weapon('Inner Land Mines').unlocked,
    damage: innerLandMineDamage(
      weapon('Inner Land Mines').damage, coreSubstat('Inner Land Mines - Damage'),
    ),
    detonationsPerSecond: ilmQuantity / ilmCooldown + spaceDisplacerMines,
    chronoJump: lab.innerLandMineChronoJump * 5
      * ultimateWeaponHeatUp(1, config.heatUpHits.innerLandMines),
    chargedMines: weapon('Inner Land Mines').plus ?? 0,
    areaOfEffect: 1,
    ...areaOfEffect,
  })

  /** `EN5` — the Core module pair, which boosts every ultimate weapon. */
  const coreModule = moduleBonus({
    primaryBonus: atLevel(
      'core', config.modules.core.primaryRarity,
      levels.coin.primaryModuleCore, config.modules.core.primaryBonus,
    ),
    hasAssist: config.modules.core.hasAssist,
    assistBonus: atLevel(
      'core', config.modules.core.assistRarity,
      levels.coin.assistModuleCore, config.modules.core.assistBonus,
    ),
    stoneBonusCap: levels.stone.assistBonusCoreStone,
    labBonusCap: lab.assistBonusCore + levels.coin.assistBonusCore,
  })

  /**
   * The Ultimate Crit card, which is the *only* place the mastery appears —
   * it raises the share of the crit factor ultimate weapons receive.
   */
  const ultimateCritCard
    = config.cardsEquipped && card('Ultimate Crit').active
      ? 1 + (card('Ultimate Crit').value
        + (card('Ultimate Crit Mastery').active
          ? 0.0033 * (1 + lab.ultimateCritMastery + levels.coin.ultimateCritMastery)
          : 0))
      * (critInput.criticalFactor - 1)
      : 1

  /** `EO5`. */
  const ultimateWeapons = ultimateWeaponTotalDamage({
    deathWave,
    chainLightning,
    smartMissiles,
    spotlightDamage: spotlightMissiles,
    spotlightBonus: spotlight,
    poisonSwamp,
    innerLandMines,
    damageBoost: config.ultimateWeaponAdditionalDamage * coreModule * ultimateDisco,
    superTowerUltimateMastery: superTowerUltimate,
    ultimateCritCard,
  })

  // --- The slow, EP5 through ER5 ----------------------------------------

  const chronoUnlocked = run.ultimateWeaponUtilityApplies
    && weapon('Chrono Field').unlocked
  const chronoSubstat = coreSubstat('Chrono Field - Speed Reduction')
  const chronoSlow = chronoUnlocked
    ? 1 / (1 - Math.min(0.9, weapon('Chrono Field').quantity + chronoSubstat))
    : 1
  const chronoPlusSlow = chronoUnlocked && weapon('Chrono Field').plus !== null
    ? 1 / (1 - (weapon('Chrono Field').plus as number))
    : 1
  const slow = chronoSlow * chronoPlusSlow

  const effectiveDamage = composeEffectiveDamage({
    base,
    crit,
    bulletDamageMultiplier: bulletMultiplier,
    spotlight,
    ultimateWeapons,
    ultimateWeaponCrit: uwCrit,
    slow,
  })

  return {
    base,
    crit,
    ultimateWeaponCrit: uwCrit,
    bulletDamageMultiplier: bulletMultiplier,
    spotlight,
    ultimateWeapons,
    slow,
    effectiveDamage,
  }
}

// ---------------------------------------------------------------------------
// Small readers, kept out of the walk above so it stays readable
// ---------------------------------------------------------------------------

/**
 * The ten bullet stats the vault raises, and the keys level that raises each.
 *
 * The eleventh keys candidate is Ultimate Weapon Damage, which is not a bullet
 * stat and is applied to Spotlight's damage instead.
 */
const KEYS_STAT_LEVELS: Partial<Record<
  keyof EffectiveDamageConfig['stats'],
  { sheetName: string, key: keyof EffectiveDamageLevels['keys'] }
>> = {
  'Damage': { sheetName: 'Damage', key: 'damage' },
  'Critical Chance': { sheetName: 'Critical Chance', key: 'criticalChance' },
  'Critical Factor': { sheetName: 'Critical Factor', key: 'criticalFactor' },
  'Super Critical Chance': { sheetName: 'Super Crit Chance', key: 'superCritChance' },
  'Super Critical Mult': { sheetName: 'Super Crit Mult', key: 'superCritMult' },
  'Attack Speed': { sheetName: 'Attack Speed', key: 'attackSpeed' },
  'Multishot Chance': { sheetName: 'Multishot Chance', key: 'multishotChance' },
  'Damage / Meter': { sheetName: 'Damage / Meter', key: 'damagePerMeter' },
  'Rapid Fire Chance': { sheetName: 'Rapid Fire Chance', key: 'rapidFireChance' },
  'Bounce Shot Chance': { sheetName: 'Bounce Shot Chance', key: 'bounceShotChance' },
}

function statOf(
  config: EffectiveDamageConfig,
  name: keyof EffectiveDamageConfig['stats'],
) {
  return config.stats[name]
}

function uniqueOf(
  config: EffectiveDamageConfig,
  name: keyof EffectiveDamageConfig['uniques'],
): number {
  const pair = config.uniques[name]
  return pair.primary + pair.assist
}

function cardOf(
  config: EffectiveDamageConfig,
  name: keyof EffectiveDamageConfig['cards'],
) {
  return config.cards[name]
}

function perkOf(
  config: EffectiveDamageConfig,
  name: keyof EffectiveDamageConfig['perks'],
): boolean {
  return config.perks[name]
}

function weaponOf(
  config: EffectiveDamageConfig,
  name: keyof EffectiveDamageConfig['ultimateWeapons'],
) {
  return config.ultimateWeapons[name]
}

/**
 * `eDamage!EC5` — what recovery packages do to the length of a wave.
 *
 * A shorter wave means every cooldown fires proportionally more often, so this
 * multiplies into Death Wave's and Smart Missiles' cooldowns rather than into
 * their damage.
 */
function waveTimeBoost(config: EffectiveDamageConfig): number {
  const recovery = config.waveAcceleratorRecovery + config.recovery.durationBonus
  const perWave = config.recovery.bossWave
    ? (recovery * (config.recovery.bossWaveDivisor - 1) + 1) / config.recovery.bossWaveDivisor
    : recovery

  const compressor = config.uniques['Galaxy Compressor']
  const gain = -((compressor.primary + compressor.assist) * perWave)
  return 1 - gain / (config.waveDurationSeconds + gain)
}
