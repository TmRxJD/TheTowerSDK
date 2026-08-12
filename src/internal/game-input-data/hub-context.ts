import type { SharedCardsProgressInputs } from '../cards-progress-inputs'
import type { SharedInputGroupId } from './shared-input-groups'
import type { SharedToolInputs } from '../shared-tool-inputs'
import type { SharedUptimeInputs } from '../shared-uptime-inputs'
import {
  BOT_GAME_INPUT_SPEC_BY_KEY,
  type BotGameDataKey,
  normalizeGameDataKey,
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
  type BotGameInputKind,
  findBotLabStatName,
  findUptimeLabFieldName,
} from './bot-dropdown-math'
import { findRegistryGameDataKey, type GameDataKey } from './game-data-registry'

export interface GameDropdownHubContext {
  uptimeInputs?: Partial<SharedUptimeInputs>
  botLabLevels?: Record<string, Record<string, number | undefined>>
  cardsProgressInputs?: Partial<SharedCardsProgressInputs>
  guardianLevels?: Record<string, number[]>
  researchLabLevels?: Record<string, number>
  /** Parametric slug for `research_lab_level` dropdown evaluation. */
  researchLabSlug?: string
  /** Parametric enhancement key for `workshop_enhancement_level` dropdown evaluation. */
  workshopEnhancementKey?: string
  /** Parametric guardian stat for `guardian_stat_level` dropdown evaluation. */
  guardianStatSpec?: { guardianKey: string; statField: string }
  /** Parametric UW stat for `uw_stat_level` dropdown evaluation. */
  uwStatSpec?: { weaponKey: string; statName: string }
  /** Parametric workshop stat for `workshop_stat_level` / tier dropdown evaluation. */
  workshopStatKey?: string
  /** Coin/cash tier kind for `workshop_tier_level`. */
  workshopTierKind?: 'coin' | 'cash'
  /** Minimum tier level when building cash tier options. */
  workshopTierMinimumLevel?: number
  /** Module template id for `module_rarity` dropdown evaluation. */
  moduleTemplateId?: string
  /** Module rarity label for `module_level` dropdown evaluation. */
  moduleRarity?: string
  /** Max module rarity for filtering `module_substat_rarity` options. */
  moduleMaxRarity?: string
  /** Uptime module substat pick kind for `uptime_substat_pick`. */
  uptimeSubstatPickKind?: string
  /** Primary vs assist labels for `uptime_substat_pick`. */
  uptimeSubstatPickRole?: 'primary' | 'assist'
  /** Assist efficiency percent for uptime assist substat labels. */
  uptimeAssistEffPct?: number
  /** Minimum assist efficiency percent for `uptime_assist_efficiency`. */
  uptimeAssistMinPct?: number
  /** ELS module substat label for `els_module_substat_rarity`. */
  elsModuleSubstatLabel?: string
  /** Unique module id for `ilm_unique_module_rarity`. */
  ilmUniqueModuleId?: string
  /** Workshop calculator tab for section/stat pickers. */
  workshopCalcTab?: 'workshop' | 'enhancements'
  /** Workshop calculator section slug. */
  workshopCalcSection?: string
  /** Workshop calculator discount profile. */
  workshopDiscountProfile?: 'workshop' | 'enhancement' | 'vault'
  /** Module stone cost profile for assist-module-cost. */
  moduleStoneCostProfile?: 'current' | 'target'
  /** Max level for generic lab level dropdowns. */
  genericLabLevelMax?: number
  /** Thorns tournament tier for heat wave labels. */
  thornsTournamentTier?: string
  /** Bot-bot bonus multiplier for flame bot effective labels. */
  botBotBonusMultiplier?: number
  /** Max card copies for `card_copies_owned`. */
  cardCopiesMax?: number
  /** Max equipped card slots for `card_equipped_slots`. */
  cardEquippedSlotsMax?: number
  /** Module type filter for `module_template_picker` (`All` or category). */
  moduleTypeFilter?: string
  /** Include `custom` entry for tracker sort dropdowns. */
  includeCustomSortOption?: boolean
  /** Workshop tracker sort profile. */
  workshopTrackerSortProfile?: 'workshop' | 'enhancements'
  /** Equipped module slot category for `module_equipped_picker`. */
  moduleEquippedCategory?: string
  /** Template ids to exclude from equipped module picker. */
  moduleEquippedExcludeTemplateIds?: string[]
  /** Module category for `module_substat_type_picker`. */
  moduleSubstatCategory?: string
  /** Substat ids already equipped in slot. */
  moduleSubstatExcludeIds?: string[]
  /** Filter substat types by selected rarity. */
  moduleSubstatFilterRarity?: string | null
  /** Max substat rarity from equipped module. */
  moduleSubstatMaxRarity?: string | null
  /** Card template ids to exclude from card picker. */
  cardTemplateExcludeIds?: string[]
  /** Dynamic lab type labels for `labs_type_filter`. */
  labsTypeFilterOptions?: string[]
  /** Preset labels for `bots_tracker_preset`. */
  trackerPresetLabels?: string[]
  /** Active type filter for `labs_name_picker`. */
  labsTypeFilter?: string
  /** Lab names to keep visible when filtered out of `labs_name_picker`. */
  labsNamePickerIncludeNames?: string[]
  /** Runtime lab entries for `labs_name_picker` (falls back to platform labs). */
  labsNamePickerRuntimeEntries?: Array<{ name: string; label: string; type: string }>
  /** Prefix lab type in `labs_name_picker` labels when filter is All. */
  labsNamePickerShowTypePrefix?: boolean
  /** Selected lab name for `labs_tracker_level`. */
  labsTrackerLabName?: string
  /** Level range mode for `labs_tracker_level`. */
  labsTrackerLevelMode?: 'current' | 'next' | 'target'
  /** Minimum level override for `labs_tracker_level`. */
  labsTrackerLevelMin?: number
  /** Maximum level override for `labs_tracker_level`. */
  labsTrackerLevelMax?: number
  /** Dynamic string options for `ui_dynamic_dropdown`. */
  uiDynamicDropdownOptions?: Array<{ value: string; label: string; subtitle?: string }>
}

