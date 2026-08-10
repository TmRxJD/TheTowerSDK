import { ASSIST_MODULE_STONE_COSTS } from '../data/module-costs'
import type { ModuleType } from './shard-splitter-schema'

export type ModuleSelectItem = {
  title: string
  value: ModuleType
}

export type NumericSelectItem = {
  title: string
  value: number
}

export type StoneCostOption = {
  title: string
  value: number
  level: number
  percent: number
}

export const moduleTypeItems: ModuleSelectItem[] = [
  { title: 'Cannon', value: 'cannon' },
  { title: 'Defense', value: 'defense' },
  { title: 'Generator', value: 'generator' },
  { title: 'Core', value: 'core' },
]

export const assistPctItems: NumericSelectItem[] = Array.from({ length: 101 }, (_, index) => ({
  title: index === 0 ? '0 - Disabled' : `${index}%`,
  value: index,
}))

export const discountItems: NumericSelectItem[] = Array.from({ length: 31 }, (_, index) => ({
  title: `${index}%`,
  value: index,
}))

export const MODULE_RARITY_STEP_COSTS = [1000, 1200, 1400] as const

export function getStoneCostOptions(costs: readonly number[] = ASSIST_MODULE_STONE_COSTS): StoneCostOption[] {
  const options: StoneCostOption[] = [
    { title: 'Level: Unlock | 1% | 15 Stones', value: 15, level: 0, percent: 1 },
  ]

  for (let index = 1; index < costs.length; index += 1) {
    options.push({
      title: `Level ${index} | ${index + 1}% | ${costs[index]} Stones`,
      value: costs[index],
      level: index,
      percent: index + 1,
    })
  }

  return options
}

export function getStoneTargetOptions(options?: {
  costs?: readonly number[]
  maxedTitle?: string
  maxedValue?: number
  maxedLevel?: number
  maxedPercent?: number
}): StoneCostOption[] {
  const costs = options?.costs ?? ASSIST_MODULE_STONE_COSTS
  const targetOptions = getStoneCostOptions(costs).map(option => ({ ...option }))
  targetOptions.push({
    title: options?.maxedTitle ?? 'Level: Maxed | 70%',
    value: options?.maxedValue ?? 70,
    level: options?.maxedLevel ?? 70,
    percent: options?.maxedPercent ?? 70,
  })
  return targetOptions
}
