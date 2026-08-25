export const nav = [
	{ href: '/start/', label: 'Get Started' },
	{ href: '/tools/', label: 'What You Can Build' },
	{ href: '/playground/', label: 'Examples' },
	{ href: '/docs/', label: 'Docs' },
	{ href: '/ai/', label: 'AI & ACS' }
] as const;

export const docsNav = [
	{ href: '/docs/', label: 'Overview' },
	{ href: '/docs/install/', label: 'Install' },
	{ href: '/docs/data/', label: 'Game Data' },
	{ href: '/docs/save/', label: 'Save Files' },
	{ href: '/docs/mechanics/', label: 'Formulas' },
	{ href: '/docs/charts/', label: 'Charts' },
	{ href: '/docs/bots/', label: 'Bots' },
	{ href: '/docs/wiki/', label: 'Wiki' },
	{ href: '/docs/mcp/', label: 'MCP & AI' },
	{ href: '/docs/towerai/', label: 'TowerAI' },
	{ href: '/docs/ags/', label: 'ACS' },
	{ href: '/docs/license/', label: 'Licensing' }
] as const;

/** Package capabilities — community-facing. */
export const features = [
	{
		title: 'Complete Game Catalogs',
		body: 'Labs, workshop, enhancements, modules, cards, relics, bots, guardians, ultimate weapons, vault trees, perks, battle conditions, tiers, and milestones — ready to query in code.'
	},
	{
		title: 'Player Save Reading',
		body: 'Decode playerInfo.dat and pull labs, modules, cards, ultimate weapons, and run history from a real account. adb-bridge fetches the file from a phone or emulator.'
	},
	{
		title: 'Charts And Cost Tables',
		body: 'Every catalog with a level progression generates a chart or a table — cost curves, research time, stat scaling. Add rows to the data and every view regenerates.'
	},
	{
		title: 'Spreadsheet And Bot Tooling',
		body: 'Read live community spreadsheets cell by cell through MCP, and share one calculation layer between a website and a Discord bot so both return the same numbers.'
	},
	{
		title: 'AI Development',
		body: 'An MCP server, a game-knowledge oracle, and a sheet oracle, so an assistant builds against real exports, real mechanics, and real player saves.'
	},
	{
		title: 'Combat And Economy Math',
		body: 'Enemy scaling, ultimate weapon timing, lab costs, workshop costs, Effective Paths planners, and more — callable formulas, not cumbersome spreadsheets.'
	},
	{
		title: 'Wiki Ingestion',
		body: 'Pull The Tower wiki into Markdown inside your app or AI session so mechanics are looked up, not guessed.'
	}
] as const;

/**
 * Home-page examples (live + code). Order matters — index matches demos on +page.
 */
