/**
 * Kept so `thetowersdk/knowledge/schema` imports keep working.
 *
 * The schema now lives in `substrate/schema.ts`, because it is the half of
 * this system that knows nothing about The Tower and could be lifted into any
 * repo unchanged.
 */
export * from './substrate/schema'
