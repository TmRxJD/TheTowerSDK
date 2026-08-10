import { describe, expect, it } from 'vitest'
import { SITE_LAB_SLUG_ALIASES } from './labs-categories'
import { generatedLabs } from './labs-levels'
import { LAB_RESEARCH_BY_INDEX } from './labs-research'
import { labs as staticLabs } from './labs-static'

/**
 * Every lab in the research catalog needs a level table somewhere, or the
 * tracker renders it with a real level and cap but 0 for every time, gem and
 * coin column -- which reads as "this lab is free".
 *
 * The tables are spread across three sources and keyed inconsistently: the
 * generated tables use slugs (some of them the site's older names), the static
 * tables use display names with punctuation. This checks coverage across all of
 * them so a lab cannot silently lose its costs again.
 */

/** Ignores case, separators and punctuation: `a_b_c` and "A B - C" are the same lab. */
const matchKey = (value: string): string => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '')

const catalogSlugs = [...new Set(
  LAB_RESEARCH_BY_INDEX.map(record => record.slug).filter((slug): slug is string => Boolean(slug)),
)]

const tableKeys = new Set([
  ...generatedLabs.filter(lab => lab.levels?.length).map(lab => matchKey(lab.name)),
  ...staticLabs.filter(lab => lab.levels?.length).map(lab => matchKey(lab.name)),
])

const aliasByCanonical = new Map(
  Object.entries(SITE_LAB_SLUG_ALIASES).map(([site, canonical]) => [canonical, site]),
)

function hasLevelTable(slug: string): boolean {
  if (tableKeys.has(matchKey(slug))) return true
  const alias = aliasByCanonical.get(slug)
  return alias ? tableKeys.has(matchKey(alias)) : false
}

/**
 * Labs with no cost data in any source. These are an extraction gap, not a
 * lookup bug -- nothing can compute their times until the data is generated.
 * Shrinking this list is the goal; growing it silently is the regression.
 */
const KNOWN_MISSING_LEVEL_TABLES = [
  'armor_stats',
  'berserker_mastery',
  'black_hole_ignore_protector',
  'cannon_stats',
  'core_stats',
  'first_trade_off_choice',
  'generator_stats',
  'ray_enemy_health',
  'recovery_package_mastery',
  'scatter_enemy_health',
  'vampire_enemy_health',
  'wave_skip_mastery',
]

describe('lab catalog coverage', () => {
  it('finds a level table for every lab except the known extraction gap', () => {
    const missing = catalogSlugs.filter(slug => !hasLevelTable(slug)).sort()
    expect(missing).toEqual([...KNOWN_MISSING_LEVEL_TABLES].sort())
  })

  it('matches punctuation-insensitively, which is what the static tables need', () => {
    // "Assist Module Bonus - Armor" against assist_module_bonus_armor. The dash
    // is why 61 labs looked like they had no cost data.
    expect(matchKey('Assist Module Bonus - Armor')).toBe(matchKey('assist_module_bonus_armor'))
    expect(hasLevelTable('assist_module_bonus_armor')).toBe(true)
    expect(hasLevelTable('enhancement_attack_coin_discount')).toBe(true)
    expect(hasLevelTable('dissonant_echo_defense')).toBe(true)
  })

  it('resolves labs whose generated table uses the older site name', () => {
    // coins_wave's 99 levels are stored as coins_per_wave.
    expect(hasLevelTable('coins_wave')).toBe(true)
    expect(hasLevelTable('basic_enemy_health')).toBe(true)
    expect(hasLevelTable('super_crit_mult')).toBe(true)
  })

  it('keeps the missing list honest about its size', () => {
    // A guard against quietly adding entries instead of adding data.
    expect(KNOWN_MISSING_LEVEL_TABLES.length).toBeLessThanOrEqual(12)
  })
})