export const homeExamples = [
	{
		title: 'Lab Costs',
		blurb: 'Coins and research time for the next levels.',
		code: `import { LAB_CATALOG } from 'thetowersdk/data'
import { formatNumberForDisplay } from 'thetowersdk/formatting'

// Find the lab by its display name
const lab = LAB_CATALOG.find((l) => l.name === 'Attack Speed')

// Levels are 0-based in the array; level 10 → index 10
const from = 10
const steps = 10
const next = lab.levels.slice(from, from + steps)

// Each level has a coin cost
const coins = next.reduce((sum, level) => sum + level.cost, 0)

// Format like the game (1.1q, 2.3s, …)
console.log(formatNumberForDisplay(coins))`
	},
	{
		title: 'Death Wave × Golden Bot',
		blurb:
			'DW duration comes from Quantity × 4s per wave; results match the Uptime Calculator columns.',
		code: `import { BOT_UPGRADES_DATA, estimateBotUptimeFraction, uwStoneChartData } from 'thetowersdk/data'

const dw = Object.values(uwStoneChartData).find((w) => w.name === 'Death Wave')
const dwCd = Number(String(dw.stats.find((s) => s.name === 'Cooldown').levels[8].value).replace(/s$/i, ''))
const dwWaves = Number(String(dw.stats.find((s) => s.name === 'Quantity').levels[3].value).replace(/^x/i, ''))
const dwDur = dwWaves * 4 // Uptime Calculator wave time

const gb = BOT_UPGRADES_DATA.find((b) => b.name === 'Golden Bot')
const gbCd = gb.stats.Cooldown.levels['10']
const gbDur = gb.stats.Duration.levels['10']
const gbUptime = estimateBotUptimeFraction(gbDur, gbCd)

console.log({ dwCd, dwDur, gbCd, gbDur, gbUptime })`
	},
	{
		title: 'Enemy Stats',
		blurb: 'Base health and damage for a farm tier or tournament league base.',
		code: `import {
  computeWaveBaseHealth,
  computeWaveBaseDamage,
} from 'thetowersdk/mechanics'
import { formatNumberForDisplay } from 'thetowersdk/formatting'

// Farm tier 10, or tournament Copper as tier 1 + tournament:true
const hp = computeWaveBaseHealth({ tier: 10, wave: 4500, tournament: false })
const dmg = computeWaveBaseDamage({ tier: 10, wave: 4500, tournament: false })

console.log(formatNumberForDisplay(hp))
console.log(formatNumberForDisplay(dmg))`
	},
	{
		title: 'Read A Save',
		blurb: 'Sample extractor shapes from a decoded playerInfo.dat (decode runs in Node).',
		code: `import { readFile } from 'node:fs/promises'
import { decodePlayerInfoSaveBytes } from 'thetowersdk/node'
import {
  readLabsFromSaveRoot,
  readModulesFromSaveRoot,
  readCardsFromSaveRoot,
  readUltimateWeaponsFromSaveRoot,
  readBotsFromSaveRoot,
  readVaultFromSaveRoot,
} from 'thetowersdk/save'

const { parsedRoot } = decodePlayerInfoSaveBytes(
  await readFile('playerInfo.dat')
)

const labs = readLabsFromSaveRoot(parsedRoot)
const modules = readModulesFromSaveRoot(parsedRoot)
const cards = readCardsFromSaveRoot(parsedRoot)
const uws = readUltimateWeaponsFromSaveRoot(parsedRoot)
const bots = readBotsFromSaveRoot(parsedRoot)
const vault = readVaultFromSaveRoot(parsedRoot)`
	}
] as const;

/** Turn stored battle reports into tracker rows. */
export const runTrackerSnippet = `import { listImportableBattleRuns } from 'thetowersdk/save'
import { formatNumberForDisplay } from 'thetowersdk/formatting'

// Every run the game kept, as it stored them.
const runs = listImportableBattleRuns(parsedRoot)

const rows = runs.map((run) => ({
  tier: run.tier,
  wave: run.wave,
  duration: run.durationSeconds,
  coins: run.coinsEarned,
  at: run.dateTime,
}))

// The number the table exists to produce.
const seconds = rows.reduce((sum, r) => sum + r.duration, 0)
const coins = rows.reduce((sum, r) => sum + r.coins, 0)
console.log(formatNumberForDisplay((coins / seconds) * 3600), 'coins/hour')`;

/** A cost table generated from a level progression. */
export const chartSnippet = `import { uwStoneChartData } from 'thetowersdk/data'
import { formatNumberForDisplay } from 'thetowersdk/formatting'

const gt = Object.values(uwStoneChartData).find((w) => w.name === 'Golden Tower')
const multiplier = gt.stats.find((s) => s.name === 'Multiplier')

// Level, value, cost, running total — the table players actually want.
let running = 0
const rows = multiplier.levels.map((l) => {
  if (typeof l.cost === 'number') running += l.cost
  return [l.level, l.value, l.cost, formatNumberForDisplay(running)]
})`;

/** The same data plotted instead of tabulated. */
export const chartCompareSnippet = `import { uwStoneChartData } from 'thetowersdk/data'

// One series per ultimate weapon: stone cost to reach each cooldown level.
const datasets = Object.values(uwStoneChartData).map((weapon) => {
  const cooldown = weapon.stats.find((s) => s.name === 'Cooldown')
  return {
    label: weapon.name,
    data: (cooldown?.levels ?? [])
      .filter((l) => typeof l.cost === 'number')
      .map((l) => ({ x: l.level, y: l.cost })),
  }
})

// Hand the points to Chart.js, D3, Vega, or a spreadsheet.
chart.data = { datasets }`;

