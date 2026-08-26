<script lang="ts">
	import { page } from '$app/state';
	import { href } from '$lib/paths';
	import SiteFooter from '$lib/ui/SiteFooter.svelte';
	import SiteHeader from '$lib/ui/SiteHeader.svelte';
	import PageArt from '$lib/ui/PageArt.svelte';
	import './layout.css';

	let { children } = $props();

	const home = href('/');

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
	<!--
		No icon here. `app.html` declares it once, pointing at the real SDK logo.

		This carried a second `<link rel="icon">` at a hand-drawn placeholder SVG — a dark rounded
		square left over from the skeleton. Because the layout renders into `%sveltekit.head%`, which
		sits AFTER the app.html link, the placeholder won every time and the logo never appeared in a
		tab. Two declarations of one thing, and the wrong one silently taking precedence.
	-->
	<title>{title}</title>
	<meta
		name="description"
		content="Game catalogs and formulas for The Tower. Build calculators, trackers, spreadsheets, charts, read save files, connect to emulators and more."
	/>
	<meta name="theme-color" content="#0f1419" />
</svelte:head>

{#if !isHome}
	<PageArt path={page.url.pathname} />
{/if}

<div class="flex min-h-screen flex-col">
	<SiteHeader />
	<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
		{@render children()}
	</main>
	<SiteFooter />
</div>
