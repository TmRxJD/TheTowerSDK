<script lang="ts">
	import { LAB_CATALOG, type LabCatalogRecord } from 'thetowersdk/data';
	import { formatNumberForDisplay } from 'thetowersdk/formatting';

	const defaultLab =
		LAB_CATALOG.find((lab) => lab.name === 'Attack Speed')
		?? LAB_CATALOG.find((lab) => lab.slug === 'attack_speed')
		?? LAB_CATALOG[0];

	let labName = $state(defaultLab?.name ?? '');
	let currentLevel = $state('0');
	let steps = $state('10');

	let lab = $derived(
		LAB_CATALOG.find((item) => item.name === labName || item.slug === labName) ?? LAB_CATALOG[0]
	) as LabCatalogRecord | undefined;

	let levelOptions = $derived(
		Array.from({ length: (lab?.levels.length ?? 0) + 1 }, (_, i) => String(i))
	);
	const stepOptions = ['1', '5', '10', '15', '20', '25', '50'] as const;

	let result = $derived.by(() => {
		if (!lab) return null;
		const maxLevel = lab.levels.length;
		const from = Math.max(0, Math.min(Number(currentLevel) || 0, maxLevel));
		const ahead = Math.max(1, Number(steps) || 1);
		const to = Math.max(from, Math.min(from + ahead, maxLevel));
		const slice = lab.levels.slice(from, to);
		const coins = slice.reduce((sum, level) => sum + level.cost, 0);
		const seconds = slice.reduce((sum, level) => sum + durationToSeconds(level.duration), 0);
		return {
			from,
			to,
			count: slice.length,
			coins,
			seconds,
			maxLevel
		};
	});

	/** Lab durations are `H:MM:SS` (hours may exceed 24). */
	function durationToSeconds(raw: string): number {
		const parts = raw.split(':').map((part) => Number(part));
		if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0;
		const [hours, minutes, seconds] = parts;
		return hours * 3600 + minutes * 60 + seconds;
	}

	function formatDuration(totalSeconds: number): string {
		if (totalSeconds <= 0) return '—';
		const days = Math.floor(totalSeconds / 86400);
		const hours = Math.floor((totalSeconds % 86400) / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
	<label class="block text-sm text-muted">
		Lab
		<select
			class="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-fg"
			bind:value={labName}
		>
			{#each LAB_CATALOG as option, i (`${option.slug}-${i}`)}
				<option value={option.name}>{option.name}</option>
			{/each}
		</select>
	</label>
	<label class="block text-sm text-muted">
		Current level
		<select
			class="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-fg"
			bind:value={currentLevel}
		>
			{#each levelOptions as option (option)}
				<option value={option}>{option}</option>
			{/each}
		</select>
	</label>
	<label class="block text-sm text-muted">
		Levels ahead
		<select
			class="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-fg"
			bind:value={steps}
		>
			{#each stepOptions as option (option)}
				<option value={option}>{option}</option>
			{/each}
		</select>
	</label>
</div>

{#if result}
	<dl class="mt-4 grid gap-3 sm:grid-cols-2">
		<div class="rounded-md border border-line/70 bg-bg/40 p-3">
			<dt class="text-xs uppercase tracking-wide text-muted">
				Coin cost (levels {result.from} → {result.to})
			</dt>
			<dd class="font-mono text-2xl text-gold">{formatNumberForDisplay(result.coins)}</dd>
		</div>
		<div class="rounded-md border border-line/70 bg-bg/40 p-3">
			<dt class="text-xs uppercase tracking-wide text-muted">Research time</dt>
			<dd class="font-mono text-2xl text-accent">{formatDuration(result.seconds)}</dd>
		</div>
	</dl>
	<p class="mt-3 text-xs text-muted">
		{result.count} level{result.count === 1 ? '' : 's'} · lab max {result.maxLevel}
	</p>
{/if}