/** Connect to the bridge and receive a save as the player plays. */
export const adbBridgeSnippet = `// Terminal: npx adb-bridge
// Browser: connect and receive the save, then again on every write.
const socket = new WebSocket('ws://127.0.0.1:8787')

socket.onmessage = async (event) => {
  const bytes = new Uint8Array(await event.data.arrayBuffer())

  const { parsedRoot } = decodePlayerInfoSaveBytes(bytes)
  const labs = readLabsFromSaveRoot(parsedRoot)

  render(\`\${labs.researchedCount} researched, \${labs.maxedCount} maxed\`)
}

// Ask for the current save; the bridge re-sends whenever the game writes.
socket.onopen = () => socket.send(JSON.stringify({ type: 'watch', game: 'the-tower' }))`;

/** Build a spreadsheet from the catalogs. */
export const sheetBuildSnippet = `import { LAB_CATALOG } from 'thetowersdk/data'

// One row per level: what a sheet actually needs.
const rows = LAB_CATALOG.flatMap((lab) =>
  lab.levels.map((l) => [lab.name, l.level, l.cost, l.duration])
)

// Write it wherever your sheet lives — CSV, xlsx, or the Sheets API.
await sheets.spreadsheets.values.update({
  spreadsheetId,
  range: 'Labs!A2',
  valueInputOption: 'RAW',
  requestBody: { values: rows },
})`;

/** Generate formulas rather than values, so the sheet stays live. */
export const sheetFormulaSnippet = `// Write formulas, not just numbers — the sheet keeps calculating.
const formulas = LAB_CATALOG.map((lab, i) => [
  lab.name,
  \`=SUMIF(Levels!A:A,A\${i + 2},Levels!C:C)\`,   // total coins to max
  \`=B\${i + 2}/Inputs!$B$1\`,                    // hours at your coin rate
])

// Check one against the sheet before shipping it.
eval_formula({ formula: '=SUMIF(Levels!A:A,"Attack Speed",Levels!C:C)' })`;

/** Extra examples beyond the home set. */
export const moreExamples = [
	{
		title: 'Generate A Cost Table',
		blurb: 'Level, value, cost and running total, generated from the catalog.',
		code: chartSnippet
	},
	{
		title: 'Module Shard Cost',
		blurb: 'Shards to take a module from one level to the next.',
		code: `import { getModuleShardUpgradeCost } from 'thetowersdk/data'
import { formatNumberForDisplay } from 'thetowersdk/formatting'

// Cost to reach level 161 from 160
const shards = getModuleShardUpgradeCost(161)
console.log(formatNumberForDisplay(shards))`
	},
	{
		title: 'Card Gem Cost',
		blurb: 'Gems to raise a card from one level to another (copies × 20).',
		code: `import { cardLevelUpgradeGemCost } from 'thetowersdk/mechanics'
import { formatNumberForDisplay } from 'thetowersdk/formatting'

const gems = cardLevelUpgradeGemCost(0, 7)
console.log(formatNumberForDisplay(gems))`
	},
	{
		title: 'Effective Paths',
		blurb: 'Next economy buys from your starting levels, including what was skipped.',
		code: `import {
  planEffectiveEconomyPath,
  ZERO_EFFECTIVE_ECONOMY_LEVELS,
  zeroEffectiveEconomyConfig,
} from 'thetowersdk/mechanics'

const levels = {
  ...ZERO_EFFECTIVE_ECONOMY_LEVELS,
  time: {
    ...ZERO_EFFECTIVE_ECONOMY_LEVELS.time,
    coinsPerKillBonus: 20,
  },
}

const plan = planEffectiveEconomyPath({
  config: zeroEffectiveEconomyConfig(),
  levels,
  variant: 'time',
  steps: 5,
})

console.log(plan.steps.map((s) => s.name))
console.log(plan.excluded.length, 'skipped')`
	},
	{
		title: 'Glossary Lookup',
		blurb: 'Resolve Tower acronyms from the package glossary (generated + curated, no network).',
		code: `import { lookupGlossary } from 'thetowersdk/data'

const hits = lookupGlossary('CF')
console.log(hits.map((h) => h.expansion ?? h.term))`
	}
] as const;

