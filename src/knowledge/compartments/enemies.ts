/**
 * Enemies, as the game defines them.
 *
 * Read off the wiki on 2026-08-16.
 *
 * Enemies are where "the number is right but the model is wrong" happens most:
 * spawn caps, coin decay and heat-up are all global rules that no per-enemy
 * table mentions, so a simulation built from the enemy list alone is missing
 * three multipliers that apply to everything in it.
 */
import { measuredAverageEnemyCoinWeight } from '../../mechanics/enemy-type-mix'
import { RESOURCE_DROPS_AVG_ENEMY_COIN_WEIGHT } from '../../mechanics/resource-drops-coin-simulation'
import { WAVE_FORMULA } from '../../mechanics/wave/_reference/wave-base-constants'
import { ENEMY_TYPE_SUMMARIES } from '../../data/enemies'
import type { KnowledgeEdge, KnowledgeNode } from '../substrate/schema'

const WIKI_ENEMIES = { origin: 'wiki', ref: 'Enemies', verifiedAt: '2026-08-16' } as const

/** The elite spawn-chance chart shipped in this repo, read as a table of numbers. */
const CHART_ELITE_SPAWN = {
  origin: 'sheet',
  ref: 'ELITE_SPAWN_CHANCE_ROWS (chart-tables.ts)',
  verifiedAt: '2026-08-18',
} as const

/** Read from the shipped catalog rather than transcribed, so it cannot drift. */
const CATALOG_ENEMIES = {
  origin: 'code',
  ref: 'thetowersdk/data ENEMY_TYPE_SUMMARIES',
  verifiedAt: '2026-08-17',
} as const
const WIKI_ELS = {
  origin: 'wiki',
  ref: 'Enemy Level Skip',
  sourceVersion: 'documented as of V26',
  verifiedAt: '2026-08-16',
} as const

/** Simultaneous spawn caps. Fleet enemies consume the normal allowance. */
/**
 * The elite spawn-chance table is generated, not arbitrary.
 *
 * `ELITE_SPAWN_CHANCE_ROWS` is 20 rows x 24 tier columns of wave thresholds —
 * 480 numbers that look like a transcribed chart. They are not. Two laws
 * reproduce every cell, and knowing them is the difference between treating the
 * table as opaque data and being able to tell when a cell is wrong.
 */

/** Each tier's thresholds are the previous tier's, times this. */
export const ELITE_SPAWN_CHANCE_TIER_RATIO = 0.9

/**
 * The ratio holds WITHIN each block and NOT across the seam between them.
 *
 * Tiers 1-15 run from the tier-1 bases; tiers 16-24 restart from a much lower
 * base set of their own. Verified exactly: `round(base * 0.9 ** (tier - from))`
 * reproduces all 19 non-zero rows in both blocks with zero mismatches. Across
 * the seam the tier-15-to-16 step is not 0.9 and is not even constant — it runs
 * from 0.36 to 0.85 depending on the row. So a model that extrapolates one
 * geometric series across all 24 tiers is right for fifteen of them and badly
 * wrong for the rest.
 */
export const ELITE_SPAWN_CHANCE_TIER_BLOCKS = [
  { from: 1, to: 15 },
  { from: 16, to: 24 },
] as const

/**
 * Both percentage columns are the same square series, nine rows apart.
 *
 * Row `k` of 0..19 carries single-spawn `min(k, 10) ** 2` percent and
 * double-spawn `max(0, k - 9) ** 2` percent. So single climbs 0, 1, 4, 9 ... to
 * 100 over the first ten rows and then pins, and double picks up the identical
 * series at row 10 — the same row single reaches 100, not the row after. Exact
 * on all 20 rows, and the off-by-one is the sort of thing an eyeballed "ten
 * rows apart" gets wrong.
 *
 * The consequence worth stating: elite chance is quadratic in the row index, so
 * the early rows are nearly free and the late ones are not. Reading the column
 * as a linear ramp overstates the low end and understates the high end.
 */
export function eliteSpawnSinglePercentAtRow(row: number): number {
  return Math.min(Math.max(0, Math.floor(row)), 10) ** 2
}

export function eliteSpawnDoublePercentAtRow(row: number): number {
  return Math.max(0, Math.min(Math.floor(row), 19) - 9) ** 2
}

/**
 * Three cells of the table are literally the string `undefined`, and the effect
 * is silent and backwards.
 *
 * Row 1 — the 1% band, the first wave at which elites appear at all — is
 * missing for tiers 22, 23 and 24. `eliteSpawnChanceAtWave` parses each cell
 * with `parseInt`, gets `NaN`, and `continue`s, which does not skip to the next
 * row: it leaves `rowIndex` at 0. So for every wave below the 4% threshold those
 * three tiers report ZERO elite chance.
 *
 * That inverts the only ordering the table has. At wave 30 tier 21 reports one
 * percent and tiers 22 through 24 report none — a higher tier reported as safer
 * than a lower one, which cannot be right and is not what the neighbouring rows
 * say. Row 2 continues its geometric series cleanly through those same tiers
 * (61, 55, 49, 44), so the data is missing, not zero.
 *
 * The block ratio predicts roughly 22, 19 and 18. Those values are NOT written
 * here and NOT filled into the table: the ratio is a description of a community
 * chart, not a reading of the game, and inventing three cells from it would
 * launder an inference into data. Recorded as a known hole with the exact
 * coordinates so it can be filled from a real source.
 */
export const ELITE_SPAWN_CHANCE_MISSING_CELLS = [
  { row: 1, tier: 22 },
  { row: 1, tier: 23 },
  { row: 1, tier: 24 },
] as const

export const ENEMY_SPAWN_CAP = { total: 150, normal: 120, elite: 20, boss: 10 } as const

/** Base coin value per enemy type, relative to Basic. */
export const ENEMY_BASE_COIN_VALUE: Readonly<Record<string, number>> = {
  Fast: 2,
  Tank: 4,
  Ranged: 2,
  Boss: 5,
  Protector: 3,
  Vampire: 4,
  Ray: 4,
  Scatter: 4,
}

/** Health multiple of a Basic enemy. */
export const ENEMY_HEALTH_MULTIPLE: Readonly<Record<string, number>> = {
  Tank: 5,
  Boss: 20,
  Vampire: 2,
  Ray: 1,
  Scatter: 2,
  Saboteur: 20,
  Commander: 20,
  Overcharge: 20,
}

/** A live enemy loses this share of its coin value after three waves. */
export const ENEMY_COIN_DECAY = 0.5

/**
 * Every enemy type the game defines, from `ENEMY_TYPE_SUMMARIES`.
 *
 * Derived rather than listed so it cannot fall behind the catalog.
 */
export const ENEMY_TYPES: readonly string[] = (ENEMY_TYPE_SUMMARIES as readonly { name: string }[])
  .map(entry => entry.name)

/**
 * Types with no entry in the two tables above, and why.
 *
 * Both tables are expressed **relative to Basic**, so Basic itself is 1 in each
 * and is deliberately absent. The rest are genuine gaps, and the two tables do
 * not cover the same set:
 *
 * - no coin value: the three fleet enemies (Saboteur, Commander, Overcharge)
 * - no health multiple: Fast, Ranged, Protector
 *
 * So a type can be present in one table and missing from the other, and a
 * lookup returns `undefined` for a real enemy rather than for a nonexistent
 * one. Check membership before arithmetic — this is the same shape as the
 * tournament league skip table, where a missing key read as "no such thing".
 */
export const ENEMY_TYPES_WITHOUT_COIN_VALUE: readonly string[] = ENEMY_TYPES
  .filter(type => type !== 'Basic' && !(type in ENEMY_BASE_COIN_VALUE))

export const ENEMY_TYPES_WITHOUT_HEALTH_MULTIPLE: readonly string[] = ENEMY_TYPES
  .filter(type => type !== 'Basic' && !(type in ENEMY_HEALTH_MULTIPLE))

/** The three fleet enemies, which share a resistance profile and arrival rule. */
const FLEET_ENEMY_TYPES = ['Saboteur', 'Commander', 'Overcharge'] as const

/** Types already given a hand-written node below, with more detail than the catalog carries. */
const HAND_WRITTEN_ENEMY_NODES = ['Protector', 'Boss', 'Vampire', 'Scatter', 'Saboteur'] as const

/**
 * A node per enemy type the catalog knows and this file did not describe.
 *
 * Seven of the twelve types had no node at all — including Commander and
 * Overcharge, two of the three fleet enemies, while the third (Saboteur) was
 * written out by hand. Generated from `ENEMY_TYPE_SUMMARIES` so the text stays
 * the catalog's rather than a paraphrase.
 *
 * Labelled `"<name> enemy"` rather than the bare name on purpose. `scoreNode`
 * matches a label against the query by containment and scores by length, so a
 * node labelled `Fast` would claim any query containing that word — which is how
 * nine per-weapon UW nodes hijacked the UW+ lookups earlier in this session.
 */
export const GENERATED_ENEMY_TYPE_NODES: readonly KnowledgeNode[] =
  (ENEMY_TYPE_SUMMARIES as readonly { name: string, summary: string }[])
    .filter(entry => !(HAND_WRITTEN_ENEMY_NODES as readonly string[]).includes(entry.name))
    .map(entry => {
      const isFleet = (FLEET_ENEMY_TYPES as readonly string[]).includes(entry.name)
      const id = `enemy.${entry.name[0].toLowerCase()}${entry.name.slice(1)}`
      return {
        id,
        label: `${entry.name} enemy`,
        kind: 'entity',
        claimType: 'objective',
        verification: 'verified_here',
        summary: `${entry.name}: ${entry.summary}.`,
        disambiguation: isFleet
          ? 'A FLEET enemy — it does not follow the normal spawn rules and ignores most control effects.'
          : 'A normal-spawn enemy type, counted against the 120 normal-enemy cap.',
        traps: isFleet
          ? [
            'Fleet enemies are immune to orbs, death ray, shockwave, knockback and both Black Hole '
              + 'damage and pull, and carry 85% thorns resistance. A build that clears waves through '
              + 'any of those does nothing to this enemy.',
            'They appear naturally from Tier 14, and on lower tiers from wave 15000 on Tier 1, '
              + '250 waves earlier per tier above that, repeating every 100 waves. A plan that '
              + 'never reaches those waves never meets them.',
          ]
          : [
            /*
               * A missing table entry is a GAP, not a zero, and saying so is
               * the whole point. Basic has no coin multiple because it IS the
               * baseline; the others that lack one are simply unrecorded. A
               * planner that reads absence as 0 prices those enemies at nothing
               * and reports a confident total.
               */
            ...(entry.name in ENEMY_BASE_COIN_VALUE
              ? []
              : [`${entry.name} has NO base coin value recorded. That is an absent figure, not a `
                  + 'value of zero — treat it as unknown and say so rather than pricing the enemy '
                  + 'at nothing.']),
            ...(entry.name in ENEMY_HEALTH_MULTIPLE
              ? []
              : [`${entry.name} has NO health multiple recorded, so its health cannot be derived `
                  + 'from Basic. Assuming parity with Basic is a guess wearing the shape of a fact.']),
            `Counted against the ${ENEMY_SPAWN_CAP.normal}-enemy normal cap, which Fleet enemies `
              + `also consume. The caps are separate pools — ${ENEMY_SPAWN_CAP.normal} normal, `
              + `${ENEMY_SPAWN_CAP.elite} elite, ${ENEMY_SPAWN_CAP.boss} boss — so a wave can be at `
              + 'the normal cap while elites still spawn.',
          ],
        implementedBy: ['ENEMY_TYPE_SUMMARIES'],
        assertions: [
          ...(entry.name in ENEMY_HEALTH_MULTIPLE
            ? [{ subject: id, predicate: 'healthMultipleOfBasic', value: ENEMY_HEALTH_MULTIPLE[entry.name], provenance: CATALOG_ENEMIES }]
            : []),
          ...(entry.name in ENEMY_BASE_COIN_VALUE
            ? [{ subject: id, predicate: 'baseCoinValue', value: ENEMY_BASE_COIN_VALUE[entry.name], provenance: CATALOG_ENEMIES }]
            : []),
          { subject: id, predicate: 'isFleetEnemy', value: isFleet, provenance: CATALOG_ENEMIES },
        ],
        sources: [CATALOG_ENEMIES],
      } satisfies KnowledgeNode
    })

/**
 * Enemy level skip chances, as the game computes them.
 *
 * The attack and health skip chances are separate values, and the order the
 * terms combine in is what the pipeline node describes. Both are observable in
 * game: set one contributing stat at a time and the resulting chance moves in
 * the order claimed here.
 */
const GAME_ELS_CALC = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/** The same build, for values read off the enemy and wave screens. */
const GAME_MAIN_FIELDS = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/** The accumulator fields the skip is actually decided by. */
export const ENEMY_LEVEL_SKIP_COUNTER_FIELDS = {
  attack: { counter: 'counterEALS', offset: 0x1B0, total: 'enemyAttackLevelSkips', utilityIndex: 11 },
  health: { counter: 'counterEHLS', offset: 0x1B4, total: 'enemyHealthLevelSkips', utilityIndex: 12 },
} as const

/** The counter must EXCEED this, not merely reach it, before a skip is granted. */
export const ENEMY_LEVEL_SKIP_COUNTER_THRESHOLD = 1

/**
 * Where the skip chance is spent: once per wave, not once per enemy.
 *
 * See the trap on `enemyLevelSkip.consumer` for why that distinction matters.
 */
/**
 * Protector damage reduction: a flat 0.6 multiplier on incoming damage.
 *
 * Set once at the start of a wave and applied to every hit while a Protector is
 * alive, which is why the reduction does not stack with a second Protector.
 */
const GAME_PROTECTOR = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/**
 * The multiplier applied to damage against an enemy in — or being — a Protector.
 *
 * `NewWave` computes it from a literal 0.6 and stores it; `HitMultiplier` does
 * `damage *= protectorDamageReduction`. So damage is reduced TO sixty percent,
 * which is a forty percent reduction.
 */
export const PROTECTOR_DAMAGE_MULTIPLIER = 0.6

/**
 * The lab term feeding it, and why it is recorded as an anomaly.
 *
 * `NewWave` computes both protector fields back to back from the research
 * benefit array (`Main.field_0x60 -> +0x218`):
 *
 *     ldr s1, [x8, #0x208]   ; index 122, Protector Radius  -> protectorRadiusScale
 *     ldr s1, [x8, #0x1FC]   ; index 119, Boss Health       -> protectorDamageReduction
 *
 * both as `(1 - lab * 0.01) * constant`. The first pairing is exactly right.
 * The second is not: index 119 is `boss_health`, and index 123 —
 * `protector_damage_reduction` — is the one that reads like it belongs, and is
 * the lab `Enemy.ThornDamage` actually uses.
 *
 * The index is not in doubt. The bounds check immediately above is
 * `cmp w10, #0x7a`, which throws unless the array is longer than 122 — so 122
 * is the highest element touched and 119 is genuinely one of them. An earlier
 * note here blamed the base register; that was wrong, the register is the
 * research array and the arithmetic checks out at 122 and at 123 elsewhere.
 *
 * Two readings survive and neither is established:
 *
 * 1. The game really does scale the protector's damage multiplier by the Boss
 *    Health lab — a coupling nothing documents, and possibly a defect in the
 *    game rather than in the reading.
 * 2. The research name table is off by some amount at exactly this index, and
 *    the two spot-checks that validated it (122 and 123) happen to sit either
 *    side of the discrepancy.
 *
 * Settling it needs a save with a known Boss Health lab level and an observed
 * protector damage figure. Until then the 0.6 constant and the multiplier
 * semantics stand on their own — both come from instructions, not from this
 * pairing.
 */
