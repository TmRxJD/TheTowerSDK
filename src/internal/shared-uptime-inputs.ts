import { z } from 'zod'
import { BOT_UPGRADES_DATA, type BotData } from '../data/bots'
import { buildGuardianDefinitions } from '../data/guardians'
import { guardianUpgrades } from '../data/guardian-upgrades'
import { normalizeUptimePersistedPayload } from './uptime-persistence'
import { buildUptimeCoreStateFromRecord } from './uptime-state-builder'
import type { UptimeCoreState } from '../mechanics/uptime-core'
import { findUwStatByName, findUwWeaponByName, type UwWeaponValue } from '../data/ultimate-weapons'

export const uptimeRarityPickSchema = z.enum([
  'None', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Ancestral',
])

export type SharedUptimeRarityPick = z.infer<typeof uptimeRarityPickSchema>

export const uptimeCompressorSchema = z.enum([
  'Disabled', 'Epic', 'Legendary', 'Mythic', 'Ancestral',
])

export const uptimeMvnModeSchema = uptimeCompressorSchema

const nullableLevelSchema = z.number().nullable()
const levelSchema = z.number()

export interface UptimeBotFieldMap {
  prefix: string
  botLabel: string
  cdStat: string
  durStat: string | null
  cdLab: string
  durLab: string | null
}

export const UPTIME_BOT_FIELD_MAP: ReadonlyArray<UptimeBotFieldMap> = [
  { prefix: 'gb', botLabel: 'Golden Bot', cdStat: 'Cooldown', durStat: 'Duration', cdLab: 'Cooldown', durLab: 'Duration' },
  { prefix: 'ab', botLabel: 'Amplify Bot', cdStat: 'Cooldown', durStat: 'Duration', cdLab: 'Cooldown', durLab: 'Duration' },
  { prefix: 'bb', botLabel: 'Bot Bot', cdStat: 'Cooldown', durStat: 'Duration', cdLab: 'Cooldown', durLab: 'Duration' },
  { prefix: 'fb', botLabel: 'Flame Bot', cdStat: 'Cooldown', durStat: 'Duration', cdLab: 'Cooldown', durLab: null },
  { prefix: 'tb', botLabel: 'Thunder Bot', cdStat: 'Cooldown', durStat: 'Duration', cdLab: 'Cooldown', durLab: null },
]

import { UPTIME_UW_FIELD_MAP, type UptimeUwFieldMap } from './uptime-uw-field-map'

export { UPTIME_UW_FIELD_MAP, type UptimeUwFieldMap }

export interface UptimeGuardianFieldMap {
  guardianKey: string
  guardianLabel: string
  primaryLevelKey?: string
  primaryStatName?: string
  cooldownLevelKey?: string
  cooldownStatName?: string
  durationLevelKey?: string
  durationStatName?: string
  findStatName?: string
  doubleFindStatName?: string
}

export const UPTIME_GUARDIAN_FIELD_MAP: ReadonlyArray<UptimeGuardianFieldMap> = [
  { guardianKey: 'attack', guardianLabel: 'Attack', primaryLevelKey: 'attackLevel', cooldownLevelKey: 'attackCooldownLevel', cooldownStatName: 'Cooldown' },
  { guardianKey: 'ally', guardianLabel: 'Ally', primaryLevelKey: 'allyLevel', cooldownLevelKey: 'allyCooldownLevel', cooldownStatName: 'Cooldown' },
  { guardianKey: 'bounty', guardianLabel: 'Bounty', primaryLevelKey: 'bountyLevel', cooldownLevelKey: 'bountyCooldownLevel', cooldownStatName: 'Cooldown' },
  { guardianKey: 'summon', guardianLabel: 'Summon', cooldownLevelKey: 'summonCooldownLevel', cooldownStatName: 'Cooldown', durationLevelKey: 'summonDurationLevel', durationStatName: 'Duration' },
  { guardianKey: 'fetch', guardianLabel: 'Fetch', cooldownLevelKey: 'fetchCooldownLevel', cooldownStatName: 'Cooldown', findStatName: 'Find Chance', doubleFindStatName: 'Double Find Chance' },
  { guardianKey: 'scout', guardianLabel: 'Scout', cooldownLevelKey: 'scoutCooldownLevel', cooldownStatName: 'Cooldown', durationLevelKey: 'scoutDurationLevel', durationStatName: 'Duration' },
]

export const UPTIME_RESEARCH_LAB_FIELD_KEYS = [
  'waLevel',
  'dwBaseWavesLevel',
  'gtDurLab',
  'cfDurLab',
  'bcLabLevel',
] as const

