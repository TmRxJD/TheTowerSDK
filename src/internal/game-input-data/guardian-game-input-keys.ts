import { buildGuardianDefinitions } from '../../data/index'

import { UPTIME_GUARDIAN_FIELD_MAP, type UptimeGuardianFieldMap } from '../shared-uptime-inputs'

import {

  buildGuardianGameInputLevelEntries,

  type GuardianGameInputKind,

  getGuardianGameInputPrefix,

} from './guardian-dropdown-math'
import {
  type GuardianStatSpec,
  findGuardianParametricStatSpec,
} from './guardian-stat-dropdown-math'

export type GuardianTrackerDropdownBinding =
  | { dataKey: GuardianGameDataKey }
  | { dataKey: 'guardian_stat_level'; guardianStatSpec: GuardianStatSpec }

export type GuardianGameDataKey =
  | 'atk_cd_level'
  | 'ally_cd_level'
  | 'bty_cd_level'
  | 'smn_cd_level'
  | 'smn_dur_level'
  | 'ftc_cd_level'
  | 'ftc_find_level'
  | 'ftc_double_find_level'
  | 'sct_cd_level'
  | 'sct_dur_level'


export interface GuardianGameInputSpec {

  key: GuardianGameDataKey

  mapping: UptimeGuardianFieldMap

  kind: GuardianGameInputKind

}


const GUARDIAN_GAME_INPUT_KINDS: GuardianGameInputKind[] = [

  'cd_level',

  'dur_level',

  'find_level',

  'double_find_level',

]


function guardianKindToKeySuffix(kind: GuardianGameInputKind): string {

  switch (kind) {

    case 'cd_level':

      return 'cd_level'

    case 'dur_level':

      return 'dur_level'

    case 'find_level':

      return 'find_level'

    case 'double_find_level':

      return 'double_find_level'

  }

}


function isSupportedGuardianKind(mapping: UptimeGuardianFieldMap, kind: GuardianGameInputKind): boolean {

  switch (kind) {

    case 'cd_level':

      return mapping.cooldownLevelKey != null

    case 'dur_level':

      return mapping.durationLevelKey != null

    case 'find_level':

      return mapping.findStatName != null

    case 'double_find_level':

      return mapping.doubleFindStatName != null

  }

}


export const GUARDIAN_GAME_INPUT_SPECS: readonly GuardianGameInputSpec[] = UPTIME_GUARDIAN_FIELD_MAP.flatMap(mapping =>

  GUARDIAN_GAME_INPUT_KINDS

    .filter(kind => isSupportedGuardianKind(mapping, kind))

    .map(kind => ({

      key: `${getGuardianGameInputPrefix(mapping.guardianKey)}_${guardianKindToKeySuffix(kind)}` as GuardianGameDataKey,

      mapping,

      kind,

    })),

)


export const GUARDIAN_GAME_INPUT_SPEC_BY_KEY = Object.fromEntries(

  GUARDIAN_GAME_INPUT_SPECS.map(spec => [spec.key, spec]),

) as Record<GuardianGameDataKey, GuardianGameInputSpec>


function findGuardianStatIndex(guardianLabel: string, statName: string): number {

  const guardian = buildGuardianDefinitions().find(

    entry => entry.label === guardianLabel || entry.key === guardianLabel.toLowerCase(),

  )

  if (!guardian) return -1

  const normalizedTarget = statName.toLowerCase()

  return guardian.statOrder.findIndex(name => name.toLowerCase().includes(normalizedTarget))

}


function findGuardianStatIndexExact(guardianLabel: string, statName: string): number {

  const guardian = buildGuardianDefinitions().find(

    entry => entry.label === guardianLabel || entry.key === guardianLabel.toLowerCase(),

  )

  if (!guardian) return -1

  const normalizedTarget = statName.toLowerCase()

  return guardian.statOrder.findIndex(name => name.toLowerCase() === normalizedTarget)

}


export function findGuardianStatGameDataKey(

  guardianLabel: string,

  statName: string,

): GuardianGameDataKey | null {

  const mapping = UPTIME_GUARDIAN_FIELD_MAP.find(entry => entry.guardianLabel === guardianLabel)

  if (!mapping) return null


  if (mapping.doubleFindStatName) {

    const doubleIndex = findGuardianStatIndexExact(guardianLabel, mapping.doubleFindStatName)

    const statIndex = findGuardianStatIndexExact(guardianLabel, statName)

    if (doubleIndex >= 0 && statIndex === doubleIndex) {

      return `${getGuardianGameInputPrefix(mapping.guardianKey)}_double_find_level` as GuardianGameDataKey

    }

  }


  if (mapping.findStatName) {

    const findIndex = findGuardianStatIndexExact(guardianLabel, mapping.findStatName)

    const statIndex = findGuardianStatIndexExact(guardianLabel, statName)

    if (findIndex >= 0 && statIndex === findIndex) {

      return `${getGuardianGameInputPrefix(mapping.guardianKey)}_find_level` as GuardianGameDataKey

    }

  }


  if (mapping.cooldownStatName) {

    const cdIndex = findGuardianStatIndex(guardianLabel, mapping.cooldownStatName)

    const statIndex = findGuardianStatIndex(guardianLabel, statName)

    if (cdIndex >= 0 && statIndex === cdIndex) {

      return `${getGuardianGameInputPrefix(mapping.guardianKey)}_cd_level` as GuardianGameDataKey

    }

  }


  if (mapping.durationStatName) {

    const durIndex = findGuardianStatIndex(guardianLabel, mapping.durationStatName)

    const statIndex = findGuardianStatIndex(guardianLabel, statName)

    if (durIndex >= 0 && statIndex === durIndex) {

      return `${getGuardianGameInputPrefix(mapping.guardianKey)}_dur_level` as GuardianGameDataKey

    }

  }


  return null

}


export function findGuardianTrackerDropdownBinding(
  guardianLabel: string,
  statName: string,
): GuardianTrackerDropdownBinding | null {
  const explicit = findGuardianStatGameDataKey(guardianLabel, statName)
  if (explicit) return { dataKey: explicit }

  const spec = findGuardianParametricStatSpec(guardianLabel, statName)
  if (spec) return { dataKey: 'guardian_stat_level', guardianStatSpec: spec }

  return null
}

export function isUptimeLinkedGuardianStat(guardianLabel: string, statName: string): boolean {

  return findGuardianStatGameDataKey(guardianLabel, statName) != null

}

/** Canonical field label shared by every guardian stat dropdown (tracker, calculators, uptime). */
export function buildGuardianGameInputFieldLabel(guardianLabel: string, statName: string): string {
  return `${guardianLabel} - ${statName}`
}


export { buildGuardianGameInputLevelEntries }
