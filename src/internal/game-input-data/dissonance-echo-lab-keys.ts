import { ownLookupOr } from '../own-lookup'
import type { DissonanceTypeKey, DissonanceWaveInputs } from '../dissonance-calcs-local-state'

/** Research lab slugs for Dissonant Echo labs. */
export const DISSONANCE_ECHO_LAB_SLUG_BY_TYPE = {
  attack: 'dissonant_echo_attack',
  defense: 'dissonant_echo_defense',
  utility: 'dissonant_echo_utility',
  uw: 'dissonant_echo_ultimate_weapons',
} as const satisfies Record<DissonanceTypeKey, string>

export type DissonanceEchoLabDataKey =
  | 'dissonance_echo_attack_lab'
  | 'dissonance_echo_defense_lab'
  | 'dissonance_echo_utility_lab'
  | 'dissonance_echo_uw_lab'

export interface DissonanceEchoLabSpec {
  key: DissonanceEchoLabDataKey
  type: DissonanceTypeKey
  researchSlug: string
  minLevel: number
  maxLevel: number
}

export const DISSONANCE_ECHO_LAB_SPECS = [
  {
    key: 'dissonance_echo_attack_lab',
    type: 'attack',
    researchSlug: DISSONANCE_ECHO_LAB_SLUG_BY_TYPE.attack,
    minLevel: 0,
    maxLevel: 20,
  },
  {
    key: 'dissonance_echo_defense_lab',
    type: 'defense',
    researchSlug: DISSONANCE_ECHO_LAB_SLUG_BY_TYPE.defense,
    minLevel: 0,
    maxLevel: 20,
  },
  {
    key: 'dissonance_echo_utility_lab',
    type: 'utility',
    researchSlug: DISSONANCE_ECHO_LAB_SLUG_BY_TYPE.utility,
    minLevel: 0,
    maxLevel: 20,
  },
  {
    key: 'dissonance_echo_uw_lab',
    type: 'uw',
    researchSlug: DISSONANCE_ECHO_LAB_SLUG_BY_TYPE.uw,
    minLevel: 0,
    maxLevel: 20,
  },
] as const satisfies readonly DissonanceEchoLabSpec[]

export const DISSONANCE_ECHO_LAB_SPEC_BY_KEY = Object.fromEntries(
  DISSONANCE_ECHO_LAB_SPECS.map(spec => [spec.key, spec]),
) as Record<DissonanceEchoLabDataKey, DissonanceEchoLabSpec>

export const DISSONANCE_ECHO_LAB_SPEC_BY_TYPE = Object.fromEntries(
  DISSONANCE_ECHO_LAB_SPECS.map(spec => [spec.type, spec]),
) as Record<DissonanceTypeKey, DissonanceEchoLabSpec>

export const DISSONANCE_ECHO_LAB_SPEC_BY_SLUG = Object.fromEntries(
  DISSONANCE_ECHO_LAB_SPECS.map(spec => [spec.researchSlug, spec]),
) as Record<string, DissonanceEchoLabSpec>

export function isDissonanceEchoResearchLabSlug(slug: string): boolean {
  return slug in DISSONANCE_ECHO_LAB_SPEC_BY_SLUG
}

export function getDissonanceEchoLabSlug(type: DissonanceTypeKey): string {
  return ownLookupOr(DISSONANCE_ECHO_LAB_SLUG_BY_TYPE, type, '')
}

export function getDissonanceEchoLabGameDataKey(type: DissonanceTypeKey): DissonanceEchoLabDataKey {
  return DISSONANCE_ECHO_LAB_SPEC_BY_TYPE[type].key
}

const DISSONANCE_ECHO_LAB_TYPE_LABELS: Record<DissonanceTypeKey, string> = {
  attack: 'Attack',
  defense: 'Defense',
  utility: 'Utility',
  uw: 'UW',
}

/** Canonical field label shared by every dissonance echo lab dropdown. */
export function formatDissonanceEchoLabFieldLabel(dataKey: DissonanceEchoLabDataKey): string {
  const spec = DISSONANCE_ECHO_LAB_SPEC_BY_KEY[dataKey]
  const typeLabel = DISSONANCE_ECHO_LAB_TYPE_LABELS[spec.type] ?? spec.type
  return `${typeLabel} Echo Lab`
}

/** Each 0.5% step of echo benefit (level L → (L + 1) × step). */
export const DISSONANCE_ECHO_BENEFIT_STEP = 0.005

/** Echo benefit fraction at lab level L when echo labs are unlocked. */
export function computeDissonanceEchoBenefitFractionAtLabLevel(level: number): number {
  if (level < 0) return 0
  return (level + 1) * DISSONANCE_ECHO_BENEFIT_STEP
}

/** Max of calculator store level and shared research-lab level for one echo track. */
export function computeEffectiveEchoLabLevel(
  type: DissonanceTypeKey,
  storeLevels: Partial<DissonanceWaveInputs> | undefined,
  researchLabLevels: Record<string, number> | undefined,
): number {
  const slug = getDissonanceEchoLabSlug(type)
  const fromResearch = Math.floor(Number(researchLabLevels?.[slug] ?? 0))
  const fromStore = Math.floor(Number(storeLevels?.[type] ?? 0))
  const resolved = Math.max(
    Number.isFinite(fromResearch) ? fromResearch : 0,
    Number.isFinite(fromStore) ? fromStore : 0,
  )
  return Math.max(0, Math.min(20, resolved))
}

export function getEffectiveEchoLabLevels(
  storeLevels: Partial<DissonanceWaveInputs> | undefined,
  researchLabLevels: Record<string, number> | undefined,
): DissonanceWaveInputs {
  return {
    attack: computeEffectiveEchoLabLevel('attack', storeLevels, researchLabLevels),
    defense: computeEffectiveEchoLabLevel('defense', storeLevels, researchLabLevels),
    utility: computeEffectiveEchoLabLevel('utility', storeLevels, researchLabLevels),
    uw: computeEffectiveEchoLabLevel('uw', storeLevels, researchLabLevels),
  }
}