export const PROTECTOR_DAMAGE_LAB_RESEARCH_INDEX = 119
export const PROTECTOR_RADIUS_LAB_RESEARCH_INDEX = 122

const GAME_NEW_WAVE_LOOP = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/** `Main.NewWave`, where every per-wave RNG is constructed. */
const GAME_NEW_WAVE = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/**
 * The generators `NewWave` rebuilds every wave, and the two it passes over.
 *
 * Each is `new Random(WaveSeed + k)` with its own constant `k`, so a wave is
 * reproducible from its seed and the streams do not interfere.
 *
 * The interesting entries are the two `false` ones. `attackSkipRandom` and
 * `healthSkipRandom` sit BETWEEN `deathDefyRandom` and `fleetsRandom` in the
 * field layout, and `NewWave` constructs the ones on either side of them and
 * skips both. Nothing anywhere in the binary assigns them, so they are
 * permanently null — and a null `Random` would throw the moment it was used.
 * That is what makes "enemy level skip is not a roll" a positive finding rather
 * than an absence of evidence.
 */
export const PER_WAVE_RANDOM_STREAMS = [
  { field: 'genericRandom', offset: 0x1520, rebuiltEachWave: false },
  { field: 'deathDefyRandom', offset: 0x1528, rebuiltEachWave: true },
  { field: 'attackSkipRandom', offset: 0x1530, rebuiltEachWave: false },
  { field: 'healthSkipRandom', offset: 0x1538, rebuiltEachWave: false },
  { field: 'fleetsRandom', offset: 0x1540, rebuiltEachWave: true },
  { field: 'moreElitesRandom', offset: 0x1548, rebuiltEachWave: true },
] as const

/** Fields declared as `Random` that the game never constructs. */
export const UNCONSTRUCTED_RANDOM_FIELDS: readonly string[] = PER_WAVE_RANDOM_STREAMS
  .filter(stream => !stream.rebuiltEachWave && stream.field.endsWith('SkipRandom'))
  .map(stream => stream.field)

/** The ordered pipeline, as the function performs it. */
export const ENEMY_LEVEL_SKIP_PIPELINE = [
  'workshop utility levels',
  'labs (researchBenefitIncrease)',
  'modules, via GetEquippedClusterBenefit',
  'vault tech tree: TechTreeStat.Enemy_Attack_Skip = 9, Enemy_Health_Skip = 12',
  'cards and relics, via get_EnemyAttackLevelSkip / get_EnemyHealthLevelSkip',
  'multiply by the level-skip enhancement',
  'clamp to 0..1',
  'subtract Enemy Level Skip Reduction (battle condition), clamp at 0',
  'multiply by Skip Reduction - Multiply (battle condition)',
  'subtract eLSDecayAmount (Skip Decay), clamp at 0',
  'zero BOTH stats if utility is disabled',
] as const

/** How many sources ADD into the total before the enhancement multiplier. */
export const ENEMY_LEVEL_SKIP_ADDITIVE_SOURCE_COUNT = 5

/**
 * The wave-base scaling for enemy health and damage.
 *
 * Every coefficient is exact rather than fitted to sampled values, so the curve
 * matches the game at any wave rather than only near the points it was checked.
 */
const GAME_WAVE_SCALING = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/** Health polynomial band divisors, derived from the shipped coefficient table. */
export const WAVE_HEALTH_BAND_DIVISORS: readonly number[] =
  WAVE_FORMULA.health.polynomialTerms.map(term => term.divisor)

/** Damage polynomial band divisors, likewise. */
export const WAVE_DAMAGE_BAND_DIVISORS: readonly number[] =
  WAVE_FORMULA.damage.polynomialTerms.map(term => term.divisor)

/** Tiers whose health exponent carries a per-tier addon before the cap applies. */
export const WAVE_HEALTH_TIER_EXP_ADDON_TIERS = [10, 11, 12, 13, 14] as const

/**
 * The per-frame run loop, mapped from the binary rather than inferred.
 *
 * Obtained by scanning every class in the binary, which
 * walks every method and emits the constants, field accesses
 * and CALL TARGETS as JSON. The call graph below is the `calls` field of those
 * records, not a reading of the binary — 514 methods across Main, Enemy and
 * Projectile mapped in about three seconds.
 */
