import type { PerkPoolKey } from '../../data/perks'

export interface PerkCatalogRow {
  index: number
  name: string
  pool: PerkPoolKey
  maxLevel: number
}

/** Active perk catalog indices grouped by pool (gaps 15–19 and 29–39 are unused). */
export const PERK_STANDARD_INDICES = Array.from({ length: 15 }, (_, index) => index) as readonly number[]
export const PERK_UW_INDICES = Array.from({ length: 9 }, (_, offset) => 20 + offset) as readonly number[]
export const PERK_TRADE_OFF_INDICES = Array.from({ length: 10 }, (_, offset) => 40 + offset) as readonly number[]
export const PERK_CATALOG_SIZE = 50

/**
 * Save `bannedPerksIndex` / `firstPerkIndex` / `autoPickOrder` catalog.
 * Covers the standard, ultimate-weapon and trade-off perk pools. Trade-off perks
 * occupy `perkLevel` slots 40–48.
 */
export const PERK_IMPORT_CATALOG: readonly PerkCatalogRow[] = [
  { index: 0, pool: 'standard', name: 'x1.20 Max Health', maxLevel: 5 },
  { index: 1, pool: 'standard', name: 'x1.15 Damage', maxLevel: 5 },
  { index: 2, pool: 'standard', name: 'x1.15 All Coin Bonuses', maxLevel: 5 },
  { index: 3, pool: 'standard', name: 'Perk Wave Requirement -20.00%', maxLevel: 3 },
  { index: 4, pool: 'standard', name: 'x1.15 Cash Bonus', maxLevel: 5 },
  { index: 5, pool: 'standard', name: 'Interest x1.50', maxLevel: 5 },
  { index: 6, pool: 'standard', name: 'x1.75 Health Regen', maxLevel: 5 },
  { index: 7, pool: 'standard', name: 'Land Mine Damage x3.50', maxLevel: 5 },
  { index: 8, pool: 'standard', name: 'x1.15 Defense Absolute', maxLevel: 5 },
  { index: 9, pool: 'standard', name: 'Defense Percent +4.00', maxLevel: 5 },
  { index: 10, pool: 'standard', name: 'Free Upgrade Chance for All +5.0%', maxLevel: 5 },
  { index: 11, pool: 'standard', name: 'Bounce Shot +2', maxLevel: 3 },
  { index: 12, pool: 'standard', name: 'Orbs +1', maxLevel: 2 },
  { index: 13, pool: 'standard', name: 'Unlock a Random Ultimate Weapon', maxLevel: 1 },
  { index: 14, pool: 'standard', name: 'Increase Max Game Speed by +1.00', maxLevel: 1 },
  { index: 20, pool: 'ultimate_weapon', name: '4 More Smart Missiles', maxLevel: 1 },
  { index: 21, pool: 'ultimate_weapon', name: 'Swamp Radius x1.5', maxLevel: 1 },
  { index: 22, pool: 'ultimate_weapon', name: '+1 Wave on Death Wave', maxLevel: 1 },
  { index: 23, pool: 'ultimate_weapon', name: 'Extra Set of Inner Mines', maxLevel: 1 },
  { index: 24, pool: 'ultimate_weapon', name: 'Golden Tower Bonus x1.5', maxLevel: 1 },
  { index: 25, pool: 'ultimate_weapon', name: 'Chain Lightning Damage x2', maxLevel: 1 },
  { index: 26, pool: 'ultimate_weapon', name: 'Chrono Field Duration +5s', maxLevel: 1 },
  { index: 27, pool: 'ultimate_weapon', name: 'Black Hole Duration +12.0s', maxLevel: 1 },
  { index: 28, pool: 'ultimate_weapon', name: 'Spotlight Damage Bonus x1.5', maxLevel: 1 },
  { index: 40, pool: 'trade_off', name: 'Boss Health -70%, but Boss Speed +50%', maxLevel: 1 },
  { index: 41, pool: 'trade_off', name: 'Lifesteal x2.50, but Knockback Force -70%', maxLevel: 1 },
  { index: 42, pool: 'trade_off', name: 'Enemies Have -50% Health, but Tower Health Regen and Lifesteal -90%', maxLevel: 1 },
  { index: 43, pool: 'trade_off', name: 'Enemies Damage -50%, but Tower Damage -50%', maxLevel: 1 },
  { index: 44, pool: 'trade_off', name: 'Ranged Enemies Attack Distance Reduced, but Tower Ranged Enemies Damage x3', maxLevel: 1 },
  { index: 45, pool: 'trade_off', name: 'Enemies Speed -40%, but Enemies Damage x2.5', maxLevel: 1 },
  { index: 46, pool: 'trade_off', name: 'x12.00 Cash Per Wave, but Enemy Kills Don\'t Give Cash', maxLevel: 1 },
  { index: 47, pool: 'trade_off', name: 'Tower Health Regen x8.00, but Tower Max Health -60%', maxLevel: 1 },
  { index: 48, pool: 'trade_off', name: 'x1.50 Tower Damage, but Bosses Have 8x Health', maxLevel: 1 },
  { index: 49, pool: 'trade_off', name: 'x1.80 Coins, but Tower Max Health -70%', maxLevel: 1 },
] as const

const catalogByIndex = new Map(PERK_IMPORT_CATALOG.map(row => [row.index, row]))
const catalogByName = new Map(PERK_IMPORT_CATALOG.map(row => [row.name, row.index]))

export function listPerkCatalogRows(): readonly PerkCatalogRow[] {
  return PERK_IMPORT_CATALOG
}

export function listActivePerkIndices(): number[] {
  return [
    ...PERK_STANDARD_INDICES,
    ...PERK_UW_INDICES,
    ...PERK_TRADE_OFF_INDICES,
  ]
}

export function findPerkCatalogRow(index: number): PerkCatalogRow | null {
  return catalogByIndex.get(index) ?? null
}

export function findPerkNameByIndex(index: number): string | null {
  return catalogByIndex.get(index)?.name ?? null
}

export function findPerkIndexByName(name: string): number | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  const index = catalogByName.get(trimmed)
  return index === undefined ? null : index
}