export const sharedUptimeInputsSchema = z.object({
  gtCdLevel: nullableLevelSchema.optional(),
  gtCdStat: uptimeRarityPickSchema.optional(),
  gtCdAssist: uptimeRarityPickSchema.optional(),
  dwCdLevel: nullableLevelSchema.optional(),
  dwCdStat: uptimeRarityPickSchema.optional(),
  dwCdAssist: uptimeRarityPickSchema.optional(),
  bhCdLevel: nullableLevelSchema.optional(),
  bhCdStat: uptimeRarityPickSchema.optional(),
  bhCdAssist: uptimeRarityPickSchema.optional(),
  psCdLevel: nullableLevelSchema.optional(),
  psCdStat: uptimeRarityPickSchema.optional(),
  psCdAssist: uptimeRarityPickSchema.optional(),
  cfCdLevel: nullableLevelSchema.optional(),
  cfCdStat: uptimeRarityPickSchema.optional(),
  cfCdAssist: uptimeRarityPickSchema.optional(),
  smCdLevel: nullableLevelSchema.optional(),
  smCdStat: uptimeRarityPickSchema.optional(),
  smCdAssist: uptimeRarityPickSchema.optional(),
  ilmCdLevel: nullableLevelSchema.optional(),
  ilmCdStat: uptimeRarityPickSchema.optional(),
  ilmCdAssist: uptimeRarityPickSchema.optional(),
  gtDurLevel: nullableLevelSchema.optional(),
  gtDurStat: uptimeRarityPickSchema.optional(),
  gtDurAssist: uptimeRarityPickSchema.optional(),
  bhDurLevel: nullableLevelSchema.optional(),
  bhDurStat: uptimeRarityPickSchema.optional(),
  bhDurAssist: uptimeRarityPickSchema.optional(),
  psDurLevel: nullableLevelSchema.optional(),
  psDurStat: uptimeRarityPickSchema.optional(),
  psDurAssist: uptimeRarityPickSchema.optional(),
  cfDurLevel: nullableLevelSchema.optional(),
  cfDurStat: uptimeRarityPickSchema.optional(),
  cfDurAssist: uptimeRarityPickSchema.optional(),
  smQtyLevel: nullableLevelSchema.optional(),
  smQtyStat: uptimeRarityPickSchema.optional(),
  smQtyAssist: uptimeRarityPickSchema.optional(),
  slAngleLevel: nullableLevelSchema.optional(),
  slAngleStat: uptimeRarityPickSchema.optional(),
  slAngleAssist: uptimeRarityPickSchema.optional(),
  slQtyLevel: nullableLevelSchema.optional(),
  slQtyStat: uptimeRarityPickSchema.optional(),
  slQtyAssist: uptimeRarityPickSchema.optional(),
  dwQtyStat: uptimeRarityPickSchema.optional(),
  dwQtyAssist: uptimeRarityPickSchema.optional(),
  gbCdLevel: nullableLevelSchema.optional(),
  gbDurLevel: nullableLevelSchema.optional(),
  gbCdLab: levelSchema.optional(),
  gbDurLab: levelSchema.optional(),
  abCdLevel: nullableLevelSchema.optional(),
  abDurLevel: nullableLevelSchema.optional(),
  abCdLab: levelSchema.optional(),
  abDurLab: levelSchema.optional(),
  bbCdLevel: nullableLevelSchema.optional(),
  bbDurLevel: nullableLevelSchema.optional(),
  bbCdLab: levelSchema.optional(),
  bbDurLab: levelSchema.optional(),
  fbCdLevel: nullableLevelSchema.optional(),
  fbDurLevel: nullableLevelSchema.optional(),
  fbCdLab: levelSchema.optional(),
  tbCdLevel: nullableLevelSchema.optional(),
  tbDurLevel: nullableLevelSchema.optional(),
  tbCdLab: levelSchema.optional(),
  attackLevel: nullableLevelSchema.optional(),
  allyLevel: nullableLevelSchema.optional(),
  bountyLevel: nullableLevelSchema.optional(),
  summonCooldownLevel: nullableLevelSchema.optional(),
  summonDurationLevel: nullableLevelSchema.optional(),
  attackCooldownLevel: nullableLevelSchema.optional(),
  allyCooldownLevel: nullableLevelSchema.optional(),
  bountyCooldownLevel: nullableLevelSchema.optional(),
  fetchCooldownLevel: nullableLevelSchema.optional(),
  scoutCooldownLevel: nullableLevelSchema.optional(),
  scoutDurationLevel: nullableLevelSchema.optional(),
  waLevel: levelSchema.optional(),
  dwBaseWavesLevel: levelSchema.optional(),
  gtDurLab: levelSchema.optional(),
  cfDurLab: levelSchema.optional(),
  bcLabLevel: levelSchema.optional(),
  assistEffPct: levelSchema.optional(),
  wavesPerBoss: levelSchema.optional(),
  pkgChance: levelSchema.optional(),
  compressor: uptimeCompressorSchema.optional(),
  mvnRarity: uptimeMvnModeSchema.optional(),
  mvnEnabled: z.boolean().optional(),
  mvnGt: z.boolean().optional(),
  mvnDw: z.boolean().optional(),
  mvnBh: z.boolean().optional(),
  tournament: z.boolean().optional(),
  bhPerk: z.boolean().optional(),
  cfDurPerk: z.boolean().optional(),
  dwPerk: z.boolean().optional(),
  smQtyPerk: z.boolean().optional(),
  uwBc: z.boolean().optional(),
})

