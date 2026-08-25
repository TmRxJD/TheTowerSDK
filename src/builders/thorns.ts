/**
 * Thorns: damage dealt back to an enemy that touches the tower.
 *
 * Thorns is a percentage of the *enemy's* contact damage, not of the tower's damage, so
 * the enemy factor is an input rather than something derived from a build. That is the
 * part most tools get backwards.
 */
import { thornDamageOnHit } from '../mechanics/index'
import {
  type CalculatorBuilder,
  type CalculatorResultBase,
  clampMagnitude,
} from './types'

export interface ThornsInput {
  /** The enemy's contact damage. */
  contactDamage: number
  /** Enemy scaling factor at the wave being modelled. */
  enemyFactor: number
  /** Thorn multiplier from workshop and modules, as a multiplier (1 = none). */
  thornMultiplier: number
  /** Whether the thorn lab is researched. */
  thornLabActive: boolean
  /**
   * Module benefit, as a MULTIPLIER. 1 means no bonus.
   *
   * Not an additive percentage: `thornDamageOnHit` multiplies by this, so passing 0 for
   * "no modules" returns zero damage rather than the unmodified figure.
   */
  moduleBenefit: number
}

export interface ThornsResult extends CalculatorResultBase {
  /** Damage returned to the enemy on one contact. */
  readonly damagePerHit: number
  /** Share of the enemy's own contact damage that comes back at it. */
  readonly shareOfContactDamage: number
}

const defaults: ThornsInput = {
  contactDamage: 1000,
  enemyFactor: 1,
  thornMultiplier: 1,
  thornLabActive: false,
  moduleBenefit: 1,
}

export const thornsCalculator: CalculatorBuilder<ThornsInput, ThornsResult> = {
  id: 'thorns.damage',
  title: 'Thorn damage',
  summary: 'Damage returned to an enemy each time it touches the tower.',

  fields: [
    { key: 'contactDamage', label: 'Enemy contact damage', kind: 'number', min: 0 },
    { key: 'enemyFactor', label: 'Enemy factor', kind: 'number', min: 0 },
    { key: 'thornMultiplier', label: 'Thorn multiplier', kind: 'number', min: 0, help: '1 means no bonus.' },
    { key: 'thornLabActive', label: 'Thorn lab researched', kind: 'boolean' },
    {
      key: 'moduleBenefit',
      label: 'Module benefit',
      kind: 'number',
      min: 0,
      help: 'A multiplier: 1 means no module bonus. 0 returns no damage at all.',
    },
  ],

  defaults,

  normalize(input = {}) {
    return {
      contactDamage: clampMagnitude(input.contactDamage, defaults.contactDamage),
      enemyFactor: clampMagnitude(input.enemyFactor, defaults.enemyFactor),
      thornMultiplier: clampMagnitude(input.thornMultiplier, defaults.thornMultiplier),
      thornLabActive: input.thornLabActive === true,
      moduleBenefit: clampMagnitude(input.moduleBenefit, defaults.moduleBenefit),
    }
  },

  compute(rawInput = {}) {
    const input = this.normalize(rawInput)
    const notes: string[] = []

    const damagePerHit = thornDamageOnHit({
      enemyFactor: input.enemyFactor,
      thornMultiplier: input.thornMultiplier,
      contactDamage: input.contactDamage,
      thornLabActive: input.thornLabActive,
      moduleBenefit: input.moduleBenefit,
    })

    if (input.thornMultiplier === 0) {
      notes.push('Thorn multiplier is 0, so nothing is returned. Set it to at least 1.')
    }
    if (input.moduleBenefit === 0) {
      notes.push('Module benefit is a multiplier and it is 0, which zeroes the result. Use 1 for no modules.')
    }

    return {
      damagePerHit,
      shareOfContactDamage: input.contactDamage > 0 ? damagePerHit / input.contactDamage : 0,
      notes,
    }
  },
}