const CARD_GAME_DATA_HUB_GROUPS: Partial<Record<GameDataKey, readonly SharedInputGroupId[]>> = {
  wave_accelerator_level: ['cardsProgressInputs', 'uptimeInputs'],
  card_game_level: ['cardsProgressInputs'],
  card_mastery: ['cardsProgressInputs'],
  card_mastery_select: ['cardsProgressInputs'],
  uptime_wa_level: ['uptimeInputs', 'cardsProgressInputs'],
  gold_bot_cooldown: ['uptimeInputs', 'botLabLevels'],
}

function isBotGameDataKey(key: string): key is BotGameDataKey {
  return key in BOT_GAME_INPUT_SPEC_BY_KEY
}

function isGuardianGameDataKey(key: string): key is GuardianGameDataKey {
  return key in GUARDIAN_GAME_INPUT_SPEC_BY_KEY
}

function isUptimeResearchLabGameDataKey(key: string): key is UptimeResearchLabDataKey {
  return key in UPTIME_RESEARCH_LAB_SPEC_BY_KEY
}

function isDissonanceEchoLabGameDataKey(key: string): key is DissonanceEchoLabDataKey {
  return key in DISSONANCE_ECHO_LAB_SPEC_BY_KEY
}

export function getGameDataHubGroups(key: GameDataKey): readonly SharedInputGroupId[] {
  if (isBotGameDataKey(key) || key === 'gold_bot_cooldown') {
    return ['uptimeInputs', 'botLabLevels']
  }
  if (isGuardianGameDataKey(key)) {
    return ['guardianLevels', 'uptimeInputs']
  }
  if (isUptimeResearchLabGameDataKey(key)) {
    return ['researchLabLevels', 'uptimeInputs']
  }
  if (isDissonanceEchoLabGameDataKey(key)) {
    return ['researchLabLevels']
  }
  if (key === 'research_lab_level') {
    return ['researchLabLevels']
  }
  if (key === 'workshop_enhancement_level') {
    return []
  }
  if (key === 'guardian_stat_level') {
    return ['guardianLevels']
  }
  if (key === 'uw_stat_level') {
    return ['uwProgressLevels', 'uptimeInputs']
  }
  if (key === 'workshop_stat_level' || key === 'workshop_tier_level') {
    return ['workshopStatLevels']
  }
  if (
    key === 'module_rarity'
    || key === 'module_level'
    || key === 'module_quantity'
    || key === 'module_substat_rarity'
    || key === 'module_discount_pct'
    || key === 'module_assist_efficiency'
    || key === 'uptime_substat_pick'
    || key === 'uptime_mvn_mode'
    || key === 'uptime_compressor'
    || key === 'uptime_waves_per_boss'
    || key === 'uptime_assist_efficiency'
    || key === 'els_module_substat_rarity'
    || key === 'ilm_module_substat_rarity'
    || key === 'ilm_unique_module_rarity'
    || key === 'els_workshop_utility_discount'
    || key === 'els_workshop_enhancement_discount'
    || key === 'els_workshop_vault_discount'
    || key === 'els_vault_star_level'
    || key === 'els_assist_substat_efficiency'
    || key.startsWith('damage_reduction_')
    || key.startsWith('thorns_')
    || key.startsWith('workshop_calc_')
    || key === 'enemy_tier_selection'
    || key === 'els_focus'
    || key === 'module_type_category'
    || key === 'module_lab_efficiency_level'
    || key === 'module_stone_cost_level'
    || key === 'generic_lab_level'
    || key === 'card_copies_owned'
    || key === 'card_equipped_slots'
    || key === 'module_tracker_type_filter'
    || key === 'module_tracker_rarity_filter'
    || key === 'module_tracker_sort'
    || key === 'card_tracker_sort'
    || key === 'labs_tracker_sort'
    || key === 'module_template_picker'
    || key === 'card_template_picker'
    || key === 'module_equipped_picker'
    || key === 'module_substat_type_picker'
    || key === 'workshop_tracker_category_filter'
    || key === 'workshop_tracker_sort'
    || key === 'workshop_overview_layout'
    || key === 'bots_tracker_sort'
    || key === 'bots_tracker_preset'
    || key === 'guardians_tracker_sort'
    || key === 'uw_tracker_sort'
    || key === 'uw_overview_view'
    || key === 'relics_bonus_sort'
    || key === 'relics_themes_sort'
    || key === 'labs_speedup_multiplier'
    || key === 'labs_type_filter'
  ) {
    return []
  }
  return CARD_GAME_DATA_HUB_GROUPS[key] ?? []
}

