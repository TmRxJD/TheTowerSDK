export interface LabLevel {
  level: number;
  cost: number;
  time: string;
  value: Array<Record<number, number>>;
  valueType?: 'percent' | 'flat' | 'duration' | 'multi';
}

export interface Lab {
  name: string;
  category: string;
  description: string;
  currency?: 'Q' | 'B' | 'T' | 'q';
  levels: LabLevel[];
  unit?: 'percent' | 'flat' | 'duration' | 'multi';
}

function createLevels(costs: number[], times: string[], values: number[], valueType: 'percent' | 'flat' | 'duration' | 'multi' = 'percent', includeLevelZero: boolean = false): LabLevel[] {
  const valueObj: Record<number, number> = {}
  if (includeLevelZero) {
    values.forEach((val, i) => {
      valueObj[i] = val
    })
  } else {
    values.forEach((val, i) => {
      valueObj[i + 1] = val
    })
  }
  const baseLevels = costs.map((cost, i) => ({
    level: i + 1,
    cost,
    time: times[i],
    value: [valueObj],
    valueType,
  }))
  return includeLevelZero ? [{ level: 0, cost: 0, time: '0s', value: [valueObj], valueType }].concat(baseLevels) : baseLevels
}

function formatHoursAsDuration(totalHours: number): string {
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return `${days}d ${hours}h 0m`
}

const assistSubstatCosts = Array.from({ length: 30 }, (_, i) => 0.25 * (i + 1))
const assistSubstatTimes = ['10d 19h 11m','21d 14h 22m','32d 9h 33m','43d 4h 45m','53d 23h 56m','64d 19h 7m','75d 14h 19m','86d 9h 30m','97d 4h 41m','107d 23h 53m','118d 19h 4m','129d 14h 15m','140d 9h 27m','151d 4h 38m','161d 23h 49m','172d 19h 0m','183d 14h 12m','194d 9h 23m','205d 4h 34m','215d 23h 46m','226d 18h 57m','237d 14h 8m','248d 9h 20m','259d 4h 31m','269d 23h 42m','280d 18h 54m','291d 14h 5m','302d 9h 16m','313d 4h 27m','323d 23h 39m']
const assistSubstatValues = Array.from({ length: 30 }, (_, i) => 0.01 * (i + 1))
const assistSubstatLevels = createLevels(assistSubstatCosts, assistSubstatTimes, assistSubstatValues)
const assistBonusLevels = assistSubstatLevels

const enemyAttackCosts = assistSubstatCosts
const enemyAttackTimes = assistSubstatTimes
const enemyAttackValues = Array.from({ length: 30 }, (_, i) => -0.004 * (i + 1))
const enemyAttackLevels = createLevels(enemyAttackCosts, enemyAttackTimes, enemyAttackValues)
const enemyDefenseLevels = enemyAttackLevels
// The Health labs for Ray, Vampire and Scatter had no table at all, so the
// tracker showed a real level and cap against 0 for every time and coin column.
// The Effective Paths reference has all three, and all 30 levels of both cost
// and time are identical to the Attack table -- so they share it, as Defense
// already does. Only cost and time are reference-verified; the effect value is
// inherited from Attack the same way Defense inherits it.
const enemyHealthLevels = enemyAttackLevels

const rangedCosts = [1,1.4,1.96,2.744,3.8416,5.37824,7.529536,10.5413504,14.75789056,20.66104678,28.9254655,40.4956517,56.69391238,79.37147733,111.1200683,155.5680956,217.7953338,304.9134673,426.8788542,597.6303959,836.6825543,1171.355576,1639.897806,2295.856929,3214.1997,4499.879581,6299.831413,8819.763978,12347.66957,17286.7374]
const rangedTimes = ['2d 16h 47m','5d 9h 35m','8d 2h 23m','10d 19h 11m','13d 11h 59m','16d 4h 46m','18d 21h 34m','21d 14h 22m','24d 7h 10m','26d 23h 58m','29d 16h 46m','32d 9h 33m','35d 2h 21m','37d 19h 9m','40d 11h 57m','43d 4h 45m','45d 21h 33m','48d 14h 20m','51d 7h 8m','53d 23h 56m','56d 16h 44m','59d 9h 32m','62d 2h 20m','64d 19h 7m','67d 11h 55m','70d 4h 43m','72d 21h 31m','75d 14h 19m','78d 7h 6m','80d 23h 54m']
const rangedValues = Array.from({ length: 30 }, (_, i) => -0.005 * (i + 1))
const rangedLevels = createLevels(rangedCosts, rangedTimes, rangedValues)

