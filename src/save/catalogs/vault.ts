import {
  harmonyTreeNodes,
  powerTreeNodes,
  type VaultTreeNode,
} from '../../data/vault-tree'
import {
  HARMONY_VAULT_SLOT_OVERRIDES,
  POWER_VAULT_SLOT_OVERRIDES,
} from './vault-overrides'
import { buildVaultPowerLevelSlotIndexById } from '../../data/vault-tree-traversal'

export interface VaultTrackerNodeSaveBinding {
  saveIndex: number
  id: string
  name: string
}

/** Chart document row order — layout only, not save serialization. */
export function buildVaultChartSlotIndexById(nodes: readonly VaultTreeNode[]): Record<string, number> {
  const map: Record<string, number> = {}
  nodes.forEach((node, index) => {
    map[node.id] = index
  })
  return map
}

export function applyVaultSlotIndexOverrides(
  saveIndexById: Record<string, number>,
  overrides: Readonly<Record<string, number>>,
): Record<string, number> {
  const map = { ...saveIndexById }
  for (const [id, saveIndex] of Object.entries(overrides)) {
    map[id] = saveIndex
  }
  return map
}

export function buildVaultTrackerNodeSlotBindings(
  nodes: readonly VaultTreeNode[],
  saveIndexById: Record<string, number>,
): VaultTrackerNodeSaveBinding[] {
  return nodes.map(node => ({
    saveIndex: saveIndexById[node.id] ?? -1,
    id: node.id,
    name: node.name,
  }))
}

/** Power: BFS parent-child walk; tier unlock nodes skip level-array slots. */
export const POWER_VAULT_TRACKER_SLOT_BINDINGS = buildVaultTrackerNodeSlotBindings(
  powerTreeNodes,
  applyVaultSlotIndexOverrides(
    buildVaultPowerLevelSlotIndexById(powerTreeNodes),
    POWER_VAULT_SLOT_OVERRIDES,
  ),
)

/** Harmony: chart layout order + confirmed end-node slot swaps. */
export const HARMONY_VAULT_TRACKER_SLOT_BINDINGS = buildVaultTrackerNodeSlotBindings(
  harmonyTreeNodes,
  applyVaultSlotIndexOverrides(
    buildVaultChartSlotIndexById(harmonyTreeNodes),
    HARMONY_VAULT_SLOT_OVERRIDES,
  ),
)
