/**
 * Who this package is built on.
 *
 * Almost none of the knowledge here was worked out by this project. The Effective Paths formulas
 * are a community spreadsheet's maths; the save file's enum indexes were mapped by someone else;
 * a chunk of the earliest game data came from an older toolkit; the wiki pages are volunteers'
 * writing. The package translates that work into TypeScript, which is a much smaller thing than
 * producing it.
 *
 * So the roster is data, exported from the package, rather than a paragraph on a website. Anything
 * built on this can render the credits it is actually using, and a name cannot quietly go missing
 * from a redesign.
 *
 * `CONTRIBUTIONS` is the whole list. The per-area constants it is assembled from stay where the
 * work they credit lives — {@link EFFECTIVE_PATHS_AUTHORS} beside the formulas,
 * {@link WIKI_CREDIT_SOURCES} beside the wiki reader — so adding a source means adding a credit in
 * the same file rather than remembering a second one.
 */

import {
  EFFECTIVE_PATHS_ATTRIBUTION,
  EFFECTIVE_PATHS_AUTHORS,
  EFFECTIVE_PATHS_CONTRIBUTORS,
  EFFECTIVE_PATHS_MAINTAINERS,
  EFFECTIVE_PATHS_SOURCE,
  EFFECTIVE_PATHS_SUPPORT,
} from '../mechanics/effective-paths-credits'
import { WIKI_ATTRIBUTION, WIKI_CREDIT_SOURCES } from '../wiki/wiki-credits'

export interface Contributor {
  /** Spelled the way they spell it. */
  readonly name: string
  /** What they did, in one phrase. */
  readonly role?: string
}

export interface ContributionArea {
  /** What part of the package this covers. */
  readonly area: string
  /** What was contributed, in a sentence a reader can act on. */
  readonly what: string
  readonly people: readonly Contributor[]
  /** Where the work itself lives, when it is public. */
  readonly url?: string
}

/**
 * The people whose work this package carries.
 *
 * Ordered by how much of the package rests on it, not alphabetically.
 */
export const CONTRIBUTIONS: readonly ContributionArea[] = [
  {
    area: 'Effective Paths',
    what:
      'The Effective Paths spreadsheet: the upgrade-ordering maths this package ports, and the '
      + 'IDS master data behind it. Every eDamage and eCoin figure here traces to that sheet.',
    url: EFFECTIVE_PATHS_SOURCE.spreadsheetUrl,
    people: [
      ...EFFECTIVE_PATHS_AUTHORS,
      ...EFFECTIVE_PATHS_MAINTAINERS,
      ...EFFECTIVE_PATHS_CONTRIBUTORS,
    ],
  },
  {
    area: 'Save file mapping',
    what:
      'The enum indexes that turn a decoded save into named things. A save stores a module, a '
      + 'bot stat or a card as a number, and without the mapping every one of them reads as a '
      + 'plausible wrong answer rather than an error.',
    people: [{ name: 'Bisse', role: 'save enum indexes' }],
  },
  {
    area: 'TowerToolkit',
    what:
      'The original community toolkit. Some of the earliest game data in this package began as '
      + 'its tables, and the shape of several catalogs still follows it.',
    people: [{ name: 'Skye', role: 'TowerToolkit' }],
  },
  {
    area: 'Community wikis',
    what:
      'The prose this package reads and reformats. Nothing in the wiki reader produces knowledge '
      + 'of its own — the pages are volunteers\' writing, and each one links back to its history.',
    people: [{ name: 'The wiki editors', role: 'pages, edits and corrections' }],
  },
  {
    area: 'Charts',
    what: 'Curated chart datasets, several of which began as community-built tables.',
    people: [{ name: 'Larechar', role: 'chart data, with help from Skye' }],
  },
] as const

/**
 * Ways to support the people credited above, where a way exists.
 *
 * Tech Tree Games' webstore credits a creator code on purchase, so a code sends support at no
 * extra cost to the buyer. This is the only means this package has of giving back for work it
 * did not do.
 */
export const CONTRIBUTION_SUPPORT = [
  {
    label: 'Effective Paths team',
    creatorCode: EFFECTIVE_PATHS_SUPPORT.creatorCode,
    storeUrl: EFFECTIVE_PATHS_SUPPORT.storeUrl,
  },
] as const

/** Every attribution line the package carries, for a footer or an about box. */
export const ATTRIBUTION_LINES: readonly string[] = [
  EFFECTIVE_PATHS_ATTRIBUTION,
  WIKI_ATTRIBUTION,
  'Save enum indexes mapped by Bisse. Some early game data originates in Skye\'s TowerToolkit.',
]

export { WIKI_CREDIT_SOURCES }
export type { EffectivePathsCredit } from '../mechanics/effective-paths-credits'
