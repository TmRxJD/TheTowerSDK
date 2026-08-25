/**
 * Core combat stats — damage, defense, crit, regen — as the game defines them.
 *
 * Read off the wiki on 2026-08-16 (Damage, Critical Hits, Super Critical,
 * Defense Percent, Defense Absolute, Health Regen, Lifesteal).
 *
 * This is the family Effective Paths depends on most, and it holds the two
 * traps most likely to produce a wrong answer that looks right:
 *
 *  1. **Berserker is added, not multiplied.** It sits outside the product at
 *     the end of the damage formula, so a build that raises base damage can
 *     *un-max* it. Modelling it as a multiplier is right in shape and wrong in
 *     every value.
 *  2. **Not all damage reduction is Defense %.** Chrono Field, Primordial
 *     Collapse and Flame Bot bypass the 98% cap entirely and apply *after*
 *     defense absolute. Summing them into Defense % both over-caps them and
 *     applies them in the wrong order.
 */
import { getCardTemplate } from '../../data'
import { WORKSHOP_IMPORT_CATALOG } from '../../save/catalogs/indexes'
import type { KnowledgeEdge, KnowledgeNode } from '../substrate/schema'

const WIKI_DAMAGE = { origin: 'wiki', ref: 'Damage', verifiedAt: '2026-08-16' } as const
/**
 * Confirmed against the workshop table extracted from the game.
 *
 * Checked value by value against `WORKSHOP_DATA` by
 * `scripts/acs/verify-tower-claims.mjs`, which prints every claim it compared.
 * The wiki formed these claims; the extracted table validated them.
 *
 * The table stores float32, so `criticalFactor.base` reads 1.200000048 and its
 * maximum 16.20000076. The compartment's own trap already warns about exactly
 * this: comparing a catalog value to a rounded constant with `===` fails on a
 * number that is correct.
 */
/**
 * The defence cap, read out of the binary.
 *
 * Duplicated from the `tower` compartment rather than imported, so the two
 * compartments stay independently readable — but it is deliberately the same
 * address, and if one is ever corrected the other must be too.
 *
 * `Main$$GetOutOfRoundDefenseRel` sums workshop, labs, modules and relics and
 * then clamps: `fcmp d0, d1` / `fcsel d0, d1, d0, gt` at `0x1ed9744`, where
 * `d1` is loaded from `0xbaeab8` and holds the double `98.0`. The binary works
 * in percent; `DEFENSE_PERCENT_HARD_CAP` is the fraction 0.98.
 */
const GAME_DEFENSE_CAP = {
  origin: 'game',
  ref: 'Main$$GetOutOfRoundDefenseRel @ 0x1ed95bc; clamp fcsel @ 0x1ed9744; double 98.0 @ 0xbaeab8',
  sourceVersion: 'v28.3.0-arm64',
  verifiedAt: '2026-08-20',
} as const

/**
 * The Super Tower ultimate-weapon bonus, read out of the binary.
 *
 * `Cards$$get_SuperTowerUWBonus` bounds-checks the card index, loads the card's
 * value from `[x8, 0x20]` and multiplies by the float at `0xbaf5ac` = 0.35.
 */
/**
 * The Berserker card's own catalog entry.
 *
 * The cap was wiki-sourced for no reason: Berserker is a card, and the card
 * catalog ships its description ("max of x8 tower damage") and its mastery
 * ("Increases the damage cap to x500 ... when Death Defy is activated"). The
 * community calls the card Berserker; the catalog id is `zerk`, which is why
 * name-based searches for it kept coming back empty.
 */
const CATALOG_BERSERKER_CARD = {
  origin: 'code',
  ref: 'thetowersdk/data CARD_TEMPLATES id "zerk" (Berserker)',
  verifiedAt: '2026-08-20',
} as const

const GAME_SUPER_TOWER_UW = {
  origin: 'game',
  ref: 'Cards$$get_SuperTowerUWBonus @ 0x20ed588; fmul @ 0x20ed5e0 by float 0.35 @ 0xbaf5ac',
  sourceVersion: 'v28.3.0-arm64',
  verifiedAt: '2026-08-20',
} as const

const GAME_WORKSHOP_TABLE = {
  origin: 'game',
  ref: 'WORKSHOP_DATA (extracted workshop table), verified by scripts/acs/verify-tower-claims.mjs',
  sourceVersion: 'v28.3.0-arm64',
  verifiedAt: '2026-08-20',
} as const

const WIKI_CRIT = { origin: 'wiki', ref: 'Critical Hits', verifiedAt: '2026-08-16' } as const
const WIKI_DEF_PCT = { origin: 'wiki', ref: 'Defense Percent', verifiedAt: '2026-08-16' } as const
const WIKI_DEF_ABS = { origin: 'wiki', ref: 'Defense Absolute', verifiedAt: '2026-08-16' } as const
const WIKI_REGEN = { origin: 'wiki', ref: 'Health Regen', verifiedAt: '2026-08-16' } as const
const WIKI_LIFESTEAL = { origin: 'wiki', ref: 'Lifesteal', verifiedAt: '2026-08-16' } as const

/**
 * Checked against the shipped workshop table on 2026-08-17.
 *
 * `CRITICAL_FACTOR_BASE` (1.2) and `CRITICAL_FACTOR_MAX` (16.2) match the table's
 * Critical Factor curve, which stores them as 1.200000048 and 16.20000076. The
 * float drift is in the extracted game data, not an error — compare to a
 * tolerance rather than for equality.
 */
const CATALOG_COMBAT = {
  origin: 'code',
  ref: 'thetowersdk/data WORKSHOP_DATA',
  verifiedAt: '2026-08-17',
} as const

/**
 * The displayed-damage formula, verbatim.
 *
 * Kept as a string because its *shape* is the fact worth transporting: every
 * term multiplies except Berserker, which is added outside the product.
 */