const mainCosts = [1,1.3,1.69,2.197,2.8561,3.71293,4.826809,6.2748517,8.15730721,10.60449937,13.78584918,17.92160394,23.29808512,30.28751066,39.37376386,51.18589301,66.54166092,86.50415919,112.455407,146.192029,190.0496377,247.0645291,321.1838878,417.5390541,542.8007704,705.6410015,917.3333019,1192.533293,1550.29328,2015.381264,2619.995644,3405.994337,4427.792638,5756.130429,7482.969558,9727.860425,12646.21855,16440.08412,21372.10935,27783.74216,36118.86481,46954.52425,61040.88153,79353.14598,103159.0898,134106.8167,174338.8617,226640.5202,294632.6763,383022.4792,497929.223,647307.9899,841500.3868,1093950.503,1422135.654,1848776.35,2403409.255,3124432.031,4061761.641,5280290.133,6864377.173,8923690.325,11600797.42,15081036.65,19605347.64,25486951.94,33133037.52,43072948.77,55994833.4,72793283.42,94631268.45,123020649,159926843.7,207904896.8,270276365.8,351359275.6,456767058.2,593797175.7,771936328.4,1003517227,1304572395,1695944114,2204727348,2866145552,3725989218,4843785983,6296921778,8185998311,10641797804,13834337145,17984638289,23380029776,30394038708,39512250321,51365925417,66775703042,86808413955,112850938141,146706219584,190718085459]
const mainTimes = ['1d 1h 55m','2d 3h 50m','3d 5h 45m','4d 7h 40m','5d 9h 35m','6d 11h 30m','7d 13h 25m','8d 15h 21m','9d 17h 16m','10d 19h 11m','11d 21h 6m','12d 23h 1m','14d 0h 56m','15d 2h 51m','16d 4h 46m','17d 6h 42m','18d 8h 37m','19d 10h 32m','20d 12h 27m','21d 14h 22m','22d 16h 17m','23d 18h 12m','24d 20h 8m','25d 22h 3m','26d 23h 58m','28d 1h 53m','29d 3h 48m','30d 5h 43m','31d 7h 38m','32d 9h 33m','33d 11h 29m','34d 13h 24m','35d 15h 19m','36d 17h 14m','37d 19h 9m','38d 21h 4m','39d 22h 59m','41d 0h 54m','42d 2h 50m','43d 4h 45m','44d 6h 40m','45d 8h 35m','46d 10h 30m','47d 12h 25m','48d 14h 20m','49d 16h 16m','50d 18h 11m','51d 20h 6m','52d 22h 1m','53d 23h 56m','55d 1h 51m','56d 3h 46m','57d 5h 41m','58d 7h 37m','59d 9h 32m','60d 11h 27m','61d 13h 22m','62d 15h 17m','63d 17h 12m','64d 19h 7m','65d 21h 2m','66d 22h 58m','68d 0h 53m','69d 2h 48m','70d 4h 43m','71d 6h 38m','72d 8h 33m','73d 10h 28m','74d 12h 24m','75d 14h 19m','76d 16h 14m','77d 18h 9m','78d 20h 4m','79d 21h 59m','80d 23h 54m','82d 1h 49m','83d 3h 45m','84d 5h 40m','85d 7h 35m','86d 9h 30m','87d 11h 25m','88d 13h 20m','89d 15h 15m','90d 17h 10m','91d 19h 6m','92d 21h 1m','93d 22h 56m','95d 0h 51m','96d 2h 46m','97d 4h 41m','98d 6h 36m','99d 8h 32m','100d 10h 27m','101d 12h 22m','102d 14h 17m','103d 16h 12m','104d 18h 7m','105d 20h 2m','106d 21h 57m','107d 23h 53m']
const mainValues = Array.from({ length: 100 }, (_, i) => 0.003 * (i + 1))
const mainLevels = createLevels(mainCosts, mainTimes.slice(0, 100), mainValues)

