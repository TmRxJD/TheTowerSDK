<script lang="ts">
	import { INSTALL_CMD, SDK_VERSION } from '$lib/links';

	let {
		command = INSTALL_CMD,
		showVersion = true
	}: {
		command?: string;
		showVersion?: boolean;
	} = $props();

	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(command);
		copied = true;
		window.setTimeout(() => {
			copied = false;
		}, 1400);
	}
</script>

<div
	class="inline-flex max-w-full flex-wrap items-center gap-2 rounded-md border border-line/80 bg-panel/60 py-1.5 pr-1.5 pl-3 font-mono text-sm text-muted"
>
	<code class="text-fg/90">{command}</code>
	{#if showVersion}
		<span aria-hidden="true">·</span>
		<span>v{SDK_VERSION}</span>
	{/if}
	<button
		type="button"
		class="ml-1 rounded border border-line bg-bg/80 px-2 py-0.5 text-xs text-muted hover:border-accent hover:text-fg"
		onclick={copy}
	>
		{copied ? 'Copied' : 'Copy'}
	</button>
</div>
