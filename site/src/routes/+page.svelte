<script lang="ts">
	import {
		adbBridgeSnippet,
		chartSnippet,
		features,
		homeExamples,
		installSnippet,
		sheetBuildSnippet,
		sheetFormulaSnippet,
		runTrackerSnippet,
		towerAiSnippet
	} from '$lib/content';
	import { LINKS } from '$lib/links';
	import { asset, href } from '$lib/paths';
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import GlassPanel from '$lib/ui/GlassPanel.svelte';
	import InstallCmd from '$lib/ui/InstallCmd.svelte';
	import LabsDemo from '$lib/demos/LabsDemo.svelte';
	import SyncUptimeDemo from '$lib/demos/SyncUptimeDemo.svelte';
	import WaveDemo from '$lib/demos/WaveDemo.svelte';
	import SaveDemo from '$lib/demos/SaveDemo.svelte';
	import CostTableDemo from '$lib/demos/CostTableDemo.svelte';
	import AskDemo from '$lib/demos/AskDemo.svelte';
	import RunTrackerDemo from '$lib/demos/RunTrackerDemo.svelte';

	let { data } = $props();

	const demos = [
		{ title: homeExamples[0].title, blurb: homeExamples[0].blurb, Demo: LabsDemo, panel: 'Live' },
		{
			title: homeExamples[1].title,
			blurb: homeExamples[1].blurb,
			Demo: SyncUptimeDemo,
			panel: 'Live'
		},
		{ title: homeExamples[2].title, blurb: homeExamples[2].blurb, Demo: WaveDemo, panel: 'Live' }
		// "Read a save" lives in the Save files section below, not here.
	] as const;

	/**
	 * Everything installable that pairs with the SDK, in the order you'd reach for it.
	 *
	 * `action` exists because the commands are not the same shape: two are
	 * libraries you add as dependencies, one registers a server that already
	 * ships in the package, and adb-bridge is a program the player runs rather
	 * than a dependency of your project.
	 */
	const installables = [
		{
			title: 'TheTowerSDK',
			role: 'Required',
			action: 'Add to your project',
			body: 'Game catalogs, save reading, formulas, charts, and wiki ingestion. Everything else here builds on it.',
			command: 'npm install thetowersdk',
			docsHref: href('/docs/install/'),
			docsLabel: 'Install Docs'
		},
		{
			title: 'TowerAI',
			role: 'Optional',
			action: 'Add to your project',
			body: 'The assistant core. Fill its knowledge base with curated mechanics and answer from your own curation.',
			command: 'npm install towerai',
			docsHref: href('/docs/towerai/'),
			docsLabel: 'TowerAI Docs'
		},
		{
			title: 'MCP Server',
			role: 'Ships with the SDK',
			action: 'Register once',
			body: 'Already inside the package — nothing extra to install. Register it and your assistant queries real exports, saves, wiki pages, and the oracles.',
			command: 'claude mcp add thetowersdk -- node ./node_modules/thetowersdk/mcp/server.mjs',
			docsHref: href('/docs/mcp/'),
			docsLabel: 'MCP Docs'
		},
		{
			title: 'adb-bridge',
			role: 'Optional',
			action: 'Run on the player’s machine',
			body: 'A standalone program, not a dependency, so it runs straight from npx. Pulls a real save from an Android device, an emulator, or the native Mac build and serves it locally.',
			command: 'npx adb-bridge',
			docsHref: href('/docs/save/'),
			docsLabel: 'Save File Docs'
		}
	] as const;
</script>

<section class="max-w-3xl">
	<div class="flex items-center gap-4">
		<img
			src={asset('/TheTowerSDK_logo.v5.png')}
			alt=""
			class="h-14 w-14 object-contain sm:h-16 sm:w-16"
			width="64"
			height="64"
		/>
		<div>
			<p class="text-xs font-semibold tracking-[0.18em] text-accent uppercase">TheTowerSDK</p>
			<h1 class="mt-1 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
				Build Tower Tools On Real Game Data
			</h1>
		</div>
	</div>
	<p class="mt-4 max-w-2xl text-lg text-muted">
		Game catalogs and formulas for The Tower. Build calculators, trackers, spreadsheets, charts,
		read save files, connect to emulators and more.
	</p>
	<div class="mt-6 flex flex-wrap gap-3">
		<a href={href('/start/')} class="btn-primary rounded-md px-4 py-2 font-semibold">
			Get Started
		</a>
		<a href={href('/docs/')} class="btn-secondary rounded-md px-4 py-2 font-medium">Docs</a>
		<a href={href('/playground/')} class="btn-secondary rounded-md px-4 py-2 font-medium">
			Examples
		</a>
		<a href={href('/ai/')} class="btn-secondary rounded-md px-4 py-2 font-medium"> AI &amp; ACS </a>
	</div>
	<div class="mt-4">
		<InstallCmd />
	</div>
