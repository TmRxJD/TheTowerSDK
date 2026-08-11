import type { GameDropdownHubContext } from './hub-context'
import type { StandardDropdownOption } from './types'
import type { GameDataKey } from './game-data-registry'
import {
  buildElsFocusEntries,
  formatElsFocusOptionLabel,
  buildEnemyTierSelectionEntries,
  formatEnemyTierSelectionOptionLabel,
} from './enemy-tier-dropdown-math'
import {
  buildGenericLabLevelEntries,
  buildGenericLabLevelOptionLabel,
  buildModuleLabEfficiencyEntries,
  formatModuleLabEfficiencyOptionLabel,
  buildModuleTypeCategoryEntries,
  formatModuleTypeCategoryOptionLabel,
} from './module-type-dropdown-math'
import {
  buildModuleStoneCostEntries,
  buildModuleStoneCostOptionLabel,
  type ModuleStoneCostProfile,
} from './module-stone-dropdown-math'
import {
  buildThornsBcGlobalLabEntries,
  formatThornsBcGlobalLabOptionLabel,
  buildThornsBcReductionLabEntries,
  formatThornsBcReductionLabOptionLabel,
  buildThornsHeatWaveEntries,
  buildThornsHeatWaveOptionLabel,
  buildThornsPlasmaCannonLevelEntries,
  formatThornsPlasmaCannonLevelOptionLabel,
  buildThornsPlasmaCannonMasteryEntries,
  formatThornsPlasmaCannonMasteryOptionLabel,
  buildThornsTierEntries,
  formatThornsTierOptionLabel,
  buildThornsWallThornsEntries,
  formatThornsWallThornsOptionLabel,
} from './thorns-dropdown-math'
import {
  buildWorkshopCalcDiscountEntries,
  formatWorkshopCalcDiscountOptionLabel,
  buildWorkshopCalcSectionEntries,
  formatWorkshopCalcSectionOptionLabel,
  buildWorkshopCalcStatEntries,
  buildWorkshopCalcStatOptionLabel,
  type WorkshopCalcTab,
  type WorkshopCategory,
  type WorkshopDiscountProfile,
} from './workshop-calculator-dropdown-math'
import {
  buildDamageReductionAvgClHitsEntries,
  formatDamageReductionAvgClHitsOptionLabel,
  buildDamageReductionBotBonusEntries,
  formatDamageReductionBotBonusOptionLabel,
  buildDamageReductionCfReductionEntries,
  buildDamageReductionCfReductionOptionLabel,
  buildDamageReductionClPlusLevelEntries,
  formatDamageReductionClPlusLevelOptionLabel,
  buildDamageReductionCtLevelEntries,
  formatDamageReductionCtLevelOptionLabel,
  buildDamageReductionFlameBotEntries,
  buildDamageReductionFlameBotOptionLabel,
  buildDamageReductionNmpOrbHitsEntries,
  formatDamageReductionNmpOrbHitsOptionLabel,
  buildDamageReductionNmpReductionEntries,
  formatDamageReductionNmpReductionOptionLabel,
  buildDamageReductionPrimordialCollapseEntries,
  formatDamageReductionPrimordialCollapseOptionLabel,
} from './damage-reduction-dropdown-math'
import {
  buildIlmAmplifyBotBonusLevelEntries,
  formatIlmAmplifyBotBonusLevelOptionLabel,
  buildIlmModuleSubstatRarityEntries,
  formatIlmModuleSubstatRarityOptionLabel,
  buildIlmShockStackEntries,
  formatIlmShockStackOptionLabel,
  buildIlmUniqueModuleRarityEntries,
  buildIlmUniqueModuleRarityOptionLabel,
} from './ilm-calculator-dropdown-math'
import { ILM_UNIQUE_MODULE_IDS, type IlmUniqueModuleId } from '../../mechanics/ilm-calculator-options'
import {
  buildCardCopiesOwnedEntries,
  formatCardCopiesOwnedOptionLabel,
  buildCardEquippedSlotsEntries,
  formatCardEquippedSlotsOptionLabel,
} from './cards-dropdown-math'
import {
  buildModuleTemplatePickerEntries,
  buildModuleTemplatePickerOptionLabel,
  buildModuleTemplatePickerOptionSubtitle,
} from './module-template-dropdown-math'
import {
  buildBotsTrackerPresetEntries,
  buildBotsTrackerPresetOptionLabel,
  buildBotsTrackerSortEntries,
  buildBotsTrackerSortOptionLabel,
  buildCardTrackerSortEntries,
  formatCardTrackerSortOptionLabel,
  buildGuardiansTrackerSortEntries,
  buildGuardiansTrackerSortOptionLabel,
  buildLabsSpeedupEntries,
  formatLabsSpeedupOptionLabel,
  buildLabsTrackerSortEntries,
  formatLabsTrackerSortOptionLabel,
  buildLabsTypeFilterEntries,
  buildLabsTypeFilterOptionLabel,
  buildLifetimeAveragePeriodEntries,
  formatLifetimeAveragePeriodOptionLabel,
  buildLifetimeChartLineTypeEntries,
  formatLifetimeChartLineTypeOptionLabel,
  buildModuleTrackerRarityFilterEntries,
  formatModuleTrackerRarityFilterOptionLabel,
  buildModuleTrackerSortEntries,
  formatModuleTrackerSortOptionLabel,
  buildModuleTrackerTypeFilterEntries,
  formatModuleTrackerTypeFilterOptionLabel,
  buildRelicsBonusSortEntries,
  formatRelicsBonusSortOptionLabel,
  buildRelicsThemesSortEntries,
  formatRelicsThemesSortOptionLabel,
  buildUwOverviewViewEntries,
  formatUwOverviewViewOptionLabel,
  buildUwTrackerSortEntries,
  buildUwTrackerSortOptionLabel,
  buildWorkshopOverviewLayoutEntries,
  formatWorkshopOverviewLayoutOptionLabel,
  buildWorkshopTrackerCategoryFilterEntries,
  formatWorkshopTrackerCategoryFilterOptionLabel,
  buildWorkshopTrackerSortEntries,
  buildWorkshopTrackerSortOptionLabel,
} from './tracker-ui-dropdown-math'
import {
  buildCardTemplatePickerEntries,
  buildCardTemplatePickerOptionLabel,
  buildCardTemplatePickerOptionSubtitle,
} from './card-template-dropdown-math'
import {
  buildModuleEquippedPickerEntries,
  buildModuleEquippedPickerOptionLabel,
  buildModuleEquippedPickerOptionSubtitle,
  buildModuleSubstatTypePickerEntries,
  buildModuleSubstatTypePickerOptionLabel,
} from './module-equipped-dropdown-math'
import {
  buildLabsNamePickerStandardOptions,
  buildLabsTrackerLevelEntries,
  formatLabsTrackerLevelOptionLabel,
  type LabsTrackerLevelMode,
} from './labs-tracker-dropdown-math'
import {
  buildUiDynamicDropdownEntries,
  buildUiDynamicDropdownOptionLabel,
  buildUiDynamicDropdownOptionSubtitle,
} from './ui-dynamic-dropdown-math'

