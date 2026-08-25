import { z } from 'zod'

export const McpToolCategorySchema = z.enum([
  'meta',
  'compliance',
  'graph',
  'debug',
  'doctor',
  'kernel',
  'registry',
  'invariants',
  'coverage',
  'drift',
  'planner',
  'calculator',
  'save',
  'sheet',
  'wiki',
  'docs',
  'sandbox',
  'commit',
])
export type McpToolCategory = z.infer<typeof McpToolCategorySchema>

export const McpGuaranteeSchema = z.enum([
  'deterministic',
  'structured',
  'noProseSoT',
  'noHallucinatedExports',
  'noSilentDrift',
  'verifiedNeedsEvidence',
  'mutateRefusesBadTrust',
  'doctorNeverInventFormulas',
  'noFeatureClosedWithoutApproval',
])
export type McpGuarantee = z.infer<typeof McpGuaranteeSchema>

export const McpToolCatalogEntrySchema = z.object({
  name: z.string().min(1),
  category: McpToolCategorySchema,
  module: z.enum(['meta', 'sdk', 'epaths', 'governance']),
  /** Guarantees this tool participates in / must uphold. */
  guarantees: z.array(McpGuaranteeSchema).default([]),
  shipped: z.boolean().default(true),
  notes: z.string().optional(),
})
export type McpToolCatalogEntry = z.infer<typeof McpToolCatalogEntrySchema>

export const McpContractSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  constitution: z.literal('docs/AGENT_MECHANICS_CONSTITUTION.md'),
  protocol: z.literal('docs/AGENT_MCP_CONTRACT.md'),
  categories: z.array(McpToolCategorySchema),
  guarantees: z.array(
    z.object({
      id: McpGuaranteeSchema,
      statement: z.string(),
    }),
  ),
  tools: z.array(McpToolCatalogEntrySchema),
  reserved: z.array(z.object({
    category: McpToolCategorySchema,
    reason: z.string(),
  })),
})
export type McpContract = z.infer<typeof McpContractSchema>
