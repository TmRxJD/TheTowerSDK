import { countImportableBattleRuns } from './battle-history'

import { type BattleReportImportPlan, planBattleReportImport } from './battle-reports'

import {

  countImportableItemsFromSaveRoot,

  formatSaveImportTrackerCountMessage,

  type SaveImportTrackerCounts,

} from './import-counts'

import { planSaveImportTracker, type SaveImportPlannerResult } from './import-planner'


export const SAVE_IMPORT_TRACKER_ORDER = [

  'battleReports',

  'lifetime',

  'workshop',

  'labs',

  'ultimateWeapons',

  'modules',

  'vault',

  'bots',

  'guardians',

  'relics',

  'dissonance',

  'cards',

] as const


export type SaveImportTrackerKey = typeof SAVE_IMPORT_TRACKER_ORDER[number]


export const SAVE_IMPORT_TRACKER_LABELS: Record<SaveImportTrackerKey, string> = {

  battleReports: 'Battle Reports',

  lifetime: 'Lifetime',

  workshop: 'Workshop',

  labs: 'Labs',

  ultimateWeapons: 'Ultimate Weapons',

  modules: 'Modules',

  vault: 'Vault',

  bots: 'Bots',

  guardians: 'Guardians',

  relics: 'Relics',

  dissonance: 'Dissonance',

  cards: 'Cards',

}


export type SaveImportTrackerDiscovery = {

  key: SaveImportTrackerKey

  label: string

  count: number

  summary: string

}


export type SaveImportDiscoveryResult = {

  trackers: SaveImportTrackerDiscovery[]

  battleReportPlan: BattleReportImportPlan

}


const EMPTY_TRACKER_MESSAGES: Record<Exclude<SaveImportTrackerKey, 'battleReports' | 'lifetime'>, string> = {

  workshop: 'No workshop data in save',

  labs: 'No labs data in save',

  ultimateWeapons: 'No ultimate weapon data in save',

  modules: 'No module data in save',

  vault: 'No vault data in save',

  bots: 'No importable bot data in save',

  guardians: 'No guardian data in save',

  relics: 'No relic data in save',

  dissonance: 'No dissonance wave data in save',

  cards: 'No importable card data in save',

}


function resolveBattleReportPlan(planner: SaveImportPlannerResult): BattleReportImportPlan {

  if (planner.payload?.key === 'battleReports') {

    return planner.payload.plan

  }

  return planBattleReportImport({}, [])

}


function resolveDiscoveryCount(

  key: SaveImportTrackerKey,

  planner: SaveImportPlannerResult,

  itemCounts: SaveImportTrackerCounts,

): number {

  if (key === 'battleReports') {

    return resolveBattleReportPlan(planner).importable.length

  }


  if (!planner.canImport) {

    return 0

  }


  const sharedCount = itemCounts[key]

  if (typeof sharedCount === 'number' && sharedCount > 0) {

    return sharedCount

  }


  return 1

}


function buildBattleReportSummary(

  planner: SaveImportPlannerResult,

  totalBattleRuns: number,

): string {

  const plan = resolveBattleReportPlan(planner)

  if (plan.importable.length > 0) {

    return `${plan.importable.length} new run(s) ready`

  }

  if (totalBattleRuns > 0) {

    return `All ${totalBattleRuns} run(s) already tracked`

  }

  return 'No battle reports in save'

}


function buildDiscoverySummary(

  planner: SaveImportPlannerResult,

  count: number,

): string {

  if (planner.key === 'battleReports') {

    return planner.skipReason ?? 'No battle reports in save'

  }


  if (planner.key === 'lifetime') {

    if (planner.canImport) {

      return 'Lifetime stats found in save'

    }

    if (count > 0) {

      return 'Lifetime data present but incomplete'

    }

    return planner.skipReason ?? 'No lifetime stats in save'

  }


  if (count > 0) {

    const formatted = formatSaveImportTrackerCountMessage(planner.key, count)

    return formatted ? `${formatted} found in save` : `${count.toLocaleString()} items found in save`

  }


  return planner.skipReason ?? EMPTY_TRACKER_MESSAGES[planner.key]

}


function buildTrackerDiscovery(

  key: SaveImportTrackerKey,

  planner: SaveImportPlannerResult,

  itemCounts: SaveImportTrackerCounts,

  totalBattleRuns: number,

): SaveImportTrackerDiscovery {

  const count = resolveDiscoveryCount(key, planner, itemCounts)

  const summary = key === 'battleReports'

    ? buildBattleReportSummary(planner, totalBattleRuns)

    : buildDiscoverySummary(planner, count)


  return {

    key,

    label: SAVE_IMPORT_TRACKER_LABELS[key],

    count,

    summary,

  }

}


/**

 * Canonical save-import discovery for bot + site.

 * Uses the same planner/import extractors as executeSaveImportTrackers — no legacy root-field scans.

 */

export function discoverSaveImportTrackers(

  parsedRoot: unknown,

  options?: { existingRuns?: Array<Record<string, unknown>> },

): SaveImportDiscoveryResult {

  const existingRuns = options?.existingRuns ?? []

  const itemCounts = countImportableItemsFromSaveRoot(parsedRoot)

  const totalBattleRuns = countImportableBattleRuns(parsedRoot)


  const planners = SAVE_IMPORT_TRACKER_ORDER.map(key => (

    planSaveImportTracker(key, parsedRoot, { existingRuns })

  ))


  const battlePlanner = planners.find(planner => planner.key === 'battleReports')

    ?? planSaveImportTracker('battleReports', parsedRoot, { existingRuns })

  const battleReportPlan = resolveBattleReportPlan(battlePlanner)


  const trackers = SAVE_IMPORT_TRACKER_ORDER.map((key, index) => (

    buildTrackerDiscovery(key, planners[index]!, itemCounts, totalBattleRuns)

  ))


  return { trackers, battleReportPlan }

}


export function defaultSelectedSaveImportTrackerKeys(

  trackers: readonly SaveImportTrackerDiscovery[],

): SaveImportTrackerKey[] {

  return trackers

    .filter(tracker => tracker.count > 0)

    .map(tracker => tracker.key)

}


export function formatSaveImportDiscoverySummary(

  trackers: readonly SaveImportTrackerDiscovery[],

  selectedKeys: readonly SaveImportTrackerKey[],

): string {

  const selected = new Set(selectedKeys)

  return trackers

    .map(tracker => {

      const marker = selected.has(tracker.key) ? '☑️' : '⬜'

      return `${marker} **${tracker.label}** — ${tracker.summary}`

    })

    .join('\n')

}


export function countImportableItemsFromSaveDiscovery(

  parsedRoot: unknown,

  options?: { existingRuns?: Array<Record<string, unknown>> },

): SaveImportTrackerCounts {

  const discovery = discoverSaveImportTrackers(parsedRoot, options)

  const counts: SaveImportTrackerCounts = {}

  for (const tracker of discovery.trackers) {

    if (tracker.count > 0) {

      counts[tracker.key] = tracker.count

    }

  }

  return counts

}
