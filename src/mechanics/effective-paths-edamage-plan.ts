/**
 * Effective Paths — planning an eDamage path.
 *
 * Five paths across four currencies, and the shape is the same each time: rank
 * every candidate by what a level costs against what it does to *effective
 * damage as a whole*, take the best, repeat.
 *
 * Scoring against the whole model rather than against the stat is what makes
 * it work. Attack Speed pays through bullets per second, through Rapid Fire
 * *and* through Chain Lightning's proc rate; Spotlight's angle pays through
 * every other weapon. A per-stat score would rank all three wrong.
 *
 * The candidate lists are not written again here. They are the transcribed
 * matrices in `effective-paths-edamage-candidates.ts`, paired by position with
 * the level keys in `effective-paths-edamage-levels.ts` — and a test asserts
 * the pairing rather than trusting it.
 */

import {
  EFFECTIVE_DAMAGE_CANDIDATES,
} from './effective-paths-edamage-candidates'
import {
  ZERO_EFFECTIVE_DAMAGE_LEVELS,
} from './effective-paths-edamage-levels'
import type {
  EffectiveDamageCoinLevels,
  EffectiveDamageKeysLevels,
  EffectiveDamageLabLevels,
  EffectiveDamageLevels,
  EffectiveDamageStoneLevels,
} from './effective-paths-edamage-levels'
import { computeEffectiveDamage } from './effective-paths-edamage-compute'
import { checkEffectiveDamageInputs } from './effective-paths-edamage-schema'
import type { EffectiveDamageInputIssue } from './effective-paths-edamage-schema'
import type { DamageCard, EffectiveDamageConfig } from './effective-paths-edamage-config'
import {
  keysCandidateCost,
  keysCandidateMaxLevel,
  resolveUltimateWeaponStat,
  ultimateWeaponMaxLevel,
  ultimateWeaponStoneCost,
} from './effective-paths-edamage-costs'
import {
  assistEfficiencyStoneCost,
  maxStoneLevel,
} from './effective-paths-assist-efficiency'
import {
  MODULE_COIN_PATH_MAX_LEVEL,
  MODULE_COIN_PATH_MIN_LEVEL,
  moduleUpgradeCoinCost,
} from './effective-paths-coin-costs'
import {
  enhancementCoinCost,
  enhancementMaxLevel,
} from './effective-paths-enhancement-costs'
import type { WorkshopEnhancementDiscounts } from './effective-paths-enhancement-costs'
import {
  labCoinCostToReachLevel,
  labDurationDaysToReachLevel,
  labMaxCatalogLevel,
} from './effective-paths-lab-costs'
import type { LabCostModifiers } from './effective-paths-lab-costs'
import {
  appendSkipExclusions,
  assertPathVariant,
  type PathSkip,
  planPath,
} from './effective-paths-planner'
import type { PathStep, PathUpgrade } from './effective-paths-planner'

/**
 * The paths the sheet publishes.
 *
 * The lab tab is one candidate list priced two ways — in research days or in
 * coins — because which of the two binds depends on the player, so it is two
 * variants rather than one.
 */
export type EffectiveDamagePlanVariant
  = 'lab-time' | 'lab-coins' | 'stone' | 'coin' | 'keys'

/** Which half of {@link EffectiveDamageLevels} a candidate moves. */
export type EffectiveDamageBand = 'lab' | 'stone' | 'coin' | 'keys'

/** The variants that read each band's candidate list. */
/** Every variant the damage planner answers to. The lab band has two names. */
export const DAMAGE_PLAN_VARIANTS: readonly EffectiveDamagePlanVariant[] = [
  'lab-time', 'lab-coins', 'stone', 'coin', 'keys',
]

const BAND_VARIANTS: Readonly<Record<EffectiveDamageBand, readonly EffectiveDamagePlanVariant[]>> = {
  lab: ['lab-time', 'lab-coins'],
  stone: ['stone'],
  coin: ['coin'],
  keys: ['keys'],
}

