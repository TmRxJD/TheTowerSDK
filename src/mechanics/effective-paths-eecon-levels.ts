/**
 * Effective Paths — the levels the eEcon paths buy.
 *
 * One key per candidate, keyed the way a model reads them rather than by the
 * sheet's column. The sheet's own name for each is on
 * `EFFECTIVE_ECONOMY_CANDIDATES`; this is the state those candidates move.
 *
 * The three bands are not disjoint, which is the thing to know before using
 * them. Eight candidates appear on both earning tabs — three assist capacities
 * and five card masteries — and they are one level scored two ways, not two
 * levels. Those live in the `time` band and the stone band points at them;
 * see {@link ECONOMY_STONE_SHARED_KEYS}.
 */

/** The 23 the time and coin paths buy — `eEcon!ET4:FP4`. */
export interface EffectiveEconomyTimeLevels {
  coinsPerKillBonus: number
  recoveryPackageChance: number
  dissonantEchoUtility: number
  goldenTowerBonus: number
  goldenTowerDuration: number
  deathWaveCoinBonus: number
  blackHoleCoinBonus: number
  spotlightCoinBonus: number
  coinsMastery: number
  extraOrbMastery: number
  waveSkipMastery: number
  introSprintMastery: number
  waveAcceleratorMastery: number
  standardPerksBonus: number
  improveTradeOffPerks: number
  goldBotDuration: number
  assistSubstatGenerator: number
  assistSubstatCore: number
  assistBonusGenerator: number
  /** A workshop enhancement, not a lab. */
  enhancementCoinBonus: number
  /** The same. */
  enhancementFreeUpgrades: number
  primaryModuleGenerator: number
  assistModuleGenerator: number
}

/**
 * The 14 the stone path buys on its own — `eEcon Stones!EG4:EY4`, less the
 * five masteries it shares with the time path.
 *
 * These are ultimate weapon stats and assist capacities, which is what a stone
 * actually buys.
 */
export interface EffectiveEconomyStoneLevels {
  goldenTowerBonusStone: number
  goldenTowerDurationStone: number
  goldenTowerCooldownStone: number
  goldenComboStone: number
  blackHoleDurationStone: number
  blackHoleCooldownStone: number
  deathWaveQuantityStone: number
  deathWaveCooldownStone: number
  spotlightAngleStone: number
  spotlightQuantityStone: number
  ultimateWeaponCooldownStone: number
  assistBonusGeneratorStone: number
  assistSubstatGeneratorStone: number
  assistSubstatCoreStone: number
}

/** The 6 the discount path buys — `eEcon Discount!CS4:CX4`. */
export interface EffectiveEconomyDiscountLevels {
  workshopUtilityDiscount: number
  labsCoinDiscount: number
  enhancementAttackDiscount: number
  enhancementDefenseDiscount: number
  enhancementUtilityDiscount: number
  moduleCoinCost: number
}

/** Every level the economy paths can move, in one place. */
export interface EffectiveEconomyLevels {
  time: EffectiveEconomyTimeLevels
  stone: EffectiveEconomyStoneLevels
  discount: EffectiveEconomyDiscountLevels
}

const zeroed = <T extends object>(keys: readonly (keyof T)[]): T =>
  Object.fromEntries(keys.map(key => [key, 0])) as T

export const ZERO_EFFECTIVE_ECONOMY_LEVELS: EffectiveEconomyLevels = {
  time: zeroed<EffectiveEconomyTimeLevels>([
    'coinsPerKillBonus', 'recoveryPackageChance', 'dissonantEchoUtility',
    'goldenTowerBonus', 'goldenTowerDuration', 'deathWaveCoinBonus',
    'blackHoleCoinBonus', 'spotlightCoinBonus', 'coinsMastery', 'extraOrbMastery',
    'waveSkipMastery', 'introSprintMastery', 'waveAcceleratorMastery',
    'standardPerksBonus', 'improveTradeOffPerks', 'goldBotDuration',
    'assistSubstatGenerator', 'assistSubstatCore', 'assistBonusGenerator',
    'enhancementCoinBonus', 'enhancementFreeUpgrades',
    'primaryModuleGenerator', 'assistModuleGenerator',
  ]),
  stone: zeroed<EffectiveEconomyStoneLevels>([
    'goldenTowerBonusStone', 'goldenTowerDurationStone', 'goldenTowerCooldownStone',
    'goldenComboStone', 'blackHoleDurationStone', 'blackHoleCooldownStone',
    'deathWaveQuantityStone', 'deathWaveCooldownStone', 'spotlightAngleStone',
    'spotlightQuantityStone', 'ultimateWeaponCooldownStone',
    'assistBonusGeneratorStone', 'assistSubstatGeneratorStone', 'assistSubstatCoreStone',
  ]),
  discount: zeroed<EffectiveEconomyDiscountLevels>([
    'workshopUtilityDiscount', 'labsCoinDiscount', 'enhancementAttackDiscount',
    'enhancementDefenseDiscount', 'enhancementUtilityDiscount', 'moduleCoinCost',
  ]),
}

