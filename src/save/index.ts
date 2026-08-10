/**
 * Reading a player's save file.
 *
 * Two steps: decode `playerInfo.dat` into a save root, then pull typed data out
 * of that root. Decoding needs gzip and lives in `thetowersdk/node`; everything
 * here is pure and runs in a browser too.
 *
 * Every `extract*FromSaveRoot` returns `null` when the save has no data for that
 * feature, so older saves degrade to "this section is absent" instead of failing.
 *
 * @example
 * import { decodePlayerInfoSaveBytes } from 'thetowersdk/node'
 * import { extractLabsFromSaveRoot } from 'thetowersdk/save'
 *
 * const { parsedRoot } = decodePlayerInfoSaveBytes(bytes)
 * const labs = extractLabsFromSaveRoot(parsedRoot)
 */

// Reading raw values out of a save root, for fields the SDK does not model yet
export * from './read-values'
export * from './save-path'

// Per-feature extractors
export * from './labs'
export * from './lab-remaining'
export * from './workshop'
export * from './modules'
export * from './cards'
export * from './perks'
export * from './relics'
export * from './guardians'
export * from './bots'
export * from './ultimate-weapons'
export * from './vault'
export * from './themes'
export * from './dissonance'
export * from './favorite-labs'
export * from './lifetime'
export * from './killed-by'

// Run history and battle reports
export * from './battle-history'
export * from './battle-history-normalize'
export * from './battle-duration'
export * from './battle-reports'
export * from './battle-report-fields'
export * from './battle-report-extended'

// Module effect decoding
export * from './module-effects-decode'
export * from './module-effects-display'
export * from './module-effects-ids'
export * from './module-effects-registry'

// What is in this save? Inspect before importing anything.
export * from './import-discovery'
export * from './import-counts'

// Mapping save indices onto the named entities in `thetowersdk/data`
export * from './catalogs'
export * from './import-executor'
export * from './import-planner'
export * from './shared-tool-inputs-from-save'
export * from './shared-tool-inputs-from-save-extended'