/**
 * The one lab whose sheet name is not its catalog name.
 *
 * Every other one of the 32 resolves directly; this is Chain Lightning's, and
 * the sheet drops the weapon from the label.
 */
const LAB_NAME_ALIASES: Readonly<Record<string, string>> = {
  'Shock Multiplier': 'chain_lightning_shock_multiplier',
}

/** The coin path's workshop enhancements, which the sheet suffixes with `+`. */
/**
 * Workshop enhancements do not exist until their lab is bought.
 *
 * `eDamage Coins!EZ2` opens with `'Master Sheet'!$F$5 <> 1` — row 5 of the lab
 * list is "Workshop Enhancements", a single-level lab. Until it is bought there
 * is nothing to buy, and a planner that does not know this spends the coin path
 * on upgrades the player cannot reach.
 */
export const WORKSHOP_ENHANCEMENTS_LAB = 'Workshop Enhancements'

/**
 * Lab candidates whose prerequisite the sheet checks before offering them.
 *
 * From `eDamage!FV2:GA2`, the lab band's hide row. Each of these multiplies
 * something that has to exist first, so with the prerequisite unmet its gain is
 * zero — and a zero still wins a tie-break, which is how a fresh account's
 * damage path filled up with upgrades that do nothing. Same defect the weapon
 * gates fixed, one layer along.
 *
 * One more in that row is **not** listed here: Shock Multiplier gates on
 * `AND($BH$31, $AL$75)`, and neither cell is identified. Guessing would be
 * inventing a rule.
 */
const LAB_PREREQUISITES: Readonly<Record<string, (config: EffectiveDamageConfig) => boolean>> = {
  // `NOT($AY$43)`. Row 43 of the cards block is the **Damage Mastery card**,
  // not the master switch — `AT41` is the Name header and `AT42` is Damage. So
  // the lab needs that one card, not merely cards being on: reading it as the
  // master switch offers the lab to a player who has cards but not this one.
  'Damage Mastery': config => card(config, 'Damage Mastery'),
  // `NOT(AND($AY$61, $AY$63))` — perks on, and the Damage perk among them.
  'Standard Perks Bonus': config => config.perksEquipped && config.perks.Damage,
  // `NOT(AND($AY$61, $AY$65))` — `AY65` is the third perk row, Boss Health.
  'Improve Trade-off Perks': config =>
    config.perksEquipped && config.perks['Boss Health Trade-off'],
  // `NOT(AND($AY$39, $AY$58))` — the cards switch at the block's head, and row
  // 58, which `AT58` names "Demon Mode Mastery ⚠️".
  'Demon Mode Mastery': config =>
    config.cardsEquipped && card(config, 'Demon Mode Mastery'),
  /*
   * `NOT(AND($BH$31, $AL$75))`.
   *
   * `BH31` is Chain Lightning: the ultimate weapon flags run down rows 30 to 37
   * in `DAMAGE_ULTIMATE_WEAPONS` order, and three of those rows are confirmed
   * independently — 33 is Spotlight in this model's own notes, 35 and 37 are
   * Poison Swamp and Inner Land Mines in the stone tab's hide row, and `BG34`
   * is literally labelled `SLM`.
   *
   * `AL75` is the Shock Multiplier lab's own unlocked flag — `AK75` names it
   * "Shock Mult ⚠️". That half is **not** checked here: the planner has no lab
   * unlock state of its own, and the sheet's other unlock clause runs through
   * `IDS_LAB_HAS_UNLOCKED`, which `isLabUnlockedAt` only approximates. The
   * weapon half is the one that stops a wrong recommendation.
   */
  'Shock Multiplier': config =>
    Boolean(config.ultimateWeapons['Chain Lightning']?.unlocked),
}

/** Whether a card is equipped and switched on, as the cards block reads it. */
function card(config: EffectiveDamageConfig, name: DamageCard): boolean {
  return config.cardsEquipped && Boolean(config.cards[name]?.active)
}

