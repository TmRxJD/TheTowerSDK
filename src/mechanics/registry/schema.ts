import { z } from 'zod'

export const RegistryEntryKindSchema = z.enum([
  'mechanicNode',
  'graphEdge',
  'debugSymbol',
  'debugModule',
  'debugTest',
  'saveModule',
  'saveField',
  'coverageEntry',
  'invariant',
  'doctorIssue',
  'docContract',
  'mcpTool',
])
export type RegistryEntryKind = z.infer<typeof RegistryEntryKindSchema>

export const RegistryEntrySchema = z.object({
  id: z.string().min(1),
  kind: RegistryEntryKindSchema,
  label: z.string().min(1),
  family: z.string().optional(),
  path: z.string().optional(),
  status: z.string().optional(),
  refs: z.array(z.string()).default([]),
})
export type RegistryEntry = z.infer<typeof RegistryEntrySchema>

export const MechanicsRegistrySchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  constitution: z.literal('docs/AGENT_MECHANICS_CONSTITUTION.md'),
  countsByKind: z.record(z.string(), z.number()),
  entries: z.array(RegistryEntrySchema),
})
export type MechanicsRegistry = z.infer<typeof MechanicsRegistrySchema>