/** @deprecated use homeExamples — kept for any stray imports */
export const codeExamples = homeExamples;

/**
 * Example tools you can build on this package.
 * Titles only — no separate type badge.
 */
export const trackerExamples = [
	{
		title: 'Labs Calculator',
		body: 'Coin and research time for the next lab levels, with discount-aware totals.'
	},
	{
		title: 'Cards Calculator',
		body: 'Gem cost to raise a card across levels — each level’s copies × 20 gems.'
	},
	{
		title: 'Workshop Calculator',
		body: 'Workshop upgrades, enhancements, and discount-aware cost curves.'
	},
	{
		title: 'Module Calculator',
		body: 'Shard and coin costs for module levels, rarities, and loadouts.'
	},
	{
		title: 'Bots Calculator',
		body: 'In-game bot upgrades, medals, and timing windows for planning.'
	},
	{
		title: 'Guardians Calculator',
		body: 'Guardian chip upgrades and related costs.'
	},
	{
		title: 'Ultimate Weapons Calculator',
		body: 'UW stone planners for cooldowns, duration, quantity, and related stats.'
	},
	{
		title: 'Uptime Calculator',
		body: 'Sync windows across ultimate weapons and in-game bots — GT, DW, Golden Bot, and more.'
	},
	{
		title: 'Effective Paths',
		body: 'Next-buy planners for health, damage, economy, and regen.'
	},
	{
		title: 'Enemy Stats & Resource Drops',
		body: 'Enemy toughness by wave and estimated drops.'
	},
	{
		title: 'Thorns & Damage Reduction',
		body: 'Combat calculators for common mid- and late-game questions.'
	},
	{
		title: 'CPH, Shard Splitter, Medal Splitter',
		body: 'Coins per hour and currency-split helpers.'
	},
	{
		title: 'Run Tracker',
		body: 'Import battle reports from a save and keep run history across tiers and waves.'
	},
	{
		title: 'Account trackers',
		body: 'Labs, cards, modules, bots, guardians, vault, relics, themes, and UW progress from the same catalogs.'
	},
	{
		title: 'Spreadsheets & charts',
		body: 'Feed the same catalogs into sheets, dashboards, or plotting — your layout, same numbers.'
	}
] as const;

export const toolKinds = trackerExamples;

/**
 * Sample tool-design asks. `result` = TheTowerSDK + ACS workflow (research before code).
 */
export const agentPrompts = [
	{
		title: 'Lab cost tool',
		prompt: `Design a lab cost tool with thetowersdk: lab picker, current level, and a table of coin cost + research time for the next 10 levels, formatted like the game.`,
		result: `1. ACS opens a labs task and records status (researching)
2. TheTowerSDK MCP loads wiki context for Labs before any UI is written
3. list_exports / get_export resolves LAB_CATALOG + game number formatters from the package
4. Only then scaffolds the picker, level input, and next-10 cost/time table
5. ACS checkpoints the slice and moves status to implementing → awaiting your review`
	},
	{
		title: 'Save reader tool',
		prompt: `Build a save reader: drop in playerInfo.dat and show labs researched/maxed plus equipped modules.`,
		result: `1. ACS opens a save-reading task (researching)
2. Wiki + package docs for playerInfo / labs / modules are pulled through MCP first
3. Exports confirmed: decodePlayerInfoSaveBytes and lab/module extractors
4. Builds upload → decode → researched/maxed + equipped modules UI on those APIs
5. ACS checkpoints; incomplete saves surface extractor warnings instead of invented fields`
	},
	{
		title: 'Economy planner tool',
		prompt: `Build an economy planner UI that runs the effective economy path for N steps and lists what was bought vs skipped (with reasons).`,
		result: `1. ACS opens an Effective Paths / economy task (researching)
2. Wiki + MCP context for Effective Paths before controls or tables exist
3. Resolves planEffectiveEconomyPath and config helpers from thetowersdk/mechanics
4. Builds step/variant controls; renders plan.steps and plan.excluded from the planner
5. ACS checkpoints each slice so the UI cannot drift into a hand-written priority list`
	},
	{
		title: 'Wiki-backed reference tool',
		prompt: `Design a small in-app reference that loads Tower wiki pages as Markdown (starting with Golden Tower) so the tool can show cooldown and related sections from the wiki.`,
		result: `1. ACS opens a wiki-ingestion task (researching)
2. Loads Golden Tower (and related titles) via wiki_page / fetchFandomPageAsMarkdown first
3. Confirms the Markdown API and section shape from that live pull
4. Then scaffolds page picker + Markdown panel wired to the same fetch path
5. ACS checkpoints so later pages reuse that path instead of hardcoded wiki text`
	}
] as const;