/** @deprecated Use getGameDataHubGroups(key) */
export const GAME_DATA_HUB_GROUPS = new Proxy({} as Record<GameDataKey, readonly SharedInputGroupId[]>, {
  get(_target, prop: string) {
    const key = findRegistryGameDataKey(prop)
    return key ? getGameDataHubGroups(key) : []
  },
})

export function buildGameDropdownHubContext(
  key: GameDataKey | string,
  inputs: SharedToolInputs | GameDropdownHubContext,
): GameDropdownHubContext {
  const resolvedKey = findRegistryGameDataKey(String(key))
  if (!resolvedKey) return {}

  const groups = getGameDataHubGroups(resolvedKey)
  const context: GameDropdownHubContext = {}

  for (const groupId of groups) {
    switch (groupId) {
      case 'uptimeInputs':
        context.uptimeInputs = inputs.uptimeInputs
        break
      case 'botLabLevels':
        context.botLabLevels = inputs.botLabLevels
        break
      case 'cardsProgressInputs':
        context.cardsProgressInputs = inputs.cardsProgressInputs
        break
      case 'guardianLevels':
        context.guardianLevels = inputs.guardianLevels
        break
      case 'researchLabLevels':
        context.researchLabLevels = inputs.researchLabLevels
        break
      default:
        break
    }
  }

  return context
}

function readNumericField(record: Record<string, unknown> | undefined, field: string): number | null {
  if (!record) return null
  const value = Number(record[field])
  return Number.isFinite(value) ? Math.floor(value) : null
}

function resolveBotLabLevelForKind(
  context: GameDropdownHubContext,
  botLabel: string,
  labStatName: string,
  uptimeField: string | null,
  cap: number,
): number {
  const uptimeLab = uptimeField ? readNumericField(context.uptimeInputs as Record<string, unknown> | undefined, uptimeField) : null
  const botLab = readNumericField(context.botLabLevels?.[botLabel], labStatName)
  const resolved = Math.max(uptimeLab ?? 0, botLab ?? 0)
  return Math.min(cap, Math.max(0, resolved))
}

export function computeBotGameInputLab(
  context: GameDropdownHubContext,
  key: BotGameDataKey | 'gold_bot_cooldown',
  kind?: BotGameInputKind,
): number {
  const normalized = normalizeGameDataKey(String(key)) as BotGameDataKey
  const spec = BOT_GAME_INPUT_SPEC_BY_KEY[normalized]
  if (!spec) return 0

  const resolvedKind = kind ?? spec.kind
  if (resolvedKind === 'cd_lab' || resolvedKind === 'dur_lab') {
    return 0
  }

  const labStatName = findBotLabStatName(spec.mapping, resolvedKind === 'cd_level' ? 'cd_level' : 'dur_level')
  const uptimeField = findUptimeLabFieldName(spec.mapping, resolvedKind === 'cd_level' ? 'cd_level' : 'dur_level')
  if (!labStatName) return 0

  const cap = resolvedKind === 'cd_level' ? 25 : 20
  return resolveBotLabLevelForKind(context, spec.mapping.botLabel, labStatName, uptimeField, cap)
}

/** @deprecated Use computeBotGameInputLab(context, 'gb_cd_level') */
export function computeGoldenBotCooldownLab(context: GameDropdownHubContext): number {
  return computeBotGameInputLab(context, 'gb_cd_level', 'cd_level')
}