export type SharedUptimeInputs = z.infer<typeof sharedUptimeInputsSchema>

export const defaultSharedUptimeInputs: Readonly<SharedUptimeInputs> = {}

export type UwProgressLevels = Record<string, Record<string, number>>

export const uwProgressLevelsSchema = z.record(z.string(), z.record(z.string(), z.number()))

function findBotByLabel(label: string): BotData | undefined {
  return BOT_UPGRADES_DATA.find(bot => bot.label === label || bot.name === label)
}

function findBotStatIndex(bot: BotData, statName: string): number {
  return bot.statOrder.indexOf(statName)
}

function clampBotCdLevel(level: number | null | undefined): number | null {
  if (level == null) return null
  const num = Number(level)
  if (!Number.isFinite(num)) return null
  return Math.min(15, Math.max(0, Math.floor(num)))
}

function toNullableNumber(value: unknown): number | null {
  if (value == null) return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function toRarity(value: unknown): SharedUptimeRarityPick {
  return uptimeRarityPickSchema.safeParse(value).success
    ? (value as SharedUptimeRarityPick)
    : 'None'
}

function getGuardianSourceMinLevel(guardianKey: string): number {
  const upgrades = guardianUpgrades[guardianKey as keyof typeof guardianUpgrades]
  if (!upgrades?.length) return 0
  return Math.min(...upgrades.map(entry => Number(entry.level)).filter(Number.isFinite))
}

function sourceLevelToNormalized(sourceLevel: number | null | undefined, guardianKey: string): number | null {
  if (sourceLevel == null) return null
  const min = getGuardianSourceMinLevel(guardianKey)
  return Math.max(0, Math.floor(Number(sourceLevel) - min))
}

function normalizedToSourceLevel(normalizedLevel: number | null | undefined, guardianKey: string): number | null {
  if (normalizedLevel == null) return null
  const min = getGuardianSourceMinLevel(guardianKey)
  return Math.floor(Number(normalizedLevel) + min)
}

function findGuardianStatIndex(guardianLabel: string, statName: string): number {
  const guardian = buildGuardianDefinitions().find(entry => entry.label === guardianLabel || entry.key === guardianLabel.toLowerCase())
  if (!guardian) return -1
  const normalizedTarget = statName.toLowerCase()
  return guardian.statOrder.findIndex(name => name.toLowerCase().includes(normalizedTarget))
}

export function readSharedUptimeInputs(data: Record<string, unknown>): SharedUptimeInputs {
  const raw = {
    gtCdLevel: toNullableNumber(data['gtCdLevel']),
    gtCdStat: toRarity(data['gtCdStat']),
    gtCdAssist: toRarity(data['gtCdAssist']),
    dwCdLevel: toNullableNumber(data['dwCdLevel']),
    dwCdStat: toRarity(data['dwCdStat']),
    dwCdAssist: toRarity(data['dwCdAssist']),
    bhCdLevel: toNullableNumber(data['bhCdLevel']),
    bhCdStat: toRarity(data['bhCdStat']),
    bhCdAssist: toRarity(data['bhCdAssist']),
    psCdLevel: toNullableNumber(data['psCdLevel']),
    psCdStat: toRarity(data['psCdStat']),
    psCdAssist: toRarity(data['psCdAssist']),
    cfCdLevel: toNullableNumber(data['cfCdLevel']),
    cfCdStat: toRarity(data['cfCdStat']),
    cfCdAssist: toRarity(data['cfCdAssist']),
    smCdLevel: toNullableNumber(data['smCdLevel']),
    smCdStat: toRarity(data['smCdStat']),
    smCdAssist: toRarity(data['smCdAssist']),
    ilmCdLevel: toNullableNumber(data['ilmCdLevel']),
    ilmCdStat: toRarity(data['ilmCdStat']),
    ilmCdAssist: toRarity(data['ilmCdAssist']),
    gtDurLevel: toNullableNumber(data['gtDurLevel']),
    gtDurStat: toRarity(data['gtDurStat']),
    gtDurAssist: toRarity(data['gtDurAssist']),
    bhDurLevel: toNullableNumber(data['bhDurLevel']),
    bhDurStat: toRarity(data['bhDurStat']),
    bhDurAssist: toRarity(data['bhDurAssist']),
    psDurLevel: toNullableNumber(data['psDurLevel']),
    psDurStat: toRarity(data['psDurStat']),
    psDurAssist: toRarity(data['psDurAssist']),
    cfDurLevel: toNullableNumber(data['cfDurLevel']),
    cfDurStat: toRarity(data['cfDurStat']),
    cfDurAssist: toRarity(data['cfDurAssist']),
    smQtyLevel: toNullableNumber(data['smQtyLevel']),
    smQtyStat: toRarity(data['smQtyStat']),
    smQtyAssist: toRarity(data['smQtyAssist']),
    slAngleLevel: toNullableNumber(data['slAngleLevel']),
    slAngleStat: toRarity(data['slAngleStat']),
    slAngleAssist: toRarity(data['slAngleAssist']),
    slQtyLevel: toNullableNumber(data['slQtyLevel']),
    slQtyStat: toRarity(data['slQtyStat']),
    slQtyAssist: toRarity(data['slQtyAssist']),
    dwQtyStat: toRarity(data['dwQtyStat']),
    dwQtyAssist: toRarity(data['dwQtyAssist']),
    gbCdLevel: clampBotCdLevel(toNullableNumber(data['gbCdLevel'])),
    gbDurLevel: toNullableNumber(data['gbDurLevel']),
    gbCdLab: toNumber(data['gbCdLab']),
    gbDurLab: toNumber(data['gbDurLab']),
    abCdLevel: clampBotCdLevel(toNullableNumber(data['abCdLevel'])),
    abDurLevel: toNullableNumber(data['abDurLevel']),
    abCdLab: toNumber(data['abCdLab']),
    abDurLab: toNumber(data['abDurLab']),
    bbCdLevel: clampBotCdLevel(toNullableNumber(data['bbCdLevel'])),
    bbDurLevel: toNullableNumber(data['bbDurLevel']),
    bbCdLab: toNumber(data['bbCdLab']),
    bbDurLab: toNumber(data['bbDurLab']),
    fbCdLevel: clampBotCdLevel(toNullableNumber(data['fbCdLevel'])),
    fbDurLevel: toNullableNumber(data['fbDurLevel']),
    fbCdLab: toNumber(data['fbCdLab']),
    tbCdLevel: clampBotCdLevel(toNullableNumber(data['tbCdLevel'])),
    tbDurLevel: toNullableNumber(data['tbDurLevel']),
    tbCdLab: toNumber(data['tbCdLab']),
    attackLevel: toNullableNumber(data['attackLevel']),
    allyLevel: toNullableNumber(data['allyLevel']),
    bountyLevel: toNullableNumber(data['bountyLevel']),
    summonCooldownLevel: toNullableNumber(data['summonCooldownLevel'] ?? data['summonLevel']),
    summonDurationLevel: toNullableNumber(data['summonDurationLevel'] ?? data['summonLevel']),
    attackCooldownLevel: toNullableNumber(data['attackCooldownLevel']),
    allyCooldownLevel: toNullableNumber(data['allyCooldownLevel']),
    bountyCooldownLevel: toNullableNumber(data['bountyCooldownLevel']),
    fetchCooldownLevel: toNullableNumber(data['fetchCooldownLevel']),
    scoutCooldownLevel: toNullableNumber(data['scoutCooldownLevel']),
    scoutDurationLevel: toNullableNumber(data['scoutDurationLevel']),
    waLevel: toNumber(data['waLevel']),
    dwBaseWavesLevel: Math.max(1, toNumber(data['dwBaseWavesLevel'], 1)),
    gtDurLab: toNumber(data['gtDurLab']),
    cfDurLab: toNumber(data['cfDurLab']),
    bcLabLevel: toNumber(data['bcLabLevel']),
    assistEffPct: toNumber(data['assistEffPct'] ?? data['cdAssistEffPct'] ?? data['durAssistEffPct']),
    wavesPerBoss: toNumber(data['wavesPerBoss'], 5),
    pkgChance: toNumber(data['pkgChance']),
    compressor: uptimeCompressorSchema.safeParse(data['compressor']).success
      ? (data['compressor'] as SharedUptimeInputs['compressor'])
      : 'Disabled',
    mvnRarity: uptimeMvnModeSchema.safeParse(data['mvnRarity']).success
      ? (data['mvnRarity'] as SharedUptimeInputs['mvnRarity'])
      : 'Disabled',
    mvnEnabled: data['mvnEnabled'] === true,
    mvnGt: data['mvnGt'] === true,
    mvnDw: data['mvnDw'] === true,
    mvnBh: data['mvnBh'] === true,
    tournament: data['tournament'] === true,
    bhPerk: data['bhPerk'] === true,
    cfDurPerk: data['cfDurPerk'] === true,
    dwPerk: data['dwPerk'] === true,
    smQtyPerk: data['smQtyPerk'] === true,
    uwBc: data['uwBc'] === true,
  }

  return sharedUptimeInputsSchema.parse(raw)
}

export function applySharedUptimeInputs(
  data: Record<string, unknown>,
  inputs: SharedUptimeInputs,
): void {
  for (const [key, value] of Object.entries(inputs)) {
    if (value === undefined) continue
    // Hub payloads normalize missing tracker-linked fields to null — never clobber persisted levels.
    if (value === null && isUptimeTrackerLinkedLevelField(key) && data[key] != null) continue
    data[key] = value
  }
}

/** Merge shared hub uptime fields onto uptime calculator defaults and build core state. */
export function getUptimeCoreStateFromSharedInputs(
  inputs: SharedUptimeInputs,
  baseRecord?: Record<string, unknown>,
): UptimeCoreState {
  const data: Record<string, unknown> = {
    ...(baseRecord ?? normalizeUptimePersistedPayload({}).data),
  }
  applySharedUptimeInputs(data, inputs)
  return buildUptimeCoreStateFromRecord(data)
}

export function mergeSharedUptimeInputs(
  existing: SharedUptimeInputs,
  incoming: SharedUptimeInputs,
): SharedUptimeInputs {
  const merged: Record<string, unknown> = { ...existing }
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue
    const existingValue = merged[key]
    if (typeof value === 'number') {
      if (existingValue == null || typeof existingValue !== 'number') {
        merged[key] = value
      } else {
        merged[key] = Math.max(existingValue, value)
      }
      continue
    }
    if (value === null && existingValue != null) continue
    merged[key] = value
  }
  return sharedUptimeInputsSchema.parse(merged)
}

