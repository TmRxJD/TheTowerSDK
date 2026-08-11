/**
 * Effective Paths — the eHP and eRegen stat layer.
 *
 * These are ports of the named `EPH_*` LAMBDA functions in the community
 * "Effective Paths" spreadsheet, which is the reference tool players use to
 * decide what to upgrade next. The sheet composes a final defensive stat from a
 * workshop base value and every multiplier that stacks on top of it — labs,
 * cards, card mastery, module substats, workshop enhancements, perks,
 * trade-off perks, relics, the vault, and dissonance.
 *
 * Each function keeps the sheet's own decomposition (one named term per
 * contributing source) so a reader can line the code up against the sheet cell
 * by cell. Where the sheet writes a percentage literal, this uses the decimal
 * equivalent: `2%*lvl` becomes `0.02 * lvl`.
 *
 * ## Conventions in these inputs
 *
 * - `workshopValue` is the already-resolved workshop stat, not a level. Get it
 *   from the workshop tables rather than re-deriving it — see the note on
 *   {@link sheetWorkshopHealthCurve} for why.
 * - `*Pct` inputs are decimal fractions: 5% is `0.05`.
 * - `relicPct` and `vaultPct` are the summed bonus, excluding the implicit 1.
 * - A `has*` flag guards its own group; when false the group contributes its
 *   identity (1 for a multiplier, 0 for an additive term).
 *
 * Credit for the original formulas belongs to the Effective Paths maintainers —
 * see `effective-paths-credits.ts`.
 */

/**
 * Assist substat contributions are scaled by the assist's "substat capacity",
 * which stone and lab investment both raise, and which the trackers record only
 * as a combined total. The sheet spells it out as `(1 + lab + stone) * 0.01` in
 * every formula that uses an assist module — the two halves are interchangeable
 * in the arithmetic, and kept apart only because the stone path can buy one.
 */
function assistSubstatScale(labSubstatCap: number, stoneSubstatCap: number): number {
  return (1 + labSubstatCap + stoneSubstatCap) * 0.01
}

/**
 * Combined primary + assist substat contribution.
 *
 * The assist half is scaled by {@link assistSubstatScale}; the primary half is
 * taken at face value.
 */
function substatTotal(input: SubstatInput): number {
  return input.primarySubstat + input.assistSubstat * assistSubstatScale(input.labSubstatCap, input.stoneSubstatCap)
}

/** The substat inputs shared by most `EPH_*` functions. */
export interface SubstatInput {
  /** Substat bonus from the primary module. */
  primarySubstat: number
  /** Substat bonus from the assist module, before capacity scaling. */
  assistSubstat: number
  /** Assist substat capacity from the Assist Module Substats lab. */
  labSubstatCap: number
  /** Assist substat capacity bought with stones — what the stone path raises. */
  stoneSubstatCap: number
}

/**
 * Wall stats scale by a "special effect" multiplier drawn from the primary and
 * assist modules. The sheet treats a combined zero as "no module equipped" and
 * falls back to 1 rather than wiping the stat out.
 */
