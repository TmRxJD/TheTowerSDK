/**
 * Effective Paths — the levels the eDamage paths buy.
 *
 * One key per candidate across all four paths, keyed the way the model reads
 * them rather than by the sheet's column. The sheet's own name for each is on
 * `EFFECTIVE_DAMAGE_CANDIDATES`; this is the state those candidates move.
 *
 * Grouped by which path buys it, because almost nothing is bought by two.
 */

/** The 32 the lab path buys — `eDamage!BO5:CV5`, minus the blank column. */
export interface EffectiveDamageLabLevels {
  damage: number
  damageMastery: number
  standardPerksBonus: number
  improveTradeOffPerks: number
  shockMultiplier: number
  demonModeMastery: number
  criticalChanceMastery: number
  criticalFactor: number
  superCritChance: number
  superCritMulti: number
  startingCash: number
  attackSpeed: number
  attackSpeedMastery: number
  range: number
  damagePerMeter: number
  rangeMastery: number
  superTowerBonus: number
  superTowerMastery: number
  maxRendArmorMultiplier: number
  spotlightMissiles: number
  swampRend: number
  deathWaveDamageAmplifier: number
  missileAmplifier: number
  innerLandMineChronoJump: number
  ultimateCritMastery: number
  assistBonusCannon: number
  assistSubstatCannon: number
  assistSubstatArmor: number
  assistBonusCore: number
  assistSubstatCore: number
  dissonantEchoAttack: number
  dissonantEchoUltimateWeapons: number
}

/**
 * The 29 the stone path buys — four stats apiece across six ultimate weapons,
 * plus Chrono Field's two and the five assist capacities it shares with the
 * lab path.
 */
export interface EffectiveDamageStoneLevels {
  deathWaveDamage: number
  deathWaveQuantity: number
  deathWaveCooldown: number
  chainLightningDamage: number
  chainLightningQuantity: number
  chainLightningChance: number
  smartMissileDamage: number
  smartMissileQuantity: number
  smartMissileCooldown: number
  smartMissileCoverFire: number
  spotlightDamage: number
  spotlightAngle: number
  spotlightQuantity: number
  spotlightLightRange: number
  poisonSwampDamage: number
  poisonSwampDuration: number
  poisonSwampCooldown: number
  poisonSwampDeathCreep: number
  innerLandMineDamage: number
  innerLandMineQuantity: number
  innerLandMineCooldown: number
  innerLandMineChargedMines: number
  chronoFieldSlow: number
  chronoFieldChronoLoop: number

  /**
   * The stone-bought assist capacities, which are **not** the lab levels of
   * the same name. `eDamage Stone!CM5` reads `BL41`, a stone lookup;
   * `eDamage!CN5` reads `BC49`, a lab level. They add inside
   * `EPG_ASSIST_SUB_CAP(has, stone, lab)`, so a model that treats them as one
   * quantity double-counts.
   */
  assistBonusCannonStone: number
  assistSubstatCannonStone: number
  assistSubstatArmorStone: number
  assistBonusCoreStone: number
  assistSubstatCoreStone: number
}

/**
 * The 25 the coin path buys.
 *
 * The `+` names are workshop enhancements; the module entries are levels on
 * the module itself, the same shape the eHP coin path buys.
 */
export interface EffectiveDamageCoinLevels {
  enhancementDamage: number
  damageMastery: number
  demonModeMastery: number
  criticalChanceMastery: number
  enhancementCriticalFactor: number
  enhancementSuperCritMult: number
  enhancementCashBonus: number
  enhancementAttackSpeed: number
  attackSpeedMastery: number
  enhancementDamagePerMeter: number
  rangeMastery: number
  superTowerMastery: number
  enhancementRendArmor: number
  ultimateCritMastery: number
  primaryModuleCannon: number
  assistModuleCannon: number
  primaryModuleCore: number
  assistModuleCore: number
  assistSubstatCannon: number
  assistSubstatArmor: number
  assistSubstatCore: number
  assistBonusCannon: number
  assistBonusCore: number
  dissonantEchoAttack: number
  dissonantEchoUltimateWeapons: number
}

/**
 * The 11 the keys path buys.
 *
 * Keys are the one currency the eHP paths never touch, and every entry here is
 * a raw stat rather than a lab, a card or a module.
 */
export interface EffectiveDamageKeysLevels {
  damage: number
  criticalChance: number
  criticalFactor: number
  superCritChance: number
  superCritMult: number
  attackSpeed: number
  multishotChance: number
  damagePerMeter: number
  rapidFireChance: number
  bounceShotChance: number
  ultimateWeaponDamage: number
}

/** Every level the damage paths can move, in one place. */
export interface EffectiveDamageLevels {
  lab: EffectiveDamageLabLevels
  stone: EffectiveDamageStoneLevels
  coin: EffectiveDamageCoinLevels
  keys: EffectiveDamageKeysLevels
}