export function migrateLegacyUptimeLabLevels(labLevels: Record<string, number> | undefined): SharedUptimeInputs {
  if (!labLevels) return {}
  const out: Record<string, unknown> = {}
  for (const key of [...UPTIME_RESEARCH_LAB_FIELD_KEYS, 'gbCdLab', 'gbDurLab', 'abCdLab', 'abDurLab', 'bbCdLab', 'bbDurLab', 'fbCdLab', 'tbCdLab']) {
    if (labLevels[key] != null) out[key] = labLevels[key]
  }
  for (const [key, value] of Object.entries(labLevels)) {
    if (!(key in out)) out[key] = value
  }
  return readSharedUptimeInputs(out)
}

export function syncUptimeBotsFromTracker(
  botLevels: Record<string, number[]>,
  botLabLevels: Record<string, Record<string, number>>,
  existing: SharedUptimeInputs = {},
): SharedUptimeInputs {
  const next: Record<string, unknown> = { ...existing }

  for (const mapping of UPTIME_BOT_FIELD_MAP) {
    const bot = findBotByLabel(mapping.botLabel)
    if (!bot) continue
    const levels = botLevels[mapping.botLabel] || botLevels[bot.name]
    const labs = botLabLevels[mapping.botLabel] || botLabLevels[bot.name] || {}

    const cdIndex = findBotStatIndex(bot, mapping.cdStat)
    if (cdIndex >= 0 && levels?.[cdIndex] != null) {
      next[`${mapping.prefix}CdLevel`] = clampBotCdLevel(levels[cdIndex])
    }

    if (mapping.durStat) {
      const durIndex = findBotStatIndex(bot, mapping.durStat)
      if (durIndex >= 0 && levels?.[durIndex] != null) {
        next[`${mapping.prefix}DurLevel`] = levels[durIndex]
      }
    }

    if (mapping.cdLab && labs[mapping.cdLab] != null) {
      next[`${mapping.prefix}CdLab`] = labs[mapping.cdLab]
    }
    if (mapping.durLab && labs[mapping.durLab] != null) {
      next[`${mapping.prefix}DurLab`] = labs[mapping.durLab]
    }
  }

  return readSharedUptimeInputs(next)
}

