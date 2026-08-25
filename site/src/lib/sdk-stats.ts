import {
	ALL_PERKS,
	BOT_UPGRADES_DATA,
	CARD_TEMPLATES,
	GLOSSARY_NAMES,
	LAB_CATALOG,
	MILESTONE_REWARD_ROWS,
	MODULE_SUBSTATS_CLUSTER,
	MODULE_TEMPLATES,
	RELIC_TEMPLATES,
	TIER_BATTLE_CONDITION_DEFINITIONS,
	VAULT_HARMONY_IMPORT_CATALOG,
	VAULT_POWER_IMPORT_CATALOG,
	buildGuardianDefinitions,
	getWorkshopEnhancementDefinitions,
	getWorkshopStatDefinitions,
	uwStoneChartData
} from 'thetowersdk/data';
import * as mechanics from 'thetowersdk/mechanics';

function countUwStats(): number {
	return Object.values(uwStoneChartData).reduce(
		(sum, weapon) => sum + (weapon.stats?.length ?? 0),
		0
	);
}

function countBotStats(): number {
	return BOT_UPGRADES_DATA.reduce((sum, bot) => {
		const main = Object.keys(bot.stats ?? {}).length;
		const plus = Object.keys(bot.plus?.stats ?? {}).length;
		return sum + main + plus;
	}, 0);
}

function countLabLevels(): number {
	return LAB_CATALOG.reduce((sum, lab) => sum + lab.levels.length, 0);
}

function countGuardianChipStats(): number {
	return buildGuardianDefinitions().reduce(
		(sum, guardian) => sum + Object.keys(guardian.stats ?? {}).length,
		0
	);
}

/** Callable exports from `thetowersdk/mechanics` (ready-to-use formulas). */
function countMechanicsFormulas(): number {
	return Object.values(mechanics).filter((value) => typeof value === 'function').length;
}

/** A value that can be plotted on an axis — number, or a number wearing a unit. */
function isPlottable(value: unknown): boolean {
	if (typeof value === 'number') return Number.isFinite(value);
	if (typeof value !== 'string') return false;
	// "x8.0", "50%", "38:53:00" — a leading number is enough to plot against level.
	return /^[x×]?\s*-?\d/.test(value.trim());
}

/** Keys that identify a row rather than measure anything. */
const AXIS_KEYS = new Set(['level', 'name', 'key', 'label', 'id', 'category']);

/**
 * How many distinct series a single level-progression yields.
 *
 * A lab's `levels[]` carries both `cost` and `duration`, and those are two
 * different charts, not one. A bot stat's levels are bare scalars, so one.
 * Counting the shape rather than hardcoding a multiplier means this tracks the
 * data if a field is added, instead of quietly under-reporting.
 */
function seriesInProgression(levels: unknown): number {
	const rows = Array.isArray(levels)
		? levels
		: levels && typeof levels === 'object'
			? Object.values(levels as Record<string, unknown>)
			: [];

	const sample = rows[0];
	if (sample === undefined) return 0;
	if (typeof sample !== 'object' || sample === null) return isPlottable(sample) ? 1 : 0;

	/*
	 * Union the plottable keys across several rows rather than trusting the
	 * first. Ultimate weapon stats read `cost: "Unlock"` at level 0 and a real
	 * number from level 1 on — sampling only row 0 silently dropped the entire
	 * cost curve for every UW stat in the package.
	 */
	const plottable = new Set<string>();
	for (const row of rows.slice(0, 8)) {
		if (typeof row !== 'object' || row === null) continue;
		for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
			if (!AXIS_KEYS.has(key) && isPlottable(value)) plottable.add(key);
		}
	}
	return plottable.size;
}

/**
 * Every chart the shipped game data can produce, not the handful anyone has
 * hand-authored. One chart = one measurable field plotted across a level range.
 *
 * Deliberately excludes catalogs with no progression to plot: relics carry a
 * single flat `value`, module substats are cluster metadata, vault nodes are
 * id/name pairs, and workshop enhancements declare only a level *range* with no
 * per-level values. Counting those would have added several hundred charts that
 * cannot be drawn.
 */
export function countChartableSeries(): number {
	let total = 0;

	for (const lab of LAB_CATALOG) total += seriesInProgression(lab.levels);
	for (const stat of getWorkshopStatDefinitions()) total += seriesInProgression(stat.levels);

	for (const card of CARD_TEMPLATES) {
		if (card.levelValues?.length) total += 1;
		if (card.masteryValues?.length) total += 1;
	}

	for (const weapon of Object.values(uwStoneChartData)) {
		for (const stat of weapon.stats ?? []) total += seriesInProgression(stat.levels);
	}

	for (const bot of BOT_UPGRADES_DATA) {
		for (const stat of Object.values(bot.stats ?? {})) total += seriesInProgression(stat?.levels);
		for (const stat of Object.values(bot.plus?.stats ?? {}))
			total += seriesInProgression(stat?.levels);
	}

	for (const guardian of buildGuardianDefinitions()) {
		for (const stat of Object.values(guardian.stats ?? {}))
			total += seriesInProgression(stat?.levels);
	}

	return total;
}

/** Counts from the installed package — prefer leaf data over parent totals. */
export const sdkStats = {
	labs: LAB_CATALOG.length,
	labLevels: countLabLevels(),
	workshopStats: getWorkshopStatDefinitions().length,
	workshopEnhancements: getWorkshopEnhancementDefinitions().length,
	modules: MODULE_TEMPLATES.length,
	moduleSubstats: MODULE_SUBSTATS_CLUSTER.length,
	cards: CARD_TEMPLATES.length,
	relics: RELIC_TEMPLATES.length,
	bots: BOT_UPGRADES_DATA.length,
	botStats: countBotStats(),
	guardianChipStats: countGuardianChipStats(),
	vaultNodes: VAULT_HARMONY_IMPORT_CATALOG.length + VAULT_POWER_IMPORT_CATALOG.length,
	ultimateWeapons: Object.keys(uwStoneChartData).length,
	uwStats: countUwStats(),
	perks: ALL_PERKS.length,
	battleConditions: TIER_BATTLE_CONDITION_DEFINITIONS.length,
	milestoneRewards: MILESTONE_REWARD_ROWS.length,
	glossaryNames: GLOSSARY_NAMES.length,
	formulas: countMechanicsFormulas(),
	chartableSeries: countChartableSeries()
} as const;

/** Granular package contents for the home page — leaf counts, “X Stats” labels. */
export const packageContents = [
	{ value: String(sdkStats.formulas), label: 'Formulas' },
	{ value: String(sdkStats.chartableSeries), label: 'Chartable series' },
	{ value: String(sdkStats.labLevels), label: 'Lab Stats' },
	{ value: String(sdkStats.workshopStats), label: 'Workshop Stats' },
	{ value: String(sdkStats.moduleSubstats), label: 'Module Stats' },
	{ value: String(sdkStats.cards), label: 'Cards' },
	{ value: String(sdkStats.relics), label: 'Relics' },
	{ value: String(sdkStats.botStats), label: 'Bot Stats' },
	{ value: String(sdkStats.guardianChipStats), label: 'Guardian Stats' },
	{ value: String(sdkStats.uwStats), label: 'UW Stats' },
	{ value: String(sdkStats.vaultNodes), label: 'Vault nodes' },
	{ value: String(sdkStats.perks), label: 'Perks' },
	{ value: String(sdkStats.battleConditions), label: 'Battle conditions' },
	{ value: String(sdkStats.milestoneRewards), label: 'Milestone rewards' },
	{ value: String(sdkStats.glossaryNames), label: 'Glossary terms' }
] as const;
