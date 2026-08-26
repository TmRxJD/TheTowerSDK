/**
 * Perks, as the game defines them.
 *
 * Read off the wiki on 2026-08-16.
 *
 * The trap worth the whole file: **perks stack by two different formulas**, and
 * which one applies is a property of the perk, not of its wording. Additive
 * perks are `base × qty × (1 + SPB)`; multiplicative perks are
 * `(1 + base × qty) × (1 + SPB)`. Using one formula for both produces numbers
 * that look reasonable at quantity 1 and drift badly by quantity 5 — the
 * signature shape of a defect nothing here reports.
 */
import { PERK_POOL_MAP, PERK_POOL_RATES, STANDARD_PERKS, TRADE_OFF_PERKS, UW_PERKS } from '../../data/perks'
import {
  PERK_44_IS_A_FLAG,
  PERK_ADDITIVE_MISSING_FROM_WIKI,
  PERK_APPLIED_AS,
  PERK_BENEFIT_UP_FORMULA,
  PERK_IMPORT_CATALOG,
  PERK_INDICES_CORRECTED_FROM_GAME,
  PERK_INTEGER_BENEFIT_INDICES,
  PERK_STANDARD_INDICES,
  PERK_TRADE_OFF_INDICES,
  PERK_UW_INDICES,
} from '../../save/catalogs/perks'
import {
  PERK_INDEX_WITH_HALF_LAB,
  PERK_INDICES_RETURNING_COMPLEMENT,
  PERK_INDICES_WITHOUT_LAB_SCALING,
  PERK_LAB_RESEARCH_INDEX,
} from '../../mechanics/perk-benefit'
import type { KnowledgeEdge, KnowledgeNode } from '../substrate/schema'

/**
 * Counts derived from PERK_APPLIED_AS rather than transcribed beside it.
 *
 * A hand-written count is a second source that disagrees silently the moment
 * the table changes; this repo has shipped that exact defect in CARDS_BY_RARITY
 * and BOT_UPGRADE_STATS.
 */
const PERK_APPLIED_FORM_COUNTS = Object.values(PERK_APPLIED_AS)
  .reduce<Record<string, number>>((counts, form) => {
    counts[form] = (counts[form] ?? 0) + 1
    return counts
  }, { multiply: 0, add: 0, flag: 0, grant: 0 })

const WIKI_PERKS = {
  origin: 'wiki',
  ref: 'Perks',
  verifiedAt: '2026-08-16',
} as const

/** Read from the shipped catalog rather than transcribed, so it cannot drift. */
const CATALOG_PERKS = {
  origin: 'code',
  ref: 'thetowersdk/data perks',
  verifiedAt: '2026-08-17',
} as const

/** The Perks class in the v28.3 dump: its constants and its own methods. */
/** The perk value tables, read out of `Perks.Initialize`. */
const GAME_PERK_TABLES = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

const GAME_PERKS = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/**
 * How the perk pool is split when choices are rolled.
 *
 * Confirmed against the game on 2026-08-18: `Perks.ULTIMATE_CHANCE = 0.2` and
 * `Perks.TRADE_OFF_CHANCE = 0.15` are compile-time constants in the dump.
 *
 * There is NO standard constant. 0.65 is the residual, `1 - 0.2 - 0.15`, which
 * matters for two reasons: it cannot be independently wrong, and if either
 * named constant ever changes the standard share moves with it silently.
 */
export const PERK_POOL_WEIGHTS: Readonly<Record<string, number>> = {
  standard: 1 - 0.2 - 0.15,
  ultimateWeapon: 0.2,
  tradeOff: 0.15,
}

/** The two rates the game actually declares. The third is what is left over. */
export const PERK_POOL_WEIGHTS_FROM_GAME_CONSTANTS = {
  ultimateWeapon: 0.2,
  tradeOff: 0.15,
} as const

/**
 * Base waves needed per perk, by how many perks have already been taken.
 *
 * All four confirmed against the game's own constants on 2026-08-18:
 * `WAVES_TO_PERK = 200`, `WAVES_TO_PERK_20 = 250`, `WAVES_TO_PERK_30 = 300`,
 * `WAVES_TO_PERK_40 = 350`. The constant names carry the thresholds, so the
 * "after 20 / 30 / 40 perks" reading is the game's, not an inference.
 */
export const PERK_WAVES_REQUIRED_BY_COUNT: readonly { afterPerks: number, waves: number }[] = [
  { afterPerks: 0, waves: 200 },
  { afterPerks: 20, waves: 250 },
  { afterPerks: 30, waves: 300 },
  { afterPerks: 40, waves: 350 },
]

/**
 * The wave-requirement formula.
 *
 *   waves = trunc( (1 - PerkBenefitUp(10)) * (baseWave - wavesRequiredLab) )
 *
 * Three things this settles that prose could not:
 *
 * - the LAB is subtracted from the base BEFORE the perk multiplier applies, so
 *   the two do not commute;
 * - the perk term is `1 - benefit`, a single multiplier, not a per-perk loop;
 * - the result is truncated (`fcvtzs`), not rounded.
 */
export const PERK_WAVE_REQUIREMENT_ORDER = [
  'subtract the Waves Required lab from the base wave',
  'multiply by (1 - Perk Wave Requirement benefit)',
  'truncate toward zero',
] as const

