import { CARD_LEVELS } from '../../data/index'
import { BOT_UPGRADES_DATA, findBotByName } from '../../data/index'
import { waveAcceleratorCooldownReductionFraction } from '../uptime-core'
import type { GameDropdownOptionEntry } from './types'

const GOLDEN_BOT_COOLDOWN_MIN_SECONDS = 50
const GOLDEN_BOT_COOLDOWN_LAB_CAP = 25

function parseBotStatSeconds(raw: string): number {
  const match = String(raw).match(/([\d.]+)/)
  return match ? Number(match[1]) : 0
}

function buildBotStatLevelEntries(botName: string, statName: string): readonly GameDropdownOptionEntry[] {
  const bot = findBotByName(botName) ?? BOT_UPGRADES_DATA.find(entry => entry.label === botName)
  if (!bot) return []

  const stat = bot.stats[statName]
  if (!stat) return []

  return Object.keys(stat.levels)
    .map(level => Number(level))
    .filter(level => Number.isFinite(level))
    .sort((left, right) => left - right)
    .map(level => ({
      value: level,
      baseValue: parseBotStatSeconds(stat.levels[level] ?? stat.base),
    }))
}

/** Golden Bot cooldown upgrade levels (0–15) with canonical seconds from bot data. */
export function buildGoldenBotCooldownLevelEntries(): readonly GameDropdownOptionEntry[] {
  return buildBotStatLevelEntries('Golden Bot', 'Cooldown')
}

/** Card game levels (1–7). baseValue mirrors the level index. */
export function buildCardGameLevelEntries(): readonly GameDropdownOptionEntry[] {
  return CARD_LEVELS.map(level => ({ value: level, baseValue: level }))
}

/** Card mastery tiers (0–9). */
export function buildCardMasteryLevelEntries(): readonly GameDropdownOptionEntry[] {
  return Array.from({ length: 10 }, (_, mastery) => ({
    value: mastery,
    baseValue: mastery,
  }))
}

/** Card mastery select tiers (-1 locked + 0–9). */
export function buildCardMasterySelectLevelEntries(): readonly GameDropdownOptionEntry[] {
  return [
    { value: -1, baseValue: -1 },
    ...buildCardMasteryLevelEntries(),
  ]
}

/** Uptime Wave Accelerator tiers (0–7) with cooldown reduction fraction as baseValue. */
export function buildUptimeWaLevelEntries(): readonly GameDropdownOptionEntry[] {
  return Array.from({ length: 8 }, (_, level) => ({
    value: level,
    baseValue: waveAcceleratorCooldownReductionFraction(level),
  }))
}

export function computeGoldenBotCooldownSecondsAtLevel(level: number, labLevel: number): number {
  const cappedLab = Math.min(GOLDEN_BOT_COOLDOWN_LAB_CAP, Math.max(0, Math.floor(Number(labLevel) || 0)))
  const cappedLevel = Math.max(0, Math.min(15, Math.floor(Number(level) || 0)))
  return Math.max(GOLDEN_BOT_COOLDOWN_MIN_SECONDS, 120 - (cappedLevel * 3) - cappedLab)
}