export const DAMAGE_FORMULA =
  'Workshop × Lab × Damage Card × (1 + Relics) × (1 + Cannon Module %) × Enhancements × Perk '
  + '+ Berserker'

/** Defense % is capped here no matter what the sources sum to. */
export const DEFENSE_PERCENT_HARD_CAP = 0.98

/**
 * What a Super Tower card's value is multiplied by to reach ultimate weapons.
 *
 * `Cards$$get_SuperTowerUWBonus` loads the card's own value and multiplies it
 * by the float at `0xbaf5ac`, which is 0.35 (stored as 0.349999994 — it is a
 * float32, and comparing it to 0.35 with `===` will fail).
 *
 * This is the mastery route being a reduced quantity rather than a switch. See
 * the `damage.superTower` node.
 */
export const SUPER_TOWER_UW_BONUS_FACTOR = 0.35

/** Damage reduction that does NOT count toward the 98% cap and applies after defense absolute. */
export const DAMAGE_REDUCTION_OUTSIDE_DEFENSE_PERCENT = [
  'Chrono Field Damage Reduction',
  'Primordial Collapse',
  'Flame Bot',
] as const

/** Berserker's ceiling: +700% of base, i.e. 8× total. */
export const BERSERKER_MAX_BONUS_MULTIPLE = 7

/** Critical factor: 150 levels, base ×1.2, +0.1 each. */
export const CRITICAL_FACTOR_BASE = 1.2
export const CRITICAL_FACTOR_MAX = 16.2

/** Enemy damage rises by this factor per hit as they heat up. */
export const ENEMY_HEAT_UP_PER_HIT = 1.04

/**
 * Workshop max levels, read from the shipped save catalog.
 *
 * This compartment was the last one in the graph with no checkable claim in it:
 * nine nodes, every one wiki-sourced prose, describing the damage and defence
 * stats every calculator in the repo reads. Nothing in it could be found to
 * disagree with anything.
 *
 * Joining to the catalog is what changes that. The wiki says Critical Chance
 * takes 79 workshop levels; the catalog ships a maxLevel for it. Those are two
 * independent statements of one fact, so they can now contradict each other —
 * which is the entire point of writing it down.
 */
const CATALOG_WORKSHOP = {
  origin: 'code',
  ref: 'thetowersdk/save WORKSHOP_IMPORT_CATALOG',
  verifiedAt: '2026-08-18',
} as const

function workshopMaxLevel(name: string): number {
  const row = (WORKSHOP_IMPORT_CATALOG as readonly { name: string, maxLevel?: number }[])
    .find(entry => entry.name === name)
  // -1 rather than 0: a missing row is not a stat with no levels, and the two
  // must not read the same in an assertion.
  return row?.maxLevel ?? -1
}

/**
 * Damage attribution measured from a real round, not described.
 *
 * `src/pages/import/utils/damage-attribution-vs-save.test.ts` checks these
 * against `test/playerInfo.dat`.
 */
const SAVE_DAMAGE_SPLIT = {
  origin: 'save',
  ref: 'test/playerInfo.dat, damageDealtThisRound and its sources',
  sourceVersion: 'v28.3',
  verifiedAt: '2026-08-18',
} as const

/**
 * Counters that sum to the round damage total, once each.
 *
 * Exact: the fourteen add to `damageDealtThisRound` to one part in 1e11, which
 * is float64 accumulation noise across terms spanning 1e38 to 1e47.
 */
export const ROUND_DAMAGE_SOURCE_FIELDS: readonly string[] = [
  'totalDamageByChainLightningThisRound',
  'damageByOrbsThisRound',
  'damageByElectrons',
  'totalDamageByBlackHoleThisRound',
  'totalDamageByInnerLandMinesThisRound',
  'totalDamageBySmartMissilesThisRound',
  'damageByProjectilesThisRound',
  'totalDamageBySwampThisRound',
  'damageByThornThisRound',
  'totalDamageByDeathWaveThisRound',
  'damageByDroppedLandMineThisRound',
  'totalDamageByBotThisRound',
  'damageByDeathRayThisRound',
  'totalDamageByGuardianThisRound',
]

/** `Enemy.LightningDamage` and `Enemy.LightningPlusDamage`, v28.3. */
const GAME_LIGHTNING_SPLIT = {
  origin: 'game',
  ref: 'Enemy.LightningDamage @ 0x21C2770, Enemy.LightningPlusDamage @ 0x21C2C94',
  sourceVersion: 'v28.3.0-arm64',
  verifiedAt: '2026-08-18',
} as const

/** Counters both lightning methods write, so neither can be isolated. */
export const SHARED_LIGHTNING_COUNTERS: readonly string[] = [
  'totalDamageByChainLightning',
  'totalDamageByChainLightningThisRound',
  'totalDamageDealt',
  'damageDealtThisRound',
]

/** Counters only base Chain Lightning writes. */
export const CHAIN_LIGHTNING_ONLY_COUNTERS: readonly string[] = [
  'enemiesHitByChainLightningThisRound',
  'chainLightningHits',
]

/** Orbital Augment, measured against a round. */
const SAVE_ELECTRONS = {
  origin: 'save',
  ref: 'test/playerInfo.dat, damageByElectrons and enemiesHitByOrbitalAugmentThisRound',
  sourceVersion: 'v28.3',
  verifiedAt: '2026-08-18',
} as const

/**
 * Damage counters whose per-hit figure cannot calibrate their mechanic.
 *
 * A counter records damage APPLIED. When a source out-damages its target, the
 * counter records the target rather than the source, and the ratio it yields
 * belongs to the enemies.
 */
export const OVERKILL_BOUND_DAMAGE_SOURCES: readonly string[] = [
  'damageByElectronsThisRound',
]