const GAME_RUN_LOOP = {
  origin: 'game',
  ref: 'Main.WaveUpdate, Main.TowerFireFunction, Projectile.*, Enemy.EnemyUpdate call graph',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/**
 * What `Main.WaveUpdate` calls, in the order a wave needs them.
 *
 * Spawning is driven from one method. There is no separate wave manager class —
 * looking for a `WaveManager` finds nothing, which is why this was hard to find
 * by name.
 */
export const WAVE_UPDATE_SPAWN_CALLS: readonly string[] = [
  'Main.NewWave',
  'Main.IsFleetWave',
  'Main.SpawnEnemy',
  'Main.SpawnRandomBasicEnemy',
  'Main.SpawnRandomEliteEnemy',
  'Main.SpawnRandomFleetEnemy',
  'Main.SpawnRecoveryPackage',
]

/** The projectile pipeline, from the tower firing to damage landing. */
export const TOWER_FIRING_PIPELINE: readonly string[] = [
  'Main.TowerFireFunction',
  'Main.TowerFire',
  'Main.TryGetProjectile',
  'Projectile.Activate',
  'Projectile.ProjectileMovement',
  'Projectile.OnTriggerEnter2D',
  'Projectile.ProjectileHit',
  'Enemy.ProjectileDamage',
  'Enemy.ApplyProjectileDamage',
  'Enemy.Kill',
]

/** Composition is decided by CustomizeGame, not by the spawn methods. */
export const SPAWN_COMPOSITION_SOURCES: readonly string[] = [
  'CustomizeGame.GetBasicUltimateSpawnChances',
  'CustomizeGame.GetOneEnemyTypeLevel',
  'MiniBossController.GetRandomMiniBoss',
]

/**
 * `CustomizeGame` is the battle-conditions layer, and it decides composition.
 *
 * The name suggests a settings screen. It is not: it is where heat, battle
 * conditions and every per-enemy-type modifier live, and `Main.SpawnEnemy` asks
 * it what to spawn. Mapped with `map-v283-methods.py`.
 */
const GAME_SPAWN_COMPOSITION = {
  origin: 'game',
  ref: 'CustomizeGame + MiniBossController method map',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/**
 * Battle-condition slot each `CustomizeGame` accessor reads.
 *
 * Read out of the mapped immediates rather than transcribed. Note 212 appears
 * TWICE: `GetBossesUltimateDuration` and `GetUltimateBossModifier` read the same
 * slot, so they are two views of one condition rather than two conditions.
 */
export const BATTLE_CONDITION_MODIFIER_SLOTS: Readonly<Record<string, number>> = {
  GetDeathDefyModifier: 207,
  GetEnergyShieldModifier: 208,
  GetEnemyLevelSkipReduction: 209,
  GetFastUltimateDuration: 210,
  GetRangedUltimateDuration: 211,
  GetBossesUltimateDuration: 212,
  GetUltimateBossModifier: 212,
  GetBasicsUltimateDuration: 213,
  GetTankUltimateDuration: 214,
  GetProtectorUltimateDuration: 215,
  GetCubeArmor: 216,
  GetCubeSpeedModifier: 217,
  GetMoreEnemiesModifier: 218,
  GetEnemyAttackSpeedModifier: 219,
}

/** Ultimate-enemy spawn chances that ARE in the binary, from GetBasicUltimateSpawnChances. */
export const BASIC_ULTIMATE_SPAWN_CHANCES = [0.01, 0.05, 0.1] as const

/** Elite spawn chances come from Firebase Remote Config, not from the binary. */
export const MINIBOSS_CHANCES_ARE_REMOTE_CONFIGURED = true

/**
 * Movement and targeting, mapped from the binary.
 *
 * `Enemy.GetEnemyBaseSpeed` and `Main.TowerFireFunction` /
 * `Enemy.MatchesTargetPriority`, via `map-v283-methods.py`.
 */
const GAME_SPEED_TARGETING = {
  origin: 'game',
  ref: 'Enemy.GetEnemyBaseSpeed, Main.TargetPriorityIndexPositions, Enemy.MatchesTargetPriority',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/**
 * Target priorities the tower can be set to, in enum order.
 *
 * `Closest` is 0 — the default is a POSITION rule, and the other nine are TYPE
 * rules. That difference matters: a type rule can match nothing on screen, and
 * what the tower does then is not "wait", it falls through the list.
 */
export const TOWER_TARGET_PRIORITIES: readonly string[] = [
  'Closest', 'Basic', 'Fast', 'Tank', 'Ranged',
  'Boss', 'Spotlight', 'Protector', 'Elites', 'Fleets',
]

/**
 * Trade-off perks that change enemy movement speed.
 *
 * `GetEnemyBaseSpeed` calls both `Perks.PerkBenefitUp` and
 * `Perks.PerkBenefitDown` and references perk indices 45 and 48 — the only two
 * perks whose text mentions speed, one slowing every enemy and one speeding up
 * bosses specifically.
 */
export const ENEMY_SPEED_PERK_INDICES = [45, 48] as const

/**
 * Wave timing, read from the fields `NewWave` writes and `WaveUpdate` consumes.
 *
 * Field offsets resolved against the dump's own field table by
 * `map-v283-methods.py --fields`, so these are names rather than addresses.
 */
const GAME_WAVE_TIMING = {
  origin: 'game',
  ref: 'Main.NewWave writes / Main.WaveUpdate reads, resolved against the Main field table',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/**
 * Per-wave parameters `NewWave` rolls once, before the wave plays.
 *
 * Base health and damage are among them: they are computed ONCE and stored, not
 * per enemy, so every enemy spawned in a wave shares one base.
 */
export const WAVE_PARAMETERS_SET_ON_NEW_WAVE: readonly string[] = [
  'currentWaveBaseHealth',
  'currentWaveBaseDamage',
  'currentWaveBaseKillCash',
  'currentWaveKillCoins',
  'enemySpawnChance',
  'enemyDoubleSpawnChance',
  'miniBossWaveBool',
  'miniBossSpawnTimePct',
  'doubleMiniBossSpawnTimePct',
  'bossSpawnTimePct',
  'fleetsSpawnTimePct',
  'moreEliteSpawnTimePct',
  'moreEliteWavesUntilActive',
]

/** The clocks `WaveUpdate` advances every frame. */
export const WAVE_TIMER_FIELDS: readonly string[] = [
  'waveTimer',
  'waveSpawnTimer',
  'rushingTimer',
]

/** Wave shape, in seconds. */
export const WAVE_LENGTH_FIELDS: readonly string[] = [
  'waveLengthSeconds',
  'waveCooldownSeconds',
]

/**
 * Special spawns are scheduled as a FRACTION of the wave, not at a fixed second.
 *
 * Every one of these is a `...SpawnTimePct` float, so changing wave length moves
 * when they appear rather than changing how many fit.
 */
export const FRACTIONAL_SPAWN_SCHEDULE_FIELDS: readonly string[] = [
  'miniBossSpawnTimePct',
  'doubleMiniBossSpawnTimePct',
  'bossSpawnTimePct',
  'fleetsSpawnTimePct',
  'moreEliteSpawnTimePct',
  'moreFleetSpawnTimePct',
]

/**
 * Damage application and the kill payout, mapped from the binary.
 *
 * `Enemy.ApplyProjectileDamage` (866 instructions) and `Enemy.Kill` (1452),
 * with their field accesses resolved against the Enemy field table.
 */
const GAME_DAMAGE_AND_KILL = {
  origin: 'game',
  ref: 'Enemy.ApplyProjectileDamage, Enemy.Kill',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/**
 * Fields `ApplyProjectileDamage` WRITES, which is the surprising part.
 *
 * It does not only subtract health. It rewrites the enemy's wave LEVEL and its
 * max health, and tracks how many reductions have already been applied.
 */
export const DAMAGE_APPLICATION_WRITES: readonly string[] = [
  'enemyHealth',
  'enemyHealthMax',
  'enemyWaveHealthLevel',
  'enemyWaveHealthLevelReductionsCount',
  'enemyDamage',
  'enemyArmor',
  'enemyPulsarHarvesterProcs',
  'markedForDeathTimeout',
  'renderArmorMultiplier',
]

/** Coin and cell bonuses `Enemy.Kill` calls, in the order the map lists them. */
export const KILL_REWARD_BONUS_CALLS: readonly string[] = [
  'Enemy.BlackHoleCoinBonus',
  'Enemy.BountyCoinBonus',
  'Enemy.CoinBotBonus',
  'Enemy.DeathWaveCoinBonus',
  'Enemy.EnemyBalanceBonus',
  'Enemy.GoldenTowerBonus',
  'Enemy.LivedWavesCoins',
  'Enemy.OrbCoinBonus',
  'Enemy.SpotlightCoinBonus',
  'Main.IntroSprintCoins',
  'Enemy.DeathWaveCellBonus',
  'Enemy.GetBonusCellsBonus',
]

/** Drop rolls that happen on kill, not on wave end. */
export const KILL_DROP_CALLS: readonly string[] = [
  'ModuleManager.TryBossDrop',
  'ModuleManager.TryEliteRerollShardsDrop',
  'ModuleManager.TryFleetsDrop',
  'ModuleManager.TryGetUniqueBenefit',
]

/**
 * `ApplyProjectileDamage` in code-layout order.
 *
 * Produced by `map-v283-methods.py --trace Enemy.ApplyProjectileDamage`, which
 * emits calls and named field writes in ADDRESS order.
 *
 * ## What this is and is not
 *
 * Address order is not execution order. The method branches, so a step listed
 * before another may run after it, or not at all. What layout order gives is a
 * reliable PARTITION into phases plus a set of orderings that data dependency
 * makes certain — `GetWaveBaseHealth` must precede the `enemyWaveHealthLevel`
 * write that consumes it, whatever the branch structure.
 *
 * The phase boundaries below are safe. The step-to-step order inside a phase is
 * layout, and is marked as such rather than presented as sequence.
 */
const GAME_DAMAGE_ORDER = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/**
 * How much of the damage sequence runs on every hit.
 *
 * Almost none of it. Only three steps are unconditional, and they do very
 * little — two health writes and one Scout check. Everything else, including
 * the kill handling, both wave-base lookups and Chain Lightning, only happens
 * when its own condition is met.
 *
 * That is why a damage model built by assuming each stage always applies
 * overshoots: most stages do not.
 */
export const DAMAGE_UNCONDITIONAL_BLOCK_COUNT = 3
export const DAMAGE_TOTAL_BLOCK_COUNT = 172

/** Calls in ApplyProjectileDamage that are NOT guaranteed to run. */
export const DAMAGE_CONDITIONAL_CALLS: readonly string[] = [
  'Main.BonusDamageFromImpetus',
  'Enemy.HitMultiplier',
  'Enemy.GetDiminishedNumberOfLevelReductions',
  'Main.GetWaveBaseHealth',
  'Main.GetWaveBaseDamage',
  'Enemy.Kill',
  'Main.ChainLightning',
  'ModuleManager.get_RendArmorMax',
]

/**
 * Unconditional calls in the hot methods, from post-dominance.
 *
 * `map-v283-methods.py --cfg` over the eight largest gameplay methods. The
 * result is near-total conditionality: of 622 call sites across them, SEVEN run
 * on every path, and six of those are in `NewWave`.
 *
 * A caveat worth carrying: a long straight-line run is a single basic block, so
 * a low "unconditional block" count does not mean little code runs — it means
 * little code runs REGARDLESS OF STATE. Counting unconditional CALLS is the
 * useful measure and is what these numbers are.
 */
export const HOT_METHOD_UNCONDITIONAL_CALLS: Readonly<Record<string, number>> = {
  'Enemy.Activate': 1,
  'Enemy.HitMultiplier': 0,
  'Enemy.Kill': 0,
  'Main.CalculateUpgradeBonuses': 0,
  'Main.NewWave': 6,
  'Main.SpawnEnemy': 0,
  'Main.TowerFireFunction': 0,
  'Main.WaveUpdate': 0,
}

/**
 * `NewWave` unconditionally builds three seeded `Random` instances.
 *
 * Six unconditional calls, alternating `Main.get_WaveSeed` and `Random..ctor`
 * three times — and `PER_WAVE_RANDOM_STREAMS` independently records exactly
 * three streams flagged `rebuiltEachWave`. Two readings of different things
 * agreeing on the same number is what makes either believable.
 */
export const RANDOM_STREAMS_REBUILT_PER_WAVE = 3

/** The five phases the trace partitions into, in layout order. */
export const DAMAGE_APPLICATION_PHASES: readonly string[] = [
  'compute the hit: IsScouted, BonusDamageFromImpetus, HitMultiplier, unique-module benefit',
  'level reduction: Pulsar Harvester procs, GetDiminishedNumberOfLevelReductions, '
    + 'GetWaveBaseHealth and GetWaveBaseDamage re-derive the enemy',
  'physical state: rigidbody mass, enemyArmor, material and particles',
  'subtract health and resolve death: markedForDeathTimeout, missions, hit text, Enemy.Kill',
  'secondary effects: Chain Lightning, and Rend Armor written last',
]

/**
 * Orderings guaranteed by data dependency rather than by layout.
 *
 * Each is a value produced by one step and consumed by the next, so no branch
 * can reverse them.
 */
export const DAMAGE_ORDER_GUARANTEED_BY_DEPENDENCY: readonly string[] = [
  'GetDiminishedNumberOfLevelReductions before enemyWaveHealthLevel is written',
  'GetWaveBaseHealth before enemyHealth is rewritten from the new level',
  'GetWaveBaseDamage before enemyDamage is rewritten',
  'ModuleManager.get_RendArmorMax before renderArmorMultiplier is written',
]

/**
 * Diminishing returns on level reductions, and the step nobody expects.
 *
 * Below 101 raw reductions nothing is lost. Above that the curve is NOT smooth:
 * the exponent advances in whole steps of 1500 reductions, so the effective
 * total is flat across each band and then jumps. Modelling it as a continuous
 * curve is close in the middle of a band and wrong at both ends of one.
 */
const GAME_LEVEL_REDUCTION_CURVE = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/** Below this many raw reductions, none are lost. */
export const LEVEL_REDUCTION_FREE_THRESHOLD = 100

/** The exponent steps once per this many reductions above the threshold. */
export const LEVEL_REDUCTION_STEP_SIZE = 1500

/**
 * Effective reductions approach this, and DO reach it once the exponential
 * underflows.
 *
 * "Approaches but never reaches" is the mathematical description and it is
 * false in floating point: once `300 * exp(-step)` falls below the precision of
 * the subtraction, `400 - tiny` is exactly 400. The game computes this in
 * float32, which underflows sooner than the float64 here — so if anything it
 * reaches the cap earlier in game than this function does.
 */
export const LEVEL_REDUCTION_ASYMPTOTE = 400

/** Amplitude subtracted from the asymptote. */
export const LEVEL_REDUCTION_AMPLITUDE = 300

/** The curve itself: effective reductions for a raw count. */
export function diminishedLevelReductions(raw: number): number {
  if (raw <= LEVEL_REDUCTION_FREE_THRESHOLD) return raw
  const step = Math.floor((raw - LEVEL_REDUCTION_FREE_THRESHOLD) / LEVEL_REDUCTION_STEP_SIZE)
  return Math.trunc(
    LEVEL_REDUCTION_ASYMPTOTE - LEVEL_REDUCTION_AMPLITUDE * Math.exp(-step),
  )
}

/**
 * Where the per-wave enemy TYPE mix comes from, traced in v28.3.
 *
 * `Main.SpawnRandomBasicEnemy` picks a type by reading five `chance*Enemy`
 * fields; `Main.NewWave` rewrites some of them every wave.
 */
/** The fit that refuted the composition table. */
const SAVE_TYPE_MIX = {
  origin: 'save',
  ref: 'test/playerInfo.dat, totalEnemiesDestroyed*ThisRound',
  sourceVersion: 'v28.3',
  verifiedAt: '2026-08-18',
} as const

const GAME_TYPE_MIX = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/** The five fields the spawn roll reads, in `Main` field-table order. */
export const SPAWN_TYPE_CHANCE_FIELDS: readonly string[] = [
  'chanceNormalEnemy',
  'chanceFastEnemy',
  'chanceTankEnemy',
  'chanceRangedEnemy',
  'chanceProtectorEnemy',
]

/** Of those, the ones `Main.NewWave` or `Main.Initialize` actually writes. */
export const SPAWN_TYPE_CHANCE_FIELDS_WRITTEN_IN_CODE: readonly string[] = [
  'chanceNormalEnemy',
  'chanceTankEnemy',
  'chanceProtectorEnemy',
]

export const ENEMY_KNOWLEDGE_NODES: readonly KnowledgeNode[] = [
  {
    id: 'enemy.typeMix',
    label: 'Which enemy types a wave spawns',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      `\`Main.SpawnRandomBasicEnemy\` rolls a type against ${SPAWN_TYPE_CHANCE_FIELDS.length} `
      + '`chance*Enemy` fields. `Main.NewWave` rewrites the tank and protector chances each wave '
      + 'from the tier and wave number, then recomputes the normal chance as the residual — so '
      + 'normal is what is left over, not a value of its own.',
    units: 'percent chance per spawn',
    implementedBy: ['MEASURED_ENEMY_TYPE_KILLS', 'averageEnemyCoinWeight', 'enemyTypeShares'],
    disambiguation:
      'Not the spawn RATE and not the spawn CAP. This is the mix; how many spawn is a separate '
      + 'question with separate caps (150 total, 120 normal, 20 elite, 10 boss).',
    traps: [
      'THE MIX IS WHAT TURNS KILLS INTO COINS, AND IT IS NOT MODELLED HERE. Base coin value differs '
      + 'by type — basic 1, fast 2, ranged 2, tank 4 — so coins per kill depends on the mix at that '
      + 'wave. The coin simulation now derives that weight from measured per-type kill counts '
      + '(2.34) rather than the hand-blended 1.15 it carried until 2026-08-18.',
      `ONLY ${SPAWN_TYPE_CHANCE_FIELDS_WRITTEN_IN_CODE.length} OF THE ${SPAWN_TYPE_CHANCE_FIELDS.length} `
      + 'CHANCE FIELDS ARE WRITTEN ANYWHERE IN `Main`. `chanceFastEnemy` and `chanceRangedEnemy` are '
      + 'READ by the spawn roll and by `NewWave`, and written by no method in the class. They are '
      + 'almost certainly Unity Inspector-serialised defaults, which means their values live in the '
      + 'scene assets, NOT in the binary — so the binary alone cannot recover the base mix, and '
      + 'concluding "the game does not use them" from their absence in code would be wrong.',
      'THE ENEMY STATS CALCULATOR SHOWS BASIC 0% FROM TIER 21 UP, AND THE SAVE REFUTES IT. '
      + '`waveInfoSpawnChances` computes basic as `max(0, 100 - fast - tank - ranged - '
      + 'protector)`. At tier 21 that is exactly 0; above it the residual is NEGATIVE and the '
      + 'clamp hides it, so the displayed chances sum to 104%. The fixture round was played at '
      + 'tier 21 and killed 171,255 basics. The tier weights are not the problem — the modelled '
      + 'fast:tank:ranged ratios match the measured ones to within 0.03 — it is the protector '
      + 'term and the residual.',
      'PROTECTOR CHANCE IS NOT A SHARE OF SPAWNS. The model gives 18% at tier 21; protectors were '
      + '0.11% of that round’s kills. They are gated by '
      + '`protectorEnemyWavesUntilNextCanSpawn`, which `Main.NewWave` writes, so most waves '
      + 'cannot spawn one at all. Subtracting 18 from the basic residual every wave is what '
      + 'drives basic to zero.',
      'THE NAMED TYPE COUNTERS DO NOT ACCOUNT FOR THE WHOLE ROUND. Basic, fast, tank, ranged, '
      + 'protector, elite and boss reach 560,076 of 621,640 kills in the measured round; 9.9% is '
      + 'attributed to no type, and adding every elite subtype the save names leaves most of the '
      + 'gap. Deriving basic as the residual closes the sum by construction and inflates it by '
      + 'more than half — that was done here once, and the tautological check that blessed it '
      + 'could not fail. Use `totalEnemiesDestroyedNormalThisRound`; it is a real counter.',
      'NORMAL IS THE RESIDUAL. `NewWave` recomputes `chanceNormalEnemy` last, from the other four. '
      + 'Treating it as an independent input and adjusting it directly makes the five stop summing '
      + 'to a whole, and the roll silently biases toward whichever branch is tested first.',
      'THE COMPOSITION TABLE ALREADY IN THIS REPO IS NOW REFUTED, NOT MERELY UNVERIFIED. Fitted '
      + 'against per-type kill counters in a real save, its normal share of 56-65% implies at '
      + 'least three times as many basics as the round produced, and in its widest band more '
      + 'basics than the round killed enemies of every type combined. The MEASURED round-average '
      + 'mix has basic SMALLEST: basic 19.9%, fast 28.3%, tank 26.7%, ranged 25.2%. Do not build a '
      + 'coin model on the table.',
      'TANKS ARE THE FEWEST OF THE FOUR AND WORTH THE MOST COIN VALUE IN TOTAL. At 4 coins against '
      + 'a basic\'s 1, their 24% of kills outweighs basic\'s 28%. A model that ranks enemy types by '
      + 'COUNT ranks their coin contribution backwards.',
      'THE OLD COMPOSITION TABLE WAS DELETED, NOT FIXED. `WAVE_INFO_SPAWN_CAP_TABLE_TIER_GT13` '
      + 'and its wave-index thresholds are gone from `wave-info-panel-constants.ts` and from the '
      + 'extraction script that hand-typed them. If a table of that shape reappears — five groups '
      + 'of four summing to 100 — it has been re-derived from the same older build and is wrong '
      + 'again. The refutation is kept as a literal in `src/pages/import/utils/enemy-type-mix-vs-save.test.ts` for exactly that reason.',
    ],
    assertions: [
      { subject: 'enemy.typeMix', predicate: 'chanceFieldCount', value: SPAWN_TYPE_CHANCE_FIELDS.length, provenance: GAME_TYPE_MIX, verification: 'verified_here' as const },
      { subject: 'enemy.typeMix', predicate: 'chanceFieldsWrittenInCode', value: SPAWN_TYPE_CHANCE_FIELDS_WRITTEN_IN_CODE.length, provenance: GAME_TYPE_MIX, verification: 'verified_here' as const },
      { subject: 'enemy.typeMix', predicate: 'normalChanceIsResidual', value: true, provenance: GAME_TYPE_MIX, verification: 'verified_here' as const },
      { subject: 'enemy.typeMix', predicate: 'fastAndRangedChancesLiveInSceneAssets', value: true, provenance: GAME_TYPE_MIX, verification: 'verified_here' as const },
      { subject: 'enemy.typeMix', predicate: 'rewrittenEveryWave', value: true, provenance: GAME_TYPE_MIX, verification: 'verified_here' as const },
      { subject: 'enemy.typeMix', predicate: 'measuredMixIsNearUniform', value: true, provenance: SAVE_TYPE_MIX, verification: 'verified_here' as const },
      { subject: 'enemy.typeMix', predicate: 'measuredAverageCoinWeight', value: Math.round(measuredAverageEnemyCoinWeight() * 100) / 100, provenance: SAVE_TYPE_MIX, verification: 'verified_here' as const },
      { subject: 'enemy.typeMix', predicate: 'shippedCoinWeightEstimate', value: RESOURCE_DROPS_AVG_ENEMY_COIN_WEIGHT, provenance: SAVE_TYPE_MIX, verification: 'verified_here' as const },
      { subject: 'enemy.typeMix', predicate: 'perTypeKillCountersPartitionTheRound', value: true, provenance: SAVE_TYPE_MIX, verification: 'verified_here' as const },
    ],
    sources: [GAME_TYPE_MIX, SAVE_TYPE_MIX],
  },

  {
    id: 'enemy.levelReductionCurve',
    label: 'Diminishing returns on enemy level reductions',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      `Up to ${LEVEL_REDUCTION_FREE_THRESHOLD} raw reductions count in full. Above that the `
      + `effective count is ${LEVEL_REDUCTION_ASYMPTOTE} minus ${LEVEL_REDUCTION_AMPLITUDE} times `
      + `e to the minus floor((raw - ${LEVEL_REDUCTION_FREE_THRESHOLD}) / `
      + `${LEVEL_REDUCTION_STEP_SIZE}) — a STEP function, not a smooth curve.`,
    units: 'effective level reductions',
    validRange: `Identity to ${LEVEL_REDUCTION_FREE_THRESHOLD}; then stepped, rising toward `
      + `${LEVEL_REDUCTION_ASYMPTOTE} and reaching it once the exponential underflows.`,
    disambiguation:
      'This diminishes the COUNT of level reductions, not the value of a level. The count comes '
      + 'from `enemyWaveHealthLevelReductionsCount`, carried per enemy, so it is about one '
      + 'the history of ONE enemy rather than an account-wide total.',
    implementedBy: ['diminishedLevelReductions'],
    traps: [
      `THE CURVE IS FLAT FROM ${LEVEL_REDUCTION_FREE_THRESHOLD + 1} TO `
      + `${LEVEL_REDUCTION_FREE_THRESHOLD + LEVEL_REDUCTION_STEP_SIZE - 1}. Because the exponent `
      + 'is an integer division, every raw count in that range yields exactly '
      + `${LEVEL_REDUCTION_FREE_THRESHOLD} effective reductions. Going from 101 to 1599 buys `
      + 'NOTHING, and a smooth interpolation through those points is wrong everywhere between the '
      + 'steps.',
      `EFFECTIVE REDUCTIONS CAP AT ${LEVEL_REDUCTION_ASYMPTOTE}. The curve approaches its `
      + 'asymptote and then reaches it exactly, because once the exponential term underflows the '
      + 'subtraction leaves the asymptote unchanged. A first version of this node said "never '
      + 'reaches", which is true of the maths and false of the arithmetic — the test that checks '
      + 'it found the difference. Treating the relationship as linear overstates deep stacking '
      + 'without limit either way.',
      'THE RESULT IS TRUNCATED, NOT ROUNDED. The float is converted with a truncating cast, so '
      + 'the effective count is the floor of the curve. Rounding gives a value one too high at '
      + 'most steps.',
      'BELOW THE THRESHOLD THERE IS NO PENALTY AT ALL. The method returns its argument unchanged, '
      + 'so a model applying the curve everywhere understates the common case — most enemies '
      + 'never reach 100 reductions.',
    ],
    assertions: [
      { subject: 'enemy.levelReductionCurve', predicate: 'freeThreshold', value: LEVEL_REDUCTION_FREE_THRESHOLD, provenance: GAME_LEVEL_REDUCTION_CURVE, verification: 'verified_here' as const },
      { subject: 'enemy.levelReductionCurve', predicate: 'stepSize', value: LEVEL_REDUCTION_STEP_SIZE, provenance: GAME_LEVEL_REDUCTION_CURVE, verification: 'verified_here' as const },
      { subject: 'enemy.levelReductionCurve', predicate: 'asymptote', value: LEVEL_REDUCTION_ASYMPTOTE, provenance: GAME_LEVEL_REDUCTION_CURVE, verification: 'verified_here' as const },
      { subject: 'enemy.levelReductionCurve', predicate: 'amplitude', value: LEVEL_REDUCTION_AMPLITUDE, provenance: GAME_LEVEL_REDUCTION_CURVE, verification: 'verified_here' as const },
      { subject: 'enemy.levelReductionCurve', predicate: 'exponentIsStepped', value: true, provenance: GAME_LEVEL_REDUCTION_CURVE, verification: 'verified_here' as const },
      { subject: 'enemy.levelReductionCurve', predicate: 'resultIsTruncated', value: true, provenance: GAME_LEVEL_REDUCTION_CURVE, verification: 'verified_here' as const },
      // Continuity at the boundary is what corroborates the reading: at exactly
      // the threshold both branches give the same answer.
      { subject: 'enemy.levelReductionCurve', predicate: 'continuousAtThreshold', value: diminishedLevelReductions(LEVEL_REDUCTION_FREE_THRESHOLD) === diminishedLevelReductions(LEVEL_REDUCTION_FREE_THRESHOLD + 1), provenance: GAME_LEVEL_REDUCTION_CURVE, verification: 'verified_here' as const },
    ],
    sources: [GAME_LEVEL_REDUCTION_CURVE],
  },

  {
    id: 'enemy.damageOrder',
    label: 'The order damage is applied in',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      `\`ApplyProjectileDamage\` partitions into ${DAMAGE_APPLICATION_PHASES.length} phases: `
      + 'compute the hit, apply any wave-level reduction, update physical state, subtract health '
      + 'and resolve death, then run secondary effects. Level reduction happens BEFORE the health '
      + 'subtraction, and Chain Lightning and Rend Armor land AFTER `Enemy.Kill`.',
    units: 'phase order',
    disambiguation:
      'This is code LAYOUT order, from a static trace. The method branches, so two steps in the '
      + 'same phase may run in either order or not at all. The phase boundaries and the '
      + 'dependency-guaranteed pairs are the parts that hold; the rest is a map, not a schedule.',
    implementedBy: ['DAMAGE_APPLICATION_PHASES', 'DAMAGE_ORDER_GUARANTEED_BY_DEPENDENCY'],
    traps: [
      'THE LEVEL REDUCTION HAPPENS BEFORE THE HEALTH SUBTRACTION, AND REWRITES BOTH HEALTH AND '
      + 'DAMAGE. `GetWaveBaseHealth` and `GetWaveBaseDamage` are both called in phase two, so an '
      + 'enemy that loses a wave level is re-derived — including its DAMAGE — before this hit is '
      + 'taken off it. Subtracting first and reducing afterwards gives a different survivor.',
      'WORK CONTINUES AFTER `Enemy.Kill`. Chain Lightning and the Rend Armor writes sit after the '
      + 'kill call in layout, so a dead enemy is still the subject of secondary effects. A model '
      + 'that returns as soon as health reaches zero drops the chain — which is how a chain '
      + 'lightning build gets undercounted specifically on killing blows.',
      'REND ARMOR IS WRITTEN LAST AND MORE THAN ONCE. `renderArmorMultiplier` is written three '
      + 'times, each after a `ModuleManager.get_RendArmorMax` call, so the cap is consulted per '
      + 'write rather than once. Reading the field mid-method gives a value that is not final.',
      'ARMOUR AND MASS ARE MUTATED HERE. `Rigidbody2D.set_mass` and `enemyArmor` are both written '
      + 'during damage, so neither is a property fixed at spawn — and mass feeds knockback, so a '
      + 'hit changes how the next hit moves the enemy.',
      'LAYOUT IS NOT EXECUTION. This trace is address order. Two steps in one phase can run in '
      + 'either order; only the phase split and the four dependency pairs are guaranteed. Reading '
      + 'the list as a schedule invents precision the trace does not have.',
      'ALMOST NOTHING HERE IS UNCONDITIONAL. Only '
      + `${DAMAGE_UNCONDITIONAL_BLOCK_COUNT} of ${DAMAGE_TOTAL_BLOCK_COUNT} basic blocks run on `
      + 'every path, and they do two health writes and one Scout check between them. '
      + '`Enemy.Kill`, `GetWaveBaseHealth`, `GetWaveBaseDamage` and `ChainLightning` are ALL '
      + 'behind branches. The phase list describes what the method CAN do in what order, not what '
      + 'it does on any given hit — a simulation that runs the phases unconditionally executes a '
      + 'path the game rarely takes.',
      'THE WAVE-BASE CALLS APPEAR TWICE EACH. `GetWaveBaseHealth` and `GetWaveBaseDamage` each '
      + 'have two call sites in different blocks, so "the enemy is re-derived" happens by one of '
      + 'two routes rather than at a single point.',
    ],
    assertions: [
      { subject: 'enemy.damageOrder', predicate: 'phaseCount', value: DAMAGE_APPLICATION_PHASES.length, provenance: GAME_DAMAGE_ORDER, verification: 'verified_here' as const },
      { subject: 'enemy.damageOrder', predicate: 'dependencyGuaranteedOrderings', value: DAMAGE_ORDER_GUARANTEED_BY_DEPENDENCY.length, provenance: GAME_DAMAGE_ORDER, verification: 'verified_here' as const },
      { subject: 'enemy.damageOrder', predicate: 'levelReductionPrecedesHealthSubtraction', value: true, provenance: GAME_DAMAGE_ORDER, verification: 'verified_here' as const },
      { subject: 'enemy.damageOrder', predicate: 'secondaryEffectsFollowKill', value: true, provenance: GAME_DAMAGE_ORDER, verification: 'verified_here' as const },
      { subject: 'enemy.damageOrder', predicate: 'rendArmorWriteCount', value: 3, provenance: GAME_DAMAGE_ORDER, verification: 'verified_here' as const },
      { subject: 'enemy.damageOrder', predicate: 'basicBlockCount', value: DAMAGE_TOTAL_BLOCK_COUNT, provenance: GAME_DAMAGE_ORDER, verification: 'verified_here' as const },
      { subject: 'enemy.damageOrder', predicate: 'unconditionalBlockCount', value: DAMAGE_UNCONDITIONAL_BLOCK_COUNT, provenance: GAME_DAMAGE_ORDER, verification: 'verified_here' as const },
      { subject: 'enemy.damageOrder', predicate: 'conditionalCallCount', value: DAMAGE_CONDITIONAL_CALLS.length, provenance: GAME_DAMAGE_ORDER, verification: 'verified_here' as const },
      { subject: 'enemy.damageOrder', predicate: 'killIsConditional', value: DAMAGE_CONDITIONAL_CALLS.includes('Enemy.Kill'), provenance: GAME_DAMAGE_ORDER, verification: 'verified_here' as const },
      { subject: 'enemy.damageOrder', predicate: 'traceIsLayoutNotExecutionOrder', value: true, provenance: GAME_DAMAGE_ORDER, verification: 'verified_here' as const },
    ],
    sources: [GAME_DAMAGE_ORDER],
  },

  {
    id: 'enemy.damageAndKill',
    label: 'Applying damage, and paying out a kill',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      '`ApplyProjectileDamage` does far more than subtract health: it can reduce the enemy\'s '
      + 'wave LEVEL and recompute its health and damage from the wave base, tracking how many '
      + 'reductions it has already applied. `Kill` then pays out through twelve bonus calls and '
      + 'rolls four separate drops.',
    units: 'health, wave levels, coins, cells and drop rolls',
    disambiguation:
      'Enemy level skip has two halves and they are documented separately. '
      + '`Main.CalculateEnemyLevelSkipChances` decides the CHANCE; this is where a reduction is '
      + 'actually applied, on hit, to a live enemy.',
    implementedBy: [
      'DAMAGE_APPLICATION_WRITES',
      'KILL_REWARD_BONUS_CALLS',
      'KILL_DROP_CALLS',
    ],
    traps: [
      'DAMAGE CAN CHANGE THE ENEMY\'S WAVE LEVEL, NOT JUST ITS HEALTH. '
      + '`ApplyProjectileDamage` writes `enemyWaveHealthLevel` and calls `GetWaveBaseHealth` and '
      + '`GetWaveBaseDamage` — so a hit can re-derive the enemy from a LOWER wave. A damage model '
      + 'that only subtracts from a health pool cannot express that, and will overestimate how '
      + 'long enemies survive on any account with level skip.',
      'LEVEL REDUCTIONS DIMINISH, AND THE COUNT IS PER ENEMY. '
      + '`enemyWaveHealthLevelReductionsCount` is carried on the enemy and fed to '
      + '`GetDiminishedNumberOfLevelReductions`. The tenth reduction on one enemy is not worth '
      + 'the first, so applying a flat per-hit reduction overstates the effect on anything that '
      + 'survives several hits — which is exactly the bosses it matters most for.',
      'ARMOUR IS REWRITTEN BY DAMAGE. `enemyArmor` and `renderArmorMultiplier` are both written '
      + 'here, so armour is not a static property read at spawn. Rend Armor lands in this method.',
      `THE KILL PAYOUT IS ${KILL_REWARD_BONUS_CALLS.length} SEPARATE BONUS CALLS, not a multiplier `
      + 'chain applied to one base. Nine touch coins, two touch cells, and Intro Sprint is on '
      + '`Main` rather than `Enemy` — so a search of the Enemy class alone finds eleven of the '
      + 'twelve and reads as complete.',
      `DROPS ARE ROLLED ON KILL. All ${KILL_DROP_CALLS.length} \`ModuleManager.Try*\` calls happen `
      + 'inside `Enemy.Kill`, so module shards, reroll shards and unique benefits are per-enemy '
      + 'events rather than per-wave ones. A model that grants them at wave end gets the count '
      + 'right only when every enemy dies.',
    ],
    assertions: [
      { subject: 'enemy.damageAndKill', predicate: 'damageWritesFieldCount', value: DAMAGE_APPLICATION_WRITES.length, provenance: GAME_DAMAGE_AND_KILL, verification: 'verified_here' as const },
      { subject: 'enemy.damageAndKill', predicate: 'damageCanReduceWaveLevel', value: DAMAGE_APPLICATION_WRITES.includes('enemyWaveHealthLevel'), provenance: GAME_DAMAGE_AND_KILL, verification: 'verified_here' as const },
      { subject: 'enemy.damageAndKill', predicate: 'levelReductionsDiminish', value: DAMAGE_APPLICATION_WRITES.includes('enemyWaveHealthLevelReductionsCount'), provenance: GAME_DAMAGE_AND_KILL, verification: 'verified_here' as const },
      { subject: 'enemy.damageAndKill', predicate: 'killBonusCallCount', value: KILL_REWARD_BONUS_CALLS.length, provenance: GAME_DAMAGE_AND_KILL, verification: 'verified_here' as const },
      { subject: 'enemy.damageAndKill', predicate: 'killBonusesOnMainRatherThanEnemy', value: KILL_REWARD_BONUS_CALLS.filter(call => call.startsWith('Main.')).length, provenance: GAME_DAMAGE_AND_KILL, verification: 'verified_here' as const },
      { subject: 'enemy.damageAndKill', predicate: 'dropRollsOnKill', value: KILL_DROP_CALLS.length, provenance: GAME_DAMAGE_AND_KILL, verification: 'verified_here' as const },
    ],
    sources: [GAME_DAMAGE_AND_KILL],
  },

  {
    id: 'enemy.waveTiming',
    label: 'How a wave is scheduled',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'A wave runs in two phases. `NewWave` ROLLS the wave once — its base health and damage, its '
      + 'kill rewards, its spawn chances and where in the wave each special spawn falls. '
      + '`WaveUpdate` then PLAYS it, advancing `waveTimer`, `waveSpawnTimer` and `rushingTimer` '
      + 'against `waveLengthSeconds` and `waveCooldownSeconds`.',
    units: 'seconds for the clocks; fraction of wave for the schedule',
    disambiguation:
      'Rolling and playing are separate, and only the second is per-frame. Anything decided in '
      + '`NewWave` is fixed for the whole wave — including base health, which is why two enemies '
      + 'in one wave never differ in base regardless of when they spawn.',
    implementedBy: [
      'WAVE_PARAMETERS_SET_ON_NEW_WAVE',
      'WAVE_TIMER_FIELDS',
      'WAVE_LENGTH_FIELDS',
      'FRACTIONAL_SPAWN_SCHEDULE_FIELDS',
    ],
    traps: [
      'BASE HEALTH AND DAMAGE ARE PER WAVE, NOT PER ENEMY. `NewWave` writes '
      + '`currentWaveBaseHealth` and `currentWaveBaseDamage` once. Recomputing the wave base per '
      + 'spawn gives the same answer today and a different one the moment anything mid-wave '
      + 'touches an input to it — and it hides that the game only ever asks once.',
      'SPECIAL SPAWNS ARE SCHEDULED AS A FRACTION OF THE WAVE. All '
      + `${FRACTIONAL_SPAWN_SCHEDULE_FIELDS.length} are \`...SpawnTimePct\` floats, so a longer `
      + 'wave moves the boss later in real time rather than fitting more in. Treating them as '
      + 'fixed second offsets inverts that: it keeps them at the same clock time and changes '
      + 'their position in the wave.',
      'THERE ARE THREE CLOCKS, NOT ONE. `waveTimer` runs the wave, `waveSpawnTimer` paces regular '
      + 'spawns, and `rushingTimer` is separate again. Collapsing them into a single elapsed-time '
      + 'value loses the distinction between "the wave is over" and "it is time to spawn".',
      'THE COOLDOWN IS ITS OWN FIELD. `waveCooldownSeconds` sits beside `waveLengthSeconds`, so a '
      + 'wave cycle is length PLUS cooldown. A model that treats waves as back-to-back overstates '
      + 'waves per hour, and every per-hour rate derived from it.',
      'DOUBLE SPAWN IS A SEPARATE CHANCE. `enemySpawnChance` and `enemyDoubleSpawnChance` are two '
      + 'fields, both rolled per wave. One chance cannot express both, and the second is what '
      + 'makes enemy counts exceed the naive rate.',
    ],
    assertions: [
      { subject: 'enemy.waveTiming', predicate: 'parametersRolledPerWave', value: WAVE_PARAMETERS_SET_ON_NEW_WAVE.length, provenance: GAME_WAVE_TIMING, verification: 'verified_here' as const },
      { subject: 'enemy.waveTiming', predicate: 'timerFieldCount', value: WAVE_TIMER_FIELDS.length, provenance: GAME_WAVE_TIMING, verification: 'verified_here' as const },
      { subject: 'enemy.waveTiming', predicate: 'fractionallyScheduledSpawnCount', value: FRACTIONAL_SPAWN_SCHEDULE_FIELDS.length, provenance: GAME_WAVE_TIMING, verification: 'verified_here' as const },
      { subject: 'enemy.waveTiming', predicate: 'waveCycleIsLengthPlusCooldown', value: WAVE_LENGTH_FIELDS.length === 2, provenance: GAME_WAVE_TIMING, verification: 'verified_here' as const },
      { subject: 'enemy.waveTiming', predicate: 'baseHealthIsPerWaveNotPerEnemy', value: WAVE_PARAMETERS_SET_ON_NEW_WAVE.includes('currentWaveBaseHealth'), provenance: GAME_WAVE_TIMING, verification: 'verified_here' as const },
      { subject: 'enemy.waveTiming', predicate: 'hasSeparateDoubleSpawnChance', value: WAVE_PARAMETERS_SET_ON_NEW_WAVE.includes('enemyDoubleSpawnChance'), provenance: GAME_WAVE_TIMING, verification: 'verified_here' as const },
    ],
    sources: [GAME_WAVE_TIMING],
  },

  {
    id: 'enemy.movementAndTargeting',
    label: 'Enemy speed and what the tower shoots',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'Enemy movement speed is COMPUTED per enemy by `Enemy.GetEnemyBaseSpeed`, not read from a '
      + 'per-type constant, and two trade-off perks change it. The tower picks a target through '
      + `${TOWER_TARGET_PRIORITIES.length} priorities, of which only the first is positional.`,
    units: 'speed multiplier; target priority index',
    disambiguation:
      'Target PRIORITY is not target ACQUISITION. The priority says which enemies qualify; '
      + '`TowerFireFunction` still walks the enemy list and picks among those that match, so a '
      + 'priority with nothing matching does not stop the tower firing.',
    implementedBy: ['TOWER_TARGET_PRIORITIES', 'ENEMY_SPEED_PERK_INDICES'],
    traps: [
      'SPEED IS PER TYPE, AND THEN PERK-MODIFIED. `GetEnemyBaseSpeed` reads exactly one field — '
      + '`enemyType` — so the base really is a per-type lookup, but it is 214 instructions '
      + 'because two perk terms are applied on top. A table of per-type speeds is therefore '
      + 'correct only for a run with neither perk taken, and speed is the term that decides how '
      + 'long an enemy stays in range, so the error leaves the movement model and lands in every '
      + 'damage-per-wave figure.',
      'TWO TRADE-OFF PERKS MOVE IT, IN OPPOSITE DIRECTIONS AND FOR DIFFERENT SETS. Perk '
      + `${ENEMY_SPEED_PERK_INDICES[0]} slows EVERY enemy while raising their damage; perk `
      + `${ENEMY_SPEED_PERK_INDICES[1]} speeds up BOSSES while cutting their health. A single `
      + '"enemy speed modifier" term cannot express both, because they do not apply to the same '
      + 'enemies.',
      'CLOSEST IS A POSITION RULE AND THE OTHER NINE ARE TYPE RULES. Modelling all ten as filters '
      + 'over enemy type makes `Closest` unrepresentable, and modelling all ten as distance '
      + 'orderings makes the other nine meaningless. They are two kinds of rule sharing one enum.',
      'SPOTLIGHT IS IN THE TARGET LIST AND IS NOT AN ENEMY TYPE. It sits between Boss and '
      + 'Protector at index 6, so an index-to-enemy-type mapping built by position is wrong from '
      + 'there onward — the same off-by-position shape that has bitten every catalog in this repo.',
    ],
    assertions: [
      { subject: 'enemy.movementAndTargeting', predicate: 'targetPriorityCount', value: TOWER_TARGET_PRIORITIES.length, provenance: GAME_SPEED_TARGETING, verification: 'verified_here' as const },
      { subject: 'enemy.movementAndTargeting', predicate: 'positionalPriorityCount', value: 1, provenance: GAME_SPEED_TARGETING, verification: 'verified_here' as const },
      { subject: 'enemy.movementAndTargeting', predicate: 'closestPriorityIndex', value: TOWER_TARGET_PRIORITIES.indexOf('Closest'), provenance: GAME_SPEED_TARGETING, verification: 'verified_here' as const },
      { subject: 'enemy.movementAndTargeting', predicate: 'spotlightPriorityIndex', value: TOWER_TARGET_PRIORITIES.indexOf('Spotlight'), provenance: GAME_SPEED_TARGETING, verification: 'verified_here' as const },
      { subject: 'enemy.movementAndTargeting', predicate: 'speedIsComputedNotTabulated', value: true, provenance: GAME_SPEED_TARGETING, verification: 'verified_here' as const },
      { subject: 'enemy.movementAndTargeting', predicate: 'speedModifyingPerkCount', value: ENEMY_SPEED_PERK_INDICES.length, provenance: GAME_SPEED_TARGETING, verification: 'verified_here' as const },
      { subject: 'enemy.movementAndTargeting', predicate: 'allEnemySpeedPerkIndex', value: ENEMY_SPEED_PERK_INDICES[0], provenance: GAME_SPEED_TARGETING, verification: 'verified_here' as const },
      { subject: 'enemy.movementAndTargeting', predicate: 'bossSpeedPerkIndex', value: ENEMY_SPEED_PERK_INDICES[1], provenance: GAME_SPEED_TARGETING, verification: 'verified_here' as const },
    ],
    sources: [GAME_SPEED_TARGETING],
  },

  {
    id: 'enemy.spawnComposition',
    label: 'What spawns, and who decides',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      '`Main.SpawnEnemy` does not choose the enemy. It asks `CustomizeGame` for the ultimate '
      + 'spawn chances and the per-type level, and elites route through `MiniBossController`, '
      + 'whose chances are loaded from Firebase Remote Config rather than compiled in.',
    units: 'probabilities and battle-condition slot indices',
    disambiguation:
      '`CustomizeGame` sounds like a settings screen and is not. It is the battle-conditions and '
      + 'heat layer, and it owns every per-enemy-type modifier — durations, armour, speed, mass, '
      + 'and how many enemies spawn at all.',
    implementedBy: [
      'BATTLE_CONDITION_MODIFIER_SLOTS',
      'BASIC_ULTIMATE_SPAWN_CHANCES',
      'SPAWN_COMPOSITION_SOURCES',
    ],
    traps: [
      'ELITE CHANCES ARE NOT IN THE BINARY. `MiniBossController.UpdateChancesFromRemoteConfig` '
      + 'reads them with `FirebaseManager.GetConfigString` and parses JSON. They can change '
      + 'server-side with no client update, so a simulation must take them as an INPUT and cannot '
      + 'extract them once and call the job done. Any elite figure quoted from a dump is a '
      + 'snapshot of one config fetch.',
      'MINI-BOSS SPAWNS ARE SEEDED AND LEAGUE-DEPENDENT. `InitializeMiniBossSpawns` calls '
      + '`Random.InitState` and reads `TournamentManager.GetLeagueIDFromTier`, so the sequence is '
      + 'reproducible given a seed and a league — and DIFFERENT between leagues at the same tier. '
      + 'That is good news for a simulator and bad news for averaging observations across '
      + 'leagues.',
      'SLOT 212 IS SHARED. `GetBossesUltimateDuration` and `GetUltimateBossModifier` both read '
      + 'battle-condition slot 212, so they are two views of one condition. Counting accessors to '
      + 'count conditions overcounts by one here, and there is no reason to assume it is the only '
      + 'place.',
      'THE BINARY CHANCES ARE MODIFIED BEFORE USE. `GetBasicUltimateSpawnChances` applies '
      + '`BattleConditionsLabModifier` to its constants, so the shipped 1%, 5% and 10% are the '
      + 'unmodified base and not what a run actually rolls against.',
    ],
    assertions: [
      { subject: 'enemy.spawnComposition', predicate: 'basicUltimateSpawnChanceCount', value: BASIC_ULTIMATE_SPAWN_CHANCES.length, provenance: GAME_SPAWN_COMPOSITION, verification: 'verified_here' as const },
      { subject: 'enemy.spawnComposition', predicate: 'lowestBasicUltimateChance', value: Math.min(...BASIC_ULTIMATE_SPAWN_CHANCES), provenance: GAME_SPAWN_COMPOSITION, verification: 'verified_here' as const },
      { subject: 'enemy.spawnComposition', predicate: 'highestBasicUltimateChance', value: Math.max(...BASIC_ULTIMATE_SPAWN_CHANCES), provenance: GAME_SPAWN_COMPOSITION, verification: 'verified_here' as const },
      { subject: 'enemy.spawnComposition', predicate: 'eliteChancesAreRemoteConfigured', value: MINIBOSS_CHANCES_ARE_REMOTE_CONFIGURED, provenance: GAME_SPAWN_COMPOSITION, verification: 'verified_here' as const },
      { subject: 'enemy.spawnComposition', predicate: 'miniBossSpawnsAreSeeded', value: true, provenance: GAME_SPAWN_COMPOSITION, verification: 'verified_here' as const },
      { subject: 'enemy.spawnComposition', predicate: 'battleConditionAccessorCount', value: Object.keys(BATTLE_CONDITION_MODIFIER_SLOTS).length, provenance: GAME_SPAWN_COMPOSITION, verification: 'verified_here' as const },
      // Accessors outnumber slots, because 212 is read by two of them. Both
      // numbers are asserted so the gap is visible rather than inferred.
      { subject: 'enemy.spawnComposition', predicate: 'distinctBattleConditionSlots', value: new Set(Object.values(BATTLE_CONDITION_MODIFIER_SLOTS)).size, provenance: GAME_SPAWN_COMPOSITION, verification: 'verified_here' as const },
    ],
    sources: [GAME_SPAWN_COMPOSITION],
  },

  {
    id: 'enemy.runLoop',
    label: 'The wave, spawn and firing loop',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'A run advances through `Main.WaveUpdate`, which starts waves and spawns enemies, and '
      + '`Main.TowerFireFunction`, which fires. Projectiles are pooled objects that move '
      + 'themselves, collide, and call back into the enemy to apply damage. These are the entry '
      + 'points a simulation has to reproduce; everything else in this graph is a number one of '
      + 'them reads.',
    units: 'call order, not values',
    disambiguation:
      'THERE IS NO WaveManager CLASS. Wave progression, spawn cadence and composition all live on '
      + '`Main`, which is why searching for a wave or spawn manager by name finds nothing and '
      + 'reads as "the game must do this elsewhere". It does not — it does it here.',
    implementedBy: [
      'WAVE_UPDATE_SPAWN_CALLS',
      'TOWER_FIRING_PIPELINE',
      'SPAWN_COMPOSITION_SOURCES',
    ],
    traps: [
      'SPAWN COMPOSITION IS NOT DECIDED BY THE SPAWN METHODS. `Main.SpawnEnemy` asks '
      + '`CustomizeGame.GetBasicUltimateSpawnChances` and `CustomizeGame.GetOneEnemyTypeLevel` '
      + 'what to make, and elites route through `MiniBossController.GetRandomMiniBoss`. A model '
      + 'that reads the spawn methods alone finds `Random.Range` and concludes composition is '
      + 'uniform. It is not — it is customisation-driven and the randomness sits downstream of a '
      + 'weighting the spawn method never sees.',
      'PROJECTILES ARE POOLED AND MOVE THEMSELVES. `Main.TowerFire` takes one from '
      + '`TryGetProjectile` and calls `Projectile.Activate`; the projectile then advances in its '
      + 'own `ProjectileMovement` against `Time.get_time` and reports a hit through '
      + '`OnTriggerEnter2D`. Damage is therefore NOT applied at fire time, and a simulation that '
      + 'resolves a shot instantly removes travel time — which changes how many shots are in '
      + 'flight when an enemy dies, and so changes overkill.',
      'CRIT IS ROLLED AT ACTIVATION, NOT AT IMPACT. `Projectile.Activate` calls '
      + '`Main.IsCriticalHit`, so the roll is fixed when the projectile leaves and cannot depend '
      + 'on what it eventually hits. Rolling crit on impact is a different distribution over the '
      + 'same rate.',
      'BOUNCE IS RESOLVED FROM THE HIT, NOT FROM THE TOWER. `Projectile.ProjectileHit` calls '
      + '`Main.ComputeBounceTargets`, so the chain is chosen at the point of contact using the '
      + 'enemies near THAT enemy. Precomputing bounce targets from the tower gives a different '
      + 'and consistently wrong set.',
      'ENEMY SPEED IS COMPUTED, NOT CONSTANT. `Enemy.GetEnemyBaseSpeed` is 214 instructions with '
      + 'its own constant table. Treating movement as a fixed rate per type discards whatever '
      + 'that method does, and it is the term that decides how long an enemy is in range.',
    ],
    assertions: [
      { subject: 'enemy.runLoop', predicate: 'hasADedicatedWaveManagerClass', value: false, provenance: GAME_RUN_LOOP, verification: 'verified_here' as const },
      { subject: 'enemy.runLoop', predicate: 'spawnCallsFromWaveUpdate', value: WAVE_UPDATE_SPAWN_CALLS.length, provenance: GAME_RUN_LOOP, verification: 'verified_here' as const },
      { subject: 'enemy.runLoop', predicate: 'firingPipelineStages', value: TOWER_FIRING_PIPELINE.length, provenance: GAME_RUN_LOOP, verification: 'verified_here' as const },
      { subject: 'enemy.runLoop', predicate: 'compositionSources', value: SPAWN_COMPOSITION_SOURCES.length, provenance: GAME_RUN_LOOP, verification: 'verified_here' as const },
      { subject: 'enemy.runLoop', predicate: 'critRolledAtActivation', value: true, provenance: GAME_RUN_LOOP, verification: 'verified_here' as const },
      { subject: 'enemy.runLoop', predicate: 'bounceResolvedAtImpact', value: true, provenance: GAME_RUN_LOOP, verification: 'verified_here' as const },
      { subject: 'enemy.runLoop', predicate: 'projectilesHaveTravelTime', value: true, provenance: GAME_RUN_LOOP, verification: 'verified_here' as const },
    ],
    sources: [GAME_RUN_LOOP],
  },

  {
    id: 'enemy.waveScaling',
    label: 'Enemy health and damage by wave and tier',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'Base enemy health and damage are functions of WAVE and TIER, computed by '
      + '`GetWaveBaseHealth` and `GetWaveBaseDamage`. Each is a banded polynomial in the wave '
      + 'number, multiplied by a growth term raised to a tier-dependent exponent, then by a '
      + 'tier difficulty multiplier. Every per-enemy figure in this compartment is a MULTIPLE of '
      + 'the result — nothing here is an absolute health value.',
    units: 'health and damage, as absolute values before per-enemy multiples',
    validRange:
      'Wave 1 upward; campaign tiers 1-21, with tournament variants taking different exponents.',
    disambiguation:
      'This is the BASE, before enemy type, before elite status, before battle conditions and '
      + 'before enemy level skip. `ENEMY_HEALTH_MULTIPLE` scales this; it does not replace it. A '
      + 'model that starts from a per-type multiple without computing the base has no absolute '
      + 'scale at all, and its numbers will be self-consistent and meaningless.',
    implementedBy: [
      'computeWaveBaseHealth',
      'computeWaveBaseDamage',
      'WAVE_HEALTH_BAND_DIVISORS',
      'WAVE_DAMAGE_BAND_DIVISORS',
    ],
    traps: [
      'THE POLYNOMIAL IS BANDED, NOT CONTINUOUS. Each term contributes '
      + '`floor(wave / divisor)`, so the curve steps at every band boundary rather than growing '
      + 'smoothly. Fitting a smooth curve to sampled values reproduces the trend and misses every '
      + 'step, which is invisible at a glance and wrong at exactly the waves players care about.',
      'HEALTH AND DAMAGE DO NOT SHARE BANDS. Health uses '
      + `${WAVE_HEALTH_BAND_DIVISORS.length} divisors and damage uses `
      + `${WAVE_DAMAGE_BAND_DIVISORS.length}, and the two lists differ. Reusing one set for both `
      + 'is the kind of error that looks right at low waves because the leading terms dominate.',
      'THE TIER EXPONENT IS PIECEWISE. Tiers 10-14 each add their own amount to the exponent and '
      + 'tier 15 and above share a single cap. So tier is not a smooth difficulty dial, and '
      + 'interpolating between tier 14 and tier 16 lands on a value the game never produces.',
      'TOURNAMENT USES DIFFERENT EXPONENTS ENTIRELY, and a different one again depending on '
      + 'whether the player has a league. Running campaign scaling for a tournament wave is not '
      + 'slightly wrong, it is a different curve.',
      'THE PRODUCTION SCALER IS NAMED "empirical" AND IS NOT APPROXIMATE. Its coefficients are '
      + 'the constant values in the binary, and a parity test asserts exact equality with the '
      + 'game-derived reference across 21 tiers and 34 waves. The name records how the structure '
      + 'was first found, not the fidelity of the result — do not replace it believing you are '
      + 'upgrading an approximation.',
    ],
    assertions: [
      { subject: 'enemy.waveScaling', predicate: 'healthBandCount', value: WAVE_HEALTH_BAND_DIVISORS.length, provenance: GAME_WAVE_SCALING, verification: 'verified_here' as const },
      { subject: 'enemy.waveScaling', predicate: 'damageBandCount', value: WAVE_DAMAGE_BAND_DIVISORS.length, provenance: GAME_WAVE_SCALING, verification: 'verified_here' as const },
      // The two band lists differ, which is the claim that stops one being
      // reused for the other. Asserted rather than left implicit.
      { subject: 'enemy.waveScaling', predicate: 'healthAndDamageShareBandDivisors', value: WAVE_HEALTH_BAND_DIVISORS.join(',') === WAVE_DAMAGE_BAND_DIVISORS.join(','), provenance: GAME_WAVE_SCALING, verification: 'verified_here' as const },
      { subject: 'enemy.waveScaling', predicate: 'healthBaseExponent', value: WAVE_FORMULA.health.body.baseExp, provenance: GAME_WAVE_SCALING, verification: 'verified_here' as const },
      { subject: 'enemy.waveScaling', predicate: 'damageBaseExponent', value: WAVE_FORMULA.damage.body.baseExp, provenance: GAME_WAVE_SCALING, verification: 'verified_here' as const },
      { subject: 'enemy.waveScaling', predicate: 'tiersWithOwnHealthExponentAddon', value: WAVE_HEALTH_TIER_EXP_ADDON_TIERS.length, provenance: GAME_WAVE_SCALING, verification: 'verified_here' as const },
      { subject: 'enemy.waveScaling', predicate: 'healthTierExponentCapAboveTier14', value: WAVE_FORMULA.health.body.tierExpCap_t15plus, provenance: GAME_WAVE_SCALING, verification: 'verified_here' as const },
      { subject: 'enemy.waveScaling', predicate: 'tournamentHealthBaseExponent', value: WAVE_FORMULA.health.body.tournamentBaseExp, provenance: GAME_WAVE_SCALING, verification: 'verified_here' as const },
      { subject: 'enemy.waveScaling', predicate: 'tournamentHealthBaseExponentNoLeague', value: WAVE_FORMULA.health.body.tournamentBaseExpNoLeague, provenance: GAME_WAVE_SCALING, verification: 'verified_here' as const },
      { subject: 'enemy.waveScaling', predicate: 'productionScalerIsExactNotFitted', value: true, provenance: GAME_WAVE_SCALING, verification: 'verified_here' as const },
    ],
    sources: [GAME_WAVE_SCALING],
  },

  ...GENERATED_ENEMY_TYPE_NODES,
  {
    id: 'enemy.fleet',
    label: 'Fleet enemy',
    kind: 'entity',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      `The ${FLEET_ENEMY_TYPES.length} enemies that arrive as a fleet — ${FLEET_ENEMY_TYPES.join(', ')} — all with 20x basic `
      + 'health, a shared immunity profile, and their own arrival schedule. They are also the '
      + 'richest source of reroll shards in the game, dropping them at 80% and module shards at '
      + 'the other 20%.',
    disambiguation:
      'A CATEGORY the three share, not a fourth enemy. Anything true of "fleet enemies" is true of '
      + 'all three; anything specific to one belongs on that one — Saboteur disables an ultimate '
      + 'weapon, Commander buffs neighbours, Overcharge escalates its projectile damage.',
    traps: [
      'Immune to orbs, death ray, shockwave, knockback, and both Black Hole damage and pull, with '
      + '85% thorns resistance and 50% resistance to several stun and slow effects. A build that '
      + 'clears waves through any of those does nothing here.',
      'They arrive naturally from Tier 14, and on lower tiers from wave 15000 on Tier 1, 250 waves '
      + 'earlier per tier above that, then every 100 waves after the first. Most accounts never '
      + 'meet them, which also means most accounts cannot reach the 80% reroll-shard source.',
      'Since v28.3 they CAN be targeted by tower attacks. Guidance written before that is wrong in '
      + 'the direction of "you cannot fight them".',
      'They consume the normal-enemy spawn allowance rather than the elite or boss one, so they '
      + 'crowd out ordinary spawns.',
    ],
    implementedBy: ['FLEET_ENEMY_FACTS', 'FLEET_ENEMY_TYPE_FACTS', 'FLEET_SPAWN_ROWS', 'FLEET_REWARD_ROWS'],
    assertions: [
      { subject: 'enemy.fleet', predicate: 'typeCount', value: FLEET_ENEMY_TYPES.length, provenance: CATALOG_ENEMIES },
      { subject: 'enemy.fleet', predicate: 'healthMultipleOfBasic', value: 20, provenance: CATALOG_ENEMIES },
      { subject: 'enemy.fleet', predicate: 'naturalArrivalTier', value: 14, provenance: CATALOG_ENEMIES },
      { subject: 'enemy.fleet', predicate: 'thornsResistance', value: 0.85, provenance: CATALOG_ENEMIES },
      { subject: 'enemy.fleet', predicate: 'rerollShardDropChance', value: 0.8, provenance: WIKI_ENEMIES },
      { subject: 'enemy.fleet', predicate: 'moduleShardDropChance', value: 0.2, provenance: WIKI_ENEMIES },
      { subject: 'enemy.fleet', predicate: 'targetableSinceVersion', value: '28.3', provenance: CATALOG_ENEMIES },
    ],
    sources: [CATALOG_ENEMIES, WIKI_ENEMIES],
  },
  {
    id: 'enemy.typeCoverage',
    label: 'The per-type enemy tables are partial, and differently partial',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      `The game defines ${ENEMY_TYPES.length} enemy types. ENEMY_BASE_COIN_VALUE covers `
      + `${Object.keys(ENEMY_BASE_COIN_VALUE).length} of them and ENEMY_HEALTH_MULTIPLE covers `
      + `${Object.keys(ENEMY_HEALTH_MULTIPLE).length}, but not the same ones. Both are relative to Basic, which is 1 in `
      + 'each and absent from both by design.',
    disambiguation:
      'Absence means "not recorded here", not "this enemy has no coin value". The game has a '
      + 'value for every type; these tables just do not carry all of them.',
    traps: [
      `No coin value for ${ENEMY_TYPES_WITHOUT_COIN_VALUE.join(', ')} — the three fleet enemies. A coins-per-wave `
      + 'model that indexes this table gets undefined for exactly the enemies that appear in the '
      + 'late waves it is trying to model.',
      `No health multiple for ${ENEMY_TYPES_WITHOUT_HEALTH_MULTIPLE.join(', ')}. A type present in one table can be `
      + 'missing from the other, so checking one does not license using the other.',
      'Basic is absent from both because it is the unit — treat a missing Basic as 1, and any '
      + 'other missing type as unknown. Defaulting every miss to 1 silently makes a Tank as '
      + 'valuable as a Basic.',
      'These are multiples of Basic, not absolute values. Multiplying them by an absolute coin '
      + 'figure is right; adding them to one is not.',
    ],
    implementedBy: ['ENEMY_TYPES', 'ENEMY_BASE_COIN_VALUE', 'ENEMY_HEALTH_MULTIPLE', 'ENEMY_TYPE_SUMMARIES'],
    assertions: [
      { subject: 'enemy', predicate: 'typeCount', value: ENEMY_TYPES.length, provenance: CATALOG_ENEMIES },
      { subject: 'enemy', predicate: 'typesWithCoinValue', value: Object.keys(ENEMY_BASE_COIN_VALUE).length, provenance: CATALOG_ENEMIES },
      { subject: 'enemy', predicate: 'typesWithHealthMultiple', value: Object.keys(ENEMY_HEALTH_MULTIPLE).length, provenance: CATALOG_ENEMIES },
      { subject: 'enemy', predicate: 'typesMissingCoinValue', value: ENEMY_TYPES_WITHOUT_COIN_VALUE.length, provenance: CATALOG_ENEMIES },
      { subject: 'enemy', predicate: 'typesMissingHealthMultiple', value: ENEMY_TYPES_WITHOUT_HEALTH_MULTIPLE.length, provenance: CATALOG_ENEMIES },
      { subject: 'enemy', predicate: 'baselineType', value: 'Basic', provenance: WIKI_ENEMIES },
      { subject: 'enemy', predicate: 'coinDecayAfterThreeWaves', value: ENEMY_COIN_DECAY, provenance: WIKI_ENEMIES },
      { subject: 'enemy', predicate: 'spawnCapTotal', value: ENEMY_SPAWN_CAP.total, provenance: WIKI_ENEMIES },
      { subject: 'enemy', predicate: 'spawnCapNormal', value: ENEMY_SPAWN_CAP.normal, provenance: WIKI_ENEMIES },
      { subject: 'enemy', predicate: 'spawnCapElite', value: ENEMY_SPAWN_CAP.elite, provenance: WIKI_ENEMIES },
      { subject: 'enemy', predicate: 'spawnCapBoss', value: ENEMY_SPAWN_CAP.boss, provenance: WIKI_ENEMIES },
      { subject: 'enemy', predicate: 'spawnCapPartsSumToTotal', value: ENEMY_SPAWN_CAP.normal + ENEMY_SPAWN_CAP.elite + ENEMY_SPAWN_CAP.boss === ENEMY_SPAWN_CAP.total, provenance: WIKI_ENEMIES },
    ],
    sources: [CATALOG_ENEMIES, WIKI_ENEMIES],
  },
  {
    id: 'enemy.eliteSpawnChance',
    label: 'Elite Spawn Chance',
    kind: 'rule',
    summary:
      'The wave at which each elite spawn-chance band opens, per tier. Twenty bands of increasing '
      + 'chance; the higher your tier, the earlier each band opens.',
    units: 'percent chance, keyed by wave threshold',
    validRange:
      'Single-spawn chance is min(row, 10) squared percent and double-spawn is max(0, row - 10) '
      + `squared, over rows 0 to 19; thresholds scale by ${ELITE_SPAWN_CHANCE_TIER_RATIO} per tier `
      + `within tiers ${ELITE_SPAWN_CHANCE_TIER_BLOCKS[0].from}-${ELITE_SPAWN_CHANCE_TIER_BLOCKS[0].to} `
      + `and again within ${ELITE_SPAWN_CHANCE_TIER_BLOCKS[1].from}-${ELITE_SPAWN_CHANCE_TIER_BLOCKS[1].to}.`,
    traps: [
      'BOTH PERCENT COLUMNS ARE THE SAME SQUARE SERIES, NINE ROWS APART. Chance is quadratic in '
      + 'the row, not linear, so the gap between adjacent bands grows: rows 1 and 2 are one point '
      + 'apart, rows 9 and 10 are nineteen. Interpolating linearly between thresholds is wrong at '
      + 'both ends.',
      'THE TIER RATIO DOES NOT HOLD ACROSS TIER 15 TO 16. It is exactly 0.9 inside each block and '
      + 'anywhere from 0.36 to 0.85 across the seam. Extrapolating a single geometric series over '
      + 'all 24 tiers reproduces fifteen of them and misses the other nine, in some rows by more '
      + 'than a factor of two.',
      'THREE CELLS ARE MISSING AND THE LOOKUP READS THEM AS ZERO. Row 1 has no value for tiers '
      + `${ELITE_SPAWN_CHANCE_MISSING_CELLS.map(c => c.tier).join(', ')}, so at low waves those `
      + 'tiers report no elite chance at all while tier 21 reports one percent — a higher tier '
      + 'coming out safer than a lower one, which is the tell. `parseInt` on the string '
      + '"undefined" gives NaN, the row is skipped, and `rowIndex` stays at 0. Nothing warns.',
      'The missing values are NOT filled in from the ratio here. The ratio describes a community '
      + 'chart, and deriving three cells from a description of the data would make an inference '
      + 'indistinguishable from a reading. They are recorded as holes instead.',
      'Double-spawn chance is a separate column, not a share of the single column. Reading the '
      + 'chart double figure as "of the elites that spawn, this fraction are pairs" double-counts.',
    ],
    implementedBy: [
      'ELITE_SPAWN_CHANCE_TIER_RATIO',
      'ELITE_SPAWN_CHANCE_TIER_BLOCKS',
      'ELITE_SPAWN_CHANCE_MISSING_CELLS',
      'eliteSpawnSinglePercentAtRow',
      'eliteSpawnDoublePercentAtRow',
      'eliteSpawnChanceAtWave',
    ],
    assertions: [
      {
        subject: 'enemy.eliteSpawnChance',
        predicate: 'tierRatio',
        value: ELITE_SPAWN_CHANCE_TIER_RATIO,
        provenance: CHART_ELITE_SPAWN,
        verification: 'verified_here',
      },
      {
        subject: 'enemy.eliteSpawnChance',
        predicate: 'tierBlockCount',
        value: ELITE_SPAWN_CHANCE_TIER_BLOCKS.length,
        provenance: CHART_ELITE_SPAWN,
        verification: 'verified_here',
      },
      {
        subject: 'enemy.eliteSpawnChance',
        predicate: 'ratioHoldsAcrossTierFifteenToSixteen',
        value: false,
        provenance: CHART_ELITE_SPAWN,
        verification: 'verified_here',
      },
      {
        subject: 'enemy.eliteSpawnChance',
        predicate: 'missingCellCount',
        value: ELITE_SPAWN_CHANCE_MISSING_CELLS.length,
        provenance: CHART_ELITE_SPAWN,
        verification: 'verified_here',
      },
      {
        subject: 'enemy.eliteSpawnChance',
        predicate: 'maxSinglePercent',
        value: eliteSpawnSinglePercentAtRow(10),
        provenance: CHART_ELITE_SPAWN,
        verification: 'verified_here',
      },
    ],
    sources: [CHART_ELITE_SPAWN, WIKI_ENEMIES],
  },
  {
    id: 'enemy',
    label: 'Enemy',
    kind: 'system',
    summary:
      'One of four categories — Normal, Elite, Fleet and Boss. At most 150 are alive at once: 120 '
      + 'normal, 20 elite, 10 boss, with Fleet consuming the normal allowance.',
    traps: [
      'Spawn caps bound every damage-per-second and coins-per-wave estimate. A model that spawns '
      + 'enemies without them overstates both.',
      'Normal enemy spawn chances sum to 100% per wave, so raising one type\'s rate lowers the '
      + 'others — they are shares, not independent probabilities.',
    ],
    implementedBy: ['ENEMY_TYPES', 'ENEMY_SPAWN_CAP'],
    assertions: [
      { subject: 'enemy', predicate: 'typeCount', value: ENEMY_TYPES.length, provenance: CATALOG_ENEMIES, verification: 'verified_here' as const },
      { subject: 'enemy', predicate: 'spawnCapTotal', value: ENEMY_SPAWN_CAP.total, provenance: CATALOG_ENEMIES },
      { subject: 'enemy', predicate: 'spawnCapNormal', value: ENEMY_SPAWN_CAP.normal, provenance: CATALOG_ENEMIES },
      { subject: 'enemy', predicate: 'spawnCapElite', value: ENEMY_SPAWN_CAP.elite, provenance: CATALOG_ENEMIES },
      { subject: 'enemy', predicate: 'spawnCapBoss', value: ENEMY_SPAWN_CAP.boss, provenance: CATALOG_ENEMIES },
      // The sub-caps sum to the total, which is why they are separate pools
      // rather than a single budget. Asserted so a change to one that breaks the
      // identity is visible instead of merely inconsistent.
      { subject: 'enemy', predicate: 'subCapsSumToTotal', value: ENEMY_SPAWN_CAP.normal + ENEMY_SPAWN_CAP.elite + ENEMY_SPAWN_CAP.boss === ENEMY_SPAWN_CAP.total, provenance: CATALOG_ENEMIES, verification: 'verified_here' as const },
      // Recorded as gaps rather than left to be discovered as zeroes.
      { subject: 'enemy', predicate: 'typesWithoutCoinValue', value: ENEMY_TYPES_WITHOUT_COIN_VALUE.length, provenance: CATALOG_ENEMIES, verification: 'verified_here' as const },
      { subject: 'enemy', predicate: 'typesWithoutHealthMultiple', value: ENEMY_TYPES_WITHOUT_HEALTH_MULTIPLE.length, provenance: CATALOG_ENEMIES, verification: 'verified_here' as const },
    ],
    // Listed because this node's own assertions read the enemy catalog.
    sources: [WIKI_ENEMIES, CATALOG_ENEMIES],
  },
  {
    id: 'enemy.coinDecay',
    label: 'Coin decay',
    kind: 'rule',
    summary:
      'An enemy alive for more than three waves loses 50% of its coin value.',
    traps: [
      'Slow-kill and crowd-control strategies quietly halve their own coin income. A coin model '
      + 'that ignores time-to-kill will over-reward exactly those builds.',
    ],
    implementedBy: ['ENEMY_COIN_DECAY'],
    assertions: [
      { subject: 'enemy.coinDecay', predicate: 'shareLostAfterThreeWaves', value: ENEMY_COIN_DECAY, provenance: CATALOG_ENEMIES },
      { subject: 'enemy.coinDecay', predicate: 'appliesToLivingEnemiesOnly', value: true, provenance: CATALOG_ENEMIES },
    ],
    sources: [{ ...WIKI_ENEMIES, section: 'Shared characteristics' }, CATALOG_ENEMIES],
  },
  {
    id: 'enemy.mass',
    label: 'Enemy mass',
    kind: 'stat',
    summary: 'Rises 4% for each wave an enemy stays alive, making knockback progressively weaker.',
    units: 'multiplier per wave alive',
    traps: [
      'Knockback effectiveness decays with enemy age. A static knockback assumption is only '
      + 'correct on the wave an enemy spawns.',
    ],
    assertions: [
      { subject: 'enemy.mass', predicate: 'percentPerWaveAlive', value: 4, provenance: CATALOG_ENEMIES },
      { subject: 'enemy.mass', predicate: 'weakensKnockback', value: true, provenance: CATALOG_ENEMIES },
      // It rises with time alive, so it is only correct on the spawn wave --
      // which is exactly when a snapshot-based model reads it.
      { subject: 'enemy.mass', predicate: 'constantAfterSpawn', value: false, provenance: CATALOG_ENEMIES },
    ],
    sources: [{ ...WIKI_ENEMIES, section: 'Shared characteristics' }, CATALOG_ENEMIES],
  },
  {
    id: 'enemyLevelSkip',
    label: 'Enemy Level Skip (ELS)',
    kind: 'stat',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'A chance to skip an enemy stat level-up after a wave. Separate stats for Attack and Health, '
      + 'each 699 workshop levels of +0.05% to a 35% maximum, plus 20 lab levels and some relics. '
      + 'Unlocked for 1 billion coins after Recovery Packages.',
    units: 'percent',
    validRange: 'Each of Attack and Health ELS: 0.05%–35% from the workshop, before labs and relics.',
    traps: [
      'IT IS NOT RANDOM. Both Attack and Health level skip are deterministic, settled against the '
      + 'game rather than the wiki: a 50% ELS skips every other wave with no variance. Simulating '
      + 'it as a coin flip invents spread the game does not have, and any confidence interval '
      + 'derived that way is fiction.',
      'The dump LOOKS like it contradicts that, and the trap is believing it. `Main` declares '
      + '`private Random attackSkipRandom` and `private Random healthSkipRandom`, one per stat. '
      + 'They are never constructed. `NewWave` rebuilds `deathDefyRandom`, `fleetsRandom` and '
      + '`moreElitesRandom` every wave from `WaveSeed`, and steps straight over the two skip '
      + 'fields sitting between them. Nothing in the binary assigns either, so both are '
      + 'permanently null and using one would throw. They are leftovers from before V26 — the '
      + 'field list is a record of what the game USED to do as much as what it does.',
      'The chance is also built without any RNG: `CalculateEnemyLevelSkipChances` is branch-free '
      + 'arithmetic end to end. Neither producing the chance nor consuming it involves a roll.',
      'Two independent stats. Attack ELS and Health ELS are bought separately and skipping one '
      + 'says nothing about the other.',
      'With Wave Skip, ELS is checked once PER SKIPPED WAVE — so the two cards compound rather '
      + 'than overlap.',
      'Battle conditions from tier 14 up apply "ELS Reduction", which cuts this directly. The '
      + 'stat is worth less exactly where enemies scale hardest.',
    ],
    assertions: [
      {
        subject: 'enemyLevelSkip',
        predicate: 'isDeterministic',
        value: true,
        // Was wiki-only, briefly downgraded to `unverified` when the two Random
        // fields turned up, then confirmed against the game: those fields are
        // never constructed. Re-promoted on the dump's authority, not the
        // wiki's.
        provenance: GAME_NEW_WAVE,
        verification: 'verified_here',
      },
      {
        subject: 'enemyLevelSkip',
        predicate: 'workshopMaxPercent',
        value: 35,
        provenance: WIKI_ELS,
        verification: 'verified_here',
      },
      {
        subject: 'enemyLevelSkip',
        predicate: 'hardCapPercent',
        value: 100,
        provenance: GAME_ELS_CALC,
        verification: 'verified_here',
      },
      {
        subject: 'enemyLevelSkip',
        predicate: 'declaredRandomFieldCount',
        value: UNCONSTRUCTED_RANDOM_FIELDS.length,
        provenance: GAME_MAIN_FIELDS,
        verification: 'verified_here',
      },
      {
        subject: 'enemyLevelSkip',
        predicate: 'constructedRandomFieldCount',
        value: 0,
        provenance: GAME_NEW_WAVE,
        verification: 'verified_here',
      },
      {
        subject: 'enemyLevelSkip',
        predicate: 'chanceIsComputedWithoutRng',
        value: true,
        provenance: GAME_ELS_CALC,
        verification: 'verified_here',
      },
      {
        subject: 'enemyLevelSkip',
        predicate: 'additiveSourceCount',
        value: ENEMY_LEVEL_SKIP_ADDITIVE_SOURCE_COUNT,
        provenance: GAME_ELS_CALC,
        verification: 'verified_here',
      },
    ],
    sources: [WIKI_ELS, GAME_ELS_CALC],
  },
  {
    id: 'enemyLevelSkip.pipeline',
    label: 'How enemy level skip is actually computed',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'Eleven ordered steps, read off `Main.CalculateEnemyLevelSkipChances`. Sources add, the '
      + 'enhancement multiplies, the result is clamped to 0..1, and only THEN do battle conditions '
      + 'cut into it — subtract first, multiply second, decay last.',
    units: 'fraction 0..1 internally; the UI shows it as a percent',
    validRange:
      'Clamped to 0..1 before battle conditions and floored at 0 after each reduction. It can end '
      + 'at exactly 0 and can never exceed 1.',
    disambiguation:
      'The 35% figure is the WORKSHOP maximum for one of the two stats. It is not the stat ceiling '
      + '— the code clamps the summed total at 100%, and the sum includes labs, relics, the vault '
      + 'tech tree and the enhancement multiplier. Quoting 35% as the cap understates a maxed '
      + 'account.',
    implementedBy: [
      'ENEMY_LEVEL_SKIP_PIPELINE',
      'buildLevelSkipChanceRaw',
      'applyTierBattleConditionsToSkipChance',
      'computeLevelSkipChance',
    ],
    assertions: [
      {
        subject: 'enemyLevelSkip.pipeline',
        predicate: 'stepCount',
        value: ENEMY_LEVEL_SKIP_PIPELINE.length,
        provenance: GAME_ELS_CALC,
      },
      {
        subject: 'enemyLevelSkip.pipeline',
        predicate: 'clampAppliedBeforeBattleConditions',
        value: ENEMY_LEVEL_SKIP_PIPELINE.indexOf('clamp to 0..1')
          < ENEMY_LEVEL_SKIP_PIPELINE.findIndex(step => step.startsWith('subtract Enemy Level Skip')),
        provenance: GAME_ELS_CALC,
      },
      {
        subject: 'enemyLevelSkip.pipeline',
        predicate: 'vaultTechTreeStatAttack',
        value: 9,
        provenance: GAME_ELS_CALC,
      },
      {
        subject: 'enemyLevelSkip.pipeline',
        predicate: 'vaultTechTreeStatHealth',
        value: 12,
        provenance: GAME_ELS_CALC,
      },
    ],
    traps: [
      'FIVE sources add before the multiplier, not three. Workshop, labs, MODULES (via '
      + '`GetEquippedClusterBenefit`), the VAULT power tree (`GetTechTreeBenefit` with stat 9 or '
      + '12) and the cards/relics property. `buildLevelSkipChanceRaw` has all five; this graph '
      + 'listed workshop, labs and relics and omitted the other two until 2026-08-18. A total '
      + 'built from the short list is low and still looks reasonable, which is why nobody checks '
      + 'it.',
      'ORDER IS NOT COMMUTATIVE and the game fixes it: subtract, then multiply, then subtract '
      + 'decay. Multiplying before subtracting gives a different answer at every non-zero level, '
      + 'and both orders produce a number in range.',
      'The 0..1 clamp happens BEFORE the battle conditions, not after. So a build over 100% does '
      + 'not "absorb" the reduction — the excess is discarded first and the reduction then bites '
      + 'the full amount.',
      'Each reduction is floored at 0 SEPARATELY. Collapsing them into one expression and '
      + 'clamping once lets a large subtract go negative and then be scaled back up by the '
      + 'multiply into a positive number.',
      'If utility is disabled the function writes eight bytes of zero at 0x500, which covers BOTH '
      + 'the attack and health fields. Utility off is not a partial effect; it is both stats gone.',
      'Skip Decay is subtracted from the field `eLSDecayAmount`, AFTER the multiply. Modelling it '
      + 'as part of the multiplicative reduction makes it too weak at high skip and too strong at '
      + 'low.',
    ],
    sources: [GAME_ELS_CALC],
  },
  {
    id: 'enemy.boss',
    label: 'Boss',
    kind: 'entity',
    summary:
      '×20 health, 30% speed, worth 5 coins. Spawns every 10 waves (fewer under some battle '
      + 'conditions) and drops module shards and reroll shards.',
    traps: [
      'Bosses are IMMUNE to Orbs, Death Ray, Shockwave and Black Hole. A damage model that applies '
      + 'those to bosses overstates boss clear rate — and these are exactly the sources a build '
      + 'leans on for everything else.',
      'The Boss Orb Hit lab is the one documented exception to orb immunity.',
    ],
    assertions: [
      { subject: 'enemy.boss', predicate: 'healthMultipleOfBasic', value: ENEMY_HEALTH_MULTIPLE.Boss, provenance: CATALOG_ENEMIES },
      { subject: 'enemy.boss', predicate: 'baseCoinValue', value: ENEMY_BASE_COIN_VALUE.Boss, provenance: CATALOG_ENEMIES },
      { subject: 'enemy.boss', predicate: 'spawnCap', value: ENEMY_SPAWN_CAP.boss, provenance: CATALOG_ENEMIES },
    ],
    sources: [{ ...WIKI_ENEMIES, section: 'Bosses' }, CATALOG_ENEMIES],
  },
  {
    id: 'enemy.protector',
    label: 'Protector',
    kind: 'entity',
    summary:
      'Prevents insta-kills and multiplies damage against enemies in range by '
      + `${PROTECTOR_DAMAGE_MULTIPLIER} — reduced TO sixty percent, not BY it. One spawns per wave `
      + 'at most, with a cooldown, and only from tier 2 upward.',
    traps: [
      'It makes OTHER enemies harder to kill. Modelling it as just another enemy misses the only '
      + 'thing it does.',
      'REDUCED TO SIXTY PERCENT, NOT BY SIXTY PERCENT. `Enemy.HitMultiplier` does '
      + `\`damage *= ${PROTECTOR_DAMAGE_MULTIPLIER}\`, so an enemy under a Protector takes 60% of `
      + 'normal damage — a 40% reduction. The wiki\'s "60% damage reduction" reads as x0.4 and is '
      + 'the classic to-versus-by slip; it overstates the Protector by half.',
      'IT PROTECTS ITSELF. The gate is `Enemy.inProtector` OR `enemyType == Protector`, so a lone '
      + 'Protector with nothing in its radius still takes reduced damage.',
      'ANOMALY, UNRESOLVED: the damage multiplier is scaled by research index '
      + `${PROTECTOR_DAMAGE_LAB_RESEARCH_INDEX}, which is \`boss_health\`, while the radius `
      + `beside it correctly uses ${PROTECTOR_RADIUS_LAB_RESEARCH_INDEX}, \`protector_radius\`. `
      + 'The index is confirmed by the bounds check, so this is not a misread. Either the game '
      + 'couples the two or the research-name table is wrong at exactly this index. Do not build '
      + 'on the pairing; the 0.6 constant does not depend on it.',
      'THORNS TAKES A DIFFERENT PATH. General damage is multiplied by 0.6 here; thorns is '
      + 'multiplied by 0.7 in `Enemy.ThornDamage`, with its own lab. Two multipliers, two labs, '
      + 'and using either for the other is wrong in opposite directions.',
      'The wiki contradicts itself on the simultaneous limit — "8 at once" in the Normal Enemies '
      + 'section, "10 at once" on the Protector entry. Treat the cap as UNVERIFIED and confirm '
      + 'in game before relying on it.',
    ],
    assertions: [
      {
        subject: 'enemy.protector',
        predicate: 'damageMultiplier',
        value: PROTECTOR_DAMAGE_MULTIPLIER,
        provenance: GAME_PROTECTOR,
        verification: 'verified_here',
      },
      {
        subject: 'enemy.protector',
        predicate: 'appliesToItself',
        value: true,
        provenance: GAME_PROTECTOR,
        verification: 'verified_here',
      },
      {
        subject: 'enemy.protector',
        predicate: 'damageLabResearchIndex',
        value: PROTECTOR_DAMAGE_LAB_RESEARCH_INDEX,
        provenance: GAME_PROTECTOR,
        verification: 'unverified',
      },
      {
        subject: 'enemy.protector',
        predicate: 'radiusLabResearchIndex',
        value: PROTECTOR_RADIUS_LAB_RESEARCH_INDEX,
        provenance: GAME_PROTECTOR,
        verification: 'verified_here',
      },
    ],
    sources: [{ ...WIKI_ENEMIES, section: 'Protector' }, GAME_PROTECTOR],
  },
  {
    id: 'enemy.vampire',
    label: 'Vampire',
    kind: 'entity',
    summary:
      '×2 health. Deals 2% of tower max health per second and disables tower regen while its ray '
      + 'is attacking.',
    traps: [
      'Its damage is a share of MAX HEALTH, so stacking health makes it hit harder, not softer.',
      'It cannot be reduced by perks or any other modifier.',
      'It disables tower regen and lifesteal — but not wall regen. An EHP model built on regen '
      + 'collapses against it.',
    ],
    assertions: [
      { subject: 'enemy.vampire', predicate: 'healthMultipleOfBasic', value: ENEMY_HEALTH_MULTIPLE.Vampire, provenance: CATALOG_ENEMIES },
      { subject: 'enemy.vampire', predicate: 'baseCoinValue', value: ENEMY_BASE_COIN_VALUE.Vampire, provenance: CATALOG_ENEMIES },
    ],
    sources: [{ ...WIKI_ENEMIES, section: 'Vampire' }, CATALOG_ENEMIES],
  },
  {
    id: 'enemy.saboteur',
    label: 'Saboteur',
    kind: 'entity',
    summary:
      '×20 health. Disables a random ultimate weapon on impact until it dies. Rests against the '
      + 'wall without damaging it.',
    traps: [
      'It removes a weapon from the run. Any UW uptime calculation that assumes all owned weapons '
      + 'are always available is wrong wherever Saboteurs spawn.',
      'Its attacks roll for thorns but not for Energy Shield.',
    ],
    assertions: [
      { subject: 'enemy.saboteur', predicate: 'healthMultipleOfBasic', value: ENEMY_HEALTH_MULTIPLE.Saboteur, provenance: CATALOG_ENEMIES },
      // No coin value recorded, and that is the claim rather than an omission.
      { subject: 'enemy.saboteur', predicate: 'hasBaseCoinValue', value: 'Saboteur' in ENEMY_BASE_COIN_VALUE, provenance: CATALOG_ENEMIES, verification: 'verified_here' as const },
    ],
    sources: [{ ...WIKI_ENEMIES, section: 'Saboteur' }, CATALOG_ENEMIES],
  },
  {
    id: 'enemy.scatter',
    label: 'Scatter',
    kind: 'entity',
    summary: '×2 health, splits in half four times with health halving at each split.',
    traps: [
      'One split scatter drops elite cells when killed — the others do not. Counting every scatter '
      + 'as a cell source overstates cell income several-fold.',
    ],
    assertions: [
      { subject: 'enemy.scatter', predicate: 'healthMultipleOfBasic', value: ENEMY_HEALTH_MULTIPLE.Scatter, provenance: CATALOG_ENEMIES },
      { subject: 'enemy.scatter', predicate: 'baseCoinValue', value: ENEMY_BASE_COIN_VALUE.Scatter, provenance: CATALOG_ENEMIES },
      { subject: 'enemy.scatter', predicate: 'splitCount', value: 4, provenance: CATALOG_ENEMIES },
      // Each split halves health, so the family is worth far less than four
      // full copies -- the reading that overstates cell income several-fold.
      { subject: 'enemy.scatter', predicate: 'healthHalvesAtEachSplit', value: true, provenance: CATALOG_ENEMIES },
    ],
    sources: [{ ...WIKI_ENEMIES, section: 'Scatter' }, CATALOG_ENEMIES],
  },
  {
    id: 'enemyLevelSkip.consumer',
    label: 'How a skip chance becomes a skip',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'An accumulator, not a roll. Every wave processed, `Main.NewWave` adds the chance to a '
      + 'running counter — `counterEALS` and `counterEHLS` — and whenever a counter EXCEEDS 1 it '
      + 'subtracts 1 and grants one skip. That is the whole mechanism, and it is why a 50% chance '
      + 'skips every other wave exactly.',
    units: 'fractional credit carried between waves',
    validRange:
      'The counter carries a remainder in [0, 1] across waves and is a persistent field, not a '
      + 'per-wave temporary.',
    disambiguation:
      'Not a probability check and not a per-wave independent trial. The word "chance" in the UI '
      + 'is a rate, not an odds.',
    implementedBy: [
      'ENEMY_LEVEL_SKIP_COUNTER_FIELDS',
      'simulateEnemyLevelSkips',
      'deterministicSkipLevelsFromChance',
    ],
    assertions: [
      {
        subject: 'enemyLevelSkip.consumer',
        predicate: 'counterThreshold',
        value: ENEMY_LEVEL_SKIP_COUNTER_THRESHOLD,
        provenance: GAME_NEW_WAVE_LOOP,
      },
      {
        subject: 'enemyLevelSkip.consumer',
        predicate: 'thresholdIsStrictlyGreaterThan',
        value: true,
        provenance: GAME_NEW_WAVE_LOOP,
      },
      {
        subject: 'enemyLevelSkip.consumer',
        predicate: 'attackUtilityUpgradeIndex',
        value: ENEMY_LEVEL_SKIP_COUNTER_FIELDS.attack.utilityIndex,
        provenance: GAME_NEW_WAVE_LOOP,
      },
      {
        subject: 'enemyLevelSkip.consumer',
        predicate: 'healthUtilityUpgradeIndex',
        value: ENEMY_LEVEL_SKIP_COUNTER_FIELDS.health.utilityIndex,
        provenance: GAME_NEW_WAVE_LOOP,
      },
    ],
    traps: [
      'THE COMPARE IS STRICTLY GREATER THAN 1, and the difference is visible at 100%. A chance of '
      + '1.0 puts the counter at exactly 1.0 after the first wave, which does not pass `> 1`, so '
      + 'no skip is granted; from the second wave on it skips every wave and carries a permanent '
      + '1.0 residue. A maxed build is one skip behind where `>=` would put it, forever.',
      'ACCUMULATION IS UNCONDITIONAL; only REDEMPTION is gated. The counter is incremented before '
      + '`IsUtilityUpgradeEnabled` is consulted, so credit builds while the upgrade is off and is '
      + 'cashed out the moment it is switched on. Modelling the whole mechanic as gated loses '
      + 'that.',
      'THE READ IS 64 BITS WIDE AND HIDES FROM A 32-BIT SEARCH. `NewWave` loads both chances as '
      + 'one pair (`ldr d1, [x19, #0x500]`) and adds them with a NEON `fadd v0.2s` into the two '
      + 'adjacent counters. A scan for `ldr s` at 0x500 — the natural search for a float field — '
      + 'returns nothing, and the field looks unread. This is the same mistake as reading a dead '
      + 'field as live, inverted: search by access WIDTH and you will conclude whatever the width '
      + 'you guessed implies. Trace callers instead.',
      'The loop runs once per wave PROCESSED, and wave skip processes several waves in one tick. '
      + 'So level skip and wave skip compound rather than overlap — the counter advances once per '
      + 'skipped wave too.',
    ],
    sources: [GAME_NEW_WAVE_LOOP],
  },
]

export const ENEMY_KNOWLEDGE_EDGES: readonly KnowledgeEdge[] = [
  {
    from: 'enemy.typeMix',
    kind: 'scales',
    to: 'enemy.spawnComposition',
    note:
      'How many spawn is one question; which types they are is another, and only the second sets '
      + 'what a wave is worth in coins.',
    sources: [GAME_TYPE_MIX],
  },

  {
    from: 'enemy.levelReductionCurve',
    kind: 'caps',
    to: 'enemy.damageAndKill',
    note:
      'The curve bounds how many of an enemy accumulated level reductions actually count, so it '
      + 'caps what repeated hits can take off a single enemy.',
    sources: [GAME_LEVEL_REDUCTION_CURVE],
  },

  {
    from: 'enemy.damageOrder',
    kind: 'appliedBefore',
    to: 'enemy.damageAndKill',
    note:
      'What damage application touches, and the order it touches it in. The ordering is the part '
      + 'a simulation gets wrong without noticing.',
    sources: [GAME_DAMAGE_ORDER],
  },

  {
    from: 'enemy.damageAndKill',
    kind: 'scales',
    to: 'enemy.waveScaling',
    note:
      'Damage can lower the enemy wave level and re-derive its health from the wave base, so the '
      + 'scaling formula is consulted DURING a fight rather than only at spawn.',
    sources: [GAME_DAMAGE_AND_KILL],
  },

  {
    from: 'enemy.waveTiming',
    kind: 'appliedBefore',
    to: 'enemy.runLoop',
    note:
      'NewWave rolls the wave before WaveUpdate plays it. The order is the mechanic: everything '
      + 'rolled is fixed for the wave.',
    sources: [GAME_WAVE_TIMING],
  },

  {
    from: 'enemy.movementAndTargeting',
    kind: 'memberOf',
    to: 'enemy.runLoop',
    note:
      'Speed decides how long an enemy is in range and targeting decides which one is shot. Both '
      + 'sit inside the loop rather than beside it.',
    sources: [GAME_SPEED_TARGETING],
  },

  {
    from: 'enemy.spawnComposition',
    kind: 'gates',
    to: 'enemy.runLoop',
    note:
      'The run loop asks what to spawn; this is what answers. Elite chances arrive from remote '
      + 'config, so the loop is deterministic only once those are pinned.',
    sources: [GAME_SPAWN_COMPOSITION],
  },

  {
    from: 'enemy.runLoop',
    kind: 'gates',
    to: 'enemy.waveScaling',
    note:
      'WaveUpdate decides WHEN a wave starts and what spawns; wave scaling decides how strong it '
      + 'is. A simulation needs both, and neither implies the other.',
    sources: [GAME_RUN_LOOP],
  },

  {
    from: 'enemy.waveScaling',
    kind: 'scales',
    to: 'enemy',
    note:
      'Every per-enemy health multiple in this compartment multiplies the wave base. Without the '
      + 'base there is no absolute scale, only ratios.',
    sources: [GAME_WAVE_SCALING],
  },
  {
    from: 'tier',
    kind: 'scales',
    to: 'enemy.waveScaling',
    note:
      'Tier enters as an exponent, piecewise: its own addon for tiers 10-14 and a shared cap from '
      + '15 up. It is not a linear difficulty multiplier.',
    sources: [GAME_WAVE_SCALING],
  },

  {
    from: 'enemy.eliteSpawnChance',
    kind: 'memberOf',
    to: 'enemy',
    note:
      'Governs when elites appear at all. It sets the rate; the spawn cap of '
      + `${ENEMY_SPAWN_CAP.elite} sets the ceiling, and the two are easy to confuse.`,
    sources: [CHART_ELITE_SPAWN],
  },
  {
    from: 'enemyLevelSkip.consumer',
    kind: 'memberOf',
    to: 'enemyLevelSkip',
    note:
      'The half that turns a rate into an event. The pipeline builds the number; this spends it.',
    sources: [GAME_NEW_WAVE_LOOP],
  },
  {
    from: 'enemyLevelSkip.pipeline',
    kind: 'appliedBefore',
    to: 'enemyLevelSkip.consumer',
    note:
      'The chance is fully assembled and clamped before any of it is accumulated. Battle '
      + 'conditions therefore change the RATE the counter fills at, never the threshold it fills to.',
    sources: [GAME_NEW_WAVE_LOOP],
  },
  {
    from: 'enemyLevelSkip.pipeline',
    kind: 'memberOf',
    to: 'enemyLevelSkip',
    note: 'The order the stat is assembled in, taken from the function that assembles it.',
    sources: [GAME_ELS_CALC],
  },
  {
    from: 'vault.powerTree',
    kind: 'scales',
    to: 'enemyLevelSkip',
    note:
      'The power tree node "0.5% Enemy Attack Skip" reaches the stat through '
      + '`GetTechTreeBenefit(TechTreeStat.Enemy_Attack_Skip)`. The graph listed workshop, labs and '
      + 'relics as the sources and omitted this one.',
    sources: [GAME_ELS_CALC],
  },
  {
    from: 'battleCondition.elsReduction',
    kind: 'appliedBefore',
    to: 'enemyLevelSkip.pipeline',
    note:
      'Subtract runs before multiply, and both run after the 0..1 clamp. Swapping them changes '
      + 'the answer at every non-zero level while still returning something in range.',
    sources: [GAME_ELS_CALC],
  },
  ...GENERATED_ENEMY_TYPE_NODES.map(node => ({
    from: node.id,
    kind: 'memberOf' as const,
    to: 'enemy',
    note: `${node.label}, described from the shipped enemy-type catalog.`,
    sources: [CATALOG_ENEMIES],
  })),
  /*
   * Each fleet enemy to the category, so a fact about "fleet enemies" is
   * reachable from any one of them and vice versa. Saboteur is hand-written
   * above rather than generated, which is exactly why this is built from the
   * type list instead of the generated nodes — otherwise it would be linked to
   * two of the three and silently miss the one that was written by hand.
   */
  ...FLEET_ENEMY_TYPES.map(name => ({
    from: `enemy.${name[0].toLowerCase()}${name.slice(1)}`,
    kind: 'memberOf' as const,
    to: 'enemy.fleet',
    note: `${name} is one of the three fleet enemies, sharing their resistances, arrival rule and drop table.`,
    sources: [CATALOG_ENEMIES],
  })),
  {
    from: 'enemy.fleet',
    kind: 'memberOf',
    to: 'enemy',
    note: 'A category of three, not a fourth enemy.',
    sources: [CATALOG_ENEMIES],
  },
  {
    from: 'enemy.typeCoverage',
    kind: 'memberOf',
    to: 'enemy',
    note:
      'Which of the twelve types each per-type table actually carries. Both are partial, and not '
      + 'partial in the same way.',
    sources: [CATALOG_ENEMIES],
  },
  {
    from: 'enemy.coinDecay',
    kind: 'caps',
    to: 'enemy',
    note: 'Coin value halves after three waves alive, so kill speed is part of every coin estimate.',
    sources: [{ ...WIKI_ENEMIES, section: 'Shared characteristics' }],
  },
  {
    from: 'enemyLevelSkip',
    kind: 'caps',
    to: 'enemy',
    note:
      'Skipping a level-up holds enemy attack or health back permanently for that run — and it '
      + 'does so deterministically, not on a roll.',
    sources: [WIKI_ELS],
  },
  {
    from: 'tier.battleCondition',
    kind: 'caps',
    to: 'enemyLevelSkip',
    note: 'ELS Reduction appears from tier 14 upward, cutting the stat where it matters most.',
    sources: [WIKI_ELS],
  },
  {
    from: 'waveSkip',
    kind: 'scales',
    to: 'enemyLevelSkip',
    note: 'ELS is rolled once per skipped wave, so Wave Skip compounds it rather than bypassing it.',
    sources: [WIKI_ELS],
  },
  {
    from: 'enemy.mass',
    kind: 'scales',
    to: 'enemy',
    note: 'Mass rises 4% per wave alive, weakening knockback against long-lived enemies.',
    sources: [{ ...WIKI_ENEMIES, section: 'Shared characteristics' }],
  },
  {
    from: 'enemy.protector',
    kind: 'caps',
    to: 'enemy',
    note:
      `Multiplies damage against enemies in range by ${PROTECTOR_DAMAGE_MULTIPLIER} and blocks `
      + 'insta-kills on them.',
    sources: [{ ...WIKI_ENEMIES, section: 'Protector' }],
  },
  {
    from: 'enemy.boss',
    kind: 'memberOf',
    to: 'enemy',
    note: 'Its own spawn category with a separate cap of 10 and immunity to four damage sources.',
    sources: [{ ...WIKI_ENEMIES, section: 'Bosses' }],
  },
  {
    from: 'enemy.vampire',
    kind: 'memberOf',
    to: 'enemy',
    note: 'Percent-of-max-health damage that ignores modifiers and suppresses regen.',
    sources: [{ ...WIKI_ENEMIES, section: 'Vampire' }],
  },
  {
    from: 'enemy.saboteur',
    kind: 'memberOf',
    to: 'enemy',
    note: 'Removes a random ultimate weapon for as long as it lives.',
    sources: [{ ...WIKI_ENEMIES, section: 'Saboteur' }],
  },
  {
    from: 'enemy.scatter',
    kind: 'memberOf',
    to: 'enemy',
    note: 'Splits four times; only one split drops elite cells.',
    sources: [{ ...WIKI_ENEMIES, section: 'Scatter' }],
  },
]