const ENHANCEMENT_SUFFIX = ' +'

/** The coin path's four module candidates, which buy levels rather than a lab. */
const MODULE_CANDIDATES = new Set([
  'Primary Module - Cannon',
  'Assist Module - Cannon',
  'Primary Module - Core',
  'Assist Module - Core',
])

/** The stone path's assist capacities, and which ladder each one climbs. */
const ASSIST_STONE_KINDS: Readonly<Record<string, 'multiplier' | 'substat'>> = {
  'Assist Module Bonus - Cannon': 'multiplier',
  'Assist Module Bonus - Core': 'multiplier',
  'Assist Module Substats - Cannon': 'substat',
  'Assist Module Substats - Armor': 'substat',
  'Assist Module Substats - Core': 'substat',
}

/** A candidate, resolved to the level it moves and the price of moving it. */
export interface EffectiveDamageUpgrade {
  /** `lab.damage`, `stone.deathWaveDamage` — unique across all four bands. */
  id: string
  band: EffectiveDamageBand
  /** The key within that band's level object. */
  key: string
  sheetName: string
  /**
   * The matrix column, kept so a reader can find it on the sheet.
   *
   * **Relative to the band's own tab**, which is the part worth stating: each
   * band is a separate tab, and its columns only mean anything against that one.
   *
   *   lab    -> eDamage
   *   stone  -> eDamage Stone
   *   coin   -> eDamage Coins
   *   keys   -> eDamage Keys
   *
   * Checked against row 4 of each: all 97 columns resolve to a header matching
   * their `sheetName`. Reading a coin column against `eDamage` instead lands in
   * an unrelated block whose headers are lab names — near enough to look like an
   * off-by-one and waste an hour, which is why the mapping is written down.
   *
   * Metadata only. Nothing reads the sheet with it.
   */
  column: string
}

/** The level keys of each band, in the order the candidate matrices list them. */
const BAND_KEYS: Readonly<Record<EffectiveDamageBand, readonly string[]>> = {
  lab: Object.keys(ZERO_EFFECTIVE_DAMAGE_LEVELS.lab),
  stone: Object.keys(ZERO_EFFECTIVE_DAMAGE_LEVELS.stone),
  coin: Object.keys(ZERO_EFFECTIVE_DAMAGE_LEVELS.coin),
  keys: Object.keys(ZERO_EFFECTIVE_DAMAGE_LEVELS.keys),
}

/**
 * Every candidate on every path, paired with the level it moves.
 *
 * The pairing is positional: the matrix lists candidates in the same order the
 * level interface declares them, which is deliberate and is asserted by a test
 * rather than assumed here.
 */
export const EFFECTIVE_DAMAGE_UPGRADES: readonly EffectiveDamageUpgrade[]
  = (['lab', 'stone', 'coin', 'keys'] as const).flatMap(band =>
    EFFECTIVE_DAMAGE_CANDIDATES[band].map((candidate, index) => ({
      id: `${band}.${BAND_KEYS[band][index]}`,
      band,
      key: BAND_KEYS[band][index],
      sheetName: candidate.sheetName,
      column: candidate.column,
    })),
  )

export interface EffectiveDamagePlanOptions {
  config: EffectiveDamageConfig
  /** Where the player is now. */
  levels: EffectiveDamageLevels
  variant: EffectiveDamagePlanVariant
  /** How many steps to plan. The sheet's grid tops out at 145. */
  steps?: number
  /** Per-upgrade caps, by upgrade id, when the catalog has none to read. */
  maxLevels?: Readonly<Record<string, number>>
  /** Player-imposed stops below the maximum, by upgrade id. */
  targetLevels?: Readonly<Record<string, number>>
  /**
   * Whether the Workshop Enhancements lab is bought. Absent means yes, so a
   * caller that knows nothing about it gets the behaviour it had before.
   */
  workshopEnhancementsUnlocked?: boolean
  /** Upgrades to leave out entirely — the sheet's "Hide non-unlocked". */
  excludeIds?: readonly string[]
  /** Lab coin discount and lab speed. */
  labModifiers?: LabCostModifiers
  /** Module upgrade coin discount, as a percentage. */
  moduleDiscountPercent?: number
  /** Workshop discount labs and the vault discount, for the coin path. */
  enhancementDiscounts?: WorkshopEnhancementDiscounts
}