/** Max times each standard perk can be taken in one run. */
export const STANDARD_PERK_MAX_QUANTITY: Readonly<Record<string, number>> = {
  'x1.20 Max Health': 5,
  'x1.15 Damage': 5,
  'x1.15 All Coin Bonuses': 5,
  'x1.15 Defense Absolute': 5,
  'x1.15 Cash Bonus': 5,
  'x1.75 Health Regen': 5,
  'Interest x1.50': 5,
  'Land Mine Damage x3.50': 5,
  'Free Upgrade Chance for All +5.0%': 5,
  'Defense Percent +4.00': 5,
  'Bounce Shot +2': 3,
  // -20%, not -25%. Corrected 2026-08-17 against STANDARD_PERKS, and confirmed
  // independently by the worked example in PERK_WAVE_REQUIREMENT_FORMULA: SPB 8%
  // with 3 of these gives 64.8%, which is 0.20 x 1.08 x 3. At 0.25 it would be
  // 81% and the example's 69.344 waves would be 37.43. See perk.waveRequirement.
  'Perk Wave Requirement -20.00%': 3,
  'Orbs +1': 2,
  'Unlock a Random Ultimate Weapon': 1,
  'Increase Max Game Speed by +1.00': 1,
}

/**
 * Where the engine actually READS each perk.
 *
 * Found by mapping every class with `map-v283-methods.py` and collecting the
 * methods that call `Perks.PerkBenefitUp` or `PerkBenefitDown`, together with
 * the perk indices each references. Twenty methods do.
 *
 * Every index below was then checked against `PERK_IMPORT_CATALOG` by name, and
 * all ten spot-checks matched: index 24 in `GetGoldenTowerBonus` is "Golden
 * Tower Bonus x1.5", index 27 in `GetBlackHoleDuration` is "Black Hole Duration
 * +12.0s", and so on. Ten independent name matches is what makes this a reading
 * rather than a guess — an immediate scraped from the binary is otherwise
 * indistinguishable from a loop counter.
 */
