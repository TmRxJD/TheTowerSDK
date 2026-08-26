<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { SDK_VERSION } from '$lib/links';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Install · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Install</h1>
<p class="mt-3 text-muted">
	One package, one dependency, no configuration. It runs in Node 20 or newer and in the browser,
	needs no API key and makes no network calls — the game data is in the package. This site is built
	against <code>thetowersdk@{SDK_VERSION}</code>.
</p>

<div class="mt-6">
	<CodeBlock code="npm install thetowersdk" />
</div>

<h2 class="mt-10 text-xl font-semibold">Pinning A Version</h2>
<p class="mt-3 text-muted">
	Game numbers change when the game does. Install an exact version when you want them frozen, and
	upgrade deliberately after a patch.
</p>
<div class="mt-4">
	<CodeBlock code={`npm install thetowersdk@${SDK_VERSION} --save-exact`} />
</div>

<h2 class="mt-10 text-xl font-semibold">Your First Lines</h2>
<p class="mt-3 text-muted">Nothing to initialise — import a catalog and read it.</p>
<div class="mt-4">
	<CodeBlock
		code={`import { LAB_CATALOG } from 'thetowersdk/data'
import { formatNumberForDisplay } from 'thetowersdk/formatting'

const lab = LAB_CATALOG.find((entry) => entry.name === 'Attack Speed')
const total = lab.levels.reduce((sum, level) => sum + level.cost, 0)

console.log(lab.levels.length, 'levels')
console.log(formatNumberForDisplay(total), 'coins to max')`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">The Entry Points</h2>
<p class="mt-3 text-muted">
	Fourteen entry points, imported by name. Nothing is bundled that you do not import, so a tool that
	only needs catalogs does not carry the save reader.
</p>
<div class="mt-6 overflow-x-auto rounded-lg border border-line/70">
	<table class="w-full min-w-[36rem] text-left text-sm">
		<thead class="border-b border-line/70 text-xs tracking-wide text-muted uppercase">
			<tr>
				<th class="px-4 py-2 font-medium">Import</th>
				<th class="px-4 py-2 font-medium">What it holds</th>
			</tr>
		</thead>
		<tbody class="[&_td]:px-4 [&_td]:py-2 [&_tr]:border-b [&_tr]:border-line/50">
			<tr>
				<td><code>thetowersdk/data</code></td>
				<td class="text-muted">
					Every catalog — labs, workshop, modules, cards, relics, bots, guardians, ultimate weapons,
					vault, perks, tiers, milestones. <a href={href('/docs/data/')}>Docs</a>
				</td>
			</tr>
			<tr>
				<td><code>thetowersdk/mechanics</code></td>
				<td class="text-muted">
					822 formulas — enemy scaling, timing, costs, damage reduction, Effective Paths.
					<a href={href('/docs/mechanics/')}>Docs</a>
				</td>
			</tr>
			<tr>
				<td><code>thetowersdk/builders</code></td>
				<td class="text-muted">
					Fifteen calculators that describe their own inputs.
					<a href={href('/docs/builders/')}>Docs</a>
				</td>
			</tr>
			<tr>
				<td><code>thetowersdk/save</code></td>
				<td class="text-muted">
					Extractors over a decoded save — runs, labs, cards, modules, bots, vault.
					<a href={href('/docs/save/')}>Docs</a>
				</td>
			</tr>
			<tr>
				<td><code>thetowersdk/node</code></td>
				<td class="text-muted">
					Decoding <code>playerInfo.dat</code> bytes. Node only.
					<a href={href('/docs/save/')}>Docs</a>
				</td>
			</tr>
			<tr>
				<td><code>thetowersdk/save-decoder</code></td>
				<td class="text-muted">
					The same save reader with no Node imports, for decoding in a browser tab.
					<a href={href('/docs/save/')}>Docs</a>
				</td>
			</tr>
			<tr>
				<td><code>thetowersdk/contributions</code></td>
				<td class="text-muted">
					The roster of whose work this package carries, as data you can render.
					<a href={href('/contributions/')}>Docs</a>
				</td>
			</tr>
			<tr>
				<td><code>thetowersdk/charts</code></td>
				<td class="text-muted">
					Forty-six chart datasets, each a finished table. <a href={href('/docs/charts/')}>Docs</a>
				</td>
			</tr>
			<tr>
				<td><code>thetowersdk/knowledge</code></td>
				<td class="text-muted">
					The mechanics graph and five years of patch notes.
					<a href={href('/docs/knowledge/')}>Docs</a>
				</td>
			</tr>
			<tr>
				<td><code>thetowersdk/wiki</code></td>
				<td class="text-muted">
					Community wiki pages as Markdown. <a href={href('/docs/wiki/')}>Docs</a>
				</td>
			</tr>
			<tr>
				<td><code>thetowersdk/sheets</code></td>
				<td class="text-muted">
					Google Sheets reading and writing, A1 helpers.
					<a href={href('/docs/sheets/')}>Docs</a>
				</td>
			</tr>
			<tr>
				<td><code>thetowersdk/bot</code></td>
				<td class="text-muted">
					Every calculator as a chat command. <a href={href('/docs/bots/')}>Docs</a>
				</td>
			</tr>
			<tr>
				<td><code>thetowersdk/formatting</code></td>
				<td class="text-muted">
					Numbers, durations, multipliers and rates in the game's own notation — read and written. <a
						href={href('/docs/formatting/')}>Docs</a
					>
				</td>
			</tr>
			<tr>
				<td><code>thetowersdk/assets</code></td>
				<td class="text-muted">
					Naming rules for artwork you supply yourself, so a tool can find a file in a directory of
					art you already have.
				</td>
			</tr>
		</tbody>
	</table>
</div>

<h2 class="mt-10 text-xl font-semibold">TypeScript</h2>
<p class="mt-3 text-muted">
	Types ship with the package, so there is no <code>@types</code> to add. Every catalog and every result
	is typed, which means your editor can list a mechanic's stats without you opening the docs.
</p>
<div class="mt-4">
	<CodeBlock
		code={`import type { PatchNote } from 'thetowersdk/knowledge'

// Autocomplete knows the fields, and a typo is a compile error.
function summarise(note: PatchNote) {
  return \`\${note.postedAt.slice(0, 10)} \${note.version ?? '—'} \${note.title}\`
}`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">In The Browser</h2>
<p class="mt-3 text-muted">
	Everything except <code>thetowersdk/node</code> runs in a browser bundle. The package is marked
	side-effect free, so a bundler drops what you do not use — import the one catalog you need rather
	than the whole of <code>data</code> if size matters.
</p>
<div class="mt-4">
	<CodeBlock
		code={`// Reading a save in the browser: decode the bytes from a file input,
// then use the same extractors.
import { listImportableBattleRuns } from 'thetowersdk/save'`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">What Else You Might Add</h2>
<p class="mt-3 text-muted">None of these are required. The SDK works on its own.</p>
<ul class="mt-4 list-disc space-y-2 pl-5 text-muted">
	<li>
		<strong>The MCP server</strong> already ships inside the package — register it and your editor's
		assistant can query the catalogs while it writes.
		<a href={href('/docs/mcp/')}>MCP docs</a>
	</li>
	<li>
		<strong><code>towerai</code></strong> if you want an assistant of your own, plus a model key.
		<a href={href('/docs/towerai/')}>TowerAI docs</a>
	</li>
	<li>
		<strong><code>adb-bridge</code></strong> if your tool reads saves from a phone or emulator. Your
		users run it; it is not a dependency of your project.
		<a href={href('/docs/save/')}>Save docs</a>
	</li>
</ul>

<p class="mt-8 text-sm">
	<a href={href('/start/')}>Guided Get Started →</a>
	·
	<a href={href('/docs/data/')}>Game Data →</a>
	·
	<a href={href('/playground/')}>Runnable Examples →</a>
</p>
