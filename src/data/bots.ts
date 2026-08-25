export interface BotLabInfoRow {
  name: string
  maxLevel: number
  maxValue: string
}

export interface BotStatDefinition {
  base: string
  levels: Record<number, string>
}

export interface BotValueRow {
  level: number
  value: string
  cost: number
}

export interface BotStatRow {
  name: string
  levels: BotValueRow[]
}

export interface BotUpgradeTierData {
  statOrder: string[]
  costs: number[]
  stats: Record<string, BotStatDefinition>
}

export interface BotPlusData extends BotUpgradeTierData {
  label: string
  unlockStoneCost: number
}

export interface BotData extends BotUpgradeTierData {
  name: string
  label: string
  unlockIndex: number
  labInfo: BotLabInfoRow[]
  plus?: BotPlusData
}

export type BotLabLevels = Record<string, number | undefined>
export type BotUpgradeTier = 'base' | 'plus'

import { computeUptimeRatio } from '../mechanics/uptime-core'
import { botBotBoostedMultiplier } from '../mechanics/bot-hit-multiplier'

export interface BotBotOverlapArgs {
  towerRange: number
  otherRangeValue: string
  botBotRangeValue: string
  sharedPath?: boolean
}

export const BOT_BASE_UNLOCK_COSTS = [0, 150, 300, 600, 900, 1200]
export const BOT_PLUS_UNLOCK_COST = 1250
export const BOT_SYNC_SLOT_COST = 1500

const BASE_RANGE_ANCHOR = 60
const SHARED_BOT_COSTS = [0, 100, 140, 180, 220, 260, 300, 340, 380, 420, 460, 500, 540, 580, 620, 660, 700, 740, 780, 820, 860, 900, 940, 980, 1020, 1060, 1100, 1140, 1180, 1220, 1260]
const SHARED_BOT_PLUS_COSTS = [0, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250, 1300]

const COMMON_DURATION_COOLDOWN_LABS: BotLabInfoRow[] = [
  { name: 'Duration', maxLevel: 20, maxValue: '10s' },
  { name: 'Cooldown', maxLevel: 25, maxValue: '-25s' },
]

function buildPlusData(label: string, statName: string, levels: Record<number, string>): BotPlusData {
  return {
    label,
    unlockStoneCost: BOT_PLUS_UNLOCK_COST,
    statOrder: [statName],
    costs: SHARED_BOT_PLUS_COSTS,
    stats: {
      [statName]: {
        base: levels[0] ?? '',
        levels,
      },
    },
  }
}

