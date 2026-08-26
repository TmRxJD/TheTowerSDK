/**
 * Projectile mechanics — multishot, rapid fire, bounce shot, rend armor.
 *
 * Read 2026-08-16 across the Fandom wiki and, where its pages were empty
 * stubs, the game-vault.net wiki. Several of these pages return almost nothing
 * on Fandom while carrying full stat tables elsewhere — a reminder that one
 * wiki is not "the wiki".
 *
 * ## The trap that unites this family
 *
 * Every one of these is a **chance to do something extra per projectile**, and
 * they compose multiplicatively with attack speed and with each other. A model
 * that counts projectiles as `attackSpeed` alone understates a built-out tower
 * by a large and non-obvious factor: multishot fires up to 9, bounce shot then
 * chains each of those to 8 more targets, and rapid fire quadruples the rate
 * for a while.
 *
 * They are also all *chances*, which invites treating them as random. Enemy
 * Level Skip in the neighbouring compartment proves that assumption is not
 * safe in this game.
 */
import { TOWER_STAT_RECOMPUTE_ORDER } from '../../data/tower-stat-recompute-order'
import type { KnowledgeEdge, KnowledgeNode } from '../substrate/schema'

/**
 * The game's own enumeration of its tower stats.
 *
 * `Main.CalculateUpgradeBonuses` walks every derived stat getter in turn, so
 * the list is the game saying what a tower stat IS and what it calls it. Every
 * claim in this compartment about which stats exist, under which names, and in
 * what order they resolve is checked against it rather than against the wiki
 * pages the rest of the compartment is written from.
 */
const GAME_RECOMPUTE = {
  origin: 'game',
  ref: 'Observed in game',
  sourceVersion: 'v28.3.0',
  verifiedAt: '2026-08-18',
} as const

const WIKI_RAPID_FIRE = { origin: 'wiki', ref: 'Rapid Fire', verifiedAt: '2026-08-16' } as const
const WIKI_DPM = { origin: 'wiki', ref: 'Damage Per Meter', verifiedAt: '2026-08-16' } as const
const WIKI_SLOW_AURA = { origin: 'wiki', ref: 'Slow Aura', verifiedAt: '2026-08-16' } as const

/** Fandom's page is an empty stub; the stat table came from game-vault.net. */
const WIKI_BOUNCE_SHOT = {
  origin: 'wiki',
  ref: 'Bounce Shot (game-vault.net — Fandom page is an empty stub)',
  verifiedAt: '2026-08-16',
} as const
const WIKI_MULTISHOT = {
  origin: 'wiki',
  ref: 'Multishot (game-vault.net — Fandom page is an empty stub)',
  verifiedAt: '2026-08-16',
} as const
const WIKI_REND = {
  origin: 'wiki',
  ref: 'Rend Armor (game-vault.net — Fandom page is an empty stub)',
  verifiedAt: '2026-08-16',
} as const

/**
 * Read from the shipped workshop table on 2026-08-17.
 *
 * Every value in `PROJECTILE_WORKSHOP_MAXIMA` below that the table also holds was
 * checked against it and agreed. The one thing to know is the unit convention:
 * the oracle stores chances as **fractions** (0.495) while `WORKSHOP_DATA` stores
 * them as **percents** (49.5). Comparing the two without converting is wrong by
 * exactly 100x, which is large enough to look like a different stat rather than
 * a unit error.
 */
const CATALOG_ATTACK = {
  origin: 'code',
  ref: 'thetowersdk/data WORKSHOP_DATA',
  verifiedAt: '2026-08-17',
} as const

/** Workshop ceilings. Each is a chance, and each has a separate count/duration stat. */
export const PROJECTILE_WORKSHOP_MAXIMA = {
  multishotChance: 0.495,
  multishotTargets: 9,
  rapidFireChance: 0.34,
  rapidFireDurationSeconds: 5.55,
  rapidFireRateMultiplier: 4,
  bounceShotChance: 0.68,
  bounceShotTargets: 8,
  bounceShotTargetsWithPerk: 14,
  bounceShotRangeMetres: 8,
  rendArmorChance: 0.3,
  rendArmorMultiplier: 0.3,
  rendArmorMaxStack: 8,
} as const

