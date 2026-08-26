/**
 * Bots: medals to take one bot stat from where it is to where you want it.
 *
 * A bot's four stats share one medal ladder — the cost of level 12 is the same whichever
 * stat you are buying — but each stat has its own value table. So the cost comes from the
 * bot and the effect comes from the stat, and mixing those up gives a plausible number
 * against the wrong curve.
 */
import { BOT_UPGRADES_DATA, type BotData } from '../data/index'
import { type CalculatorBuilder, type CalculatorResultBase, clampNumber } from './types'

interface BotEntry {
  readonly key: string
  readonly label: string
  readonly statOrder: readonly string[]
  readonly costs: readonly number[]
  readonly stats: Record<string, { levels?: Record<string, unknown> }>
}

/*
 * Read from the upgrade table rather than transcribed, so a new bot appears on its own.
 *
 * `BOT_UPGRADES_DATA` is an ARRAY, so the key here is the bot's own name — an index would
 * change meaning the moment a bot is inserted, and a saved preference would then point at
 * a different bot without anything failing.
 */
const BOTS: readonly BotEntry[] = (BOT_UPGRADES_DATA as readonly BotData[]).map(bot => ({
  key: bot.name,
  label: bot.label || bot.name,
  statOrder: bot.statOrder ?? [],
  costs: bot.costs ?? [],
  stats: (bot.stats ?? {}) as Record<string, { levels?: Record<string, unknown> }>,
}))

export interface BotUpgradeInput {
  /** Bot name, as the upgrade table spells it. */
  bot: string
  /** Stat name, as that bot lists it. */
  stat: string
  currentLevel: number
  targetLevel: number
}

export interface BotUpgradeLevel {
  readonly level: number
  readonly medalCost: number
  /** The stat's value at this level, as the game shows it. */
  readonly value: unknown
}

export interface BotUpgradeResult extends CalculatorResultBase {
  readonly bot: string
  readonly stat: string
  readonly levels: readonly BotUpgradeLevel[]
  readonly totalMedals: number
  readonly maxLevel: number
  /** The stats this bot actually has, so a UI can repopulate its second select. */
  readonly statsForBot: readonly string[]
}

const firstBot = BOTS[0]
const defaults: BotUpgradeInput = {
  bot: firstBot?.key ?? '',
  stat: firstBot?.statOrder[0] ?? '',
  currentLevel: 0,
  targetLevel: 10,
}

function findBot(key: string): BotEntry | undefined {
  return BOTS.find(bot => bot.key === key)
}

export const botUpgradeCalculator: CalculatorBuilder<BotUpgradeInput, BotUpgradeResult> = {
  id: 'bot.upgrade',
  title: 'Bot upgrade',
  summary: 'Medals to take one bot stat from its current level to a target.',

  fields: [
    {
      key: 'bot',
      label: 'Bot',
      kind: 'select',
      options: BOTS.map(bot => ({ value: bot.key, label: bot.label })),
    },
    {
      key: 'stat',
      label: 'Stat',
      kind: 'select',
      options: [...new Set(BOTS.flatMap(bot => bot.statOrder))].map(stat => ({ value: stat, label: stat })),
      help: 'Stats differ per bot — read `statsForBot` off the result to narrow this list.',
    },
    { key: 'currentLevel', label: 'Current Level', kind: 'number', min: 0 },
    { key: 'targetLevel', label: 'Target Level', kind: 'number', min: 0 },
  ],

  defaults,

  normalize(input = {}) {
    const botKey = typeof input.bot === 'string' && findBot(input.bot) ? input.bot : defaults.bot
    const bot = findBot(botKey)
    const stat = typeof input.stat === 'string' && bot?.statOrder.includes(input.stat)
      ? input.stat
      : bot?.statOrder[0] ?? defaults.stat
    // The ladder is indexed by level, so its last index is the maximum level.
    const cap = Math.max(0, (bot?.costs.length ?? 0) - 1)
    return {
      bot: botKey,
      stat,
      currentLevel: Math.floor(clampNumber(input.currentLevel, 0, cap, 0)),
      targetLevel: Math.floor(clampNumber(input.targetLevel, 0, cap, Math.min(defaults.targetLevel, cap))),
    }
  },

  compute(rawInput = {}) {
    const input = this.normalize(rawInput)
    const notes: string[] = []
    const bot = findBot(input.bot)
    const statsForBot = bot?.statOrder ?? []
    const maxLevel = Math.max(0, (bot?.costs.length ?? 0) - 1)

    const empty = {
      bot: input.bot,
      stat: input.stat,
      levels: [],
      totalMedals: 0,
      maxLevel,
      statsForBot,
    }

    if (!bot) return { ...empty, notes: [`No bot named "${input.bot}".`] }

    if (typeof rawInput.stat === 'string' && rawInput.stat && rawInput.stat !== input.stat) {
      notes.push(`${bot.label} has no stat named "${rawInput.stat}"; used ${input.stat} instead.`)
    }
    if (typeof rawInput.targetLevel === 'number' && rawInput.targetLevel > maxLevel) {
      notes.push(`${bot.label} caps at level ${maxLevel}; the target was clamped.`)
    }
    if (input.targetLevel <= input.currentLevel) {
      notes.push('Target level is not above the current level, so there is nothing to buy.')
      return { ...empty, notes }
    }

    const valueLevels = bot.stats[input.stat]?.levels ?? {}
    const levels: BotUpgradeLevel[] = []
    let totalMedals = 0

    for (let level = input.currentLevel + 1; level <= input.targetLevel; level += 1) {
      const medalCost = bot.costs[level] ?? 0
      totalMedals += medalCost
      levels.push({ level, medalCost, value: valueLevels[String(level)] ?? null })
    }

    return { ...empty, levels, totalMedals, notes }
  },
}
