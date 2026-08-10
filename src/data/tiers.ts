export interface TierBattleConditionDefinition {
  name: string
  description: string
}

export interface TierBattleConditionValue {
  name: string
  level: number
  raw: string
}

export interface TierData {
  tier: number
  coinBonus: number
  requiredPreviousTier: number | null
  requiredWave: number | null
  battleConditions: readonly TierBattleConditionValue[]
}

export interface TierCoinBonusRow {
  tier: number
  coinBonus: number
}

export interface TierUnlockRequirementRow {
  tier: number
  requiredPreviousTier: number | null
  requiredWave: number | null
}

export interface TierBattleConditionRow {
  tier: number
  name: string
  level: number
  raw: string
}

function createBattleCondition(name: string, level: number, raw = `${name} Lvl ${level}`): TierBattleConditionValue {
  return { name, level, raw }
}

function createTierData(
  tier: number,
  coinBonus: number,
  requiredPreviousTier: number | null,
  requiredWave: number | null,
  battleConditions: readonly TierBattleConditionValue[] = [],
): TierData {
  return {
    tier,
    coinBonus,
    requiredPreviousTier,
    requiredWave,
    battleConditions,
  }
}

export const TIER_OVERVIEW_FACTS = [
  'Tiers are the main game difficulty ladder and currently span Tier 1 through Tier 24.',
  'Unlocking the next tier is handled through Milestones after reaching the required wave on the current tier.',
  'Tiers 2 through 15 unlock at wave 100 of the previous tier, while Tiers 16 and above unlock at wave 300 of the previous tier.',
  'Tier 14 and above add static battle conditions that stay fixed for the tier instead of rotating like tournament conditions.',
] as const

export const TIER_BATTLE_CONDITION_DEFINITIONS = [
  { name: 'Death Ray Resistance', description: 'Instead of destroying enemies, Death Ray deals a percentage of enemy health as damage.' },
  { name: 'Thorns Resistance', description: 'Thorns deals a reduced percentage of its normal damage.' },
  { name: 'Enemy Attack Speed', description: 'Enemy attack speed is increased by a percentage.' },
  { name: 'Knockback Resistance', description: 'Knockback force applied to enemies is reduced by a percentage.' },
  { name: 'Plasma Cannon Resistance', description: 'Plasma Cannon deals a reduced percentage of its normal damage.' },
  { name: 'More Enemies', description: 'More enemies spawn than normal by a percentage increase.' },
  { name: 'Orb Resistance', description: 'Instead of destroying enemies, orbs deal a percentage of enemy health as damage.' },
  { name: 'More Bosses', description: 'Bosses spawn every set number of waves instead of every 10 waves.' },
  { name: 'Enemy Speed', description: 'Enemies move faster by a percentage.' },
  { name: 'Armored Enemies', description: 'Enemies block the first set number of hits they take.' },
  { name: 'Energy Shields Down', description: 'Energy Shield recharge time is increased.' },
  { name: 'Death Defy Down', description: 'Death Defy chance is reduced.' },
  { name: 'Ultimate Weapon Durations', description: 'Chrono Field, Golden Tower, Poison Swamp, and Black Hole durations are reduced.' },
  { name: 'Protector\'s Ultimate', description: 'Protector shields gain knockback, shockwave, and Black Hole damage immunity for a duration/cooldown profile.' },
  { name: 'Tank\'s Ultimate', description: 'Tanks behave like bosses but stop moving once inside tower range for a duration/cooldown profile.' },
  { name: 'Basic\'s Ultimate', description: 'Basic enemies gain a chance to spawn as other enemy types.' },
  { name: 'Boss\'s Ultimate', description: 'Bosses spawn with overheal that boosts their health by a percentage.' },
  { name: 'Ranged Ultimate', description: 'Ranged enemy projectiles disable the tower from firing for a duration.' },
  { name: 'Fast\'s Ultimate', description: 'Fast enemies buff nearby enemies to match their speed.' },
  { name: 'Scatter Ultimate', description: 'Scatter children gain increased health by a percentage.' },
  { name: 'Ray Ultimate', description: 'Ray enemies fire faster by a percentage.' },
  { name: 'Vampire Ultimate', description: 'Vampires drain faster by a percentage.' },
  { name: 'Saboteur\'s Ultimate', description: 'Saboteur fleet enemies have a {LEVEL/2}% chance to attack through the wall.' },
  { name: 'Commander\'s Ultimate', description: 'When Commander fleet enemies pulse in tower range, tower attack and health are reduced by 1 for the rest of the run.' },
  { name: 'Overcharge\'s Ultimate', description: 'Overcharge returning projectiles gain +LEVEL/200 exponent scaling on damage.' },
  { name: 'Mass Enforcement', description: 'Surviving enemies gain mass every wave they remain alive.' },
  { name: 'Skip Decay', description: 'Enemy health and attack level skip chances are reduced by a value every set number of waves.' },
  { name: 'Skip Reduction - Multiply', description: 'Enemy health and attack level skip chances are multiplied by a reduction factor.' },
  { name: 'Skip Reduction - Subtract', description: 'Enemy health and attack level skip chances are reduced by subtracting a flat value.' },
] as const satisfies readonly TierBattleConditionDefinition[]