export const BOT_UPGRADES_DATA: BotData[] = [
  {
    name: 'Flame Bot',
    label: 'Flame Bot',
    unlockIndex: 0,
    statOrder: ['Damage Reduction', 'Cooldown', 'Damage', 'Range'],
    costs: SHARED_BOT_COSTS,
    stats: {
      'Damage Reduction': {
        base: '20%',
        levels: { 0: '20%', 1: '23%', 2: '26%', 3: '29%', 4: '32%', 5: '35%', 6: '38%', 7: '41%', 8: '44%', 9: '47%', 10: '50%', 11: '53%', 12: '56%', 13: '59%', 14: '62%', 15: '65%', 16: '68%', 17: '71%', 18: '74%', 19: '77%', 20: '80%', 21: '83%', 22: '86%', 23: '89%', 24: '92%', 25: '95%' },
      },
      Cooldown: {
        base: '75s',
        levels: { 0: '75s', 1: '72s', 2: '69s', 3: '66s', 4: '63s', 5: '60s', 6: '57s', 7: '54s', 8: '51s', 9: '48s', 10: '45s', 11: '42s', 12: '39s', 13: '36s', 14: '33s', 15: '30s' },
      },
      Damage: {
        base: '50x',
        levels: { 0: '50x', 1: '58x', 2: '66x', 3: '74x', 4: '82x', 5: '90x', 6: '98x', 7: '106x', 8: '114x', 9: '122x', 10: '130x', 11: '138x', 12: '146x', 13: '154x', 14: '162x', 15: '170x', 16: '178x', 17: '186x', 18: '194x', 19: '202x', 20: '210x', 21: '218x', 22: '226x', 23: '234x', 24: '242x', 25: '250x', 26: '258x', 27: '266x', 28: '274x', 29: '282x', 30: '290x' },
      },
      Range: {
        base: '30M',
        levels: { 0: '30M', 1: '34M', 2: '38M', 3: '42M', 4: '46M', 5: '50M', 6: '54M', 7: '58M', 8: '62M', 9: '66M', 10: '70M', 11: '74M', 12: '78M', 13: '82M', 14: '86M', 15: '90M' },
      },
    },
    labInfo: [
      { name: 'Cooldown', maxLevel: 25, maxValue: '-25s' },
      { name: 'Burn Stack', maxLevel: 5, maxValue: '+5' },
    ],
    plus: buildPlusData('FB+', 'Wildfire', {
      0: '1.5x', 1: '1.6x', 2: '1.7x', 3: '1.8x', 4: '1.9x', 5: '2.0x', 6: '2.1x', 7: '2.2x', 8: '2.3x', 9: '2.4x', 10: '2.5x',
      11: '2.6x', 12: '2.7x', 13: '2.8x', 14: '2.9x', 15: '3.0x', 16: '3.1x', 17: '3.2x', 18: '3.3x', 19: '3.4x', 20: '3.5x',
    }),
  },
  {
    name: 'Thunder Bot',
    label: 'Thunder Bot',
    unlockIndex: 1,
    statOrder: ['Duration', 'Cooldown', 'Linger', 'Range'],
    costs: SHARED_BOT_COSTS,
    stats: {
      Duration: {
        base: '5s',
        levels: { 0: '5s', 1: '5.5s', 2: '6s', 3: '6.5s', 4: '7s', 5: '7.5s', 6: '8s', 7: '8.5s', 8: '9s', 9: '9.5s', 10: '10s', 11: '10.5s', 12: '11s', 13: '11.5s', 14: '12s', 15: '12.5s', 16: '13s', 17: '13.5s', 18: '14s', 19: '14.5s', 20: '15s' },
      },
      Cooldown: {
        base: '120s',
        levels: { 0: '120s', 1: '117s', 2: '114s', 3: '111s', 4: '108s', 5: '105s', 6: '102s', 7: '99s', 8: '96s', 9: '93s', 10: '90s', 11: '87s', 12: '84s', 13: '81s', 14: '78s', 15: '75s' },
      },
      Linger: {
        base: '20%',
        levels: { 0: '20%', 1: '23%', 2: '26%', 3: '29%', 4: '32%', 5: '35%', 6: '38%', 7: '41%', 8: '44%', 9: '47%', 10: '50%', 11: '53%', 12: '56%', 13: '59%', 14: '62%', 15: '65%', 16: '68%', 17: '71%', 18: '74%', 19: '77%', 20: '80%' },
      },
      Range: {
        base: '25M',
        levels: { 0: '25M', 1: '28M', 2: '31M', 3: '34M', 4: '37M', 5: '40M', 6: '43M', 7: '46M', 8: '49M', 9: '52M', 10: '55M', 11: '58M', 12: '61M', 13: '64M', 14: '67M', 15: '70M' },
      },
    },
    labInfo: [
      { name: 'Cooldown', maxLevel: 25, maxValue: '-25s' },
      // Not used by any calculation yet; listed so the lab the player actually
      // has ("Thunder Bot - Linger Time") is imported and shown like the rest.
      { name: 'Linger Time', maxLevel: 20, maxValue: '+20' },
    ],
    plus: buildPlusData('TB+', 'Titan Shock', {
      0: '5%', 1: '6%', 2: '7%', 3: '8%', 4: '9%', 5: '10%', 6: '11%', 7: '12%', 8: '13%', 9: '14%', 10: '15%',
      11: '16%', 12: '17%', 13: '18%', 14: '19%', 15: '20%', 16: '21%', 17: '22%', 18: '23%', 19: '24%', 20: '25%',
    }),
  },
  {
    name: 'Golden Bot',
    label: 'Golden Bot',
    unlockIndex: 2,
    statOrder: ['Duration', 'Cooldown', 'Bonus', 'Range'],
    costs: SHARED_BOT_COSTS,
    stats: {
      Duration: {
        base: '20s',
        levels: { 0: '20s', 1: '20.5s', 2: '21s', 3: '21.5s', 4: '22s', 5: '22.5s', 6: '23s', 7: '23.5s', 8: '24s', 9: '24.5s', 10: '25s', 11: '25.5s', 12: '26s', 13: '26.5s', 14: '27s', 15: '27.5s', 16: '28s', 17: '28.5s', 18: '29s', 19: '29.5s', 20: '30s', 21: '30.5s', 22: '31s', 23: '31.5s', 24: '32s', 25: '32.5s', 26: '33s', 27: '33.5s', 28: '34s', 29: '34.5s', 30: '35s' },
      },
      Cooldown: {
        base: '120s',
        levels: { 0: '120s', 1: '117s', 2: '114s', 3: '111s', 4: '108s', 5: '105s', 6: '102s', 7: '99s', 8: '96s', 9: '93s', 10: '90s', 11: '87s', 12: '84s', 13: '81s', 14: '78s', 15: '75s' },
      },
      Bonus: {
        base: '2x',
        levels: { 0: '2x', 1: '2.2x', 2: '2.4x', 3: '2.6x', 4: '2.8x', 5: '3x', 6: '3.2x', 7: '3.4x', 8: '3.6x', 9: '3.8x', 10: '4x', 11: '4.2x', 12: '4.4x', 13: '4.6x', 14: '4.8x', 15: '5x', 16: '5.2x', 17: '5.4x', 18: '5.6x', 19: '5.8x', 20: '6x', 21: '6.2x', 22: '6.4x', 23: '6.6x', 24: '6.8x', 25: '7x', 26: '7.2x', 27: '7.4x', 28: '7.6x', 29: '7.8x', 30: '8x' },
      },
      Range: {
        base: '20M',
        levels: { 0: '20M', 1: '22M', 2: '24M', 3: '26M', 4: '28M', 5: '30M', 6: '32M', 7: '34M', 8: '36M', 9: '38M', 10: '40M', 11: '42M', 12: '44M', 13: '46M', 14: '48M', 15: '50M', 16: '52M', 17: '54M', 18: '56M', 19: '58M', 20: '60M' },
      },
    },
    labInfo: [...COMMON_DURATION_COOLDOWN_LABS],
    plus: buildPlusData('GB+', 'Bonus Cell', {
      0: '1.25x', 1: '1.30x', 2: '1.35x', 3: '1.40x', 4: '1.45x', 5: '1.50x', 6: '1.55x', 7: '1.60x', 8: '1.65x', 9: '1.70x', 10: '1.75x',
      11: '1.80x', 12: '1.85x', 13: '1.90x', 14: '1.95x', 15: '2.00x', 16: '2.05x', 17: '2.10x', 18: '2.15x', 19: '2.20x', 20: '2.25x',
      21: '2.30x', 22: '2.35x', 23: '2.40x', 24: '2.45x', 25: '2.50x',
    }),
  },
  {
    name: 'Amplify Bot',
    label: 'Amplify Bot',
    unlockIndex: 3,
    statOrder: ['Duration', 'Cooldown', 'Bonus', 'Range'],
    costs: SHARED_BOT_COSTS,
    stats: {
      Duration: {
        base: '20s',
        levels: { 0: '20s', 1: '20.5s', 2: '21s', 3: '21.5s', 4: '22s', 5: '22.5s', 6: '23s', 7: '23.5s', 8: '24s', 9: '24.5s', 10: '25s', 11: '25.5s', 12: '26s', 13: '26.5s', 14: '27s', 15: '27.5s', 16: '28s', 17: '28.5s', 18: '29s', 19: '29.5s', 20: '30s', 21: '30.5s', 22: '31s', 23: '31.5s', 24: '32s', 25: '32.5s', 26: '33s', 27: '33.5s', 28: '34s', 29: '34.5s', 30: '35s' },
      },
      Cooldown: {
        base: '120s',
        levels: { 0: '120s', 1: '117s', 2: '114s', 3: '111s', 4: '108s', 5: '105s', 6: '102s', 7: '99s', 8: '96s', 9: '93s', 10: '90s', 11: '87s', 12: '84s', 13: '81s', 14: '78s', 15: '75s' },
      },
      Bonus: {
        base: '3.5x',
        levels: { 0: '3.5x', 1: '3.9x', 2: '4.3x', 3: '4.7x', 4: '5.1x', 5: '5.5x', 6: '5.9x', 7: '6.3x', 8: '6.7x', 9: '7.1x', 10: '7.5x', 11: '7.9x', 12: '8.3x', 13: '8.7x', 14: '9.1x', 15: '9.5x', 16: '9.9x', 17: '10.3x', 18: '10.7x', 19: '11.1x', 20: '11.5x', 21: '11.9x', 22: '12.3x', 23: '12.7x', 24: '13.1x', 25: '13.5x', 26: '13.9x', 27: '14.3x', 28: '14.7x', 29: '15.1x', 30: '15.5x' },
      },
      Range: {
        base: '25M',
        levels: { 0: '25M', 1: '27M', 2: '29M', 3: '31M', 4: '33M', 5: '35M', 6: '37M', 7: '39M', 8: '41M', 9: '43M', 10: '45M', 11: '47M', 12: '49M', 13: '51M', 14: '53M', 15: '55M', 16: '57M', 17: '59M', 18: '61M' },
      },
    },
    labInfo: [...COMMON_DURATION_COOLDOWN_LABS],
    plus: {
      label: 'AB+',
      unlockStoneCost: BOT_PLUS_UNLOCK_COST,
      statOrder: ['Echoing Shot'],
      costs: [0, 100, 300, 500, 700, 900, 1100, 1300, 1500, 1700],
      stats: {
        'Echoing Shot': {
          base: '3x',
          levels: {
            0: '3x',
            1: '4x',
            2: '5x',
            3: '6x',
            4: '7x',
            5: '8x',
            6: '9x',
            7: '10x',
            8: '11x',
            9: '12x',
          },
        },
      },
    },
  },
  {
    name: 'Bot Bot',
    label: 'Bot Bot',
    unlockIndex: 4,
    statOrder: ['Duration', 'Cooldown', 'Bonus', 'Range'],
    costs: SHARED_BOT_COSTS,
    stats: {
      Duration: {
        base: '20.0s',
        levels: { 0: '20.0s', 1: '20.5s', 2: '21.0s', 3: '21.5s', 4: '22.0s', 5: '22.5s', 6: '23.0s', 7: '23.5s', 8: '24.0s', 9: '24.5s', 10: '25.0s', 11: '25.5s', 12: '26.0s', 13: '26.5s', 14: '27.0s', 15: '27.5s', 16: '28.0s', 17: '28.5s', 18: '29.0s', 19: '29.5s', 20: '30.0s', 21: '30.5s', 22: '31.0s', 23: '31.5s', 24: '32.0s', 25: '32.5s', 26: '33.0s', 27: '33.5s', 28: '34.0s', 29: '34.5s', 30: '35.0s' },
      },
      Cooldown: {
        base: '120s',
        levels: { 0: '120s', 1: '117s', 2: '114s', 3: '111s', 4: '108s', 5: '105s', 6: '102s', 7: '99s', 8: '96s', 9: '93s', 10: '90s', 11: '87s', 12: '84s', 13: '81s', 14: '78s', 15: '75s' },
      },
      Bonus: {
        base: '1.05x',
        levels: { 0: '1.05x', 1: '1.10x', 2: '1.15x', 3: '1.20x', 4: '1.25x', 5: '1.30x', 6: '1.35x', 7: '1.40x', 8: '1.45x', 9: '1.50x', 10: '1.55x', 11: '1.60x', 12: '1.65x', 13: '1.70x', 14: '1.75x', 15: '1.80x', 16: '1.85x', 17: '1.90x', 18: '1.95x', 19: '2.00x' },
      },
      Range: {
        base: '20M',
        levels: { 0: '20M', 1: '22M', 2: '24M', 3: '26M', 4: '28M', 5: '30M', 6: '32M', 7: '34M', 8: '36M', 9: '38M', 10: '40M', 11: '42M', 12: '44M', 13: '46M', 14: '48M', 15: '50M', 16: '52M', 17: '54M', 18: '56M', 19: '58M', 20: '60M' },
      },
    },
    labInfo: [...COMMON_DURATION_COOLDOWN_LABS],
    plus: buildPlusData('BB+', 'Maximum Power', {
      0: '1.25x', 1: '1.30x', 2: '1.35x', 3: '1.40x', 4: '1.45x', 5: '1.50x', 6: '1.55x', 7: '1.60x', 8: '1.65x', 9: '1.70x', 10: '1.75x',
      11: '1.80x', 12: '1.85x', 13: '1.90x', 14: '1.95x', 15: '2.00x', 16: '2.05x', 17: '2.10x', 18: '2.15x', 19: '2.20x', 20: '2.25x',
    }),
  },
]

