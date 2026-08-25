import { describe, expect, it } from 'vitest'
import { loadSaveGraph, validateSaveGraph } from './index'
import { compilePlannerPipeline, listPlannerFamilies } from '../planner-engine'
import { isMonorepoCheckout } from '../repo-root'

/*
 * Monorepo only. The registry and the graph tooling name files by their monorepo path
 * (`packages/sdk/src/...`) and read them from a repo root found by walking up to
 * `scripts/mechanics-trust/`. In the published repository this package is the root, so those
 * reads resolve above the checkout and the whole file fails to collect. Skipping keeps the
 * enforcement here, where the paths mean something.
 */
const MONOREPO = isMonorepoCheckout()

/*
 * Loaded dynamically, and only in the monorepo.
 *
 * All four reach `doctor/diagnose` or `kernel/load`, which import `@tmrxjd/governance-engine` —
 * an in-development package that is DISABLED here and absent from the published repository. A
 * static import runs before any `skipIf` can apply, so with them at the top of the file the
 * whole suite failed to COLLECT in a clone, which reads as a broken test rather than one that
 * does not apply. See scripts/governance-engine-disabled.mjs.
 */
const [
  { runMechanicsSandbox },
  { generateMechanicsDocs },
  { collectMechanicsLspDiagnostics },
  { loadMechanicsContext },
] = MONOREPO
  ? await Promise.all([
      import('../sandbox'),
      import('../docs-gen'),
      import('../lsp'),
      import('../kernel'),
    ])
  : [{}, {}, {}, {}] as never

describe.skipIf(!MONOREPO)('save-graph', () => {
  it('loads seeded graph with modules and fields', () => {
    const g = loadSaveGraph()
    expect(Object.keys(g.nodes).length).toBeGreaterThan(50)
    expect(Object.values(g.nodes).some(n => n.type === 'save.module')).toBe(true)
    expect(Object.values(g.nodes).some(n => n.type === 'save.field')).toBe(true)
    expect(Object.values(g.nodes).some(n => n.type === 'save.field' && n.status === 'verified')).toBe(true)
    expect(validateSaveGraph(g).errors).toEqual([])
  })
})

describe.skipIf(!MONOREPO)('planner-engine scaffold', () => {
  it('compiles structural pipeline with graph citations when available', () => {
    const pipe = compilePlannerPipeline('eEcon')
    expect(['deferred', 'citations']).toContain(pipe.codegen)
    expect(pipe.source).toBe('graph')
    expect(pipe.steps.length).toBeGreaterThan(3)
    expect(listPlannerFamilies().some(f => f.includes('eEcon'))).toBe(true)
  })
})

describe.skipIf(!MONOREPO)('sandbox spine', () => {
  it('runs save-graph mode without applying repairs', () => {
    const r = runMechanicsSandbox({ request: { mode: 'save-graph' } })
    expect(r.ok).toBe(true)
    expect(r.traces.some(t => t.step === 'save-graph.load' && t.ok)).toBe(true)
  })

  it('decodes JSON fixture', () => {
    const r = runMechanicsSandbox({
      request: {
        mode: 'decode',
        savePath: 'packages/sdk/src/save/fixtures/perk-preferences.sample.json',
      },
    })
    expect(r.ok).toBe(true)
    const decode = r.traces.find(t => t.step === 'save.decode')
    expect(decode?.ok).toBe(true)
    expect((decode?.detail as { kind?: string })?.kind).toBe('json-fixture')
  })
})

describe.skipIf(!MONOREPO)('docs-gen', () => {
  it('writes generated overview', () => {
    const r = generateMechanicsDocs({ includeDoctor: false })
    expect(r.ok).toBe(true)
    expect(r.wrote.some(p => p.endsWith('overview.md'))).toBe(true)
  })
})

describe.skipIf(!MONOREPO)('lsp diagnostics', () => {
  it('returns an array from kernel/doctor/save', () => {
    const diags = collectMechanicsLspDiagnostics({ includeDoctor: true })
    expect(Array.isArray(diags)).toBe(true)
  })
})

describe.skipIf(!MONOREPO)('kernel includes save graph', () => {
  it('exposes graphs.save summary', () => {
    const ctx = loadMechanicsContext({ includeDoctor: false })
    expect(ctx.graphs.save.nodeCount).toBeGreaterThan(50)
    expect(ctx.ok).toBe(true)
  })
})
