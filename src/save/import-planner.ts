import { buildBotsTrackerImportPayload, extractBotsFromSaveRoot } from './bots'
import { planBattleReportImport } from './battle-reports'
import { buildCardsTrackerImportPayload, extractCardsFromSaveRoot } from './cards'
import { canImportDissonanceFromSave, extractDissonanceFromSaveRoot } from './dissonance'
import { buildGuardiansTrackerImportPayload, extractGuardiansFromSaveRoot } from './guardians'
import { buildLabsTrackerImportPayload, extractLabsFromSaveRoot } from './labs'
import {
  buildLifetimeTrackerImportPayload,
  canImportLifetimeFromSave,
  extractLifetimeFromSaveRoot,
} from './lifetime'
import {
  buildModulesTrackerImportPayload,
  canImportModulesToTracker,
  extractModulesFromSaveRoot,
} from './modules'
import { buildRelicsTrackerImportPayloadFromSaveRoot } from './relics'
import {
  SAVE_IMPORT_TRACKER_LABELS,
  type SaveImportTrackerKey,
} from './import-discovery'
import {
  buildUltimateWeaponsTrackerImportPayload,
  canImportUltimateWeaponsToTracker,
  extractUltimateWeaponsFromSaveRoot,
  resolveUltimateWeaponCatalogForHubSync,
} from './ultimate-weapons'
import { buildVaultTrackerImportPayload, extractVaultFromSaveRoot } from './vault'
import {
  buildWorkshopTrackerImportPayloadFromSave,
  extractWorkshopFromSaveRoot,
} from './workshop'

export type SaveImportTrackerPayload =
  | { key: 'battleReports'; plan: ReturnType<typeof planBattleReportImport> }
  | { key: 'lifetime'; payload: ReturnType<typeof buildLifetimeTrackerImportPayload> }
  | { key: 'workshop'; payload: NonNullable<ReturnType<typeof buildWorkshopTrackerImportPayloadFromSave>> }
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

export function planSaveImportTracker(
  key: SaveImportTrackerKey,
  parsedRoot: unknown,
  options?: { existingRuns?: Array<Record<string, unknown>> },
): SaveImportPlannerResult {
  const label = SAVE_IMPORT_TRACKER_LABELS[key]
  const root = isRecord(parsedRoot) ? parsedRoot : null

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
    const extract = extractLifetimeFromSaveRoot(parsedRoot)
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
    const payload = buildWorkshopTrackerImportPayloadFromSave(parsedRoot)
    return {
      key,
      label,
      canImport: payload != null,
      skipReason: payload ? undefined : 'No workshop data in save.',
      payload: payload ? { key: 'workshop', payload } : null,
    }
  }

  if (key === 'labs') {
    const extract = extractLabsFromSaveRoot(root)
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
    const extract = extractUltimateWeaponsFromSaveRoot(parsedRoot)
    const canImport = canImportUltimateWeaponsToTracker(extract)
    const weapons = resolveUltimateWeaponCatalogForHubSync()
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
    const extract = extractModulesFromSaveRoot(parsedRoot)
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
    const extract = extractCardsFromSaveRoot(root)
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
    const extract = extractVaultFromSaveRoot(root)
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
    const extract = extractBotsFromSaveRoot(root)
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
    const extract = extractGuardiansFromSaveRoot(root)
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
    const extract = extractDissonanceFromSaveRoot(parsedRoot)
    const hasWaveData = canImportDissonanceFromSave(extract)
    const canImport = hasWaveData || extract != null
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