function parseBaseNumber(value: string): number {
  return Number.parseFloat(value.replace(/[^\d.-]/g, ''))
}

function parseUnit(value: string): string {
  return value.replace(/[\d.-]/g, '')
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

function resolveBotLabAdjustment(bot: BotData, statName: string, labLevels: BotLabLevels): number {
  const lab = bot.labInfo.find(entry => entry.name === statName)
  if (!lab) return 0

  const appliedLevel = Math.max(0, Math.min(Number(lab.maxLevel) || 0, Number(labLevels[statName] ?? 0)))
  if (!Number.isFinite(appliedLevel) || appliedLevel === 0) return 0

  const maxLevel = Number(lab.maxLevel) || 0
  if (maxLevel <= 0) return 0

  const totalAdjustment = parseBaseNumber(lab.maxValue)
  if (!Number.isFinite(totalAdjustment)) return 0

  return (totalAdjustment / maxLevel) * appliedLevel
}

function getTierData(bot: BotData, tier: BotUpgradeTier): BotUpgradeTierData | null {
  if (tier === 'plus') {
    return bot.plus ?? null
  }
  return bot
}

function getTierStatRows(bot: BotData, tier: BotUpgradeTier, labLevels: BotLabLevels = {}): BotStatRow[] {
  const tierData = getTierData(bot, tier)
  if (!tierData) return []

  const effectiveBaseValues = tierData.statOrder.map(statName => {
    const base = tierData.stats[statName]?.base ?? ''
    const rawBase = parseBaseNumber(base)
    const adjustment = tier === 'base' ? resolveBotLabAdjustment(bot, statName, labLevels) : 0
    return rawBase + adjustment
  })

  return tierData.statOrder.map((name, statIndex) => {
    const base = tierData.stats[name]?.base ?? ''
    const baseNumber = parseBaseNumber(base)
    const unit = parseUnit(base)
    const adjustment = effectiveBaseValues[statIndex] - baseNumber

    const levels = tierData.costs.map((cost, level) => {
      const statValue = tierData.stats[name]?.levels[level] ?? ''
      if (!statValue) {
        return { level, value: '', cost }
      }

      const rawValue = parseBaseNumber(statValue)
      return {
        level,
        value: `${formatNumber(rawValue + adjustment)}${unit}`,
        cost,
      }
    })

    return { name, levels }
  })
}

export function findBotByName(botName: string): BotData | undefined {
  const normalized = botName.trim().toLowerCase() === 'coin bot'
    ? 'golden bot'
    : botName.trim().toLowerCase()
  return BOT_UPGRADES_DATA.find(bot => bot.name.toLowerCase() === normalized || bot.label.toLowerCase() === normalized)
}

export function findBotStatIndex(bot: BotData, statName: string, tier: BotUpgradeTier = 'base'): number {
  const tierData = getTierData(bot, tier)
  if (!tierData) return -1
  const normalized = statName.trim().toLowerCase()
  return tierData.statOrder.findIndex(name => name.toLowerCase() === normalized)
}

export function getBotStatNames(bot: BotData): string[] {
  return getBotTierStatNames(bot, 'base')
}

export function getBotPlusStatNames(bot: BotData): string[] {
  return getBotTierStatNames(bot, 'plus')
}

export function getBotTierStatNames(bot: BotData, tier: BotUpgradeTier): string[] {
  const tierData = getTierData(bot, tier)
  return Array.isArray(tierData?.statOrder) ? [...tierData.statOrder] : []
}

export function getBotBaseValues(bot: BotData): string[] {
  return getBotTierBaseValues(bot, 'base')
}

export function getBotPlusBaseValues(bot: BotData): string[] {
  return getBotTierBaseValues(bot, 'plus')
}

export function getBotTierBaseValues(bot: BotData, tier: BotUpgradeTier): string[] {
  const tierData = getTierData(bot, tier)
  return tierData ? tierData.statOrder.map(statName => tierData.stats[statName]?.base ?? '') : []
}

export function getBotStatValues(bot: BotData): string[][] {
  return getBotTierStatValues(bot, 'base')
}

export function getBotPlusStatValues(bot: BotData): string[][] {
  return getBotTierStatValues(bot, 'plus')
}

export function getBotTierStatValues(bot: BotData, tier: BotUpgradeTier): string[][] {
  const tierData = getTierData(bot, tier)
  if (!tierData) return []
  return tierData.statOrder.map(statName => {
    const stat = tierData.stats[statName]
    return tierData.costs.map((_, level) => stat?.levels[level] ?? '')
  })
}

export function getBotStatBoundsByIndex(bot: BotData, statIndex: number): { min: number; max: number } {
  return getBotTierStatBoundsByIndex(bot, 'base', statIndex)
}

export function getBotPlusStatBoundsByIndex(bot: BotData, statIndex: number): { min: number; max: number } {
  return getBotTierStatBoundsByIndex(bot, 'plus', statIndex)
}

export function getBotTierStatBoundsByIndex(bot: BotData, tier: BotUpgradeTier, statIndex: number): { min: number; max: number } {
  const values = getBotTierStatValues(bot, tier)[statIndex] ?? []
  const validLevels = values
    .map((value, level) => ({ value: String(value || '').trim(), level }))
    .filter(item => item.value.length > 0)
    .map(item => item.level)

  if (validLevels.length === 0) return { min: 0, max: 0 }
  return {
    min: Math.min(...validLevels),
    max: Math.max(...validLevels),
  }
}

export function getBotStatBoundsByName(bot: BotData, statName: string): { min: number; max: number } {
  return getBotTierStatBoundsByName(bot, 'base', statName)
}

export function getBotPlusStatBoundsByName(bot: BotData, statName: string): { min: number; max: number } {
  return getBotTierStatBoundsByName(bot, 'plus', statName)
}

export function getBotTierStatBoundsByName(bot: BotData, tier: BotUpgradeTier, statName: string): { min: number; max: number } {
  const statIndex = findBotStatIndex(bot, statName, tier)
  if (statIndex < 0) return { min: 0, max: 0 }
  return getBotTierStatBoundsByIndex(bot, tier, statIndex)
}

export function normalizeBotStats(bot: BotData, labLevels: BotLabLevels = {}): BotStatRow[] {
  return getTierStatRows(bot, 'base', labLevels)
}

export function normalizeBotPlusStats(bot: BotData): BotStatRow[] {
  return getTierStatRows(bot, 'plus')
}

export function normalizeBotTierStats(bot: BotData, tier: BotUpgradeTier, labLevels: BotLabLevels = {}): BotStatRow[] {
  return getTierStatRows(bot, tier, labLevels)
}

/**
 * A bot stat's value at a level, as a number.
 *
 * The table stores what the game displays -- `20s`, `2.2x`, `20M` -- because
 * that is what the tracker shows. A model wants the number, and the unit is
 * carried by the stat rather than by the string: `Cooldown` is always seconds,
 * `Bonus` always a multiplier. So the suffix is stripped rather than
 * interpreted, and a stat whose string is not a number at all returns `null`
 * rather than `0`, which would read as a real value.
 *
 * The level is the *base* tier's, and lab levels are deliberately not applied
 * -- callers that want them add their own, as the effective paths do for the
 * Gold Bot's cooldown.
 */
export function botStatValue(
  botLabel: string,
  statName: string,
  level: number,
): number | null {
  const bot = findBotByName(botLabel)
  const stat = bot?.stats[statName]
  if (!stat) return null

  const wanted = Math.max(0, Math.floor(level))
  const raw = stat.levels[wanted] ?? stat.base
  const parsed = Number.parseFloat(String(raw).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

export function getBotStatMinLevel(stat: BotStatRow): number {
  const valid = stat.levels.filter(level => level.value !== '')
  if (!valid.length) return 0
  return Math.min(...valid.map(level => level.level))
}

export function getBotStatMaxLevel(stat: BotStatRow): number {
  const valid = stat.levels.filter(level => level.value !== '')
  if (!valid.length) return 0
  return Math.max(...valid.map(level => level.level))
}

export interface BotCostPreviewRow {
  level: number
  value: string
  cost: number
  cumulativeCost: number
}

export function buildBotStatCostRows(stat: BotStatRow, startLevel: number, targetLevel: number): BotCostPreviewRow[] {
  const clampedStart = Math.max(0, Math.trunc(startLevel))
  const clampedTarget = Math.max(clampedStart, Math.trunc(targetLevel))
  const rows: BotCostPreviewRow[] = []
  let cumulativeCost = 0

  for (const level of stat.levels) {
    if (level.level <= clampedStart || level.level > clampedTarget || level.value === '') {
      continue
    }

    cumulativeCost += level.cost
    rows.push({
      level: level.level,
      value: level.value,
      cost: level.cost,
      cumulativeCost,
    })
  }

  return rows
}

export function sumBotStatCostsBetween(stat: BotStatRow, startLevel: number, targetLevel: number): number {
  return buildBotStatCostRows(stat, startLevel, targetLevel).reduce((total, row) => total + row.cost, 0)
}

export function sumBotAllStatCosts(stats: BotStatRow[], startLevels: number[], targetLevels?: number[]): number {
  return stats.reduce((total, stat, index) => {
    const start = startLevels[index] ?? getBotStatMinLevel(stat)
    const target = targetLevels?.[index] ?? getBotStatMaxLevel(stat)
    return total + sumBotStatCostsBetween(stat, start, target)
  }, 0)
}

export function getBotUnlockCost(unlockedBotCount: number): number {
  const clamped = Math.max(0, Math.min(BOT_BASE_UNLOCK_COSTS.length - 1, Math.trunc(unlockedBotCount)))
  return BOT_BASE_UNLOCK_COSTS[clamped] ?? 0
}

export function sumBotUnlockCosts(unlockedBotCount: number): number {
  const clamped = Math.max(0, Math.min(BOT_UPGRADES_DATA.length, Math.trunc(unlockedBotCount)))
  let total = 0
  for (let index = 1; index <= clamped; index += 1) {
    total += getBotUnlockCost(index)
  }
  return total
}

/** Assign sequential unlock slots (1st = 150, 2nd = 300, …) among enabled base bots. */
export function getEnabledBotUnlockOrder(
  enabledLabels: readonly string[],
  orderLabels?: readonly string[],
): string[] {
  const enabledSet = new Set(enabledLabels)
  const canonicalOrder = orderLabels?.length
    ? [...orderLabels]
    : BOT_UPGRADES_DATA.map(bot => bot.label)

  const ordered: string[] = []
  for (const label of canonicalOrder) {
    if (enabledSet.has(label) && !ordered.includes(label)) ordered.push(label)
  }
  for (const label of enabledLabels) {
    if (!ordered.includes(label)) ordered.push(label)
  }
  return ordered
}

export function buildBotUnlockOrdinalByLabel(
  enabledLabels: readonly string[],
  orderLabels?: readonly string[],
): Map<string, number> {
  const ordinals = new Map<string, number>()
  getEnabledBotUnlockOrder(enabledLabels, orderLabels).forEach((label, index) => {
    ordinals.set(label, index + 1)
  })
  return ordinals
}

export function getBotUnlockCostForEnabledBot(
  botLabel: string,
  enabledLabels: readonly string[],
  orderLabels?: readonly string[],
): number {
  const ordinal = buildBotUnlockOrdinalByLabel(enabledLabels, orderLabels).get(botLabel)
  if (!ordinal) return 0
  return getBotUnlockCost(ordinal)
}

export function sumBotPlusUnlockCosts(unlockedPlusCount: number): number {
  const clamped = Math.max(0, Math.min(BOT_UPGRADES_DATA.length, Math.trunc(unlockedPlusCount)))
  return clamped * BOT_PLUS_UNLOCK_COST
}

export function sumBotSyncSlotCosts(slotCount: number): number {
  return Math.max(0, Math.trunc(slotCount)) * BOT_SYNC_SLOT_COST
}

export function parseBotMetricValue(value: string): number {
  return parseBaseNumber(value)
}

export function formatBotMetricValue(value: number, unit: string): string {
  return `${formatNumber(value)}${unit}`
}

export function getBotEffectiveRangeValue(rangeValue: string, towerRange = BASE_RANGE_ANCHOR): number {
  const baseRange = parseBaseNumber(rangeValue)
  if (!Number.isFinite(baseRange) || baseRange <= 0) return 0
  const rangeRatio = Math.max(0, Number(towerRange) || 0) / BASE_RANGE_ANCHOR
  return baseRange * rangeRatio
}

export function getBotEffectiveRangeScale(rangeValue: string, towerRange = BASE_RANGE_ANCHOR): number {
  const effectiveRange = getBotEffectiveRangeValue(rangeValue, towerRange)
  if (effectiveRange <= 0) return 0
  return (effectiveRange * effectiveRange) / (BASE_RANGE_ANCHOR * BASE_RANGE_ANCHOR)
}

export function getBotCoverageFraction(rangeValue: string, towerRange = BASE_RANGE_ANCHOR): number {
  return Math.min(1, getBotEffectiveRangeScale(rangeValue, towerRange))
}

export function estimateBotBotOverlapFraction(args: BotBotOverlapArgs): number {
  const otherCoverage = getBotCoverageFraction(args.otherRangeValue, args.towerRange)
  const botBotCoverage = getBotCoverageFraction(args.botBotRangeValue, args.towerRange)
  if (otherCoverage <= 0 || botBotCoverage <= 0) return 0

  const samePathOverlap = Math.min(1, botBotCoverage / Math.max(otherCoverage, Number.EPSILON))
  if (args.sharedPath) return samePathOverlap

  const randomOverlap = Math.min(1, Math.sqrt(otherCoverage * botBotCoverage))
  return Math.min(samePathOverlap, randomOverlap)
}

export function estimateBotBotAmplificationMultiplier(botBotBonusValue: string, maxPowerValue: string | undefined, overlapFraction: number): number {
  const botBotBonus = Math.max(1, parseBaseNumber(botBotBonusValue) || 1)
  const maxPower = Math.max(1, parseBaseNumber(maxPowerValue || '') || 1)
  return botBotBoostedMultiplier(botBotBonus, maxPower, overlapFraction)
}

export function estimateBotUptimeFraction(durationValue: string, cooldownValue: string): number {
  return computeUptimeRatio(parseBaseNumber(durationValue), parseBaseNumber(cooldownValue))
}

export function estimateAmplifiedBotMetricValue(baseMetricValue: string, botBotBonusValue: string, maxPowerValue: string | undefined, overlapFraction: number): string {
  const baseMetric = parseBaseNumber(baseMetricValue)
  if (!Number.isFinite(baseMetric)) return baseMetricValue
  const multiplier = estimateBotBotAmplificationMultiplier(botBotBonusValue, maxPowerValue, overlapFraction)
  const unit = parseUnit(baseMetricValue)
  return formatBotMetricValue(baseMetric * multiplier, unit)
}

export function estimateEffectiveAmplifiedBotMetricValue(
  baseMetricValue: string,
  botBotBonusValue: string,
  maxPowerValue: string | undefined,
  overlapFraction: number,
  botUptimeFraction: number,
  botBotUptimeFraction: number,
): string {
  const baseMetric = parseBaseNumber(baseMetricValue)
  if (!Number.isFinite(baseMetric)) return baseMetricValue
  const overlap = Math.max(0, Math.min(1, overlapFraction))
  const targetUptime = Math.max(0, Math.min(1, botUptimeFraction))
  const amplifierUptime = Math.max(0, Math.min(1, botBotUptimeFraction))
  const boostedMultiplier = Math.max(1, parseBaseNumber(botBotBonusValue) || 1) * Math.max(1, parseBaseNumber(maxPowerValue || '') || 1)
  const effectiveMultiplier = 1 + ((boostedMultiplier - 1) * overlap * amplifierUptime)
  const unit = parseUnit(baseMetricValue)
  return formatBotMetricValue(baseMetric * targetUptime * effectiveMultiplier, unit)
}
