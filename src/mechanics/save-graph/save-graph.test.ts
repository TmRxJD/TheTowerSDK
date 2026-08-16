import { describe, expect, it } from 'vitest'
import { loadSaveGraph, validateSaveGraph } from './index'
import { compilePlannerPipeline, listPlannerFamilies } from '../planner-engine'
import { runMechanicsSandbox } from '../sandbox'
import { generateMechanicsDocs } from '../docs-gen'
import { collectMechanicsLspDiagnostics } from '../lsp'
import { loadMechanicsContext } from '../kernel'

describe('save-graph', () => {
  it('loads seeded graph with modules and fields', () => {
    const g = loadSaveGraph()
    expect(Object.keys(g.nodes).length).toBeGreaterThan(50)
    expect(Object.values(g.nodes).some(n => n.type === 'save.module')).toBe(true)
    expect(Object.values(g.nodes).some(n => n.type === 'save.field')).toBe(true)
    expect(Object.values(g.nodes).some(n => n.type === 'save.field' && n.status === 'verified')).toBe(true)
    expect(validateSaveGraph(g).errors).toEqual([])
  })
})

describe('planner-engine scaffold', () => {
  it('compiles structural pipeline with graph citations when available', () => {
    const pipe = compilePlannerPipeline('eEcon')
    expect(['deferred', 'citations']).toContain(pipe.codegen)
    expect(pipe.source).toBe('graph')
    expect(pipe.steps.length).toBeGreaterThan(3)
    expect(listPlannerFamilies().some(f => f.includes('eEcon'))).toBe(true)
  })
})

describe('sandbox spine', () => {
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

describe('docs-gen', () => {
  it('writes generated overview', () => {
    const r = generateMechanicsDocs({ includeDoctor: false })
    expect(r.ok).toBe(true)
    expect(r.wrote.some(p => p.endsWith('overview.md'))).toBe(true)
  })
})

describe('lsp diagnostics', () => {
  it('returns an array from kernel/doctor/save', () => {
    const diags = collectMechanicsLspDiagnostics({ includeDoctor: true })
    expect(Array.isArray(diags)).toBe(true)
  })
})

describe('kernel includes save graph', () => {
  it('exposes graphs.save summary', () => {
    const ctx = loadMechanicsContext({ includeDoctor: false })
    expect(ctx.graphs.save.nodeCount).toBeGreaterThan(50)
    expect(ctx.ok).toBe(true)
  })
})
