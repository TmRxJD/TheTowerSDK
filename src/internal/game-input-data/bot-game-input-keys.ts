import { UPTIME_BOT_FIELD_MAP, type UptimeBotFieldMap } from '../shared-uptime-inputs'
import {
  BOT_CD_LAB_COUNT,
  BOT_CD_LEVEL_COUNT,
  BOT_DUR_LAB_COUNT,
  BOT_DUR_LEVEL_COUNT,
  type BotGameInputKind,
  resolveBotLabStatName,
  THUNDER_BOT_DUR_LEVEL_COUNT,
} from './bot-dropdown-math'

export type BotGameDataKey =
  | 'gb_cd_level'
  | 'gb_dur_level'
  | 'gb_cd_lab'
  | 'gb_dur_lab'
  | 'ab_cd_level'
  | 'ab_dur_level'
  | 'ab_cd_lab'
  | 'ab_dur_lab'
  | 'bb_cd_level'
  | 'bb_dur_level'
  | 'bb_cd_lab'
  | 'bb_dur_lab'
  | 'fb_cd_level'
  | 'fb_cd_lab'
  | 'tb_cd_level'
  | 'tb_dur_level'
  | 'tb_cd_lab'

export interface BotGameInputSpec {
  key: BotGameDataKey
  mapping: UptimeBotFieldMap
  kind: BotGameInputKind
}

export const GAME_DATA_KEY_ALIASES = {
  gold_bot_cooldown: 'gb_cd_level',
} as const satisfies Record<string, BotGameDataKey>

const BOT_GAME_INPUT_KINDS: BotGameInputKind[] = ['cd_level', 'dur_level', 'cd_lab', 'dur_lab']

function isSupportedBotKind(mapping: UptimeBotFieldMap, kind: BotGameInputKind): boolean {
  if (kind === 'dur_level' || kind === 'dur_lab') {
    return mapping.durStat != null && (kind !== 'dur_lab' || mapping.durLab != null)
  }
  return true
}

export const BOT_GAME_INPUT_SPECS: readonly BotGameInputSpec[] = UPTIME_BOT_FIELD_MAP.flatMap(mapping =>
  BOT_GAME_INPUT_KINDS
    .filter(kind => isSupportedBotKind(mapping, kind))
    .map(kind => ({
      key: `${mapping.prefix}_${kind}` as BotGameDataKey,
      mapping,
      kind,
    })),
)

export const BOT_GAME_INPUT_SPEC_BY_KEY = Object.fromEntries(
  BOT_GAME_INPUT_SPECS.map(spec => [spec.key, spec]),
) as Record<BotGameDataKey, BotGameInputSpec>

export function normalizeGameDataKey(key: string): string {
  return (GAME_DATA_KEY_ALIASES as Record<string, string>)[key] ?? key
}

export function resolveBotStatGameDataKey(botLabel: string, statName: string): BotGameDataKey | null {
  const mapping = UPTIME_BOT_FIELD_MAP.find(entry => entry.botLabel === botLabel)
  if (!mapping) return null
  if (statName === mapping.cdStat) return `${mapping.prefix}_cd_level` as BotGameDataKey
  if (mapping.durStat && statName === mapping.durStat) return `${mapping.prefix}_dur_level` as BotGameDataKey
  return null
}

export function resolveBotLabGameDataKey(botLabel: string, labName: string): BotGameDataKey | null {
  const mapping = UPTIME_BOT_FIELD_MAP.find(entry => entry.botLabel === botLabel)
  if (!mapping) return null
  if (labName === mapping.cdLab) return `${mapping.prefix}_cd_lab` as BotGameDataKey
  if (mapping.durLab && labName === mapping.durLab) return `${mapping.prefix}_dur_lab` as BotGameDataKey
  return null
}

export type BotGameInputDropdownBinding = {
  dataKey: BotGameDataKey
}

export function resolveBotGameInputDropdownBindingByKey(
  dataKey: BotGameDataKey,
): BotGameInputDropdownBinding {
  return { dataKey }
}

export function resolveBotGameInputDropdownBinding(
  botLabel: string,
  options: { statName?: string; labName?: string },
): BotGameInputDropdownBinding | null {
  if (options.statName) {
    const key = resolveBotStatGameDataKey(botLabel, options.statName)
    return key ? { dataKey: key } : null
  }
  if (options.labName) {
    const key = resolveBotLabGameDataKey(botLabel, options.labName)
    return key ? { dataKey: key } : null
  }
  return null
}

/** Canonical field label shared by every bot game-input dropdown (tracker, calculators, uptime). */
export function buildBotGameInputFieldLabel(dataKey: BotGameDataKey): string {
  const spec = BOT_GAME_INPUT_SPEC_BY_KEY[dataKey]
  if (!spec) return dataKey
  const statOrLab = resolveBotLabStatName(spec.mapping, spec.kind)
  return statOrLab ? `${spec.mapping.botLabel} - ${statOrLab}` : spec.mapping.botLabel
}

export function buildBotGameInputLevelEntries(spec: BotGameInputSpec): readonly { value: number; baseValue: number }[] {
  switch (spec.kind) {
    case 'cd_level':
      return Array.from({ length: BOT_CD_LEVEL_COUNT }, (_, value) => ({ value, baseValue: value }))
    case 'dur_level':
      return Array.from(
        { length: spec.mapping.prefix === 'tb' ? THUNDER_BOT_DUR_LEVEL_COUNT : BOT_DUR_LEVEL_COUNT },
        (_, value) => ({ value, baseValue: value }),
      )
    case 'cd_lab':
      return Array.from({ length: BOT_CD_LAB_COUNT }, (_, value) => ({ value, baseValue: value }))
    case 'dur_lab':
      return Array.from({ length: BOT_DUR_LAB_COUNT }, (_, value) => ({ value, baseValue: value }))
    default:
      return []
  }
}