const EXTENDED_DROPDOWN_KEYS = new Set<string>([
  'enemy_tier_selection',
  'els_focus',
  'module_type_category',
  'module_lab_efficiency_level',
  'module_stone_cost_level',
  'generic_lab_level',
  'thorns_tier',
  'thorns_plasma_cannon_level',
  'thorns_plasma_cannon_mastery',
  'thorns_bc_global_lab_level',
  'thorns_bc_reduction_lab_level',
  'thorns_wall_thorns_level',
  'thorns_heat_wave',
  'workshop_calc_section',
  'workshop_calc_stat',
  'workshop_calc_discount',
  'damage_reduction_cf_reduction',
  'damage_reduction_flame_bot',
  'damage_reduction_bot_bonus',
  'damage_reduction_nmp_reduction',
  'damage_reduction_nmp_orb_hits',
  'damage_reduction_primordial_collapse',
  'damage_reduction_ct_level',
  'damage_reduction_cl_plus_level',
  'damage_reduction_avg_cl_hits',
  'ilm_amplify_bot_level',
  'ilm_module_substat_rarity',
  'ilm_unique_module_rarity',
  'ilm_shock_stack',
  'card_copies_owned',
  'card_equipped_slots',
  'module_tracker_type_filter',
  'module_tracker_rarity_filter',
  'module_tracker_sort',
  'card_tracker_sort',
  'labs_tracker_sort',
  'module_template_picker',
  'card_template_picker',
  'module_equipped_picker',
  'module_substat_type_picker',
  'workshop_tracker_category_filter',
  'workshop_tracker_sort',
  'workshop_overview_layout',
  'bots_tracker_sort',
  'bots_tracker_preset',
  'guardians_tracker_sort',
  'uw_tracker_sort',
  'uw_overview_view',
  'relics_bonus_sort',
  'relics_themes_sort',
  'labs_speedup_multiplier',
  'labs_type_filter',
  'labs_name_picker',
  'labs_tracker_level',
  'lifetime_average_period',
  'lifetime_chart_line_type',
  'ui_dynamic_dropdown',
])

