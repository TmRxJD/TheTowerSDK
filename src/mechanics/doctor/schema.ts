import { z } from 'zod'

export const DoctorStatusSchema = z.enum(['healthy', 'degraded', 'broken'])
export type DoctorStatus = z.infer<typeof DoctorStatusSchema>

export const DoctorIssueCategorySchema = z.enum([
  'fs',
  'symbols',
  'mechanicsGraph',
  'debugGraph',
  'save',
  'wiki',
  'tests',
  'planner',
  'provenance',
  'drift',
  'commit',
])
export type DoctorIssueCategory = z.infer<typeof DoctorIssueCategorySchema>

export const DoctorIssueSchema = z.object({
  id: z.string().min(1),
  category: DoctorIssueCategorySchema,
  severity: z.enum(['error', 'warning', 'info']),
  message: z.string().min(1),
  evidence: z.unknown().optional(),
  nodeIds: z.array(z.string()).optional(),
  paths: z.array(z.string()).optional(),
  surfaceIds: z.array(z.string()).optional(),
})
export type DoctorIssue = z.infer<typeof DoctorIssueSchema>

/** Patch kinds Phase 1 can auto-apply. */
export const DoctorAutoPatchKindSchema = z.enum([
  'graphPatch',
  'coveragePatch',
  'debugPatch',
  'docsPatch',
  'driftStatusPatch',
  'commitGraphAnnotate',
])

/** Patch kinds Phase 1 may only prescribe. */
export const DoctorHumanPatchKindSchema = z.enum([
  'codePatch',
  'testPatch',
  'plannerPatch',
  'provenanceResearch',
])

export const DoctorPatchKindSchema = z.union([
  DoctorAutoPatchKindSchema,
  DoctorHumanPatchKindSchema,
])
export type DoctorPatchKind = z.infer<typeof DoctorPatchKindSchema>

export const DoctorPatchSchema = z.object({
  id: z.string().min(1),
  kind: DoctorPatchKindSchema,
  autoApplicable: z.boolean(),
  requiresHuman: z.boolean(),
  reason: z.string().min(1),
  issueIds: z.array(z.string()).default([]),
  /** Script id relative to repo, e.g. scripts/mechanics-trust/seed-coverage-inventories.mjs */
  script: z.string().optional(),
  scriptArgs: z.array(z.string()).default([]),
  /** Graph mutate ops (sdk or ep) when kind is graphPatch / driftStatusPatch */
  mutateOps: z.array(z.unknown()).optional(),
  mutateTarget: z.enum(['core', 'ep', 'auto']).optional(),
})
export type DoctorPatch = z.infer<typeof DoctorPatchSchema>

export const DoctorPatchPlanSchema = z.object({
  generatedAt: z.string(),
  patches: z.array(DoctorPatchSchema),
  autoCount: z.number().int().nonnegative(),
  humanCount: z.number().int().nonnegative(),
})
export type DoctorPatchPlan = z.infer<typeof DoctorPatchPlanSchema>

export const DoctorReportSchema = z.object({
  status: DoctorStatusSchema,
  generatedAt: z.string(),
  issues: z.array(DoctorIssueSchema),
  recommendedPatches: z.array(DoctorPatchSchema).default([]),
  trust: z.unknown().optional(),
  drift: z
    .object({
      ok: z.boolean(),
      skipped: z.boolean().optional(),
      children: z.array(z.unknown()).optional(),
      path: z.string().optional(),
    })
    .optional(),
  summary: z
    .object({
      errorCount: z.number(),
      warningCount: z.number(),
      infoCount: z.number(),
      nodeCount: z.number().optional(),
      debugNodeCount: z.number().optional(),
    })
    .optional(),
})
export type DoctorReport = z.infer<typeof DoctorReportSchema>

export const DoctorRepairResultSchema = z.object({
  ok: z.boolean(),
  applied: z.array(z.object({
    patchId: z.string(),
    ok: z.boolean(),
    detail: z.unknown().optional(),
  })),
  skipped: z.array(z.object({
    patchId: z.string(),
    reason: z.string(),
  })),
  remainingHumanPatches: z.array(DoctorPatchSchema).default([]),
})
export type DoctorRepairResult = z.infer<typeof DoctorRepairResultSchema>

export function summarizeDoctorStatus(issues: readonly DoctorIssue[]): DoctorStatus {
  if (issues.some(i => i.severity === 'error')) return 'broken'
  if (issues.some(i => i.severity === 'warning')) return 'degraded'
  return 'healthy'
}

export const AUTO_PATCH_KINDS = new Set<string>(DoctorAutoPatchKindSchema.options)