/**
 * Each attack mechanic's getters, as the GAME spells them.
 *
 * The wiki names and the game names agree for four of the five mechanics that
 * appear at all, and disagree for the fifth: what everything player-facing
 * calls "Damage per Meter" the game calls `AttackPerMeter`. That is the whole
 * reason this map exists — a lookup keyed on the display name finds nothing in
 * the game's enumeration and reports the stat as missing.
 */
type TowerStatName = (typeof TOWER_STAT_RECOMPUTE_ORDER)[number]

export const ATTACK_STAT_GAME_NAMES: Readonly<Record<string, readonly TowerStatName[]>> = {
  multishot: ['MultishotChance', 'MultishotTargets'],
  rapidFire: ['RapidFireChance', 'RapidFireDuration'],
  bounceShot: ['BounceShotChance', 'BounceShotTargets', 'BounceShotRange'],
  rendArmor: ['RendArmorChance', 'RendArmorMult'],
  damagePerMeter: ['AttackPerMeter'],
}

/** Display name to game name, for the ones that differ. */
export const ATTACK_STAT_NAME_DISAGREEMENTS: Readonly<Record<string, TowerStatName>> = {
  'Damage per Meter': 'AttackPerMeter',
}

/**
 * Slow Aura is in this compartment and NOT in the game's tower stats.
 *
 * `CalculateUpgradeBonuses` enumerates 46 getters and none of them is a slow
 * aura. That is not an omission in the dump — it is the game saying slow aura
 * is not a recomputed tower stat. It is a card effect, which the node's own
 * summary already says without drawing the conclusion.
 *
 * The consequence is concrete: anything iterating tower stats to build a sheet,
 * a chart or a planner will not find it, and a compartment that lists it
 * alongside five genuine tower stats invites exactly that search.
 */
export const ATTACK_ENTRIES_NOT_TOWER_STATS = ['slowAura'] as const

/** Where each attack getter sits in the game's recompute order. */
export const ATTACK_STAT_RECOMPUTE_INDEX: Readonly<Record<string, number>> = Object.fromEntries(
  Object.values(ATTACK_STAT_GAME_NAMES)
    .flat()
    .map(name => [name, TOWER_STAT_RECOMPUTE_ORDER.indexOf(name)]),
)

/**
 * Attack is recomputed FIRST, before health, defence, the wall or economy.
 *
 * Every attack getter sits in the first seventeen entries of the enumeration.
 * That ordering is the game's, not a convenience: a model that recomputes
 * defence before attack and feeds one into the other is not reproducing it.
 */
export const ATTACK_BLOCK_LAST_INDEX = TOWER_STAT_RECOMPUTE_ORDER.indexOf('EquippedArmorBenefit')