export function isExtendedDropdownKey(key: string): boolean {
  return EXTENDED_DROPDOWN_KEYS.has(key)
}

export function evaluateExtendedDropdownOptions(
  key: GameDataKey,
  context: GameDropdownHubContext,
): StandardDropdownOption[] {
  switch (key) {
    case 'enemy_tier_selection':
      return buildEnemyTierSelectionEntries().map(entry => ({
        value: entry.value,
        label: formatEnemyTierSelectionOptionLabel(entry.value),
      }))
    case 'els_focus':
      return buildElsFocusEntries().map(entry => ({
        value: entry.value,
        label: formatElsFocusOptionLabel(entry.value),
      }))
    case 'module_type_category':
      return buildModuleTypeCategoryEntries().map(entry => ({
        value: entry.value,
        label: formatModuleTypeCategoryOptionLabel(entry.value),
      }))
    case 'module_lab_efficiency_level':
      return buildModuleLabEfficiencyEntries().map(entry => ({
        value: entry.value,
        label: formatModuleLabEfficiencyOptionLabel(entry.value),
      }))
    case 'module_stone_cost_level': {
      const profile = (context.moduleStoneCostProfile ?? 'current') as ModuleStoneCostProfile
      return buildModuleStoneCostEntries(profile).map(entry => ({
        value: entry.value,
        label: buildModuleStoneCostOptionLabel(entry.value, profile),
      }))
    }
    case 'generic_lab_level': {
      const maxLevel = context.genericLabLevelMax ?? 0
      return buildGenericLabLevelEntries(maxLevel).map(entry => ({
        value: entry.value,
        label: buildGenericLabLevelOptionLabel(entry.value, maxLevel),
      }))
    }
    case 'thorns_tier':
      return buildThornsTierEntries().map(entry => ({
        value: entry.value,
        label: formatThornsTierOptionLabel(entry.value),
      }))
    case 'thorns_plasma_cannon_level':
      return buildThornsPlasmaCannonLevelEntries().map(entry => ({
        value: entry.value,
        label: formatThornsPlasmaCannonLevelOptionLabel(entry.value),
      }))
    case 'thorns_plasma_cannon_mastery':
      return buildThornsPlasmaCannonMasteryEntries().map(entry => ({
        value: entry.value,
        label: formatThornsPlasmaCannonMasteryOptionLabel(entry.value),
      }))
    case 'thorns_bc_global_lab_level':
      return buildThornsBcGlobalLabEntries().map(entry => ({
        value: entry.value,
        label: formatThornsBcGlobalLabOptionLabel(entry.value),
      }))
    case 'thorns_bc_reduction_lab_level':
      return buildThornsBcReductionLabEntries().map(entry => ({
        value: entry.value,
        label: formatThornsBcReductionLabOptionLabel(entry.value),
      }))
    case 'thorns_wall_thorns_level':
      return buildThornsWallThornsEntries().map(entry => ({
        value: entry.value,
        label: formatThornsWallThornsOptionLabel(entry.value),
      }))
    case 'thorns_heat_wave':
      return buildThornsHeatWaveEntries(context.thornsTournamentTier).map(entry => ({
        value: entry.value,
        label: buildThornsHeatWaveOptionLabel(entry.value, context.thornsTournamentTier),
      }))
    case 'workshop_calc_section':
      return buildWorkshopCalcSectionEntries().map(entry => ({
        value: entry.value,
        label: formatWorkshopCalcSectionOptionLabel(entry.value),
      }))
    case 'workshop_calc_stat': {
      const tab = (context.workshopCalcTab ?? 'workshop') as WorkshopCalcTab
      const section = (context.workshopCalcSection ?? 'attack') as WorkshopCategory
      return buildWorkshopCalcStatEntries(tab, section).map(entry => ({
        value: entry.value,
        label: buildWorkshopCalcStatOptionLabel(entry.value, tab, section),
      }))
    }
    case 'workshop_calc_discount': {
      const profile = (context.workshopDiscountProfile ?? 'workshop') as WorkshopDiscountProfile
      return buildWorkshopCalcDiscountEntries(profile).map(entry => ({
        value: entry.value,
        label: formatWorkshopCalcDiscountOptionLabel(entry.value),
      }))
    }
    case 'damage_reduction_cf_reduction':
      return buildDamageReductionCfReductionEntries().map(entry => ({
        value: entry.value,
        label: buildDamageReductionCfReductionOptionLabel(entry.value, entry.baseValue),
      }))
    case 'damage_reduction_flame_bot': {
      const bonus = context.botBotBonusMultiplier ?? 0
      return buildDamageReductionFlameBotEntries(bonus).map(entry => ({
        value: entry.value,
        label: buildDamageReductionFlameBotOptionLabel(entry.value, bonus, entry.baseValue),
      }))
    }
    case 'damage_reduction_bot_bonus':
      return buildDamageReductionBotBonusEntries().map(entry => ({
        value: entry.value,
        label: formatDamageReductionBotBonusOptionLabel(entry.value),
      }))
    case 'damage_reduction_nmp_reduction':
      return buildDamageReductionNmpReductionEntries().map(entry => ({
        value: entry.value,
        label: formatDamageReductionNmpReductionOptionLabel(entry.value),
      }))
    case 'damage_reduction_nmp_orb_hits':
      return buildDamageReductionNmpOrbHitsEntries().map(entry => ({
        value: entry.value,
        label: formatDamageReductionNmpOrbHitsOptionLabel(entry.value),
      }))
    case 'damage_reduction_primordial_collapse':
      return buildDamageReductionPrimordialCollapseEntries().map(entry => ({
        value: entry.value,
        label: formatDamageReductionPrimordialCollapseOptionLabel(entry.value),
      }))
    case 'damage_reduction_ct_level':
      return buildDamageReductionCtLevelEntries().map(entry => ({
        value: entry.value,
        label: formatDamageReductionCtLevelOptionLabel(entry.value),
      }))
    case 'damage_reduction_cl_plus_level':
      return buildDamageReductionClPlusLevelEntries().map(entry => ({
        value: entry.value,
        label: formatDamageReductionClPlusLevelOptionLabel(entry.value),
      }))
    case 'damage_reduction_avg_cl_hits':
      return buildDamageReductionAvgClHitsEntries().map(entry => ({
        value: entry.value,
        label: formatDamageReductionAvgClHitsOptionLabel(entry.value),
      }))
    case 'ilm_amplify_bot_level':
      return buildIlmAmplifyBotBonusLevelEntries().map(entry => ({
        value: entry.value,
        label: formatIlmAmplifyBotBonusLevelOptionLabel(entry.value),
      }))
    case 'ilm_module_substat_rarity':
      return buildIlmModuleSubstatRarityEntries().map(entry => ({
        value: entry.value,
        label: formatIlmModuleSubstatRarityOptionLabel(entry.value),
      }))
    case 'ilm_unique_module_rarity': {
      const moduleId = (context.ilmUniqueModuleId ?? ILM_UNIQUE_MODULE_IDS.dimensionCore) as IlmUniqueModuleId
      return buildIlmUniqueModuleRarityEntries(moduleId).map(entry => ({
        value: entry.value,
        label: buildIlmUniqueModuleRarityOptionLabel(moduleId, entry.value),
      }))
    }
    case 'ilm_shock_stack':
      return buildIlmShockStackEntries().map(entry => ({
        value: entry.value,
        label: formatIlmShockStackOptionLabel(entry.value),
      }))
    case 'card_copies_owned':
      return buildCardCopiesOwnedEntries(context.cardCopiesMax ?? 80).map(entry => ({
        value: entry.value,
        label: formatCardCopiesOwnedOptionLabel(entry.value),
      }))
    case 'card_equipped_slots':
      return buildCardEquippedSlotsEntries(context.cardEquippedSlotsMax ?? 27).map(entry => ({
        value: entry.value,
        label: formatCardEquippedSlotsOptionLabel(entry.value),
      }))
    case 'module_tracker_type_filter':
      return buildModuleTrackerTypeFilterEntries().map(entry => ({
        value: entry.value,
        label: formatModuleTrackerTypeFilterOptionLabel(entry.value),
      }))
    case 'module_tracker_rarity_filter':
      return buildModuleTrackerRarityFilterEntries().map(entry => ({
        value: entry.value,
        label: formatModuleTrackerRarityFilterOptionLabel(entry.value),
      }))
    case 'module_tracker_sort':
      return buildModuleTrackerSortEntries().map(entry => ({
        value: entry.value,
        label: formatModuleTrackerSortOptionLabel(entry.value),
      }))
    case 'card_tracker_sort':
      return buildCardTrackerSortEntries().map(entry => ({
        value: entry.value,
        label: formatCardTrackerSortOptionLabel(entry.value),
      }))
    case 'labs_tracker_sort':
      return buildLabsTrackerSortEntries().map(entry => ({
        value: entry.value,
        label: formatLabsTrackerSortOptionLabel(entry.value),
      }))
    case 'module_template_picker':
      return buildModuleTemplatePickerEntries(context.moduleTypeFilter).map(entry => ({
        value: entry.value,
        label: buildModuleTemplatePickerOptionLabel(entry.value, context.moduleTypeFilter),
        subtitle: buildModuleTemplatePickerOptionSubtitle(entry.value, context.moduleTypeFilter),
      }))
    case 'card_template_picker':
      return buildCardTemplatePickerEntries(context.cardTemplateExcludeIds ?? []).map(entry => ({
        value: entry.value,
        label: buildCardTemplatePickerOptionLabel(entry.value, context.cardTemplateExcludeIds ?? []),
        subtitle: buildCardTemplatePickerOptionSubtitle(entry.value, context.cardTemplateExcludeIds ?? []),
      }))
    case 'module_equipped_picker':
      return buildModuleEquippedPickerEntries(
        context.moduleEquippedCategory as never,
        context.moduleEquippedExcludeTemplateIds ?? [],
      ).map(entry => ({
        value: entry.value,
        label: buildModuleEquippedPickerOptionLabel(entry.value, context.moduleEquippedCategory as never, context.moduleEquippedExcludeTemplateIds ?? []),
        subtitle: buildModuleEquippedPickerOptionSubtitle(entry.value, context.moduleEquippedCategory as never, context.moduleEquippedExcludeTemplateIds ?? []),
      }))
    case 'module_substat_type_picker':
      return buildModuleSubstatTypePickerEntries({
        category: context.moduleSubstatCategory as never,
        excludeSubstatIds: context.moduleSubstatExcludeIds ?? [],
        filterRarity: context.moduleSubstatFilterRarity,
        maxSubstatRarity: context.moduleSubstatMaxRarity,
      }).map(entry => ({
        value: entry.value,
        label: buildModuleSubstatTypePickerOptionLabel(entry.value, {
          category: context.moduleSubstatCategory as never,
          excludeSubstatIds: context.moduleSubstatExcludeIds ?? [],
          filterRarity: context.moduleSubstatFilterRarity,
          maxSubstatRarity: context.moduleSubstatMaxRarity,
        }),
      }))
    case 'workshop_tracker_category_filter':
      return buildWorkshopTrackerCategoryFilterEntries().map(entry => ({
        value: entry.value,
        label: formatWorkshopTrackerCategoryFilterOptionLabel(entry.value),
      }))
    case 'workshop_tracker_sort':
      return buildWorkshopTrackerSortEntries(context.workshopTrackerSortProfile ?? 'workshop', context.includeCustomSortOption ?? false).map(entry => ({
        value: entry.value,
        label: buildWorkshopTrackerSortOptionLabel(entry.value, context.workshopTrackerSortProfile ?? 'workshop', context.includeCustomSortOption ?? false),
      }))
    case 'workshop_overview_layout':
      return buildWorkshopOverviewLayoutEntries().map(entry => ({
        value: entry.value,
        label: formatWorkshopOverviewLayoutOptionLabel(entry.value),
      }))
    case 'bots_tracker_sort':
      return buildBotsTrackerSortEntries(context.includeCustomSortOption ?? false).map(entry => ({
        value: entry.value,
        label: buildBotsTrackerSortOptionLabel(entry.value, context.includeCustomSortOption ?? false),
      }))
    case 'bots_tracker_preset':
      return buildBotsTrackerPresetEntries(context.trackerPresetLabels).map(entry => ({
        value: entry.value,
        label: buildBotsTrackerPresetOptionLabel(entry.value, context.trackerPresetLabels),
      }))
    case 'guardians_tracker_sort':
      return buildGuardiansTrackerSortEntries(context.includeCustomSortOption ?? false).map(entry => ({
        value: entry.value,
        label: buildGuardiansTrackerSortOptionLabel(entry.value, context.includeCustomSortOption ?? false),
      }))
    case 'uw_tracker_sort':
      return buildUwTrackerSortEntries(context.includeCustomSortOption ?? false).map(entry => ({
        value: entry.value,
        label: buildUwTrackerSortOptionLabel(entry.value, context.includeCustomSortOption ?? false),
      }))
    case 'uw_overview_view':
      return buildUwOverviewViewEntries().map(entry => ({
        value: entry.value,
        label: formatUwOverviewViewOptionLabel(entry.value),
      }))
    case 'relics_bonus_sort':
      return buildRelicsBonusSortEntries().map(entry => ({
        value: entry.value,
        label: formatRelicsBonusSortOptionLabel(entry.value),
      }))
    case 'relics_themes_sort':
      return buildRelicsThemesSortEntries().map(entry => ({
        value: entry.value,
        label: formatRelicsThemesSortOptionLabel(entry.value),
      }))
    case 'labs_speedup_multiplier':
      return buildLabsSpeedupEntries().map(entry => ({
        value: entry.value,
        label: formatLabsSpeedupOptionLabel(entry.value),
      }))
    case 'labs_type_filter':
      return buildLabsTypeFilterEntries(context.labsTypeFilterOptions ?? ['All']).map(entry => ({
        value: entry.value,
        label: buildLabsTypeFilterOptionLabel(entry.value, context.labsTypeFilterOptions ?? ['All']),
      }))
    case 'labs_name_picker':
      return buildLabsNamePickerStandardOptions(
        context.labsTypeFilter,
        context.labsNamePickerIncludeNames ?? [],
        context.labsNamePickerShowTypePrefix ?? false,
        context.labsNamePickerRuntimeEntries,
      )
    case 'labs_tracker_level': {
      const mode = (context.labsTrackerLevelMode ?? 'current') as LabsTrackerLevelMode
      return buildLabsTrackerLevelEntries(
        context.labsTrackerLabName,
        mode,
        context.labsTrackerLevelMin,
        context.labsTrackerLevelMax,
      ).map(entry => ({
        value: entry.value,
        label: formatLabsTrackerLevelOptionLabel(entry.value),
      }))
    }
    case 'lifetime_average_period':
      return buildLifetimeAveragePeriodEntries().map(entry => ({
        value: entry.value,
        label: formatLifetimeAveragePeriodOptionLabel(entry.value),
      }))
    case 'lifetime_chart_line_type':
      return buildLifetimeChartLineTypeEntries().map(entry => ({
        value: entry.value,
        label: formatLifetimeChartLineTypeOptionLabel(entry.value),
      }))
    case 'ui_dynamic_dropdown':
      return buildUiDynamicDropdownEntries(context.uiDynamicDropdownOptions ?? []).map(entry => ({
        value: entry.value,
        label: buildUiDynamicDropdownOptionLabel(entry.value, context.uiDynamicDropdownOptions ?? []),
        subtitle: buildUiDynamicDropdownOptionSubtitle(entry.value, context.uiDynamicDropdownOptions ?? []),
      }))
    default:
      return []
  }
}
