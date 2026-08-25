/**
 * Ultimate weapon uptime: what share of the time an ability is actually running.
 *
 * Cooldown is measured from activation, not from when the ability ends, so a 60s duration
 * on a 60s cooldown is 100% uptime rather than 50%. Getting that backwards halves every
 * figure a tool reports, and the mistake reads as a plausible number.
 */
import { computeUptimeRatio } from '../mechanics/index'
import {
  type CalculatorBuilder,
  type CalculatorResultBase,
  clampMagnitude,
} from './types'

export interface UptimeInput {
  /** How long the ability stays active, in seconds. */
  durationSeconds: number
  /** Time between activations, in seconds, measured from activation. */
  cooldownSeconds: number
}

export interface UptimeResult extends CalculatorResultBase {
  /** Share of the time the ability is active, 0–1. */
  readonly ratio: number
  /** The same figure as a percentage, for display. */
  readonly percent: number
  /** True once the ability never drops. */
  readonly permanent: boolean
  /** Seconds of downtime per cycle; 0 when permanent. */
  readonly downtimeSeconds: number
}

const defaults: UptimeInput = { durationSeconds: 30, cooldownSeconds: 100 }

export const uptimeCalculator: CalculatorBuilder<UptimeInput, UptimeResult> = {
  id: 'uptime.ratio',
  title: 'Ability uptime',
  summary: 'What share of the time an ultimate weapon is active, from its duration and cooldown.',

  fields: [
    { key: 'durationSeconds', label: 'Duration', kind: 'number', unit: 'seconds', min: 0 },
    {
      key: 'cooldownSeconds',
      label: 'Cooldown',
      kind: 'number',
      unit: 'seconds',
      min: 0,
      help: 'Measured from activation, so duration ≥ cooldown means permanent uptime.',
    },
  ],

  defaults,

  normalize(input = {}) {
    return {
      durationSeconds: clampMagnitude(input.durationSeconds, defaults.durationSeconds),
      cooldownSeconds: clampMagnitude(input.cooldownSeconds, defaults.cooldownSeconds),
    }
  },

  compute(rawInput = {}) {
    const input = this.normalize(rawInput)
    const notes: string[] = []

    if (input.cooldownSeconds <= 0) {
      notes.push('Cooldown is 0, which cannot be modelled. Enter the ability cooldown in seconds.')
      return { ratio: 0, percent: 0, permanent: false, downtimeSeconds: 0, notes }
    }

    const ratio = computeUptimeRatio(input.durationSeconds, input.cooldownSeconds)
    const permanent = ratio >= 1
    if (permanent) notes.push('Duration covers the whole cooldown, so this ability never drops.')

    return {
      ratio,
      percent: ratio * 100,
      permanent,
      downtimeSeconds: permanent ? 0 : Math.max(0, input.cooldownSeconds - input.durationSeconds),
      notes,
    }
  },
}
