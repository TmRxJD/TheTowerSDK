/**
 * Guardians: bits to take one guardian stat from where it is to where you want it.
 *
 * Each guardian has its own stats, and each stat its own cost ladder — so a stat name is
 * only meaningful next to the guardian it belongs to. Carrying "Cooldown" across from one
 * guardian to another and pricing it there produces a number for a thing that does not
 * exist, which is why the stat is validated against the chosen guardian rather than
 * against a global list.
 */
import { buildGuardianDefinitions, getGuardianStatCostAt, type GuardianDefinition } from '../data/index'
import { type CalculatorBuilder, type CalculatorResultBase, clampNumber } from './types'

const GUARDIANS: readonly GuardianDefinition[] = buildGuardianDefinitions()

export interface GuardianInput {
  /** Guardian key, e.g. `attack`. */
  guardian: string
  /** Stat name, as that guardian lists it. */
  stat: string
  currentLevel: number
  targetLevel: number
}

export interface GuardianLevel {
  readonly level: number
  readonly bitCost: number
  /** The stat's value at this level, as the game shows it. */
  readonly value: string | number | null
}

export interface GuardianResult extends CalculatorResultBase {
  readonly guardian: string
  readonly stat: string
  readonly levels: readonly GuardianLevel[]
  readonly totalBits: number
  readonly maxLevel: number
  /** The stats this guardian actually has, so a UI can repopulate its second select. */
  readonly statsForGuardian: readonly string[]
}

const firstGuardian = GUARDIANS[0]
const defaults: GuardianInput = {
  guardian: firstGuardian?.key ?? '',
  stat: firstGuardian?.statOrder[0] ?? '',
  currentLevel: 0,
  targetLevel: 10,
}

function findGuardian(key: string): GuardianDefinition | undefined {
  return GUARDIANS.find(guardian => guardian.key === key)
}

function maxLevelFor(guardian: GuardianDefinition | undefined, stat: string): number {
  const levels = guardian?.stats[stat]?.levels
  if (!levels) return 0
  const numbers = Object.keys(levels).map(Number).filter(Number.isFinite)
  return numbers.length > 0 ? Math.max(...numbers) : 0
}

export const guardianCalculator: CalculatorBuilder<GuardianInput, GuardianResult> = {
  id: 'guardian.upgrade',
  title: 'Guardian upgrade',
  summary: 'Bits to take one guardian stat from its current level to a target.',

  fields: [
    {
      key: 'guardian',
      label: 'Guardian',
      kind: 'select',
      options: GUARDIANS.map(guardian => ({ value: guardian.key, label: guardian.label })),
    },
    {
      key: 'stat',
      label: 'Stat',
      kind: 'select',
      options: [...new Set(GUARDIANS.flatMap(guardian => guardian.statOrder))]
        .map(stat => ({ value: stat, label: stat })),
      help: 'Stats differ per guardian — read `statsForGuardian` off the result to narrow this list.',
    },
    { key: 'currentLevel', label: 'Current Level', kind: 'number', min: 0 },
    { key: 'targetLevel', label: 'Target Level', kind: 'number', min: 0 },
  ],

  defaults,

  normalize(input = {}) {
    const guardianKey = typeof input.guardian === 'string' && findGuardian(input.guardian)
      ? input.guardian
      : defaults.guardian
    const guardian = findGuardian(guardianKey)
    const stat = typeof input.stat === 'string' && guardian?.statOrder.includes(input.stat)
      ? input.stat
      : guardian?.statOrder[0] ?? defaults.stat
    const cap = maxLevelFor(guardian, stat)
    return {
      guardian: guardianKey,
      stat,
      currentLevel: Math.floor(clampNumber(input.currentLevel, 0, cap, 0)),
      targetLevel: Math.floor(clampNumber(input.targetLevel, 0, cap, Math.min(defaults.targetLevel, cap))),
    }
  },

  compute(rawInput = {}) {
    const input = this.normalize(rawInput)
    const notes: string[] = []
    const guardian = findGuardian(input.guardian)
    const statsForGuardian = guardian?.statOrder ?? []
    const maxLevel = maxLevelFor(guardian, input.stat)

    const empty = {
      guardian: input.guardian,
      stat: input.stat,
      levels: [],
      totalBits: 0,
      maxLevel,
      statsForGuardian,
    }

    if (!guardian) return { ...empty, notes: [`No guardian named "${input.guardian}".`] }

    if (typeof rawInput.stat === 'string' && rawInput.stat && rawInput.stat !== input.stat) {
      notes.push(`${guardian.label} has no stat named "${rawInput.stat}"; used ${input.stat} instead.`)
    }
    if (typeof rawInput.targetLevel === 'number' && rawInput.targetLevel > maxLevel) {
      notes.push(`${guardian.label} ${input.stat} caps at level ${maxLevel}; the target was clamped.`)
    }
    if (input.targetLevel <= input.currentLevel) {
      notes.push('Target level is not above the current level, so there is nothing to buy.')
      return { ...empty, notes }
    }

    const statIndex = guardian.statOrder.indexOf(input.stat)
    const levelTable = guardian.stats[input.stat]?.levels ?? {}

    const levels: GuardianLevel[] = []
    let totalBits = 0
    const unpriced: number[] = []

    for (let level = input.currentLevel + 1; level <= input.targetLevel; level += 1) {
      const bitCost = getGuardianStatCostAt(guardian, statIndex, level)
      // A level with no cost in the table is recorded, never counted as free.
      if (bitCost === null) {
        unpriced.push(level)
        continue
      }
      totalBits += bitCost
      levels.push({ level, bitCost, value: levelTable[level]?.value ?? null })
    }

    if (unpriced.length > 0) {
      notes.push(`No bit cost listed for level(s) ${unpriced.join(', ')}; they are excluded from the total.`)
    }

    return { ...empty, levels, totalBits, notes }
  },
}