const battle1Costs = Array.from({ length: 20 }, (_, i) => 0.2 * (i + 1))
const battle1Times = ['13d 11h 59m','26d 23h 58m','40d 11h 57m','53d 23h 56m','67d 11h 55m','80d 23h 54m','94d 11h 53m','107d 23h 53m','121d 11h 52m','134d 23h 51m','148d 11h 50m','161d 23h 49m','175d 11h 48m','188d 23h 47m','202d 11h 47m','215d 23h 46m','229d 11h 45m','242d 23h 44m','256d 11h 43m','269d 23h 42m']
const battle1Values = Array.from({ length: 20 }, (_, i) => 0.01 * (i + 1))
const battle1Levels = createLevels(battle1Costs, battle1Times, battle1Values)

const battle2Costs = Array.from({ length: 20 }, (_, i) => 0.5 * (i + 1))
const battle2Times = ['16d 4h 46m','32d 9h 33m','48d 14h 20m','64d 19h 7m','80d 23h 54m','97d 4h 41m','113d 9h 28m','129d 14h 15m','145d 19h 2m','161d 23h 49m','178d 4h 36m','194d 9h 23m','210d 14h 10m','226d 18h 57m','242d 23h 44m','259d 4h 31m','275d 9h 18m','291d 14h 5m','307d 18h 52m','323d 23h 39m']
const battle2Values = battle1Values
const battle2Levels = createLevels(battle2Costs, battle2Times, battle2Values)

const battle3Costs = [1,1.5,2.25,3.375,5.0625,7.59375,11.390625,17.0859375,25.62890625,38.44335938]
const battle3Times = ['26d 23h 58m','37d 19h 9m','48d 14h 20m','59d 9h 32m','70d 4h 43m','80d 23h 54m','91d 19h 6m','102d 14h 17m','113d 9h 28m','124d 4h 40m']
const battle3Values = Array.from({ length: 10 }, (_, i) => 0.01 * (i + 1))
const battle3Levels = createLevels(battle3Costs, battle3Times, battle3Values)

const battle4Costs = [2,4,8,16,32,64,128,256,512,1024]
const battle4Times = ['26d 23h 58m','44d 19h 37m','62d 15h 17m','80d 10h 57m','98d 6h 36m','116d 2h 16m','133d 21h 56m','151d 17h 35m','169d 13h 15m','187d 8h 55m']
const battle4Values = battle3Values
const battle4Levels = createLevels(battle4Costs, battle4Times, battle4Values)

const QUADRILLION = 1e15

const dissonanceEchoCosts = [
  1,
  2.25,
  5.0625,
  11.390625,
  25.62890625,
  57.66503906,
  129.74633789,
  291.92926025,
  656.84083557,
  1477.89188004,
  3325.25673008,
  7481.82764268,
  16834.11219603,
  37876.75244106,
  85222.69299239,
  191751.05923288,
  431439.88327399,
  970739.73736648,
  2184164.40907457,
  4914369.92041778,
].map(cost => cost * QUADRILLION)
const dissonanceEchoTimes = Array.from({ length: 20 }, (_, i) => formatHoursAsDuration(500 * (i + 1)))
/** Level L grants (L + 1) × 0.5% echo benefit (level 0 = 0.5%). */
const dissonanceEchoValues = Array.from({ length: 21 }, (_, level) => 0.005 * (level + 1))
const attackEchoLevels = createLevels(dissonanceEchoCosts, dissonanceEchoTimes, dissonanceEchoValues, 'percent', true)
const defenseEchoLevels = attackEchoLevels
const utilityEchoLevels = attackEchoLevels
const uwEchoLevels = attackEchoLevels

const masteryCosts = [1.1, 1.3, 2.0, 3.4, 5.6, 7.7, 9.1, 9.8, 10.0]
const masteryTimes = ['500:00:00','750:00:00','1000:00:00','1250:00:00','1500:00:00','1750:00:00','2000:00:00','2250:00:00','2500:00:00']

