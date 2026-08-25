import { ownLookupOr } from '../internal/own-lookup'
import { buildBotsTrackerImportPayload, readBotsFromSaveRoot } from './bots'
import { planBattleReportImport } from './battle-reports'
import { buildCardsTrackerImportPayload, readCardsFromSaveRoot } from './cards'
import { canImportDissonanceFromSave, readDissonanceFromSaveRoot } from './dissonance'
import { buildGuardiansTrackerImportPayload, readGuardiansFromSaveRoot } from './guardians'
import { buildLabsTrackerImportPayload, readLabsFromSaveRoot } from './labs'
import {
  buildLifetimeTrackerImportPayload,
  canImportLifetimeFromSave,
  readLifetimeFromSaveRoot,
} from './lifetime'
import {
  buildModulesTrackerImportPayload,
  canImportModulesToTracker,
  readModulesFromSaveRoot,
} from './modules'
import { buildRelicsTrackerImportPayloadFromSaveRoot } from './relics'
import {
  SAVE_IMPORT_TRACKER_LABELS,
  type SaveImportTrackerKey,
} from './import-discovery'
import {
  buildUltimateWeaponsTrackerImportPayload,
  canImportUltimateWeaponsToTracker,
  getUltimateWeaponCatalogForHubSync,
  readUltimateWeaponsFromSaveRoot,
} from './ultimate-weapons'
import { buildVaultTrackerImportPayload, readVaultFromSaveRoot } from './vault'
import {
  buildWorkshopTrackerImportPayload,
} from './workshop'

export type SaveImportTrackerPayload =
  | { key: 'battleReports'; plan: ReturnType<typeof planBattleReportImport> }
  | { key: 'lifetime'; payload: ReturnType<typeof buildLifetimeTrackerImportPayload> }
  | { key: 'workshop'; payload: NonNullable<ReturnType<typeof buildWorkshopTrackerImportPayload>> }
  | { key: 'labs'; payload: ReturnType<typeof buildLabsTrackerImportPayload> }
  | { key: 'ultimateWeapons'; payload: NonNullable<ReturnType<typeof buildUltimateWeaponsTrackerImportPayload>> }
  | { key: 'modules'; payload: NonNullable<ReturnType<typeof buildModulesTrackerImportPayload>> }
  | { key: 'cards'; payload: NonNullable<ReturnType<typeof buildCardsTrackerImportPayload>> }
  | { key: 'vault'; payload: NonNullable<ReturnType<typeof buildVaultTrackerImportPayload>> }
  | { key: 'bots'; payload: NonNullable<ReturnType<typeof buildBotsTrackerImportPayload>> }
  | { key: 'guardians'; payload: NonNullable<ReturnType<typeof buildGuardiansTrackerImportPayload>> }
  | { key: 'relics'; payload: NonNullable<ReturnType<typeof buildRelicsTrackerImportPayloadFromSaveRoot>> }
  | { key: 'dissonance'; payload: { syncSharedToolInputs: true; hasWaveData: boolean } }

export type SaveImportPlannerResult = {
  key: SaveImportTrackerKey
  label: string
  canImport: boolean
  skipReason?: string
  payload: SaveImportTrackerPayload | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Whether this is a decoded save at all, as opposed to something else.
 *
 * Several extractors accept any object and return an empty result for it, so
 * `{}` — a fetch that failed, a file that is not a save, a decode that gave up
 * — reached the planner and came back **importable**, with a payload full of
 * nothing. `canImport` is what a caller gates the write on, so that is an offer
 * to overwrite a tracker with blanks.
 *
 * Deliberately the weakest possible test: a record with at least one key. A
 * real save has hundreds, including saves far older than any of these
 * features, so this cannot refuse a legitimate one — and it catches every shape
 * a failure actually takes.
 */
function looksLikeSaveRoot(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).length > 0
}

