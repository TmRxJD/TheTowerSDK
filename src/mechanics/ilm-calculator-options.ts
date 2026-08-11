import { BOT_UPGRADES_DATA } from '../data/index'
import { getModuleTemplate } from '../data/index'
import { MODULE_SUBSTAT_CANONICAL_DATA } from '../data/index'

export const ILM_DAMAGE_MODULE_SUBSTAT_LABEL = 'Inner Land Mines - Damage'
export const ILM_MODULE_SUBSTAT_NONE = 'none' as const

export type IlmModuleSubstatRarityChoice =
  | typeof ILM_MODULE_SUBSTAT_NONE
  | 'Common'
  | 'Rare'
  | 'Epic'
  | 'Legendary'
  | 'Mythic'
  | 'Ancestral'

export type IlmUniqueModuleRarityChoice =
  | typeof ILM_MODULE_SUBSTAT_NONE
  | 'Epic'
  | 'Legendary'
  | 'Mythic'
  | 'Ancestral'

export const ILM_UNIQUE_MODULE_IDS = {
  dimensionCore: 'dimension-core',
  magneticHook: 'magnetic-hook',
  singularityHarness: 'singularity-harness',
  antiCubePortal: 'anti-cube-portal',
} as const

export type IlmUniqueModuleId = typeof ILM_UNIQUE_MODULE_IDS[keyof typeof ILM_UNIQUE_MODULE_IDS]

export interface IlmSelectOption<T = number | string> {
  title: string
  value: T
}

function ilmDamageSubstatDefinition() {
  return MODULE_SUBSTAT_CANONICAL_DATA.Core.substats.find(
    entry => entry.label === ILM_DAMAGE_MODULE_SUBSTAT_LABEL,
  )
}

export function parseIlmModuleSubstatBonus(raw: string | null | undefined): number {
  if (!raw) return 0
  const parsed = Number.parseFloat(String(raw).replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function buildIlmModuleSubstatRarityOptions(): IlmSelectOption<IlmModuleSubstatRarityChoice>[] {
  const definition = ilmDamageSubstatDefinition()
  const options: IlmSelectOption<IlmModuleSubstatRarityChoice>[] = [
    { title: 'None', value: ILM_MODULE_SUBSTAT_NONE },
  ]
  if (!definition) return options

  for (const rarity of definition.availableRarities) {
    const display = definition.valuesByRarity[rarity]
    if (!display) continue
    options.push({
      title: `${rarity} (${display})`,
      value: rarity as IlmModuleSubstatRarityChoice,
    })
  }
  return options
}

export function ilmModuleSubstatBonusFromRarity(
  rarity: IlmModuleSubstatRarityChoice,
): number {
  if (rarity === ILM_MODULE_SUBSTAT_NONE) return 0
  const definition = ilmDamageSubstatDefinition()
  const raw = definition?.valuesByRarity[rarity]
  return parseIlmModuleSubstatBonus(raw)
}

export function buildIlmUniqueModuleRarityOptions(
  moduleId: IlmUniqueModuleId,
): IlmSelectOption<IlmUniqueModuleRarityChoice>[] {
  const template = getModuleTemplate(moduleId)
  const options: IlmSelectOption<IlmUniqueModuleRarityChoice>[] = [
    { title: 'Not equipped', value: ILM_MODULE_SUBSTAT_NONE },
  ]
  for (const bonus of template?.rarityBonuses ?? []) {
    options.push({
      title: `${bonus.rarity} (${bonus.value})`,
      value: bonus.rarity as IlmUniqueModuleRarityChoice,
    })
  }
  return options
}

export function computeIlmUniqueModuleRarityBonus(
  moduleId: IlmUniqueModuleId,
  rarity: IlmUniqueModuleRarityChoice,
): number {
  if (rarity === ILM_MODULE_SUBSTAT_NONE) return 0
  const template = getModuleTemplate(moduleId)
  const match = template?.rarityBonuses?.find(entry => entry.rarity === rarity)
  return match?.value ?? 0
}

export function computeAmplifyBotBonusMultiplier(level: number): number {
  const bot = BOT_UPGRADES_DATA.find(entry => entry.label === 'Amplify Bot')
  const raw = bot?.stats.Bonus?.levels[Math.max(0, Math.floor(level))]
  if (!raw) return 1
  const parsed = Number.parseFloat(String(raw).replace(/[^\d.]/g, ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export function buildIlmAmplifyBotBonusLevelOptions(): IlmSelectOption[] {
  const bot = BOT_UPGRADES_DATA.find(entry => entry.label === 'Amplify Bot')
  const levels = bot?.stats.Bonus?.levels ?? {}
  return Object.entries(levels).map(([levelKey, rawValue]) => ({
    title: `Level ${levelKey} (${rawValue})`,
    value: Number(levelKey),
  }))
}
