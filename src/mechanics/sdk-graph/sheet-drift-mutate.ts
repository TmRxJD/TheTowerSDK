/**
 * Re-export drift mutate helpers for vitest / TS callers.
 * Implementation lives in scripts/…/sheet-drift-mutate.mjs (Node-importable).
 */
import { createRequire } from 'node:module'
import path from 'node:path'

const requireMjs = createRequire(__filename)
const mod = requireMjs(
  path.join(__dirname, '../../../../../scripts/mechanics-trust/sheet-drift-mutate.mjs'),
) as {
  buildSheetDriftMutateOps: (
    mismatches: Array<{
      nodeId?: string
      cell?: string
      live?: unknown
      expected?: unknown
      error?: unknown
    }> | null | undefined,
    opts?: { now?: string },
  ) => Array<{
    op: 'modifyNode'
    id: string
    patch: {
      status: 'disputed'
      traps: Array<{ kind: 'other'; note: string }>
    }
  }>
  partitionOpsByGraph: (
    ops: Array<{ id: string }>,
    epNodeIds: Set<string>,
  ) => { ep: Array<{ id: string }>; core: Array<{ id: string }> }
}

export const buildSheetDriftMutateOps = mod.buildSheetDriftMutateOps
export const partitionOpsByGraph = mod.partitionOpsByGraph
