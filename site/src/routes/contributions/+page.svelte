<script lang="ts">
	import { CONTRIBUTIONS, CONTRIBUTION_SUPPORT } from 'thetowersdk/contributions';
	import { WIKI_CREDIT_SOURCES } from 'thetowersdk/wiki';
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { href } from '$lib/paths';

	/*
	 * Rendered from the package, not restated here.
	 *
	 * `thetowersdk/contributions` is the roster, so this page cannot drift from what the package
	 * says and a name cannot go missing in a redesign. Anything built on the SDK can render the
	 * same list.
	 */
	const areas = CONTRIBUTIONS;
</script>

<svelte:head>
	<title>Contributions · TheTowerSDK</title>
	<meta
		name="description"
		content="The people whose work TheTowerSDK is built on: the Effective Paths team, save enum mapping, TowerToolkit, the wiki editors."
	/>
</svelte:head>

<h1 class="text-3xl font-semibold">Contributions</h1>
<p class="mt-3 max-w-3xl text-muted">
	Most of what this package knows was worked out by other people. The Effective Paths formulas are a
	community spreadsheet's maths. The save file's enum indexes were mapped by someone who did that
	work first. Some of the earliest game data began in an older toolkit. The wiki pages are
	volunteers' writing. This package translates all of it into TypeScript, which is a far smaller job
	than producing it.
</p>

<div class="mt-10 space-y-8">
	{#each areas as area (area.area)}
		<section class="tool-card">
			<div class="flex flex-wrap items-baseline justify-between gap-3">
				<h2 class="text-xl font-semibold">{area.area}</h2>
				{#if area.url}
					<a class="text-sm" href={area.url} rel="noreferrer">Source →</a>
				{/if}
			</div>
			<p class="mt-2 max-w-3xl text-sm text-muted">{area.what}</p>

			<ul class="mt-4 flex flex-wrap gap-2">
				{#each area.people as person (person.name)}
					<li class="rounded-md border border-line/70 px-3 py-1 text-sm">
						<span class="text-fg">{person.name}</span>
						{#if person.role}<span class="text-muted"> — {person.role}</span>{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<h2 class="mt-12 text-xl font-semibold">The Wikis</h2>
<p class="mt-2 max-w-3xl text-muted">
	Individual editors are not listed, deliberately. Wiki authorship changes continuously and is
	recorded per page in each wiki's own history, so a snapshot copied into a package would be wrong
	within a week and would quietly drop people. Every page the SDK returns carries a
	<code>url</code> back to its source, where the authors and the edit history are.
</p>
<ul class="mt-4 flex flex-wrap gap-2">
	{#each WIKI_CREDIT_SOURCES as source (source.url)}
		<li class="rounded-md border border-line/70 px-3 py-1 text-sm">
			<a href={source.url} rel="noreferrer">{source.label}</a>
		</li>
	{/each}
</ul>

<h2 class="mt-12 text-xl font-semibold">Supporting Them Directly</h2>
<p class="mt-2 max-w-3xl text-muted">
	Tech Tree Games' webstore credits a creator code on purchase, so entering one sends support at no
	extra cost to you. It is the one way this package can give back for formulas it did not write.
</p>
<ul class="mt-4 space-y-2">
	{#each CONTRIBUTION_SUPPORT as support (support.creatorCode)}
		<li class="text-sm">
			<span class="text-fg">{support.label}</span>
			<span class="text-muted"> — creator code </span>
			<code>{support.creatorCode}</code>
			<span class="text-muted"> at </span>
			<a href={support.storeUrl} rel="noreferrer">the webstore</a>
		</li>
	{/each}
</ul>

<h2 class="mt-12 text-xl font-semibold">Rendering This In Your Own Tool</h2>
<p class="mt-2 max-w-3xl text-muted">
	If your tool shows Effective Paths numbers or wiki text, this is the credit to carry. The roster
	ships with the package, so the list stays right as it grows.
</p>
<div class="mt-4">
	<CodeBlock
		code={`import { CONTRIBUTIONS, ATTRIBUTION_LINES } from 'thetowersdk/contributions'

// One line per source — a footer or an about box.
for (const line of ATTRIBUTION_LINES) console.log(line)

// Or the full roster, grouped by what each group contributed.
for (const area of CONTRIBUTIONS) {
  console.log(area.area, area.people.map((person) => person.name).join(', '))
}`}
	/>
</div>

<p class="mt-10 text-sm">
	<a href={href('/docs/mechanics/')}>Effective Paths formulas →</a>
	·
	<a href={href('/docs/wiki/')}>Wiki reader →</a>
	·
	<a href={href('/docs/license/')}>License →</a>
</p>