const zeroed = <T extends object>(keys: readonly (keyof T)[]): T =>
  Object.fromEntries(keys.map(key => [key, 0])) as T

/** Every level at zero — a fresh account, and a safe base to spread over. */
export const ZERO_EFFECTIVE_DAMAGE_LEVELS: EffectiveDamageLevels = {
  lab: zeroed<EffectiveDamageLabLevels>([
    'damage', 'damageMastery', 'standardPerksBonus', 'improveTradeOffPerks',
    'shockMultiplier', 'demonModeMastery', 'criticalChanceMastery', 'criticalFactor',
    'superCritChance', 'superCritMulti', 'startingCash', 'attackSpeed',
    'attackSpeedMastery', 'range', 'damagePerMeter', 'rangeMastery',
    'superTowerBonus', 'superTowerMastery', 'maxRendArmorMultiplier',
    'spotlightMissiles', 'swampRend', 'deathWaveDamageAmplifier', 'missileAmplifier',
    'innerLandMineChronoJump', 'ultimateCritMastery', 'assistBonusCannon',
    'assistSubstatCannon', 'assistSubstatArmor', 'assistBonusCore',
    'assistSubstatCore', 'dissonantEchoAttack', 'dissonantEchoUltimateWeapons',
  ]),
  stone: zeroed<EffectiveDamageStoneLevels>([
    'deathWaveDamage', 'deathWaveQuantity', 'deathWaveCooldown',
    'chainLightningDamage', 'chainLightningQuantity', 'chainLightningChance',
    'smartMissileDamage', 'smartMissileQuantity', 'smartMissileCooldown',
    'smartMissileCoverFire', 'spotlightDamage', 'spotlightAngle',
    'spotlightQuantity', 'spotlightLightRange', 'poisonSwampDamage',
    'poisonSwampDuration', 'poisonSwampCooldown', 'poisonSwampDeathCreep',
    'innerLandMineDamage', 'innerLandMineQuantity', 'innerLandMineCooldown',
    'innerLandMineChargedMines', 'chronoFieldSlow', 'chronoFieldChronoLoop',
    'assistBonusCannonStone', 'assistSubstatCannonStone', 'assistSubstatArmorStone',
    'assistBonusCoreStone', 'assistSubstatCoreStone',
  ]),
  coin: zeroed<EffectiveDamageCoinLevels>([
    'enhancementDamage', 'damageMastery', 'demonModeMastery', 'criticalChanceMastery',
    'enhancementCriticalFactor', 'enhancementSuperCritMult', 'enhancementCashBonus',
    'enhancementAttackSpeed', 'attackSpeedMastery', 'enhancementDamagePerMeter',
    'rangeMastery', 'superTowerMastery', 'enhancementRendArmor', 'ultimateCritMastery',
    'primaryModuleCannon', 'assistModuleCannon', 'primaryModuleCore', 'assistModuleCore',
    'assistSubstatCannon', 'assistSubstatArmor', 'assistSubstatCore',
    'assistBonusCannon', 'assistBonusCore', 'dissonantEchoAttack',
    'dissonantEchoUltimateWeapons',
  ]),
  keys: zeroed<EffectiveDamageKeysLevels>([
    'damage', 'criticalChance', 'criticalFactor', 'superCritChance', 'superCritMult',
    'attackSpeed', 'multishotChance', 'damagePerMeter', 'rapidFireChance',
    'bounceShotChance', 'ultimateWeaponDamage',
  ]),
}

/**
 * The five assist capacities the lab and coin paths share.
 *
 * These are the *lab* levels: `eDamage!CN5` and `eDamage Coins!CJ5` both read
 * `BC49`, so buying one with coins is buying the same level the lab path buys.
 * The stone path's same-named candidates are a different quantity again — see
 * {@link EffectiveDamageStoneLevels} — and the two add rather than replacing
 * each other.
 */
export const SHARED_ASSIST_LEVEL_KEYS = [
  'assistBonusCannon',
  'assistSubstatCannon',
  'assistSubstatArmor',
  'assistBonusCore',
  'assistSubstatCore',
] as const

export type SharedAssistLevelKey = typeof SHARED_ASSIST_LEVEL_KEYS[number]

/**
 * The stone and lab halves of one assist capacity, ready for
 * `EPG_ASSIST_SUB_CAP`.
 *
 * Whichever path bought it, the lab level is one number and the stone level is
 * another; the lab and coin paths move the first and the stone path the second.
 */
export function assistCapacityLevels(
  levels: EffectiveDamageLevels,
  key: SharedAssistLevelKey,
): { stoneCap: number, labCap: number } {
  const stoneKey = `${key}Stone` as keyof EffectiveDamageStoneLevels
  return {
    stoneCap: levels.stone[stoneKey],
    // The coin path buys the same lab level, so only one of the two is ever
    // non-zero for a given plan — but adding is right either way.
    labCap: levels.lab[key] + levels.coin[key],
  }
}
