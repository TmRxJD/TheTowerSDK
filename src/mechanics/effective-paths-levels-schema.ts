/**
 * Effective Paths — a level contract for the models that had none.
 *
 * `effective-paths-edamage-schema.ts` already does this for the damage model,
 * config and levels both. This is the levels half for the other three, which
 * had nothing.
 *
 * ## Why levels first
 *
 * Levels are the input most likely to arrive damaged. A config is assembled
 * once from trackers; levels are rebuilt constantly — from a stored payload, a
 * partial import, a page that persisted half a record before a schema was
 * added — and the failure is always the same:
 *
 * - a key is **missing**, so the model reads `undefined`, and arithmetic on it
 *   returns `NaN` that spreads through every term it touches;
 * - a key holds `NaN` already, from a number field the player emptied;
 * - a key is negative, which prices a level the player cannot un-buy.
 *
 * None of those throw. The planner ranks against them, the page renders a full
 * table, and the answer is confidently wrong — which is the defect this whole
 * port keeps finding.
 *
 * Strict about **completeness and finiteness**, lenient about **magnitude**. A
 * level far above any cap is somebody's data, not this file's business; a level
 * that is `undefined` is nobody's.
 */

import { z } from 'zod'
import { ZERO_EFFECTIVE_ECONOMY_LEVELS } from './effective-paths-eecon-levels'
import type { EffectiveEconomyLevels } from './effective-paths-eecon-levels'
import { ZERO_EFFECTIVE_HEALTH_LEVELS } from './effective-paths-ehp-model'
import type { EffectiveHealthLevels } from './effective-paths-ehp-model'
import { ZERO_EFFECTIVE_REGEN_LEVELS } from './effective-paths-regen-plan'
import type { EffectiveRegenLevels } from './effective-paths-regen-plan'

/** A level: finite, whole, not negative. `NaN` is the failure this catches. */
const level = z.number().finite().int().min(0)

/**
 * A record with **exactly** these keys, each a level.
 *
 * Built from a zero record's own keys rather than written out, so a level added
 * to a model is covered the moment it exists. `z.record` is not enough: it
 * accepts an object missing half its keys, which is precisely the shape a
 * partial payload has.
 */
function exactLevels<K extends string>(keys: readonly K[]): z.ZodType<Record<K, number>> {
  return z.object(
    Object.fromEntries(keys.map(key => [key, level])) as Record<K, typeof level>,
  ) as unknown as z.ZodType<Record<K, number>>
}

const keysOf = <T extends object>(zero: T) => Object.keys(zero) as Array<keyof T & string>

/** Every economy level, in its four bands. */
export const effectiveEconomyLevelsSchema = z.object({
  time: exactLevels(keysOf(ZERO_EFFECTIVE_ECONOMY_LEVELS.time)),
  stone: exactLevels(keysOf(ZERO_EFFECTIVE_ECONOMY_LEVELS.stone)),
  discount: exactLevels(keysOf(ZERO_EFFECTIVE_ECONOMY_LEVELS.discount)),
})

/** Every eHP level. Flat, unlike the banded damage and economy ones. */
export const effectiveHealthLevelsSchema = exactLevels(keysOf(ZERO_EFFECTIVE_HEALTH_LEVELS))

/** The regen path's own four, which sit alongside the eHP ones. */
export const effectiveRegenLevelsSchema = exactLevels(keysOf(ZERO_EFFECTIVE_REGEN_LEVELS))

/** One thing wrong with a set of levels, and where. */
export interface EffectiveLevelsIssue {
  /** Dotted path — `time.coinsKillBonus`, or `health`. */
  path: string
  message: string
}

export interface EffectiveLevelsCheck {
  ok: boolean
  issues: EffectiveLevelsIssue[]
}

function toCheck(result: { success: boolean, error?: z.ZodError }): EffectiveLevelsCheck {
  if (result.success || !result.error) return { ok: true, issues: [] }
  return {
    ok: false,
    issues: result.error.issues.map((issue: z.core.$ZodIssue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    })),
  }
}

/**
 * Check levels before planning against them.
 *
 * Reports rather than throws, for the same reason the damage checker does: a
 * caller is better placed to decide whether a broken tracker means "show
 * nothing" or "show this and say which part is unreadable". A page that renders
 * nothing is worse than one that names the problem.
 */
export function checkEffectiveEconomyLevels(levels: unknown): EffectiveLevelsCheck {
  return toCheck(effectiveEconomyLevelsSchema.safeParse(levels))
}

export function checkEffectiveHealthLevels(levels: unknown): EffectiveLevelsCheck {
  return toCheck(effectiveHealthLevelsSchema.safeParse(levels))
}

export function checkEffectiveRegenLevels(levels: unknown): EffectiveLevelsCheck {
  return toCheck(effectiveRegenLevelsSchema.safeParse(levels))
}

/** Types the schemas are built to match, asserted at compile time. */
export type CheckedEconomyLevels = EffectiveEconomyLevels
export type CheckedHealthLevels = EffectiveHealthLevels
export type CheckedRegenLevels = EffectiveRegenLevels
