/** Shared shape for glossary entries, so the generated and curated halves agree. */

export type GlossaryKind = 'name' | 'acronym' | 'concept'

export type GlossaryDomain =
  | 'ultimate-weapon'
  | 'bot'
  | 'module'
  | 'card'
  | 'workshop'
  | 'lab'
  | 'guardian'
  | 'currency'
  | 'enemy'
  | 'tournament'
  | 'run'
  | 'sdk'

export interface GlossaryEntry {
  /** The term as it is written. */
  term: string
  kind: GlossaryKind
  domain: GlossaryDomain
  /**
   * What an acronym stands for. Must match a name that exists in the catalogs —
   * `glossary.test.ts` fails the build otherwise, which is what stops a plausible
   * expansion from being invented.
   */
  expansion?: string
  definition: string
  /** Set when the same term means more than one thing; check `domain` before using it. */
  ambiguous?: true
}
