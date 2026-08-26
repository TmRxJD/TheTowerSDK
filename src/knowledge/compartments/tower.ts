/**
 * Tower stats and defensive abilities, as the game defines them.
 *
 * Read off the wiki on 2026-08-16 (Health, Attack Speed, Orbs, Thorn Damage,
 * Wall, Shockwave, Free Upgrades, Game Speed).
 *
 * Two things here are worth more than the rest of the file:
 *
 *  - **The eHP formula**, which is what the Effective Paths `ehp` family is
 *    ultimately computing, written down rather than reconstructed.
 *  - **Game speed is not accurate.** ×5.0 behaves closer to ×4.0 and ×6.25
 *    closer to ×5. Every timer-based projection built on the nominal value is
 *    optimistic by roughly 20%, and nothing in the game reports it.
 */
import type { KnowledgeEdge, KnowledgeNode } from '../substrate/schema'
import { communityGuideSource } from '../community-guides'

const WIKI_HEALTH = { origin: 'wiki', ref: 'Health', verifiedAt: '2026-08-16' } as const
const WIKI_ATTACK_SPEED = { origin: 'wiki', ref: 'Attack Speed', verifiedAt: '2026-08-16' } as const
const WIKI_ORBS = { origin: 'wiki', ref: 'Orbs', verifiedAt: '2026-08-16' } as const
/** Thorn damage, verified against in-game values. */
const GAME_THORNS = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/**
 * Confirmed against the workshop table extracted from the game.
 *
 * These claims were written from the wiki and have now been checked, value by
 * value, against `WORKSHOP_DATA` — which is itself extracted from the game
 * binary, not transcribed. `scripts/acs/verify-tower-claims.mjs` reproduces the
 * comparison and prints every claim it checked.
 *
 * The order is the repository's own rule: the wiki forms the claim, the dump
 * validates it. Every one of these numbers was sitting in an extracted JSON
 * table the whole time, so reading assembly for them would have been the
 * expensive way to learn what was already on disk.
 *
 * `origin: 'game'` is correct here because the TABLE is game data. It is the
 * weaker of the two citations — it says "the shipped table agrees", not "this
 * is what produces it" — so the ref names the table.
 */
const GAME_WORKSHOP_TABLE = {
  origin: 'game',
  ref: 'WORKSHOP_DATA (extracted workshop table), verified by scripts/acs/verify-tower-claims.mjs',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-20',
} as const

/**
 * The defence cap.
 *
 * Workshop, labs, modules and relics all add into out-of-round defence, and the
 * total is then clamped at 98%. Stack past it in game and the displayed figure
 * stops moving, which is how you can see the cap without any of this.
 *
 * Note the UNITS. The binary clamps at 98.0 because it works in percent; the
 * oracle stores 0.98 because it works in fractions. Same quantity, and the kind
 * of difference that reads as a factor-of-100 contradiction if nobody says so.
 */
const GAME_DEFENSE_CAP = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-20',
} as const

/**
 * The wall rebuild floor.
 *
 * Wall rebuild time is bounded below at 150 — reductions past that point buy
 * nothing, and the in-game figure stops improving.
 */
const GAME_WALL_FLOOR = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-20',
} as const

/**
 * The shockwave frequency floor.
 *
 * The clearest of the three bounds: shockwave frequency never goes below 7,
 * however much frequency reduction is stacked.
 */
const GAME_SHOCKWAVE_FLOOR = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-20',
} as const

/**
 * Read in the binary and found NOT to be a clamp.
 *
 * `Main$$GetOutOfRoundOrbCount` and
 * `Main$$GetOutOfRoundFreeAttackUpgradeChance` contain no bound at all — the
 * first adds three contributors, the second multiplies a chain of them, and
 * neither compares the result against anything.
 *
 * So the stated maxima are DESCRIPTIVE: where the contributors happen to top
 * out today, not a limit the game enforces. That distinction matters for
 * anything modelling them — a planner may not assume the game will stop at 14
 * orbs, and a new source of orbs would move the number with no code change.
 */
/**
 * The game-speed ladder, read out of the binary.
 *
 * `Main$$GameSpeedModifier` compares the live `Main.gameSpeed` against a
 * descending ladder of immediates — 5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.0 —
 * and loads a different float field per branch. So 5.0 is the top of the base
 * ladder, and the game does not treat nominal speed as a plain time scale: it
 * looks up a MODIFIER per speed step.
 *
 * That lookup is the mechanism behind the node's headline trap. "×5 behaves
 * closer to ×4" is not a community impression about frame pacing; there is a
 * per-speed factor in the code, and it is a field rather than an immediate, so
 * its value is config and cannot be read out of the binary statically.
 *
 * WHAT THIS DOES NOT ESTABLISH: the ×6.25 figure. There is no 6.25 constant in
 * the binary, and neither `maxGameSpeed` nor `standardPerkBonus` appears as a
 * symbol in the dump, so the perk arithmetic (5.0 base + a +1.00 perk scaled to
 * +1.25) stays wiki-sourced. Only the base ladder top is primary.
 */
const GAME_SPEED_LADDER = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-20',
} as const

const GAME_NO_CLAMP = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-20',
} as const

/**
 * Minionek's early-game tower guide, from Discord, supplied by the repo owner.
 *
 * NOT a wiki page, and it was wrong to record it as one. The staleness sweep
 * flagged it MISSING because no page of that name exists on Fandom or Game
 * Vault — correct symptom, wrong diagnosis on my part: I took it for a wiki
 * page that had been deleted or renamed. It never was one. It is a named
 * author's guide posted to Discord and handed to this repo directly, which
 * makes `user` its honest origin: a domain expert stated it, and it reaches us
 * through the account owner rather than through a public wiki.
 *
 * That distinction matters for more than tidiness. A wiki citation can be
 * re-read by anyone and goes stale visibly; this cannot be re-fetched by a
 * tool at all, so it can only be re-confirmed by asking. It is the weakest
 * kind of source here for exactly that reason, and it should never be the sole
 * support for a number.
 *
 * It is not load-bearing. Everything it backs — the thorns kill breakpoints —
 * is arithmetic that `tower-thorns.test.ts` derives and checks independently,
 * and the node's numbers are game-sourced through `GAME_THORNS`. Kept as
 * attribution for where the framing came from, not as evidence. Credit is the
 * point of keeping it.
 *
 * The `ref` now comes from `community-guides.ts` rather than being written out here. It was the
 * only guide cited anywhere, under a spelling nothing else knew, so the roster that credits these
 * people could not see it.
 */
