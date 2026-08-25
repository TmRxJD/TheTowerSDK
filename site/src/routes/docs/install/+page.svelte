<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { SDK_VERSION } from '$lib/links';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Install · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Install</h1>
<p class="mt-3 text-muted">
	Node 20+. One package. This site is built against
	<code>thetowersdk@{SDK_VERSION}</code>. Pin a version when you want frozen game numbers.
</p>

<div class="mt-6">
	<CodeBlock code={`npm install thetowersdk@${SDK_VERSION}`} />
</div>

<h2 class="mt-10 text-xl font-medium">Entry Points</h2>
<ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
	<li><code>thetowersdk/data</code> — catalogs and tables</li>
	<li><code>thetowersdk/save</code> — extractors over a decoded save</li>
	<li><code>thetowersdk/node</code> — decode playerInfo.dat (Node)</li>
	<li><code>thetowersdk/formatting</code> — game-style number display</li>
	<li><code>thetowersdk/mechanics</code> — formulas and planners</li>
	<li><code>thetowersdk/wiki</code> — Fandom → Markdown</li>
</ul>

<p class="mt-8 text-sm">
	<a href={href('/start/')}>Guided Get-started →</a>
	·
	<a href={href('/docs/data/')}>Game Data →</a>
</p>
