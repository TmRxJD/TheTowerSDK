import { describe, expect, it, vi } from 'vitest'
import { evaluateDropdownOptions } from './dropdown-evaluator'
import { GAME_DATA_REGISTRY } from './game-data-registry'
import { computeGoldenBotCooldownSecondsAtLevel } from './registry-builders'
import * as labsTrackerDropdownMath from './labs-tracker-dropdown-math'

describe('GAME_DATA_REGISTRY', () => {
  it('derives golden bot cooldown levels from canonical bot data', () => {
    expect(GAME_DATA_REGISTRY.gold_bot_cooldown.data).toHaveLength(16)
    expect(GAME_DATA_REGISTRY.gold_bot_cooldown.data[0]).toEqual({ value: 0, baseValue: 120 })
    expect(GAME_DATA_REGISTRY.gold_bot_cooldown.data[15]).toEqual({ value: 15, baseValue: 75 })
  })

  it('includes card and uptime WA level tables', () => {
    expect(GAME_DATA_REGISTRY.card_game_level.data).toHaveLength(7)
    expect(GAME_DATA_REGISTRY.uptime_wa_level.data).toHaveLength(8)
    expect(GAME_DATA_REGISTRY.uptime_wa_level.data[1]?.baseValue).toBeCloseTo(0.3)
  })
})

