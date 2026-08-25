/**
 * Effective Paths — the complete eHP model.
 *
 * `effective-paths-hp.ts` holds the individual stats. This wires all of them
 * together the way the sheet's eHP grid does, so that one function takes a
 * player's whole state and returns the number the path maximises — and so the
 * planner has an `evaluate` that responds to every upgrade it can choose.
 *
 * The sheet's composition, in its own terms:
 *
 * ```text
 * eHP = (health × armor × pool × chrono × chain + defenseAbsolute)
 *       × defenseMultiplier × tradeOff
 * ```
 *
 * where `pool` is wall health plus max recovery when either is in play and 1
 * when neither is, and the three reductions become survival multipliers.
 *
 * ## The seventeen upgrades
 *
 * Every upgrade the eHP path can buy enters through {@link EffectiveHealthLevels}.
 * Several are not the obvious ones:
 *
 * - **Standard Perks Bonus** scales every perk, so it feeds health, defense
 *   absolute and defense percent at once.
 * - **Assist Module Substats — Armor** is a lab that raises assist substat
 *   *capacity*, so it multiplies the assist half of four different stats.
 * - **Assist Module Substats — Generator** does the same for max recovery.
 * - **Assist Module Bonus — Armor** raises assist bonus capacity, which only
 *   armor uses.
 * - **Wall Fortification** does nothing on its own; it multiplies wall health.
 * - **Dissonant Echo — Defense** feeds the dissonance boost, which multiplies
 *   health.
 *
 * That interlocking is the reason the path is not simply "buy the biggest
 * number": several upgrades are worth more once others are bought.
 */

import { computeModuleStat } from '../data/module-bonus'
import {
  EFFECTIVE_HEALTH_WORKSHOP_STATS,
  workshopStatValue,
} from './effective-paths-workshop-values'
import {
  composeEffectiveHealth,
  DEFAULT_PERK_QUANTITY,
  effectiveArmor,
  effectiveDefenseAbsolute,
  effectiveDefensePercent,
  effectiveHealth,
  effectiveMaxRecovery,
  effectiveWallHealth,
} from './effective-paths-hp'

/** The seventeen upgrades the eHP path chooses between. */
export interface EffectiveHealthLevels {
  health: number
  defenseAbsolute: number
  defensePercent: number
  wallHealth: number
  wallFortification: number
  recoveryPackageMax: number
  standardPerksBonus: number
  improveTradeOffPerks: number
  chronoFieldReduction: number
  deathWaveHealth: number
  chainThunder: number
  healthMastery: number
  extraDefenseMastery: number
  /** Assist capacity bought with stones, on the slot itself. */
  assistSubstatArmor: number
  assistSubstatGenerator: number
  assistBonusArmor: number
  /** Assist capacity from the Assist Module labs, which add to the above. */
  assistSubstatArmorLab: number
  assistSubstatGeneratorLab: number
  assistBonusArmorLab: number
  dissonantEchoDefense: number

  /**
   * Armor module levels. The coin path buys these between 160 and 300; below
   * 160 the sheet leaves them out, because shards are the cheaper currency
   * there.
   */
  primaryModuleArmor: number
  assistModuleArmor: number

  /**
   * Workshop enhancement ("WS+") levels, each worth 1% of its stat.
   *
   * These live with the levels rather than the config because the coin path
   * buys them — they are upgrade candidates, not fixed player state. Only four
   * stats have an enhancement; defense percent has none.
   */
  enhancementHealth: number
  enhancementDefenseAbsolute: number
  enhancementWallHealth: number
  enhancementRecoveryPackage: number
}