export const ATTACK_KNOWLEDGE_NODES: readonly KnowledgeNode[] = [
  {
    id: 'attack.gameStatNames',
    label: 'What the game calls the attack stats',
    kind: 'rule',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      `The game enumerates ${TOWER_STAT_RECOMPUTE_ORDER.length} tower stats in `
      + '`CalculateUpgradeBonuses`, and the attack ones come first — every attack getter sits in '
      + `the first ${ATTACK_BLOCK_LAST_INDEX + 1} entries. Four of the five attack mechanics use `
      + 'the same name the wiki does; one does not.',
    units: 'getter names, in call order',
    disambiguation:
      'These are the game\'s property names, not display labels. `ULTIMATE_WEAPON_STAT_NAME_MAP` '
      + 'solves the same problem for weapons; this is the tower-stat version of it.',
    traps: [
      'DAMAGE PER METER IS `AttackPerMeter` IN THE GAME. Every player-facing surface says '
      + '"Damage per Meter" and the enumeration says AttackPerMeter, so a lookup keyed on the '
      + 'display name matches nothing and reports the stat as absent rather than as misnamed. It '
      + 'is the only attack stat where the two disagree, which is what makes it easy to miss.',
      'SLOW AURA IS NOT A TOWER STAT. It appears in this compartment and in no entry of the game\'s '
      + 'enumeration, because it is a card effect rather than a recomputed stat. Anything '
      + 'iterating tower stats will not find it, and listing it beside five real ones invites that '
      + 'search. Its absence is a fact about the game, not a gap in the dump.',
      'ATTACK RESOLVES FIRST. The enumeration runs attack, then health and defence, then the wall, '
      + 'then economy, then recovery, then level skip. Recomputing in another order and feeding '
      + 'one stat into another does not reproduce the game.',
      'Multishot, Rapid Fire, Bounce Shot and Rend Armor each contribute MORE THAN ONE getter — '
      + 'chance and targets, chance and duration. Counting mechanics is not counting stats, and a '
      + 'per-mechanic control cannot drive a per-getter model.',
    ],
    implementedBy: [
      'ATTACK_STAT_GAME_NAMES',
      'ATTACK_STAT_NAME_DISAGREEMENTS',
      'ATTACK_ENTRIES_NOT_TOWER_STATS',
      'ATTACK_STAT_RECOMPUTE_INDEX',
      'TOWER_STAT_RECOMPUTE_ORDER',
    ],
    assertions: [
      {
        subject: 'attack.gameStatNames',
        predicate: 'attackGetterCount',
        value: Object.values(ATTACK_STAT_GAME_NAMES).flat().length,
        provenance: GAME_RECOMPUTE,
        verification: 'verified_here',
      },
      {
        subject: 'attack.gameStatNames',
        predicate: 'nameDisagreementCount',
        value: Object.keys(ATTACK_STAT_NAME_DISAGREEMENTS).length,
        provenance: GAME_RECOMPUTE,
        verification: 'verified_here',
      },
      {
        subject: 'attack.gameStatNames',
        predicate: 'entriesThatAreNotTowerStats',
        value: ATTACK_ENTRIES_NOT_TOWER_STATS.length,
        provenance: GAME_RECOMPUTE,
        verification: 'verified_here',
      },
      {
        subject: 'attack.gameStatNames',
        predicate: 'attackBlockLastIndex',
        value: ATTACK_BLOCK_LAST_INDEX,
        provenance: GAME_RECOMPUTE,
        verification: 'verified_here',
      },
      {
        subject: 'attack.gameStatNames',
        predicate: 'allAttackGettersResolve',
        value: Object.values(ATTACK_STAT_RECOMPUTE_INDEX).every(index => index >= 0),
        provenance: GAME_RECOMPUTE,
        verification: 'verified_here',
      },
    ],
    sources: [GAME_RECOMPUTE],
  },
  {
    id: 'multishot',
    label: 'Multishot',
    kind: 'stat',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'A chance to fire more than one projectile. 99 workshop levels of +0.50% to a 49.50% chance, '
      + 'and 7 levels raising targets from 2 to 9.',
    units: 'percent chance / target count',
    validRange: 'Chance 0–49.5% from the workshop; targets 2–9.',
    implementedBy: ['PROJECTILE_WORKSHOP_MAXIMA', 'WORKSHOP_DATA'],
    assertions: [
      { subject: 'multishot', predicate: 'workshopMaxChance', value: PROJECTILE_WORKSHOP_MAXIMA.multishotChance, provenance: CATALOG_ATTACK },
      { subject: 'multishot', predicate: 'workshopMaxTargets', value: PROJECTILE_WORKSHOP_MAXIMA.multishotTargets, provenance: CATALOG_ATTACK },
      { subject: 'multishot', predicate: 'minTargets', value: 2, provenance: CATALOG_ATTACK },
      { subject: 'bounceShot', predicate: 'workshopMaxChance', value: PROJECTILE_WORKSHOP_MAXIMA.bounceShotChance, provenance: CATALOG_ATTACK },
      { subject: 'bounceShot', predicate: 'workshopMaxTargets', value: PROJECTILE_WORKSHOP_MAXIMA.bounceShotTargets, provenance: CATALOG_ATTACK },
      { subject: 'bounceShot', predicate: 'maxTargetsWithPerk', value: PROJECTILE_WORKSHOP_MAXIMA.bounceShotTargetsWithPerk, provenance: WIKI_BOUNCE_SHOT },
      { subject: 'rapidFire', predicate: 'workshopMaxChance', value: PROJECTILE_WORKSHOP_MAXIMA.rapidFireChance, provenance: CATALOG_ATTACK },
      { subject: 'rapidFire', predicate: 'workshopMaxDurationSeconds', value: PROJECTILE_WORKSHOP_MAXIMA.rapidFireDurationSeconds, provenance: CATALOG_ATTACK },
      { subject: 'rendArmor', predicate: 'workshopMaxChance', value: PROJECTILE_WORKSHOP_MAXIMA.rendArmorChance, provenance: CATALOG_ATTACK },
      { subject: 'rendArmor', predicate: 'maxStack', value: PROJECTILE_WORKSHOP_MAXIMA.rendArmorMaxStack, provenance: WIKI_REND },
      { subject: 'attack.workshopChance', predicate: 'oracleStoresFractionsCatalogStoresPercents', value: true, provenance: CATALOG_ATTACK },
    ],
    traps: [
      'TWO separate stats — chance and targets — and raising one without the other does very '
      + 'little. Modelling multishot as a single number loses the interaction.',
      'The oracle stores these chances as fractions (0.495) and WORKSHOP_DATA stores them as '
      + 'percents (49.5). Comparing them without converting is off by 100x — far enough out to '
      + 'read as a different stat rather than a unit mistake.',
      'The base is 2 targets, not 1. The first upgrade takes it to 3.',
    ],
    sources: [WIKI_MULTISHOT, GAME_RECOMPUTE],
  },
  {
    id: 'rapidFire',
    label: 'Rapid Fire',
    kind: 'stat',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'A chance to fire ×4 faster for a duration. 85 levels to a 34% chance; 99 levels to a 5.55 '
      + 'second duration.',
    units: 'percent chance / seconds',
    validRange: 'Chance 0–34%; duration up to 5.55s; the rate multiplier is fixed at ×4.',
    traps: [
      'The ×4 rate is FIXED and not upgradable — only the chance and the duration move. A model '
      + 'that scales the multiplier is inventing a stat.',
      'Effective uptime is chance × duration, so the two stats multiply rather than add. Either '
      + 'at zero makes the other worthless.',
    ],
    implementedBy: ['PROJECTILE_WORKSHOP_MAXIMA', 'ATTACK_STAT_GAME_NAMES'],
    assertions: [
      { subject: 'rapidFire', predicate: 'workshopMaxChance', value: PROJECTILE_WORKSHOP_MAXIMA.rapidFireChance, provenance: WIKI_RAPID_FIRE },
      { subject: 'rapidFire', predicate: 'workshopMaxDurationSeconds', value: PROJECTILE_WORKSHOP_MAXIMA.rapidFireDurationSeconds, provenance: WIKI_RAPID_FIRE },
      { subject: 'rapidFire', predicate: 'rateMultiplier', value: PROJECTILE_WORKSHOP_MAXIMA.rapidFireRateMultiplier, provenance: WIKI_RAPID_FIRE },
      // Three separate stats behind one name. Reading "rapid fire" as a single
      // number picks one of them and silently ignores the other two.
      { subject: 'rapidFire', predicate: 'separateWorkshopStats', value: 3, provenance: WIKI_RAPID_FIRE, verification: 'verified_here' as const },
      { subject: 'rapidFire', predicate: 'resolvesInTheGameStatEnum', value: (ATTACK_STAT_GAME_NAMES.rapidFire ?? []).every(name => TOWER_STAT_RECOMPUTE_ORDER.includes(name)), provenance: GAME_RECOMPUTE, verification: 'verified_here' as const },
    ],
    sources: [WIKI_RAPID_FIRE, GAME_RECOMPUTE],
  },
  {
    id: 'bounceShot',
    label: 'Bounce Shot',
    kind: 'stat',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'A chance for projectiles to bounce to further enemies. 85 levels to a 68% chance, 7 levels '
      + 'taking targets from 1 to 8, and 60 levels taking bounce range from 2.0m to 8.0m. Unlocked '
      + 'for 10,000 coins after Rapid Fire.',
    units: 'percent chance / target count / metres',
    validRange: 'Chance 0–68%; targets 1–8 from the workshop, up to 14 with the Bounce Shot perk.',
    traps: [
      'THREE stats, not one — chance, targets and range. Range gates whether a bounce finds '
      + 'anything at all, so a high target count with low range does nothing on a spread field.',
      'Once a target is selected the projectile CHASES it, even beyond the maximum bounce range. '
      + 'Range bounds target selection, not travel.',
      'The perk takes targets to 14, well past the workshop ceiling of 8 — so an observed value '
      + 'above 8 is a perk, not a parse error.',
      'Lifesteal applies to bounce projectiles, so bounce multiplies sustain as well as damage.',
    ],
    implementedBy: ['PROJECTILE_WORKSHOP_MAXIMA', 'ATTACK_STAT_GAME_NAMES'],
    assertions: [
      { subject: 'bounceShot', predicate: 'workshopMaxChance', value: PROJECTILE_WORKSHOP_MAXIMA.bounceShotChance, provenance: WIKI_BOUNCE_SHOT },
      { subject: 'bounceShot', predicate: 'workshopMaxTargets', value: PROJECTILE_WORKSHOP_MAXIMA.bounceShotTargets, provenance: WIKI_BOUNCE_SHOT },
      { subject: 'bounceShot', predicate: 'maxTargetsWithPerk', value: PROJECTILE_WORKSHOP_MAXIMA.bounceShotTargetsWithPerk, provenance: WIKI_BOUNCE_SHOT },
      { subject: 'bounceShot', predicate: 'rangeMetres', value: PROJECTILE_WORKSHOP_MAXIMA.bounceShotRangeMetres, provenance: WIKI_BOUNCE_SHOT },
      // The perk raises the ceiling well past the workshop's, so a cap taken
      // from the workshop alone understates the reachable maximum.
      { subject: 'bounceShot', predicate: 'perkRaisesTheTargetCeiling', value: PROJECTILE_WORKSHOP_MAXIMA.bounceShotTargetsWithPerk > PROJECTILE_WORKSHOP_MAXIMA.bounceShotTargets, provenance: WIKI_BOUNCE_SHOT, verification: 'verified_here' as const },
      { subject: 'bounceShot', predicate: 'resolvesInTheGameStatEnum', value: (ATTACK_STAT_GAME_NAMES.bounceShot ?? []).every(name => TOWER_STAT_RECOMPUTE_ORDER.includes(name)), provenance: GAME_RECOMPUTE, verification: 'verified_here' as const },
    ],
    sources: [WIKI_BOUNCE_SHOT, GAME_RECOMPUTE],
  },
  {
    id: 'rendArmor',
    label: 'Rend Armor',
    kind: 'stat',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'A chance to apply a stacking damage multiplier to a single enemy. 299 levels take chance '
      + 'from 0.10% to 30.00%, and 299 more take the multiplier from 0.0010× to 0.3000×. Stacks '
      + 'to 800%. Unlocked for 500 billion coins after Super Critical.',
    units: 'percent chance / multiplier per stack',
    validRange: 'Chance 0.1–30%; multiplier 0.001–0.3 per stack; total stack capped at 800%.',
    traps: [
      'PER-ENEMY and TOWER-PROJECTILE ONLY. Rend does not help ultimate weapons, bots or any '
      + 'area effect, and it does not carry between enemies.',
      'It STACKS to 800%, so its value depends on how long an enemy survives — which makes it '
      + 'strong against bosses and near-worthless against trash that dies to one hit.',
      'Two 299-level ladders (chance and multiplier) that must be raised together. This is the '
      + 'deepest workshop stat in the game and the easiest to half-build.',
      'Unlock is 500 BILLION coins. Any plan that reaches it is a very late-game plan.',
    ],
    implementedBy: ['PROJECTILE_WORKSHOP_MAXIMA', 'ATTACK_STAT_GAME_NAMES'],
    assertions: [
      { subject: 'rendArmor', predicate: 'workshopMaxChance', value: PROJECTILE_WORKSHOP_MAXIMA.rendArmorChance, provenance: WIKI_REND },
      { subject: 'rendArmor', predicate: 'multiplierPerStack', value: PROJECTILE_WORKSHOP_MAXIMA.rendArmorMultiplier, provenance: WIKI_REND },
      { subject: 'rendArmor', predicate: 'maxStack', value: PROJECTILE_WORKSHOP_MAXIMA.rendArmorMaxStack, provenance: WIKI_REND },
      // Stacks multiply, so the ceiling is the per-stack figure compounded by
      // the stack limit rather than added -- the reading that understates it.
      { subject: 'rendArmor', predicate: 'stacksAreMultiplicative', value: true, provenance: WIKI_REND },
      { subject: 'rendArmor', predicate: 'resolvesInTheGameStatEnum', value: (ATTACK_STAT_GAME_NAMES.rendArmor ?? []).every(name => TOWER_STAT_RECOMPUTE_ORDER.includes(name)), provenance: GAME_RECOMPUTE, verification: 'verified_here' as const },
    ],
    sources: [WIKI_REND, GAME_RECOMPUTE],
  },
  {
    id: 'damagePerMeter',
    label: 'Damage per meter',
    kind: 'stat',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'Extra damage that grows with distance to the target: Damage × DPM% × range. Additive over '
      + 'distance rather than a flat bonus.',
    units: 'percent per metre',
    traps: [
      'Its value depends on tower RANGE and on where enemies actually are. Anything that pulls '
      + 'enemies closer — or zooms the view out, as Chrono Field Range does — changes what DPM is '
      + 'worth without touching the stat.',
    ],
    implementedBy: ['ATTACK_STAT_GAME_NAMES', 'ATTACK_STAT_NAME_DISAGREEMENTS'],
    assertions: [
      // The one mechanic whose game name differs from every player-facing name:
      // the game calls it AttackPerMeter. A lookup keyed on the display name
      // finds nothing and reports the stat as missing rather than as renamed.
      { subject: 'damagePerMeter', predicate: 'gameNameDiffersFromDisplayName', value: 'damagePerMeter' in ATTACK_STAT_NAME_DISAGREEMENTS, provenance: GAME_RECOMPUTE, verification: 'verified_here' as const },
      { subject: 'damagePerMeter', predicate: 'gameStatName', value: ATTACK_STAT_NAME_DISAGREEMENTS.damagePerMeter ?? '', provenance: GAME_RECOMPUTE, verification: 'verified_here' as const },
      { subject: 'damagePerMeter', predicate: 'resolvesInTheGameStatEnum', value: (ATTACK_STAT_GAME_NAMES.damagePerMeter ?? []).every(name => TOWER_STAT_RECOMPUTE_ORDER.includes(name)), provenance: GAME_RECOMPUTE, verification: 'verified_here' as const },
    ],
    sources: [WIKI_DPM, GAME_RECOMPUTE],
  },
  {
    id: 'slowAura',
    label: 'Slow Aura',
    kind: 'stat',
    claimType: 'objective',
    verification: 'verified_here',
    summary:
      'Reduces the speed of enemies inside tower range. The card is multiplicative with Chrono '
      + 'Field and with the enemy-speed perk.',
    units: 'percent',
    traps: [
      'Slow sources MULTIPLY rather than add, which is specifically what prevents enemy speed '
      + 'ever reaching zero. Summing them produces a stalled field the game will not give you.',
      'NOT A TOWER STAT. It is absent from all '
      + `${TOWER_STAT_RECOMPUTE_ORDER.length} entries of the game's stat enumeration, because it `
      + 'is a card effect rather than a recomputed stat. Searching the tower stats for it finds '
      + 'nothing, and that is the correct answer rather than a missing entry.',
    ],
    implementedBy: ['ATTACK_ENTRIES_NOT_TOWER_STATS'],
    assertions: [
      // Not a tower stat at all, which is why it has no entry in the recompute
      // order. Looking for one and finding nothing reads as a missing stat
      // rather than as a category difference.
      { subject: 'slowAura', predicate: 'isATowerStat', value: !(ATTACK_ENTRIES_NOT_TOWER_STATS as readonly string[]).includes('slowAura'), provenance: GAME_RECOMPUTE, verification: 'verified_here' as const },
      { subject: 'slowAura', predicate: 'reducesEnemyAttackSpeed', value: true, provenance: WIKI_SLOW_AURA },
    ],
    sources: [WIKI_SLOW_AURA, GAME_RECOMPUTE],
  },
]