export function syncTrackerBotsFromUptime(
  uptime: SharedUptimeInputs,
  botLevels: Record<string, number[]>,
  botLabLevels: Record<string, Record<string, number>>,
): {
    botLevels: Record<string, number[]>
    botLabLevels: Record<string, Record<string, number>>
  } {
  const nextLevels = Object.fromEntries(
    Object.entries(botLevels).map(([key, values]) => [key, [...values]]),
  )
  const nextLabs = Object.fromEntries(
    Object.entries(botLabLevels).map(([key, inner]) => [key, { ...inner }]),
  )

  for (const mapping of UPTIME_BOT_FIELD_MAP) {
    const bot = findBotByLabel(mapping.botLabel)
    if (!bot) continue
    const label = bot.label
    if (!nextLevels[label]) nextLevels[label] = bot.statOrder.map(() => 0)
    if (!nextLabs[label]) nextLabs[label] = {}

    const cdLevel = uptime[`${mapping.prefix}CdLevel` as keyof SharedUptimeInputs]
    const cdIndex = findBotStatIndex(bot, mapping.cdStat)
    if (cdIndex >= 0 && cdLevel != null) {
      const normalizedCdLevel = typeof cdLevel === 'number' ? cdLevel : Number(cdLevel)
      if (Number.isFinite(normalizedCdLevel)) {
        nextLevels[label][cdIndex] = normalizedCdLevel
      }
    }

    if (mapping.durStat) {
      const durLevel = uptime[`${mapping.prefix}DurLevel` as keyof SharedUptimeInputs]
      const durIndex = findBotStatIndex(bot, mapping.durStat)
      if (durIndex >= 0 && durLevel != null) {
        nextLevels[label][durIndex] = Number(durLevel)
      }
    }

    const cdLab = uptime[`${mapping.prefix}CdLab` as keyof SharedUptimeInputs]
    if (mapping.cdLab && cdLab != null) {
      nextLabs[label][mapping.cdLab] = Number(cdLab)
    }
    const durLab = uptime[`${mapping.prefix}DurLab` as keyof SharedUptimeInputs]
    if (mapping.durLab && durLab != null) {
      nextLabs[label][mapping.durLab] = Number(durLab)
    }
  }

  return { botLevels: nextLevels, botLabLevels: nextLabs }
}

