<script lang="ts">
	import { trackerExamples } from '$lib/content';
	import { LINKS } from '$lib/links';
	import { href } from '$lib/paths';
	import GlassPanel from '$lib/ui/GlassPanel.svelte';
</script>

<svelte:head>
	<title>What you can build · TheTowerSDK</title>
</svelte:head>

<p class="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Build</p>
<h1 class="mt-2 text-3xl font-semibold">What You Can Build</h1>
<p class="mt-2 max-w-2xl text-muted">
	Calculators, trackers, spreadsheets, charts, read save files and more.
</p>

<div class="mt-8 grid gap-4 md:grid-cols-2">
	{#each trackerExamples as tool (tool.title)}
		<GlassPanel>
			<h2 class="text-lg font-medium">{tool.title}</h2>
			<p class="mt-2 text-sm text-muted">{tool.body}</p>
		</GlassPanel>
	{/each}
</div>

<p class="mt-8 text-sm text-muted">
	Example product on this package:
	<a href={LINKS.tracker}>The Tower Run Tracker</a>
	·
	<a href={href('/ai/')}>AI &amp; ACS →</a>
</p>