function wallSpecialFactor(primaryEffect: number, assistEffect: number): number {
  const combined = primaryEffect + assistEffect
  return combined !== 0 ? combined : 1
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export interface EffectiveHealthInput {
  /** Resolved workshop health value. */
  workshopValue: number
  /** Tower Health lab level; each level adds 3%. */
  labLevel: number
  hasHealthCard: boolean
  /** Health card multiplier at its current level. */
  cardValue: number
  hasCardMastery: boolean
  /** Card mastery level, 0-based as the sheet indexes it. */
  masteryLevel: number
  /** Workshop enhancement level; each level adds 1%. */
  workshopEnhancementLevel: number
  hasPerk: boolean
  /** "Second perk bonus" lab level; each level adds 1% to the perk's value. */
  perkBonusLabLevel: number
  /** The "x1.8 Coin / Health -70%" perk — health drops to 30%. */
  hasCoinTradeOffPerk: boolean
  /** The "Regen x8 / Health -60%" perk — health drops to 40%. */
  hasRegenTradeOffPerk: boolean
  relicPct: number
  vaultPct: number
  /** Death Wave health bonus is unlocked. */
  hasDeathWaveHealth: boolean
  deathWaveHealthLevel: number
  /** Dissonance multiplier, already resolved. Pass 1 when not in a dissonance run. */
  dissonance: number
}

/** `EPH_HEALTH` — effective tower health. */
export function effectiveHealth(input: EffectiveHealthInput): number {
  const lab = 1 + 0.03 * input.labLevel
  const card = input.hasHealthCard
    ? input.cardValue * (input.hasCardMastery ? 1 + 0.2 * (1 + input.masteryLevel) : 1)
    : 1
  const enhancement = 1 + 0.01 * input.workshopEnhancementLevel
  const perk = input.hasPerk ? (1 + 0.2 * 5) * (1 + 0.01 * input.perkBonusLabLevel) : 1
  const coinTradeOff = input.hasCoinTradeOffPerk ? 0.3 : 1
  const regenTradeOff = input.hasRegenTradeOffPerk ? 0.4 : 1
  const relic = 1 + input.relicPct
  const vault = 1 + input.vaultPct
  const deathWave = input.hasDeathWaveHealth ? 5 + 0.25 * input.deathWaveHealthLevel : 1

  return input.workshopValue
    * lab * card * enhancement * perk
    * coinTradeOff * regenTradeOff
    * relic * vault * deathWave * input.dissonance
}

// ---------------------------------------------------------------------------
// Regen
// ---------------------------------------------------------------------------

export interface EffectiveRegenInput extends SubstatInput {
  /** Resolved workshop health regen value. */
  workshopValue: number
  /** Tower Regen lab level; each level adds 3%. */
  labLevel: number
  hasRegenCard: boolean
  cardValue: number
  hasCardMastery: boolean
  masteryLevel: number
  workshopEnhancementLevel: number
  hasPerk: boolean
  perkBonusLabLevel: number
  /** The "E. HP -50% / Regen & Lifesteal -90%" perk — regen drops to 10%. */
  hasEnemyHealthTradeOffPerk: boolean
  /** The "Regen x8 / Health -60%" perk — regen ×8, raised by the lab below. */
  hasRegenTradeOffPerk: boolean
  /** Improve Trade-off Perks lab level; each level adds 1% to that ×8. */
  improveTradeOffPerksLabLevel: number
  relicPct: number
  vaultPct: number
  /** The Second Wind card mastery is owned; it adds 90% a level. */
  hasSecondWindMastery: boolean
  secondWindMasteryLevel: number
}

/** `EPH_REGEN` — effective health regen per second. */
export function effectiveRegen(input: EffectiveRegenInput): number {
  const lab = 1 + 0.03 * input.labLevel
  const card = input.hasRegenCard
    ? input.cardValue * (input.hasCardMastery ? 1 + 0.4 * (1 + input.masteryLevel) : 1)
    : 1
  const substat = 1 + substatTotal(input)
  const enhancement = 1 + 0.01 * input.workshopEnhancementLevel
  const perk = input.hasPerk ? (1 + 0.75 * 5) * (1 + 0.01 * input.perkBonusLabLevel) : 1
  const enemyHealthTradeOff = input.hasEnemyHealthTradeOffPerk ? 0.1 : 1
  const regenTradeOff = input.hasRegenTradeOffPerk ? 8 * (1 + 0.01 * input.improveTradeOffPerksLabLevel) : 1
  const relic = 1 + input.relicPct
  const vault = 1 + input.vaultPct
  const secondWind = input.hasSecondWindMastery ? 1 + 0.9 * (1 + input.secondWindMasteryLevel) : 1

  return input.workshopValue
    * lab * card * substat * enhancement * perk
    * enemyHealthTradeOff * regenTradeOff
    * relic * vault * secondWind
}

// ---------------------------------------------------------------------------
// Defense absolute / defense percent / armor
// ---------------------------------------------------------------------------

export interface EffectiveDefenseAbsoluteInput extends SubstatInput {
  /** Resolved workshop defense absolute value. */
  workshopValue: number
  /** Defense Absolute lab level; each level adds 3%. */
  labLevel: number
  hasDefenseAbsoluteCard: boolean
  cardValue: number
  workshopEnhancementLevel: number
  hasPerk: boolean
  perkBonusLabLevel: number
  relicPct: number
  vaultPct: number
}

/** `EPH_DABS` — effective defense absolute. */
export function effectiveDefenseAbsolute(input: EffectiveDefenseAbsoluteInput): number {
  const lab = 1 + 0.03 * input.labLevel
  const card = input.hasDefenseAbsoluteCard ? input.cardValue : 1
  const substat = 1 + substatTotal(input)
  const enhancement = 1 + 0.01 * input.workshopEnhancementLevel
  const perk = input.hasPerk ? (1 + 0.15 * 5) * (1 + 0.01 * input.perkBonusLabLevel) : 1
  const relic = 1 + input.relicPct
  const vault = 1 + input.vaultPct

  return input.workshopValue * lab * card * substat * enhancement * perk * relic * vault
}

/** The game caps defense percent at 98%, and so does the sheet. */
export const DEFENSE_PERCENT_CAP = 0.98

export interface EffectiveDefensePercentInput extends SubstatInput {
  /** Resolved workshop defense percent value, as a decimal fraction. */
  workshopValue: number
  /** Defense Percent lab level; each level adds 0.2 percentage points. */
  labLevel: number
  hasDefensePercentCard: boolean
  cardValue: number
  hasCardMastery: boolean
  masteryLevel: number
  hasPerk: boolean
  perkBonusLabLevel: number
  relicPct: number
  vaultPct: number
}

/**
 * `EPH_DEF_PCT` — effective defense percent, capped at
 * {@link DEFENSE_PERCENT_CAP}.
 *
 * Unlike the other stats here this one is purely additive: every source
 * contributes percentage points rather than a multiplier.
 */
export function effectiveDefensePercent(input: EffectiveDefensePercentInput): number {
  const lab = 0.002 * input.labLevel
  const card = input.hasDefensePercentCard
    ? input.cardValue + (input.hasCardMastery ? 0.007 * (1 + input.masteryLevel) : 0)
    : 0
  const substat = substatTotal(input)
  const perk = input.hasPerk ? 0.04 * 5 * (1 + 0.01 * input.perkBonusLabLevel) : 0

  const total = input.workshopValue + lab + card + substat + perk + input.relicPct + input.vaultPct
  return Math.min(DEFENSE_PERCENT_CAP, total)
}

export interface EffectiveArmorInput {
  /** Armor bonus from the primary module. */
  primaryBonus: number
  hasAssist: boolean
  /** Armor bonus from the assist module, as a multiplier. */
  assistBonus: number
  /** Assist bonus capacity from the Assist Module Bonus lab. */
  labBonusCap: number
  /** Assist bonus capacity bought with stones — what the stone path raises. */
  stoneBonusCap: number
}

/**
 * `EPH_ARMOR` — effective armor.
 *
 * The assist module contributes only the part of its multiplier above 1, scaled
 * by the assist bonus capacity.
 */
export function effectiveArmor(input: EffectiveArmorInput): number {
  if (!input.hasAssist) return input.primaryBonus
  const assist = (input.assistBonus - 1) * (1 + input.labBonusCap + input.stoneBonusCap) * 0.01 + 1
  return input.primaryBonus * assist
}

// ---------------------------------------------------------------------------
// Wall
// ---------------------------------------------------------------------------

export interface EffectiveWallHealthInput extends SubstatInput {
  /** Resolved workshop wall health value. */
  workshopValue: number
  /** Wall Health lab level; each level adds 2 percentage points. */
  labLevel: number
  workshopEnhancementLevel: number
  /** Wall special effect from the primary module. */
  primaryEffect: number
  /** Wall special effect from the assist module. */
  assistEffect: number
  /** Fortress lab/perk level; each level adds 20%. */
  fortressLevel: number
}

/** `EPH_WALL_HEALTH` — effective wall health. */
export function effectiveWallHealth(input: EffectiveWallHealthInput): number {
  const lab = 0.02 * input.labLevel
  const substat = substatTotal(input)
  const enhancement = 1 + 0.01 * input.workshopEnhancementLevel
  const special = wallSpecialFactor(input.primaryEffect, input.assistEffect)
  const wallHp = (input.workshopValue + lab + substat) * enhancement * special
  const fortress = 1 + 0.2 * input.fortressLevel

  return wallHp * fortress
}

export interface EffectiveWallRegenInput {
  /** Wall Regen lab level; each level adds 10 percentage points. */
  labLevel: number
  primaryEffect: number
  assistEffect: number
}

/** `EPH_WALL_REGEN` — effective wall regen. */
export function effectiveWallRegen(input: EffectiveWallRegenInput): number {
  return 0.1 * input.labLevel * wallSpecialFactor(input.primaryEffect, input.assistEffect)
}

// ---------------------------------------------------------------------------
// Recovery
// ---------------------------------------------------------------------------

export interface EffectiveMaxRecoveryInput extends SubstatInput {
  /** Resolved workshop max recovery value. */
  workshopValue: number
  /** Max Recovery lab level; each level adds 1 percentage point. */
  labLevel: number
  workshopEnhancementLevel: number
  vaultPct: number
}

/** `EPH_MAX_RCVR` — effective max recovery. */
export function effectiveMaxRecovery(input: EffectiveMaxRecoveryInput): number {
  const lab = 0.01 * input.labLevel
  const substat = substatTotal(input)
  const enhancement = 1 + 0.01 * input.workshopEnhancementLevel
  const vault = 1 + input.vaultPct

  return (input.workshopValue + lab + substat) * enhancement * vault
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/**
 * Turn a damage reduction into the multiplier it is worth as health.
 *
 * Taking 20% less damage means surviving 1/(1−0.2) = 1.25× as much, which is
 * how every reduction on the sheet enters the eHP product.
 */
export function survivalMultiplier(reduction: number): number {
  if (reduction >= 1) return Infinity
  return 1 / (1 - reduction)
}

export interface EffectiveHealthCompositionInput {
  /** {@link effectiveHealth}. */
  health: number
  /** {@link effectiveArmor}. */
  armor: number
  /** {@link effectiveDefenseAbsolute}. */
  defenseAbsolute: number
  /** {@link effectiveDefensePercent}, as a reduction rather than a multiplier. */
  defensePercent: number
  /**
   * Wall contribution — {@link effectiveWallHealth} — or `null` when the player
   * has no wall. The sheet leaves the cell blank in that case.
   */
  wallHealth?: number | null
  /** {@link effectiveMaxRecovery}, or `null` when recovery is not in play. */
  maxRecovery?: number | null
  /** Chrono Field damage reduction, as a fraction. */
  chronoFieldReduction?: number
  /** Chain Thunder damage reduction, as a fraction. */
  chainThunderReduction?: number
  /** Improved Trade-off perk damage reduction, as a fraction. */
  tradeOffReduction?: number
}

/**
 * `eHP` — the number the eHP path maximises.
 *
 * Multiplicative sources compound onto health; defense absolute is flat damage
 * removed per hit, so it is added to the pool rather than scaling it; and the
 * reductions become survival multipliers on the total.
 *
 * Wall health and max recovery are *added together* before multiplying, because
 * they are alternative pools rather than compounding effects — and when neither
 * is in play the whole term drops to 1 rather than 0.
 */
export function composeEffectiveHealth(input: EffectiveHealthCompositionInput): number {
  const hasPool = input.wallHealth != null || input.maxRecovery != null
  const pool = hasPool ? (input.wallHealth ?? 0) + (input.maxRecovery ?? 0) : 1

  const chrono = survivalMultiplier(input.chronoFieldReduction ?? 0)
  const chainThunder = survivalMultiplier(input.chainThunderReduction ?? 0)
  const tradeOff = survivalMultiplier(input.tradeOffReduction ?? 0)
  const defense = survivalMultiplier(input.defensePercent)

  const pooled = input.health * input.armor * pool * chrono * chainThunder
  return (pooled + input.defenseAbsolute) * defense * tradeOff
}

// ---------------------------------------------------------------------------
// The sheet's own workshop curves
// ---------------------------------------------------------------------------

/**
 * The `WS_*_CALC` functions below are the *spreadsheet's* closed-form
 * approximations of the workshop stat curves. The sheet only falls back to them
 * when its tabulated `DVT_Workshop` value is missing.
 *
 * Prefer the tabulated workshop values for real work. These are exported so a
 * port can reproduce the sheet exactly — including where the sheet's
 * approximation and the game diverge — not because they are the better source.
 */

/** `WS_HP_CALC` — the sheet's workshop health curve. */
export function sheetWorkshopHealthCurve(level: number): number {
  const base = level === 0 ? 5 : 0.077 * Math.pow(level - 1, 2.72) + 5 * (level - 1) + 10
  const highLevel = level > 5000 ? Math.pow(1.0015, level - 5000) : 1

  let banding = 1
  if (level >= 3) {
    if (level < 15) banding = 0.98
    else if (level < 30) banding = 0.975
    else if (level < 50) banding = 0.985
    else if (level < 75) banding = 1
    else if (level < 100) banding = 1.01
    else if (level < 130) banding = 1.02
    else banding = 1.03
  }

  return base * highLevel * banding
}

/**
 * `WS_REGEN_CALC` — the sheet's workshop regen curve.
 *
 * The grouping here is deliberately faithful to the sheet, including a quirk:
 * the `level > 5000` factor multiplies only the 500+ term rather than the whole
 * expression, because of where the sheet closes its parentheses.
 */
export function sheetWorkshopRegenCurve(level: number): number {
  const base = level === 0
    ? 0.0045 * Math.pow(level - 1, 2) + 0.004 * (level - 1) + level * 0.04
    : 0.0045 * Math.pow(level - 1, 2.39) + 0.004 * (level - 1) + level * 0.04

  const tier250 = level >= 250 ? 0.02 * Math.pow(level - 249, 2.25) : 0
  const tier500 = level >= 500 ? 0.02 * Math.pow(level - 499, 2.85) : 0
  const highLevel = level > 5000 ? Math.pow(1.0024, level - 5000) : 1

  return base + tier250 + tier500 * highLevel
}

/** `WS_DABS_CALC` — the sheet's workshop defense absolute curve. */
export function sheetWorkshopDefenseAbsoluteCurve(level: number): number {
  let base: number
  if (level === 0) base = 0
  else if (level === 1) base = 0.5
  else {
    base = 0.0049 * Math.pow(level - 1, 2.63) + 0.5 * (level - 1) + level * 0.5
    if (level >= 300) base += 0.08 * Math.pow(level - 299, 2.18)
    if (level >= 1300) base += 0.1 * Math.pow(level - 1299, 2.2)
    if (level >= 1800) base += 0.12 * Math.pow(level - 1799, 2.27)
    if (level >= 2500) base += 0.14 * Math.pow(level - 2499, 2.42)
  }

  let banding: number
  if (level < 15) banding = 1
  else if (level < 30) banding = 1.01
  else if (level < 50) banding = 1.02
  else if (level < 70) banding = 1.03
  else if (level < 90) banding = 1.04
  else if (level < 110) banding = 1.05
  else banding = 1.06

  return base * banding
}
