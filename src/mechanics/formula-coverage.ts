/**
 * How much of the game each mechanic's formula actually reproduces.
 *
 * Published rather than kept internal, because a consumer deciding whether to
 * trust a number needs to know which kind of number it is: 30 of these are
 * confirmed against the game's own code, 8 are partial. A partial formula is
 * not a broken one — it is one with a named gap, listed in `gaps`.
 *
 * Named `formula-coverage.ts` rather than `coverage.ts` because the deploy
 * build rejects any file called `coverage.ts` as a test artefact, which this
 * is not.
 */
export type FormulaStatus = 'confirmed' | 'inferred' | 'partial' | 'missing'

export interface MechanicCoverage {
  id: string
  name: string
  status: FormulaStatus
  module: string
  gaps?: readonly string[]
}

export const MECHANICS_COVERAGE: readonly MechanicCoverage[] = [
  { id: 'units', name: 'Units & display conversion', status: 'confirmed', module: 'units.ts' },
  { id: 'distances', name: 'Enemy distance cache', status: 'confirmed', module: 'distances.ts' },
  { id: 'tower-range', name: 'Range stat & soft cap', status: 'confirmed', module: 'tower-range.ts' },
  { id: 'tower-fire', name: 'Normal fire in-range', status: 'confirmed', module: 'tower-fire.ts' },
  { id: 'projectile-damage', name: 'Projectile hit pipeline', status: 'confirmed', module: 'projectile-damage.ts' },
  { id: 'workshop-attack-stats', name: 'Workshop damage & crit curves', status: 'confirmed', module: 'workshop-attack-stats.ts' },
  { id: 'workshop-defense-stats', name: 'Workshop defense & utility curves', status: 'confirmed', module: 'workshop-defense-stats.ts' },
  { id: 'workshop-utility-stats', name: 'Workshop attack speed & free upgrades', status: 'confirmed', module: 'workshop-utility-stats.ts' },
  { id: 'wildfire', name: 'Wildfire duration & amplification', status: 'confirmed', module: 'wildfire.ts' },
  { id: 'impetus', name: 'Impetus damage multiplier', status: 'confirmed', module: 'impetus.ts' },
  { id: 'multishot-bounce', name: 'MST / BST targeting', status: 'confirmed', module: 'multishot-bounce.ts' },
  { id: 'bots', name: 'Bot range & stun tiers', status: 'confirmed', module: 'bots.ts' },
  { id: 'bot-get-benefit', name: 'Bots.GetBotBenefit + lab indices', status: 'confirmed', module: 'bot-get-benefit.ts' },
  { id: 'bot-hit-multiplier', name: 'enemyHitMultiplier amplify chain', status: 'confirmed', module: 'bot-hit-multiplier.ts' },
  { id: 'bot-coin-bonus', name: 'Enemy.CoinBotBonus', status: 'confirmed', module: 'bot-coin-bonus.ts' },
  { id: 'bot-movement', name: 'Bot.BotUpdate / RandomDestination', status: 'confirmed', module: 'bot-movement.ts' },
  { id: 'bot-medal-simulation', name: 'Bot Bot medal overlap sim', status: 'partial', module: 'bot-medal-simulation.ts' },
  { id: 'bot-bot-overlap', name: 'Bot enemy range triggers + Bot Bot overlap model', status: 'partial', module: 'bot-bot-overlap.ts' },
  { id: 'bot-medal-planner-scoring', name: 'Bot medal planner objective scoring', status: 'partial', module: 'bot-medal-planner-scoring.ts' },
  { id: 'poison-swamp', name: 'Poison Swamp pipeline', status: 'confirmed', module: 'poison-swamp.ts' },
  { id: 'chrono-field', name: 'Chrono slow & size', status: 'confirmed', module: 'chrono-field.ts' },
  { id: 'crowd-control', name: 'CC timers & decay', status: 'confirmed', module: 'crowd-control.ts' },
  { id: 'knockback', name: 'Knockback force', status: 'confirmed', module: 'knockback.ts' },
  { id: 'enemy-wave-stats', name: 'Wave HP/damage scaling (native curve)', status: 'partial', module: 'enemy-wave-stats.ts', gaps: ['GetWaveBase* only — Wave Info uses NewWave skip subtraction; paste live counters', 'Alt tournament body gate needs runtime array state', 'Workshop cache bypass not modeled', 'High-tier tournament float unverified at T15+'] },
  { id: 'enemy-level-skip', name: 'Enemy level skip', status: 'partial', module: 'enemy-level-skip.ts', gaps: ['Card paths on stored chance not wired', 'Per-wave roll threshold incomplete', 'UI skip % is rounded — full float or live skip counters needed for exact header match'] },
  { id: 'battle-conditions', name: 'Tier skip decay/reduction (BC apply)', status: 'partial', module: 'battle-conditions.ts', gaps: ['Isolated BC math only; useless if upstream stored chance is wrong'] },
  { id: 'workshop-stats', name: 'Workshop combiner pattern', status: 'confirmed', module: 'workshop-stats.ts' },
  { id: 'damage-reduction', name: 'Damage reduction chain', status: 'confirmed', module: 'damage-reduction.ts' },
  { id: 'shockwave', name: 'Shockwave freq/size/pulse', status: 'confirmed', module: 'shockwave.ts' },
  { id: 'wave-skip', name: 'Intro sprint wave skip', status: 'confirmed', module: 'wave-skip.ts' },
  { id: 'enemy-drops', name: 'Enemy drop yield simulation', status: 'partial', module: 'enemy-drops-simulation.ts, enemy-drops-game-data.ts' },
  { id: 'guardians', name: 'Guardian tick damage', status: 'confirmed', module: 'guardians.ts' },
  { id: 'thorns', name: 'Thorn damage on hit', status: 'confirmed', module: 'thorns.ts' },
  { id: 'ultimates', name: 'Ultimate weapon hits', status: 'confirmed', module: 'ultimates.ts' },
  { id: 'land-mines', name: 'Land mine damage', status: 'confirmed', module: 'land-mines.ts' },
  { id: 'rend-armor', name: 'Rend armor multiplier', status: 'confirmed', module: 'rend-armor.ts' },
  { id: 'lab-research', name: 'Lab research mult helper', status: 'confirmed', module: 'lab-research.ts' },
  { id: 'enemy-stat-display', name: 'Run-header enemy stat perks', status: 'partial', module: 'enemy-stat-display.ts', gaps: ['Perk benefit arrays are static, not derived per build'] },
]

export function mechanicsByStatus(status: FormulaStatus): MechanicCoverage[] {
  return MECHANICS_COVERAGE.filter(m => m.status === status)
}

export function allKnownGaps(): string[] {
  return MECHANICS_COVERAGE.flatMap(m => m.gaps ?? [])
}
