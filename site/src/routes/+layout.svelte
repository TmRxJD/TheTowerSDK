<script lang="ts">
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { asset, href } from '$lib/paths';
	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import './layout.css';

	let { children } = $props();

	const home = href('/');

	/** Tiles written by `scripts/prepare-art.mjs`; it prints this number when it finishes. */
	const ART_TILE_COUNT = 8;

	/**
	 * A backdrop for every page, chosen from the route.
	 *
	 * Done here rather than per page so a new page is never bare — adding a route gets artwork with
	 * no extra step, which is what stops this drifting back to a handful of decorated pages and a
	 * long tail of plain ones.
	 *
	 * The tile is picked by hashing the path, so each route keeps the same backdrop across visits
	 * (a reader returning to a page sees the page they remember) while neighbouring routes differ.
	 */
	const artTile = $derived.by(() => {
		const path = page.url.pathname;
		let hash = 0;
		for (let i = 0; i < path.length; i++) hash = (hash * 31 + path.charCodeAt(i)) >>> 0;
		return (hash % ART_TILE_COUNT) + 1;
	});

	/*
	 * The home page brings its own full-bleed artwork per section, so the page-wide layer would sit
	 * underneath all of it doing nothing but adding a request.
	 */
	const isHome = $derived(
		page.url.pathname === home || page.url.pathname === home.replace(/\/$/, '')
	);
	const title = $derived(
		page.url.pathname === home || page.url.pathname === home.replace(/\/$/, '')
			? 'TheTowerSDK'
			: 'TheTowerSDK'
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{title}</title>
	<meta
		name="description"
		content="Game catalogs and formulas for The Tower. Build calculators, trackers, spreadsheets, charts, read save files, connect to emulators and more."
	/>
	<meta name="theme-color" content="#0f1419" />
</svelte:head>

{#if !isHome}
	<div class="page-art" style="--section-art: url({asset(`/feature-${artTile}.webp`)})"></div>
{/if}

<div class="flex min-h-screen flex-col">
	<SiteHeader />
	<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
		{@render children()}
	</main>
	<SiteFooter />
</div>
