/**
 * Tower premade builders — thin wrappers over existing SDK factories.
 * Do not re-implement formulas; call the canonical exports.
 * Domain-settings factory lives in platform — documented by path only (no sdk→platform import).
 */
import { applySdkGraphMutations, type SdkMutateResult } from '../sdk-graph/mutate'
import type { SdkGraph } from '../sdk-graph/schema'
import { applyEpGraphMutations, type EpMutateResult } from '../ep-graph/mutate'
import type { EpGraph } from '../ep-graph/schema'
import {
  collectPlannerCitations,
  emitPlannerCodegen,
  type PlannerCitation,
} from '../planner-engine/codegen'
import { generateMechanicsDocs, type DocsGenOptions, type DocsGenResult } from '../docs-gen'

export const TOWER_PREMADE_BUILDER_IDS = [
  'tower.builder.sdk-graph-mutate',
  'tower.builder.ep-graph-mutate',
  'tower.builder.planner-codegen',
  'tower.builder.mechanics-docs',
  'tower.builder.save-import-payload',
  'tower.builder.domain-settings-bundle',
] as const

export function applySdkGraphMutate(graph: SdkGraph, ops: readonly unknown[]): SdkMutateResult {
  return applySdkGraphMutations(graph, ops)
}

export function applyEpGraphMutate(graph: EpGraph, ops: readonly unknown[]): EpMutateResult {
  return applyEpGraphMutations(graph, ops)
}

export function runPlannerCodegen(opts: { family: string }): {
  family: string
  citations: PlannerCitation[]
} {
  return {
    family: opts.family,
    citations: collectPlannerCitations(opts.family),
  }
}

export function runPlannerCodegenEmit(opts: { family: string; repoRoot?: string }) {
  return emitPlannerCodegen(opts.family, { repoRoot: opts.repoRoot })
}

export function runMechanicsDocsGen(opts: DocsGenOptions = {}): DocsGenResult {
  return generateMechanicsDocs(opts)
}

/** Catalog of known save → tracker payload builder export names (documentation SoT). */
export function listSaveImportPayloadBuilders(): Array<{ exportName: string; module: string }> {
  return [
    { exportName: 'buildVaultTrackerImportPayload', module: 'packages/sdk/src/save/vault.ts' },
    { exportName: 'buildGuardiansTrackerImportPayload', module: 'packages/sdk/src/save/guardians.ts' },
    { exportName: 'buildWorkshopTrackerImportPayload', module: 'packages/sdk/src/save/workshop.ts' },
    { exportName: 'buildLifetimeTrackerImportPayload', module: 'packages/sdk/src/save/lifetime.ts' },
    { exportName: 'buildLabsTrackerImportPayload', module: 'packages/sdk/src/save/labs.ts' },
    { exportName: 'buildCardsTrackerImportPayload', module: 'packages/sdk/src/save/cards.ts' },
    { exportName: 'buildModulesTrackerImportPayload', module: 'packages/sdk/src/save/modules.ts' },
    { exportName: 'buildBotsTrackerImportPayload', module: 'packages/sdk/src/save/bots.ts' },
    { exportName: 'buildRelicsTrackerImportPayload', module: 'packages/sdk/src/save/relics.ts' },
    { exportName: 'buildUltimateWeaponsTrackerImportPayload', module: 'packages/sdk/src/save/ultimate-weapons.ts' },
  ]
}

/**
 * Points agents at the canonical domain-settings factory — does not invent bridges.
 * Implementation lives in platform (sdk must not import platform).
 */
export function describeDomainSettingsBundlePath(domainId: string): {
  domainId: string
  platformFactory: string
  wrapsExport: string
  siteBundleDir: string
} {
  return {
    domainId,
    platformFactory: 'packages/platform/src/tools/revisioned-domain-settings-factory.ts',
    wrapsExport: 'buildRevisionedDomainSettingsModule',
    siteBundleDir: 'src/services/domain-settings/',
  }
}

export {
  applySdkGraphMutations,
  applyEpGraphMutations,
  collectPlannerCitations,
  generateMechanicsDocs,
}
