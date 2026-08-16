import { z } from 'zod'
import type { TrustReport } from '../sdk-graph/trust-report'
import type { DoctorStatus } from '../doctor/schema'

export const MechanicsGraphSummarySchema = z.object({
  nodeCount: z.number().int().nonnegative(),
  edgeCount: z.number().int().nonnegative(),
  contentVersion: z.number().optional(),
  sheetVersion: z.string().optional(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
})
export type MechanicsGraphSummary = z.infer<typeof MechanicsGraphSummarySchema>

export const CoverageSurfaceSummarySchema = z.object({
  entryCount: z.number().int().nonnegative(),
  silentGapCount: z.number().int().nonnegative(),
  counts: z.record(z.string(), z.number()),
})
export type CoverageSurfaceSummary = z.infer<typeof CoverageSurfaceSummarySchema>

export const MechanicsContextSchema = z.object({
  generatedAt: z.string(),
  constitution: z.literal('docs/AGENT_MECHANICS_CONSTITUTION.md'),
  trustLabel: z.enum(['ok', 'degraded']),
  doctorStatus: z.enum(['healthy', 'degraded', 'broken']).optional(),
  graphs: z.object({
    sdk: MechanicsGraphSummarySchema,
    ep: MechanicsGraphSummarySchema,
    debug: MechanicsGraphSummarySchema,
    save: MechanicsGraphSummarySchema,
    commit: MechanicsGraphSummarySchema,
  }),
  coverage: z.object({
    surfaces: z.record(z.string(), CoverageSurfaceSummarySchema),
  }),
  indexHints: z.object({
    cellCount: z.number().int().nonnegative(),
    wikiCount: z.number().int().nonnegative(),
    symbolCount: z.number().int().nonnegative(),
    debugSymbolCount: z.number().int().nonnegative(),
    debugModuleCount: z.number().int().nonnegative(),
  }),
  trustOk: z.boolean(),
  ok: z.boolean(),
})
export type MechanicsContext = z.infer<typeof MechanicsContextSchema>

/** In-process kernel handle — full graphs for registry/doctor; not for MCP dumps. */
export interface MechanicsKernelHandle {
  context: MechanicsContext
  trust: TrustReport
  doctorStatus?: DoctorStatus
  /** Opaque loaded graphs — typed loosely to avoid circular export weight. */
  sdkGraph: unknown
  epGraph: unknown
  debugGraph: unknown
  saveGraph: unknown
  commitGraph: unknown
  inventories: Record<string, unknown>
}