const COMMUNITY_GUIDE = communityGuideSource('minionek-early-game')

const WIKI_THORNS = { origin: 'wiki', ref: 'Thorn Damage', verifiedAt: '2026-08-16' } as const
const WIKI_WALL = { origin: 'wiki', ref: 'Wall', verifiedAt: '2026-08-16' } as const
const WIKI_SHOCKWAVE = { origin: 'wiki', ref: 'Shockwave', verifiedAt: '2026-08-16' } as const
const WIKI_FREE_UPGRADES = { origin: 'wiki', ref: 'Free Upgrades', verifiedAt: '2026-08-16' } as const

/** Read from the shipped workshop table rather than transcribed, so it cannot drift. */
const CATALOG_TOWER = {
  origin: 'code',
  ref: 'thetowersdk/data WORKSHOP_DATA',
  verifiedAt: '2026-08-17',
} as const
const WIKI_GAME_SPEED = { origin: 'wiki', ref: 'Game Speed', verifiedAt: '2026-08-16' } as const
const WIKI_DEFENSE_PERCENT = { origin: 'wiki', ref: 'Defense Percent', verifiedAt: '2026-08-16' } as const

/** The basic effective-HP formula. */
export const EHP_FORMULA = '(Health + Defense Absolute) / (1 - Defense %)'

/** The same with Chrono Field damage reduction folded in. */
export const EHP_FORMULA_WITH_CHRONO_FIELD =
  '(Health / (1 - Chrono Field Reduction %) + Defense Absolute) / (1 - Defense %)'

/** Attack speed, whose module sub-effect is added INSIDE the enhancement multiplier. */
export const ATTACK_SPEED_FORMULA =
  '(Workshop × Lab × Card + Module Sub Effect) × Enhancement'

/**
 * Hard caps that no amount of stacking exceeds.
 *
 * These corroborate the assist-module trap list from a second, independent
 * page — the assist does not bypass them because nothing does.
 */
/**
 * UNITS WARNING. These are FRACTIONS where the assist table is PERCENT.
 *
 * `TOWER_HARD_CAPS.defensePercent` is 0.98; `ASSIST_HARD_CAPS.defensePercent`
 * is 98. Same cap, same name, two tables, two scales — so reading one and
 * applying it where the other is expected is wrong by a factor of a hundred,
 * and a hundredfold error in a defense figure produces a tower that either
 * never dies or dies instantly rather than a number anyone would call
 * suspicious.
 *
 * `tower-caps-agree.test.ts` holds the overlapping entries equal after scaling.
 */
export const TOWER_HARD_CAPS = {
  defensePercent: 0.98,
  wallRebuildSeconds: 150,
  shockwaveFrequencySeconds: 7,
  freeUpgradeChance: 0.9075,
  thornsPercent: 0.99,
  thornsPercentVsBoss: 0.495,
  maxOrbsTotal: 14,
  maxOrbsClockwise: 11,
  maxOrbsCounterClockwise: 3,
  gameSpeed: 6.25,
} as const

/**
 * Thorn percentages at which an enemy dies in a fixed number of hits.
 *
 * Thorns deals a share of an enemy's MAX health, not its current health, so the
 * damage per hit never falls as the enemy weakens — which is what makes clean
 * breakpoints exist at all. At `p` percent an enemy dies on the ceil(100/p)-th
 * hit, so the useful thresholds are the ones where that ceiling drops.
 *
 * From the community guide, which lists them as the practical targets. The
 * arithmetic is checkable and is checked in `tower-thorns.test.ts`: each entry
 * is the smallest percentage that kills in one fewer hit than the entry below.
 */
export const THORNS_KILL_BREAKPOINTS = [11, 12, 13, 15, 17, 21, 26, 34, 51] as const

/** The boss-only breakpoint, above the rest because bosses halve thorns. */
export const THORNS_BOSS_BREAKPOINT = 67

/**
 * The percent is multiplied by this to become a fraction, then by MAX health.
 *
 * `Enemy.ThornDamage` reads `Main.thornDamage`, multiplies by 0.01, and
 * multiplies THAT by `Enemy.enemyHealthMax` (field 0x88) — not `enemyHealth`
 * (0x80), which is what it later subtracts from. Two different fields, and the
 * distinction is the whole reason breakpoints exist.
 */
export const THORNS_PERCENT_TO_FRACTION = 0.01

/** `GetResistanceLevel` condition index for Thorns Resistance. */
export const THORNS_RESISTANCE_CONDITION_INDEX = 2

/**
 * Thorns inside a Protector: `damage * (labBenefit + 70) / 100`.
 *
 * Read from `Enemy.ThornDamage`:
 *
 *     fmov s0, #-30.0
 *     ldr  s1, [researchBenefitIncrease + 0x20C]   ; index 123
 *     fadd s0, s1, s0                              ; lab - 30
 *     fadd s0, s0, #100.0                          ; lab + 70
 *     fmul s0, s0, #0.01
 *     fmul d8, d8, d0                              ; damage *= that
 *
 * So the base penalty is THIRTY percent, and research 123 — `Protector Damage
 * Reduction`, 0.3 per level over 20 levels — gives back at most six points,
 * landing at 0.76. It never removes the penalty.
 *
 * The condition is `Enemy.inProtector` OR `enemyType == Protector`, so a
 * Protector takes the reduced thorns itself, not only the enemies it covers.
 */
export const THORNS_PROTECTOR_BASE_PENALTY_PERCENT = 30
export const THORNS_PROTECTOR_LAB_RESEARCH_INDEX = 123
export const THORNS_PROTECTOR_LAB_PER_LEVEL = 0.3
export const THORNS_PROTECTOR_LAB_MAX_LEVEL = 20

/** The thorns multiplier for an enemy in or being a Protector. */
export function thornsProtectorMultiplier(labBenefit = 0): number {
  return (labBenefit - THORNS_PROTECTOR_BASE_PENALTY_PERCENT + 100) / 100
}

/** Thorns is halved against bosses, so a boss needs one more hit than the table says. */
export const THORNS_BOSS_MULTIPLIER = 0.5

