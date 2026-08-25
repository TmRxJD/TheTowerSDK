<script lang="ts">
	let { code, label = 'Copy' }: { code: string; label?: string } = $props();

	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(code);
		copied = true;
		window.setTimeout(() => {
			copied = false;
		}, 1400);
	}
</script>

<div class="relative overflow-hidden rounded-xl border border-line bg-[#10161d]">
	<button
		type="button"
		class="absolute top-2 right-2 rounded-md border border-line bg-panel px-2 py-1 text-xs text-muted hover:text-fg"
		onclick={copy}
	>
		{copied ? 'Copied' : label}
	</button>
	<pre class="overflow-x-auto p-4 pt-10 text-[0.8rem] leading-relaxed text-fg/90"><code>{code}</code></pre>
</div>
