/**
 * Dissonance: the multiplier an account's tier personal bests apply to a stat.
 *
 * This is a property of the **account**, not of the run. Nothing you do this run changes it;
 * it is built from waves already recorded. That is why the inputs are a row of personal
 * bests rather than anything about the current fight.
 *
 * The tier being played contributes its bonus in full. Every other tier contributes only
 * through Dissonant Echo, at half a percent a level — so at Echo 0 the other tiers are
 * worth 0.5% each, not nothing, and a tool that ignores them is low by a little at every
 * level and by a lot at high Echo.
 *
 * A tier's contribution is `(min(wave, 5000) / 5000) ^ 1.75`, which is why the personal
 * bests cannot be summed before being passed in: two tiers at 2500 are worth far less than
 * one at 5000.
 */
import {
  DISSONANCE_BOOST_FACTORS,
  type DissonanceType,
  dissonantBoostOfType,
} from '../mechanics/index'
import { MAX_CAMPAIGN_TIER } from '../data/index'
import {
  type CalculatorBuilder,
  type CalculatorResultBase,
  MAX_INPUT_MAGNITUDE,
  clampMagnitude,
  clampNumber,
  clampNumberList,
} from './types'

/** Past this the exponent is applied to 1, so more waves stop paying. */
const WAVE_CAP = 5000

const TYPES = Object.keys(DISSONANCE_BOOST_FACTORS) as DissonanceType[]

export interface DissonanceInputs {
  /** Which stat's boost to report. Utility pays half what the other three pay. */
  type: DissonanceType
  /** The tier being played, 1-indexed. Its personal best counts in full. */
  tier: number
  /**
   * Personal best wave per tier, index 0 = tier 1. Short rows are padded with 0, which is
   * correct: a tier never reached contributes nothing.
   */
  tierPersonalBests: number[]
  /** Dissonant Echo lab level — what every *other* tier is worth. */
  echoLevel: number
}

export interface DissonanceResult extends CalculatorResultBase {
  /** The multiplier itself: 1 means no bonus at all. */
  readonly boost: number
  /** `boost - 1`, as a percentage, for a UI that shows "+240%". */
  readonly bonusPercent: number
  /** What the played tier contributes on its own, ignoring Echo. */
  readonly currentTierBoost: number
  /** What every other tier adds through Echo. `boost - currentTierBoost`. */
  readonly echoContribution: number
  /** Tiers already at the wave cap — more waves there are worth nothing. */
  readonly cappedTiers: readonly number[]
}

const defaults: DissonanceInputs = {
  type: 'defense',
  tier: 1,
  tierPersonalBests: Array.from({ length: MAX_CAMPAIGN_TIER }, () => 0),
  echoLevel: 0,
}

export const dissonanceCalculator: CalculatorBuilder<DissonanceInputs, DissonanceResult> = {
  id: 'dissonance.boost',
  title: 'Dissonance boost',
  summary: 'The multiplier your recorded tier personal bests apply to a stat.',

  fields: [
    {
      key: 'type',
      label: 'Dissonance type',
      kind: 'select',
      options: TYPES.map(value => ({ value, label: value })),
      help: 'Utility pays 2× where attack, defense and UW pay 4×.',
    },
    { key: 'tier', label: 'Tier played', kind: 'number', min: 1, max: MAX_CAMPAIGN_TIER },
    {
      key: 'tierPersonalBests',
      label: 'Personal best wave per tier',
      kind: 'number-list',
      unit: 'waves',
      min: 0,
      help: `One entry per tier, index 0 = tier 1. Waves past ${WAVE_CAP} do not count.`,
    },
    {
      key: 'echoLevel',
      label: 'Dissonant Echo level',
      kind: 'number',
      min: 0,
      help: 'What every tier other than the one played is worth: 0.5% a level.',
    },
  ],

  defaults,

  normalize(input = {}) {
    const type = TYPES.includes(input.type as DissonanceType)
      ? (input.type as DissonanceType)
      : defaults.type
    return {
      type,
      tier: Math.floor(clampNumber(input.tier, 1, MAX_CAMPAIGN_TIER, defaults.tier)),
      /*
       * Fixed to the campaign tier count rather than the caller's length. A short row would
       * otherwise silently drop the tiers past its end — the missing-band shape this
       * codebase keeps producing — and a long one would invent tiers that do not exist.
       */
      tierPersonalBests: clampNumberList(input.tierPersonalBests, MAX_CAMPAIGN_TIER, 0, MAX_INPUT_MAGNITUDE, 0),
      echoLevel: Math.floor(clampMagnitude(input.echoLevel, defaults.echoLevel)),
    }
  },

  compute(rawInput = {}) {
    const input = this.normalize(rawInput)
    const notes: string[] = []

    const suppliedLength = Array.isArray(rawInput.tierPersonalBests)
      ? rawInput.tierPersonalBests.length
      : 0
    if (suppliedLength > 0 && suppliedLength !== MAX_CAMPAIGN_TIER) {
      notes.push(
        `Expected ${MAX_CAMPAIGN_TIER} personal bests (one per tier) and got ${suppliedLength}; `
        + 'the row was padded with 0 or truncated.',
      )
    }

    const personalBest = input.tierPersonalBests[input.tier - 1] ?? 0
    if (personalBest <= 0) {
      notes.push(`Tier ${input.tier} has no recorded personal best, so it contributes nothing.`)
    }

    const boost = dissonantBoostOfType(
      input.type,
      personalBest,
      input.tierPersonalBests,
      input.echoLevel,
    )

    /*
     * The played tier alone: the same call with every other tier zeroed. Echo cannot
     * contribute to a row of zeros, so the difference is exactly what the others add.
     */
    const soloRow = input.tierPersonalBests.map((wave, index) => (index === input.tier - 1 ? wave : 0))
    const currentTierBoost = dissonantBoostOfType(input.type, personalBest, soloRow, input.echoLevel)

    const cappedTiers = input.tierPersonalBests
      .map((wave, index) => (wave >= WAVE_CAP ? index + 1 : 0))
      .filter(tier => tier > 0)
    if (cappedTiers.length > 0) {
      notes.push(`Tier(s) ${cappedTiers.join(', ')} are at the ${WAVE_CAP}-wave cap; further waves add nothing there.`)
    }

    return {
      boost,
      bonusPercent: (boost - 1) * 100,
      currentTierBoost,
      echoContribution: boost - currentTierBoost,
      cappedTiers,
      notes,
    }
  },
}
