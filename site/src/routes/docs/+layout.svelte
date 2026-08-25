<script lang="ts">
	import { docsNav } from '$lib/content';
	import { href } from '$lib/paths';
	import { page } from '$app/state';

	let { children } = $props();

	function isActive(path: string): boolean {
		const target = href(path);
		const here = page.url.pathname;
		if (path === '/docs/') {
			return here === target || here === target.replace(/\/$/, '');
		}
		return here === target || here.startsWith(target);
	}
</script>

<div class="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
	<aside class="lg:sticky lg:top-4 lg:self-start">
		<p class="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Docs</p>
		<nav class="mt-3 flex flex-col gap-0.5 text-sm">
			{#each docsNav as item (item.href)}
				<a
					href={href(item.href)}
					class={[
						'rounded-md px-2.5 py-1.5 no-underline',
						isActive(item.href) ? 'bg-accent-dim text-fg' : 'text-muted hover:text-fg'
					]}
				>
					{item.label}
				</a>
			{/each}
		</nav>
	</aside>
	<article class="min-w-0 max-w-3xl">
		{@render children()}
	</article>
</div>
