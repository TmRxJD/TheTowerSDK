/**
 * Effective Paths — the `EPD_*` damage stat layer.
 *
 * Ports of the named damage LAMBDAs in the community "Effective Paths"
 * spreadsheet. Same conventions as `effective-paths-hp.ts`: percentages arrive
 * as decimal fractions, a `has*` flag guards its own group, and the sheet's own
 * decomposition is kept so a reader can line the code up against it.
 *
 * These feed two of the composition's factors — `Crit` and `BulletDmgMulti` —
 * and both are products of several of them, so an error in one is easy to lose
 * in the total. Each is checked against the live sheet.
 *
 * Credit for the original formulas belongs to the Effective Paths maintainers —
 * see `effective-paths-credits.ts`.
 */

// ---------------------------------------------------------------------------
// Critical hits
// ---------------------------------------------------------------------------

export interface CriticalChanceInput {
  /** Critical Chance workshop level; a point a level, over a 1% base. */
  workshopLevel: number
  hasCriticalChanceCard: boolean
  /** The card's level, worth a point each over a 4% base. */
  cardLevel: number
  hasCardMastery: boolean
  /** Card mastery level, 0-based as the sheet indexes it. */
  masteryLevel: number
  relicPct: number
  vaultPct: number
  /** Combined primary and assist substat, already scaled by assist capacity. */
  substat: number
}

/**
 * `EPD_CRIT_CHANCE` — critical chance, as a fraction.
 *
 * Purely additive: workshop, relic, vault, substats and the card all
 * contribute percentage points. Not clamped here — {@link criticalMultiplier}
 * is where the sheet caps it at 1.
 */
export function criticalChance(input: CriticalChanceInput): number {
  const workshop = 0.01 + 0.01 * input.workshopLevel
  const card = input.hasCriticalChanceCard
    ? 0.04 + 0.01 * input.cardLevel
      + (input.hasCardMastery ? 0.01 * (1 + input.masteryLevel) : 0)
    : 0
  return workshop + input.relicPct + input.vaultPct + input.substat + card
}

export interface CriticalInput {
  /** Critical chance, as a fraction. */
  criticalChance: number
  /** Critical factor — the multiplier a crit applies. */
  criticalFactor: number
  /** Super crit chance, as a fraction of crits. */
  superCritChance: number
  /** Super crit multiplier. */
  superCritMultiplier: number
  /**
   * The Being Annihilator substat count, which the sheet passes as 5 when the
   * module has it and 0 when it does not.
   *
   * It makes super crits streak: once one lands, the next shot is a super crit
   * too, so the average shot is worth more than the independent case.
   */
  beingAnnihilator: number
}

/**
 * `EPD_CRITICAL` — the average damage multiplier from critical hits.
 *
 * Without Being Annihilator this is the plain expectation over one shot. With
 * it, the sheet models a two-state chain — either in a streak or not — and
 * weights the two by their stationary probabilities.
 */
export function criticalMultiplier(input: CriticalInput): number {
  const chance = Math.min(1, input.criticalChance)
  const normal = (1 - chance)
    + chance * input.criticalFactor * (1 - input.superCritChance)
    + chance * input.criticalFactor * input.superCritChance * input.superCritMultiplier

  const streak = input.beingAnnihilator
  const streakChance = chance * input.superCritChance
  const inStreak = streak * streakChance
  const notInStreak = 1 / (1 + inStreak)
  const streakShare = inStreak / (1 + inStreak)
  const streakCrit = input.criticalFactor * input.superCritMultiplier

  return notInStreak * normal + streakShare * streakCrit
}

/**
 * `EPD_UWCRITICAL` — the critical multiplier ultimate weapons get.
 *
 * A different shape entirely: ultimate weapons take the crit and the super
 * crit as two independent multiplicative bonuses rather than an expectation
 * over one shot, and neither is clamped.
 */
export function ultimateWeaponCriticalMultiplier(input: Omit<CriticalInput, 'beingAnnihilator'>): number {
  return (1 + input.criticalChance * input.criticalFactor)
    * (1 + input.criticalChance * input.superCritChance * input.superCritMultiplier)
}

// ---------------------------------------------------------------------------
// Multishot
// ---------------------------------------------------------------------------

/** `EPD_MSC` — multishot chance. Half a point a workshop level. */
export function multishotChance(workshopLevel: number, substat: number, vaultPct: number): number {
  return (workshopLevel * 0.005 + substat) * (1 + vaultPct)
}

/**
 * `EPD_MST` — multishot targets.
 *
 * A whole number of targets over a base of 2, so a partial substat is floored
 * rather than rounded — half a target does not exist.
 */
export function multishotTargets(workshopLevel: number, substat: number): number {
  return 2 + workshopLevel + Math.floor(substat)
}

/** `EPD_MULTISHOT` — the damage multiplier from multishot. */
export function multishotMultiplier(chance: number, targets: number): number {
  return 1 + chance * (targets - 1)
}

// ---------------------------------------------------------------------------
// Bounce shot
// ---------------------------------------------------------------------------

/** `EPD_BSC` — bounce shot chance. Eight tenths of a point a workshop level. */
export function bounceShotChance(workshopLevel: number, substat: number, vaultPct: number): number {
  return (workshopLevel * 0.008 + substat) * (1 + vaultPct)
}

/**
 * `EPD_BST` — bounce shot targets, over a base of 1.
 *
 * The sheet's version carries a `VaultBonus` binding that references a name it
 * has no parameter for. `LET` is lazy and nothing reads it, so it never
 * evaluates — and the result is right regardless, because bounce shot targets
 * take no vault bonus. Only the chance does.
 */
export function bounceShotTargets(workshopLevel: number, perk: number, substat: number): number {
  return 1 + workshopLevel + perk + Math.floor(substat)
}

/**
 * `EPD_BOUNCESHOT` — the damage multiplier from bounce shot.
 *
 * Each bounce has to land for the next to be possible, so bounce `k` is worth
 * `(chance × astral)^k` and the series is summed rather than multiplied.
 */
export function bounceShotMultiplier(
  chance: number,
  targets: number,
  astralDeliverance: number,
): number {
  const perBounce = chance * (1 + astralDeliverance)
  let total = 0
  for (let bounce = 1; bounce <= Math.floor(targets); bounce++) {
    total += Math.pow(perBounce, bounce)
  }
  return 1 + total
}

// ---------------------------------------------------------------------------
// Rapid fire
// ---------------------------------------------------------------------------

/** `EPD_RFC` — rapid fire chance. Four tenths of a point a workshop level. */
export function rapidFireChance(workshopLevel: number, substat: number, vaultPct: number): number {
  return (workshopLevel * 0.004 + substat) * (1 + vaultPct)
}

/** `EPD_RFD` — rapid fire duration in seconds, over a 0.6s base. */
export function rapidFireDuration(workshopLevel: number, substat: number): number {
  return 0.6 + workshopLevel * 0.05 + substat
}

/**
 * `EPD_RAPIDFIRE` — the damage multiplier from rapid fire.
 *
 * Rapid fire quadruples the fire rate while it lasts, so the multiplier is the
 * time-weighted average of firing at 4× and at 1×. `bps` is bullets per
 * second, which decides how much of the time is spent in it.
 */
export function rapidFireMultiplier(chance: number, duration: number, bulletsPerSecond: number): number {
  const active = chance * duration * bulletsPerSecond
  return (1 + 4 * active) / (1 + active)
}
