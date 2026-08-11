export const BOT_MEDAL_PLANNER_FOCUS_GOALS = [
  'farming',
  'tournament',
  'milestones',
  'damage',
  'coins',
  'cells',
  'shards',
  'hp',
  'uptime',
  'range',
  'overlap',
] as const

export type BotMedalPlannerFocusGoal = typeof BOT_MEDAL_PLANNER_FOCUS_GOALS[number]

export type BotMedalPlannerFocusWeights = {
  output: number
  uptime: number
  overlap: number
  range: number
  timing: number
}

export const BOT_PLUS_LEVEL_LOCKED = -1

const FOCUS_GOAL_LABELS: Record<BotMedalPlannerFocusGoal, string> = {
  farming: 'General farming',
  tournament: 'Tournament',
  milestones: 'Milestones',
  damage: 'Damage',
  coins: 'Coins',
  cells: 'Cells',
  shards: 'Shards',
  hp: 'HP / survivability',
  uptime: 'High uptime',
  range: 'Large range',
  overlap: 'Bot overlap / synergy',
}

export function botMedalPlannerFocusGoalLabel(goal: BotMedalPlannerFocusGoal): string {
  return FOCUS_GOAL_LABELS[goal]
}

export function normalizeBotMedalPlannerFocusOrder(value: unknown): BotMedalPlannerFocusGoal[] {
  const valid = new Set<string>(BOT_MEDAL_PLANNER_FOCUS_GOALS)
  if (!Array.isArray(value)) return ['farming', 'overlap', 'uptime']

  const next: BotMedalPlannerFocusGoal[] = []
  for (const entry of value) {
    const goal = String(entry)
    if (!valid.has(goal) || next.includes(goal as BotMedalPlannerFocusGoal)) continue
    next.push(goal as BotMedalPlannerFocusGoal)
  }

  return next.length ? next : ['farming', 'overlap', 'uptime']
}

const FOCUS_DECAY_WEIGHTS = [2.0, 1.2, 0.7, 0.45, 0.3]

function decayWeight(index: number): number {
  return FOCUS_DECAY_WEIGHTS[Math.min(index, FOCUS_DECAY_WEIGHTS.length - 1)]
}

export function getBotMedalPlannerFocusWeights(
  focusOrder: readonly BotMedalPlannerFocusGoal[],
): BotMedalPlannerFocusWeights {
  const w: BotMedalPlannerFocusWeights = { output: 0.6, uptime: 0.6, overlap: 0.6, range: 0.6, timing: 0.6 }

  for (const [index, goal] of focusOrder.entries()) {
    const d = decayWeight(index)
    switch (goal) {
      case 'farming':
        w.output += d * 0.45; w.uptime += d * 0.3; w.overlap += d * 0.2; w.timing += d * 0.05
        break
      case 'tournament':
        w.output += d * 0.55; w.uptime += d * 0.2; w.range += d * 0.15; w.timing += d * 0.1
        break
      case 'milestones':
        w.output += d * 0.55; w.uptime += d * 0.25; w.timing += d * 0.2
        break
      case 'damage':
        w.output += d
        break
      case 'coins':
        w.output += d * 0.9; w.uptime += d * 0.1
        break
      case 'cells':
        w.output += d * 0.75; w.uptime += d * 0.15; w.overlap += d * 0.1
        break
      case 'shards':
        w.output += d * 0.8; w.uptime += d * 0.2
        break
      case 'hp':
        w.uptime += d * 0.5; w.overlap += d * 0.35; w.timing += d * 0.15
        break
      case 'uptime':
        w.uptime += d * 0.7; w.timing += d * 0.3
        break
      case 'range':
        w.range += d
        break
      case 'overlap':
        w.overlap += d * 0.7; w.timing += d * 0.3
        break
      default:
        break
    }
  }

  return w
}

export function normalizePlannerPlusLevel(level: number): number {
  return level < 0 ? 0 : level
}

export function isBotPlusLevelLocked(level: number): boolean {
  return level < 0
}

export function allBotPlusUnlockedForSync(plusLevels: Record<string, number[]>): boolean {
  return Object.values(plusLevels).every(levels => levels.every(level => level >= 0))
}