export function syncUptimeGuardiansFromTracker(
  guardianLevels: Record<string, number[]>,
  existing: SharedUptimeInputs = {},
): SharedUptimeInputs {
  const next: Record<string, unknown> = { ...existing }

  for (const mapping of UPTIME_GUARDIAN_FIELD_MAP) {
    const levels = guardianLevels[mapping.guardianLabel]
    if (!levels) continue

    if (mapping.primaryLevelKey) {
      const primaryIndex = mapping.primaryStatName
        ? findGuardianStatIndex(mapping.guardianLabel, mapping.primaryStatName)
        : 0
      const normalized = primaryIndex >= 0 ? levels[primaryIndex] : undefined
      const source = normalizedToSourceLevel(normalized, mapping.guardianKey)
      if (source != null) next[mapping.primaryLevelKey] = source
    }

    if (mapping.cooldownLevelKey && mapping.cooldownStatName) {
      const cdIndex = findGuardianStatIndex(mapping.guardianLabel, mapping.cooldownStatName)
      const normalized = cdIndex >= 0 ? levels[cdIndex] : undefined
      const source = normalizedToSourceLevel(normalized, mapping.guardianKey)
      if (source != null) next[mapping.cooldownLevelKey] = source
    }

    if (mapping.durationLevelKey && mapping.durationStatName) {
      const durIndex = findGuardianStatIndex(mapping.guardianLabel, mapping.durationStatName)
      const normalized = durIndex >= 0 ? levels[durIndex] : undefined
      const source = normalizedToSourceLevel(normalized, mapping.guardianKey)
      if (source != null) next[mapping.durationLevelKey] = source
    }
  }

  return readSharedUptimeInputs(next)
}

export function syncTrackerGuardiansFromUptime(
  uptime: SharedUptimeInputs,
  guardianLevels: Record<string, number[]>,
): Record<string, number[]> {
  const next = Object.fromEntries(
    Object.entries(guardianLevels).map(([key, values]) => [key, [...values]]),
  )

  for (const mapping of UPTIME_GUARDIAN_FIELD_MAP) {
    const current = next[mapping.guardianLabel]
    if (!current) continue

    if (mapping.primaryLevelKey) {
      const primaryIndex = mapping.primaryStatName
        ? findGuardianStatIndex(mapping.guardianLabel, mapping.primaryStatName)
        : 0
      const source = uptime[mapping.primaryLevelKey as keyof SharedUptimeInputs]
      const normalized = sourceLevelToNormalized(Number(source), mapping.guardianKey)
      if (primaryIndex >= 0 && normalized != null) current[primaryIndex] = normalized
    }

    if (mapping.cooldownLevelKey) {
      const cdIndex = mapping.cooldownStatName
        ? findGuardianStatIndex(mapping.guardianLabel, mapping.cooldownStatName)
        : -1
      const source = uptime[mapping.cooldownLevelKey as keyof SharedUptimeInputs]
      const normalized = sourceLevelToNormalized(Number(source), mapping.guardianKey)
      if (cdIndex >= 0 && normalized != null) current[cdIndex] = normalized
    }

    if (mapping.durationLevelKey && mapping.durationStatName) {
      const durIndex = findGuardianStatIndex(mapping.guardianLabel, mapping.durationStatName)
      const source = uptime[mapping.durationLevelKey as keyof SharedUptimeInputs]
      const normalized = sourceLevelToNormalized(Number(source), mapping.guardianKey)
      if (durIndex >= 0 && normalized != null) current[durIndex] = normalized
    }
  }

  return next
}

function findUwStatIndex(weapon: UwWeaponValue, statName: string): number {
  const stat = findUwStatByName(weapon, statName)
  if (!stat) return -1
  return (weapon.stats || []).indexOf(stat)
}

