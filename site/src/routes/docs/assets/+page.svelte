<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Artwork · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Artwork</h1>
<p class="mt-3 text-muted">
	The game's art, catalogued. 1,059 assets across 19 domains — modules, cards, relics, tower skins,
	enemies, guardians, perks, backgrounds, events, icons and the rest — extracted from a known game
	build, each at three sizes.
</p>

<div class="mt-6">
	<CodeBlock
		code={`import { gameAssetPath, findGameAsset, gameAssetsInDomain } from 'thetowersdk/assets'

gameAssetPath('Amplifying Strike')   // 'modules/amplifying-strike-md.webp'
gameAssetPath('Om Chip', 'lg')       // 'modules/om-chip-lg.webp'
gameAssetPath('Not A Thing')         // null

findGameAsset('amplifying-strike')   // by name, slug, or in-game sprite name
gameAssetsInDomain('relics')         // every catalogued relic`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">Three Sizes, One Rule</h2>
<p class="mt-3 text-muted">
	Every file is <code>&lt;domain&gt;/&lt;slug&gt;-&lt;size&gt;.webp</code> at <code>sm</code>,
	<code>md</code>
	or <code>lg</code>. Paths are derived from that rule rather than stored, and a test resolves all
	3,177 of them against the directory — so the catalogue cannot drift into confident paths to
	nothing.
</p>

<h2 class="mt-10 text-xl font-semibold">It Says What It Does Not Know</h2>
<p class="mt-3 text-muted">
	The extraction names a sprite by matching it against the SDK's own catalogs. The 149 it could not
	place ship as <code>UNIDENTIFIED_GAME_SPRITES</code> rather than being dropped, and
	<code>gameAssetCoverage()</code> reports the per-domain counts beside them. A shorter catalogue would
	read as a complete one.
</p>
<p class="mt-3 text-muted">
	<code>GAME_ASSET_VERSION</code> is the game build the art came from, so a caller can tell how far behind
	the live game it is.
</p>

<h2 class="mt-10 text-xl font-semibold">The Images Ship Separately</h2>
<p class="mt-3 text-muted">
	This package carries the <em>mapping</em>, not the artwork. The images are The Tower's, owned by
	TechTree Games, and live in <code>tower-assets</code>, which claims no license over them and
	asserts no authorship. A list of filenames is not artwork, so the mapping ships here under MIT and
	the art does not.
</p>
<p class="mt-3 text-muted">
	<code>towerAssetUrl()</code> turns a returned path into a URL against wherever you serve them from,
	so the package never assumes a host.
</p>

<p class="mt-8 text-sm"><a href={href('/docs/data/')}>Game data →</a></p>