const damageMasteryLevels = createLevels(masteryCosts, masteryTimes, [1.4,1.8,2.2,2.6,3,3.4,3.8,4.2,4.6,5], 'multi', true)
const attackSpeedMasteryLevels = createLevels(masteryCosts, masteryTimes, [1.03,1.06,1.09,1.12,1.15,1.18,1.21,1.24,1.27,1.3], 'multi', true)
const healthMasteryLevels = createLevels(masteryCosts, masteryTimes, [1.2,1.4,1.6,1.8,2,2.2,2.4,2.6,2.8,3], 'multi', true)
const healthRegenMasteryLevels = createLevels(masteryCosts, masteryTimes, [1.4,1.8,2.2,2.6,3,3.4,3.8,4.2,4.6,5], 'multi', true)
const rangeMasteryLevels = createLevels(masteryCosts, masteryTimes, [1.2,1.4,1.6,1.8,2,2.2,2.4,2.6,2.8,3], 'multi', true)
const cashMasteryLevels = createLevels(masteryCosts, masteryTimes, [0.4,0.8,1.2,1.6,2,2.24,2.8,3.2,3.6,4], 'percent', true)
const coinsMasteryLevels = createLevels(masteryCosts, masteryTimes, [1.03,1.06,1.09,1.12,1.15,1.18,1.21,1.24,1.27,1.3], 'multi', true)
const slowAuraMasteryLevels = createLevels(masteryCosts, masteryTimes, [5,10,15,20,25,30,35,40,45,50], 'percent', true)
const critChanceMasteryLevels = createLevels(masteryCosts, masteryTimes, [1,2,3,4,5,6,7,8,9,10], 'percent', true)
const enemyBalanceMasteryLevels = createLevels(masteryCosts, masteryTimes, [6,12,18,24,30,36,42,28,54,60], 'percent', true)
const defenseMasteryLevels = createLevels(masteryCosts, masteryTimes, [0.7,1.4,2.1,2.8,3.5,4.2,4.9,5.6,6.3,7], 'percent', true)
const fortressMasteryLevels = createLevels(masteryCosts, masteryTimes, [10,20,30,40,50,60,70,80,90,100], 'duration', true)
const freeupsMasteryLevels = createLevels(masteryCosts, masteryTimes, [1,2,3,4,5,6,7,8,9,10], 'flat', true)
const extraOrbMasteryLevels = createLevels(masteryCosts, masteryTimes, [1.04,1.08,1.12,1.16,1.2,1.24,1.28,1.32,1.36,1.4], 'multi', true)
const plasmaCannonMasteryLevels = createLevels(masteryCosts, masteryTimes, [5,10,15,20,25,30,35,40,45,50], 'percent', true)
const critCoinMasteryLevels = createLevels(masteryCosts, masteryTimes, [10,20,30,40,50,60,70,80,90,100], 'percent', true)
const introSprintMasteryLevels = createLevels(masteryCosts, masteryTimes, [1.8,3.6,5.4,7.2,9,10.8,12.6,14.4,16.2,18], 'multi', true)
const landMineStunMasteryLevels = createLevels(masteryCosts, masteryTimes, [2.7,5.4,8.1,10.8,13.5,16.2,18.9,21.6,24.3,27], 'percent', true)
const recoveryPackageMasteryLevels = createLevels(masteryCosts, masteryTimes, [0.4,0.8,1.2,1.4,1.8,2.4,2.8,3.2,3.6,4], 'percent', true)
const deathRayMasteryLevels = createLevels(masteryCosts, masteryTimes, [5,10,15,20,25,30,35,40,45,50], 'percent', true)
const energyNetMasteryLevels = createLevels(masteryCosts, masteryTimes, [2,4,6,8,10,12,14,16,18,20], 'multi', true)
const superTowerMasteryLevels = createLevels(masteryCosts, masteryTimes, [3,6,9,12,15,18,21,24,27,30], 'duration', true)
const secondWindMasteryLevels = createLevels(masteryCosts, masteryTimes, [1.9,2.8,3.7,4.6,5.5,6.4,7.3,8.2,9.1,10], 'multi', true)
const demonModeMasteryLevels = createLevels(masteryCosts, masteryTimes, [1.5,2,2.5,3,3.5,4,4.5,5,5.5,6], 'multi', true)
const energyShieldMasteryLevels = createLevels(masteryCosts, masteryTimes, [5,10,15,20,25,30,35,40,45,50], 'percent', true)
const waveAcceleratorMasteryLevels = createLevels(masteryCosts, masteryTimes, [110,120,130,140,150,160,170,180,190,200], 'percent', true)
const berzerkerMasteryLevels = createLevels(masteryCosts, masteryTimes, [30,60,90,120,150,180,210,240,270,300], 'duration', true)
// Wave Skip Mastery is the one card mastery with no effect data anywhere: not
// in the game dump (its cards section is empty), not in the Effective Paths
// sheet (which models all 31 masteries as a single shared row), and not in the
// towerai knowledge base. Its cost and time are not in doubt -- every mastery
// shares masteryCosts/masteryTimes -- so it is listed with those and a zeroed
// effect, which leaves the tracker's time and coin columns correct instead of
// blank. The zeros mean "not known", not "no effect"; replace them the moment
// the values can be read off the game.
const waveSkipMasteryLevels = createLevels(masteryCosts, masteryTimes, [0,0,0,0,0,0,0,0,0,0], 'percent', true)
const ultimateCritMasteryLevels = createLevels(masteryCosts, masteryTimes, [0.3,0.7,1,1.3,1.7,2,2.3,2.7,3,3.3], 'percent', true)
const nukeMasteryLevels = createLevels(masteryCosts, masteryTimes, [5,10,15,20,25,30,35,40,45,50], 'percent', true)
const aoeMasteryLevels = createLevels(masteryCosts, masteryTimes, [2.5,5,7.5,10,12.5,15,17.5,20,22.5,25], 'percent', true)

