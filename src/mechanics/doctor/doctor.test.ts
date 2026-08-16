import { describe, expect, it } from 'vitest'
import {
  diagnoseDoctor,
  prescribeDoctor,
  repairDoctor,
  summarizeDoctorStatus,
  validateDoctor,
  type DoctorIssue,
  type DoctorReport,
} from './index'
import { buildSheetDriftMutateOps } from '../sdk-graph/sheet-drift-mutate'

describe('sdk doctor', () => {
  it('diagnose on live tree is not broken (info ok)', () => {
    const report = diagnoseDoctor({ skipDriftFiles: false })
    expect(report.status === 'healthy' || report.status === 'degraded').toBe(true)
    expect(report.summary?.errorCount ?? 0).toBe(0)
    expect(Array.isArray(report.issues)).toBe(true)
  })

  it('summarizeDoctorStatus ranks error > warning > healthy', () => {
    expect(summarizeDoctorStatus([])).toBe('healthy')
    expect(summarizeDoctorStatus([{
      id: 'i', category: 'tests', severity: 'info', message: 'x',
    }])).toBe('healthy')
    expect(summarizeDoctorStatus([{
      id: 'w', category: 'tests', severity: 'warning', message: 'x',
    }])).toBe('degraded')
    expect(summarizeDoctorStatus([{
      id: 'e', category: 'symbols', severity: 'error', message: 'x',
    }])).toBe('broken')
  })

  it('prescribe maps symbol/debug issues to auto debugPatch', () => {
    const fake: DoctorReport = {
      status: 'broken',
      generatedAt: new Date().toISOString(),
      issues: [{
        id: 'symbols:missing-debug:Foo',
        category: 'symbols',
        severity: 'error',
        message: 'missing',
        nodeIds: ['lab.Damage'],
      }],
      recommendedPatches: [],
    }
    const plan = prescribeDoctor(fake)
    expect(plan.patches.some(p => p.kind === 'debugPatch' && p.autoApplicable)).toBe(true)
    expect(plan.autoCount).toBeGreaterThan(0)
  })

  it('prescribe maps formula drift to driftStatusPatch with mutate ops', () => {
    const ops = buildSheetDriftMutateOps([
      { nodeId: 'hide.eEcon.EO2.coinBonus', cell: 'eEcon!EO2', expected: '=A', live: '=B' },
    ])
    expect(ops).toHaveLength(1)
    const fake: DoctorReport = {
      status: 'broken',
      generatedAt: new Date().toISOString(),
      issues: [{
        id: 'drift:formula:hide.eEcon.EO2.coinBonus',
        category: 'drift',
        severity: 'error',
        message: 'drift',
        nodeIds: ['hide.eEcon.EO2.coinBonus'],
        evidence: { cell: 'eEcon!EO2', expected: '=A', live: '=B' },
      }],
      recommendedPatches: [],
    }
    const plan = prescribeDoctor(fake)
    const drift = plan.patches.find(p => p.kind === 'driftStatusPatch')
    expect(drift?.autoApplicable).toBe(true)
    expect(drift?.mutateOps?.length).toBeGreaterThan(0)
  })

  it('prescribe provenance issues as human-only', () => {
    const fake: DoctorReport = {
      status: 'broken',
      generatedAt: new Date().toISOString(),
      issues: [{
        id: 'verified-without-evidence',
        category: 'provenance',
        severity: 'error',
        message: 'no evidence',
        nodeIds: ['x'],
      }],
      recommendedPatches: [],
    }
    const plan = prescribeDoctor(fake)
    const human = plan.patches.find(p => p.kind === 'provenanceResearch')
    expect(human?.requiresHuman).toBe(true)
    expect(human?.autoApplicable).toBe(false)
  })

  it('repair dry-run skips auto patches without applying', () => {
    const plan = prescribeDoctor({
      status: 'broken',
      generatedAt: new Date().toISOString(),
      issues: [{
        id: 'symbols:missing-debug:Foo',
        category: 'symbols',
        severity: 'error',
        message: 'missing',
      }],
      recommendedPatches: [],
    })
    const result = repairDoctor(plan, { apply: false })
    expect(result.applied).toHaveLength(0)
    expect(result.skipped.some(s => s.reason.includes('dry-run'))).toBe(true)
  })

  it('validateDoctor returns trust + doctor', () => {
    const v = validateDoctor()
    expect(v.trust.mode).toBe('strict')
    expect(v.doctor).toBeTruthy()
    expect(v.debugErrors).toEqual([])
  })

  it('planted silent-style issue stays in prescribe coverage path', () => {
    const issues: DoctorIssue[] = [{
      id: 'coverage:silent:plant:x',
      category: 'planner',
      severity: 'error',
      message: 'silent',
      surfaceIds: ['plant:x'],
    }]
    const plan = prescribeDoctor({
      status: 'broken',
      generatedAt: new Date().toISOString(),
      issues,
      recommendedPatches: [],
    })
    expect(plan.patches.some(p => p.kind === 'coveragePatch')).toBe(true)
  })
})
