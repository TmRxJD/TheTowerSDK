<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Wiki · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Wiki</h1>
<p class="mt-3 text-muted">
	The Tower wiki lives on Fandom as wikitext. The package converts pages to Markdown so apps and
	assistants can read behavior text without scraping by hand.
</p>

<div class="mt-6">
	<CodeBlock
		code={`import { fetchFandomPageAsMarkdown } from 'thetowersdk/wiki'

const md = await fetchFandomPageAsMarkdown('Death Wave')
console.log(md)`}
	/>
</div>

<p class="mt-6 text-sm text-muted">
	Through MCP, agents use <code>wiki_search</code> and <code>wiki_page</code> for the same content.
</p>
<p class="mt-4 text-sm"><a href={href('/docs/mcp/')}>MCP &amp; AI →</a></p>
