<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { chartCompareSnippet, chartSnippet } from '$lib/content';
	import { href } from '$lib/paths';

	let { data } = $props();
</script>

<svelte:head>
	<title>Charts · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Charts</h1>
<p class="mt-3 text-muted">
	The package ships no renderer and no plotting dependency. What it ships is data already shaped
	like a series, so generating a chart is a <code>map</code> rather than an integration.
</p>

<h2 class="mt-8 text-xl font-medium">Why There Is No Chart API</h2>
<p class="mt-2 text-sm text-muted">
	A level progression <em>is</em> a series: the level is the x-axis and every measured field on that
	level is a line. Once that is true, a chart helper would only be wrapping <code>Array.map</code> and
	forcing an opinion about rendering on you. So the catalogs are the chart API, and the drawing stays
	yours — Chart.js, D3, Vega, a spreadsheet, an SVG you write by hand.
</p>

<h2 class="mt-8 text-xl font-medium">One Entity Across Its Levels</h2>
<div class="mt-3">
	<CodeBlock code={chartSnippet} />
</div>

<h2 class="mt-8 text-xl font-medium">Many Entities At Once</h2>
<p class="mt-2 text-sm text-muted">
	The comparison charts people actually want are the same operation applied across a catalog.
</p>
<div class="mt-3">
	<CodeBlock code={chartCompareSnippet} />
</div>

<h2 class="mt-8 text-xl font-medium">How Much Is Chartable</h2>
<p class="mt-2 text-sm text-muted">
	Counted from the installed package, the shipped catalogs support
	<span class="font-mono text-gold">{data.chartableSeries}</span> distinct series — one per measurable
	field that varies across a level range:
</p>
<ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
	<li><strong>Labs</strong> — coin cost and research time for every lab.</li>
	<li><strong>Workshop</strong> — stat value, cash cost, and coin cost per upgrade.</li>
	<li><strong>Cards</strong> — level values and mastery values.</li>
	<li><strong>Ultimate weapons</strong> — stat value and stone cost per stat.</li>
	<li><strong>Bots</strong> — per-stat progressions, including plus variants.</li>
	<li><strong>Guardians</strong> — chip stat value and cost.</li>
</ul>
<p class="mt-3 text-sm text-muted">
	That figure is the raw floor, not a ceiling. It counts only fields that already vary by level, and
	deliberately excludes catalogs with nothing to plot — relics carry a single flat value, module
	substats are cluster metadata, and vault nodes are identifiers. Anything you derive, combine, or
	compute from <a href={href('/docs/mechanics/')}>the formulas</a> is additional.
</p>

<p class="mt-8 text-sm"><a href={href('/playground/')}>More Examples →</a></p>
