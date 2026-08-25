/**
 * Ultimate weapons: Power Stones to take one stat to a level.
 *
 * Each weapon prices its stats on its own chart, so "level 20" costs a different number of
 * stones on Golden Tower than on Black Hole. Both the weapon and the stat are therefore
 * required; there is no sensible global curve to fall back on.
 */
import { uwStoneChartData } from '../data/index'
import { ultimateWeaponMaxLevel, ultimateWeaponStoneCost } from '../mechanics/index'
import { type CalculatorBuilder, type CalculatorResultBase, clampNumber } from './types'

interface WeaponEntry {
  readonly name: string
  readonly stats: readonly string[]
}

/** Weapons and their stat names, read from the chart data rather than transcribed. */
const WEAPONS: readonly WeaponEntry[] = (
  Object.values(uwStoneChartData) as Array<{ name?: string, stats?: Array<{ name?: string }> }>
)
  .filter((weapon): weapon is { name: string, stats?: Array<{ name?: string }> } => typeof weapon.name === 'string')
  .map(weapon => ({
    name: weapon.name,
    stats: (weapon.stats ?? []).map(stat => stat.name).filter((n): n is string => typeof n === 'string'),
  }))

export interface UltimateWeaponInput {
  weapon: string
  stat: string
  currentLevel: number
  targetLevel: number
}

export interface UltimateWeaponResult extends CalculatorResultBase {
  readonly weapon: string
  readonly stat: string
  /** Stones for each level bought, in order. */
  readonly levels: readonly { readonly level: number, readonly stoneCost: number }[]
  readonly totalStones: number
  /** Highest level this weapon's chart prices for this stat. */
  readonly maxLevel: number
  /** Every stat this weapon has, so a UI can repopulate its second select. */
  readonly statsForWeapon: readonly string[]
}

const firstWeapon = WEAPONS[0]
const defaults: UltimateWeaponInput = {
  weapon: firstWeapon?.name ?? '',
  stat: firstWeapon?.stats[0] ?? '',
  currentLevel: 0,
  targetLevel: 10,
}

function findWeapon(name: string): WeaponEntry | undefined {
  return WEAPONS.find(weapon => weapon.name === name)
}

export const ultimateWeaponCalculator: CalculatorBuilder<UltimateWeaponInput, UltimateWeaponResult> = {
  id: 'uw.stones',
  title: 'Ultimate weapon stones',
  summary: 'Power Stones to take one ultimate weapon stat from its current level to a target.',

  fields: [
    {
      key: 'weapon',
      label: 'Ultimate weapon',
      kind: 'select',
      options: WEAPONS.map(weapon => ({ value: weapon.name, label: weapon.name })),
    },
    {
      key: 'stat',
      label: 'Stat',
      kind: 'select',
      options: WEAPONS.flatMap(weapon => weapon.stats).map(stat => ({ value: stat, label: stat })),
      help: 'Stats differ per weapon — read `statsForWeapon` off the result to narrow this list.',
    },
    { key: 'currentLevel', label: 'Current level', kind: 'number', min: 0 },
    { key: 'targetLevel', label: 'Target level', kind: 'number', min: 0 },
  ],

  defaults,

  normalize(input = {}) {
    const weapon = typeof input.weapon === 'string' && findWeapon(input.weapon)
      ? input.weapon
      : defaults.weapon
    const entry = findWeapon(weapon)
    const stat = typeof input.stat === 'string' && entry?.stats.includes(input.stat)
      ? input.stat
      : entry?.stats[0] ?? defaults.stat
    const cap = ultimateWeaponMaxLevel(weapon, stat) ?? 0
    return {
      weapon,
      stat,
      currentLevel: Math.floor(clampNumber(input.currentLevel, 0, cap, 0)),
      targetLevel: Math.floor(clampNumber(input.targetLevel, 0, cap, Math.min(defaults.targetLevel, cap))),
    }
  },

  compute(rawInput = {}) {
    const input = this.normalize(rawInput)
    const notes: string[] = []
    const entry = findWeapon(input.weapon)
    const statsForWeapon = entry?.stats ?? []
    const maxLevel = ultimateWeaponMaxLevel(input.weapon, input.stat) ?? 0

    const empty = {
      weapon: input.weapon,
      stat: input.stat,
      levels: [],
      totalStones: 0,
      maxLevel,
      statsForWeapon,
    }

    if (typeof rawInput.stat === 'string' && rawInput.stat && rawInput.stat !== input.stat) {
      notes.push(`${input.weapon} has no stat named "${rawInput.stat}"; used ${input.stat} instead.`)
    }
    if (typeof rawInput.targetLevel === 'number' && rawInput.targetLevel > maxLevel) {
      notes.push(`${input.weapon} ${input.stat} caps at level ${maxLevel}; the target was clamped.`)
    }
    if (input.targetLevel <= input.currentLevel) {
      notes.push('Target level is not above the current level, so there is nothing to buy.')
      return { ...empty, notes }
    }

    const levels: { level: number, stoneCost: number }[] = []
    let totalStones = 0
    const unpriced: number[] = []

    for (let level = input.currentLevel + 1; level <= input.targetLevel; level += 1) {
      const stoneCost = ultimateWeaponStoneCost(input.weapon, input.stat, level)
      // A level the chart does not price is recorded, never treated as free.
      if (stoneCost === null) {
        unpriced.push(level)
        continue
      }
      totalStones += stoneCost
      levels.push({ level, stoneCost })
    }

    if (unpriced.length > 0) {
      notes.push(`No stone cost charted for level(s) ${unpriced.join(', ')}; they are excluded from the total.`)
    }

    return { ...empty, levels, totalStones, notes }
  },
}
