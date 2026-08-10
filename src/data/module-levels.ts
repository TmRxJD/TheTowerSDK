export const MODULE_RARITIES = [
  'Common',
  'Rare',
  'Rare +',
  'Epic',
  'Epic +',
  'Legendary',
  'Legendary +',
  'Mythic',
  'Mythic +',
  'Ancestral',
  'Ancestral 1',
  'Ancestral 2',
  'Ancestral 3',
  'Ancestral 4',
  'Ancestral 5',
] as const

export type ModuleRarity = (typeof MODULE_RARITIES)[number]

export const moduleRarityItems = Array.from(MODULE_RARITIES, rarity => ({ title: rarity, value: rarity }))

export const MODULE_RARITY_LEVEL_CAPS: Record<ModuleRarity, number> = {
  Common: 20,
  Rare: 30,
  'Rare +': 40,
  Epic: 60,
  'Epic +': 80,
  Legendary: 100,
  'Legendary +': 120,
  Mythic: 140,
  'Mythic +': 160,
  Ancestral: 200,
  'Ancestral 1': 220,
  'Ancestral 2': 240,
  'Ancestral 3': 260,
  'Ancestral 4': 280,
  'Ancestral 5': 300,
}

export const ABSOLUTE_MAX_MODULE_LEVEL = Math.max(...Object.values(MODULE_RARITY_LEVEL_CAPS))

function normalizeKey(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\u2606/g, '★')
    .replace(/\*/g, '★')
    .replace(/-★/g, '★')
    .replace(/\bstar\b/gi, '★')
    .replace(/\s*\+\s*/g, ' + ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const RARITY_ALIAS_MAP: Map<string, ModuleRarity> = new Map()
for (const rarity of MODULE_RARITIES) {
  RARITY_ALIAS_MAP.set(normalizeKey(rarity), rarity)
}

export function resolveRarityLabel(rarity: string | null | undefined): ModuleRarity | null {
  if (typeof rarity !== 'string') return null
  const key = normalizeKey(rarity)
  if (!key) return null
  return RARITY_ALIAS_MAP.get(key) || null
}

export function getLevelCapForRarity(rarity: string | null | undefined): number {
  const resolved = resolveRarityLabel(rarity)
  return resolved ? MODULE_RARITY_LEVEL_CAPS[resolved] : ABSOLUTE_MAX_MODULE_LEVEL
}

export function buildLevelOptions(cap: number, min = 1): number[] {
  const upper = Math.max(min, Math.floor(Number.isFinite(cap) ? Number(cap) : 0))
  const length = Math.max(0, upper - min + 1)
  return Array.from({ length }, (_, index) => min + index)
}

export function clampLevelToRarity(level: unknown, rarity: string | null | undefined, min = 1): number {
  const cap = getLevelCapForRarity(rarity)
  const numeric = Math.floor(Number(level) || 0)
  return Math.max(min, Math.min(cap, numeric))
}