export function readUwProgressLevels(
  progress: Record<string, { starts?: Record<number, number> }>,
  weapons: UwWeaponValue[],
): UwProgressLevels {
  const out: UwProgressLevels = {}
  for (const [weaponName, entry] of Object.entries(progress)) {
    const weapon = findUwWeaponByName(weapons, weaponName)
    if (!weapon || !entry?.starts) continue
    const statLevels: Record<string, number> = {}
    for (const [statIndexRaw, level] of Object.entries(entry.starts)) {
      const statIndex = Number(statIndexRaw)
      const stat = weapon.stats?.[statIndex]
      if (!stat?.name || !Number.isFinite(level)) continue
      statLevels[stat.name] = level
    }
    if (Object.keys(statLevels).length) out[weapon.name] = statLevels
  }
  return out
}

const UPTIME_UW_INPUT_FIELD_KEYS = UPTIME_UW_FIELD_MAP.flatMap(mapping => [
  mapping.cdLevelKey,
  mapping.cdStatKey,
  mapping.cdAssistKey,
  mapping.durLevelKey,
  mapping.durStatKey,
  mapping.durAssistKey,
  mapping.qtyLevelKey,
  mapping.qtyStatKey,
  mapping.qtyAssistKey,
  mapping.angleLevelKey,
  mapping.angleStatKey,
  mapping.angleAssistKey,
].filter((key): key is string => Boolean(key)))

export function isUptimeUwLinkedInputField(fieldName: string): boolean {
  return UPTIME_UW_INPUT_FIELD_KEYS.includes(fieldName)
}

const UPTIME_BOT_LINKED_LEVEL_KEYS = UPTIME_BOT_FIELD_MAP.flatMap(mapping => {
  const keys: string[] = [`${mapping.prefix}CdLevel`]
  if (mapping.durStat) keys.push(`${mapping.prefix}DurLevel`)
  return keys
})

export function isUptimeBotLinkedInputField(fieldName: string): boolean {
  return UPTIME_BOT_LINKED_LEVEL_KEYS.includes(fieldName)
}

const UPTIME_GUARDIAN_LINKED_LEVEL_KEYS = UPTIME_GUARDIAN_FIELD_MAP.flatMap(mapping => [
  mapping.primaryLevelKey,
  mapping.cooldownLevelKey,
  mapping.durationLevelKey,
].filter((key): key is string => Boolean(key)))

export function isUptimeGuardianLinkedInputField(fieldName: string): boolean {
  return UPTIME_GUARDIAN_LINKED_LEVEL_KEYS.includes(fieldName)
}

export function isUptimeTrackerLinkedLevelField(fieldName: string): boolean {
  return isUptimeUwLinkedInputField(fieldName)
    || isUptimeBotLinkedInputField(fieldName)
    || isUptimeGuardianLinkedInputField(fieldName)
}

/** Map hub uwProgressLevels onto uptime UW input fields (no circular uw-settings import). */
export function syncUptimeFromUwProgressLevels(
  levels: UwProgressLevels,
  weapons: UwWeaponValue[],
  existing: SharedUptimeInputs = {},
): SharedUptimeInputs {
  const next: Record<string, unknown> = { ...existing }

  for (const mapping of UPTIME_UW_FIELD_MAP) {
    const weapon = findUwWeaponByName(weapons, mapping.weaponName)
    if (!weapon) continue
    const statLevels = levels[weapon.name] || levels[mapping.weaponName]
    if (!statLevels) continue

    const applyStat = (
      statName: string | undefined,
      levelKey?: string,
      statKey?: string,
      assistKey?: string,
    ) => {
      if (!statName || !levelKey) return
      const level = statLevels[statName]
      if (level != null) next[levelKey] = level
      if (statKey && next[statKey] == null) next[statKey] = 'None'
      if (assistKey && next[assistKey] == null) next[assistKey] = 'None'
    }

    applyStat(mapping.cdStatName, mapping.cdLevelKey, mapping.cdStatKey, mapping.cdAssistKey)
    applyStat(mapping.durStatName, mapping.durLevelKey, mapping.durStatKey, mapping.durAssistKey)
    applyStat(mapping.qtyStatName, mapping.qtyLevelKey, mapping.qtyStatKey, mapping.qtyAssistKey)
    applyStat(mapping.angleStatName, mapping.angleLevelKey, mapping.angleStatKey, mapping.angleAssistKey)
  }

  return readSharedUptimeInputs(next)
}

