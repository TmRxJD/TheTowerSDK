<script lang="ts">
	import { homeExamples, moreExamples } from '$lib/content';
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import GlassPanel from '$lib/ui/GlassPanel.svelte';
	import LabsDemo from '$lib/demos/LabsDemo.svelte';
	import SyncUptimeDemo from '$lib/demos/SyncUptimeDemo.svelte';
	import WaveDemo from '$lib/demos/WaveDemo.svelte';
	import SaveDemo from '$lib/demos/SaveDemo.svelte';
	import ModuleCostDemo from '$lib/demos/ModuleCostDemo.svelte';
	import CardGemDemo from '$lib/demos/CardGemDemo.svelte';
	import EffectivePathDemo from '$lib/demos/EffectivePathDemo.svelte';
	import GlossaryDemo from '$lib/demos/GlossaryDemo.svelte';

	const paired = [
		{ ...homeExamples[0], Demo: LabsDemo, panel: 'Live' },
		{ ...homeExamples[1], Demo: SyncUptimeDemo, panel: 'Live' },
		{ ...homeExamples[2], Demo: WaveDemo, panel: 'Live' },
		{ ...homeExamples[3], Demo: SaveDemo, panel: 'Sample' },
		{ ...moreExamples[0], Demo: ModuleCostDemo, panel: 'Live' },
		{ ...moreExamples[1], Demo: CardGemDemo, panel: 'Live' },
		{ ...moreExamples[2], Demo: EffectivePathDemo, panel: 'Live' },
		{ ...moreExamples[3], Demo: GlossaryDemo, panel: 'Live' }
	] as const;
</script>

<svelte:head>
	<title>Examples · TheTowerSDK</title>
</svelte:head>

<p class="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Examples</p>
<h1 class="mt-2 text-3xl font-semibold">Examples</h1>
<p class="mt-2 max-w-2xl text-muted">
	Labs, cards, uptime, enemy stats, saves, modules, Effective Paths, and the package glossary.
</p>

<div class="mt-8 space-y-10">
	{#each paired as item (item.title)}
		{@const Demo = item.Demo}
		<section>
			<h2 class="text-lg font-medium">{item.title}</h2>
			<p class="mt-1 mb-4 text-sm text-muted">{item.blurb}</p>
			<div class="grid gap-4 lg:grid-cols-2">
				<GlassPanel>
					<p class="mb-3 text-xs font-semibold tracking-wide text-accent uppercase">{item.panel}</p>
					<svelte:boundary>
						{#snippet failed(error)}
							<p class="text-sm text-muted">
								This demo failed to load
								{#if error instanceof Error}
									({error.message})
								{/if}
								. The code sample still works.
							</p>
						{/snippet}
						<Demo />
					</svelte:boundary>
				</GlassPanel>
				<GlassPanel>
					<p class="mb-3 text-xs font-semibold tracking-wide text-accent uppercase">Code</p>
					<CodeBlock code={item.code} />
				</GlassPanel>
			</div>
		</section>
	{/each}
</div>