/** Every level at zero — a fresh account, and a safe base to spread over. */
export const ZERO_EFFECTIVE_HEALTH_LEVELS: EffectiveHealthLevels = {
  health: 0,
  defenseAbsolute: 0,
  defensePercent: 0,
  wallHealth: 0,
  wallFortification: 0,
  recoveryPackageMax: 0,
  standardPerksBonus: 0,
  improveTradeOffPerks: 0,
  chronoFieldReduction: 0,
  deathWaveHealth: 0,
  chainThunder: 0,
  healthMastery: 0,
  extraDefenseMastery: 0,
  assistSubstatArmor: 0,
  assistSubstatGenerator: 0,
  assistBonusArmor: 0,
  assistSubstatArmorLab: 0,
  assistSubstatGeneratorLab: 0,
  assistBonusArmorLab: 0,
  dissonantEchoDefense: 0,
  primaryModuleArmor: 0,
  assistModuleArmor: 0,
  enhancementHealth: 0,
  enhancementDefenseAbsolute: 0,
  enhancementWallHealth: 0,
  enhancementRecoveryPackage: 0,
}

/**
 * A stat's workshop contribution, relic and vault bonuses.
 *
 * Give either a `workshopLevel`, which is resolved through the workshop table,
 * or a `workshopValue` when the value is already known. Supplying a level is
 * the normal case and keeps the caller out of the units question — the table
 * stores percentages out of 100 and the paths want fractions.
 */
export interface EffectiveHealthStatSource {
  /** Workshop level. Resolved through the table, in the sheet's units. */
  workshopLevel?: number
  /** Resolved workshop value, when a level is not the right way to say it. */
  workshopValue?: number
  /** Relic bonus, as a fraction. */
  relicPct?: number
  /** Vault bonus, as a fraction. */
  vaultPct?: number
  /** Substat from the primary module. */
  primarySubstat?: number
  /** Substat from the assist module, before capacity scaling. */
  assistSubstat?: number
}

export interface EffectiveHealthCardSource {
  has: boolean
  /** The card's multiplier (or additive share, for defense percent). */
  value: number
  hasMastery?: boolean
  /**
   * The mastery's OWN row flag, without the card block's master switch.
   *
   * `hasMastery` is `AND($AY$16, $AY$20)`, which is what `EPH_HEALTH` reads
   * when it composes -- with cards switched off a mastery level is worth
   * nothing. But the mastery's CANDIDACY is gated on the row alone:
   *
   *     eHP!DT2 = OR(NOT(AY20), AND($AY$14, NOT(IDS_LAB_HAS_UNLOCKED(DT4))))
   *
   * so the sheet offers Health Mastery whenever the row is ticked, master
   * switch or not, and hides it entirely when the row is not. The two are
   * genuinely different questions and conflating them costs a candidate.
   */
  masteryEquipped?: boolean
}

/**
 * The perks the sheet's perk block lists, and whether the chosen preset has
 * each one.
 *
 * Every eHP term that mentions a perk reads exactly one of these — the sheet
 * writes `AND($AY$28, $AY$30)` and friends, so a perk counts only when perks
 * apply *and* that specific perk is in the preset. The trade-off perks are the
 * easiest to misread: `has_cto`/`has_rto` in `EPH_HEALTH` are the two
 * health-for-something trades, not tournament overrides.
 */
export interface EffectiveHealthPerks {
  /** Whether perks apply at all. The sheet turns them off for a tourney run. */
  apply: boolean
  /** Tower Health, worth `(1 + 0.2 × 5)` before the perk-bonus lab. */
  health: boolean
  /** Health Regen, worth `(1 + 0.75 × 5)`. */
  healthRegen: boolean
  /** Extra Defense, worth `4% × 5`. */
  extraDefense: boolean
  /** Absolute Defense, worth `(1 + 0.15 × 5)`. */
  absoluteDefense: boolean
  /** "E. Dmg -50% / Dmg -50%" — halves incoming damage. */
  enemyDamageTradeOff: boolean
  /** "E. HP -50% / Regen & Lifesteal -90%" — cuts regen to a tenth. */
  enemyHealthTradeOff: boolean
  /** "x1.8 Coin / Health -70%" — health drops to 30%. */
  coinTradeOff: boolean
  /** "Regen x8 / Health -60%" — health drops to 40%. */
  regenTradeOff: boolean
  /**
   * How many of each standard perk the run took. The four trade-offs have no
   * quantity — the sheet leaves their Quantity cells blank.
   */
  quantity: {
    health: number
    healthRegen: number
    extraDefense: number
    absoluteDefense: number
  }
}