export function syncUptimeUwFromTracker(
  progress: Record<string, { starts?: Record<number, number> }>,
  weapons: UwWeaponValue[],
  existing: SharedUptimeInputs = {},
): SharedUptimeInputs {
  const next: Record<string, unknown> = { ...existing }

  for (const mapping of UPTIME_UW_FIELD_MAP) {
    const weapon = findUwWeaponByName(weapons, mapping.weaponName)
    if (!weapon) continue
    const entry = progress[weapon.name] || progress[mapping.weaponName]
    if (!entry?.starts) continue

    const applyStat = (statName: string | undefined, levelKey?: string, statKey?: string, assistKey?: string) => {
      if (!statName || !levelKey) return
      const statIndex = findUwStatIndex(weapon, statName)
      if (statIndex < 0) return
      const level = entry.starts?.[statIndex]
      if (level != null) next[levelKey] = level
      if (statKey) next[statKey] = next[statKey] ?? 'None'
      if (assistKey) next[assistKey] = next[assistKey] ?? 'None'
    }

    applyStat(mapping.cdStatName, mapping.cdLevelKey, mapping.cdStatKey, mapping.cdAssistKey)
    applyStat(mapping.durStatName, mapping.durLevelKey, mapping.durStatKey, mapping.durAssistKey)
    applyStat(mapping.qtyStatName, mapping.qtyLevelKey, mapping.qtyStatKey, mapping.qtyAssistKey)
    applyStat(mapping.angleStatName, mapping.angleLevelKey, mapping.angleStatKey, mapping.angleAssistKey)
  }

  return readSharedUptimeInputs(next)
}

export function syncTrackerUwFromUptime(
  uptime: SharedUptimeInputs,
  progress: Record<string, { starts?: Record<number, number>; targets?: Record<number, number> }>,
  weapons: UwWeaponValue[],
): Record<string, { starts?: Record<number, number>; targets?: Record<number, number> }> {
  const next = Object.fromEntries(
    Object.entries(progress).map(([name, entry]) => [name, {
      starts: { ...(entry.starts || {}) },
      targets: { ...(entry.targets || {}) },
    }]),
  )

  for (const mapping of UPTIME_UW_FIELD_MAP) {
    const weapon = findUwWeaponByName(weapons, mapping.weaponName)
    if (!weapon) continue
    if (!next[weapon.name]) next[weapon.name] = { starts: {}, targets: {} }
    const entry = next[weapon.name]
    if (!entry.starts) entry.starts = {}

    const applyStat = (statName: string | undefined, levelKey?: string) => {
      if (!statName || !levelKey) return
      const level = uptime[levelKey as keyof SharedUptimeInputs]
      if (level == null) return
      const statIndex = findUwStatIndex(weapon, statName)
      if (statIndex < 0) return
      entry.starts![statIndex] = Number(level)
      if (entry.targets?.[statIndex] != null && entry.targets[statIndex] < Number(level)) {
        entry.targets[statIndex] = Number(level)
      }
    }

    applyStat(mapping.cdStatName, mapping.cdLevelKey)
    applyStat(mapping.durStatName, mapping.durLevelKey)
    applyStat(mapping.qtyStatName, mapping.qtyLevelKey)
    applyStat(mapping.angleStatName, mapping.angleLevelKey)
  }

  return next
}

/** Tracker bot levels/labs overwrite linked uptime bot fields (no Math.max — supports lowering values). */
export function overlaySharedUptimeInputsFromTracker(
  base: SharedUptimeInputs,
  botLevels: Record<string, number[]>,
  botLabLevels: Record<string, Record<string, number>> = {},
): SharedUptimeInputs {
  return {
    ...readSharedUptimeInputs(base),
    ...syncUptimeBotsFromTracker(botLevels, botLabLevels),
  }
}

export function buildSharedUptimeInputsFromSources(input: {
  uptimeData?: Record<string, unknown>
  botLevels?: Record<string, number[]>
  botLabLevels?: Record<string, Record<string, number>>
  guardianLevels?: Record<string, number[]>
  uwProgress?: Record<string, { starts?: Record<number, number> }>
  uwWeapons?: UwWeaponValue[]
}): SharedUptimeInputs {
  let merged = input.uptimeData ? readSharedUptimeInputs(input.uptimeData) : {}
  if (input.botLevels) {
    merged = overlaySharedUptimeInputsFromTracker(
      merged,
      input.botLevels,
      input.botLabLevels ?? {},
    )
  }
  if (input.guardianLevels) {
    merged = mergeSharedUptimeInputs(merged, syncUptimeGuardiansFromTracker(input.guardianLevels))
  }
  if (input.uwProgress && input.uwWeapons?.length) {
    merged = mergeSharedUptimeInputs(merged, syncUptimeUwFromTracker(input.uwProgress, input.uwWeapons))
  }
  return merged
}

export function collectUwProgressLevelsFromUptime(
  uptime: SharedUptimeInputs,
  weapons: UwWeaponValue[],
): UwProgressLevels {
  const progress = syncTrackerUwFromUptime(uptime, {}, weapons)
  return readUwProgressLevels(progress, weapons)
}