/**
 * Hits to kill: `floor(100 / percent) + 1`, because the kill needs to EXCEED
 * max health rather than reach it.
 *
 * Derived, not transcribed. Under `ceil(100 / p)` the minimal breakpoints would
 * be 10, 12, 13, 15, 17, 20, 25, 34, 50; the guide lists 11, 12, 13, 15, 17, 21,
 * 26, 34, 51. Those differ at exactly the four points where 100 / p divides
 * evenly and nowhere else, which is the signature of a strict comparison — at
 * 50% two hits deal exactly 100% and the enemy survives.
 *
 * So the breakpoint list is not just a table to memorise; it encodes which
 * comparison the game uses, and every entry is minimal under that rule.
 *
 * CONFIRMED against `Enemy.ThornDamage` on 2026-08-18. The kill test is:
 *
 *     fsub d0, enemyHealth, damage
 *     fcmp d0, #0.0
 *     b.pl skip_kill          ; result >= 0 -> NOT killed
 *     bl   Kill
 *
 * `b.pl` skips the kill whenever the remainder is zero or positive, so the
 * damage has to be strictly greater than the health left. Exactly 100% leaves
 * zero and the enemy survives. The inference from the breakpoints was right.
 */
export function thornsHitsToKill(percentOfMaxHealth: number, isBoss = false): number | null {
  const effective = percentOfMaxHealth * (isBoss ? THORNS_BOSS_MULTIPLIER : 1)
  if (!(effective > 0)) return null
  return Math.floor(100 / effective) + 1
}

/**
 * The firing loop's own fields, resolved from the Main field table.
 *
 * Mapped with `map-v283-methods.py`; the offsets are the dump's, so each name
 * here is the game's rather than ours.
 */