/** No perks at all — the shape every perk flag defaults to. */
export const NO_EFFECTIVE_HEALTH_PERKS: EffectiveHealthPerks = {
  apply: false,
  health: false,
  healthRegen: false,
  extraDefense: false,
  absoluteDefense: false,
  enemyDamageTradeOff: false,
  enemyHealthTradeOff: false,
  coinTradeOff: false,
  regenTradeOff: false,
  quantity: {
    health: DEFAULT_PERK_QUANTITY,
    healthRegen: DEFAULT_PERK_QUANTITY,
    extraDefense: DEFAULT_PERK_QUANTITY,
    absoluteDefense: DEFAULT_PERK_QUANTITY,
  },
}

/**
 * An eHP config with nothing in it — every stat at zero, nothing owned.
 *
 * The counterpart to `zeroEffectiveDamageConfig` and
 * `zeroEffectiveEconomyConfig`, and it exists for the same two reasons.
 *
 * A caller building a config from a save or a tracker needs somewhere to start
 * that is *complete*, so a field they have no data for is a documented zero
 * rather than an `undefined` that reaches the model and returns `NaN`. And a
 * test needs a config it can plan against without hand-writing one — a
 * hand-written fixture agrees with itself and drifts from the model silently,
 * which is why eHP and eRegen went uncovered by the shared path invariants for
 * as long as this was missing.
 *
 * It is a **floor, not a player**: eHP computed from it is the tower with no
 * labs, no cards, no modules and no wall. Use it as a base to spread over.
 */
export function zeroEffectiveHealthConfig(): EffectiveHealthConfig {
  const stat = (): EffectiveHealthStatSource => ({
    workshopValue: 0,
    relicPct: 0,
    vaultPct: 0,
    primarySubstat: 0,
    assistSubstat: 0,
  })
  const card = (): EffectiveHealthCardSource =>
    ({ has: false, value: 0, hasMastery: false, masteryEquipped: false })

  return {
    health: stat(),
    defenseAbsolute: stat(),
    defensePercent: stat(),
    wallHealth: stat(),
    maxRecovery: stat(),
    cards: { health: card(), defenseAbsolute: card(), defensePercent: card() },
    armor: { primaryBonus: 1, hasAssist: false, assistBonus: 1 },
    wall: { has: false, primaryEffect: 0, assistEffect: 0 },
    recovery: { has: false },
    perks: { ...NO_EFFECTIVE_HEALTH_PERKS, quantity: { ...NO_EFFECTIVE_HEALTH_PERKS.quantity } },
    chronoField: { unlocked: false },
    chainThunder: { has: false, damageShare: 0 },
    deathWave: { hasHealth: false },
    // One rather than zero: it multiplies defense absolute, and nothing is ever
    // hit by no enemies.
    enemiesAttackingTogether: 1,
    dissonance: { active: false, tierPersonalBest: 0, allTierPersonalBests: [] },
  }
}

/**
 * A regen config with nothing in it, to go with the eHP one above.
 *
 * The regen path takes both, so a caller starting from zero needs both.
 */
export function zeroEffectiveRegenConfigSource(): {
  healthRegen: EffectiveHealthStatSource
  card: EffectiveHealthCardSource
  hasSecondWindMastery: boolean
} {
  return {
    healthRegen: {
      workshopValue: 0,
      relicPct: 0,
      vaultPct: 0,
      primarySubstat: 0,
      assistSubstat: 0,
    },
    card: { has: false, value: 0, hasMastery: false, masteryEquipped: false },
    hasSecondWindMastery: false,
  }
}

