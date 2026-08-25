<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Builders · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Builders</h1>
<p class="mt-3 text-muted">
	The calculators as data. Each one declares its fields, their units and their caps, so a form, a
	slash command or a test can be generated from the same declaration instead of being written three
	times and drifting apart.
</p>

<div class="mt-6">
	<CodeBlock
		code={`import { CALCULATOR_BUILDERS, findCalculatorBuilder } from 'thetowersdk/builders'

const builder = findCalculatorBuilder('assist.stones')

builder.title    // 'Assist module stones'
builder.summary  // 'Stones to raise an assist module efficiency slot between two levels.'
builder.fields   // [{ key: 'currentLevel', label: 'Current level', kind: 'number', min: 0, max: 69 }, …]

const result = builder.compute(builder.normalize({ currentLevel: 0, targetLevel: 10 }))

result.totalStones  // 285
result.maxLevel     // 69
result.levels       // [{ level: 1, stoneCost: 15 }, { level: 2, stoneCost: 18 }, …]
result.notes        // anything the calculator refused to model, said out loud`}
	/>
</div>

<p class="mt-4 text-sm text-muted">
	<code>CALCULATOR_BUILDERS</code> is all 15 of them. Read <code>fields</code> to render a form for one
	you have never seen.
</p>

<h2 class="mt-10 text-xl font-semibold">Why declare them</h2>
<p class="mt-3 text-muted">
	A calculator usually exists three times over: the maths, the UI that collects its inputs, and the
	bot command that does the same thing in a chat window. Two of those drift. Here the fields are the
	source, so <a href={href('/docs/bots/')}>a bot</a> gets every calculator for free.
</p>

<h2 class="mt-10 text-xl font-semibold">Caps come from the curve</h2>
<p class="mt-3 text-muted">
	Every field carries its own cap — <code>max: 69</code> above is the assist substat ladder, not a shared
	constant. A level past the end of a cost table is refused rather than priced at zero, which is what
	used to happen: free looks like a bargain rather than a bug.
</p>

<h2 class="mt-10 text-xl font-semibold">Inputs</h2>
<p class="mt-3 text-muted">
	<code>thetowersdk/inputs</code> is the vocabulary those fields are parsed with, including a
	decimal separator that follows the reader's locale — so <code>1,5</code> means one and a half where
	that is how numbers are written.
</p>

<p class="mt-8 text-sm"><a href={href('/docs/bots/')}>Turn these into bot commands →</a></p>
