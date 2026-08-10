import { normalizeSharedCardsProgressInputs, type SharedCardsProgressInputs } from '../cards-progress-inputs'
import { computeWaveTimeSecondsFromWaCard } from '../../mechanics/enemy-drops-context'
import { syncUptimeBotsFromTracker, syncUptimeGuardiansFromTracker } from '../shared-uptime-inputs'
import { syncUptimeResearchLabsFromTracker } from '../shared-tool-inputs-from-research'
import { GAME_DATA_REGISTRY, type GameDataKey, resolveRegistryGameDataKey } from './game-data-registry'
import {
  BOT_GAME_INPUT_SPEC_BY_KEY,
  type BotGameDataKey,
} from './bot-game-input-keys'
import {
  GUARDIAN_GAME_INPUT_SPEC_BY_KEY,
  type GuardianGameDataKey,
} from './guardian-game-input-keys'
import {
  UPTIME_RESEARCH_LAB_SPEC_BY_KEY,
  type UptimeResearchLabDataKey,
} from './uptime-research-lab-keys'
import {
  DISSONANCE_ECHO_LAB_SPEC_BY_KEY,
  type DissonanceEchoLabDataKey,
} from './dissonance-echo-lab-keys'
import {
  buildUptimeResearchLabOptionLabel,
} from './uptime-research-lab-math'
import {
  buildDissonanceEchoLabOptionLabel,
} from './dissonance-echo-lab-dropdown-math'
import {
  buildResearchLabLevelEntries,
  buildResearchLabOptionLabel,
} from './research-lab-dropdown-math'
import {
  buildWorkshopEnhancementLevelEntries,
  buildWorkshopEnhancementOptionLabel,
} from './workshop-enhancement-dropdown-math'
import {
  buildGuardianStatLevelEntries,
  buildGuardianStatOptionLabel,
} from './guardian-stat-dropdown-math'
import {
  buildUwStatLevelEntries,
  buildUwStatOptionLabel,
} from './uw-stat-dropdown-math'
import {
  buildWorkshopStatLevelEntries,
  buildWorkshopStatOptionLabel,
  buildWorkshopTierLevelEntries,
  buildWorkshopTierOptionLabel,
} from './workshop-stat-dropdown-math'
import {
  buildModuleLevelEntries,
  buildModuleLevelOptionLabel,
  buildModuleQuantityEntries,
  buildModuleQuantityOptionLabel,
  buildModuleRarityLevelEntries,
  buildModuleRarityOptionLabel,
  buildModuleSubstatRarityEntries,
  buildModuleSubstatRarityOptionLabel,
} from './module-dropdown-math'
import {
  buildModuleDiscountEntries,
  buildModuleDiscountOptionLabel,
} from './module-calculator-dropdown-math'
import {
  buildModuleAssistEfficiencyEntries,
  buildModuleAssistEfficiencyOptionLabel,
  buildUptimeCompressorEntries,
  buildUptimeCompressorOptionLabel,
  buildUptimeMvnModeEntries,
  buildUptimeMvnModeOptionLabel,
  buildUptimeWavesPerBossEntries,
  buildUptimeWavesPerBossOptionLabel,
} from './uptime-relic-dropdown-math'
import {
  buildUptimeSubstatPickEntries,
  buildUptimeSubstatPickOptionLabel,
  type UptimeSubstatPickKind,
  type UptimeSubstatPickRole,
} from './uptime-substat-dropdown-math'
import {
  buildElsAssistSubstatEfficiencyEntries,
  buildElsAssistSubstatEfficiencyOptionLabel,
  buildElsModuleSubstatRarityEntries,
  buildElsModuleSubstatRarityOptionLabel,
  buildElsVaultStarEntries,
  buildElsVaultStarOptionLabel,
  buildElsWorkshopEnhancementDiscountEntries,
  buildElsWorkshopEnhancementDiscountOptionLabel,
  buildElsWorkshopUtilityDiscountEntries,
  buildElsWorkshopUtilityDiscountOptionLabel,
  buildElsWorkshopVaultDiscountEntries,
  buildElsWorkshopVaultDiscountOptionLabel,
  type ElsModuleSubstatLabel,
} from './els-dropdown-math'
import { evaluateExtendedDropdownOptions, isExtendedDropdownKey } from './extended-dropdown-evaluators'
import {
  buildBotLevelOptionLabel,
} from './bot-dropdown-math'
import {
  buildGuardianLevelOptionLabel,
  readGuardianUpgradeDisplayAtSourceLevel,
} from './guardian-dropdown-math'
import {
  buildGameDropdownHubContext,
  type GameDropdownHubContext,
  resolveBotGameInputLab,
} from './hub-context'
import type { StandardDropdownOption } from './types'
import type { SharedToolInputs } from '../shared-tool-inputs'

