<script lang="ts">
	import { href } from '$lib/paths';

	let { error, status }: { error: App.Error; status: number } = $props();
</script>

<h1 class="text-3xl font-semibold">{status}</h1>
<p class="mt-2 text-muted">{error?.message ?? 'Something went wrong.'}</p>
<p class="mt-4"><a href={href('/')}>Back to TheTowerSDK</a></p>