/** Build a TowerAI knowledge base from curated chunks plus package data. */
export const towerAiSnippet = `import {
  buildTrackerAiCanonicalKbChunks,
  validateCanonicalKbArray,
  buildCanonicalKbVersion,
} from 'towerai/kb'
import { LAB_CATALOG } from 'thetowersdk/data'

// The shipped chunks, then your own on top.
const base = buildTrackerAiCanonicalKbChunks()

const mine = LAB_CATALOG.map((lab) => ({
  chunk_id: \`lab_cost_\${lab.slug}\`,
  source: 'My Notes',
  section: 'Labs',
  topic: \`\${lab.name} cost\`,
  title: \`\${lab.name} cost\`,
  disambiguation: 'Cost to max this lab, not research order.',
  mechanics: [lab.name],
  tags: ['labs', lab.name.toLowerCase()],
  // Numbers come from the catalog, so prose cannot go stale.
  content: \`\${lab.name} has \${lab.levels.length} levels.\`,
}))

const knowledgeBase = [...base, ...mine]

// It tells you what is malformed instead of failing at query time.
validateCanonicalKbArray(knowledgeBase)
console.log(buildCanonicalKbVersion(knowledgeBase), knowledgeBase.length, 'chunks')`;

export const mcpJson = `{
  "mcpServers": {
    "thetowersdk": {
      "command": "node",
      "args": ["./node_modules/thetowersdk/mcp/server.mjs"]
    }
  }
}`;

export const installSnippet = `npm install thetowersdk`;

export const dataSnippet = `import { LAB_CATALOG } from 'thetowersdk/data'

// Sum every level's coin cost for one lab
const costToMax = (lab) =>
  lab.levels.reduce((sum, level) => sum + level.cost, 0)

// Rank labs by total coin cost
const priciest = LAB_CATALOG
  .map((lab) => ({ name: lab.name, total: costToMax(lab) }))
  .sort((a, b) => b.total - a.total)[0]`;

export const saveSnippet = `import { readFile } from 'node:fs/promises'
import { decodePlayerInfoSaveBytes } from 'thetowersdk/node'
import { readLabsFromSaveRoot } from 'thetowersdk/save'

const { parsedRoot } = decodePlayerInfoSaveBytes(
  await readFile('playerInfo.dat')
)

const labs = readLabsFromSaveRoot(parsedRoot)
if (!labs) throw new Error('no lab data in this save')
console.log(\`\${labs.researchedCount} researched, \${labs.maxedCount} maxed\`)`;

export const planSnippet = `import {
  planEffectiveDamagePath,
  ZERO_EFFECTIVE_DAMAGE_LEVELS,
  zeroEffectiveDamageConfig,
} from 'thetowersdk/mechanics'

const plan = planEffectiveDamagePath({
  config: zeroEffectiveDamageConfig(),
  levels: ZERO_EFFECTIVE_DAMAGE_LEVELS,
  variant: 'lab-time',
  steps: 10,
})

plan.steps
plan.excluded`;