function formatWaveTimeLabel(seconds: number): string {
  const formatted = seconds.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return `${formatted}s/wave`
}

function evaluateBotGameInputOptions(
  key: BotGameDataKey,
  context: GameDropdownHubContext,
): StandardDropdownOption[] {
  const spec = BOT_GAME_INPUT_SPEC_BY_KEY[key]
  if (!spec) return []

  const labLevel = resolveBotGameInputLab(context, key, spec.kind)
  const registryItem = (GAME_DATA_REGISTRY as Record<string, typeof GAME_DATA_REGISTRY[keyof typeof GAME_DATA_REGISTRY] | undefined>)[key]
  if (!registryItem) return []

  return registryItem.data.map((entry: { value: number; baseValue: number }) => ({
    value: entry.value,
    label: buildBotLevelOptionLabel(spec.kind, spec.mapping.prefix, entry.value, labLevel),
  }))
}

function evaluateWaveAcceleratorCardLevelOptions(): StandardDropdownOption[] {
  return GAME_DATA_REGISTRY.wave_accelerator_level.data.map(entry => {
    const waveSeconds = computeWaveTimeSecondsFromWaCard(entry.value)
    return {
      value: entry.value,
      label: formatWaveTimeLabel(waveSeconds),
    }
  })
}

function evaluateCardGameLevelOptions(): StandardDropdownOption[] {
  return GAME_DATA_REGISTRY.card_game_level.data.map(entry => ({
    value: entry.value,
    label: String(entry.value),
  }))
}

function evaluateCardMasteryOptions(): StandardDropdownOption[] {
  return GAME_DATA_REGISTRY.card_mastery.data.map(entry => ({
    value: entry.value,
    label: entry.value === 0 ? 'Mastery 0' : `Mastery ${entry.value}`,
  }))
}

function evaluateCardMasterySelectOptions(): StandardDropdownOption[] {
  return GAME_DATA_REGISTRY.card_mastery_select.data.map(entry => ({
    value: entry.value,
    label: entry.value === -1
      ? 'No mastery'
      : entry.value === 0
        ? 'Mastery 0'
        : `Mastery ${entry.value}`,
  }))
}

