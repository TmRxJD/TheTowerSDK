<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { planSnippet } from '$lib/content';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Formulas · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Formulas</h1>
<p class="mt-3 text-muted">
	<code>thetowersdk/mechanics</code> exports enemy scaling, ultimate weapon timing, lab and workshop
	costs, Effective Paths planners, resource-drop helpers, and more — callable formulas for your
	tools.
</p>

<h2 class="mt-8 text-xl font-medium">Effective Paths</h2>
<div class="mt-3">
	<CodeBlock code={planSnippet} />
</div>

<h2 class="mt-8 text-xl font-medium">Uptime-style Sync</h2>
<p class="mt-2 text-sm text-muted">
	Combine UW cooldowns (for example Death Wave from stones) with in-game bot catalog timing (Golden
	Bot duration / cooldown) to answer sync questions.
</p>
<p class="mt-4 text-sm"><a href={href('/playground/')}>Live Formula Examples →</a></p>