export const COMBAT_KNOWLEDGE_NODES: readonly KnowledgeNode[] = [
  {
    id: 'combat.electronDamage',
    label: 'Orbital Augment, and the limit of damage counters',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      '`Enemy.ElectronDamage` is the sole writer of both the electron damage counter and '
      + '`enemiesHitByOrbitalAugmentThisRound`, so damage-per-hit is a real quantity here — 5.30e41 '
      + 'in the measured round. It still cannot confirm the module description, which asks for ten '
      + 'percent of wave health, a figure twenty billion times larger.',
    units: 'damage per hit',
    disambiguation:
      'Electrons come from the Orbital Augment MODULE and are counted separately from Orbs. '
      + '`enemiesHitByOrbitalAugmentThisRound` counts electron hits, not orb hits; orb hits are '
      + '`orbHitsThisRound`, written by `Enemy.OnTriggerEnter2D`.',
    implementedBy: [],
    traps: [
      'AN OVERKILLING SOURCE CANNOT BE CALIBRATED FROM ITS OWN DAMAGE COUNTER. Electron damage per '
      + 'hit is 23% of total-damage-per-kill, which is an upper bound on average enemy health — so '
      + 'hits land at ENEMY scale, not at the wave scale the description implies. The likely reason '
      + 'is that counters record damage applied, capped by remaining health, making per-hit damage '
      + 'a property of the enemies rather than the module. Only sources that routinely UNDER-damage '
      + 'their targets can be calibrated this way.',
      'THE MODULE DESCRIPTION IS NOT USABLE AS A FORMULA. "Damage equal to 10% of wave health" is '
      + 'off by ten orders of magnitude against what the round recorded. Do not put it in a model '
      + 'because it is the only number written down.',
      'MODULE UNIQUE EFFECTS ARE NOT A ROUNDING DETAIL. Electrons produced more damage than the '
      + 'poison swamp, smart missiles and inner land mines combined. Treating module uniques as a '
      + 'late refinement understates a build by more than any of those three.',
    ],
    assertions: [
      { subject: 'combat.electronDamage', predicate: 'damageAndHitCountersShareOneWriter', value: true, provenance: SAVE_ELECTRONS, verification: 'verified_here' as const },
      { subject: 'combat.electronDamage', predicate: 'perHitDamageIsBoundedByEnemyHealth', value: true, provenance: SAVE_ELECTRONS, verification: 'verified_here' as const },
      { subject: 'combat.electronDamage', predicate: 'statedFormulaMatchesMeasurement', value: false, provenance: SAVE_ELECTRONS, verification: 'verified_here' as const },
      { subject: 'combat.electronDamage', predicate: 'overkillBoundSourceCount', value: OVERKILL_BOUND_DAMAGE_SOURCES.length, provenance: SAVE_ELECTRONS, verification: 'verified_here' as const },
    ],
    sources: [SAVE_ELECTRONS],
  },

  {
    id: 'combat.chainLightningAndSmite',
    label: 'Chain Lightning and Smite share one counter',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      '`Enemy.LightningDamage` and `Enemy.LightningPlusDamage` both write '
      + '`totalDamageByChainLightningThisRound`. The second is SMITE, the Chain Lightning UW+ '
      + 'enhancement, and it writes `smiteHits` and takes its damage from '
      + '`Main.GetSpecificWaveHealthDamageEnemyHit`. Only the base method increments the hit '
      + 'counter.',
    units: 'damage',
    disambiguation:
      'The counter is named for Chain Lightning and holds two mechanics. Smite is not a bigger '
      + 'Chain Lightning: it is a percentage of CURRENT WAVE HP capped at 100 hits per enemy, '
      + 'while Chain Lightning follows tower damage.',
    implementedBy: [],
    traps: [
      'THE LARGEST DAMAGE COUNTER IS A BLEND OF TWO MECHANICS AND CANNOT BE SPLIT. Chain Lightning '
      + 'was 55% of a measured round, and an unknown share of that is Smite. The save carries no '
      + 'Smite counter of any kind — not damage, not hits, not kills — so no number of saves '
      + 'separates them. Fitting a Chain Lightning coefficient to this counter fits a sum.',
      'THE HIT COUNTER EXCLUDES SMITE WHILE THE DAMAGE COUNTER INCLUDES IT. '
      + '`enemiesHitByChainLightningThisRound` is written only by the base method, so '
      + `damage-divided-by-hits is a ratio of two different populations. Only `
      + `${CHAIN_LIGHTNING_ONLY_COUNTERS.length} counters are base-Chain-Lightning-only, and both are hit counters. It is computable, it `
      + 'looks like a per-hit damage figure, and it is not one.',
      'THE TWO SCALE DIFFERENTLY IN KIND, NOT IN SIZE. Chain Lightning grows with the build; Smite '
      + 'grows with the wave, being a percentage of wave HP. A curve fitted to their sum belongs '
      + 'to neither, and will mispredict in opposite directions at low and high waves.',
      'THIS QUALIFIES THE DAMAGE PARTITION. The fourteen counters do sum to the round exactly, but '
      + '"a source" there means a COUNTER, not a mechanic. Check any counter for multiple writers '
      + 'before treating it as a mechanic total; this one has two.',
    ],
    assertions: [
      { subject: 'combat.chainLightningAndSmite', predicate: 'sharedCounterCount', value: SHARED_LIGHTNING_COUNTERS.length, provenance: GAME_LIGHTNING_SPLIT, verification: 'verified_here' as const },
      { subject: 'combat.chainLightningAndSmite', predicate: 'smiteWritesTheChainLightningDamageCounter', value: true, provenance: GAME_LIGHTNING_SPLIT, verification: 'verified_here' as const },
      { subject: 'combat.chainLightningAndSmite', predicate: 'chainLightningOnlyCounterCount', value: CHAIN_LIGHTNING_ONLY_COUNTERS.length, provenance: GAME_LIGHTNING_SPLIT, verification: 'verified_here' as const },
      { subject: 'combat.chainLightningAndSmite', predicate: 'smiteWritesTheChainLightningHitCounter', value: false, provenance: GAME_LIGHTNING_SPLIT, verification: 'verified_here' as const },
      { subject: 'combat.chainLightningAndSmite', predicate: 'smiteDamageScalesWithWaveHealth', value: true, provenance: GAME_LIGHTNING_SPLIT, verification: 'verified_here' as const },
      { subject: 'combat.chainLightningAndSmite', predicate: 'saveCanSeparateTheTwo', value: false, provenance: GAME_LIGHTNING_SPLIT, verification: 'verified_here' as const },
    ],
    sources: [GAME_LIGHTNING_SPLIT],
  },

  {
    id: 'combat.damageAttribution',
    label: 'Where round damage comes from',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      `The ${ROUND_DAMAGE_SOURCE_FIELDS.length} per-source damage counters PARTITION `
      + '`damageDealtThisRound` exactly, unlike the coin counters, which overlap. That makes them '
      + 'the strongest validation surface in a save for a combat model: each simulated source can '
      + 'be checked against its own recorded total.',
    units: 'damage',
    disambiguation:
      'Not the coin counters, which are overlapping attributions of the same coins. These are '
      + 'disjoint and complete, and the difference is the whole reason one set can validate a '
      + 'model and the other cannot.',
    implementedBy: [],
    traps: [
      'REND ARMOR IS NOT A SOURCE. `damageByRenderArmorThisRound` is non-zero and the total is '
      + 'already complete without it — adding it overshoots by exactly its own value. '
      + '`Enemy.ApplyProjectileDamage` writes `renderArmorMultiplier` three times as a MULTIPLIER '
      + 'on damage, so the counter records amplification that is already inside the sources it '
      + 'amplified. Arithmetic alone cannot tell that from a source counted twice; the binary can.',
      'ONE ROUND DAMAGE COUNTER HAS NO `ThisRound` SUFFIX. `damageByElectrons` is round-scoped and '
      + 'was 9.3% of this round, but it is named like a lifetime field and sits among them. Any '
      + 'code selecting round fields by that suffix drops it silently, and the loss looks like a '
      + 'model that slightly under-predicts rather than like a missing source.',
      'TOWER PROJECTILES CAN BE A ROUNDING ERROR. On the measured round Chain Lightning was 55% of '
      + 'all damage and Orbs 32%, while tower projectiles were 0.35%. A simulation that '
      + 'models the firing loop precisely and the ultimates roughly has its effort backwards for '
      + 'that build. This is build-dependent, and that is the point: damage SHARE is not a '
      + 'property of the game to be hard-coded.',
      'ELECTRONS ARE A MODULE UNIQUE EFFECT AND THEY ARE NOT SMALL. Orbital Augment produced more '
      + 'damage than every land mine, missile, swamp and bot source combined. Module unique '
      + 'effects are commonly treated as a refinement to add last; on this evidence at least one '
      + 'of them belongs in the first version of any damage model.',
    ],
    assertions: [
      { subject: 'combat.damageAttribution', predicate: 'sourceCount', value: ROUND_DAMAGE_SOURCE_FIELDS.length, provenance: SAVE_DAMAGE_SPLIT, verification: 'verified_here' as const },
      { subject: 'combat.damageAttribution', predicate: 'sourcesPartitionTheTotal', value: true, provenance: SAVE_DAMAGE_SPLIT, verification: 'verified_here' as const },
      { subject: 'combat.damageAttribution', predicate: 'rendArmorIsASummand', value: false, provenance: SAVE_DAMAGE_SPLIT, verification: 'verified_here' as const },
      { subject: 'combat.damageAttribution', predicate: 'roundFieldsWithoutThisRoundSuffix', value: ROUND_DAMAGE_SOURCE_FIELDS.filter(field => !field.endsWith('ThisRound')).length, provenance: SAVE_DAMAGE_SPLIT, verification: 'verified_here' as const },
    ],
    sources: [SAVE_DAMAGE_SPLIT],
  },

  {
    id: 'damage',
    label: 'Tower damage',
    kind: 'stat',
    summary:
      `Displayed damage = ${DAMAGE_FORMULA}. Every term multiplies except Berserker, which is `
      + 'added to the product afterwards.',
    units: 'multiplier chain',
    traps: [
      'Berserker is ADDED at the end, not multiplied. Folding it into the product overstates it '
      + 'on weak builds and understates it on strong ones. Note the scope: it is not one of the '
      + 'thirteen steps in `CalculateDamageUpgradeBonuses`, which are all multiplies, so whatever '
      + 'adds it does so somewhere later than the stat recompute.',
      'EVERY STORE IN THE RECOMPUTE COMES FROM AN `fmul`, AND THAT DOES NOT MEAN NO TERM IS '
      + 'ADDITIVE. Berserker is step five, and it computes `damage x (1 + gain / damage)` — which '
      + 'is `damage + gain` written as a product. Reading the opcodes and concluding "purely '
      + 'multiplicative" is exactly the mistake this note exists to stop; it was made here on '
      + '2026-08-18 and corrected the same day.',
      'Berserker is CAPPED. The gain is compared against seven times current damage, and if it '
      + 'exceeds that the multiplier is pinned to 8 and `damageFromBerserkerMaxed` is set. An '
      + 'uncapped Berserker model overstates a tank build without limit.',
      'Damage is computed by its OWN function, not by `CalculateUpgradeBonuses` with the other 46 '
      + 'stats. A stat list built from that function is missing the stat everything is measured '
      + 'by. See `TOWER_STAT_COMPUTED_SEPARATELY`.',
      'The Perk term is itself (1 + 0.15 × Quantity) × (1 + Standard Perk Bonus) — a nested '
      + 'formula, not a single number.',
      'Do not round intermediate values. The wiki states the in-game number is only reproduced '
      + 'by carrying full precision through the chain.',
      'The workshop values these terms come from are stored as floats with visible drift — '
      + 'Critical Factor\'s maximum is 16.20000076, not 16.2. Comparing a catalog value to a '
      + 'rounded constant with `===` fails on a number that is correct; compare to a tolerance.',
    ],
    claimType: 'objective',
    verification: 'verified_here',
    implementedBy: ['DAMAGE_FORMULA', 'CRITICAL_FACTOR_BASE', 'CRITICAL_FACTOR_MAX', 'WORKSHOP_DATA'],
    assertions: [
      { subject: 'criticalFactor', predicate: 'base', value: CRITICAL_FACTOR_BASE, provenance: CATALOG_COMBAT },
      { subject: 'criticalFactor', predicate: 'workshopMax', value: CRITICAL_FACTOR_MAX, provenance: CATALOG_COMBAT },
      { subject: 'damage.berserker', predicate: 'maxBonusMultiple', value: BERSERKER_MAX_BONUS_MULTIPLE, provenance: WIKI_DAMAGE },
      { subject: 'defensePercent', predicate: 'hardCap', value: DEFENSE_PERCENT_HARD_CAP, provenance: WIKI_DAMAGE },
      { subject: 'defensePercent', predicate: 'workshopMaxPercent', value: 49.5, provenance: CATALOG_COMBAT },
      { subject: 'enemy', predicate: 'heatUpMultiplierPerHit', value: ENEMY_HEAT_UP_PER_HIT, provenance: WIKI_DAMAGE },
    ],
    sources: [{ ...WIKI_DAMAGE, section: 'Damage Formula' }, CATALOG_COMBAT],
  },
  {
    id: 'damage.berserker',
    label: 'Berserker',
    kind: 'entity',
    summary:
      'An epic card that stores all damage taken (before reductions) and converts a percentage of '
      + 'it into added damage, capped at +700% of base — 8× in total.',
    traps: [
      'It is not a multiplier. It stores raw damage taken and adds a share of it.',
      'Raising base damage RAISES the cap, so a maxed Berserker can become un-maxed by an '
      + 'unrelated damage upgrade. Its contribution is not monotonic in build strength.',
      'It stores damage taken WITHOUT reductions, so defense upgrades do not reduce what it banks.',
    ],
    implementedBy: ['BERSERKER_MAX_BONUS_MULTIPLE', 'DAMAGE_FORMULA'],
    assertions: [
      // Berserker is a CARD, so its own catalog entry settles the cap and the
      // wiki was never needed. The shipped description reads "max of x8 tower
      // damage" — asserted as a substring match rather than restated, so a
      // catalog change breaks this instead of silently disagreeing with it.
      { subject: 'damage.berserker', predicate: 'maxBonusMultiple', value: BERSERKER_MAX_BONUS_MULTIPLE, provenance: CATALOG_BERSERKER_CARD, verification: 'verified_here' as const },
      { subject: 'damage.berserker', predicate: 'catalogDescriptionStatesTotalCap', value: (getCardTemplate('zerk')?.description ?? '').includes(`x${BERSERKER_MAX_BONUS_MULTIPLE + 1} tower damage`), provenance: CATALOG_BERSERKER_CARD, verification: 'verified_here' as const },
      // Its mastery, which the oracle did not carry at all. Viking Funeral
      // raises the cap from x8 to x500 for a duration when Death Defy fires —
      // a 62x swing that no model treating the x8 as absolute can produce.
      { subject: 'damage.berserker', predicate: 'masteryRaisesCapTo', value: 500, provenance: CATALOG_BERSERKER_CARD, verification: 'verified_here' as const },
      { subject: 'damage.berserker', predicate: 'masteryIsGatedOnDeathDefy', value: (getCardTemplate('zerk')?.masteryDescription ?? '').includes('Death Defy'), provenance: CATALOG_BERSERKER_CARD, verification: 'verified_here' as const },
      // It is ADDED after the product, not folded into it. Multiplying by 8
      // instead reproduces the ceiling and gets every intermediate value wrong.
      { subject: 'damage.berserker', predicate: 'addedOutsideTheDamageProduct', value: DAMAGE_FORMULA.trim().endsWith('+ Berserker'), provenance: WIKI_DAMAGE, verification: 'verified_here' as const },
      { subject: 'damage.berserker', predicate: 'totalMultipleAtCap', value: BERSERKER_MAX_BONUS_MULTIPLE + 1, provenance: WIKI_DAMAGE, verification: 'verified_here' as const },
    ],
    sources: [{ ...WIKI_DAMAGE, section: 'Berserker' }, CATALOG_BERSERKER_CARD],
  },
  {
    id: 'damage.superTower',
    label: 'Super Tower',
    kind: 'entity',
    summary:
      'An epic card that raises tower projectile damage for 15 seconds. It does not change the '
      + 'displayed workshop value.',
    traps: [
      'Super Tower does NOT boost ultimate weapons or anything that factors tower damage — only '
      + 'projectiles. The Damage and Berserker cards DO boost ultimate weapons. Treating all three '
      + 'damage cards alike is wrong for exactly one of them.',
      'It is a locked card: it cannot be removed mid-round.',
    ],
    assertions: [
      // The documented exclusion, and the reason it is worth a node: Super
      // Tower does not feed ultimate weapons, so a damage model that applies it
      // everywhere overstates UW damage specifically.
      { subject: 'damage.superTower', predicate: 'appliesToUltimateWeapons', value: false, provenance: WIKI_DAMAGE },
      { subject: 'damage.superTower', predicate: 'masteryLetsItReachUltimateWeapons', value: true, provenance: WIKI_DAMAGE },
      // The size of that mastery route, which the wiki does not state. It is a
      // SEPARATE, SMALLER quantity, not the normal Super Tower bonus becoming
      // available: the getter reads the card's own value and scales it by 0.35.
      // So a model that switches Super Tower "on" for ultimate weapons once
      // mastery is owned overstates the UW gain by roughly 3x.
      { subject: 'damage.superTower', predicate: 'ultimateWeaponBonusFactorPerCardValue', value: SUPER_TOWER_UW_BONUS_FACTOR, provenance: GAME_SUPER_TOWER_UW, verification: 'verified_here' as const },
    ],
    sources: [{ ...WIKI_DAMAGE, section: 'Super Tower' }, GAME_SUPER_TOWER_UW],
  },
  {
    id: 'criticalChance',
    label: 'Critical chance',
    kind: 'stat',
    summary:
      'Chance per projectile to crit. 80% from the workshop across 79 levels, plus card, mastery, '
      + 'sub-module and relic sources to a total of 100%.',
    units: 'percent',
    traps: [
      'Above 100% it still matters, but ONLY for ultimate weapon damage. Clamping it to 100% '
      + 'everywhere silently removes a real UW gain.',
    ],
    implementedBy: ['WORKSHOP_IMPORT_CATALOG'],
    assertions: [
      // Confirmed against the extracted Critical Chance table on 2026-08-20:
      // 80% at the highest level, which is level 79 across 80 rows.
      { subject: 'criticalChance', predicate: 'workshopMaxPercent', value: 80, provenance: GAME_WORKSHOP_TABLE, verification: 'verified_here' as const },
      { subject: 'criticalChance', predicate: 'totalMaxPercent', value: 100, provenance: WIKI_CRIT },
      // The join. The wiki says 79 workshop levels; the catalog ships a
      // maxLevel for the same stat. Two independent statements of one fact.
      { subject: 'criticalChance', predicate: 'workshopLevels', value: workshopMaxLevel('Critical Chance'), provenance: CATALOG_WORKSHOP, verification: 'verified_here' as const },
      // Above 100% it still does something, but ONLY for ultimate weapons.
      // Clamping everywhere silently deletes a real gain.
      { subject: 'criticalChance', predicate: 'mattersAboveOneHundredPercent', value: true, provenance: WIKI_CRIT },
    ],
    // Confirmed against the extracted workshop table on 2026-08-20.
    // Listed because this node's own assertions already cite it. Omitting it
    // scored the node as wiki-sourced while its claims came from elsewhere.
    sources: [{ ...WIKI_CRIT, section: 'Critical Chance' }, GAME_WORKSHOP_TABLE, CATALOG_WORKSHOP],
  },
  {
    id: 'criticalFactor',
    label: 'Critical factor',
    kind: 'stat',
    summary:
      'The multiplier a critical hit applies. 150 workshop levels from a base of ×1.2, rising ×0.1 '
      + 'per level to ×16.2. Also the multiplier used by the Ultimate Crit card.',
    units: 'multiplier',
    implementedBy: ['CRITICAL_FACTOR_BASE', 'CRITICAL_FACTOR_MAX'],
    assertions: [
      // Confirmed against the extracted Critical Factor table on 2026-08-20.
      // The table reads 1.200000048 and 16.20000076 -- the same numbers at the
      // precision the game keeps them in, which is what the trap above is about.
      { subject: 'criticalFactor', predicate: 'base', value: CRITICAL_FACTOR_BASE, provenance: GAME_WORKSHOP_TABLE, verification: 'verified_here' as const },
      { subject: 'criticalFactor', predicate: 'workshopMax', value: CRITICAL_FACTOR_MAX, provenance: GAME_WORKSHOP_TABLE, verification: 'verified_here' as const },
      { subject: 'criticalFactor', predicate: 'workshopLevels', value: workshopMaxLevel('Critical Factor'), provenance: CATALOG_WORKSHOP, verification: 'verified_here' as const },
      // base + levels x step must land on the stated maximum. Three numbers
      // from two sources that have to agree, so a change to any one is visible.
      { subject: 'criticalFactor', predicate: 'ladderReachesTheStatedMaximum', value: Math.abs(CRITICAL_FACTOR_BASE + workshopMaxLevel('Critical Factor') * 0.1 - CRITICAL_FACTOR_MAX) < 1e-9, provenance: CATALOG_WORKSHOP, verification: 'verified_here' as const },
    ],
    // Confirmed against the extracted workshop table on 2026-08-20.
    // Listed because this node's own assertions already cite it. Omitting it
    // scored the node as wiki-sourced while its claims came from elsewhere.
    sources: [{ ...WIKI_CRIT, section: 'Critical Factor' }, GAME_WORKSHOP_TABLE, CATALOG_WORKSHOP],
  },
  {
    id: 'superCritMultiplier',
    label: 'Super Critical Multiplier (Super Crit Mult)',
    kind: 'stat',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'The multiplier a SUPER critical hit applies, on top of the ordinary critical chain. 120 '
      + 'workshop levels from a base of x1.2 to x13.2.',
    units: 'multiplier',
    disambiguation:
      'Not Critical Factor, which tops out at x16.2 and applies to ordinary crits. Super crits are '
      + 'a second, rarer tier gated by Super Crit Chance, and both stats appear in the ultimate '
      + 'weapon damage formula as a separate term.',
    traps: [
      'Two similarly named stats with different ceilings — Critical Factor x16.2, Super Crit Mult '
      + 'x13.2. Reading one for the other is wrong in both directions and looks plausible either '
      + 'way.',
      'It multiplies only the super-crit branch, which fires at Super Crit Chance x Crit Chance — '
      + 'a product of two chances, not one. Treating it as a flat damage multiplier overstates it '
      + 'substantially.',
    ],
    implementedBy: ['WORKSHOP_DATA'],
    assertions: [
      { subject: 'superCritMultiplier', predicate: 'base', value: 1.2, provenance: CATALOG_COMBAT },
      { subject: 'superCritMultiplier', predicate: 'workshopMax', value: 13.2, provenance: CATALOG_COMBAT },
      { subject: 'superCritMultiplier', predicate: 'workshopLevelCount', value: 121, provenance: CATALOG_COMBAT },
    ],
    sources: [CATALOG_COMBAT, { ...WIKI_CRIT, section: 'Critical Factor' }],
  },
  {
    id: 'defensePercent',
    label: 'Defense percent',
    kind: 'stat',
    summary:
      'Share of incoming damage removed, applied BEFORE defense absolute. Sources sum to 125% but '
      + 'the stat is hard-capped at 98%.',
    units: 'percent',
    traps: [
      'Hard cap 98%, not 100%. A build cannot become immune this way.',
      'Sources deliberately over-sum to 125%. Reaching the cap on paper does not mean the excess '
      + 'is wasted in every configuration — but it is capped, so ranking upgrades by raw addition '
      + 'past 98% recommends buying nothing.',
      'Chrono Field, Primordial Collapse and Flame Bot reduction are NOT defense percent. They sit '
      + 'outside the 98% cap and apply AFTER defense absolute.',
    ],
    implementedBy: ['DEFENSE_PERCENT_HARD_CAP', 'DAMAGE_REDUCTION_OUTSIDE_DEFENSE_PERCENT'],
    assertions: [
      // Confirmed in the binary — the same clamp the `tower` compartment cites,
      // because it is the same constant at the same address. Mind the units:
      // the code clamps at 98.0 in percent, this constant is in the units
      // DEFENSE_PERCENT_HARD_CAP declares.
      { subject: 'defensePercent', predicate: 'hardCap', value: DEFENSE_PERCENT_HARD_CAP, provenance: GAME_DEFENSE_CAP, verification: 'verified_here' as const },
      // Not all damage reduction counts toward the cap. Treating every source
      // as Defense % both overstates the total and hides the sources that keep
      // working past 98%.
      { subject: 'defensePercent', predicate: 'reductionSourcesOutsideTheCap', value: DAMAGE_REDUCTION_OUTSIDE_DEFENSE_PERCENT.length, provenance: WIKI_DEF_PCT, verification: 'verified_here' as const },
      { subject: 'defensePercent', predicate: 'outsideSourcesApplyAfterDefenseAbsolute', value: true, provenance: WIKI_DEF_PCT },
    ],
    sources: [WIKI_DEF_PCT, GAME_DEFENSE_CAP],
  },
  {
    id: 'defenseAbsolute',
    label: 'Defense absolute',
    kind: 'stat',
    summary:
      'A flat subtraction from incoming damage, applied AFTER defense percent: '
      + 'received = damage × (1 − def%) − defAbs.',
    units: 'flat',
    traps: [
      'Order matters and is fixed: percent first, then flat. Reversing it changes the result at '
      + 'every input.',
      'The Fortress card multiplies with the lab rather than adding to it.',
    ],
    implementedBy: ['WORKSHOP_IMPORT_CATALOG'],
    assertions: [
      { subject: 'defenseAbsolute', predicate: 'workshopLevels', value: workshopMaxLevel('Defense Absolute'), provenance: CATALOG_WORKSHOP, verification: 'verified_here' as const },
      // Subtracted per HIT, so it is worth more against many weak hits than
      // against one large one -- the opposite of how Defense % behaves.
      { subject: 'defenseAbsolute', predicate: 'appliesPerHit', value: true, provenance: WIKI_DEF_ABS },
      { subject: 'defenseAbsolute', predicate: 'appliedBeforeDefensePercent', value: false, provenance: WIKI_DEF_ABS },
    ],
    // Listed because this node's own assertions already cite it. Omitting it
    // scored the node as wiki-sourced while its claims came from elsewhere.
    sources: [{ ...WIKI_DEF_ABS, section: 'Calculation' }, CATALOG_WORKSHOP],
  },
  {
    id: 'rule.enemyHeatUp',
    label: 'Enemy heat-up',
    kind: 'rule',
    summary:
      'Each hit an enemy lands multiplies its damage by ×1.04. The displayed enemy damage is the '
      + 'un-heated value.',
    traps: [
      'Sustained-damage models built on the displayed number understate incoming damage badly '
      + 'during long engagements.',
      '"HEAT" MEANS TWO UNRELATED THINGS. This is the community\'s Heat-up Mechanic: an enemy '
      + 'gains 4% damage per hit it lands. The GAME uses "Heat" for something else entirely — '
      + 'Tournament Heat and Battle Heat, the tournament battle-condition system ("Max Heat", '
      + '"Heat Conditions", "Persistent Heat" are all tournament UI strings). Searching game data '
      + 'for heat finds the tournament system and none of this, and wiring the two together would '
      + 'attach a per-hit damage ramp to tournament conditions that have nothing to do with it.',
    ],
    implementedBy: ['ENEMY_HEAT_UP_PER_HIT'],
    assertions: [
      // Stays wiki-sourced, and not for want of looking. There is no 1.04
      // constant anywhere in the dump and no localized string describing a
      // per-hit damage ramp, so this is computed rather than declared and the
      // constant sweep cannot reach it.
      { subject: 'rule.enemyHeatUp', predicate: 'damageFactorPerHit', value: ENEMY_HEAT_UP_PER_HIT, provenance: WIKI_DEF_ABS },
      // Compounding per hit is what makes Defense Absolute lose value over a
      // long fight: the flat subtraction stays flat while the hit grows.
      { subject: 'rule.enemyHeatUp', predicate: 'compoundsPerHit', value: ENEMY_HEAT_UP_PER_HIT > 1, provenance: WIKI_DEF_ABS, verification: 'verified_here' as const },
    ],
    sources: [{ ...WIKI_DEF_ABS, section: 'Calculation' }],
  },
  {
    id: 'healthRegen',
    label: 'Health regen',
    kind: 'stat',
    summary:
      'Tower health restored per second, from 6000 workshop levels plus cards, labs, perks and '
      + 'relics. The Health Regen card multiplies with the lab.',
    units: 'health per second',
    traps: [
      'Several perks raise regen while cutting max health — Health Regen ×8.8 costs 60% of max '
      + 'health. Scoring regen without the paired penalty always recommends taking them.',
    ],
    implementedBy: ['WORKSHOP_IMPORT_CATALOG'],
    assertions: [
      { subject: 'healthRegen', predicate: 'workshopLevels', value: workshopMaxLevel('Health Regen'), provenance: CATALOG_WORKSHOP, verification: 'verified_here' as const },
      // Per second and uncapped by max health, unlike a package heal -- so it
      // is the one defensive stat whose value scales with how long you survive
      // rather than with how hard you are hit.
      { subject: 'healthRegen', predicate: 'appliesPerSecond', value: true, provenance: WIKI_REGEN },
      { subject: 'healthRegen', predicate: 'canExceedMaxHealth', value: false, provenance: WIKI_REGEN },
    ],
    // Listed because this node's own assertions already cite it. Omitting it
    // scored the node as wiki-sourced while its claims came from elsewhere.
    sources: [WIKI_REGEN, CATALOG_WORKSHOP],
  },
  {
    id: 'lifesteal',
    label: 'Lifesteal',
    kind: 'stat',
    summary:
      'Heals the tower for a percentage of damage dealt on hit, across 80 workshop levels from 0% '
      + 'to 4.46%. Applies to every projectile including bounce and multishot.',
    units: 'percent of damage dealt',
    traps: [
      'The workshop ceiling is 4.46%, a much smaller number than it looks next to other percent '
      + 'stats. Trade-off perks can raise or lower the maximum.',
    ],
    implementedBy: ['WORKSHOP_IMPORT_CATALOG'],
    assertions: [
      { subject: 'lifesteal', predicate: 'workshopLevels', value: workshopMaxLevel('Lifesteal'), provenance: CATALOG_WORKSHOP, verification: 'verified_here' as const },
      // Scales with damage DEALT, so it is an offensive stat wearing a
      // defensive name: a build that kills faster heals more, and one that
      // stalls heals nothing at all.
      { subject: 'lifesteal', predicate: 'scalesWithDamageDealt', value: true, provenance: WIKI_LIFESTEAL },
      { subject: 'lifesteal', predicate: 'independentOfMaxHealth', value: true, provenance: WIKI_LIFESTEAL },
    ],
    // Listed because this node's own assertions already cite it. Omitting it
    // scored the node as wiki-sourced while its claims came from elsewhere.
    sources: [WIKI_LIFESTEAL, CATALOG_WORKSHOP],
  },
]

