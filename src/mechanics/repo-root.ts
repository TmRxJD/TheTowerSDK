import fs from 'node:fs'
import path from 'node:path'

/**
 * Walk up from this package until the monorepo root (or fall back to package parent).
 * Deliberately dependency-free, so any build can import it.
 */
export function resolveMechanicsRepoRoot(explicit?: string): string {
  if (explicit) return explicit
  if (process.env.TOWER_MONOREPO_ROOT) return process.env.TOWER_MONOREPO_ROOT
  let dir = __dirname
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'scripts', 'mechanics-trust', 'check.mjs'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return path.join(__dirname, '../../..')
}
