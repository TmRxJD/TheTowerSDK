<script lang="ts">
	import { LINKS } from '$lib/links';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Licensing · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Licensing</h1>
<p class="mt-3 text-muted">
	TheTowerSDK is MIT licensed — free to install and free to use, for anything.
</p>

<h2 class="mt-10 text-xl font-semibold">What You Can Do With It</h2>
<p class="mt-3 text-muted">
	Use it in personal projects, community tools, and commercial apps. Ship it inside a website, a
	Discord bot, a desktop app, a mobile app, or a spreadsheet add-on. Fork it, vendor it, modify it,
	and redistribute your version. The only condition is the one MIT always carries: keep the
	copyright notice with the code.
</p>

<h2 class="mt-10 text-xl font-semibold">Attribution</h2>
<p class="mt-3 text-muted">
	Nothing beyond the licence notice is required. If you would like to credit the project anyway, a
	link to <a href={LINKS.github}>the repository</a> is the most useful form — it points people at the
	same numbers you are using.
</p>

<h2 class="mt-10 text-xl font-semibold">Pinning A Version</h2>
<p class="mt-3 text-muted">
	Install a fixed version when you want the game numbers to stay exactly as they are today, and
	upgrade deliberately when the game changes. See <a href={href('/docs/install/')}>Install</a> for the
	options.
</p>

<p class="mt-8 text-sm">
	<a href={href('/docs/install/')}>Install →</a>
	·
	<a href={LINKS.github}>GitHub →</a>
</p>
