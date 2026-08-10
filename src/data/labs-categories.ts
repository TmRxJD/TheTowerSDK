import {
  findLabResearchBySlug,
  LAB_RESEARCH_SLUG_TO_INDEX,
  type LabResearchRecord,
} from './labs-research'
import { generatedLabs } from './labs-levels'
import { normalizeToolLabCategory } from './labs'

export const SITE_LAB_SLUG_ALIASES: Readonly<Record<string, string>> = {
  gold_bot_cooldown: 'golden_bot_cooldown',
  gold_bot_duration: 'golden_bot_duration',
  missile_despawn_time: 'missiles_despawn_time',
  missile_radius: 'missiles_radius',
  coins_per_wave: 'coins_wave',
  common_enemy_attack: 'basic_enemy_attack',
  common_enemy_health: 'basic_enemy_health',
  module_shards_cost: 'module_shard_cost',
  orb_boss_hit: 'orbs_boss_hit',
  super_crit_multi: 'super_crit_mult',
  swamp_rend: 'swamp_rend_basic_enemies',
  scatter_amp: 'lightning_amplifier_scatter',
  chain_lightning_shock_chance: 'shock_chance',
  chain_lightning_shock_multiplier: 'shock_multiplier',
  // `amp_bot_*` is shorthand the site used for Amplify Bot; it is not a slug in
  // the research catalog, so mapping it across is right.
  amp_bot_cooldown: 'amplify_bot_cooldown',
  amp_bot_duration: 'amplify_bot_duration',
  // `bot_bot_*` is NOT shorthand. Bot Bot and Amplify Bot are separate bots with
  // separate labs -- the catalog carries "Bot Bot - Cooldown" and "Amplify Bot -
  // Cooldown" as distinct records. Aliasing them made Bot Bot read Amplify Bot's
  // research levels, so do not add that back.
}

const SPECIAL_SITE_LAB_LABELS: Readonly<Record<string, string>> = {
  labs_speed: 'Lab Speed',
  labs_coin_discount: 'Lab Coin Discount',
}

function slugToDisplayLabel(slug: string): string {
  const special = SPECIAL_SITE_LAB_LABELS[slug]
  if (special) return special
  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

function resolveCanonicalSiteSlug(siteSlug: string): string {
  return SITE_LAB_SLUG_ALIASES[siteSlug] ?? siteSlug
}

function lookupResearch(slug: string): LabResearchRecord | undefined {
  const canonical = resolveCanonicalSiteSlug(slug)
  return findLabResearchBySlug(canonical) ?? findLabResearchBySlug(slug)
}

function buildSaveIndexToSiteSlug(): ReadonlyMap<number, string> {
  const byIndex = new Map<number, string>()
  for (const [siteSlug, saveSlug] of Object.entries(SITE_LAB_SLUG_ALIASES)) {
    const index = LAB_RESEARCH_SLUG_TO_INDEX[saveSlug]
    if (index !== undefined) byIndex.set(index, siteSlug)
  }
  for (const [slug, index] of Object.entries(LAB_RESEARCH_SLUG_TO_INDEX)) {
    if (!byIndex.has(index)) byIndex.set(index, slug)
  }
  return byIndex
}

const SAVE_INDEX_TO_SITE_SLUG = buildSaveIndexToSiteSlug()

const SITE_LAB_CATEGORY_BY_SLUG = new Map(
  generatedLabs
    .filter(lab => lab.type)
    .map(lab => [lab.name, normalizeToolLabCategory(lab.type)]),
)

export function resolveSiteLabCategoryForSaveIndex(saveIndex: number): string | null {
  const siteSlug = SAVE_INDEX_TO_SITE_SLUG.get(saveIndex)
  if (!siteSlug) return null
  const canonical = resolveCanonicalSiteSlug(siteSlug)
  return SITE_LAB_CATEGORY_BY_SLUG.get(canonical)
    ?? SITE_LAB_CATEGORY_BY_SLUG.get(siteSlug)
    ?? null
}

export function resolveSiteLabSlugForSaveIndex(saveIndex: number): string | null {
  return SAVE_INDEX_TO_SITE_SLUG.get(saveIndex) ?? null
}

export function resolveSiteLabDisplayNameForSaveIndex(saveIndex: number): string | null {
  const siteSlug = SAVE_INDEX_TO_SITE_SLUG.get(saveIndex)
  if (!siteSlug) return null
  const research = lookupResearch(siteSlug)
  if (research?.displayName) return research.displayName
  return slugToDisplayLabel(siteSlug)
}

export function resolveSiteLabSlugFromApiName(apiSlug: string): { saveIndex: number; saveSlug: string } | null {
  const canonical = resolveCanonicalSiteSlug(apiSlug)
  const index = LAB_RESEARCH_SLUG_TO_INDEX[canonical]
  if (index === undefined) return null
  return { saveIndex: index, saveSlug: canonical }
}
