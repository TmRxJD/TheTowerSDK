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

	/**
	 * The current page's own headings, read from the rendered article.
	 *
	 * Read from the DOM rather than declared in `content.ts`, because a list of subsections kept
	 * beside the nav is a list that goes stale the first time a page gains a section — and it goes
	 * stale silently, since a table of contents missing an entry still renders perfectly. The
	 * headings are already on the page; this just indexes them.
	 *
	 * Only the open page expands. Subsections under a page nobody is reading are noise, and the
	 * sidebar has to stay short enough to scan.
	 */
	let sections = $state<{ id: string; text: string }[]>([]);
	let activeId = $state('');

	$effect(() => {
		/* Re-read when the route changes; the article is replaced, not mutated. */
		void page.url.pathname;

		const article = document.querySelector('article');
		if (!article) {
			sections = [];
			return;
		}

		const found = [...article.querySelectorAll('h2')].map((heading, index) => {
			/*
			 * Give a heading an id if it has none. Without one there is nothing to link to, and
			 * every page here writes plain `<h2>` — asking each to carry an id by hand is the same
			 * staleness problem in a different place.
			 *
			 * A heading linked to from ANOTHER page must still declare its id in the markup: these
			 * are assigned in the browser, and the prerender link check runs before any of that.
			 * It caught exactly that, which is the check doing its job.
			 */
			if (!heading.id) {
				heading.id =
					heading.textContent
						?.toLowerCase()
						.replace(/[^a-z0-9]+/g, '-')
						.replace(/^-+|-+$/g, '') || `section-${index}`;
			}
			return { id: heading.id, text: heading.textContent?.trim() ?? '' };
		});

		/*
		 * Read `headings`, not `sections`, from here on.
		 *
		 * Reading the state this effect just wrote makes the effect depend on it, so it invalidates
		 * itself: every re-run disconnected the observer it had just created and the active-section
		 * highlight never appeared. The list is already in hand — use it.
		 */
		const headings = found.filter((entry) => entry.text.length > 0);
		sections = headings;

		if (headings.length === 0) return;

		/*
		 * Highlight the section being read. `rootMargin` pulls the trigger line down from the very
		 * top so a heading counts as current once it is comfortably on screen, not the instant its
		 * first pixel appears.
		 */
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) activeId = entry.target.id;
				}
			},
			{ rootMargin: '-80px 0px -70% 0px', threshold: 0 }
		);

		for (const entry of headings) {
			const element = document.getElementById(entry.id);
			if (element) observer.observe(element);
		}
		return () => observer.disconnect();
	});
</script>

<div class="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
	<aside class="lg:sticky lg:top-4 lg:self-start">
		<p class="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Docs</p>
		<nav class="mt-3 flex flex-col gap-0.5 text-sm">
			{#each docsNav as item (item.href)}
				{@const open = isActive(item.href)}
				<a
					href={href(item.href)}
					class={[
						'rounded-md px-2.5 py-1.5 no-underline',
						open ? 'bg-accent-dim text-fg' : 'text-muted hover:text-fg'
					]}
					aria-current={open ? 'page' : undefined}
				>
					{item.label}
				</a>

				{#if open && sections.length > 0}
					<ul class="doc-subnav">
						{#each sections as section (section.id)}
							<li>
								<a
									href={`#${section.id}`}
									class={[
										'block rounded px-2 py-1 text-xs no-underline',
										activeId === section.id ? 'text-accent' : 'text-muted hover:text-fg'
									]}
								>
									{section.text}
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			{/each}
		</nav>
	</aside>
	<article class="max-w-3xl min-w-0">
		{@render children()}
	</article>
</div>

<style>
	.doc-subnav {
		margin: 0.15rem 0 0.4rem 0.75rem;
		padding-left: 0.6rem;
		border-left: 1px solid var(--color-line);
		list-style: none;
	}

	/*
	 * A jump lands the heading below the sticky header rather than under it. Set here because the
	 * headings live in the pages, and every page would otherwise need to remember it.
	 */
	:global(article h2) {
		scroll-margin-top: 5rem;
	}
</style>
