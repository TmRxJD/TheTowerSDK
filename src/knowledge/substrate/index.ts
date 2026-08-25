/**
 * ACS substrate — schema, queries, maturity, contradiction detection.
 *
 * Nothing in this folder knows what The Tower is. It is the reusable half:
 * lift it into another repo, point it at different compartments, and the
 * tooling works unchanged.
 *
 * The Tower's actual knowledge lives in `../compartments/`.
 */
export * from './schema'
export * from './graph'
export * from './contradictions'
export * from './maturity'
export * from './game-version-timeline'