describe('evaluateDropdownOptions', () => {
  it('applies golden bot cooldown lab reduction from uptimeInputs', () => {
    const options = evaluateDropdownOptions('gold_bot_cooldown', {
      uptimeInputs: { gbCdLab: 5 },
    })

    expect(options[0]?.label).toBe('115s')
    expect(options[1]?.label).toBe('112s')
    expect(computeGoldenBotCooldownSecondsAtLevel(1, 5)).toBe(112)
  })

  it('falls back to botLabLevels when uptime lab is absent', () => {
    const options = evaluateDropdownOptions('gold_bot_cooldown', {
      botLabLevels: {
        'Golden Bot': { Cooldown: 25 },
      },
    })

    expect(options[15]?.label).toBe('50s')
  })

  it('uses bot lab when hub uptime lab is still zero', () => {
    const options = evaluateDropdownOptions('gold_bot_cooldown', {
      uptimeInputs: { gbCdLab: 0 },
      botLabLevels: {
        'Golden Bot': { Cooldown: 10 },
      },
    })

    expect(options[10]?.label).toBe('80s')
  })

  it('builds wave accelerator card labels from wave timing math', () => {
    const options = evaluateDropdownOptions('wave_accelerator_level', {})
    expect(options[0]?.value).toBe(1)
    expect(options[0]?.label).toMatch(/^\d+(\.\d+)?s\/wave$/)
    expect(options[6]?.value).toBe(7)
  })

  it('builds card mastery labels', () => {
    const options = evaluateDropdownOptions('card_mastery', {})
    expect(options[0]?.label).toBe('Mastery 0')
    expect(options[3]?.label).toBe('Mastery 3')
  })

  it('builds card mastery select labels with locked tier', () => {
    const options = evaluateDropdownOptions('card_mastery_select', {})
    expect(options[0]?.value).toBe(-1)
    expect(options[0]?.label).toBe('No mastery')
    expect(options[1]?.label).toBe('Mastery 0')
  })

  it('builds uptime WA tier labels with percent reduction', () => {
    const options = evaluateDropdownOptions('uptime_wa_level', {})
    expect(options[0]?.label).toBe('0%')
    expect(options[7]?.label).toBe('54%')
  })

  it('builds attack guardian cooldown labels from canonical upgrade data', () => {
    const options = evaluateDropdownOptions('atk_cd_level', {})
    expect(options[0]?.value).toBe(1)
    expect(options[0]?.label).toBe('120s')
    expect(options[1]?.label).toBe('119s')
  })

  it('builds summon guardian duration labels', () => {
    const options = evaluateDropdownOptions('smn_dur_level', {})
    expect(options.length).toBeGreaterThan(0)
    expect(options[0]?.label).toMatch(/\d/)
  })

  it('builds uptime research lab labels', () => {
    const gt = evaluateDropdownOptions('gt_dur_lab', {})
    expect(gt[0]?.label).toBe('+0s')
    expect(gt[5]?.label).toBe('+5s')

    const bc = evaluateDropdownOptions('bc_lab_level', {})
    expect(bc[3]?.label).toBe('6%')

    const dw = evaluateDropdownOptions('dw_base_waves_level', {})
    expect(dw[0]?.label).toBe('1 wave')
    expect(dw[1]?.label).toBe('2 waves')
  })

  it('builds fetch guardian find and double-find labels', () => {
    const find = evaluateDropdownOptions('ftc_find_level', {})
    expect(find[0]?.value).toBe(1)
    expect(find[0]?.label).toBe('10%')
    expect(find[1]?.label).toBe('11%')

    const double = evaluateDropdownOptions('ftc_double_find_level', {})
    expect(double[0]?.value).toBe(1)
    expect(double[0]?.label).toBe('2%')
    expect(double[1]?.label).toBe('3%')
  })

  it('accepts full SharedToolInputs and extracts required hub slices', () => {
    const options = evaluateDropdownOptions('gold_bot_cooldown', {
      uptimeInputs: { gbCdLab: 3 },
      botLabLevels: {},
    } as never)
    expect(options[0]?.label).toBe('117s')
  })

  it('builds parametric research lab level labels', () => {
    const plain = evaluateDropdownOptions('research_lab_level', { researchLabSlug: 'common_drop_chance' })
    expect(plain.length).toBeGreaterThan(0)
    expect(plain[0]?.label).toBe('0')
    expect(plain[1]?.label).toBe('1')

    const tradeOff = evaluateDropdownOptions('research_lab_level', { researchLabSlug: 'improve_trade_off_perks' })
    expect(tradeOff[1]?.label).toBe('+1%')

    const bc = evaluateDropdownOptions('research_lab_level', { researchLabSlug: 'battle_condition_reduction' })
    expect(bc[1]?.label).toMatch(/−.*%/)
  })

  it('builds parametric workshop enhancement level labels', () => {
    const options = evaluateDropdownOptions('workshop_enhancement_level', {
      workshopEnhancementKey: 'cells_per_kill_bonus',
    })
    expect(options.length).toBeGreaterThan(100)
    expect(options[0]?.label).toBe('0')
    expect(options[50]?.value).toBe(50)
  })

  it('builds parametric guardian stat labels', () => {
    const options = evaluateDropdownOptions('guardian_stat_level', {
      guardianStatSpec: { guardianKey: 'attack', statField: 'percentage' },
    })
    expect(options.length).toBeGreaterThan(0)
    expect(options[0]?.label).toMatch(/\d/)
  })

  it('builds parametric UW stat labels from stone chart data', () => {
    const options = evaluateDropdownOptions('uw_stat_level', {
      uwStatSpec: { weaponKey: 'golden_tower', statName: 'Duration' },
    })
    expect(options.length).toBeGreaterThan(0)
    expect(options[0]?.label).toMatch(/\d/)
  })

  it('builds parametric workshop tier level labels', () => {
    const options = evaluateDropdownOptions('workshop_tier_level', {
      workshopStatKey: 'Damage',
      workshopTierKind: 'coin',
    })
    expect(options.length).toBeGreaterThan(0)
    expect(options[0]?.value).toBeGreaterThanOrEqual(0)
  })

  it('builds parametric module rarity labels for a template', () => {
    const options = evaluateDropdownOptions('module_rarity', {
      moduleTemplateId: 'astral-deliverance',
    })
    expect(options.length).toBeGreaterThan(0)
    expect(options[0]?.label).toBe('Epic')
  })

  it('builds parametric module level labels capped by rarity', () => {
    const options = evaluateDropdownOptions('module_level', {
      moduleRarity: 'Epic',
    })
    expect(options.length).toBe(60)
    expect(options[0]?.label).toBe('1')
    expect(options[59]?.value).toBe(60)
  })

  it('builds module quantity labels', () => {
    const options = evaluateDropdownOptions('module_quantity', {})
    expect(options).toHaveLength(18)
    expect(options[17]?.value).toBe(18)
  })

  it('builds module substat rarity labels filtered by max module rarity', () => {
    const options = evaluateDropdownOptions('module_substat_rarity', {
      moduleMaxRarity: 'Legendary',
    })
    expect(options.length).toBe(4)
    expect(options[0]?.label).toBe('Common')
    expect(options[3]?.label).toBe('Legendary')
  })

  it('builds all module rarities when no template is provided', () => {
    const options = evaluateDropdownOptions('module_rarity', {})
    expect(options.length).toBeGreaterThan(10)
    expect(options[0]?.label).toBe('Common')
  })

  it('builds module discount and assist efficiency labels', () => {
    const discount = evaluateDropdownOptions('module_discount_pct', {})
    expect(discount[0]?.label).toBe('0%')
    expect(discount[30]?.label).toBe('30%')

    const assist = evaluateDropdownOptions('module_assist_efficiency', { uptimeAssistMinPct: 0 })
    expect(assist[0]?.label).toBe('0 - Disabled')
    expect(assist[100]?.label).toBe('100%')
  })

  it('builds uptime substat pick labels for primary and assist roles', () => {
    const primary = evaluateDropdownOptions('uptime_substat_pick', {
      uptimeSubstatPickKind: 'gt_cd',
      uptimeSubstatPickRole: 'primary',
    })
    expect(primary[0]?.label).toBe('None')
    expect(primary[1]?.label).toBe('−6s')

    const assist = evaluateDropdownOptions('uptime_substat_pick', {
      uptimeSubstatPickKind: 'gt_cd',
      uptimeSubstatPickRole: 'assist',
      uptimeAssistEffPct: 50,
    })
    expect(assist[1]?.label).toBe('−3s at 50%')
  })

  it('builds uptime relic dropdown labels', () => {
    const mvn = evaluateDropdownOptions('uptime_mvn_mode', {})
    expect(mvn[0]?.label).toBe('Disabled')
    expect(mvn[4]?.label).toBe('Ancestral (−10s CDs)')

    const compressor = evaluateDropdownOptions('uptime_compressor', {})
    expect(compressor[1]?.label).toBe('Epic (10s/pkg)')

    const waves = evaluateDropdownOptions('uptime_waves_per_boss', {})
    expect(waves).toHaveLength(10)
    expect(waves[0]?.value).toBe(1)
  })

  it('builds ELS module substat and discount labels', () => {
    const attack = evaluateDropdownOptions('els_module_substat_rarity', {
      elsModuleSubstatLabel: 'Enemy Attack Level Skip',
    })
    expect(attack[0]?.label).toBe('None')

    const utility = evaluateDropdownOptions('els_workshop_utility_discount', {})
    expect(utility[0]?.label).toBe('0.0%')

    const stars = evaluateDropdownOptions('els_vault_star_level', {})
    expect(stars[0]?.label).toBe('0 stars')
  })

  it('builds labs name picker and tracker level options', () => {
    const filterSpy = vi.spyOn(labsTrackerDropdownMath, 'filterLabsForNamePicker')
    const names = evaluateDropdownOptions('labs_name_picker', {
      labsTypeFilter: 'All',
      labsNamePickerShowTypePrefix: true,
    })
    expect(names.length).toBeGreaterThan(0)
    expect(names[0]?.label.length).toBeGreaterThan(0)
    expect(filterSpy.mock.calls.length).toBeLessThanOrEqual(2)
    filterSpy.mockRestore()

    const levels = evaluateDropdownOptions('labs_tracker_level', {
      labsTrackerLabName: 'labs_speed',
      labsTrackerLevelMode: 'next',
      labsTrackerLevelMax: 5,
    })
    expect(levels).toHaveLength(5)
    expect(levels[0]?.value).toBe(1)
    expect(levels[4]?.value).toBe(5)
  })

  it('builds lifetime and dynamic UI dropdown options', () => {
    const period = evaluateDropdownOptions('lifetime_average_period', {})
    expect(period.some(option => option.label === 'Per Day')).toBe(true)

    const lineType = evaluateDropdownOptions('lifetime_chart_line_type', {})
    expect(lineType.some(option => option.label === 'Solid')).toBe(true)

    const dynamic = evaluateDropdownOptions('ui_dynamic_dropdown', {
      uiDynamicDropdownOptions: [
        { value: 'name', label: 'Name' },
        { value: 'progress', label: 'Progress' },
      ],
    })
    expect(dynamic).toHaveLength(2)
    expect(dynamic[1]?.label).toBe('Progress')
  })
})
