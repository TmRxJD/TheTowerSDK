/**
 * Thin Tower domain plugin for @tmrxjd/governance-engine PluginHost.
 * Full doctor probes live in doctor/tower-probes.ts (createTowerDoctorPlugin).
 */
export {
  createTowerDoctorPlugin,
  createTowerDoctorSession,
  type TowerDoctorPluginOptions,
  type TowerDoctorSessionMeta,
} from './doctor/tower-probes'

export {
  createTowerGatesPlugin,
  createTowerMechanicsMutationRule,
  registerTowerGateRules,
} from './doctor/tower-gates'

import { createTowerDoctorPlugin } from './doctor/tower-probes'

/** Named export for governance.plugins.json / host demos. */
export const towerGovernancePlugin = createTowerDoctorPlugin()
