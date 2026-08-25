<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		class: className = ''
	}: {
		children: Snippet;
		class?: string;
	} = $props();
</script>

<div
	class={[
		'rounded-xl border border-line/80 bg-panel/70 p-5 shadow-[0_0_0_1px_rgba(61,155,253,0.04)] backdrop-blur-sm',
		className
	]}
>
	{@render children()}
</div>
