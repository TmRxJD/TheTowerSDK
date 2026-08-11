import type { ModuleRarity } from './module-levels'

export type ModuleCalcType = 'cannon' | 'armor' | 'generator' | 'core'

const MODULE_MULTIPLIER_BASE: Record<ModuleCalcType, Record<ModuleRarity, number>> = {
  cannon: {
    Common: 0.01,
    Rare: 0.03,
    'Rare +': 0.05,
    Epic: 0.07,
    'Epic +': 0.1,
    Legendary: 0.13,
    'Legendary +': 0.16,
    Mythic: 0.2,
    'Mythic +': 0.25,
    Ancestral: 0.3,
    'Ancestral 1': 0.3,
    'Ancestral 2': 0.3,
    'Ancestral 3': 0.3,
    'Ancestral 4': 0.3,
    'Ancestral 5': 0.3,
  },
  armor: {
    Common: 0.01,
    Rare: 0.03,
    'Rare +': 0.05,
    Epic: 0.07,
    'Epic +': 0.1,
    Legendary: 0.13,
    'Legendary +': 0.16,
    Mythic: 0.2,
    'Mythic +': 0.25,
    Ancestral: 0.3,
    'Ancestral 1': 0.3,
    'Ancestral 2': 0.3,
    'Ancestral 3': 0.3,
    'Ancestral 4': 0.3,
    'Ancestral 5': 0.3,
  },
  generator: {
    Common: 0.01,
    Rare: 0.012,
    'Rare +': 0.015,
    Epic: 0.018,
    'Epic +': 0.022,
    Legendary: 0.025,
    'Legendary +': 0.028,
    Mythic: 0.032,
    'Mythic +': 0.035,
    Ancestral: 0.04,
    'Ancestral 1': 0.04,
    'Ancestral 2': 0.04,
    'Ancestral 3': 0.04,
    'Ancestral 4': 0.04,
    'Ancestral 5': 0.04,
  },
  core: {
    Common: 0.03,
    Rare: 0.05,
    'Rare +': 0.08,
    Epic: 0.12,
    'Epic +': 0.15,
    Legendary: 0.2,
    'Legendary +': 0.25,
    Mythic: 0.3,
    'Mythic +': 0.35,
    Ancestral: 0.4,
    'Ancestral 1': 0.4,
    'Ancestral 2': 0.4,
    'Ancestral 3': 0.4,
    'Ancestral 4': 0.4,
    'Ancestral 5': 0.4,
  },
}

const MODULE_MULTIPLIER_INCREMENT: Record<ModuleCalcType, Array<{ start: number; end: number; base: number; increment: number }>> = {
  cannon: [
    { start: 0, end: 19, base: 0, increment: 0.002 },
    { start: 20, end: 29, base: 0.04, increment: 0.004 },
    { start: 30, end: 39, base: 0.08, increment: 0.006 },
    { start: 40, end: 59, base: 0.14, increment: 0.008 },
    { start: 60, end: 79, base: 0.3, increment: 0.012 },
    { start: 80, end: 99, base: 0.54, increment: 0.03 },
    { start: 100, end: 119, base: 1.14, increment: 0.07 },
    { start: 120, end: 139, base: 2.54, increment: 0.1 },
    { start: 140, end: 159, base: 4.54, increment: 0.12 },
    { start: 160, end: 300, base: 6.94, increment: 0.2 },
  ],
  armor: [
    { start: 0, end: 19, base: 0, increment: 0.002 },
    { start: 20, end: 29, base: 0.04, increment: 0.004 },
    { start: 30, end: 39, base: 0.08, increment: 0.006 },
    { start: 40, end: 59, base: 0.14, increment: 0.008 },
    { start: 60, end: 79, base: 0.3, increment: 0.012 },
    { start: 80, end: 99, base: 0.54, increment: 0.03 },
    { start: 100, end: 119, base: 1.14, increment: 0.07 },
    { start: 120, end: 139, base: 2.54, increment: 0.1 },
    { start: 140, end: 159, base: 4.54, increment: 0.12 },
    { start: 160, end: 300, base: 6.94, increment: 0.2 },
  ],
  generator: [
    { start: 0, end: 19, base: 0, increment: 0.001 },
    { start: 20, end: 29, base: 0.02, increment: 0.001 },
    { start: 30, end: 39, base: 0.03, increment: 0.002 },
    { start: 40, end: 59, base: 0.05, increment: 0.003 },
    { start: 60, end: 79, base: 0.11, increment: 0.003 },
    { start: 80, end: 99, base: 0.17, increment: 0.004 },
    { start: 100, end: 119, base: 0.25, increment: 0.005 },
    { start: 120, end: 139, base: 0.35, increment: 0.006 },
    { start: 140, end: 159, base: 0.47, increment: 0.008 },
    { start: 160, end: 300, base: 0.63, increment: 0.01 },
  ],
  core: [
    { start: 0, end: 19, base: 0, increment: 0.01 },
    { start: 20, end: 29, base: 0.2, increment: 0.015 },
    { start: 30, end: 39, base: 0.35, increment: 0.02 },
    { start: 40, end: 59, base: 0.55, increment: 0.025 },
    { start: 60, end: 79, base: 1.05, increment: 0.03 },
    { start: 80, end: 99, base: 1.65, increment: 0.05 },
    { start: 100, end: 119, base: 2.65, increment: 0.08 },
    { start: 120, end: 139, base: 4.25, increment: 0.12 },
    { start: 140, end: 159, base: 6.65, increment: 0.15 },
    { start: 160, end: 300, base: 9.65, increment: 0.25 },
  ],
}

export function computeModuleStat(opts: { type: ModuleCalcType; rarityLabel: string; level: number }): number {
  const { type, rarityLabel } = opts
  const level = Math.max(1, Math.floor(Number(opts.level) || 1))
  const base = MODULE_MULTIPLIER_BASE[type]?.[rarityLabel as ModuleRarity]
  if (base === undefined) return 1
  const increments = MODULE_MULTIPLIER_INCREMENT[type]
  const range = increments.find(entry => level >= entry.start && level <= entry.end)
  if (!range) return 1 + base
  const increment = range.base + range.increment * (level - range.start)
  let result = base + increment
  const match = /Ancestral (\d)/.exec(rarityLabel)
  if (match) {
    const steps = Number.parseInt(match[1], 10)
    result *= 1 + 0.04 * steps
  }
  return 1 + Math.round(result * 1000) / 1000
}

export function normalizeModuleTypeForCalc(appType: 'cannon' | 'defense' | 'generator' | 'core'): ModuleCalcType {
  return appType === 'defense' ? 'armor' : appType
}