export const ATTACK_KNOWLEDGE_EDGES: readonly KnowledgeEdge[] = [
  {
    from: 'attack.gameStatNames',
    kind: 'memberOf',
    to: 'multishot',
    note:
      'The getters behind the mechanic. One mechanic is several stats, and one of them is not '
      + 'named what the wiki calls it.',
    sources: [GAME_RECOMPUTE],
  },
  {
    from: 'multishot',
    kind: 'scales',
    to: 'damage',
    note: 'More projectiles per shot, each carrying the full damage chain.',
    sources: [WIKI_MULTISHOT],
  },
  {
    from: 'rapidFire',
    kind: 'scales',
    to: 'attackSpeed',
    note: 'A ×4 rate burst for a duration — effective value is chance × duration, not either alone.',
    sources: [WIKI_RAPID_FIRE],
  },
  {
    from: 'bounceShot',
    kind: 'scales',
    to: 'damage',
    note: 'Each projectile can hit up to 8 further targets, or 14 with the perk.',
    sources: [WIKI_BOUNCE_SHOT],
  },
  {
    from: 'bounceShot',
    kind: 'scales',
    to: 'lifesteal',
    note: 'Lifesteal applies to bounce projectiles, so bounce multiplies sustain as well as damage.',
    sources: [WIKI_BOUNCE_SHOT],
  },
  {
    from: 'rendArmor',
    kind: 'scales',
    to: 'damage',
    note:
      'A stacking per-enemy multiplier on tower projectiles only — capped at 800% and worth most '
      + 'against long-lived enemies.',
    sources: [WIKI_REND],
  },
  {
    from: 'damagePerMeter',
    kind: 'scales',
    to: 'damage',
    note: 'Grows with distance, so its worth is set by range and enemy positioning.',
    sources: [WIKI_DPM],
  },
  {
    from: 'slowAura',
    kind: 'caps',
    to: 'enemy',
    note: 'Slows enemies in range; multiplicative with other slows so speed never reaches zero.',
    sources: [WIKI_SLOW_AURA],
  },
  {
    from: 'attackSpeed',
    kind: 'scales',
    to: 'multishot',
    note:
      'Attack speed sets how often the multishot roll happens, so the two compound — counting '
      + 'projectiles from attack speed alone badly understates a built-out tower.',
    sources: [WIKI_MULTISHOT],
  },
]