export const labs: Lab[] = [
  { name: 'Dissonant Echo - Attack', category: 'Main', description: 'Allows a percent of Attack dissonance bonus to apply as a global tier bonus.', levels: attackEchoLevels, unit: 'percent' },
  { name: 'Dissonant Echo - Defense', category: 'Main', description: 'Allows a percent of Defense dissonance bonus to apply as a global tier bonus.', levels: defenseEchoLevels, unit: 'percent' },
  { name: 'Dissonant Echo - Utility', category: 'Main', description: 'Allows a percent of Utility dissonance bonus to apply as a global tier bonus.', levels: utilityEchoLevels, unit: 'percent' },
  { name: 'Dissonant Echo - Ultimate Weapons', category: 'Main', description: 'Allows a percent of Ultimate Weapon dissonance bonus to apply as a global tier bonus.', levels: uwEchoLevels, unit: 'percent' },
  { name: 'Damage Mastery', category: 'Card Mastery', description: 'Increases the card\'s stat multiplier', currency: 'q', levels: damageMasteryLevels, unit: 'multi' },
  { name: 'Attack Speed Mastery', category: 'Card Mastery', description: 'Increases the card\'s stat multiplier', currency: 'q', levels: attackSpeedMasteryLevels, unit: 'multi' },
  { name: 'Health Mastery', category: 'Card Mastery', description: 'Increases the card\'s stat multiplier', currency: 'q', levels: healthMasteryLevels, unit: 'multi' },
  { name: 'Health Regen Mastery', category: 'Card Mastery', description: 'Increases the card\'s stat multiplier', currency: 'q', levels: healthRegenMasteryLevels, unit: 'multi' },
  { name: 'Range Mastery', category: 'Card Mastery', description: 'Adds an additional multiplier to increase Damage / Meter', currency: 'q', levels: rangeMasteryLevels, unit: 'multi' },
  { name: 'Cash Mastery', category: 'Card Mastery', description: 'Adds a chance for Elites to drop Reroll Dice', currency: 'q', levels: cashMasteryLevels, unit: 'percent' },
  { name: 'Coins Mastery', category: 'Card Mastery', description: 'Increases the card\'s stat multiplier', currency: 'q', levels: coinsMasteryLevels, unit: 'multi' },
  { name: 'Slow Aura Mastery', category: 'Card Mastery', description: 'All enemies in tower range speed decreased by x%', currency: 'q', levels: slowAuraMasteryLevels, unit: 'percent' },
  { name: 'Critical Chance Mastery', category: 'Card Mastery', description: 'Increase critical chance by +x%', currency: 'q', levels: critChanceMasteryLevels, unit: 'percent' },
  { name: 'Enemy Balance Mastery', category: 'Card Mastery', description: 'Increase enemies spawned each wave, cash earned per kill increased by x', currency: 'q', levels: enemyBalanceMasteryLevels, unit: 'percent' },
  { name: 'Extra Defense Mastery', category: 'Card Mastery', description: 'Increases the card\'s stat multiplier', currency: 'q', levels: defenseMasteryLevels, unit: 'percent' },
  { name: 'Fortress Mastery', category: 'Card Mastery', description: 'Reduce Wall rebuild time', currency: 'q', levels: fortressMasteryLevels, unit: 'duration' },
  { name: 'Free Upgrades Mastery', category: 'Card Mastery', description: 'Adds a number of locked stats that are not impacted by free upgrades. This is set before the run starts, and cannot by changed mid run', currency: 'q', levels: freeupsMasteryLevels, unit: 'flat' },
  { name: 'Extra Orb Mastery', category: 'Card Mastery', description: 'Adds a coin bonus to enemies hit by orbs', currency: 'q', levels: extraOrbMasteryLevels, unit: 'multi' },
  { name: 'Plasma Cannon Mastery', category: 'Card Mastery', description: 'Plasma Cannon fires at Elite enemies for a % reduction in damage', currency: 'q', levels: plasmaCannonMasteryLevels, unit: 'percent' },
  { name: 'Critical Coin Mastery', category: 'Card Mastery', description: 'Adds a chance to drop 2 coins instead of 1', currency: 'q', levels: critCoinMasteryLevels, unit: 'percent' },
  { name: 'Intro Sprint Mastery', category: 'Card Mastery', description: 'Dramatically increase how many waves Intro Sprint stays active', currency: 'q', levels: introSprintMasteryLevels, unit: 'multi' },
  { name: 'Land Mine Stun Mastery', category: 'Card Mastery', description: 'Causes enemies stunned by a Land Mine to have a chance to miss their attacks', currency: 'q', levels: landMineStunMasteryLevels, unit: 'percent' },
  { name: 'Recovery Package Chance Mastery', category: 'Card Mastery', description: 'Gives packages a chance to also deliver a common module', currency: 'q', levels: recoveryPackageMasteryLevels, unit: 'percent' },
  { name: 'Death Ray Mastery', category: 'Card Mastery', description: 'Allows Death Ray a chance to partially pierce protector\'s shields', currency: 'q', levels: deathRayMasteryLevels, unit: 'percent' },
  { name: 'Energy Net Mastery', category: 'Card Mastery', description: 'Adds a damage multiplier to bosses while trapped by the net, lingers for 10s after', currency: 'q', levels: energyNetMasteryLevels, unit: 'multi' },
  { name: 'Super Tower Mastery', category: 'Card Mastery', description: 'Causes 35% of card\'s multiplier effect to increase all Ultimate Weapon damage and decreases Super Tower Cooldown', currency: 'q', levels: superTowerMasteryLevels, unit: 'duration' },
  { name: 'Second Wind Mastery', category: 'Card Mastery', description: 'Unlocks a lingering health regen buff when activated which lasts for 400 waves', currency: 'q', levels: secondWindMasteryLevels, unit: 'multi' },
  { name: 'Demon Mode Mastery', category: 'Card Mastery', description: 'Unlocks a lingering damage buff when activated which lasts for 300 waves', currency: 'q', levels: demonModeMasteryLevels, unit: 'multi' },
  { name: 'Energy Shield Mastery', category: 'Card Mastery', description: 'Energy Shield activates a blast that repels all enemies back by a percent of tower max range and destroys all enemy projectiles. The charge times of Rays are reset.', currency: 'q', levels: energyShieldMasteryLevels, unit: 'percent' },
  { name: 'Wave Accelerator Mastery', category: 'Card Mastery', description: 'Increases the rate at which spawn rates accelerate causing more enemies to spawn in earlier waves', currency: 'q', levels: waveAcceleratorMasteryLevels, unit: 'percent' },
  { name: 'Wave Skip Mastery', category: 'Card Mastery', description: 'Increases the effect of the Wave Skip card', currency: 'q', levels: waveSkipMasteryLevels, unit: 'percent' },
  { name: 'Berzerker Mastery', category: 'Card Mastery', description: 'Increases the damage cap to x500 for a duration when Death Defy is activated', currency: 'q', levels: berzerkerMasteryLevels, unit: 'duration' },
  { name: 'Ultimate Crit Mastery', category: 'Card Mastery', description: 'Increases the card\'s stat multiplier', currency: 'q', levels: ultimateCritMasteryLevels, unit: 'percent' },
  { name: 'Nuke Mastery', category: 'Card Mastery', description: 'Unlocks a lingering attack speed slow which lasts for 300 waves after the Nuke', currency: 'q', levels: nukeMasteryLevels, unit: 'percent' },
  { name: 'Area of Effect Mastery', category: 'Card Mastery', description: 'Increases the range of all damage area of effects.', currency: 'q', levels: aoeMasteryLevels, unit: 'percent' },
  { name: 'Assist Module Substats - Cannon', category: 'Modules', description: 'Increases substats for Cannon assist modules.', currency: 'Q', levels: assistSubstatLevels },
  { name: 'Assist Module Substats - Armor', category: 'Modules', description: 'Increases substats for Armor assist modules.', currency: 'Q', levels: assistSubstatLevels },
  { name: 'Assist Module Substats - Generator', category: 'Modules', description: 'Increases substats for Generator assist modules.', currency: 'Q', levels: assistSubstatLevels },
  { name: 'Assist Module Substats - Core', category: 'Modules', description: 'Increases substats for Core assist modules.', currency: 'Q', levels: assistSubstatLevels },
  { name: 'Assist Module Bonus - Cannon', category: 'Modules', description: 'Increases bonus for Cannon assist modules.', currency: 'Q', levels: assistBonusLevels },
  { name: 'Assist Module Bonus - Armor', category: 'Modules', description: 'Increases bonus for Armor assist modules.', currency: 'Q', levels: assistBonusLevels },
  { name: 'Assist Module Bonus - Generator', category: 'Modules', description: 'Increases bonus for Generator assist modules.', currency: 'Q', levels: assistBonusLevels },
  { name: 'Assist Module Bonus - Core', category: 'Modules', description: 'Increases bonus for Core assist modules.', currency: 'Q', levels: assistBonusLevels },
  { name: 'Ray Enemy Attack', category: 'Enemies', description: 'Reduces attack power of Ray enemies.', currency: 'Q', levels: enemyAttackLevels },
  { name: 'Ray Enemy Defense', category: 'Enemies', description: 'Reduces defense of Ray enemies.', currency: 'Q', levels: enemyDefenseLevels },
  { name: 'Vampire Enemy Attack', category: 'Enemies', description: 'Reduces attack power of Vampire enemies.', currency: 'Q', levels: enemyAttackLevels },
  { name: 'Vampire Enemy Defense', category: 'Enemies', description: 'Reduces defense of Vampire enemies.', currency: 'Q', levels: enemyDefenseLevels },
  { name: 'Scatter Enemy Attack', category: 'Enemies', description: 'Reduces attack power of Scatter enemies.', currency: 'Q', levels: enemyAttackLevels },
  { name: 'Scatter Enemy Defense', category: 'Enemies', description: 'Reduces defense of Scatter enemies.', currency: 'Q', levels: enemyDefenseLevels },
  { name: 'Ray Enemy Health', category: 'Enemies', description: 'Reduces health of Ray enemies.', currency: 'Q', levels: enemyHealthLevels },
  { name: 'Vampire Enemy Health', category: 'Enemies', description: 'Reduces health of Vampire enemies.', currency: 'Q', levels: enemyHealthLevels },
  { name: 'Scatter Enemy Health', category: 'Enemies', description: 'Reduces health of Scatter enemies.', currency: 'Q', levels: enemyHealthLevels },
  { name: 'Ranged Enemy Range', category: 'Enemies', description: 'Reduces range of Ranged enemies.', currency: 'T', levels: rangedLevels },
  { name: 'Enhancement Attack - Coin Discount', category: 'Main', description: 'Reduces coin cost for Attack enhancements.', currency: 'B', levels: mainLevels },
  { name: 'Enhancement Defense - Coin Discount', category: 'Main', description: 'Reduces coin cost for Defense enhancements.', currency: 'B', levels: mainLevels },
  { name: 'Enhancement Utility - Coin Discount', category: 'Main', description: 'Reduces coin cost for Utility enhancements.', currency: 'B', levels: mainLevels },
  { name: 'Knockback Resistance', category: 'Battle Condition (Resistances)', description: 'Increases resistance to knockback effects.', currency: 'Q', levels: battle1Levels },
  { name: 'Thorns Resistance', category: 'Battle Condition (Resistances)', description: 'Increases resistance to thorns damage.', currency: 'Q', levels: battle1Levels },
  { name: 'Orb Resistance', category: 'Battle Condition (Resistances)', description: 'Increases resistance to orb damage.', currency: 'Q', levels: battle1Levels },
  { name: 'Plasma Cannon Resistance', category: 'Battle Condition (Resistances)', description: 'Increases resistance to Plasma Cannon damage.', currency: 'Q', levels: battle1Levels },
  { name: 'Death Ray Resistance', category: 'Battle Condition (Resistances)', description: 'Increases resistance to Death Ray damage.', currency: 'Q', levels: battle1Levels },
  { name: 'Armored Enemies', category: 'Battle Condition (Enemy/Spawn Buffs)', description: 'Increases enemy armor.', currency: 'Q', levels: battle2Levels },
  { name: 'Enemy Speed', category: 'Battle Condition (Enemy/Spawn Buffs)', description: 'Increases enemy movement speed.', currency: 'Q', levels: battle2Levels },
  { name: 'More Enemies', category: 'Battle Condition (Enemy/Spawn Buffs)', description: 'Increases number of enemies spawned.', currency: 'Q', levels: battle2Levels },
  { name: 'Enemy Attack Speed', category: 'Battle Condition (Enemy/Spawn Buffs)', description: 'Increases enemy attack speed.', currency: 'Q', levels: battle2Levels },
  { name: 'Fast\'s Ultimate', category: 'Battle Condition (Enemy Ultimates)', description: 'Enables Fast enemy ultimate abilities.', currency: 'Q', levels: battle3Levels },
  { name: 'Ranged Ultimate', category: 'Battle Condition (Enemy Ultimates)', description: 'Enables Ranged enemy ultimate abilities.', currency: 'Q', levels: battle3Levels },
  { name: 'Boss\'s Ultimate', category: 'Battle Condition (Enemy Ultimates)', description: 'Enables Boss enemy ultimate abilities.', currency: 'Q', levels: battle3Levels },
  { name: 'Basic\'s Ultimate', category: 'Battle Condition (Enemy Ultimates)', description: 'Enables Basic enemy ultimate abilities.', currency: 'Q', levels: battle3Levels },
  { name: 'Tank\'s Ultimate', category: 'Battle Condition (Enemy Ultimates)', description: 'Enables Tank enemy ultimate abilities.', currency: 'Q', levels: battle3Levels },
  { name: 'Protector\'s Ultimate', category: 'Battle Condition (Enemy Ultimates)', description: 'Enables Protector enemy ultimate abilities.', currency: 'Q', levels: battle3Levels },
  { name: 'Ultimate Weapon Durations', category: 'Battle Condition (Durations/Reductions)', description: 'Increases duration of ultimate weapons.', currency: 'Q', levels: battle4Levels },
  { name: 'Death Defy Down', category: 'Battle Condition (Durations/Reductions)', description: 'Reduces Death Defy duration.', currency: 'Q', levels: battle4Levels },
  { name: 'Energy Shields Down', category: 'Battle Condition (Durations/Reductions)', description: 'Reduces Energy Shields duration.', currency: 'Q', levels: battle4Levels },
  { name: 'Enemy Level Skip Reduction', category: 'Battle Condition (Durations/Reductions)', description: 'Reduces enemy level skip effects.', currency: 'Q', levels: battle4Levels },
]
