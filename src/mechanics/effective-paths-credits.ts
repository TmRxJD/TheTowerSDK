/**
 * Attribution for the Effective Paths formulas.
 *
 * The `effective-paths-*` modules in this package are ports of the community
 * "Effective Paths" spreadsheet. The math is the maintainers' work, not ours;
 * this package only translates it into TypeScript so other tools can reuse it.
 *
 * Anything built on those formulas should carry this credit somewhere a user
 * can see it. {@link EFFECTIVE_PATHS_ATTRIBUTION} is a ready-made line for that.
 *
 * Names are taken from the sheet's own Home Page as of the version in
 * {@link EFFECTIVE_PATHS_SOURCE}.
 */

export interface EffectivePathsCredit {
  /** Name as the sheet spells it. */
  readonly name: string
  /** The role the sheet gives them, where it gives one. */
  readonly role?: string
}

/** The sheet's primary authors, as listed under "Thank your favorite contributor". */
export const EFFECTIVE_PATHS_AUTHORS: readonly EffectivePathsCredit[] = [
  { name: 'Mattew', role: 'IDS Master' },
  { name: 'QuietFanta', role: 'eEcon Squirrel' },
] as const

/** Listed under "Other Maintainers & helpers". */
export const EFFECTIVE_PATHS_MAINTAINERS: readonly EffectivePathsCredit[] = [
  { name: 'Bisse' },
  { name: 'Shiriru' },
  { name: 'Gladiator' },
  { name: 'Meringue' },
] as const

/**
 * Listed on the sheet as the people who helped build it — "NOT ALL HEROES WEAR
 * CAPES", in its words.
 */
export const EFFECTIVE_PATHS_CONTRIBUTORS: readonly EffectivePathsCredit[] = [
  { name: '1410c' },
  { name: 'TP' },
  { name: 'Andy' },
  { name: 'Đ4ЯK3И5TØИ3' },
  { name: 'Audacious' },
  { name: 'Keizhac' },
  { name: 'IGotSlain' },
  { name: 'zAlpha' },
  { name: 'Nykola' },
  { name: 'Phil' },
  { name: 'Solaaar' },
  { name: 'iam_ImpulsE' },
  { name: 'TravellingPotato', role: 'grammar' },
  { name: 'Boromir' },
] as const

/** The sheet version these formulas were ported from. */
export const EFFECTIVE_PATHS_SOURCE = {
  version: 'v5.09.03.01',
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1YwZtKP6B4WYhRba5T6APJ1YxKNdfnIGQnprgnxmO7zc',
} as const

/**
 * How to support the Effective Paths team directly.
 *
 * Tech Tree Games' webstore credits a creator code on purchase, so entering `SHEETLORD`
 * sends support to the sheet's team at no extra cost to the buyer. This is the only way
 * this package can meaningfully give back for formulas it did not write.
 */
export const EFFECTIVE_PATHS_SUPPORT = {
  creatorCode: 'SHEETLORD',
  storeUrl: 'https://store.techtreegames.com/thetower/',
} as const

/** A one-line credit suitable for a footer or an about box. */
export const EFFECTIVE_PATHS_ATTRIBUTION =
  'Effective Paths formulas by Mattew, QuietFanta, Bisse and the Effective Paths maintainers. '
  + `Ported from the community spreadsheet (${EFFECTIVE_PATHS_SOURCE.version}).`

/**
 * The credit line plus the ask. Use this where there is room for two sentences; use
 * {@link EFFECTIVE_PATHS_ATTRIBUTION} where there is only room for one.
 */
export const EFFECTIVE_PATHS_ATTRIBUTION_WITH_SUPPORT =
  `${EFFECTIVE_PATHS_ATTRIBUTION} Support the Effective Paths team with creator code `
  + `${EFFECTIVE_PATHS_SUPPORT.creatorCode} in The Tower webstore.`
