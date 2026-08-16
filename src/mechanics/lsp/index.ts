import { validateMechanicsKernel, type LoadMechanicsKernelOptions } from '../kernel'
import { diagnoseDoctor } from '../doctor/diagnose'
import { loadSaveGraphDegraded } from '../save-graph'
import { compilePlannerPipeline, listPlannerFamilies } from '../planner-engine'

/** LSP-shaped diagnostic (subset of vscode-languageserver Diagnostic). */
export interface MechanicsLspDiagnostic {
  severity: 1 | 2 | 3 | 4 // Error | Warning | Information | Hint
  source: 'mechanics-lsp'
  code: string
  message: string
  data?: unknown
}

/**
 * Mechanics LSP Phase 1 — diagnostics provider only (no full language server process yet).
 * Feeds IDE/MCP from Kernel + Doctor + Save graph. No inventive fixes.
 */
export function collectMechanicsLspDiagnostics(
  opts: LoadMechanicsKernelOptions = {},
): MechanicsLspDiagnostic[] {
  const out: MechanicsLspDiagnostic[] = []
  const v = validateMechanicsKernel(opts)
  for (const e of v.errors) {
    out.push({ severity: 1, source: 'mechanics-lsp', code: 'kernel.error', message: e })
  }
  for (const w of v.warnings) {
    out.push({ severity: 2, source: 'mechanics-lsp', code: 'kernel.warning', message: w })
  }

  const doctor = diagnoseDoctor({ repoRoot: opts.repoRoot })
  for (const issue of doctor.issues) {
    if (issue.severity === 'info') continue
    out.push({
      severity: issue.severity === 'error' ? 1 : 2,
      source: 'mechanics-lsp',
      code: issue.id,
      message: issue.message,
      data: { category: issue.category, nodeIds: issue.nodeIds, paths: issue.paths },
    })
  }

  const save = loadSaveGraphDegraded()
  for (const e of save.errors) {
    out.push({ severity: 1, source: 'mechanics-lsp', code: 'save-graph.error', message: e })
  }
  for (const w of save.warnings.slice(0, 40)) {
    out.push({ severity: 3, source: 'mechanics-lsp', code: 'save-graph.warning', message: w })
  }

  return out
}

export function mechanicsLspHover(symbol: string): {
  contents: string
  kind: 'markdown'
} {
  const families = listPlannerFamilies()
  if (families.includes(symbol) || families.includes(`ep.${symbol}`)) {
    const pipe = compilePlannerPipeline(symbol)
    return {
      kind: 'markdown',
      contents: [
        `**Planner family** \`${pipe.family}\``,
        '',
        `codegen: \`${pipe.codegen}\` (graph citations only — never invented)`,
        '',
        ...pipe.steps.map(s => `- ${s.id}: ${s.kind} (${s.status})`),
      ].join('\n'),
    }
  }
  return {
    kind: 'markdown',
    contents: `Unknown mechanics symbol \`${symbol}\`. Try \`sdk_registry_get\` or \`mcp_contract\`.`,
  }
}