export interface EffectiveDamagePlan {
  steps: PathStep[]
  /** Effective damage before any of it. */
  startingEffectiveDamage: number
  /** Effective damage after the last step. */
  finalEffectiveDamage: number
  /** Candidates left out, and why. A path that silently drops half the game is worse than one that says so. */
  excluded: Array<{ sheetName: string, reason: string }>
  /**
   * Why the inputs could not be planned against, when they could not.
   *
   * Empty on every normal call. Non-empty means something upstream handed over
   * a `NaN`, a level that is not a number, or a record missing keys — and the
   * plan is empty rather than a confident ranking built on it.
   */
  issues: EffectiveDamageInputIssue[]
}

/** The catalog name for a lab candidate. */
function labName(sheetName: string): string {
  return LAB_NAME_ALIASES[sheetName] ?? sheetName
}

/** The enhancement stat behind a `"Damage +"` style candidate, if it is one. */
function enhancementStat(sheetName: string): string | null {
  return sheetName.endsWith(ENHANCEMENT_SUFFIX)
    ? sheetName.slice(0, -ENHANCEMENT_SUFFIX.length)
    : null
}

/**
 * The highest level a candidate can reach on a given path, or `null` when
 * nothing prices one — in which case it is excluded rather than guessed at.
 */
function resolveMaxLevel(upgrade: EffectiveDamageUpgrade): number | null {
  if (upgrade.band === 'keys') return keysCandidateMaxLevel(upgrade.sheetName)

  if (upgrade.band === 'lab') {
    const max = labMaxCatalogLevel(labName(upgrade.sheetName))
    return max > 0 ? max : null
  }

  if (upgrade.band === 'stone') {
    const kind = ASSIST_STONE_KINDS[upgrade.sheetName]
    if (kind) return maxStoneLevel(kind)
    const stat = resolveUltimateWeaponStat(upgrade.sheetName)
    return stat ? ultimateWeaponMaxLevel(stat.weapon, stat.stat) : null
  }

  // The coin path buys three different kinds of thing.
  if (MODULE_CANDIDATES.has(upgrade.sheetName)) return MODULE_COIN_PATH_MAX_LEVEL
  const enhancement = enhancementStat(upgrade.sheetName)
  if (enhancement) return enhancementMaxLevel(enhancement)

  // Everything else on the coin path is a lab, bought with coins instead of time.
  const max = labMaxCatalogLevel(labName(upgrade.sheetName))
  return max > 0 ? max : null
}

/**
 * Plan an eDamage path.
 *
 * Candidates keep their matrix order, because the planner breaks a tie by
 * taking the earliest — which is the sheet taking the leftmost column.
 */
