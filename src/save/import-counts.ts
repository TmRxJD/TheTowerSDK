import { BOT_UPGRADES_DATA, getBotPlusStatNames, getBotStatNames } from '../data/bots'
import { extractBotsFromSaveRoot } from './bots'
import { countImportableBattleRuns } from './battle-history'
import { extractCardsFromSaveRoot, isTrackedCardSaveRow } from './cards'
import { canImportDissonanceFromSave, extractDissonanceFromSaveRoot } from './dissonance'
import { DISSONANCE_TYPE_KEYS } from '../internal/dissonance-calcs-local-state'
import { buildGuardianDefinitions, getGuardianStatNames } from '../data/guardians'
import { extractGuardiansFromSaveRoot } from './guardians'
import { extractLabsFromSaveRoot } from './labs'
import { isLabsTrackerResearchLabName } from '../data/labs'
import { extractLifetimeFromSaveRoot } from './lifetime'
import { canImportModulesToTracker, extractModulesFromSaveRoot } from './modules'
import { buildRelicsTrackerImportPayloadFromSaveRoot } from './relics'
import { canImportUltimateWeaponsToTracker, extractUltimateWeaponsFromSaveRoot } from './ultimate-weapons'
import { buildVaultTrackerImportPayload, extractVaultFromSaveRoot } from './vault'
import { extractWorkshopFromSaveRoot, WORKSHOP_PRESET_COUNT } from './workshop'

export type SaveImportTrackerCounts = Partial<Record<string, number>>

function countWorkshopItems(root: Record<string, unknown>): number | undefined {
  const workshop = extractWorkshopFromSaveRoot(root)
  if (!workshop?.presets) return undefined
  let statCount = 0
  const limit = Math.min(WORKSHOP_PRESET_COUNT, workshop.presets.length)
  for (let index = 0; index < limit; index += 1) {
    const preset = workshop.presets[index]
    if (!preset) continue
    statCount += Object.keys(preset.levels).length + Object.keys(preset.enhancementLevels).length
  }
  return statCount
}

function countLabsItems(root: Record<string, unknown>): number | undefined {
  const labs = extractLabsFromSaveRoot(root)
  if (!labs?.researches) return undefined
  return labs.researches.filter(
    row => row.displayName && row.level > 0 && isLabsTrackerResearchLabName(row.displayName),
  ).length
}

function countDissonanceItems(root: Record<string, unknown>): number | undefined {
  const dissonance = extractDissonanceFromSaveRoot(root)
  if (!dissonance || !canImportDissonanceFromSave(dissonance)) return undefined
  let waveCells = 0
  for (const row of dissonance.tierRows ?? []) {
    if (!row.hasData) continue
    for (const type of DISSONANCE_TYPE_KEYS) {
      const display = row[type]
      if (!display || display === '—') continue
      const wave = Number(String(display).replace(/\s*\(max\)\s*$/i, '').replace(/,/g, ''))
      if (Number.isFinite(wave) && wave > 0) waveCells += 1
    }
  }
  return waveCells
}

export function countImportableItemsFromSaveRoot(parsedRoot: unknown): SaveImportTrackerCounts {
  if (!parsedRoot || typeof parsedRoot !== 'object') return {}
  const root = parsedRoot as Record<string, unknown>

  const counts: SaveImportTrackerCounts = {}
  const workshopCount = countWorkshopItems(root)
  if (workshopCount != null) counts.workshop = workshopCount

  const labsCount = countLabsItems(root)
  if (labsCount != null) counts.labs = labsCount

  const uw = extractUltimateWeaponsFromSaveRoot(root)
  if (uw && canImportUltimateWeaponsToTracker(uw)) {
    counts.ultimateWeapons = (uw.slots ?? []).reduce((total, slot) => {
      return total + slot.baseStatLevels.length + (slot.unlocked ? 1 : 0) + (slot.plusLevel != null ? 1 : 0)
    }, 0)
  }

  const modules = extractModulesFromSaveRoot(root)
  if (modules && canImportModulesToTracker(modules)) {
    const equippedCount = (modules.equipped ?? []).filter(
      slot => slot.infoIndex != null || Boolean(slot.mappedName),
    ).length
    counts.modules = equippedCount + (modules.inventory ?? []).length
  }

  const cards = extractCardsFromSaveRoot(root)
  if (cards) {
    counts.cards = (cards.cards ?? []).filter(card => isTrackedCardSaveRow(card)).length
      + (cards.presetSlots ?? []).filter(slot => slot.card?.slug).length
  }

  const vault = extractVaultFromSaveRoot(root)
  if (vault) {
    const payload = buildVaultTrackerImportPayload(vault)
    if (payload) counts.vault = Object.keys(payload.levels).length
  }

  const botsExtract = extractBotsFromSaveRoot(root)
  if (botsExtract) {
    let statCount = 0
    for (let botIndex = 0; botIndex < BOT_UPGRADES_DATA.length; botIndex += 1) {
      const bot = BOT_UPGRADES_DATA[botIndex]!
      statCount += getBotStatNames(bot).length + getBotPlusStatNames(bot).length
    }
    counts.bots = statCount
  }

  const guardians = extractGuardiansFromSaveRoot(root)
  if (guardians?.chips) {
    const defs = buildGuardianDefinitions()
    counts.guardians = guardians.chips.reduce((total, chip) => {
      const guardian = defs.find(item => item.key === chip.trackerKey)
      return total + (guardian ? getGuardianStatNames(guardian).length : 0)
    }, 0)
  }

  const relics = buildRelicsTrackerImportPayloadFromSaveRoot(root)
  if (relics) {
    counts.relics = (relics.collectedRelicIds ?? []).length + (relics.collectedThemeNames ?? []).length
  }

  const lifetime = extractLifetimeFromSaveRoot(root)
  if (lifetime) {
    counts.lifetime = Object.keys(lifetime.values).filter(key => key !== 'date').length
  }

  counts.battleReports = countImportableBattleRuns(root)

  const dissonanceCount = countDissonanceItems(root)
  if (dissonanceCount != null) counts.dissonance = dissonanceCount

  return counts
}

export function formatSaveImportTrackerCountMessage(tracker: string, count: number | undefined): string | undefined {
  if (count == null || count <= 0) return undefined
  const labels: Record<string, [string, string]> = {
    workshop: ['stat', 'stats'],
    labs: ['lab', 'labs'],
    ultimateWeapons: ['stat', 'stats'],
    modules: ['module', 'modules'],
    cards: ['card', 'cards'],
    vault: ['node', 'nodes'],
    bots: ['stat', 'stats'],
    guardians: ['stat', 'stats'],
    relics: ['relic', 'relics'],
    lifetime: ['field', 'fields'],
    battleReports: ['run', 'runs'],
    dissonance: ['wave cell', 'wave cells'],
  }
  const [singular, plural] = labels[tracker] ?? ['item', 'items']
  return `${count} ${count === 1 ? singular : plural}`
}