export function planSaveImportTracker(
  key: SaveImportTrackerKey,
  parsedRoot: unknown,
  options?: { existingRuns?: Array<Record<string, unknown>> },
): SaveImportPlannerResult {
  /*
   * Own keys only. This is the label shown next to an import row, and an unknown key made
   * it a function rather than a name. Nothing below this reads the label, so this changes
   * what an unrecognised key is *called* and nothing about what any import does.
   */
  const label = ownLookupOr(SAVE_IMPORT_TRACKER_LABELS, key, String(key))
  const root = isRecord(parsedRoot) ? parsedRoot : null

  if (!looksLikeSaveRoot(parsedRoot)) {
    return { key, label, canImport: false, skipReason: 'This file is not a save.', payload: null }
  }

  if (key === 'battleReports') {
    const plan = planBattleReportImport(parsedRoot, options?.existingRuns ?? [])
    const canImport = plan.importable.length > 0
    return {
      key,
      label,
      canImport,
      skipReason: canImport ? undefined : 'No new battle reports to import.',
      payload: { key: 'battleReports', plan },
    }
  }

  if (key === 'lifetime') {
    const extract = readLifetimeFromSaveRoot(parsedRoot)
    const canImport = canImportLifetimeFromSave(extract)
    const payload = extract ? buildLifetimeTrackerImportPayload(extract) : null
    return {
      key,
      label,
      canImport,
      skipReason: canImport ? undefined : 'No importable lifetime stats in save.',
      payload: payload ? { key: 'lifetime', payload } : null,
    }
  }

  if (key === 'workshop') {
    const payload = buildWorkshopTrackerImportPayload(parsedRoot)
    return {
      key,
      label,
      canImport: payload != null,
      skipReason: payload ? undefined : 'No workshop data in save.',
      payload: payload ? { key: 'workshop', payload } : null,
    }
  }

  if (key === 'labs') {
    const extract = readLabsFromSaveRoot(root)
    const canImport = Boolean(
      extract
      && (
        extract.researches.some(row => row.displayName && row.level > 0)
        || extract.activeQueue.some(slot => slot.research?.displayName)
      ),
    )
    const payload = extract ? buildLabsTrackerImportPayload(extract) : null
    return {
      key,
      label,
      canImport,
      skipReason: canImport ? undefined : 'No importable labs data in save.',
      payload: canImport && payload ? { key: 'labs', payload } : null,
    }
  }

  if (key === 'ultimateWeapons') {
    const extract = readUltimateWeaponsFromSaveRoot(parsedRoot)
    const canImport = canImportUltimateWeaponsToTracker(extract)
    const weapons = getUltimateWeaponCatalogForHubSync()
    const payload = extract && canImport
      ? buildUltimateWeaponsTrackerImportPayload(extract, weapons)
      : null
    return {
      key,
      label,
      canImport: Boolean(payload),
      skipReason: canImport ? undefined : 'No importable ultimate weapon data in save.',
      payload: payload ? { key: 'ultimateWeapons', payload } : null,
    }
  }

  if (key === 'modules') {
    const extract = readModulesFromSaveRoot(parsedRoot)
    const canImport = canImportModulesToTracker(extract)
    const payload = extract && canImport ? buildModulesTrackerImportPayload(extract) : null
    return {
      key,
      label,
      canImport: Boolean(payload),
      skipReason: canImport ? undefined : 'No importable module data in save.',
      payload: payload ? { key: 'modules', payload } : null,
    }
  }

  if (key === 'cards') {
    const extract = readCardsFromSaveRoot(root)
    const payload = extract ? buildCardsTrackerImportPayload(extract) : null
    return {
      key,
      label,
      canImport: Boolean(payload),
      skipReason: payload ? undefined : 'No importable card data in save.',
      payload: payload ? { key: 'cards', payload } : null,
    }
  }

  if (key === 'vault') {
    const extract = readVaultFromSaveRoot(root)
    const payload = extract ? buildVaultTrackerImportPayload(extract) : null
    return {
      key,
      label,
      canImport: Boolean(payload),
      skipReason: payload ? undefined : 'No importable vault data in save.',
      payload: payload ? { key: 'vault', payload } : null,
    }
  }

  if (key === 'bots') {
    const extract = readBotsFromSaveRoot(root)
    const payload = extract ? buildBotsTrackerImportPayload(extract) : null
    return {
      key,
      label,
      canImport: Boolean(payload),
      skipReason: payload ? undefined : 'No importable bot data in save.',
      payload: payload ? { key: 'bots', payload } : null,
    }
  }

  if (key === 'guardians') {
    const extract = readGuardiansFromSaveRoot(root)
    const payload = extract ? buildGuardiansTrackerImportPayload(extract) : null
    return {
      key,
      label,
      canImport: Boolean(payload),
      skipReason: payload ? undefined : 'No importable guardian data in save.',
      payload: payload ? { key: 'guardians', payload } : null,
    }
  }

  if (key === 'relics') {
    const payload = buildRelicsTrackerImportPayloadFromSaveRoot(root)
    return {
      key,
      label,
      canImport: Boolean(payload),
      skipReason: payload ? undefined : 'No importable relic data in save.',
      payload: payload ? { key: 'relics', payload } : null,
    }
  }

  if (key === 'dissonance') {
    const extract = readDissonanceFromSaveRoot(parsedRoot)
    const hasWaveData = canImportDissonanceFromSave(extract)
    /*
     * `canImportDissonanceFromSave` is the answer, not half of it.
     *
     * This read `hasWaveData || extract != null`, and the extractor returns an
     * extract for any object — so the second half was always true and the first
     * never mattered. A record with one unrelated key came back importable.
     *
     * The helper already covers the case that clause was presumably for: it
     * accepts a save with no wave data as long as the Echo labs are unlocked,
     * which is the state where there is something to sync and nothing to show.
     */
    const canImport = hasWaveData
    return {
      key,
      label,
      canImport,
      skipReason: canImport ? undefined : 'No dissonance data in save.',
      payload: canImport
        ? { key: 'dissonance', payload: { syncSharedToolInputs: true, hasWaveData } }
        : null,
    }
  }

  return {
    key,
    label,
    canImport: false,
    skipReason: 'Unknown tracker key.',
    payload: null,
  }
}

export function planSaveImportTrackers(
  parsedRoot: unknown,
  selectedKeys: readonly SaveImportTrackerKey[],
  options?: { existingRuns?: Array<Record<string, unknown>> },
): SaveImportPlannerResult[] {
  return selectedKeys.map(key => planSaveImportTracker(key, parsedRoot, options))
}
