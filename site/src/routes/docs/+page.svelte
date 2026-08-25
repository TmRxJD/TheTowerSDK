<script lang="ts">
	import { docsNav } from '$lib/content';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Documentation</h1>
<p class="mt-3 text-muted">
	How to install TheTowerSDK, read game data and saves, call formulas, pull wiki pages, and connect an
	AI. Use the sidebar to jump between topics.
</p>

<ul class="mt-8 space-y-3">
	{#each docsNav.slice(1) as item (item.href)}
		<li>
			<a href={href(item.href)} class="text-lg font-medium no-underline hover:underline"
				>{item.label}</a
			>
		</li>
	{/each}
</ul>