/** Which level each candidate moves, by the sheet's own name for it. */
export interface EconomyLevelRef {
  band: keyof EffectiveEconomyLevels
  key: string
}

/** `eEcon!ET4:FP4`, in matrix order. */
export const ECONOMY_TIME_LEVEL_KEYS: readonly (keyof EffectiveEconomyTimeLevels)[] = [
  'coinsPerKillBonus', 'recoveryPackageChance', 'dissonantEchoUtility',
  'goldenTowerBonus', 'goldenTowerDuration', 'deathWaveCoinBonus',
  'blackHoleCoinBonus', 'spotlightCoinBonus', 'coinsMastery', 'extraOrbMastery',
  'waveSkipMastery', 'introSprintMastery', 'waveAcceleratorMastery',
  'standardPerksBonus', 'improveTradeOffPerks', 'goldBotDuration',
  'assistSubstatGenerator', 'assistSubstatCore', 'assistBonusGenerator',
  'enhancementCoinBonus', 'enhancementFreeUpgrades',
  'primaryModuleGenerator', 'assistModuleGenerator',
]

/**
 * `eEcon Stones!EG4:EY4`, in matrix order.
 *
 * The last five point at the time band on purpose. A card mastery is one lab
 * level whatever ranks it, and the stone tab ranks these five off a single
 * user-supplied cell so a player can weigh a mastery against a stone purchase.
 * A plan that gave them their own stone levels would let the same level be
 * bought twice.
 */
export const ECONOMY_STONE_LEVEL_REFS: readonly EconomyLevelRef[] = [
  { band: 'stone', key: 'goldenTowerBonusStone' },
  { band: 'stone', key: 'goldenTowerDurationStone' },
  { band: 'stone', key: 'goldenTowerCooldownStone' },
  { band: 'stone', key: 'goldenComboStone' },
  { band: 'stone', key: 'blackHoleDurationStone' },
  { band: 'stone', key: 'blackHoleCooldownStone' },
  { band: 'stone', key: 'deathWaveQuantityStone' },
  { band: 'stone', key: 'deathWaveCooldownStone' },
  { band: 'stone', key: 'spotlightAngleStone' },
  { band: 'stone', key: 'spotlightQuantityStone' },
  { band: 'stone', key: 'ultimateWeaponCooldownStone' },
  { band: 'stone', key: 'assistBonusGeneratorStone' },
  { band: 'stone', key: 'assistSubstatGeneratorStone' },
  { band: 'stone', key: 'assistSubstatCoreStone' },
  { band: 'time', key: 'coinsMastery' },
  { band: 'time', key: 'extraOrbMastery' },
  { band: 'time', key: 'waveSkipMastery' },
  { band: 'time', key: 'introSprintMastery' },
  { band: 'time', key: 'waveAcceleratorMastery' },
]

/** The five the stone tab ranks but the time tab owns. */
export const ECONOMY_STONE_SHARED_KEYS: readonly (keyof EffectiveEconomyTimeLevels)[] = [
  'coinsMastery', 'extraOrbMastery', 'waveSkipMastery',
  'introSprintMastery', 'waveAcceleratorMastery',
]

/** `eEcon Discount!CS4:CX4`, in matrix order. */
export const ECONOMY_DISCOUNT_LEVEL_KEYS:
readonly (keyof EffectiveEconomyDiscountLevels)[] = [
  'workshopUtilityDiscount', 'labsCoinDiscount', 'enhancementAttackDiscount',
  'enhancementDefenseDiscount', 'enhancementUtilityDiscount', 'moduleCoinCost',
]