export const TIER_DATA = [
  createTierData(1, 1, null, null),
  createTierData(2, 1.8, 1, 100),
  createTierData(3, 2.6, 2, 100),
  createTierData(4, 3.4, 3, 100),
  createTierData(5, 4.2, 4, 100),
  createTierData(6, 5, 5, 100),
  createTierData(7, 5.8, 6, 100),
  createTierData(8, 6.6, 7, 100),
  createTierData(9, 7.5, 8, 100),
  createTierData(10, 8.7, 9, 100),
  createTierData(11, 10.3, 10, 100),
  createTierData(12, 12.2, 11, 100),
  createTierData(13, 14.7, 12, 100),
  createTierData(14, 17.6, 13, 100, [
    createBattleCondition('Orb Resistance', 50),
    createBattleCondition('Death Ray Resistance', 50),
    createBattleCondition('Thorns Resistance', 20),
    createBattleCondition('Plasma Cannon Resistance', 20),
    createBattleCondition('More Bosses', 1),
    createBattleCondition('ELS Reduction', 5),
  ]),
  createTierData(15, 21.3, 14, 100, [
    createBattleCondition('Orb Resistance', 60),
    createBattleCondition('Death Ray Resistance', 60),
    createBattleCondition('Thorns Resistance', 30),
    createBattleCondition('Knockback Resistance', 40),
    createBattleCondition('Armored Enemies', 10),
    createBattleCondition('Plasma Cannon Resistance', 30),
    createBattleCondition('More Bosses', 2),
    createBattleCondition('ELS Reduction', 10),
  ]),
  createTierData(16, 25.2, 15, 300, [
    createBattleCondition('Orb Resistance', 70),
    createBattleCondition('Death Ray Resistance', 70),
    createBattleCondition('Thorns Resistance', 40),
    createBattleCondition('Knockback Resistance', 50),
    createBattleCondition('Armored Enemies', 20),
    createBattleCondition('Plasma Cannon Resistance', 40),
    createBattleCondition('Protector\'s Ultimate', 20),
    createBattleCondition('More Bosses', 3),
    createBattleCondition('ELS Reduction', 15),
  ]),
  createTierData(17, 29.1, 16, 300, [
    createBattleCondition('Orb Resistance', 80),
    createBattleCondition('Death Ray Resistance', 80),
    createBattleCondition('Thorns Resistance', 50),
    createBattleCondition('Knockback Resistance', 60),
    createBattleCondition('Armored Enemies', 30),
    createBattleCondition('Plasma Cannon Resistance', 50),
    createBattleCondition('Protector\'s Ultimate', 35),
    createBattleCondition('Tank\'s Ultimate', 20),
    createBattleCondition('More Bosses', 3),
    createBattleCondition('ELS Reduction', 20),
  ]),
  createTierData(18, 33, 17, 300, [
    createBattleCondition('Orb Resistance', 90),
    createBattleCondition('Death Ray Resistance', 90),
    createBattleCondition('Thorns Resistance', 60),
    createBattleCondition('Knockback Resistance', 70),
    createBattleCondition('Armored Enemies', 40),
    createBattleCondition('Plasma Cannon Resistance', 60),
    createBattleCondition('Protector\'s Ultimate', 50),
    createBattleCondition('Tank\'s Ultimate', 35),
    createBattleCondition('Scatter Ultimate', 20),
    createBattleCondition('Ray Ultimate', 20),
    createBattleCondition('Vampire Ultimate', 20),
    createBattleCondition('More Bosses', 5),
    createBattleCondition('ELS Reduction', 25),
  ]),
  createTierData(19, 40, 18, 300, [
    createBattleCondition('Orb Resistance', 95),
    createBattleCondition('Death Ray Resistance', 95),
    createBattleCondition('Thorns Resistance', 70),
    createBattleCondition('Knockback Resistance', 80),
    createBattleCondition('Armored Enemies', 50),
    createBattleCondition('Plasma Cannon Resistance', 70),
    createBattleCondition('Protector\'s Ultimate', 65),
    createBattleCondition('Tank\'s Ultimate', 50),
    createBattleCondition('Scatter Ultimate', 35),
    createBattleCondition('Ray Ultimate', 35),
    createBattleCondition('Vampire Ultimate', 35),
    createBattleCondition('More Bosses', 5),
    createBattleCondition('ELS Reduction', 30),
    createBattleCondition('Fast\'s Ultimate', 20),
  ]),
  createTierData(20, 48, 19, 300, [
    createBattleCondition('Orb Resistance', 95),
    createBattleCondition('Death Ray Resistance', 95),
    createBattleCondition('Thorns Resistance', 80),
    createBattleCondition('Knockback Resistance', 90),
    createBattleCondition('Armored Enemies', 60),
    createBattleCondition('Plasma Cannon Resistance', 80),
    createBattleCondition('Protector\'s Ultimate', 80),
    createBattleCondition('Tank\'s Ultimate', 65),
    createBattleCondition('Scatter Ultimate', 50),
    createBattleCondition('Ray Ultimate', 50),
    createBattleCondition('Vampire Ultimate', 50),
    createBattleCondition('More Bosses', 5),
    createBattleCondition('ELS Reduction', 35),
    createBattleCondition('Fast\'s Ultimate', 35),
    createBattleCondition('Boss\'s Ultimate', 20, 'Boss Ultimate Lvl 20'),
  ]),
  createTierData(21, 60, 20, 300, [
    createBattleCondition('Orb Resistance', 95),
    createBattleCondition('Death Ray Resistance', 95),
    createBattleCondition('Thorns Resistance', 90),
    createBattleCondition('Knockback Resistance', 95),
    createBattleCondition('Armored Enemies', 70),
    createBattleCondition('Plasma Cannon Resistance', 90),
    createBattleCondition('Protector\'s Ultimate', 95),
    createBattleCondition('Tank\'s Ultimate', 80),
    createBattleCondition('Scatter Ultimate', 65),
    createBattleCondition('Ray Ultimate', 65),
    createBattleCondition('Vampire Ultimate', 65),
    createBattleCondition('More Bosses', 5),
    createBattleCondition('ELS Reduction', 40),
    createBattleCondition('Fast\'s Ultimate', 50),
    createBattleCondition('Boss\'s Ultimate', 35, 'Boss Ultimate Lvl 35'),
    createBattleCondition('Basic\'s Ultimate', 20),
    createBattleCondition('Mass Enforcement', 1),
  ]),
  createTierData(22, 75, 21, 300, [
    createBattleCondition('Orb Resistance', 95),
    createBattleCondition('Death Ray Resistance', 95),
    createBattleCondition('Thorns Resistance', 95),
    createBattleCondition('Knockback Resistance', 95),
    createBattleCondition('Armored Enemies', 75),
    createBattleCondition('Plasma Cannon Resistance', 90),
    createBattleCondition('Protector\'s Ultimate', 95),
    createBattleCondition('Tank\'s Ultimate', 80),
    createBattleCondition('Scatter Ultimate', 80),
    createBattleCondition('Ray Ultimate', 80),
    createBattleCondition('Vampire Ultimate', 80),
    createBattleCondition('More Bosses', 5),
    createBattleCondition('ELS Reduction', 45),
    createBattleCondition('Fast\'s Ultimate', 65),
    createBattleCondition('Boss\'s Ultimate', 50, 'Boss Ultimate Lvl 50'),
    createBattleCondition('Basic\'s Ultimate', 35),
    createBattleCondition('Mass Enforcement', 1),
    createBattleCondition('Saboteur\'s Ultimate', 20),
  ]),
  createTierData(23, 92, 22, 300, [
    createBattleCondition('Orb Resistance', 95),
    createBattleCondition('Death Ray Resistance', 95),
    createBattleCondition('Thorns Resistance', 95),
    createBattleCondition('Knockback Resistance', 95),
    createBattleCondition('Armored Enemies', 80),
    createBattleCondition('Plasma Cannon Resistance', 90),
    createBattleCondition('Protector\'s Ultimate', 95),
    createBattleCondition('Tank\'s Ultimate', 80),
    createBattleCondition('Scatter Ultimate', 80),
    createBattleCondition('Ray Ultimate', 80),
    createBattleCondition('Vampire Ultimate', 80),
    createBattleCondition('More Bosses', 5),
    createBattleCondition('ELS Reduction', 50),
    createBattleCondition('Fast\'s Ultimate', 80),
    createBattleCondition('Boss\'s Ultimate', 65, 'Boss Ultimate Lvl 65'),
    createBattleCondition('Basic\'s Ultimate', 50),
    createBattleCondition('Mass Enforcement', 1),
    createBattleCondition('Saboteur\'s Ultimate', 35),
    createBattleCondition('Commander\'s Ultimate', 20),
  ]),
  createTierData(24, 115, 23, 300, [
    createBattleCondition('Orb Resistance', 95),
    createBattleCondition('Death Ray Resistance', 95),
    createBattleCondition('Thorns Resistance', 95),
    createBattleCondition('Knockback Resistance', 95),
    createBattleCondition('Armored Enemies', 85),
    createBattleCondition('Plasma Cannon Resistance', 90),
    createBattleCondition('Protector\'s Ultimate', 95),
    createBattleCondition('Tank\'s Ultimate', 80),
    createBattleCondition('Scatter Ultimate', 80),
    createBattleCondition('Ray Ultimate', 80),
    createBattleCondition('Vampire Ultimate', 80),
    createBattleCondition('More Bosses', 5),
    createBattleCondition('ELS Reduction', 55),
    createBattleCondition('Fast\'s Ultimate', 80),
    createBattleCondition('Boss\'s Ultimate', 65, 'Boss Ultimate Lvl 65'),
    createBattleCondition('Basic\'s Ultimate', 65),
    createBattleCondition('Mass Enforcement', 1),
    createBattleCondition('Saboteur\'s Ultimate', 50),
    createBattleCondition('Commander\'s Ultimate', 35),
    createBattleCondition('Overcharge\'s Ultimate', 20),
  ]),
] as const satisfies readonly TierData[]

