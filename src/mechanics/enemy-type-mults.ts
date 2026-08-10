/** Tower enemy-type HP/damage multipliers. */
export const ENEMY_TYPE_MULT_TABLE = {
  Basic: { hp: 1, damage: 1 },
  Boss: { hp: 20, damage: 1 },
  Commander: { hp: 20, damage: 0 },
  Fast: { hp: 1, damage: 1 },
  Overcharge: { hp: 20, damage: 1 },
  Protector: { hp: 0.6000000238418579, damage: 1 },
  Ranged: { hp: 1, damage: 1 },
  Ray: { hp: 1, damage: 2 },
  Saboteur: { hp: 20, damage: 0 },
  Scatter: { hp: 2, damage: 1 },
  Tank: { hp: 5, damage: 0.5 },
  Vampire: { hp: 2, damage: 1 },
} as const
