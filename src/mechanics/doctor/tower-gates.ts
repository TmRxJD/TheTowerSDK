/**
 * Tower DiffRules for mechanics path → Graph-ids gatekeeper.
 */
import type { DiffRule, Plugin } from '@tmrxjd/governance-engine'
import { requireGraphIdsForBuckets } from '@tmrxjd/governance-engine'

export function createTowerMechanicsMutationRule(): DiffRule {
  return {
    id: 'gate.tower-mechanics-mutation',
    check(ctx) {
      const mechanicsPaths = ctx.paths.filter(
        p =>
          p.bucket === 'mechanics'
          || /packages\/sdk\/src\/mechanics\//.test(p.path)
          || /\/sdk-graph\/data\//.test(p.path)
          || /\/ep-graph\/data\//.test(p.path),
      )
      return requireGraphIdsForBuckets(mechanicsPaths, ctx.commitMessage, {
        buckets: ['mechanics'],
        ruleId: 'gate.tower-mechanics-mutation',
        pathMatches: p =>
          /packages\/sdk\/src\/mechanics\//.test(p)
          || /\/sdk-graph\/data\//.test(p)
          || /\/ep-graph\/data\//.test(p),
      })
    },
  }
}

/** Register Tower gates onto an existing plugin register callback. */
export function registerTowerGateRules(api: { diffRules: { add(rule: DiffRule): void } }): void {
  api.diffRules.add(createTowerMechanicsMutationRule())
}

export function createTowerGatesPlugin(): Plugin {
  return {
    id: 'tower.gates',
    capabilities: { domain: 'tower', tags: ['gates'] },
    register(api) {
      registerTowerGateRules(api)
    },
  }
}