export function planEffectiveDamagePath(
  options: EffectiveDamagePlanOptions,
): EffectiveDamagePlan {
  const { config, levels, variant } = options
  const steps = options.steps ?? 145
  const skipped = new Set(options.excludeIds ?? [])

  assertPathVariant(variant, DAMAGE_PLAN_VARIANTS, 'damage')

  /**
   * The boundary check, run once here rather than inside `evaluate`.
   *
   * `evaluate` runs once per candidate per step — thousands of times for a
   * long path — and the inputs do not change between those calls. Checking
   * here costs one parse and catches the same thing.
   */
  const check = checkEffectiveDamageInputs(config, levels)
  if (!check.ok) {
    return {
      steps: [],
      startingEffectiveDamage: 0,
      finalEffectiveDamage: 0,
      excluded: [],
      issues: check.issues,
    }
  }

  const upgrades: PathUpgrade[] = []
  const excluded: EffectiveDamagePlan['excluded'] = []
  const byId = new Map(EFFECTIVE_DAMAGE_UPGRADES.map(upgrade => [upgrade.id, upgrade]))

  for (const upgrade of EFFECTIVE_DAMAGE_UPGRADES) {
    if (!BAND_VARIANTS[upgrade.band].includes(variant)) continue

    if (skipped.has(upgrade.id)) {
      excluded.push({ sheetName: upgrade.sheetName, reason: 'not unlocked yet' })
      continue
    }

    // `eDamage Stone!EY2` and its neighbours gate a weapon's stats on the
    // weapon itself — `NOT($BH$35)` for Poison Swamp, `NOT($BH$37)` for Inner
    // Land Mines. Without it the planner spends stones on a weapon the player
    // does not own: the gain is zero, but a zero still wins a tie-break.
    const prerequisite = LAB_PREREQUISITES[upgrade.sheetName]
    if (upgrade.band === 'lab' && prerequisite && !prerequisite(config)) {
      excluded.push({
        sheetName: upgrade.sheetName,
        reason: 'what it multiplies is not taken yet',
      })
      continue
    }

    if (options.workshopEnhancementsUnlocked === false
      && upgrade.sheetName.endsWith(ENHANCEMENT_SUFFIX)) {
      excluded.push({
        sheetName: upgrade.sheetName,
        reason: `the ${WORKSHOP_ENHANCEMENTS_LAB} lab is not bought yet`,
      })
      continue
    }

    const weaponStat = upgrade.band === 'stone'
      ? resolveUltimateWeaponStat(upgrade.sheetName)
      : null
    if (weaponStat && !config.ultimateWeapons[
      weaponStat.weapon as keyof typeof config.ultimateWeapons
    ]?.unlocked) {
      excluded.push({ sheetName: upgrade.sheetName, reason: 'the weapon is not unlocked' })
      continue
    }

    const level = levelOf(levels, upgrade)

    // Below 160 a module level is cheaper in shards, so the coin path leaves
    // it alone — the same rule the eHP coin path follows.
    if (MODULE_CANDIDATES.has(upgrade.sheetName) && level < MODULE_COIN_PATH_MIN_LEVEL) {
      excluded.push({
        sheetName: upgrade.sheetName,
        reason: `below level ${MODULE_COIN_PATH_MIN_LEVEL}, where shards are cheaper`,
      })
      continue
    }

    const maxLevel = options.maxLevels?.[upgrade.id] ?? resolveMaxLevel(upgrade)
    if (maxLevel === null) {
      excluded.push({ sheetName: upgrade.sheetName, reason: 'no maximum level known' })
      continue
    }

    upgrades.push({
      id: upgrade.id,
      name: upgrade.sheetName,
      level,
      maxLevel,
      targetLevel: options.targetLevels?.[upgrade.id],
    })
  }

  const skips: PathSkip[] = []
  const planned = planPath({
    upgrades,
    steps,
    evaluate: current => {
      const next = withLevels(levels, current)
      return computeEffectiveDamage(config, next).effectiveDamage
    },
    cost: (id, nextLevel) => {
      const upgrade = byId.get(id)
      if (!upgrade) return Number.NaN
      return costOf(upgrade, nextLevel, variant, options) ?? Number.NaN
    },
    onSkip: skip => skips.push(skip),
  })

  // Every candidate the loop passed over, named with the number that
  // disqualified it, so a short path can be explained rather than guessed at.
  appendSkipExclusions(excluded, planned, skips)

  const startingEffectiveDamage = computeEffectiveDamage(config, levels).effectiveDamage

  return {
    steps: planned,
    startingEffectiveDamage,
    finalEffectiveDamage: planned.length
      ? planned[planned.length - 1].value
      : startingEffectiveDamage,
    excluded,
    issues: [],
  }
}

