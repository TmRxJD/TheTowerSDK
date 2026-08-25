<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { dataSnippet } from '$lib/content';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Game data · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Game Data</h1>
<p class="mt-3 text-muted">
	Typed catalogs for labs, workshop, modules, cards, relics, bots, guardians, ultimate weapons, vault
	nodes, perks, battle conditions, tiers, milestones, and the glossary.
</p>

<h2 class="mt-8 text-xl font-medium">Example</h2>
<div class="mt-3">
	<CodeBlock code={dataSnippet} />
</div>

<p class="mt-8 text-sm text-muted">
	Counts on the home page are read from the package you installed — they move when the game data
	updates.
</p>
<p class="mt-4 text-sm"><a href={href('/docs/mechanics/')}>Formulas →</a></p>
