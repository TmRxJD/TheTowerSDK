<script lang="ts">
	import { page } from '$app/state';
	import { nav } from '$lib/content';
	import { asset, href } from '$lib/paths';

	let open = $state(false);

	function isActive(path: string): boolean {
		const target = href(path);
		return page.url.pathname === target || page.url.pathname === `${target}`.replace(/\/$/, '');
	}
</script>

<header class="border-b border-line/80 bg-bg/70 backdrop-blur-md">
	<div class="mx-auto max-w-6xl px-4 py-3">
		<div class="flex items-center justify-between gap-4">
			<a href={href('/')} class="flex items-center gap-2 text-fg no-underline">
				<img
					src={asset('/TheTowerSDK_logo.v5.png')}
					alt=""
					class="h-8 w-8 object-contain"
					width="32"
					height="32"
				/>
				<span class="font-semibold tracking-tight">TheTowerSDK</span>
			</a>

			<button
				type="button"
				class="rounded-md border border-line px-3 py-1 text-sm md:hidden"
				aria-expanded={open}
				onclick={() => (open = !open)}
			>
				Menu
			</button>

			<nav class="hidden flex-wrap gap-1 text-sm md:flex">
				{#each nav as item (item.href)}
					<a
						href={href(item.href)}
						class={[
							'rounded-md px-2.5 py-1 no-underline',
							isActive(item.href) ? 'bg-accent-dim text-fg' : 'text-muted hover:text-fg'
						]}
					>
						{item.label}
					</a>
				{/each}
			</nav>
		</div>
		{#if open}
			<nav class="mt-3 flex flex-col gap-1 text-sm md:hidden">
				{#each nav as item (item.href)}
					<a
						href={href(item.href)}
						class={[
							'rounded-md px-2.5 py-1 no-underline',
							isActive(item.href) ? 'bg-accent-dim text-fg' : 'text-muted hover:text-fg'
						]}
						onclick={() => (open = false)}
					>
						{item.label}
					</a>
				{/each}
			</nav>
		{/if}
	</div>
</header>