/** Build a perk set from the few flags a caller cares about. */
export function effectiveHealthPerks(
  overrides: Partial<EffectiveHealthPerks> = {},
): EffectiveHealthPerks {
  return {
    ...NO_EFFECTIVE_HEALTH_PERKS,
    ...overrides,
    quantity: { ...NO_EFFECTIVE_HEALTH_PERKS.quantity, ...overrides.quantity },
  }
}

export interface EffectiveHealthConfig {
  health: EffectiveHealthStatSource
  defenseAbsolute: EffectiveHealthStatSource
  defensePercent: EffectiveHealthStatSource
  wallHealth: EffectiveHealthStatSource
  maxRecovery: EffectiveHealthStatSource

  cards: {
    health: EffectiveHealthCardSource
    defenseAbsolute: EffectiveHealthCardSource
    defensePercent: EffectiveHealthCardSource
  }

  armor: {
    /**
     * Armor bonus from the primary module, already resolved.
     *
     * Ignored when `primaryRarity` is given: the coin path buys module levels,
     * so the bonus has to be recomputed as the level moves rather than fixed.
     */
    primaryBonus: number
    hasAssist: boolean
    /** Armor bonus from the assist module, as a multiplier. */
    assistBonus: number
    /** The primary module's rarity label, e.g. `"Ancestral 5*"`. */
    primaryRarity?: string
    /** The assist module's rarity label. */
    assistRarity?: string
  }

  wall: {
    /** Whether the player has a wall at all. Without one the term drops out. */
    has: boolean
    /** Wall special effect from the primary module. */
    primaryEffect: number
    /** Wall special effect from the assist module. */
    assistEffect: number
  }

  recovery: {
    /** Whether recovery packages are in play. */
    has: boolean
  }

  perks: EffectiveHealthPerks

  chronoField: {
    /** The damage-reduction unlock lab. Without it the term is inert. */
    unlocked: boolean
  }

  chainThunder: {
    has: boolean
    /**
     * The share of all health lost that the **Chain Lightning ultimate
     * weapon** is responsible for, as a fraction — 0.3 for 30%.
     *
     * Chain Lightning's Smite procs are Chain Lightning damage, so they count.
     * The player has to estimate it; nothing in a save records it.
     */
    damageShare: number
  }

  deathWave: {
    /** Whether the Death Wave health bonus is unlocked. */
    hasHealth: boolean
  }

  /**
   * Flat damage removed per hit is worth more the more things are hitting you,
   * so defense absolute scales by how many enemies attack together. The sheet
   * takes this as a user guess.
   */
  enemiesAttackingTogether: number

  dissonance: {
    active: boolean
    /** Personal-best wave on the tier being simulated. */
    tierPersonalBest: number
    /** Personal-best wave on every tier, including the simulated one. */
    allTierPersonalBests: readonly number[]
  }
}

// ---------------------------------------------------------------------------
// Dissonance
// ---------------------------------------------------------------------------

/** A tier's personal best converted to its share of the dissonance bonus. */
function waveToBonus(wave: number): number {
  return Math.pow(Math.min(5000, wave) / 5000, 1.75)
}

/**
 * The four dissonance types, and what each multiplies its stat by.
 *
 * `TTG_DISSONANT_ATTACK_BOOST`, `_DEFENSE_`, `_UW_` and `_UTILITY_` are the
 * same function with one number changed: utility pays 2× where the other three
 * pay 4×. Everything else — the 5000-wave cap, the 1.75 exponent, the half a
 * percent an Echo level gives every other tier — is shared.
 */
export const DISSONANCE_BOOST_FACTORS = {
  attack: 4,
  defense: 4,
  uw: 4,
  utility: 2,
} as const

export type DissonanceType = keyof typeof DISSONANCE_BOOST_FACTORS

/**
 * `TTG_DISSONANT_*_BOOST` — the multiplier a dissonance type applies.
 *
 * The bonus is a property of the account, not of the run: it is built from the
 * personal bests already recorded. The tier being played contributes in full;
 * every other tier contributes only through Dissonant Echo, at half a percent
 * a level. A wave past 5000 counts as 5000.
 */
