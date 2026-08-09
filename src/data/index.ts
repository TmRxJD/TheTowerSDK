/**
 * Game data — every table the game uses, as typed arrays and records.
 *
 * No I/O and no side effects: import a table and read it.
 *
 * @example
 * import { generatedLabs } from 'thetowersdk/data'
 *
 * const totalCost = (lab) => (lab.levels ?? []).reduce((sum, l) => sum + (l.cost ?? 0), 0)
 */

// Labs and research
export * from './labs'
export * from './labs-levels'
export * from './labs-research'
export * from './labs-static'
export * from './labs-categories'
export * from './labs-display-overrides'
export * from './research-lab-level'

// Workshop
export * from './workshop'
export * from './workshop-table'
export * from './workshop-costs'
export * from './workshop-tracker-definitions'
export * from './workshop-enhancement-tracker-definitions'
export * from './workshop-discount-normalize'

// Modules
export * from './modules'
export * from './module-enums'
export * from './module-levels'
export * from './module-info-catalog'
export * from './module-substats'
export * from './module-effect-resolver'

// Cards, perks, relics, guardians, bots
export * from './cards'
export * from './perks'
export * from './relics'
export * from './guardians'
export * from './guardian-upgrades'
export * from './bots'

// Ultimate weapons
export * from './ultimate-weapons'
export * from './ultimate-weapon-stones'

// Vault
export * from './vault-tree'
export * from './vault-tree-traversal'

// Player, assets, progression
export * from './player-stats'
export * from './assets'
export * from './tiers'
export * from './tournaments'
export * from './campaign-tier'
export * from './tools-catalog'