/** What it costs to take a candidate to `nextLevel`, in the path's currency. */
function costOf(
  upgrade: EffectiveDamageUpgrade,
  nextLevel: number,
  variant: EffectiveDamagePlanVariant,
  options: EffectiveDamagePlanOptions,
): number | null {
  if (upgrade.band === 'keys') return keysCandidateCost(upgrade.sheetName, nextLevel)

  if (upgrade.band === 'stone') {
    const kind = ASSIST_STONE_KINDS[upgrade.sheetName]
    if (kind) return assistEfficiencyStoneCost(kind, nextLevel)
    const stat = resolveUltimateWeaponStat(upgrade.sheetName)
    return stat ? ultimateWeaponStoneCost(stat.weapon, stat.stat, nextLevel) : null
  }

  if (upgrade.band === 'coin') {
    if (MODULE_CANDIDATES.has(upgrade.sheetName)) {
      // The table is keyed by the level being left, not the one bought.
      return moduleUpgradeCoinCost(nextLevel - 1, {
        discountLabLevel: options.moduleDiscountPercent,
      })
    }
    const enhancement = enhancementStat(upgrade.sheetName)
    if (enhancement) {
      return enhancementCoinCost(enhancement, nextLevel, options.enhancementDiscounts)
    }
    return labCoinCostToReachLevel(
      labName(upgrade.sheetName), nextLevel, options.labModifiers,
    )
  }

  return variant === 'lab-time'
    ? labDurationDaysToReachLevel(labName(upgrade.sheetName), nextLevel, options.labModifiers)
    : labCoinCostToReachLevel(labName(upgrade.sheetName), nextLevel, options.labModifiers)
}

/**
 * A candidate's current level.
 *
 * ## Why the coin band adds the lab band
 *
 * Fourteen keys exist in both — the seven masteries, the assist capacities and
 * the two dissonant echoes — and on the sheet they are **one level**, offered
 * at two prices. `eDamage!GK5` prices the next mastery level as `CD5 + 1`, and
 * `CD` is the single level block; the fourth block that looks like a second one
 * carries headers and no formulas.
 *
 * The two are split here because the compute reads them as
 * `lab.X + levels.coin.X` in thirteen places: the lab band holds what the
 * player has, and the coin band accumulates what a coin path buys on top. That
 * makes `levels.coin[key]` an increment, not a level — so reading it alone
 * offered a maxed mastery from level one, which is exactly what the Coins tab
 * did.
 *
 * Adding them gives the planner the real level while leaving the compute's sums
 * correct: a step raises the increment, and both sides agree on the total.
 */
function levelOf(levels: EffectiveDamageLevels, upgrade: EffectiveDamageUpgrade): number {
  switch (upgrade.band) {
    case 'lab': return levels.lab[upgrade.key as keyof EffectiveDamageLabLevels]
    case 'stone': return levels.stone[upgrade.key as keyof EffectiveDamageStoneLevels]
    case 'coin': {
      const shared = levels.lab[upgrade.key as keyof EffectiveDamageLabLevels] ?? 0
      return levels.coin[upgrade.key as keyof EffectiveDamageCoinLevels] + shared
    }
    case 'keys': return levels.keys[upgrade.key as keyof EffectiveDamageKeysLevels]
  }
}

/** The player's levels with a step's purchases applied. */
function withLevels(
  levels: EffectiveDamageLevels,
  current: ReadonlyMap<string, number>,
): EffectiveDamageLevels {
  const next: EffectiveDamageLevels = {
    lab: { ...levels.lab },
    stone: { ...levels.stone },
    coin: { ...levels.coin },
    keys: { ...levels.keys },
  }
  for (const [id, level] of current) {
    const [band, key] = id.split('.') as [EffectiveDamageBand, string]
    ;(next[band] as unknown as Record<string, number>)[key] = level
  }
  return next
}