export const TIERS = TIER_DATA.map(row => row.tier)

export const TIER_COIN_BONUS_ROWS = TIER_DATA.map(row => ({
  tier: row.tier,
  coinBonus: row.coinBonus,
})) as readonly TierCoinBonusRow[]

export const TIER_UNLOCK_REQUIREMENT_ROWS = TIER_DATA.map(row => ({
  tier: row.tier,
  requiredPreviousTier: row.requiredPreviousTier,
  requiredWave: row.requiredWave,
})) as readonly TierUnlockRequirementRow[]

export const TIER_BATTLE_CONDITION_ROWS = TIER_DATA.flatMap(row =>
  row.battleConditions.map(condition => ({
    tier: row.tier,
    name: condition.name,
    level: condition.level,
    raw: condition.raw,
  }))) as readonly TierBattleConditionRow[]

export const TIER_BATTLE_CONDITION_TIERS = TIER_DATA.filter(row => row.battleConditions.length > 0)

export function getTierData(tier: number): TierData | undefined {
  return TIER_DATA.find(row => row.tier === tier)
}

/** Battle condition level for a tier (0 when absent). */
export function getTierBattleConditionLevel(tier: number, name: string): number {
  const tierData = getTierData(tier)
  const condition = tierData?.battleConditions.find(row => row.name === name)
  return condition?.level ?? 0
}