export const COMBAT_KNOWLEDGE_EDGES: readonly KnowledgeEdge[] = [
  {
    from: 'combat.electronDamage',
    kind: 'caps',
    to: 'combat.damageAttribution',
    note:
      'The second limit on the damage partition, after the Chain Lightning blend: a counter with '
      + 'one writer still cannot calibrate a source that overkills its targets.',
    sources: [SAVE_ELECTRONS],
  },

  {
    from: 'combat.chainLightningAndSmite',
    kind: 'caps',
    to: 'combat.damageAttribution',
    note:
      'The partition is exact over counters, not over mechanics. This is the counter that proves '
      + 'the difference matters, and it is the biggest one.',
    sources: [GAME_LIGHTNING_SPLIT],
  },

  {
    from: 'combat.damageAttribution',
    kind: 'independentOf',
    to: 'roundCoinAttribution',
    note:
      'Deliberately stated: the damage counters are disjoint and the coin counters are not. '
      + 'Assuming one set behaves like the other is how a breakdown built from coins comes out '
      + 'over 100% and one built from damage comes out short.',
    sources: [SAVE_DAMAGE_SPLIT],
  },

  {
    from: 'superCritMultiplier',
    kind: 'scales',
    to: 'damage',
    note:
      'The super-crit branch of the damage chain, gated by Super Crit Chance x Crit Chance rather '
      + 'than by a single chance.',
    sources: [{ ...WIKI_CRIT, section: 'Critical Factor' }],
  },
  {
    from: 'damage.berserker',
    kind: 'scales',
    to: 'damage',
    note:
      'Added outside the multiplicative chain and capped at +700% of base — so its contribution '
      + 'falls as base damage rises, unlike every other term.',
    sources: [{ ...WIKI_DAMAGE, section: 'Berserker' }],
  },
  {
    from: 'damage.superTower',
    kind: 'independentOf',
    to: 'damage',
    note:
      'Super Tower raises projectile damage on hit without changing the displayed workshop value, '
      + 'and so does not feed ultimate weapons — unlike the Damage and Berserker cards.',
    sources: [{ ...WIKI_DAMAGE, section: 'Super Tower' }],
  },
  {
    from: 'criticalChance',
    kind: 'scales',
    to: 'damage',
    note: 'Crit chance and crit factor together raise expected damage per projectile.',
    sources: [WIKI_CRIT],
  },
  {
    from: 'criticalFactor',
    kind: 'scales',
    to: 'criticalChance',
    note: 'Chance decides how often a crit lands; factor decides what it is worth.',
    sources: [WIKI_CRIT],
  },
  {
    from: 'defensePercent',
    kind: 'caps',
    to: 'defenseAbsolute',
    note:
      'Defense percent runs first and defense absolute subtracts from what survives it, so the '
      + 'order is part of the formula rather than a presentation detail.',
    sources: [{ ...WIKI_DEF_ABS, section: 'Calculation' }],
  },
  {
    from: 'rule.enemyHeatUp',
    kind: 'scales',
    to: 'defenseAbsolute',
    note: 'Heat-up raises incoming damage ×1.04 per hit, so a flat subtraction decays in value.',
    sources: [{ ...WIKI_DEF_ABS, section: 'Calculation' }],
  },
  {
    from: 'healthRegen',
    kind: 'independentOf',
    to: 'defensePercent',
    note: 'Regen restores health after the fact; it does not reduce incoming damage or touch the cap.',
    sources: [WIKI_REGEN],
  },
  {
    from: 'lifesteal',
    kind: 'derivedFrom',
    to: 'damage',
    note: 'Healing is a percentage of damage dealt, so every damage multiplier also scales lifesteal.',
    sources: [WIKI_LIFESTEAL],
  },
]
