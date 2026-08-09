import { TOWER_SUBSTATS_CLUSTER } from './player-stats'
import {
  type GameAssetModuleEffectRow,
  isModuleEffectsTablePopulated,
  MODULE_EFFECTS_TABLE,
} from './assets'
import {
  MODULE_EFFECT_RARITY_LABELS,
  MODULE_SUBSTATS_CLUSTER,
} from './module-enums'

export interface ResolvedModuleEffect {
  label: string
  category: string | null
  rarityName: string
  rarityValue: number
  benefitValue: number
  benefitType: number
  moduleType: number
  clusterIndex: number
}

export function getModuleEffectRow(saveIndex: number): GameAssetModuleEffectRow | null {
  const row = MODULE_EFFECTS_TABLE[String(saveIndex)]
  if (!row) return null
  if (!isModuleEffectsTablePopulated()) return null
  return row
}

export function resolveModuleEffect(saveIndex: number): ResolvedModuleEffect | null {
  const row = getModuleEffectRow(saveIndex)
  if (!row) return null

  const cluster =
    MODULE_SUBSTATS_CLUSTER.find(entry => entry.clusterValue === row.clusterIndex)
    ?? TOWER_SUBSTATS_CLUSTER.find(entry => entry.clusterValue === row.clusterIndex)
  const rarityName = MODULE_EFFECT_RARITY_LABELS[row.rarity]
    ?? `Tier ${row.rarity}`

  return {
    label: cluster?.label ?? `Unknown Stat ${row.clusterIndex}`,
    category: cluster?.category ?? null,
    rarityName,
    rarityValue: row.rarity,
    benefitValue: row.benefit,
    benefitType: row.benefitType,
    moduleType: row.type,
    clusterIndex: row.clusterIndex,
  }
}

export function resolveModuleEffectRarityName(saveIndex: number): string | null {
  return resolveModuleEffect(saveIndex)?.rarityName ?? null
}
