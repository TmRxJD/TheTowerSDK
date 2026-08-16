import { z } from 'zod'

/** SDK-wide family partition (EP families are namespaced ep.*). */
export const SdkGraphFamilySchema = z.enum([
  'lab',
  'workshop',
  'guardian',
  'bots',
  'cards',
  'relics',
  'modules',
  'uw',
  'vault',
  'ep.eEcon',
  'ep.eHP',
  'ep.eRegen',
  'ep.eDamage',
  'ep.workbook',
  'sdk',
])
export type SdkGraphFamily = z.infer<typeof SdkGraphFamilySchema>

export const SdkGraphNodeTypeSchema = z.enum([
  'stat',
  'control',
  'gate',
  'resource',
  'timer',
  'ui',
  'candidate',
  'hide',
  'ids',
  'lambda',
  'display',
  'path',
  'unlock',
])
export type SdkGraphNodeType = z.infer<typeof SdkGraphNodeTypeSchema>

export const SdkSourceCellSchema = z.object({
  sheet: z.string().min(1),
  cell: z.string().regex(/^[A-Z]{1,3}\d{1,4}$/),
  kind: z.enum(['control', 'candidate', 'hide', 'ids', 'display', 'formula', 'data']),
})
export type SdkSourceCell = z.infer<typeof SdkSourceCellSchema>

export const SdkTrapSchema = z.object({
  kind: z.enum(['display-only', 'stale-row', 'maxed-account', 'spilled-range', 'other']),
  note: z.string().min(1),
})

export const SdkNodeStatusSchema = z.enum([
  'researching',
  'verified',
  'disputed',
  'deprecated',
])
export type SdkNodeStatus = z.infer<typeof SdkNodeStatusSchema>

export const SdkGraphNodeBaseSchema = z.object({
  id: z.string().min(1),
  family: SdkGraphFamilySchema,
  type: SdkGraphNodeTypeSchema,
  label: z.string().min(1),
  module: z.string().min(1).default('core'),
  sourceCells: z.array(SdkSourceCellSchema).default([]),
  wikiPages: z.array(z.string()).default([]),
  codeSymbols: z.array(z.string()).default([]),
  dependsOn: z.array(z.string()).default([]),
  formula: z.string().optional(),
  formulaSource: z.enum(['formulatext', 'lambda', 'wiki', 'code']).optional(),
  traps: z.array(SdkTrapSchema).default([]),
  status: SdkNodeStatusSchema,
  lambdaName: z.string().optional(),
})

export const SdkGraphNodeSchema = SdkGraphNodeBaseSchema.superRefine((node, ctx) => {
  if (node.formula != null && node.formulaSource == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'formula requires formulaSource',
      path: ['formulaSource'],
    })
  }
  const hasProv = (node.sourceCells?.length ?? 0) > 0
    || (node.wikiPages?.length ?? 0) > 0
    || (node.codeSymbols?.length ?? 0) > 0
    || !!node.lambdaName
  if (!hasProv) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'node needs sourceCells, wikiPages, codeSymbols, or lambdaName',
      path: ['sourceCells'],
    })
  }
})
export type SdkGraphNode = z.infer<typeof SdkGraphNodeSchema>

export const SdkEdgeKindSchema = z.enum([
  'reads',
  'gates',
  'hides',
  'prices',
  'imports',
  'displays',
  'derives',
  'syncs',
  'unlocks',
  'consumes',
  'produces',
])
export type SdkEdgeKind = z.infer<typeof SdkEdgeKindSchema>

export const SdkEdgeEvidenceSchema = z.object({
  sourceCells: z.array(SdkSourceCellSchema).optional(),
  wikiTitle: z.string().optional(),
  lambdaName: z.string().optional(),
  codeSymbol: z.string().optional(),
}).superRefine((ev, ctx) => {
  const ok = (ev.sourceCells?.length ?? 0) > 0
    || !!ev.wikiTitle
    || !!ev.lambdaName
    || !!ev.codeSymbol
  if (!ok) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'evidence needs sourceCells, wikiTitle, lambdaName, or codeSymbol',
    })
  }
})

export const SdkGraphEdgeBaseSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  kind: SdkEdgeKindSchema,
  evidence: SdkEdgeEvidenceSchema,
  module: z.string().min(1).default('core'),
})
export const SdkGraphEdgeSchema = SdkGraphEdgeBaseSchema
export type SdkGraphEdge = z.infer<typeof SdkGraphEdgeSchema>

export const SdkGraphSchema = z.object({
  schemaVersion: z.literal(1),
  contentVersion: z.number().int().nonnegative(),
  updatedAt: z.string().min(1),
  sheetVersion: z.string().optional(),
  historicalAllowlist: z.array(z.object({
    sheet: z.string().optional(),
    cell: z.string().optional(),
    wikiTitle: z.string().optional(),
    codeSymbol: z.string().optional(),
    note: z.string().min(1),
  })).default([]),
  nodes: z.record(z.string(), SdkGraphNodeSchema),
  edges: z.array(SdkGraphEdgeSchema),
})
export type SdkGraph = z.infer<typeof SdkGraphSchema>

export const SdkMutationOpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('addNode'),
    node: SdkGraphNodeSchema,
    reason: z.string().min(1),
    evidence: SdkEdgeEvidenceSchema,
  }),
  z.object({
    op: z.literal('modifyNode'),
    id: z.string().min(1),
    patch: SdkGraphNodeBaseSchema.partial().omit({ id: true }),
    reason: z.string().min(1),
    evidence: SdkEdgeEvidenceSchema,
  }),
  z.object({
    op: z.literal('deleteNode'),
    id: z.string().min(1),
    reason: z.string().min(1),
    evidence: SdkEdgeEvidenceSchema,
  }),
  z.object({
    op: z.literal('addEdge'),
    edge: SdkGraphEdgeSchema,
    reason: z.string().min(1),
  }),
  z.object({
    op: z.literal('modifyEdge'),
    id: z.string().min(1),
    patch: SdkGraphEdgeBaseSchema.partial().omit({ id: true }),
    reason: z.string().min(1),
    evidence: SdkEdgeEvidenceSchema,
  }),
  z.object({
    op: z.literal('deleteEdge'),
    id: z.string().min(1),
    reason: z.string().min(1),
    evidence: SdkEdgeEvidenceSchema,
  }),
])
export type SdkMutationOp = z.infer<typeof SdkMutationOpSchema>

export function sdkCellKey(cell: Pick<SdkSourceCell, 'sheet' | 'cell'>): string {
  return `${cell.sheet}!${cell.cell}`
}

/** Map EP module family → sdk family. */
export function epFamilyToSdk(family: string): SdkGraphFamily {
  const map: Record<string, SdkGraphFamily> = {
    eEcon: 'ep.eEcon',
    eHP: 'ep.eHP',
    eRegen: 'ep.eRegen',
    eDamage: 'ep.eDamage',
    workbook: 'ep.workbook',
  }
  return map[family] ?? 'ep.workbook'
}

export function sdkFamilyToEp(family: string): string | null {
  if (!family.startsWith('ep.')) return null
  return family.slice(3)
}
