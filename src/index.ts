/**
 * thetowersdk — build tools for The Tower.
 *
 * This barrel re-exports the two browser-safe entry points:
 *
 *   `thetowersdk/data`  game tables — costs, levels, effects, catalogs
 *   `thetowersdk/save`  read a player's save file into typed values
 *
 * Prefer those subpaths in application code so bundlers can drop what you do not
 * use. The save decoder needs Node and is imported from `thetowersdk/node`.
 */
export * from './data'
export * from './save'

// Number formatting that matches how the game displays values ("1.23K", "4.5B").
export * from './formatting'