const GAME_PERK_CONSUMERS = {
  origin: 'game',
  ref: 'callers of Perks.PerkBenefitUp / PerkBenefitDown across the mapped classes',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/**
 * Perk index -> the method that consumes it. Corroborated by catalog name.
 *
 * Note what is NOT here: a perk does not apply itself. Nothing walks a list of
 * taken perks and multiplies a running total. Each consumer asks for the perks
 * IT cares about, at the point it needs them.
 */
export const PERK_CONSUMER_METHODS: Readonly<Record<number, string>> = {
  12: 'Main.get_GameMaxSpeedWithBuffs',
  20: 'Main.GetSmartMissilesQuantity',
  22: 'Main.GetDeathwaveQuantity',
  24: 'Main.GetGoldenTowerBonus',
  25: 'Main.GetChainLightningDamage',
  26: 'Main.GetChronoFieldDuration',
  27: 'Main.GetBlackHoleDuration',
  28: 'Main.GetSpotlightBonus',
  40: 'Enemy.GetEnemyBaseHealth',
  42: 'Enemy.GetEnemyBaseHealth',
  43: 'Enemy.GetEnemyBaseDamage',
  44: 'Enemy.GetEnemyBaseDamage',
  45: 'Enemy.GetEnemyBaseSpeed',
  48: 'Enemy.GetEnemyBaseHealth',
}

/** Perks applied inside the enemy's own base-stat getters, not downstream. */
export const PERKS_APPLIED_TO_ENEMY_BASE = [40, 42, 43, 44, 45, 48] as const

/** How many methods across the binary read a perk benefit at all. */
export const PERK_CONSUMER_METHOD_COUNT = 20

export const PERK_KNOWLEDGE_NODES: readonly KnowledgeNode[] = [
  {
    id: 'perk.consumers',
    label: 'Where each perk is read',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      `${PERK_CONSUMER_METHOD_COUNT} methods call \`Perks.PerkBenefitUp\` or \`PerkBenefitDown\`, `
      + 'each asking only for the perks it needs. A perk is not applied by a central loop — it is '
      + 'pulled at the point of use, which is why the same perk can reach two different systems '
      + 'and why a missing consumer is invisible.',
    units: 'perk index to consuming method',
    disambiguation:
      'This is WHERE a perk is read, which is a different question from what it returns '
      + '([[perk.benefitFormula]]) and from what the call site does with it '
      + '([[perk.applicationForm]]). All three are needed to place a perk in a simulation, and '
      + 'each has been got wrong here independently.',
    implementedBy: ['PERK_CONSUMER_METHODS', 'PERKS_APPLIED_TO_ENEMY_BASE'],
    traps: [
      'ENEMY-WEAKENING PERKS ARE APPLIED TO THE ENEMY\'S BASE, NOT DOWNSTREAM. All '
      + `${PERKS_APPLIED_TO_ENEMY_BASE.length} of them are read inside `
      + '`Enemy.GetEnemyBaseHealth`, `GetEnemyBaseDamage` or `GetEnemyBaseSpeed`. So "Enemies '
      + 'Have -50% Health" is already in the number every later step sees, and applying it again '
      + 'as a separate multiplier halves the enemy twice.',
      'THE ULTIMATE WEAPON PERKS ARE READ BY THE WEAPON, NOT BY A PERK SYSTEM. Indices 20 and 22 '
      + 'and 24 through 28 each surface in the getter for their own weapon — Smart Missiles '
      + 'quantity, Death Wave quantity, Golden Tower bonus, Chain Lightning damage, Chrono Field '
      + 'duration, Black Hole duration, Spotlight bonus. A model that applies UW perks as a '
      + 'generic multiplier on ultimate weapon damage misses that most of them change QUANTITY or '
      + 'DURATION rather than damage.',
      'THERE IS NO CENTRAL PERK LOOP. Nothing iterates taken perks and accumulates a total, so '
      + '"apply all perks" is not an operation the game has. A simulation that adds one loses the '
      + 'ordering — each consumer applies its perk at its own point in its own formula.',
      'AN INDEX SCRAPED FROM THE BINARY LOOKS EXACTLY LIKE A LOOP COUNTER. Every index in this '
      + 'table was confirmed against the catalog by NAME before being recorded. The low integers '
      + 'that appear beside them in the same methods — 1, 5, 8 — were not, and are not here.',
    ],
    assertions: [
      { subject: 'perk.consumers', predicate: 'methodsReadingPerkBenefits', value: PERK_CONSUMER_METHOD_COUNT, provenance: GAME_PERK_CONSUMERS, verification: 'verified_here' as const },
      { subject: 'perk.consumers', predicate: 'perksWithAKnownConsumer', value: Object.keys(PERK_CONSUMER_METHODS).length, provenance: GAME_PERK_CONSUMERS, verification: 'verified_here' as const },
      { subject: 'perk.consumers', predicate: 'perksAppliedToEnemyBase', value: PERKS_APPLIED_TO_ENEMY_BASE.length, provenance: GAME_PERK_CONSUMERS, verification: 'verified_here' as const },
      { subject: 'perk.consumers', predicate: 'hasACentralPerkApplicationLoop', value: false, provenance: GAME_PERK_CONSUMERS, verification: 'verified_here' as const },
      { subject: 'perk.consumers', predicate: 'distinctConsumingMethods', value: new Set(Object.values(PERK_CONSUMER_METHODS)).size, provenance: GAME_PERK_CONSUMERS, verification: 'verified_here' as const },
    ],
    sources: [GAME_PERK_CONSUMERS],
  },

  {
    id: 'perk',
    label: 'Perk',
    kind: 'system',
    summary:
      'An in-run advantage chosen at wave milestones. Three kinds — standard (65% of the pool), '
      + 'ultimate-weapon (20%) and trade-off (15%). Unlocked via the Unlock Perks lab, itself '
      + 'gated behind the Tier 2 Wave 150 milestone.',
    traps: [
      'Perks last for the run only. Treating a perk bonus as a permanent account stat overstates '
      + 'every between-run calculation.',
      'A roll can come up entirely trade-off perks even when standard perks are available, so '
      + '"the player will take the best perk" is not a safe planning assumption.',
    ],
    implementedBy: ['PERK_IMPORT_CATALOG', 'PERK_STANDARD_INDICES'],
    assertions: [
      { subject: 'perk', predicate: 'standardPerkCount', value: PERK_STANDARD_INDICES.length, provenance: CATALOG_PERKS, verification: 'verified_here' as const },
      { subject: 'perk', predicate: 'ultimateWeaponPerkCount', value: PERK_UW_INDICES.length, provenance: CATALOG_PERKS, verification: 'verified_here' as const },
      { subject: 'perk', predicate: 'tradeOffPerkCount', value: PERK_TRADE_OFF_INDICES.length, provenance: CATALOG_PERKS, verification: 'verified_here' as const },
      // The three pools must account for the whole catalog, or a perk exists
      // that no pool can draw and nothing says so.
      { subject: 'perk', predicate: 'poolsCoverTheCatalog', value: PERK_STANDARD_INDICES.length + PERK_UW_INDICES.length + PERK_TRADE_OFF_INDICES.length === PERK_IMPORT_CATALOG.length, provenance: CATALOG_PERKS, verification: 'verified_here' as const },
    ],
    // Listed because this node's own assertions read the perk catalog.
    sources: [WIKI_PERKS, CATALOG_PERKS],
  },
  {
    id: 'perk.stacking',
    label: 'Perk stacking formula',
    kind: 'rule',
    summary:
      'Additive perks (Defense %, Perk Wave Requirement): Total = Base × Quantity × (1 + Standard '
      + 'Perk Bonus). Multiplicative perks (Coin Bonus, Health, Damage): Total = (1 + Base × '
      + 'Quantity) × (1 + Standard Perk Bonus).',
    traps: [
      'Which formula applies is a property of the perk and is not derivable from its label. '
      + 'Applying one to both is correct at quantity 1 and increasingly wrong up to quantity 5.',
      'Standard Perk Bonus multiplies the whole result in both formulas — it is not a separate '
      + 'additive term to tack on afterwards.',
      'THE WIKI MEMBERSHIP LIST HERE IS WRONG, THOUGH THE TWO FORMULAS ARE RIGHT. It names "Def %, '
      + 'Perks Wave Required" as the additive perks. The game applies Perk Wave Requirement as a '
      + 'multiplier (`1 - benefit`), and adds four perks this list omits — Bounce Shot, Orbs, Free '
      + 'Upgrade Chance for All, and Increase Max Game Speed. See [[perk.applicationForm]], which '
      + 'holds the per-perk form read from the call sites.',
    ],
    implementedBy: ['STANDARD_PERK_MAX_QUANTITY'],
    assertions: [
      { subject: 'perk.stacking', predicate: 'standardPerkBonusMultipliesWholeResult', value: true, provenance: WIKI_PERKS },
      { subject: 'perk.stacking', predicate: 'formulaCount', value: 2, provenance: WIKI_PERKS },
    ],
    sources: [{ ...WIKI_PERKS, section: 'Standard Perk Math' }],
  },
  {
    id: 'perk.quantity',
    label: 'Perk quantity',
    kind: 'stat',
    summary:
      'How many times one perk may be taken in a run — 5 for most standard perks, 3 for Bounce '
      + 'Shot and Perk Wave Requirement, 2 for Orbs, 1 for UW and trade-off perks.',
    units: 'count',
    traps: [
      'Quantity caps differ per perk. A planner stacking a perk past its cap produces a build the '
      + 'game will not allow.',
    ],
    implementedBy: ['STANDARD_PERK_MAX_QUANTITY'],
    assertions: [
      { subject: 'perk.quantity', predicate: 'pricedPerkCount', value: Object.keys(STANDARD_PERK_MAX_QUANTITY).length, provenance: CATALOG_PERKS, verification: 'verified_here' as const },
      // Derived: the common cap is 5, and stating the maximum separately means
      // a perk with a different ceiling shows up instead of hiding behind it.
      { subject: 'perk.quantity', predicate: 'highestMaxQuantity', value: Math.max(...Object.values(STANDARD_PERK_MAX_QUANTITY)), provenance: CATALOG_PERKS, verification: 'verified_here' as const },
      { subject: 'perk.quantity', predicate: 'lowestMaxQuantity', value: Math.min(...Object.values(STANDARD_PERK_MAX_QUANTITY)), provenance: CATALOG_PERKS, verification: 'verified_here' as const },
    ],
    sources: [{ ...WIKI_PERKS, section: 'Standard Perks' }, CATALOG_PERKS],
  },
  {
    id: 'perk.wavesRequired',
    label: 'Waves required per perk',
    kind: 'stat',
    summary:
      'Waves Required = (Base − Waves Required lab) × (1 − Perk Wave Requirement perk × (1 + '
      + 'Standard Perk Bonus / 100)). Base rises from 200 to 250 after 20 perks, 300 after 30, '
      + '350 after 40.',
    units: 'waves',
    traps: [
      'The result is rounded DOWN, and the formula applies only to the first perk at each base. '
      + 'Multiply the rounded answer by the perk count rather than re-running the formula.',
      'Standard Perk Bonus enters this one divided by 100, unlike in the stacking formulas. '
      + 'Reusing the same SPB term across both is wrong by a factor of 100.',
    ],
    implementedBy: ['PERK_WAVES_REQUIRED_BY_COUNT'],
    assertions: [
      { subject: 'perk.wavesRequired', predicate: 'bracketCount', value: PERK_WAVES_REQUIRED_BY_COUNT.length, provenance: GAME_PERKS, verification: 'verified_here' as const },
      { subject: 'perk.wavesRequired', predicate: 'baseWaves', value: PERK_WAVES_REQUIRED_BY_COUNT[0].waves, provenance: GAME_PERKS, verification: 'verified_here' as const },
      { subject: 'perk.wavesRequired', predicate: 'highestBracketWaves', value: PERK_WAVES_REQUIRED_BY_COUNT[PERK_WAVES_REQUIRED_BY_COUNT.length - 1].waves, provenance: GAME_PERKS, verification: 'verified_here' as const },
      // It only ever rises. A bracket that reduced the requirement would be a
      // data error, and a monotonic check is the cheapest way to see one.
      { subject: 'perk.wavesRequired', predicate: 'risesMonotonically', value: PERK_WAVES_REQUIRED_BY_COUNT.every((entry, index) => index === 0 || entry.waves > PERK_WAVES_REQUIRED_BY_COUNT[index - 1].waves), provenance: GAME_PERKS, verification: 'verified_here' as const },
    ],
    sources: [{ ...WIKI_PERKS, section: 'Waves Required' }, GAME_PERKS],
  },
  {
    id: 'perk.ultimateWeapon',
    label: 'Ultimate weapon perks',
    kind: 'entity',
    summary:
      'One perk per weapon, shown only when that weapon is unlocked. The "Unlock a Random Ultimate '
      + 'Weapon" perk grants a semi-upgraded weapon and makes its perk available for that run.',
    traps: [
      'A weapon unlocked by the perk cannot be researched in labs that run — Poison Swamp gained '
      + 'this way does not enable swamp stun or swamp radius labs.',
      'Module sub-stats DO still apply to a perk-granted weapon.',
      'The Golden Tower Bonus perk does not apply to the GT bonus sub-module effect.',
      'When every weapon is owned, the random-unlock perk leaves the pool entirely, which shifts '
      + 'the odds of everything else.',
    ],
    implementedBy: ['PERK_UW_INDICES', 'UW_PERKS'],
    assertions: [
      { subject: 'perk.ultimateWeapon', predicate: 'perkCount', value: PERK_UW_INDICES.length, provenance: CATALOG_PERKS, verification: 'verified_here' as const },
      // They ignore both perk labs, which is the fact a planner most often gets
      // wrong -- an integer count cannot take a percentage.
      { subject: 'perk.ultimateWeapon', predicate: 'scaledByPerkLabs', value: false, provenance: GAME_PERKS },
    ],
    sources: [{ ...WIKI_PERKS, section: 'Ultimate Weapon Perks' }, CATALOG_PERKS, GAME_PERKS],
  },
  {
    id: 'perk.tradeOff',
    label: 'Trade-off perks',
    kind: 'entity',
    summary:
      'Perks with a cost attached — x1.50 damage but 8× boss health, x1.80 coins but −70% max '
      + 'health. 15% of the pool, one of each per run.',
    traps: [
      'Only the benefit is raised by the Improve Trade-off Perks lab; the penalty is not reduced. '
      + 'The ranged-enemy-distance perk is excluded from that lab entirely.',
      'Scoring a trade-off perk on its benefit alone will always recommend taking it.',
    ],
    implementedBy: ['PERK_TRADE_OFF_INDICES', 'TRADE_OFF_PERKS'],
    assertions: [
      { subject: 'perk.tradeOff', predicate: 'perkCount', value: PERK_TRADE_OFF_INDICES.length, provenance: CATALOG_PERKS, verification: 'verified_here' as const },
      { subject: 'perk.tradeOff', predicate: 'usesItsOwnLab', value: true, provenance: GAME_PERKS },
      // The penalty side takes no lab term at all, so the lab makes a trade-off
      // strictly better rather than scaling both halves.
      { subject: 'perk.tradeOff', predicate: 'labScalesThePenaltyToo', value: false, provenance: GAME_PERKS },
    ],
    sources: [{ ...WIKI_PERKS, section: 'Trade-off Perks' }, CATALOG_PERKS, GAME_PERKS],
  },
  {
    id: 'perk.poolComposition',
    label: 'What is actually in each perk pool',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      `${STANDARD_PERKS.length} standard perks, ${UW_PERKS.length} ultimate-weapon perks and ${TRADE_OFF_PERKS.length} trade-off perks, `
      + `rolled at ${PERK_POOL_RATES.map(rate => `${rate.chancePercent}%`).join(' / ')} respectively.`,
    disambiguation:
      'The percentages are how often a pool is drawn from, not what share of the perks live in it. '
      + 'The standard pool is 65% of draws but only '
      + `${Math.round((STANDARD_PERKS.length / (STANDARD_PERKS.length + UW_PERKS.length + TRADE_OFF_PERKS.length)) * 100)}% of the perks.`,
    traps: [
      'Pool draw rate and pool size are different numbers and neither predicts the other. Weighting '
      + 'a recommendation by pool size gets the standard pool wrong by roughly a factor of two.',
      'Pool keys in the catalog are snake_case — `ultimate_weapon`, `trade_off` — while the oracle '
      + 'uses camelCase. A lookup that does not convert silently finds nothing.',
      'The rates sum to exactly 100, so there is no residual pool. A fourth category means a '
      + 'mis-parse.',
    ],
    implementedBy: ['STANDARD_PERKS', 'UW_PERKS', 'TRADE_OFF_PERKS', 'PERK_POOL_RATES'],
    assertions: [
      { subject: 'perk.pool.standard', predicate: 'perkCount', value: STANDARD_PERKS.length, provenance: CATALOG_PERKS },
      { subject: 'perk.pool.ultimateWeapon', predicate: 'perkCount', value: UW_PERKS.length, provenance: CATALOG_PERKS },
      { subject: 'perk.pool.tradeOff', predicate: 'perkCount', value: TRADE_OFF_PERKS.length, provenance: CATALOG_PERKS },
      { subject: 'perk.pool', predicate: 'poolCount', value: Object.keys(PERK_POOL_MAP).length, provenance: CATALOG_PERKS },
      { subject: 'perk.pool', predicate: 'ratesDeclaredAsGameConstants', value: Object.keys(PERK_POOL_WEIGHTS_FROM_GAME_CONSTANTS).length, provenance: GAME_PERKS, verification: 'verified_here' },
      { subject: 'perk.pool', predicate: 'standardShareIsResidual', value: true, provenance: GAME_PERKS, verification: 'verified_here' },
      { subject: 'perk.pool', predicate: 'drawRatesSumToPercent', value: PERK_POOL_RATES.reduce((sum, rate) => sum + rate.chancePercent, 0), provenance: CATALOG_PERKS },
      { subject: 'perk.pool.standard', predicate: 'drawChancePercent', value: 65, provenance: CATALOG_PERKS },
      { subject: 'perk.pool.ultimateWeapon', predicate: 'drawChancePercent', value: 20, provenance: GAME_PERKS },
      { subject: 'perk.pool.tradeOff', predicate: 'drawChancePercent', value: 15, provenance: GAME_PERKS },
      { subject: 'perk.pool.standard', predicate: 'isResidualRate', value: true, provenance: GAME_PERKS },
    ],
    sources: [CATALOG_PERKS],
  },
  {
    id: 'perk.waveRequirement',
    label: 'Perk wave requirement rate',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'The Perk Wave Requirement perk reduces the waves needed per perk by 20% each, up to three '
      + 'times, scaled by Standard Perk Bonus.',
    disambiguation:
      'The rate lives in the perk NAME, which is why getting it wrong is invisible: a wrong rate '
      + 'in a name still reads as a valid perk.',
    traps: [
      'SETTLED AT 20% BY THE GAME on 2026-08-18: `Perks.Initialize` writes '
      + '`perkBenefitUpIncrease[10] = 0.2`. Everything below is the argument that got there '
      + 'before the primary source was available, kept because the reasoning is the reusable part.',
      'THE WIKI CONTRADICTS ITSELF HERE, and re-read on 2026-08-18 it still does. Its perk table '
      + 'says "Perk Wave Requirement -25.00%" while the worked example on the same page computes '
      + 'with 0.20: SPB 8% with 3 perks gives 64.8%, which is 0.20 x 1.08 x 3, and (200-3) x '
      + '(1-0.648) = 69.344 waves. At 0.25 that example would give 81% and 37 waves. The oracle '
      + 'carried -25% until 2026-08-17. Check a rate against an example that USES it, not against '
      + 'another copy of the rate — and expect one page to disagree with itself.',
      'ORDER: the Waves Required LAB is subtracted from '
      + 'the base wave FIRST, and the perk term multiplies that difference — '
      + '`trunc((1 - PerkBenefitUp(10)) x (base - lab))`. The two do not commute, and the result is '
      + 'truncated toward zero rather than rounded, so a rounding at the wrong step moves the '
      + 'answer by a full wave.',
      'The perk-count multiplication happens INSIDE `PerkBenefitUp`, not in this formula. Applying '
      + 'quantity again outside it double-counts.',
    ],
    implementedBy: ['PERK_WAVE_REQUIREMENT_FORMULA', 'PERK_WAVE_REQUIREMENT_BRACKETS'],
    assertions: [
      { subject: 'perk.waveRequirement', predicate: 'reductionPercentPerPerk', value: 20, provenance: GAME_PERK_TABLES, verification: 'verified_here' },
      { subject: 'perk.waveRequirement', predicate: 'maxQuantity', value: 3, provenance: CATALOG_PERKS },
      { subject: 'perk.waveRequirement', predicate: 'perkIndex', value: 10, provenance: GAME_PERKS },
      { subject: 'perk', predicate: 'standardPerksBonusResearchIndex', value: 83, provenance: GAME_PERKS },
      { subject: 'perk', predicate: 'improveTradeOffPerksResearchIndex', value: 88, provenance: GAME_PERKS },
      { subject: 'perk.waveRequirement', predicate: 'roundingMode', value: 'truncate', provenance: GAME_PERKS },
      { subject: 'perk.waveRequirement', predicate: 'labSubtractedBeforePerkMultiplier', value: true, provenance: GAME_PERKS },
      { subject: 'perk.waveRequirement', predicate: 'orderedStepCount', value: PERK_WAVE_REQUIREMENT_ORDER.length, provenance: GAME_PERKS, verification: 'verified_here' },
    ],
    sources: [CATALOG_PERKS],
  },
  {
    id: 'perk.applicationForm',
    label: 'How a perk result is applied at the call site',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      '`PERK_APPLIED_AS` records what the CALL SITE does with the number a perk returns, for all '
      + `${Object.keys(PERK_APPLIED_AS).length} standard perks: `
      + `${PERK_APPLIED_FORM_COUNTS.multiply} multiply the stat, ${PERK_APPLIED_FORM_COUNTS.add} add `
      + `to it, and ${PERK_APPLIED_FORM_COUNTS.grant} grants a thing outright.`,
    units: 'application form per perk index',
    disambiguation:
      'NOT the same question as `perkBenefitUpBase`, and conflating the two was an error here on '
      + '2026-08-18. Base says whether the returned number carries an implicit 1; this says whether '
      + 'the call site multiplies the stat by it or adds it. Perk 6, Land Mine Damage x3.50, is the '
      + 'case that separates them: base 0, applied with `fmul`. A perk can therefore stack linearly '
      + 'and still be applied as a multiply.',
    implementedBy: [
      'PERK_APPLIED_AS',
      'PERK_ADDITIVE_MISSING_FROM_WIKI',
      'PERK_INTEGER_BENEFIT_INDICES',
      'PERK_WITHOUT_IDENTITY_TERM',
    ],
    assertions: [
      { subject: 'perk.applicationForm', predicate: 'perksCovered', value: Object.keys(PERK_APPLIED_AS).length, provenance: GAME_PERKS, verification: 'verified_here' },
      { subject: 'perk.applicationForm', predicate: 'appliedAsMultiply', value: PERK_APPLIED_FORM_COUNTS.multiply, provenance: GAME_PERKS, verification: 'verified_here' },
      { subject: 'perk.applicationForm', predicate: 'appliedAsAdd', value: PERK_APPLIED_FORM_COUNTS.add, provenance: GAME_PERKS, verification: 'verified_here' },
      { subject: 'perk.applicationForm', predicate: 'appliedAsGrant', value: PERK_APPLIED_FORM_COUNTS.grant, provenance: GAME_PERKS, verification: 'verified_here' },
      { subject: 'perk.applicationForm', predicate: 'additivePerksOmittedByWiki', value: PERK_ADDITIVE_MISSING_FROM_WIKI.length, provenance: GAME_PERKS, verification: 'verified_here' },
      { subject: 'perk.applicationForm', predicate: 'integerOnlyBenefits', value: PERK_INTEGER_BENEFIT_INDICES.length, provenance: GAME_PERKS, verification: 'verified_here' },

      // The disagreement, recorded on ONE (subject, predicate) so that
      // findContradictions() can see it. Splitting these across two predicate
      // names — appliedAsPerGame and appliedAsPerWiki — would make the graph
      // look complete and the conflict undetectable, which is worse than not
      // recording it at all.
      { subject: 'perk.perkWaveRequirement', predicate: 'appliedAs', value: 'multiply', provenance: GAME_PERKS, verification: 'verified_here' },
      { subject: 'perk.perkWaveRequirement', predicate: 'appliedAs', value: 'add', provenance: WIKI_PERKS, verification: 'contradicted' },
      { subject: 'perk.defensePercent', predicate: 'appliedAs', value: 'add', provenance: GAME_PERKS, verification: 'verified_here' },
      { subject: 'perk.defensePercent', predicate: 'appliedAs', value: 'add', provenance: WIKI_PERKS, verification: 'verified_here' },
    ],
    traps: [
      'THE WIKI ADDITIVE LIST IS WRONG IN BOTH DIRECTIONS AT ONCE. It names "Def %, Perks Wave '
      + 'Required". Defense Percent is genuinely additive; Perk Wave Requirement is NOT — index 10 '
      + `is applied as \`1 - benefit\`, a multiplier. And it omits ${PERK_ADDITIVE_MISSING_FROM_WIKI.length} `
      + 'perks the game does add: Bounce Shot, Orbs, Free Upgrade Chance for All, and Increase Max '
      + 'Game Speed. A list that is both short and wrong reads as authoritative because it is '
      + 'specific.',
      'A MULTIPLY DOES NOT IMPLY AN IDENTITY TERM. Perks 4, 6, 7, 8, 9, 10, 11 and 12 return a '
      + 'value with no implicit 1, and perk 6 is among them while still being applied with a '
      + 'multiply. So "is it multiplicative?" is two questions and answering it once gets one of '
      + 'them wrong.',
      `INTEGER ADDS CANNOT TAKE A FRACTION. ${PERK_INTEGER_BENEFIT_INDICES.length} perks — Bounce `
      + 'Shot and Orbs — add whole units. Scaling them by a lab percentage produces 2.4 orbs, which '
      + 'the game cannot represent and which no test here would have flagged as impossible.',
      'GRANT IS NOT A MAGNITUDE. Perk 11, Unlock a Random Ultimate Weapon, has an application form '
      + 'but no number to scale. Treating every perk as a magnitude gives it a benefit value that '
      + 'means nothing, and it will look like a small one rather than an absent one.',
    ],
    sources: [GAME_PERKS, WIKI_PERKS],
  },
  {
    id: 'perk.benefitFormula',
    label: 'How a perk benefit is computed',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      `\`${PERK_BENEFIT_UP_FORMULA}\`, from \`Perks.PerkBenefitUp\`. One arithmetic core with `
      + 'five routing rules around it. The wiki prints two formulas; the game has this one, and '
      + '`base` is the difference between them.',
    units: 'multiplier or magnitude, depending on the perk',
    disambiguation:
      '`perkBenefitUpBase` is NOT a flag saying which formula to use — it is the constant term. '
      + 'Base 1 gives the wiki\'s multiplicative form, base 0 its additive form. A separate '
      + 'question, easily conflated with it, is whether the CALL SITE multiplies the stat by the '
      + 'result or adds it; perk 6 has base 0 and is applied with a multiply.',
    implementedBy: ['computePerkBenefitUp', 'perkCarriesIdentityTerm', 'computePerkBenefits'],
    assertions: [
      {
        subject: 'perk.benefitFormula',
        predicate: 'labIndexStandard',
        value: PERK_LAB_RESEARCH_INDEX.standardPerksBonus,
        provenance: GAME_PERKS,
      },
      {
        subject: 'perk.benefitFormula',
        predicate: 'labIndexTradeOff',
        value: PERK_LAB_RESEARCH_INDEX.improveTradeOffPerks,
        provenance: GAME_PERKS,
      },
      {
        subject: 'perk.benefitFormula',
        predicate: 'perksIgnoringBothLabs',
        value: PERK_INDICES_WITHOUT_LAB_SCALING.length,
        provenance: GAME_PERKS,
      },
      {
        subject: 'perk.benefitFormula',
        predicate: 'perksReturningComplement',
        value: PERK_INDICES_RETURNING_COMPLEMENT.length,
        provenance: GAME_PERKS,
      },
      {
        subject: 'perk.benefitFormula',
        predicate: 'perkWithHalfLab',
        value: PERK_INDEX_WITH_HALF_LAB,
        provenance: GAME_PERKS,
      },
    ],
    traps: [
      'A BASE-0 PERK STACKS LINEARLY. "Land Mine Damage x3.50" taken twice is worth 7.0, not 8.0 '
      + '— there is no implicit 1 to compound onto. Reading the "x" in a perk name as a '
      + 'multiplier-with-identity is the natural reading and is wrong for exactly the base-0 '
      + 'perks.',
      'THE TWO LABS ARE NOT INTERCHANGEABLE. Research '
      + `${PERK_LAB_RESEARCH_INDEX.standardPerksBonus} is Standard Perks Bonus and scales standard `
      + `perks; ${PERK_LAB_RESEARCH_INDEX.improveTradeOffPerks} is Improve Trade-off Perks and `
      + 'scales trade-offs. Swapping them is invisible: two small numbers, both "a lab", both '
      + 'plausible in either slot.',
      'BOUNCE SHOT, ORBS AND EVERY UW PERK IGNORE BOTH LABS. Integer counts cannot take a '
      + 'percentage, and "Swamp Radius x1.5" is x1.5 whatever the labs say. The wiki does not '
      + 'mention this.',
      'Four trade-offs return `1 - value`, a multiplier to APPLY rather than a reduction to '
      + 'subtract: "Enemies Damage -50%" comes back as 0.5. And perk '
      + `${PERK_INDEX_WITH_HALF_LAB} gets only HALF the trade-off lab, which is unique to it.`,
      'The penalty side takes no lab term at all. The lab raises the benefit only.',
    ],
    sources: [GAME_PERKS],
  },
  {
    id: 'perk.index',
    label: 'Perk indices',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      `Three blocks with real gaps: ${PERK_STANDARD_INDICES.length} standard at 0-14, `
      + `${PERK_UW_INDICES.length} ultimate-weapon at 20-28, ${PERK_TRADE_OFF_INDICES.length} `
      + 'trade-off at 40-49. Saves store perk state by index, so the index IS the identity.',
    validRange: '0-14, 20-28, 40-49. Indices 15-19 and 29-39 hold no perk and never will.',
    disambiguation:
      'An index is not a position in a display list. The catalog\'s names were written in display '
      + 'order and read as index order, which is how thirteen of them ended up on the wrong perk.',
    implementedBy: ['PERK_IMPORT_CATALOG', 'findPerkNameByIndex', 'perkMaxLevel'],
    assertions: [
      {
        subject: 'perk.index',
        predicate: 'perkCount',
        value: PERK_IMPORT_CATALOG.length,
        provenance: GAME_PERKS,
      },
      {
        subject: 'perk.index',
        predicate: 'namesCorrectedFromGame',
        value: PERK_INDICES_CORRECTED_FROM_GAME.length,
        provenance: GAME_PERKS,
      },
      {
        subject: 'perk.index',
        predicate: 'flagOnlyPerk',
        value: PERK_44_IS_A_FLAG.index,
        provenance: GAME_PERKS,
      },
    ],
    traps: [
      'THIRTEEN OF THIRTY-FOUR NAMES WERE ON THE WRONG INDEX until 2026-08-18, and nothing caught '
      + 'it — one test actively encoded it, asserting a save\'s `firstPerkIndex` of 10 was "Free '
      + 'Upgrade Chance for All". Identify a perk by WHERE the game applies it and WHAT it is '
      + 'worth, never by a name in a list.',
      'The ultimate-weapon block was entirely correct while the standard block had eleven of '
      + 'fifteen wrong. So it was transcription, not an offset — no uniform renumbering would '
      + 'have fixed it, and one would have broken the nine that were right.',
      `Perk ${PERK_44_IS_A_FLAG.index} stores a benefit of ZERO and that is correct data: it is a `
      + `flag. The game reads \`${PERK_44_IS_A_FLAG.reads}\` instead of `
      + `\`${PERK_44_IS_A_FLAG.readsInsteadOf}\` rather than scaling anything. A zero in an `
      + 'extracted table is a claim about the mechanic, not necessarily a hole in the extraction '
      + '— perk 46\'s zero IS its penalty, and perk 49\'s is an unused slot.',
    ],
    sources: [GAME_PERKS],
  },
]

export const PERK_KNOWLEDGE_EDGES: readonly KnowledgeEdge[] = [
  {
    from: 'perk.consumers',
    kind: 'independentOf',
    to: 'perk.applicationForm',
    note:
      'Where a perk is read and what the call site does with it are separate questions. A perk '
      + 'read inside the enemy base getter is still applied as a multiply or an add once there.',
    sources: [GAME_PERK_CONSUMERS],
  },

  {
    from: 'perk.applicationForm',
    kind: 'independentOf',
    to: 'perk.benefitFormula',
    note:
      'Two questions that look like one. benefitFormula says what number comes back; '
      + 'applicationForm says what the call site does with it. Perk 6 has base 0 and is applied '
      + 'with a multiply, which is the pair that proves they are separate.',
    sources: [GAME_PERKS],
  },
  {
    from: 'perk.benefitFormula',
    kind: 'memberOf',
    to: 'perk',
    note: 'The arithmetic every perk goes through, and the five ways it is routed.',
    sources: [GAME_PERKS],
  },
  {
    from: 'perk.index',
    kind: 'memberOf',
    to: 'perk',
    note: 'How a save names a perk, and how this repo got thirteen of them wrong.',
    sources: [GAME_PERKS],
  },
  {
    from: 'perk.benefitFormula',
    kind: 'appliedBefore',
    to: 'perk.stacking',
    note:
      'The formula produces one perk\'s benefit; stacking is the quantity term inside it, not a '
      + 'separate step applied afterwards.',
    sources: [GAME_PERKS],
  },
  {
    from: 'perk.poolComposition',
    kind: 'memberOf',
    to: 'perk',
    note:
      'How many perks are in each pool and how often each pool is drawn from — two different '
      + 'numbers, neither derivable from the other.',
    sources: [CATALOG_PERKS],
  },
  {
    from: 'perk.waveRequirement',
    kind: 'scales',
    to: 'perk.wavesRequired',
    note:
      'The perk that reduces the wave bar, at 20% per stack up to three. The oracle carried 25% '
      + 'here until 2026-08-17.',
    sources: [CATALOG_PERKS],
  },
  {
    from: 'perk.stacking',
    kind: 'scales',
    to: 'perk',
    note: 'Two formulas, chosen per perk — additive and multiplicative are not interchangeable.',
    sources: [{ ...WIKI_PERKS, section: 'Standard Perk Math' }],
  },
  {
    from: 'perk.quantity',
    kind: 'caps',
    to: 'perk',
    note: 'Each perk has its own maximum takes per run, from 1 to 5.',
    sources: [{ ...WIKI_PERKS, section: 'Standard Perks' }],
  },
  {
    from: 'perk.wavesRequired',
    kind: 'gates',
    to: 'perk',
    note: 'A perk is only offered once the required wave count is reached, and the bar rises with count.',
    sources: [{ ...WIKI_PERKS, section: 'Waves Required' }],
  },
  {
    from: 'perk.ultimateWeapon',
    kind: 'memberOf',
    to: 'perk',
    note: 'A 20% slice of the pool, filtered to weapons the player actually owns.',
    sources: [{ ...WIKI_PERKS, section: 'Ultimate Weapon Perks' }],
  },
  {
    from: 'perk.tradeOff',
    kind: 'memberOf',
    to: 'perk',
    note: 'A 15% slice of the pool; each carries a penalty no lab reduces.',
    sources: [{ ...WIKI_PERKS, section: 'Trade-off Perks' }],
  },
]
