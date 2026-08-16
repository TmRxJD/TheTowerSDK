import fs from 'node:fs'
import path from 'node:path'
import { loadSdkGraphWithTrust, type TrustReport } from '../sdk-graph'
import { loadDebugGraphDegraded } from '../debug-graph'
import { diagnoseDoctor, type DiagnoseDoctorOptions } from './diagnose'
import { prescribeDoctor } from './prescribe'
import { repairDoctor, type RepairDoctorOptions } from './repair'
import type { DoctorPatchPlan, DoctorRepairResult, DoctorReport } from './schema'

export interface ValidateDoctorResult {
  ok: boolean
  trust: TrustReport
  debugErrors: string[]
  doctor?: DoctorReport
}

export function validateDoctor(opts: DiagnoseDoctorOptions = {}): ValidateDoctorResult {
  const { report: trust } = loadSdkGraphWithTrust({
    mode: 'degraded',
    scanPlannerCitations: true,
    checkDebugGraph: true,
  })
  // Force mode label for CI honesty
  const trustStrict = { ...trust, mode: 'strict' as const }
  const dbg = loadDebugGraphDegraded()
  const doctor = diagnoseDoctor(opts)
  const ok = trust.ok && dbg.errors.length === 0 && doctor.status !== 'broken'
  return {
    ok,
    trust: trustStrict,
    debugErrors: dbg.errors,
    doctor,
  }
}

export interface AutofixDoctorResult {
  status: DoctorReport['status']
  diagnosis: DoctorReport
  plan: DoctorPatchPlan
  repair: DoctorRepairResult
  validation: ValidateDoctorResult
}

export function autofixDoctor(
  opts: DiagnoseDoctorOptions & RepairDoctorOptions = {},
): AutofixDoctorResult {
  const diagnosis = diagnoseDoctor(opts)
  const withPatches = {
    ...diagnosis,
    recommendedPatches: prescribeDoctor(diagnosis).patches,
  }
  const plan = prescribeDoctor(withPatches)
  const repair = repairDoctor(plan, {
    repoRoot: opts.repoRoot,
    apply: opts.apply === true,
    stubs: opts.stubs === true,
  })
  const validation = validateDoctor(opts)
  return {
    status: validation.doctor?.status ?? diagnosis.status,
    diagnosis: { ...diagnosis, recommendedPatches: plan.patches },
    plan,
    repair,
    validation,
  }
}

export function writeDoctorReport(report: DoctorReport, repoRoot?: string): string {
  let root = repoRoot
  if (!root) {
    if (process.env.TOWER_MONOREPO_ROOT) root = process.env.TOWER_MONOREPO_ROOT
    else {
      let dir = __dirname
      for (let i = 0; i < 10; i++) {
        if (fs.existsSync(path.join(dir, 'package.json')) && fs.existsSync(path.join(dir, 'scripts'))) {
          root = dir
          break
        }
        dir = path.dirname(dir)
      }
    }
  }
  root = root ?? path.join(__dirname, '../../../..')
  const outDir = path.join(root, 'docs/mechanics-map/doctor')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'latest.json')
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`)
  return outPath
}