const GAME_FIRING_FIELDS = {
  origin: 'game',
  ref: 'Main.TowerFireFunction field accesses, resolved against the Main field table',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

/**
 * What `TowerFireFunction` reads to decide whether and where to fire.
 *
 * Geometry, rate, and the rapid-fire window — plus three cached "closest"
 * fields it both reads and writes, which is how targeting is memoised across
 * frames rather than recomputed from scratch.
 */
export const TOWER_FIRING_INPUT_FIELDS: readonly string[] = [
  'towerLocation',
  'towerRange',
  'towerRangeDistance',
  'radiusBeyondRange',
  'attackSpeed',
  'attackSpeedReducer',
  'rapidFireDuration',
  'rapidFireStartTime',
  'closestEnemyDistance',
  'closestTargetDistance',
  'closestEnemyInt',
]

/**
 * Rapid fire is FIVE fields, not one.
 *
 * A chance to trigger, a duration, a bool, and a start and END time. The window
 * is stored as two absolute times rather than as a remaining countdown.
 */
export const RAPID_FIRE_FIELDS: readonly string[] = [
  'rapidFireChance',
  'rapidFireDuration',
  'rapidFireBool',
  'rapidFireStartTime',
  'rapidFireEndTime',
]

/**
 * Cooldowns are not one mechanism. These are the distinct shapes.
 *
 * `ultimateWeaponCooldown` and `ultimateWeaponPlusCooldown` are SEPARATE
 * `double[]` arrays — a weapon and its UW+ ability do not share a cooldown.
 */
export const COOLDOWN_FIELD_SHAPES: Readonly<Record<string, string>> = {
  ultimateWeaponCooldown: 'double[]',
  ultimateWeaponPlusCooldown: 'double[]',
  deathRayCooldown: 'float',
  superTowerCooldown: 'float',
  tankUltimateCooldown: 'float',
  protectorUltimateCooldown: 'float',
  commanderUltimateCooldown: 'float',
  demonModeOffCooldown: 'bool',
  nukeOffCooldown: 'bool',
  missileBarrageOffCooldown: 'bool',
  towerSilencedTimeEnd: 'float',
  accumulatedFireTime: 'float',
}

/**
 * Maximum shots one accumulator drain may fire.
 *
 * `fcsel` against 1000.0f in `TowerFireFunction`, applied to the shot count
 * BEFORE the interval is subtracted — so the cap bounds the burst, not the
 * accumulator.
 */
export const FIRE_BURST_SHOT_CAP = 1000

/** The firing interval is the reciprocal of effective attack speed. */
export const FIRE_INTERVAL_IS_RECIPROCAL_OF_ATTACK_SPEED = true

/** The unique module with a dedicated field for cutting ultimate cooldowns. */
export const GALAXY_COMPRESSOR_COOLDOWN_FIELD
  = '_ultimateCooldownToReduceFromGalaxyCompressor'

export const TOWER_KNOWLEDGE_NODES: readonly KnowledgeNode[] = [
  {
    id: 'tower.firingLoop',
    label: 'How the tower decides to fire',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      '`Main.TowerFireFunction` reads the tower geometry, the attack-speed pair and the '
      + 'rapid-fire window, caches the closest target, and accumulates into `accumulatedFireTime`. '
      + '`TowerFire` then takes a pooled projectile and increments '
      + '`projectilesFiredThisRound`.',
    units: 'seconds and distances; cooldowns in seconds',
    disambiguation:
      'Firing rate is not one field. `attackSpeed` sits beside `attackSpeedReducer` and '
      + '`attackSpeedEnhancement`, and the loop reads the first two together — so a single '
      + '"attack speed" number cannot reproduce it.',
    implementedBy: [
      'TOWER_FIRING_INPUT_FIELDS',
      'RAPID_FIRE_FIELDS',
      'COOLDOWN_FIELD_SHAPES',
    ],
    traps: [
      `FIRING IS ACCUMULATED, AND THE BURST IS CAPPED AT ${FIRE_BURST_SHOT_CAP}. Read from `
      + '`TowerFireFunction`: the interval is `1 / effectiveAttackSpeed`, the accumulator gains '
      + 'delta-time each call, and while it exceeds one interval the loop divides to get a shot '
      + 'count, CLAMPS that count, subtracts `shots x interval` and carries the remainder. So a '
      + 'long frame really does fire several shots at once — a next-fire-time model drops them — '
      + 'but no frame can fire more than the cap however long it was.',
      'THE REMAINDER CARRIES. `accumulatedFireTime` keeps whatever is left after the shots are '
      + 'taken, so firing does not silently round down every frame. Resetting the accumulator to '
      + 'zero after firing loses a fraction of a shot per frame, which at high attack speed is a '
      + 'measurable rate loss rather than a rounding detail.',
      `RAPID FIRE IS ${RAPID_FIRE_FIELDS.length} FIELDS. Chance, duration, a bool, and a start `
      + 'AND end time. The window is two absolute timestamps, not a countdown, so pausing or '
      + 'changing game speed does not extend it the way a remaining-duration model would.',
      'A WEAPON AND ITS UW+ ABILITY HAVE SEPARATE COOLDOWNS. `ultimateWeaponCooldown` and '
      + '`ultimateWeaponPlusCooldown` are two `double[]` arrays. One cooldown per weapon is wrong '
      + 'by half, and the enhancement does not become available because the weapon did.',
      'COOLDOWN IS THREE DIFFERENT SHAPES. Arrays for the ultimate weapons, floats for Death Ray, '
      + 'Super Tower and the three enemy ultimates, and BOOLS for Demon Mode, Nuke and Missile '
      + 'Barrage — those three record only whether the thing is off cooldown, not when it '
      + 'returns. A uniform "cooldown remaining" model cannot represent the boolean ones.',
      'A UNIQUE MODULE HAS ITS OWN COOLDOWN FIELD. '
      + `\`${GALAXY_COMPRESSOR_COOLDOWN_FIELD}\` exists solely to cut ultimate cooldowns, so `
      + 'Galaxy Compressor is not a generic multiplier applied elsewhere — it is subtracted here, '
      + 'and a model that scales cooldowns globally will double-count it.',
      'SILENCE IS AN END TIME, NOT A FLAG. `get_TowerFireSilenced` reads '
      + '`towerSilencedTimeEnd`, so the tower is silenced until a timestamp. Toggling a boolean '
      + 'on and off reproduces the state and loses the duration.',
    ],
    assertions: [
      { subject: 'tower.firingLoop', predicate: 'firingInputFieldCount', value: TOWER_FIRING_INPUT_FIELDS.length, provenance: GAME_FIRING_FIELDS, verification: 'verified_here' as const },
      { subject: 'tower.firingLoop', predicate: 'rapidFireFieldCount', value: RAPID_FIRE_FIELDS.length, provenance: GAME_FIRING_FIELDS, verification: 'verified_here' as const },
      { subject: 'tower.firingLoop', predicate: 'rapidFireWindowIsAbsoluteTimes', value: RAPID_FIRE_FIELDS.includes('rapidFireStartTime') && RAPID_FIRE_FIELDS.includes('rapidFireEndTime'), provenance: GAME_FIRING_FIELDS, verification: 'verified_here' as const },
      { subject: 'tower.firingLoop', predicate: 'firingIsAccumulated', value: 'accumulatedFireTime' in COOLDOWN_FIELD_SHAPES, provenance: GAME_FIRING_FIELDS, verification: 'verified_here' as const },
      { subject: 'tower.firingLoop', predicate: 'burstShotCap', value: FIRE_BURST_SHOT_CAP, provenance: GAME_FIRING_FIELDS, verification: 'verified_here' as const },
      { subject: 'tower.firingLoop', predicate: 'intervalIsReciprocalOfAttackSpeed', value: FIRE_INTERVAL_IS_RECIPROCAL_OF_ATTACK_SPEED, provenance: GAME_FIRING_FIELDS, verification: 'verified_here' as const },
      { subject: 'tower.firingLoop', predicate: 'accumulatorRemainderCarries', value: true, provenance: GAME_FIRING_FIELDS, verification: 'verified_here' as const },
      { subject: 'tower.firingLoop', predicate: 'ultimateWeaponAndPlusCooldownsAreSeparate', value: COOLDOWN_FIELD_SHAPES.ultimateWeaponCooldown === 'double[]' && COOLDOWN_FIELD_SHAPES.ultimateWeaponPlusCooldown === 'double[]', provenance: GAME_FIRING_FIELDS, verification: 'verified_here' as const },
      { subject: 'tower.firingLoop', predicate: 'distinctCooldownShapes', value: new Set(Object.values(COOLDOWN_FIELD_SHAPES)).size, provenance: GAME_FIRING_FIELDS, verification: 'verified_here' as const },
      { subject: 'tower.firingLoop', predicate: 'booleanOnlyCooldowns', value: Object.values(COOLDOWN_FIELD_SHAPES).filter(shape => shape === 'bool').length, provenance: GAME_FIRING_FIELDS, verification: 'verified_here' as const },
    ],
    sources: [GAME_FIRING_FIELDS],
  },

  {
    id: 'health',
    label: 'Tower health',
    kind: 'stat',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'Maximum tower health, from 6000 workshop levels plus labs and the Health card, which '
      + 'multiplies with other multipliers. The basis of effective HP.',
    units: 'health',
    disambiguation:
      'The workshop ladder is one source among several. What it reaches alone is not the stat\'s '
      + 'ceiling — see workshop.upgradeCeiling.',
    traps: [
      'Health has 6001 workshop rows, not 6000: level 0 is a real row with a real starting value '
      + 'of 5. Counting rows to get the maximum level is off by one everywhere in that table.',
    ],
    implementedBy: ['WORKSHOP_DATA', 'TOWER_HARD_CAPS'],
    assertions: [
      { subject: 'health', predicate: 'workshopMaxLevel', value: 6000, provenance: CATALOG_TOWER },
      { subject: 'health', predicate: 'workshopRowCount', value: 6001, provenance: CATALOG_TOWER },
      { subject: 'health', predicate: 'workshopLevel0Value', value: 5, provenance: CATALOG_TOWER },
    ],
    sources: [WIKI_HEALTH, CATALOG_TOWER],
  },
  {
    id: 'tower.hardCap',
    label: 'Tower hard caps',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'Ceilings the stat cannot pass no matter how many sources feed it: Defense % at 98%, a 150s '
      + 'wall rebuild floor, a 7s shockwave frequency floor, and Thorns at 99% (49.5% against '
      + 'bosses). The commonly-listed 14 orbs and 90.75% free upgrade chance are NOT in this '
      + 'category — see the trap below. Game speed reaches 6.25x.',
    disambiguation:
      'A hard cap is where the stat stops mattering. A workshop maximum is where one source stops '
      + 'contributing, and for most stats it is well below the cap — Defense % reaches 49.5% from '
      + 'the workshop against a 98% cap.',
    traps: [
      'Thorns has two caps, and the one that applies depends on the target: 99% normally but 49.5% '
      + 'against bosses. Using the higher figure in a boss calculation doubles it.',
      'Orbs cap at 14 total but are directional — 11 clockwise and 3 counter-clockwise. A plan '
      + 'that reaches 14 by adding counter-clockwise orbs past 3 is not reachable.',
      'These caps are on the STAT, not on a source. Reaching one means further investment in any '
      + 'source is wasted, which is a different and more useful statement than "the workshop is '
      + 'maxed".',
      'TWO OF THE COMMONLY-LISTED CAPS ARE NOT ENFORCED. `GetOutOfRoundOrbCount` adds its three '
      + 'contributors and `GetOutOfRoundFreeAttackUpgradeChance` multiplies its chain; neither '
      + 'compares the result against anything. 14 orbs and 90.75% are where the contributors '
      + 'happen to top out today, not limits the game applies. A planner must not assume the game '
      + 'will stop there, and a new source would move the number with no code change — whereas '
      + 'Defense %, wall rebuild and shockwave frequency really are clamped and really will stop.',
    ],
    implementedBy: ['TOWER_HARD_CAPS'],
    assertions: [
      // The three values below were read out of the binary on 2026-08-20 and are
      // genuine enforced clamps. They carry the same provenance here as on their
      // own nodes, because they are the same constants at the same addresses.
      { subject: 'defensePercent', predicate: 'hardCap', value: TOWER_HARD_CAPS.defensePercent, provenance: GAME_DEFENSE_CAP, verification: 'verified_here' as const },
      { subject: 'wall', predicate: 'rebuildFloorSeconds', value: TOWER_HARD_CAPS.wallRebuildSeconds, provenance: GAME_WALL_FLOOR, verification: 'verified_here' as const },
      { subject: 'shockwave', predicate: 'frequencyFloorSeconds', value: TOWER_HARD_CAPS.shockwaveFrequencySeconds, provenance: GAME_SHOCKWAVE_FLOOR, verification: 'verified_here' as const },
      { subject: 'thorns', predicate: 'hardCap', value: TOWER_HARD_CAPS.thornsPercent, provenance: WIKI_THORNS },
      { subject: 'thorns', predicate: 'hardCapVsBoss', value: TOWER_HARD_CAPS.thornsPercentVsBoss, provenance: WIKI_THORNS },
      // These two are NOT clamps. See GAME_NO_CLAMP: the methods that produce
      // them contain no bound at all, so the figures are descriptive maxima —
      // where the contributors happen to top out — and belong on this node with
      // that caveat rather than alongside the enforced caps above.
      { subject: 'orb', predicate: 'maxTotal', value: TOWER_HARD_CAPS.maxOrbsTotal, provenance: GAME_NO_CLAMP, verification: 'verified_here' as const },
      { subject: 'freeUpgradeChance', predicate: 'hardCap', value: TOWER_HARD_CAPS.freeUpgradeChance, provenance: GAME_NO_CLAMP, verification: 'verified_here' as const },
      { subject: 'orb', predicate: 'maxClockwise', value: TOWER_HARD_CAPS.maxOrbsClockwise, provenance: WIKI_ORBS },
      { subject: 'orb', predicate: 'maxCounterClockwise', value: TOWER_HARD_CAPS.maxOrbsCounterClockwise, provenance: WIKI_ORBS },
      { subject: 'tower', predicate: 'maxGameSpeed', value: TOWER_HARD_CAPS.gameSpeed, provenance: WIKI_GAME_SPEED },
    ],
    sources: [
      WIKI_DEFENSE_PERCENT, WIKI_THORNS, WIKI_ORBS, WIKI_WALL, WIKI_SHOCKWAVE, WIKI_FREE_UPGRADES,
      WIKI_GAME_SPEED, GAME_DEFENSE_CAP, GAME_WALL_FLOOR, GAME_SHOCKWAVE_FLOOR, GAME_NO_CLAMP,
    ],
  },
  {
    id: 'effectiveHp',
    label: 'Effective HP (eHP)',
    kind: 'stat',
    summary:
      `eHP = ${EHP_FORMULA}. With Chrono Field damage reduction it becomes `
      + `${EHP_FORMULA_WITH_CHRONO_FIELD}. It is the damage needed to reach zero health in a `
      + 'single hit.',
    units: 'health',
    traps: [
      'Defense absolute is added to health INSIDE the numerator, before the defense-percent '
      + 'division — it is not subtracted from incoming damage in this formula.',
      'Chrono Field reduction divides HEALTH only, not the whole numerator. Applying it outside '
      + 'gives a different and wrong answer.',
      'With recovery packages, substitute the highest reachable health rather than max base '
      + 'health — but only if the packages can realistically be used at that hit rate.',
      'eHP is a single-hit measure. It says nothing about sustain, which is where regen, '
      + 'lifesteal and the wall live.',
    ],
    implementedBy: ['EHP_FORMULA', 'TOWER_HARD_CAPS'],
    assertions: [
      // Confirmed in the binary: the clamp is 98.0 in PERCENT, which is this
      // 0.98 in the fraction units the oracle uses. Same quantity; the kind of
      // difference that reads as a factor-of-100 contradiction if nobody says so.
      { subject: 'effectiveHp', predicate: 'defensePercentCap', value: TOWER_HARD_CAPS.defensePercent, provenance: GAME_DEFENSE_CAP, verification: 'verified_here' as const },
      // The cap is what makes eHP finite. At 100% reduction the formula divides
      // by zero, so the cap is not a balance decision to model around -- it is
      // the reason the number exists at all.
      { subject: 'effectiveHp', predicate: 'formulaDividesByOneMinusDefense', value: true, provenance: WIKI_HEALTH },
    ],
    sources: [{ ...WIKI_HEALTH, section: 'Effective HP (eHP)' }, GAME_DEFENSE_CAP],
  },
  {
    id: 'attackSpeed',
    label: 'Attack speed',
    kind: 'stat',
    summary:
      `Projectiles fired per unit time. ${ATTACK_SPEED_FORMULA}. 99 workshop levels from a base of `
      + '1.00, +0.05 each, to 5.95.',
    units: 'projectiles per second (approximately)',
    traps: [
      'The module sub-effect is ADDED inside the parentheses and the Card does NOT apply to it. '
      + 'A chain that multiplies the card across everything overstates any build with an attack '
      + 'speed sub-effect.',
      'It is not linearly projectiles-per-second. Returns diminish at medium speeds and diminish '
      + 'further above 40. Treating it as a linear rate overstates high-attack-speed builds.',
      'It also governs projectile travel speed — until the Light Speed Shots lab, after which '
      + 'travel speed is decoupled (except Energy Net and Plasma Cannon).',
    ],
    implementedBy: ['ATTACK_SPEED_FORMULA'],
    assertions: [
      // All three confirmed against the extracted workshop table on 2026-08-20.
      // The table stores float32, so the step reads 0.049999952 and the ceiling
      // 5.950000286 — the SAME numbers at the precision the game keeps them in.
      // Treating that spread as a disagreement would have buried three real
      // confirmations under an artefact of the extraction.
      { subject: 'attackSpeed', predicate: 'workshopBase', value: 1, provenance: GAME_WORKSHOP_TABLE, verification: 'verified_here' as const },
      { subject: 'attackSpeed', predicate: 'workshopStep', value: 0.05, provenance: GAME_WORKSHOP_TABLE, verification: 'verified_here' as const },
      { subject: 'attackSpeed', predicate: 'workshopMax', value: 5.95, provenance: GAME_WORKSHOP_TABLE, verification: 'verified_here' as const },
      // Derived from the three above, so the quoted ceiling cannot drift away
      // from the ladder that produces it.
      // Derived from the three above, and independently confirmed: the table's
      // highest level really is 99, across 100 rows including level 0. The
      // row-count-versus-level distinction is the one that once offered a Card
      // Mastery a tenth level that does not exist.
      { subject: 'attackSpeed', predicate: 'workshopLevels', value: Math.round((5.95 - 1) / 0.05), provenance: GAME_WORKSHOP_TABLE, verification: 'verified_here' as const },
    ],
    // The wiki formed these claims; the extracted workshop table confirmed all
    // four on 2026-08-20. Both sources are kept: the wiki is where the
    // formula prose comes from, the table is what makes the numbers primary.
    sources: [{ ...WIKI_ATTACK_SPEED, section: 'Formula' }, GAME_WORKSHOP_TABLE],
  },
  {
    id: 'rule.gameSpeed',
    label: 'Game speed',
    kind: 'rule',
    summary:
      'Accelerates everything timer-driven. Reaches ×6.25 with the Game Speed perk and a maxed '
      + 'Standard Perk Bonus lab, displayed as 6.3.',
    units: 'multiplier',
    traps: [
      'THE STATED SPEED IS NOT THE REAL SPEED. The wiki states ×5.0 behaves closer to ×4.0 and '
      + '×6.25 closer to ×5. Any coins-per-hour or waves-per-hour projection using the nominal '
      + 'multiplier is optimistic by roughly 20%, silently. This has a mechanism, not just '
      + 'anecdote: `Main$$GameSpeedModifier` looks up a per-speed factor from a ladder of '
      + 'thresholds rather than scaling time linearly.',
      'Because it scales timers, it changes ultimate weapon and bot uptime as well as wave pace — '
      + 'it is not merely a wall-clock convenience.',
    ],
    implementedBy: ['TOWER_HARD_CAPS'],
    assertions: [
      // Stays wiki-sourced deliberately. The binary has no 6.25 and no symbol
      // for either operand of the perk arithmetic that produces it.
      { subject: 'rule.gameSpeed', predicate: 'maxMultiplier', value: TOWER_HARD_CAPS.gameSpeed, provenance: WIKI_GAME_SPEED },
      { subject: 'rule.gameSpeed', predicate: 'displayedValueIsRounded', value: true, provenance: WIKI_GAME_SPEED },
      // What IS primary: the top of the base ladder, before any perk.
      { subject: 'rule.gameSpeed', predicate: 'baseLadderTopMultiplier', value: 5, provenance: GAME_SPEED_LADDER, verification: 'verified_here' as const },
      { subject: 'rule.gameSpeed', predicate: 'scalesViaPerSpeedModifierLookup', value: true, provenance: GAME_SPEED_LADDER, verification: 'verified_here' as const },
    ],
    sources: [{ ...WIKI_GAME_SPEED, section: 'Rounds' }, GAME_SPEED_LADDER],
  },
  {
    id: 'orb',
    label: 'Orbs',
    kind: 'entity',
    summary:
      'Rotating projectiles that instantly kill most enemies on contact. Up to 11 clockwise and 3 '
      + 'counter-clockwise (Extra Orbs) — 14 in total across workshop, perk, sub-module, assist '
      + 'and vault sources.',
    units: 'count',
    traps: [
      'Orbs do NOT kill bosses, elites, or enemies shielded by a Protector. Only the Orb Boss Hit '
      + 'lab lets them touch bosses, for at most 2% of max health per hit.',
      'The workshop alone gives 4 orbs. Reaching 10 clockwise needs a perk, an Ancestral Armor '
      + 'sub-effect, a 100%-efficiency assist sub-effect and a vault node — five separate systems, '
      + 'so an orb count is never a single-source read.',
      'Extra Orbs rotate the other way and are a separate unlock via card and lab.',
    ],
    implementedBy: ['TOWER_HARD_CAPS'],
    assertions: [
      // Descriptive, not enforced — `GetOutOfRoundOrbCount` adds its three
      // contributors and compares the result against nothing. See GAME_NO_CLAMP.
      { subject: 'orb', predicate: 'maxTotal', value: TOWER_HARD_CAPS.maxOrbsTotal, provenance: GAME_NO_CLAMP, verification: 'verified_here' as const },
      { subject: 'orb', predicate: 'maxClockwise', value: TOWER_HARD_CAPS.maxOrbsClockwise, provenance: WIKI_ORBS },
      { subject: 'orb', predicate: 'maxCounterClockwise', value: TOWER_HARD_CAPS.maxOrbsCounterClockwise, provenance: WIKI_ORBS },
      // The two directions must account for the total. They are separate caps,
      // and 11 + 3 is the only reason 14 is reachable -- a build that maxes one
      // direction cannot reach the total on that direction alone.
      { subject: 'orb', predicate: 'directionsSumToTotal', value: TOWER_HARD_CAPS.maxOrbsClockwise + TOWER_HARD_CAPS.maxOrbsCounterClockwise === TOWER_HARD_CAPS.maxOrbsTotal, provenance: WIKI_ORBS, verification: 'verified_here' as const },
    ],
    sources: [WIKI_ORBS, GAME_NO_CLAMP, communityGuideSource('kitchensalt-reverse-orb')],
  },
  {
    id: 'thorns',
    label: 'Thorn damage',
    kind: 'stat',
    summary:
      'Deals a percentage of an enemy\'s max health back when it hits the tower. 99 workshop '
      + 'levels to 99%, halved against bosses at 49.5%.',
    units: 'percent of enemy max health',
    validRange:
      `Breakpoints at ${THORNS_KILL_BREAKPOINTS.join(', ')} percent, each the smallest value `
      + `that kills in one fewer hit; ${THORNS_BOSS_BREAKPOINT} percent is the boss equivalent.`,
    implementedBy: ['THORNS_KILL_BREAKPOINTS', 'thornsHitsToKill'],
    assertions: [
      {
        subject: 'thorns',
        predicate: 'scalesOffMaxHealth',
        value: true,
        provenance: GAME_THORNS,
        verification: 'verified_here',
      },
      {
        subject: 'thorns',
        predicate: 'bossMultiplier',
        value: THORNS_BOSS_MULTIPLIER,
        provenance: WIKI_THORNS,
      },
      {
        subject: 'thorns',
        predicate: 'breakpointCount',
        value: THORNS_KILL_BREAKPOINTS.length,
        provenance: COMMUNITY_GUIDE,
      },
      {
        subject: 'thorns',
        predicate: 'killRequiresExceedingMaxHealth',
        value: true,
        provenance: GAME_THORNS,
        verification: 'verified_here',
      },
      {
        subject: 'thorns',
        predicate: 'scalesOffEnemyField',
        value: 'enemyHealthMax',
        provenance: GAME_THORNS,
        verification: 'verified_here',
      },
      {
        subject: 'thorns',
        predicate: 'resistanceConditionIndex',
        value: THORNS_RESISTANCE_CONDITION_INDEX,
        provenance: GAME_THORNS,
        verification: 'verified_here',
      },
      {
        subject: 'thorns',
        predicate: 'protectorPenaltyPercent',
        value: THORNS_PROTECTOR_BASE_PENALTY_PERCENT,
        provenance: GAME_THORNS,
        verification: 'verified_here',
      },
      {
        subject: 'thorns',
        // Same predicate as the game's value on purpose, so the detector
        // reports the disagreement instead of it sitting here as prose.
        predicate: 'protectorPenaltyPercent',
        value: 60,
        provenance: WIKI_THORNS,
        verification: 'contradicted',
      },
      {
        subject: 'thorns',
        predicate: 'protectorLabResearchIndex',
        value: THORNS_PROTECTOR_LAB_RESEARCH_INDEX,
        provenance: GAME_THORNS,
        verification: 'verified_here',
      },
      {
        subject: 'thorns',
        predicate: 'bossBreakpointPercent',
        value: THORNS_BOSS_BREAKPOINT,
        provenance: COMMUNITY_GUIDE,
      },
    ],
    traps: [
      'Thorns does NOT trigger lifesteal, so a lifesteal-sustain model must exclude it.',
      'It is halved against bosses and reduced inside a Protector — but by THIRTY percent, not '
      + 'the sixty the wiki gives. Sixty is the Protector\'s GENERAL damage reduction; thorns '
      + 'takes its own path with its own constant and its own lab, and conflating the two '
      + 'understates thorns against exactly the enemy that most needs killing.',
      'The tower does not need to take damage for thorns to fire.',
      'IT SCALES OFF MAX HEALTH, NOT CURRENT. Damage per hit is constant for a given enemy, so '
      + 'hits-to-kill is a step function and the value only matters where the step falls. '
      + 'Between breakpoints more thorns buys literally nothing — 13% and 14% both kill in eight '
      + 'hits.',
      'THE KILL NEEDS TO EXCEED MAX HEALTH, NOT REACH IT, which is why the breakpoints sit one '
      + 'point above the round numbers: 51 rather than 50, 26 rather than 25, 21 rather than 20. '
      + 'At 50% two hits deal exactly 100% and the enemy survives to a third. A model using '
      + '`ceil(100 / percent)` is right at five of the nine breakpoints and wrong at four, always '
      + 'in the optimistic direction.',
      'The breakpoints are where the investment is, and they are NOT evenly spaced: '
      + `${THORNS_KILL_BREAKPOINTS.join(', ')}. A linear "more is better" model recommends `
      + 'upgrades that change no outcome.',
      `Bosses halve it, so the boss breakpoint is ${THORNS_BOSS_BREAKPOINT} percent — roughly `
      + 'double, and reachable much later. A build that clears normal enemies in two hits still '
      + 'needs three on a boss.',
      'ARMOUR EATS A THORNS HIT WHOLE. `ThornDamage` decrements `Enemy.enemyArmor` and RETURNS '
      + 'before computing any damage, so under the Armored Enemies battle condition the first N '
      + 'thorns hits do nothing at all. The breakpoint table is a count of DAMAGING hits and says '
      + 'nothing about how many hits it takes to get there.',
      'Wall thorns RAMP. `timesHitByWallThorns` increments every hit and feeds unique benefit 42, '
      + 'which adds `damage x hits x 0.01` — so consecutive hits on the same enemy get stronger. '
      + 'A flat per-hit model understates a long engagement and the breakpoints move.',
      'THE PROTECTOR PENALTY APPLIES TO PROTECTORS THEMSELVES. The condition is '
      + '`Enemy.inProtector` OR `enemyType == Protector`, so a lone Protector with nothing in its '
      + 'radius still takes reduced thorns. A model that only checks coverage misses the case '
      + 'where it matters most.',
      `The ${THORNS_PROTECTOR_LAB_RESEARCH_INDEX} lab, Protector Damage Reduction, gives back at `
      + `most ${THORNS_PROTECTOR_LAB_PER_LEVEL * THORNS_PROTECTOR_LAB_MAX_LEVEL} percentage `
      + `points over ${THORNS_PROTECTOR_LAB_MAX_LEVEL} levels, taking the multiplier from `
      + `${thornsProtectorMultiplier(0).toFixed(2)} to `
      + `${thornsProtectorMultiplier(THORNS_PROTECTOR_LAB_PER_LEVEL * THORNS_PROTECTOR_LAB_MAX_LEVEL).toFixed(2)}. `
      + 'It never removes the penalty, so "max the lab and ignore protectors" is wrong.',
      `Thorns resistance is condition index ${THORNS_RESISTANCE_CONDITION_INDEX}, applied through `
      + '`GetResistanceLevel` as a multiplier and only when the counter-lab level is at least 1. '
      + 'It multiplies the damage AFTER the max-health scaling and before the boss halving.',
    ],
    // Listed because this node's own assertions already cite it. Omitting it
    // scored the node as wiki-sourced while its claims came from elsewhere.
    sources: [WIKI_THORNS, COMMUNITY_GUIDE, GAME_THORNS],
  },
  {
    id: 'wall',
    label: 'Wall',
    kind: 'entity',
    summary:
      'A destructible barrier whose health is a percentage of tower health — 20% at unlock rising '
      + 'to 200% across 1800 upgrades. Rebuilds over time; the hard cap on rebuild is 150s.',
    traps: [
      'Wall health is a SHARE of tower health, so every health upgrade also raises it. Modelling '
      + 'it as a flat pool decouples two things the game ties together.',
      'It does not block enemies while rebuilding, so uptime — not just health — determines its '
      + 'value.',
      'The workshop floor for rebuild is 600s; the 150s hard cap is only reachable with other '
      + 'sources.',
    ],
    implementedBy: ['TOWER_HARD_CAPS'],
    assertions: [
      { subject: 'wall', predicate: 'rebuildSecondsCap', value: TOWER_HARD_CAPS.wallRebuildSeconds, provenance: GAME_WALL_FLOOR, verification: 'verified_here' as const },
      { subject: 'wall', predicate: 'rebuildImprovesDownward', value: true, provenance: WIKI_WALL },
    ],
    sources: [WIKI_WALL, GAME_WALL_FLOOR],
  },
  {
    id: 'shockwave',
    label: 'Shockwave',
    kind: 'entity',
    summary:
      'A periodic wave pushing enemies away from the tower. Workshop reduces frequency from 20s to '
      + '14s across 40 levels; the hard cap is 7s.',
    traps: [
      'Bosses are not pushed.',
      'The workshop floor (14s) and the hard cap (7s) are different numbers. Using the workshop '
      + 'floor as the cap understates what other sources can reach.',
    ],
    implementedBy: ['TOWER_HARD_CAPS'],
    assertions: [
      { subject: 'shockwave', predicate: 'frequencySecondsCap', value: TOWER_HARD_CAPS.shockwaveFrequencySeconds, provenance: GAME_SHOCKWAVE_FLOOR, verification: 'verified_here' as const },
      { subject: 'shockwave', predicate: 'frequencyImprovesDownward', value: true, provenance: WIKI_SHOCKWAVE },
    ],
    sources: [WIKI_SHOCKWAVE, GAME_SHOCKWAVE_FLOOR],
  },
  {
    id: 'freeUpgrades',
    label: 'Free upgrades',
    kind: 'stat',
    summary:
      'A per-wave chance for an Attack, Defense or Utility upgrade to level for free. Three '
      + 'separate chances of up to 49.5% each from the workshop, capped at 90.75% with card and perk.',
    units: 'percent',
    traps: [
      'Above 100% the excess is a chance at a SECOND upgrade — 110% means 90% chance of one and '
      + '10% chance of two. Clamping to 100% discards a real effect.',
      'It never selects a maxed stat, so no roll is wasted while anything remains upgradable.',
      'The Wave Skip card grants an extra trigger per workshop for each skipped wave.',
    ],
    implementedBy: ['TOWER_HARD_CAPS'],
    assertions: [
      // Descriptive, not enforced — `GetOutOfRoundFreeAttackUpgradeChance`
      // multiplies its chain and bounds nothing. See GAME_NO_CLAMP.
      { subject: 'freeUpgrades', predicate: 'chanceCap', value: TOWER_HARD_CAPS.freeUpgradeChance, provenance: GAME_NO_CLAMP, verification: 'verified_here' as const },
      { subject: 'freeUpgrades', predicate: 'workshopChancesAreSeparate', value: true, provenance: WIKI_FREE_UPGRADES },
    ],
    sources: [WIKI_FREE_UPGRADES, GAME_NO_CLAMP],
  },
]

export const TOWER_KNOWLEDGE_EDGES: readonly KnowledgeEdge[] = [
  {
    from: 'tower.firingLoop',
    kind: 'scales',
    to: 'attackSpeed',
    note:
      'The loop reads attackSpeed together with attackSpeedReducer, so the rate is a pair rather '
      + 'than the single stat the upgrade screen shows.',
    sources: [GAME_FIRING_FIELDS],
  },

  {
    from: 'tower.hardCap',
    kind: 'caps',
    to: 'effectiveHp',
    note:
      'Defense % stops at 98% however many sources feed it, which bounds eHP from above no matter '
      + 'how much defense is stacked.',
    sources: [WIKI_DEFENSE_PERCENT],
  },
  {
    from: 'tower.hardCap',
    kind: 'caps',
    to: 'orb',
    note: '14 orbs total, and directional — 11 clockwise, 3 counter-clockwise.',
    sources: [WIKI_ORBS],
  },
  {
    from: 'health',
    kind: 'scales',
    to: 'effectiveHp',
    note: 'Health is the numerator of the eHP formula, before defense absolute is added to it.',
    sources: [{ ...WIKI_HEALTH, section: 'Effective HP (eHP)' }],
  },
  {
    from: 'defensePercent',
    kind: 'scales',
    to: 'effectiveHp',
    note: 'eHP divides by (1 − Defense %), so the 98% cap is also a cap on eHP multiplication.',
    sources: [{ ...WIKI_HEALTH, section: 'Effective HP (eHP)' }],
  },
  {
    from: 'defenseAbsolute',
    kind: 'scales',
    to: 'effectiveHp',
    note: 'Added to health inside the numerator — not subtracted from incoming damage here.',
    sources: [{ ...WIKI_HEALTH, section: 'Effective HP (eHP)' }],
  },
  {
    from: 'health',
    kind: 'scales',
    to: 'wall',
    note: 'Wall health is a percentage of tower health, so the two rise together.',
    sources: [WIKI_WALL],
  },
  {
    from: 'attackSpeed',
    kind: 'scales',
    to: 'damage',
    note: 'More projectiles per second means more damage applied, though not linearly.',
    sources: [WIKI_ATTACK_SPEED],
  },
  {
    from: 'rule.gameSpeed',
    kind: 'scales',
    to: 'ultimateWeapon',
    note:
      'Game speed accelerates every timer, including UW cooldowns — but the real multiplier is '
      + 'below the displayed one, so uptime gains are overstated by the nominal value.',
    sources: [{ ...WIKI_GAME_SPEED, section: 'Rounds' }],
  },
  {
    from: 'thorns',
    kind: 'independentOf',
    to: 'lifesteal',
    note: 'Thorns damage does not trigger lifesteal, despite both being damage the tower deals.',
    sources: [WIKI_THORNS],
  },
  {
    from: 'enemy.protector',
    kind: 'caps',
    to: 'thorns',
    note: 'Protectors cut thorn damage by 60% for enemies in range, and block orbs entirely.',
    sources: [WIKI_THORNS],
  },
  {
    from: 'enemy.boss',
    kind: 'caps',
    to: 'orb',
    note: 'Bosses and elites are immune to orb insta-kill; the Orb Boss Hit lab caps at 2% max health.',
    sources: [{ ...WIKI_ORBS, section: 'Orb Damage' }],
  },
  {
    from: 'freeUpgrades',
    kind: 'scales',
    to: 'health',
    note: 'Free Defense upgrades level defensive workshop stats mid-run at no cash cost.',
    sources: [WIKI_FREE_UPGRADES],
  },
  {
    from: 'shockwave',
    kind: 'independentOf',
    to: 'enemy.boss',
    note: 'Shockwave pushes enemies away from the tower but never moves a boss.',
    sources: [WIKI_SHOCKWAVE],
  },
]