function formatWaPercentLabel(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

function evaluateUptimeWaLevelOptions(): StandardDropdownOption[] {
  return GAME_DATA_REGISTRY.uptime_wa_level.data.map(entry => ({
    value: entry.value,
    label: formatWaPercentLabel(entry.baseValue),
  }))
}

function evaluateGuardianGameInputOptions(key: GuardianGameDataKey): StandardDropdownOption[] {
  const spec = GUARDIAN_GAME_INPUT_SPEC_BY_KEY[key]
  if (!spec) return []

  const registryItem = (GAME_DATA_REGISTRY as Record<string, typeof GAME_DATA_REGISTRY[keyof typeof GAME_DATA_REGISTRY] | undefined>)[key]
  if (!registryItem) return []

  return registryItem.data.map((entry: { value: number; baseValue: number }) => ({
    value: entry.value,
    label: buildGuardianLevelOptionLabel(
      readGuardianUpgradeDisplayAtSourceLevel(spec.mapping, spec.kind, entry.value),
    ),
  }))
}

function evaluateResearchLabLevelOptions(context: GameDropdownHubContext): StandardDropdownOption[] {
  const slug = context.researchLabSlug
  if (!slug) return []

  return buildResearchLabLevelEntries(slug).map(entry => ({
    value: entry.value,
    label: buildResearchLabOptionLabel(slug, entry.value),
  }))
}

function evaluateWorkshopEnhancementLevelOptions(context: GameDropdownHubContext): StandardDropdownOption[] {
  const enhancementKey = context.workshopEnhancementKey
  if (!enhancementKey) return []

  return buildWorkshopEnhancementLevelEntries(enhancementKey).map(entry => ({
    value: entry.value,
    label: buildWorkshopEnhancementOptionLabel(entry.value),
  }))
}

function evaluateGuardianStatLevelOptions(context: GameDropdownHubContext): StandardDropdownOption[] {
  const spec = context.guardianStatSpec
  if (!spec) return []

  return buildGuardianStatLevelEntries(spec).map(entry => ({
    value: entry.value,
    label: buildGuardianStatOptionLabel(spec, entry.value),
  }))
}

function evaluateUwStatLevelOptions(context: GameDropdownHubContext): StandardDropdownOption[] {
  const spec = context.uwStatSpec
  if (!spec) return []

  return buildUwStatLevelEntries(spec).map(entry => ({
    value: entry.value,
    label: buildUwStatOptionLabel(spec, entry.value),
  }))
}

function evaluateWorkshopStatLevelOptions(context: GameDropdownHubContext): StandardDropdownOption[] {
  const statKey = context.workshopStatKey
  if (!statKey) return []

  return buildWorkshopStatLevelEntries(statKey).map(entry => ({
    value: entry.value,
    label: buildWorkshopStatOptionLabel(statKey, entry.value),
  }))
}

function evaluateWorkshopTierLevelOptions(context: GameDropdownHubContext): StandardDropdownOption[] {
  const statKey = context.workshopStatKey
  const tierKind = context.workshopTierKind
  if (!statKey || !tierKind) return []

  const spec = {
    statKey,
    tierKind,
    minimumLevel: context.workshopTierMinimumLevel,
  }

  return buildWorkshopTierLevelEntries(spec).map(entry => ({
    value: entry.value,
    label: buildWorkshopTierOptionLabel(spec, entry.value),
  }))
}

function evaluateModuleRarityOptions(context: GameDropdownHubContext): StandardDropdownOption[] {
  return buildModuleRarityLevelEntries(context.moduleTemplateId).map(entry => ({
    value: entry.value,
    label: buildModuleRarityOptionLabel(entry.value),
  }))
}

function evaluateModuleLevelOptions(context: GameDropdownHubContext): StandardDropdownOption[] {
  const moduleRarity = context.moduleRarity
  if (!moduleRarity) return []

  return buildModuleLevelEntries(moduleRarity).map(entry => ({
    value: entry.value,
    label: buildModuleLevelOptionLabel(entry.value),
  }))
}

function evaluateModuleQuantityOptions(): StandardDropdownOption[] {
  return buildModuleQuantityEntries().map(entry => ({
    value: entry.value,
    label: buildModuleQuantityOptionLabel(entry.value),
  }))
}

function evaluateModuleSubstatRarityOptions(context: GameDropdownHubContext): StandardDropdownOption[] {
  return buildModuleSubstatRarityEntries(context.moduleMaxRarity).map(entry => ({
    value: entry.value,
    label: buildModuleSubstatRarityOptionLabel(entry.value),
  }))
}

function evaluateModuleDiscountOptions(): StandardDropdownOption[] {
  return buildModuleDiscountEntries().map(entry => ({
    value: entry.value,
    label: buildModuleDiscountOptionLabel(entry.value),
  }))
}

function evaluateModuleAssistEfficiencyOptions(context: GameDropdownHubContext): StandardDropdownOption[] {
  const minPct = context.uptimeAssistMinPct ?? 0
  return buildModuleAssistEfficiencyEntries(minPct).map(entry => ({
    value: entry.value,
    label: buildModuleAssistEfficiencyOptionLabel(entry.value, minPct),
  }))
}

function evaluateUptimeSubstatPickOptions(context: GameDropdownHubContext): StandardDropdownOption[] {
  const kind = context.uptimeSubstatPickKind as UptimeSubstatPickKind | undefined
  if (!kind) return []

  const role = (context.uptimeSubstatPickRole ?? 'primary') as UptimeSubstatPickRole
  const assistEffPct = context.uptimeAssistEffPct ?? 100

  return buildUptimeSubstatPickEntries(kind, { role, assistEffPct }).map(entry => ({
    value: entry.value,
    label: buildUptimeSubstatPickOptionLabel(kind, entry.value, { role, assistEffPct }),
  }))
}

function evaluateUptimeMvnModeOptions(): StandardDropdownOption[] {
  return buildUptimeMvnModeEntries().map(entry => ({
    value: entry.value,
    label: buildUptimeMvnModeOptionLabel(entry.value),
  }))
}

function evaluateUptimeCompressorOptions(): StandardDropdownOption[] {
  return buildUptimeCompressorEntries().map(entry => ({
    value: entry.value,
    label: buildUptimeCompressorOptionLabel(entry.value),
  }))
}

function evaluateUptimeWavesPerBossOptions(): StandardDropdownOption[] {
  return buildUptimeWavesPerBossEntries().map(entry => ({
    value: entry.value,
    label: buildUptimeWavesPerBossOptionLabel(entry.value),
  }))
}

function evaluateUptimeAssistEfficiencyOptions(context: GameDropdownHubContext): StandardDropdownOption[] {
  const minPct = context.uptimeAssistMinPct ?? 0
  return buildModuleAssistEfficiencyEntries(minPct).map(entry => ({
    value: entry.value,
    label: buildModuleAssistEfficiencyOptionLabel(entry.value, minPct),
  }))
}

function evaluateElsModuleSubstatRarityOptions(context: GameDropdownHubContext): StandardDropdownOption[] {
  const label = context.elsModuleSubstatLabel as ElsModuleSubstatLabel | undefined
  if (!label) return []

  return buildElsModuleSubstatRarityEntries(label).map(entry => ({
    value: entry.value,
    label: buildElsModuleSubstatRarityOptionLabel(label, entry.value),
  }))
}

function evaluateElsWorkshopUtilityDiscountOptions(): StandardDropdownOption[] {
  return buildElsWorkshopUtilityDiscountEntries().map(entry => ({
    value: entry.value,
    label: buildElsWorkshopUtilityDiscountOptionLabel(entry.value),
  }))
}

function evaluateElsWorkshopEnhancementDiscountOptions(): StandardDropdownOption[] {
  return buildElsWorkshopEnhancementDiscountEntries().map(entry => ({
    value: entry.value,
    label: buildElsWorkshopEnhancementDiscountOptionLabel(entry.value),
  }))
}

function evaluateElsWorkshopVaultDiscountOptions(): StandardDropdownOption[] {
  return buildElsWorkshopVaultDiscountEntries().map(entry => ({
    value: entry.value,
    label: buildElsWorkshopVaultDiscountOptionLabel(entry.value),
  }))
}

function evaluateElsVaultStarOptions(): StandardDropdownOption[] {
  return buildElsVaultStarEntries().map(entry => ({
    value: entry.value,
    label: buildElsVaultStarOptionLabel(entry.value),
  }))
}

function evaluateElsAssistSubstatEfficiencyOptions(): StandardDropdownOption[] {
  return buildElsAssistSubstatEfficiencyEntries().map(entry => ({
    value: entry.value,
    label: buildElsAssistSubstatEfficiencyOptionLabel(entry.value),
  }))
}

function evaluateUptimeResearchLabOptions(key: UptimeResearchLabDataKey): StandardDropdownOption[] {
  const spec = UPTIME_RESEARCH_LAB_SPEC_BY_KEY[key]
  if (!spec) return []

  const registryItem = (GAME_DATA_REGISTRY as Record<string, typeof GAME_DATA_REGISTRY[keyof typeof GAME_DATA_REGISTRY] | undefined>)[key]
  if (!registryItem) return []

  return registryItem.data.map((entry: { value: number; baseValue: number }) => ({
    value: entry.value,
    label: buildUptimeResearchLabOptionLabel(spec.kind, entry.value),
  }))
}

function evaluateDissonanceEchoLabOptions(key: DissonanceEchoLabDataKey): StandardDropdownOption[] {
  const spec = DISSONANCE_ECHO_LAB_SPEC_BY_KEY[key]
  if (!spec) return []

  const registryItem = (GAME_DATA_REGISTRY as Record<string, typeof GAME_DATA_REGISTRY[keyof typeof GAME_DATA_REGISTRY] | undefined>)[key]
  if (!registryItem) return []

  return registryItem.data.map((entry: { value: number; baseValue: number }) => ({
    value: entry.value,
    label: buildDissonanceEchoLabOptionLabel(spec.researchSlug, entry.value),
  }))
}

function evaluateByRegistryKey(
  key: GameDataKey,
  context: GameDropdownHubContext,
): StandardDropdownOption[] {
  if (key in BOT_GAME_INPUT_SPEC_BY_KEY) {
    return evaluateBotGameInputOptions(key as BotGameDataKey, context)
  }

  if (key in GUARDIAN_GAME_INPUT_SPEC_BY_KEY) {
    return evaluateGuardianGameInputOptions(key as GuardianGameDataKey)
  }

  if (key in UPTIME_RESEARCH_LAB_SPEC_BY_KEY) {
    return evaluateUptimeResearchLabOptions(key as UptimeResearchLabDataKey)
  }

  if (key in DISSONANCE_ECHO_LAB_SPEC_BY_KEY) {
    return evaluateDissonanceEchoLabOptions(key as DissonanceEchoLabDataKey)
  }

  switch (key) {
    case 'gold_bot_cooldown':
      return evaluateBotGameInputOptions('gb_cd_level', context)
    case 'wave_accelerator_level':
      return evaluateWaveAcceleratorCardLevelOptions()
    case 'card_game_level':
      return evaluateCardGameLevelOptions()
    case 'card_mastery':
      return evaluateCardMasteryOptions()
    case 'card_mastery_select':
      return evaluateCardMasterySelectOptions()
    case 'uptime_wa_level':
      return evaluateUptimeWaLevelOptions()
    case 'research_lab_level':
      return evaluateResearchLabLevelOptions(context)
    case 'workshop_enhancement_level':
      return evaluateWorkshopEnhancementLevelOptions(context)
    case 'guardian_stat_level':
      return evaluateGuardianStatLevelOptions(context)
    case 'uw_stat_level':
      return evaluateUwStatLevelOptions(context)
    case 'workshop_stat_level':
      return evaluateWorkshopStatLevelOptions(context)
    case 'workshop_tier_level':
      return evaluateWorkshopTierLevelOptions(context)
    case 'module_rarity':
      return evaluateModuleRarityOptions(context)
    case 'module_level':
      return evaluateModuleLevelOptions(context)
    case 'module_quantity':
      return evaluateModuleQuantityOptions()
    case 'module_substat_rarity':
      return evaluateModuleSubstatRarityOptions(context)
    case 'module_discount_pct':
      return evaluateModuleDiscountOptions()
    case 'module_assist_efficiency':
      return evaluateModuleAssistEfficiencyOptions(context)
    case 'uptime_substat_pick':
      return evaluateUptimeSubstatPickOptions(context)
    case 'uptime_mvn_mode':
      return evaluateUptimeMvnModeOptions()
    case 'uptime_compressor':
      return evaluateUptimeCompressorOptions()
    case 'uptime_waves_per_boss':
      return evaluateUptimeWavesPerBossOptions()
    case 'uptime_assist_efficiency':
      return evaluateUptimeAssistEfficiencyOptions(context)
    case 'els_module_substat_rarity':
      return evaluateElsModuleSubstatRarityOptions(context)
    case 'els_workshop_utility_discount':
      return evaluateElsWorkshopUtilityDiscountOptions()
    case 'els_workshop_enhancement_discount':
      return evaluateElsWorkshopEnhancementDiscountOptions()
    case 'els_workshop_vault_discount':
      return evaluateElsWorkshopVaultDiscountOptions()
    case 'els_vault_star_level':
      return evaluateElsVaultStarOptions()
    case 'els_assist_substat_efficiency':
      return evaluateElsAssistSubstatEfficiencyOptions()
    default:
      if (isExtendedDropdownKey(key)) {
        return evaluateExtendedDropdownOptions(key, context)
      }
      return []
  }
}

/**
 * Pure function to map canonical game data into player-adjusted dropdown options.
 * Framework-agnostic — pass hub KV slices from RxDB/Pinia without importing them here.
 */
export function evaluateDropdownOptions(
  key: GameDataKey | string,
  hubContext: GameDropdownHubContext | SharedToolInputs,
): StandardDropdownOption[] {
  const resolvedKey = resolveRegistryGameDataKey(String(key))
  if (!resolvedKey) return []

  const context = 'uptimeInputs' in hubContext
    || 'botLabLevels' in hubContext
    || 'cardsProgressInputs' in hubContext
    || 'guardianLevels' in hubContext
    || 'researchLabLevels' in hubContext
    || 'researchLabSlug' in hubContext
    || 'workshopEnhancementKey' in hubContext
    || 'guardianStatSpec' in hubContext
    || 'uwStatSpec' in hubContext
    || 'workshopStatKey' in hubContext
    || 'workshopTierKind' in hubContext
    || 'moduleTemplateId' in hubContext
    || 'moduleRarity' in hubContext
    || 'moduleMaxRarity' in hubContext
    || 'uptimeSubstatPickKind' in hubContext
    || 'uptimeSubstatPickRole' in hubContext
    || 'uptimeAssistEffPct' in hubContext
    || 'uptimeAssistMinPct' in hubContext
    || 'elsModuleSubstatLabel' in hubContext
    || 'workshopCalcTab' in hubContext
    || 'workshopCalcSection' in hubContext
    || 'workshopDiscountProfile' in hubContext
    || 'moduleStoneCostProfile' in hubContext
    || 'genericLabLevelMax' in hubContext
    || 'thornsTournamentTier' in hubContext
    || 'botBotBonusMultiplier' in hubContext
    || 'cardCopiesMax' in hubContext
    || 'cardEquippedSlotsMax' in hubContext
    || 'moduleTypeFilter' in hubContext
    || 'includeCustomSortOption' in hubContext
    || 'workshopTrackerSortProfile' in hubContext
    || 'moduleEquippedCategory' in hubContext
    || 'moduleEquippedExcludeTemplateIds' in hubContext
    || 'moduleSubstatCategory' in hubContext
    || 'moduleSubstatExcludeIds' in hubContext
    || 'moduleSubstatFilterRarity' in hubContext
    || 'moduleSubstatMaxRarity' in hubContext
    || 'cardTemplateExcludeIds' in hubContext
    || 'labsTypeFilterOptions' in hubContext
    || 'trackerPresetLabels' in hubContext
    || 'labsTypeFilter' in hubContext
    || 'labsNamePickerIncludeNames' in hubContext
    || 'labsNamePickerRuntimeEntries' in hubContext
    || 'labsNamePickerShowTypePrefix' in hubContext
    || 'labsTrackerLabName' in hubContext
    || 'labsTrackerLevelMode' in hubContext
    || 'labsTrackerLevelMin' in hubContext
    || 'labsTrackerLevelMax' in hubContext
    || 'uiDynamicDropdownOptions' in hubContext
    ? hubContext as GameDropdownHubContext
    : buildGameDropdownHubContext(resolvedKey, hubContext as SharedToolInputs)

  return evaluateByRegistryKey(resolvedKey, context)
}

export function resolveGameInputDisplayLabel(
  key: GameDataKey | string,
  value: number | null | undefined,
  hubContext: GameDropdownHubContext | SharedToolInputs,
): string | null {
  if (value == null || !Number.isFinite(Number(value))) return null
  const options = evaluateDropdownOptions(key, hubContext)
  const match = options.find(option => option.value === Number(value))
  return match?.label ?? null
}

export interface ImportBotsHubSeed {
  botLevels: Record<string, number[]>
  botLabLevels: Record<string, Record<string, number | undefined>>
}

/** Build read-only hub context for import previews from save-backed bot progress. */
export function buildImportHubContextFromBotProgress(seed: ImportBotsHubSeed): GameDropdownHubContext {
  return {
    botLabLevels: seed.botLabLevels,
    uptimeInputs: syncUptimeBotsFromTracker(seed.botLevels, seed.botLabLevels as Record<string, Record<string, number>>, {}),
  }
}

/** Build read-only hub context for import previews from normalized cards progress. */
export function buildImportHubContextFromCardsProgress(
  inputs: Partial<SharedCardsProgressInputs>,
): GameDropdownHubContext {
  return {
    cardsProgressInputs: normalizeSharedCardsProgressInputs(inputs),
  }
}

export interface ImportCardSaveRowSeed {
  slug: string | null
  level: number
  masteryUnlocked?: boolean
}

/** Map save-backed card rows into cardsProgressInputs for canonical import labels. */
export function buildImportHubContextFromCardSaveRows(
  cards: readonly ImportCardSaveRowSeed[],
): GameDropdownHubContext {
  const seed: Partial<SharedCardsProgressInputs> = {}

  for (const card of cards) {
    const slug = card.slug
    if (!slug) continue

    const level = Math.max(1, Math.min(7, Math.floor(Number(card.level) || 1)))
    const masteryUnlocked = card.masteryUnlocked === true && level >= 7

    if (slug === 'eb') {
      seed.ebLevel = level
      seed.ebMastery = masteryUnlocked ? 0 : -1
    } else if (slug === 'ws') {
      seed.wsLevel = level
      seed.wsMastery = masteryUnlocked ? 0 : -1
    } else if (slug === 'wa') {
      seed.waLevel = level
      seed.waMastery = masteryUnlocked ? 0 : -1
    }
  }

  return buildImportHubContextFromCardsProgress(seed)
}

/** Build read-only hub context for import previews from guardian chip progress. */
export function buildImportHubContextFromGuardianLevels(
  guardianLevels: Record<string, number[]>,
): GameDropdownHubContext {
  return {
    guardianLevels,
    uptimeInputs: syncUptimeGuardiansFromTracker(guardianLevels, {}),
  }
}

/** Build read-only hub context for import previews from research lab levels. */
export function buildImportHubContextFromResearchLabLevels(
  researchLabLevels: Record<string, number>,
): GameDropdownHubContext {
  return {
    researchLabLevels,
    uptimeInputs: syncUptimeResearchLabsFromTracker(researchLabLevels, {}),
  }
}
