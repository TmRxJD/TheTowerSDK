<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import InstallCmd from '$lib/ui/InstallCmd.svelte';
	import { towerAiSnippet } from '$lib/content';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>TowerAI · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">TowerAI</h1>
<p class="mt-3 text-muted">
	The assistant core behind The Tower Run Tracker's in-app assistant, published as its own MIT
	package. It answers from a knowledge base you curate rather than from whatever a general model
	absorbed.
</p>

<div class="mt-4">
	<InstallCmd command="npm install towerai" showVersion={false} />
</div>

<h2 class="mt-8 text-xl font-medium">How The Knowledge Base Works</h2>
<p class="mt-2 text-sm text-muted">
	A knowledge base is an array of chunks. Each chunk carries a topic, tags, a disambiguation line
	saying what it is <em>not</em> about, and its content. Retrieval scores a question against those chunks
	and answers from the best match.
</p>
<p class="mt-3 text-sm text-muted">
	The split that matters: curated prose supplies meaning, and the SDK catalogs supply numbers. A
	chunk that says "Attack Speed has 99 levels" in prose goes stale the next time the game
	rebalances; one that reads the count from <code>LAB_CATALOG</code> does not.
</p>

<h2 class="mt-8 text-xl font-medium">Building One</h2>
<div class="mt-3">
	<CodeBlock code={towerAiSnippet} />
</div>

<h2 class="mt-8 text-xl font-medium">Exports</h2>
<ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
	<li>
		<code>buildTrackerAiCanonicalKbChunks</code> — the shipped chunk set, to extend or replace
	</li>
	<li>
		<code>validateCanonicalKbArray</code> — reports malformed chunks up front, not at query time
	</li>
	<li><code>formatKbValidationError</code> — turns a validation failure into a readable message</li>
	<li><code>buildCanonicalKbVersion</code> — a content-derived version string for cache keys</li>
	<li>
		<code>loadCanonicalKbFromJson</code> / <code>loadCanonicalKbFromFile</code> — load a prebuilt base
	</li>
	<li><code>toCanonicalRuntimeKnowledgeRecord</code> — chunk to the runtime record shape</li>
</ul>

<h2 class="mt-8 text-xl font-medium">Artifacts Are Fetched, Not Bundled</h2>
<p class="mt-2 text-sm text-muted">
	Embedding indexes are served from a manifest URL rather than shipped in the tarball, which keeps
	the package small. Point it at your own manifest to serve a knowledge base you host.
</p>

<h2 class="mt-8 text-xl font-medium">A Note On Accuracy</h2>
<p class="mt-2 text-sm text-muted">
	AI assistants are known to make mistakes. A curated base narrows what an assistant can say, and
	declining to answer is a valid outcome worth designing for — but it is not a guarantee of
	correctness. Say so wherever you surface answers to players.
</p>

<p class="mt-8 text-sm">
	<a href={href('/docs/mcp/')}>MCP &amp; Oracles →</a>
	·
	<a href={href('/ai/')}>AI &amp; ACS Guide →</a>
</p>
