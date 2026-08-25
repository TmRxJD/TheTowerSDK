<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Knowledge · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Knowledge</h1>
<p class="mt-3 text-muted">
	What a mechanic <em>is</em>, and every way it has already been got wrong. The catalogs say what a
	number is; this says what it means — 312 nodes across 28 compartments, each carrying its source
	and the date it was checked.
</p>

<div class="mt-6">
	<CodeBlock
		code={`import { resolve, resolveWithConfidence, search, trapsFor } from 'thetowersdk/knowledge'

resolve('gt')            // 'ultimateWeapon.goldenTower'  — GT is Golden Tower
resolve('gt+')           // 'ultimateWeaponPlus.goldenCombo' — and GT+ is not the same thing

search('golden tower')   // ranked hits, each with its node

trapsFor('ultimateWeapon.goldenTower')
// the specific ways this has been misread before — 18 of them for Golden Tower`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">Traps are the point</h2>
<p class="mt-3 text-muted">
	Every node carries the mistakes people actually make with it, not a description. Before modelling
	a mechanic you ask what goes wrong with it and get an answer, which is a different question from
	"what is it".
</p>

<h2 class="mt-10 text-xl font-semibold">It says how sure it is</h2>
<div class="mt-4">
	<CodeBlock
		code={`resolveWithConfidence('golden tower')
// { id: 'ultimateWeapon.goldenTower', score: 1000, confidence: 'exact', alternatives: [] }

resolveWithConfidence('gt')
// { id: 'ultimateWeapon.goldenTower', score: 800, confidence: 'strong', … }`}
	/>
</div>
<p class="mt-4 text-muted">
	<code>exact</code>, <code>strong</code>, <code>weak</code> or <code>none</code>, with the
	runners-up. A confident wrong answer is worse than no answer, so the score is part of the result
	rather than something you infer.
</p>

<h2 class="mt-10 text-xl font-semibold">Silence is not safety</h2>
<p class="mt-3 text-muted">
	A mechanic the graph does not know is <strong>undocumented, not verified</strong>. Use
	<code>compartmentMaturity()</code> and <code>findContradictions()</code> to see how far a section has
	been checked and where sources disagree, rather than reading an empty result as agreement.
</p>

<p class="mt-8 text-sm"><a href={href('/docs/mcp/')}>Reach it from an agent over MCP →</a></p>