</section>

<section class="mt-14">
	<h2 class="text-2xl font-semibold">What's In The Package</h2>
	<p class="mt-2 max-w-2xl text-muted">
		Counts from the installed package — including the detailed pieces inside each system.
	</p>
	<div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
		{#each data.packageContents as item (item.label)}
			<div class="rounded-lg border border-line/80 bg-panel/50 px-3 py-3">
				<p class="font-mono text-xl text-gold">{item.value}</p>
				<p class="mt-0.5 text-sm text-muted">{item.label}</p>
			</div>
		{/each}
	</div>
</section>

<section class="mt-14">
	<h2 class="text-2xl font-semibold">What You Get</h2>
	<div class="mt-6 grid gap-4 md:grid-cols-2">
		{#each features as feature (feature.title)}
			<GlassPanel>
				<h3 class="text-lg font-medium">{feature.title}</h3>
				<p class="mt-2 text-sm text-muted">{feature.body}</p>
			</GlassPanel>
		{/each}
	</div>
</section>

<section class="mt-14">
	<h2 class="text-2xl font-semibold">Examples</h2>
	<div class="mt-6 space-y-8">
		{#each demos as demo, i (demo.title)}
			{@const example = homeExamples[i]}
			{@const Demo = demo.Demo}
			<div>
				<h3 class="text-lg font-medium">{demo.title}</h3>
				<p class="mt-1 mb-4 text-sm text-muted">{demo.blurb}</p>
				<div class="grid gap-4 lg:grid-cols-2">
					<GlassPanel>
						<p class="mb-3 text-xs font-semibold tracking-wide text-accent uppercase">
							{demo.panel}
						</p>
						<svelte:boundary>
							{#snippet failed(error)}
								<p class="text-sm text-muted">
									Demo failed to load
									{#if error instanceof Error}
										({error.message})
									{/if}
									.
								</p>
							{/snippet}
							<Demo />
						</svelte:boundary>
					</GlassPanel>
					<GlassPanel>
						<p class="mb-3 text-xs font-semibold tracking-wide text-accent uppercase">Code</p>
						{#if example}
							<CodeBlock code={example.code} />
						{/if}
					</GlassPanel>
				</div>
			</div>
		{/each}
	</div>
	<p class="mt-4 text-sm"><a href={href('/playground/')}>More Examples →</a></p>
</section>

<section class="mt-14">
	<h2 class="text-2xl font-semibold">Tracking Runs</h2>
	<p class="mt-2 max-w-2xl text-muted">
		The game stores a battle report for every completed run.
		<code>listImportableBattleRuns</code> hands back those entries as they were recorded — tier, wave,
		duration, coins, timestamp, damage breakdowns, what killed you — so a run tracker is a table over
		them plus whatever totals matter to you. Coins per hour falls out of duration and coins, which is
		why most trackers start there.
	</p>
	<div class="mt-6 grid gap-4 lg:grid-cols-2">
		<GlassPanel>
			<p class="mb-3 text-xs font-semibold tracking-wide text-accent uppercase">Sample</p>
			<svelte:boundary>
				{#snippet failed(error)}
					<p class="text-sm text-muted">
						Demo failed to load{#if error instanceof Error}
							({error.message}){/if}.
					</p>
				{/snippet}
				<RunTrackerDemo />
			</svelte:boundary>
		</GlassPanel>
		<GlassPanel>
			<p class="mb-3 text-xs font-semibold tracking-wide text-accent uppercase">Code</p>
			<CodeBlock code={runTrackerSnippet} />
		</GlassPanel>
	</div>
	<p class="mt-4 text-sm"><a href={href('/docs/save/')}>Save File Docs →</a></p>
</section>

<section class="mt-14">
	<h2 class="text-2xl font-semibold">Charts</h2>
	<p class="mt-2 max-w-2xl text-muted">
		Every catalog entry with a level progression is a series, which covers
		<span class="font-mono text-gold">{data.chartableSeries}</span> of them across labs, workshop, cards,
		ultimate weapons, bots and guardians. Add rows to the data and every view regenerates — no image to
		redraw by hand. Below, that generator renders a cost table as an image.
	</p>
	<div class="mt-6 grid gap-4 lg:grid-cols-2">
		<GlassPanel>
			<p class="mb-3 text-xs font-semibold tracking-wide text-accent uppercase">Live</p>
			<svelte:boundary>
				{#snippet failed(error)}
					<p class="text-sm text-muted">
						Demo failed to load{#if error instanceof Error}
							({error.message}){/if}.
					</p>
				{/snippet}
				<CostTableDemo />
			</svelte:boundary>
		</GlassPanel>
		<GlassPanel>
			<p class="mb-3 text-xs font-semibold tracking-wide text-accent uppercase">Code</p>
			<CodeBlock code={chartSnippet} />
		</GlassPanel>
	</div>
	<p class="mt-4 text-sm"><a href={href('/docs/charts/')}>Charts Docs →</a></p>
</section>

<section class="mt-14">
	<h2 class="text-2xl font-semibold">Reading Save Files</h2>
	<p class="mt-2 max-w-2xl text-muted">
		<code>playerInfo.dat</code> holds a player's whole account: research, modules, cards, ultimate weapons,
		vault, and every run the game kept. Decode it once, then run as many extractors over the result as
		you like — they read without modifying it. Each returns typed values and reports what it could not
		interpret, so an older save degrades instead of failing. Fields the SDK does not name are still reachable
		on the decoded object.
	</p>
	<div class="mt-6 grid gap-4 lg:grid-cols-2">
		<GlassPanel>
			<p class="mb-3 text-xs font-semibold tracking-wide text-accent uppercase">Sample</p>
			<svelte:boundary>
				{#snippet failed(error)}
					<p class="text-sm text-muted">
						Demo failed to load{#if error instanceof Error}
							({error.message}){/if}.
					</p>
				{/snippet}
				<SaveDemo />
			</svelte:boundary>
		</GlassPanel>
		<GlassPanel>
			<p class="mb-3 text-xs font-semibold tracking-wide text-accent uppercase">Code</p>
			<CodeBlock code={homeExamples[3].code} />
		</GlassPanel>
	</div>
	<p class="mt-4 text-sm"><a href={href('/docs/save/')}>Save File Docs →</a></p>
</section>

<section class="mt-14">
	<h2 class="text-2xl font-semibold">Pulling Saves Automatically</h2>
	<p class="mt-2 max-w-2xl text-muted">
		Getting the file off the device is a separate job from reading it.
		<a href={LINKS.adbBridge}>adb-bridge</a> locates the save and serves it to your page over a local
		WebSocket — from an Android phone or emulator over ADB, or from the native Mac App Store build straight
		out of its app container. Ask it to watch and it re-sends on every write, so a tracker updates while
		the player plays.
	</p>
	<div class="mt-6 grid gap-4 lg:grid-cols-2">
		<GlassPanel>
			<h3 class="text-lg font-medium">How It Works</h3>
			<ol class="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
				<li>
					The player runs <code>npx adb-bridge</code>. On Android it installs Google's
					platform-tools on first run if <code>adb</code> is missing.
				</li>
				<li>
					It finds the save: a connected device or emulator over ADB, or on macOS the local app
					container under <code>~/Library/Containers</code> — no device and no ADB needed.
				</li>
				<li>
					Your page connects to <code>127.0.0.1</code> and receives the bytes — no upload, no file picker.
				</li>
				<li>You decode those bytes exactly as you would a file read from disk.</li>
			</ol>
			<p class="mt-3 text-sm text-muted">
				Reads only, no root, and one install covers multiple games.
			</p>
		</GlassPanel>
		<GlassPanel>
			<p class="mb-3 text-xs font-semibold tracking-wide text-accent uppercase">Code</p>
			<CodeBlock code={adbBridgeSnippet} />
		</GlassPanel>
	</div>
	<div class="mt-4">
		<InstallCmd command="npx adb-bridge" showVersion={false} />
	</div>
	<p class="mt-4 text-sm">
		<a href={href('/docs/save/')}>Save File Docs →</a>
		·
		<a href={LINKS.adbBridge}>adb-bridge →</a>
	</p>
</section>

<section class="mt-14">
	<h2 class="text-2xl font-semibold">Building Spreadsheets</h2>
	<p class="mt-2 max-w-2xl text-muted">
		The catalogs are already rows and columns, so a planning sheet can be generated rather than
		maintained by hand — every lab, level and cost written into the grid and rebuilt when the game
		changes.
	</p>
	<div class="mt-6 grid gap-4 lg:grid-cols-2">
		<GlassPanel>
			<h3 class="text-lg font-medium">Generate The Data</h3>
			<p class="mt-2 text-sm text-muted">
				Flatten a catalog into rows and write them to CSV, xlsx, or the Google Sheets API.
			</p>
			<div class="mt-3">
				<CodeBlock code={sheetBuildSnippet} />
			</div>
		</GlassPanel>
		<GlassPanel>
			<h3 class="text-lg font-medium">Generate The Formulas</h3>
			<p class="mt-2 text-sm text-muted">
				Emit formulas rather than baked numbers and the sheet keeps calculating for its user. The
				sheet oracle evaluates one in place to confirm what it returns.
			</p>
			<div class="mt-3">
				<CodeBlock code={sheetFormulaSnippet} />
			</div>
			<p class="mt-3 text-sm">
				<a href={href('/docs/mcp/')}>Sheet Oracle Setup →</a>
			</p>
		</GlassPanel>
	</div>
</section>

<section class="mt-14">
	<h2 class="text-2xl font-semibold">Building Bots</h2>
	<p class="mt-2 max-w-2xl text-muted">
		The package is framework-agnostic, so a bot imports the same catalogs and formulas a website
		does. The Run Tracker ships three Discord bots built this way.
	</p>
	<div class="mt-6 grid gap-4 lg:grid-cols-2">
		<GlassPanel>
			<h3 class="text-lg font-medium">One Calculation Layer</h3>
			<p class="mt-2 text-sm text-muted">
				Parsing, cost math and run shapes live in the package; embeds, components and modals stay in
				the bot. A command answers with the same number the site shows, because it is the same
				function.
			</p>
		</GlassPanel>
		<GlassPanel>
			<h3 class="text-lg font-medium">Interaction Conventions</h3>
			<p class="mt-2 text-sm text-muted">
				One router, a single owner for component ids, ownership filtered by user as well as id, and
				token guards before state is touched.
			</p>
			<p class="mt-3 text-sm">
				<a href={href('/docs/bots/')}>Building A Bot →</a>
			</p>
		</GlassPanel>
	</div>
</section>

<section
	class="relative left-1/2 mt-16 w-screen max-w-[100vw] -translate-x-1/2 border-y border-line bg-panel/70"
>
	<div class="mx-auto max-w-6xl px-4 py-14">
		<p class="text-xs font-semibold tracking-[0.18em] text-gold uppercase">AI Development</p>
		<h2 class="mt-2 text-3xl font-semibold">Build With An AI — Direct It With ACS</h2>
		<p class="mt-4 max-w-3xl text-muted">
			TheTowerSDK gives an assistant the game: catalogs, saves, formulas, wiki pages. ACS directs
			how it works while it edits your project, and TowerAI turns the same knowledge into an
			assistant of your own.
		</p>
		<div class="mt-8 grid gap-4 md:grid-cols-2">
			<GlassPanel>
				<h3 class="text-lg font-medium">MCP Server</h3>
				<p class="mt-2 text-sm text-muted">
					Register it and Cursor, Claude or Copilot build against real exports.
					<code>list_exports</code> and <code>describe_schema</code> for the API,
					<code>decode_save</code> for a real account, <code>wiki_page</code> for mechanics, and
					<code>sdk_graph_render</code> for a Mermaid diagram.
				</p>
			</GlassPanel>
			<GlassPanel>
				<h3 class="text-lg font-medium">The Tower Oracle</h3>
				<p class="mt-2 text-sm text-muted">
					A knowledge graph of game mechanics and how they interact.
					<code>oracle_traps</code> returns the known ways a mechanic has been misread,
					<code>oracle_expand</code> resolves acronyms from a closed set, and
					<code>oracle_contradictions</code> lists disagreeing claims ranked by source authority.
				</p>
			</GlassPanel>
			<GlassPanel>
				<h3 class="text-lg font-medium">The Sheet Oracle</h3>
				<p class="mt-2 text-sm text-muted">
					Reads a live community spreadsheet through MCP. <code>eval_formula</code> evaluates a
					formula in the sheet and returns what it computes; <code>list_lambdas</code> gives the named
					functions and their parameter order.
				</p>
			</GlassPanel>
			<GlassPanel>
				<h3 class="text-lg font-medium">ACS</h3>
				<p class="mt-2 text-sm text-muted">
					Agentic Cognition Substrate directs how an assistant works on your project: research
					before code, a checkpoint per slice, and a status that reaches “done” only when you say
					so.
				</p>
			</GlassPanel>
		</div>

		<h3 class="mt-12 text-2xl font-semibold">Build Your Own TowerAI</h3>
		<p class="mt-3 max-w-3xl text-muted">
			<code>towerai</code> is the TowerAI assistant core, published alongside this package. Install it,
			fill its knowledge base with the mechanics you care about, and it answers from your curation. Chunks
			hold prose for meaning while catalogs supply the numbers, so costs never go stale inside a sentence.
		</p>
		<div class="mt-6 grid gap-4 lg:grid-cols-2">
			<GlassPanel>
				<p class="mb-3 text-xs font-semibold tracking-wide text-accent uppercase">Live</p>
				<svelte:boundary>
					{#snippet failed(error)}
						<p class="text-sm text-muted">
							Demo failed to load{#if error instanceof Error}
								({error.message}){/if}.
						</p>
					{/snippet}
					<AskDemo />
				</svelte:boundary>
			</GlassPanel>
			<GlassPanel>
				<p class="mb-3 text-xs font-semibold tracking-wide text-accent uppercase">Code</p>
				<CodeBlock code={towerAiSnippet} />
			</GlassPanel>
		</div>
		<div class="mt-4">
			<InstallCmd command="npm install towerai" showVersion={false} />
		</div>

		<div class="mt-8 flex flex-wrap gap-3">
			<a href={href('/ai/')} class="btn-primary rounded-md px-4 py-2 font-semibold">
				AI &amp; ACS Guide
			</a>
			<a href={href('/docs/ags/')} class="btn-secondary rounded-md px-4 py-2 font-medium">
				ACS Docs
			</a>
			<a href={href('/docs/mcp/')} class="btn-secondary rounded-md px-4 py-2 font-medium">
				MCP &amp; Oracles
			</a>
			<a href={href('/license/')} class="btn-secondary rounded-md px-4 py-2 font-medium">
				Request Personal ACS
			</a>
		</div>
	</div>
</section>

<section class="mt-14">
	<h2 class="text-2xl font-semibold">Flagship Demonstration</h2>
	<p class="mt-2 max-w-2xl text-muted">
		Check out our flagship demonstration site,
		<a href={LINKS.tracker}>The Tower Run Tracker</a>
		— a full suite of calculators and trackers built on TheTowerSDK.
	</p>
	<p class="mt-4 text-sm">
		<a href={LINKS.tracker}>Open The Tower Run Tracker →</a>
		·
		<a href={href('/tools/')}>What You Can Build →</a>
	</p>
</section>

<section class="mt-14">
	<h2 class="text-2xl font-semibold">Install</h2>
	<p class="mt-2 max-w-2xl text-muted">
		Everything on this page, and what each piece is for. Only the first is required.
	</p>
	<div class="mt-6 grid gap-4 md:grid-cols-2">
		{#each installables as item (item.command)}
			<GlassPanel>
				<div class="flex items-baseline justify-between gap-3">
					<h3 class="text-lg font-medium">{item.title}</h3>
					<span class="shrink-0 text-xs tracking-wide text-muted uppercase">{item.role}</span>
				</div>
				<p class="mt-2 text-sm text-muted">{item.body}</p>
				<p class="mt-3 text-xs font-semibold tracking-wide text-accent uppercase">{item.action}</p>
				<div class="mt-1.5">
					<InstallCmd command={item.command} showVersion={false} />
				</div>
				<p class="mt-3 text-sm"><a href={item.docsHref}>{item.docsLabel} →</a></p>
			</GlassPanel>
		{/each}
	</div>
</section>