export function dissonantBoostOfType(
  type: DissonanceType,
  tierPersonalBest: number,
  allTierPersonalBests: readonly number[],
  echoLevel: number,
): number {
  const current = waveToBonus(tierPersonalBest)
  const others = allTierPersonalBests.reduce((total, wave) => total + waveToBonus(wave), 0) - current
  return 1 + DISSONANCE_BOOST_FACTORS[type] * (others * ((echoLevel + 1) * 0.005) + current)
}

/** The Defense boost, which is the one eHP reads. */
export function dissonantBoost(
  tierPersonalBest: number,
  allTierPersonalBests: readonly number[],
  echoLevel: number,
): number {
  return dissonantBoostOfType('defense', tierPersonalBest, allTierPersonalBests, echoLevel)
}

// ---------------------------------------------------------------------------
// Reductions
// ---------------------------------------------------------------------------

/** Chrono Field's damage reduction: a 10% base plus 0.5% a level, once unlocked. */
export function chronoFieldReduction(unlocked: boolean, level: number): number {
  return unlocked ? 0.1 + 0.005 * level : 0
}

/**
 * Chain Thunder's damage reduction.
 *
 * The lab's own wording is exact and worth keeping in front of you:
 *
 * > Enemy damage is reduced by 10% for every 6% of health lost from Chain
 * > Lightning.
 *
 * So the reduction is `share ÷ 6% × 10%`, and the cap is the lab itself at 3
 * points a level — level 19 gives 57%, the number the game's own description
 * quotes, and level 30 gives 90%.
 *
 * `damageShare` is **health lost to the Chain Lightning ultimate weapon as a
 * fraction of all health lost**: 0.3 for 30%, not 30. Smite is one of Chain
 * Lightning's own stats, so Smite procs count towards the share — it is the
 * weapon's total, not its base hits and not Smite alone.
 *
 * The share is clamped: the reduction feeds `1 / (1 − reduction)`, which flips
 * sign above 1 and would turn a defensive bonus into a silent catastrophe.
 */
export function chainThunderReduction(has: boolean, level: number, damageShare: number): number {
  if (!has) return 0
  const share = Math.max(0, Math.min(1, damageShare))
  return Math.min((share / 6) * 10, Math.max(0, 0.03 * level), CHAIN_THUNDER_MAX_REDUCTION)
}

/** Chain Thunder cannot take damage below a tenth, whatever the lab level. */
export const CHAIN_THUNDER_MAX_REDUCTION = 0.9

/**
 * The "E. Dmg -50%" trade-off perk's damage reduction, raised by the Improve
 * Trade-off Perks lab. The sheet writes it inline as `eHP!CP5`.
 */
export function tradeOffReduction(
  hasPerks: boolean,
  hasEnemyDamageTradeOff: boolean,
  level: number,
): number {
  return hasPerks && hasEnemyDamageTradeOff ? 0.5 * (1 + 0.01 * level) : 0
}

// ---------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------

export interface EffectiveHealthBreakdown {
  /** The number the path maximises. */
  effectiveHealth: number
  health: number
  armor: number
  defenseAbsolute: number
  defensePercent: number
  /** Wall health, or `null` when the player has no wall. */
  wallHealth: number | null
  /** Max recovery, or `null` when recovery is not in play. */
  maxRecovery: number | null
  chronoFieldReduction: number
  chainThunderReduction: number
  tradeOffReduction: number
  dissonance: number
}

/**
 * Resolve a stat source into plain numbers.
 *
 * A `workshopLevel` is looked up in the table; an explicit `workshopValue`
 * wins when both are given, so a caller can override a stat the table cannot
 * express. A level the table does not cover resolves to 0 rather than
 * throwing — the planner reads a stat that cannot improve as one not worth
 * buying, which is the right behaviour at a cap.
 */
