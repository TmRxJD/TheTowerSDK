/**
 * Google Sheets, for tools that read a community workbook or write a player's own copy.
 *
 * ```ts
 * import { TowerSheets } from 'thetowersdk/sheets'
 *
 * const sheets = new TowerSheets({
 *   transport,                          // templates/sheets-client.ts is the googleapis one
 *   spreadsheetId: process.env.SHEET_ID!,
 *   protectSpreadsheets: [COMMUNITY_SHEET_ID],
 * })
 *
 * const grid = await sheets.readGrid('eEcon!G6:O50')
 * ```
 *
 * No `googleapis` dependency and no Node built-ins, so this runs in a browser, in a worker
 * and in a bot. You provide the transport; see `docs/GOOGLE_SHEETS.md` for setting up a
 * service account and sharing a sheet with it.
 */

export * from './a1'
export * from './client'
