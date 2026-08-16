import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import {
  AUTO_PATCH_KINDS,
  type DoctorPatch,
  type DoctorPatchPlan,
  type DoctorRepairResult,
  DoctorRepairResultSchema,
} from './schema'
import { loadEpGraph } from '../ep-graph'
import { partitionOpsByGraph } from '../sdk-graph/sheet-drift-mutate'

export interface RepairDoctorOptions {
  repoRoot?: string
  /** When false, only report what would run. Default false for safety in library calls. */
  apply?: boolean
  /** Allow stub graphPatch researching nodes (Phase 1 opt-in). */
  stubs?: boolean
}

function resolveRepoRoot(explicit?: string): string {
  if (explicit) return explicit
  if (process.env.TOWER_MONOREPO_ROOT) return process.env.TOWER_MONOREPO_ROOT
  let dir = __dirname
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'scripts', 'mechanics-trust', 'check.mjs'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return path.join(__dirname, '../../../..')
}

function resolveTsxCli(repoRoot: string): string {
  const require = createRequire(path.join(repoRoot, 'package.json'))
  try {
    return require.resolve('tsx/cli')
  } catch {
    return path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  }
}

function runScript(repoRoot: string, scriptRel: string, args: string[] = []): {
  ok: boolean
  exitCode: number
  stdout: string
  stderr: string
  parsed: unknown
} {
  const tsx = resolveTsxCli(repoRoot)
  const script = path.join(repoRoot, scriptRel)
  const r = spawnSync(process.execPath, [tsx, script, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    env: process.env,
  })
  const stdout = (r.stdout || '').trim()
  let parsed: unknown = null
  try {
    parsed = JSON.parse(stdout)
  } catch {
    parsed = stdout ? { raw: stdout.slice(0, 500) } : null
  }
  return {
    ok: (r.status ?? 1) === 0,
    exitCode: r.status ?? 1,
    stdout,
    stderr: (r.stderr || '').trim(),
    parsed,
  }
}

function runMutate(repoRoot: string, target: 'core' | 'ep', ops: unknown[]): {
  ok: boolean
  detail: unknown
} {
  const script = target === 'ep'
    ? 'scripts/effective-paths/ep-graph-cli.mjs'
    : 'scripts/sdk-graph/sdk-graph-cli.mjs'
  const result = runScript(repoRoot, script, ['mutate', JSON.stringify(ops)])
  const parsed = result.parsed as { ok?: boolean; persisted?: boolean; issues?: unknown } | null
  const ok = result.ok && (parsed?.persisted === true || parsed?.ok === true)
  return { ok, detail: parsed ?? { exitCode: result.exitCode, stderr: result.stderr } }
}

function isAutoPatch(patch: DoctorPatch, stubs: boolean): boolean {
  if (patch.requiresHuman) return false
  if (!patch.autoApplicable) return false
  if (!AUTO_PATCH_KINDS.has(patch.kind)) return false
  if (patch.kind === 'graphPatch' && !stubs) return false
  return true
}

/**
 * Apply safe deterministic patches only. Inventive patches are skipped.
 */
export function repairDoctor(
  plan: DoctorPatchPlan,
  opts: RepairDoctorOptions = {},
): DoctorRepairResult {
  const repoRoot = resolveRepoRoot(opts.repoRoot)
  const apply = opts.apply === true
  const stubs = opts.stubs === true
  const applied: DoctorRepairResult['applied'] = []
  const skipped: DoctorRepairResult['skipped'] = []
  const remainingHuman: DoctorPatch[] = []

  // De-dupe script patches by script path
  const ranScripts = new Set<string>()

  for (const patch of plan.patches) {
    if (!isAutoPatch(patch, stubs)) {
      skipped.push({
        patchId: patch.id,
        reason: patch.requiresHuman
          ? 'requires human / agent research — not auto-applied'
          : `kind ${patch.kind} not auto-applicable in Phase 1`,
      })
      if (patch.requiresHuman || !AUTO_PATCH_KINDS.has(patch.kind)) {
        remainingHuman.push(patch)
      }
      continue
    }

    if (!apply) {
      skipped.push({ patchId: patch.id, reason: 'dry-run (pass apply:true to execute)' })
      continue
    }

    if (patch.mutateOps?.length) {
      const epIds = new Set(Object.keys(loadEpGraph().nodes))
      const ops = patch.mutateOps as Array<{ id: string }>
      const { ep, core } = partitionOpsByGraph(ops, epIds)
      let ok = true
      const details: unknown[] = []
      if (ep.length) {
        const r = runMutate(repoRoot, 'ep', ep)
        ok = ok && r.ok
        details.push({ target: 'ep', ...r })
      }
      if (core.length) {
        const r = runMutate(repoRoot, 'core', core)
        ok = ok && r.ok
        details.push({ target: 'core', ...r })
      }
      applied.push({ patchId: patch.id, ok, detail: details })
      continue
    }

    if (patch.script) {
      const key = `${patch.script}::${(patch.scriptArgs ?? []).join(' ')}`
      if (ranScripts.has(key)) {
        applied.push({ patchId: patch.id, ok: true, detail: { deduped: true } })
        continue
      }
      ranScripts.add(key)
      const r = runScript(repoRoot, patch.script, patch.scriptArgs ?? [])
      applied.push({
        patchId: patch.id,
        ok: r.ok,
        detail: { exitCode: r.exitCode, parsed: r.parsed, stderr: r.stderr.slice(0, 400) },
      })
      continue
    }

    skipped.push({ patchId: patch.id, reason: 'no script or mutateOps' })
  }

  return DoctorRepairResultSchema.parse({
    ok: applied.every(a => a.ok) && applied.length >= 0,
    applied,
    skipped,
    remainingHumanPatches: remainingHuman,
  })
}