function source(stat: EffectiveHealthStatSource, workshopStat: string) {
  let workshopValue = stat.workshopValue
  if (workshopValue === undefined && stat.workshopLevel !== undefined) {
    workshopValue = workshopStatValue(workshopStat, stat.workshopLevel)?.value ?? 0
  }
  return {
    workshopValue: workshopValue ?? 0,
    relicPct: stat.relicPct ?? 0,
    vaultPct: stat.vaultPct ?? 0,
    primarySubstat: stat.primarySubstat ?? 0,
    assistSubstat: stat.assistSubstat ?? 0,
  }
}

/**
 * Compute eHP and every stat behind it.
 *
 * The breakdown is returned because a path is only trustworthy if a player can
 * see what moved — "your eHP went up 8%" is worth much less than "your wall
 * doubled".
 */
export function computeEffectiveHealth(
  config: EffectiveHealthConfig,
  levels: EffectiveHealthLevels,
): EffectiveHealthBreakdown {
  const dissonance = config.dissonance.active
    ? dissonantBoost(
      config.dissonance.tierPersonalBest,
      config.dissonance.allTierPersonalBests,
      levels.dissonantEchoDefense,
    )
    : 1

  /**
   * A perk counts only when perks apply at all *and* the preset has it — the
   * sheet writes every one of these as `AND($AY$28, $AY$3x)`.
   */
  const perk = (key: keyof Omit<EffectiveHealthPerks, 'apply' | 'quantity'>): boolean =>
    config.perks.apply && config.perks[key]

  const healthSource = source(config.health, EFFECTIVE_HEALTH_WORKSHOP_STATS.health)
  const health = effectiveHealth({
    workshopValue: healthSource.workshopValue,
    labLevel: levels.health,
    hasHealthCard: config.cards.health.has,
    cardValue: config.cards.health.value,
    hasCardMastery: config.cards.health.hasMastery ?? false,
    masteryLevel: levels.healthMastery,
    workshopEnhancementLevel: levels.enhancementHealth,
    hasPerk: perk('health'),
    perkQuantity: config.perks.quantity.health,
    perkBonusLabLevel: levels.standardPerksBonus,
    hasCoinTradeOffPerk: perk('coinTradeOff'),
    hasRegenTradeOffPerk: perk('regenTradeOff'),
    relicPct: healthSource.relicPct,
    vaultPct: healthSource.vaultPct,
    hasDeathWaveHealth: config.deathWave.hasHealth,
    deathWaveHealthLevel: levels.deathWaveHealth,
    dissonance,
  })

  /**
   * A module's armor bonus at the level the path has taken it to, when the
   * rarity is known — `eHP Coins!CF` recomputes both the same way.
   */
  const moduleBonus = (rarity: string | undefined, level: number, fallback: number): number =>
    (rarity && level > 0 ? computeModuleStat({ type: 'armor', rarityLabel: rarity, level }) : fallback)

  const armor = effectiveArmor({
    primaryBonus: moduleBonus(
      config.armor.primaryRarity, levels.primaryModuleArmor, config.armor.primaryBonus,
    ),
    hasAssist: config.armor.hasAssist,
    assistBonus: moduleBonus(
      config.armor.assistRarity, levels.assistModuleArmor, config.armor.assistBonus,
    ),
    labBonusCap: levels.assistBonusArmorLab,
    stoneBonusCap: levels.assistBonusArmor,
  })

  const dabsSource = source(config.defenseAbsolute, EFFECTIVE_HEALTH_WORKSHOP_STATS.defenseAbsolute)
  // Flat reduction applies per hit, so it is worth the number of enemies
  // hitting you at once.
  const defenseAbsolute = effectiveDefenseAbsolute({
    workshopValue: dabsSource.workshopValue,
    labLevel: levels.defenseAbsolute,
    hasDefenseAbsoluteCard: config.cards.defenseAbsolute.has,
    cardValue: config.cards.defenseAbsolute.value,
    labSubstatCap: levels.assistSubstatArmorLab,
    stoneSubstatCap: levels.assistSubstatArmor,
    primarySubstat: dabsSource.primarySubstat,
    assistSubstat: dabsSource.assistSubstat,
    workshopEnhancementLevel: levels.enhancementDefenseAbsolute,
    hasPerk: perk('absoluteDefense'),
    perkQuantity: config.perks.quantity.absoluteDefense,
    perkBonusLabLevel: levels.standardPerksBonus,
    relicPct: dabsSource.relicPct,
    vaultPct: dabsSource.vaultPct,
  }) * config.enemiesAttackingTogether

  const defPctSource = source(config.defensePercent, EFFECTIVE_HEALTH_WORKSHOP_STATS.defensePercent)
  const defensePercent = effectiveDefensePercent({
    workshopValue: defPctSource.workshopValue,
    labLevel: levels.defensePercent,
    hasDefensePercentCard: config.cards.defensePercent.has,
    cardValue: config.cards.defensePercent.value,
    hasCardMastery: config.cards.defensePercent.hasMastery ?? false,
    masteryLevel: levels.extraDefenseMastery,
    labSubstatCap: levels.assistSubstatArmorLab,
    stoneSubstatCap: levels.assistSubstatArmor,
    primarySubstat: defPctSource.primarySubstat,
    assistSubstat: defPctSource.assistSubstat,
    hasPerk: perk('extraDefense'),
    perkQuantity: config.perks.quantity.extraDefense,
    perkBonusLabLevel: levels.standardPerksBonus,
    relicPct: defPctSource.relicPct,
    vaultPct: defPctSource.vaultPct,
  })

  const wallSource = source(config.wallHealth, EFFECTIVE_HEALTH_WORKSHOP_STATS.wallHealth)
  const wallHealth = config.wall.has
    ? effectiveWallHealth({
      workshopValue: wallSource.workshopValue,
      labLevel: levels.wallHealth,
      labSubstatCap: levels.assistSubstatArmorLab,
      stoneSubstatCap: levels.assistSubstatArmor,
      primarySubstat: wallSource.primarySubstat,
      assistSubstat: wallSource.assistSubstat,
      workshopEnhancementLevel: levels.enhancementWallHealth,
      primaryEffect: config.wall.primaryEffect,
      assistEffect: config.wall.assistEffect,
      fortressLevel: levels.wallFortification,
    })
    : null

  const recoverySource = source(config.maxRecovery, EFFECTIVE_HEALTH_WORKSHOP_STATS.maxRecovery)
  const maxRecovery = config.recovery.has
    ? effectiveMaxRecovery({
      workshopValue: recoverySource.workshopValue,
      labLevel: levels.recoveryPackageMax,
      labSubstatCap: levels.assistSubstatGeneratorLab,
      stoneSubstatCap: levels.assistSubstatGenerator,
      primarySubstat: recoverySource.primarySubstat,
      assistSubstat: recoverySource.assistSubstat,
      workshopEnhancementLevel: levels.enhancementRecoveryPackage,
      vaultPct: recoverySource.vaultPct,
    })
    : null

  const chrono = chronoFieldReduction(config.chronoField.unlocked, levels.chronoFieldReduction)
  const chain = chainThunderReduction(
    config.chainThunder.has, levels.chainThunder, config.chainThunder.damageShare,
  )
  const tradeOff = tradeOffReduction(
    config.perks.apply, config.perks.enemyDamageTradeOff, levels.improveTradeOffPerks,
  )

  const effective = composeEffectiveHealth({
    health,
    armor,
    defenseAbsolute,
    defensePercent,
    wallHealth,
    maxRecovery,
    chronoFieldReduction: chrono,
    chainThunderReduction: chain,
    tradeOffReduction: tradeOff,
  })

  return {
    effectiveHealth: effective,
    health,
    armor,
    defenseAbsolute,
    defensePercent,
    wallHealth,
    maxRecovery,
    chronoFieldReduction: chrono,
    chainThunderReduction: chain,
    tradeOffReduction: tradeOff,
    dissonance,
  }
}
