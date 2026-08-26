<script lang="ts">
	import { SHOW_GOVERNANCE } from '$lib/content';
	import { LINKS } from '$lib/links';
	import { asset, href } from '$lib/paths';
</script>

<footer class="mt-16 border-t border-line/80">
	<div class="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-muted md:grid-cols-3">
		<div>
			<div class="flex items-center gap-2">
				<img
					src={asset('/TheTowerSDK_logo.v5.png')}
					alt=""
					class="h-8 w-8 object-contain"
					width="32"
					height="32"
				/>
				<p class="font-semibold text-fg">TheTowerSDK</p>
			</div>
			<p class="mt-2 max-w-sm">
				Game data and formulas for The Tower tools. Not affiliated with Tech Tree Games.
			</p>
		</div>
		<nav class="flex flex-col gap-1" aria-label="Site">
			<p class="mb-1 text-xs font-semibold tracking-wide text-fg uppercase">Site</p>
			<a href={href('/start/')}>Get started</a>
			<a href={href('/tools/')}>What you can build</a>
			<a href={href('/playground/')}>Examples</a>
			<a href={href('/docs/')}>Docs</a>
			{#if SHOW_GOVERNANCE}
				<a href={href('/ai/')}>AI &amp; ACS</a>
			{/if}
			<a href={href('/contributions/')}>Contributions</a>
			<a href={href('/docs/license/')}>License</a>
		</nav>
		<nav class="flex flex-col gap-1" aria-label="Related">
			<p class="mb-1 text-xs font-semibold tracking-wide text-fg uppercase">Related</p>
			<a href={LINKS.npm}>npm: thetowersdk</a>
			<a href={LINKS.github}>GitHub: TheTowerSDK</a>
			<a href={LINKS.tracker}>The Tower Run Tracker</a>
			{#if SHOW_GOVERNANCE}
				<a href={LINKS.agsSite}>Agentic Cognition Substrate</a>
			{/if}
			<a href={LINKS.towerai}>GitHub: TowerAI</a>
			<a href={LINKS.towerAiNpm}>npm: towerai</a>
			<a href={LINKS.adbBridge}>GitHub: adb-bridge</a>
			<a href={LINKS.adbBridgeNpm}>npm: adb-bridge</a>
		</nav>
	</div>
</footer>
