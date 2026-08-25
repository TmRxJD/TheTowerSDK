<script lang="ts">
	import { BOT_UPGRADES_DATA, estimateBotUptimeFraction, uwStoneChartData } from 'thetowersdk/data';

	/** Same wave-time constant the Uptime Calculator uses for Death Wave. */
	const DW_SECONDS_PER_WAVE = 4;

	const goldenBot = BOT_UPGRADES_DATA.find((bot) => bot.name === 'Golden Bot')!;
	const deathWave = Object.values(uwStoneChartData).find((weapon) => weapon.name === 'Death Wave');
	const dwCooldownStat = deathWave?.stats.find((stat) => stat.name === 'Cooldown');
	const dwQuantityStat = deathWave?.stats.find((stat) => stat.name === 'Quantity');

	const dwCdOptions =
		dwCooldownStat?.levels.map((entry) => ({
			level: entry.level,
			label: `Lv ${entry.level} — ${entry.value}`,
			seconds: Number(String(entry.value).replace(/s$/i, ''))
		})) ?? [];

	const dwQtyOptions =
		dwQuantityStat?.levels.map((entry) => {
			const waves = Number(String(entry.value).replace(/^x/i, '')) || 1;
			return {
				level: entry.level,
				label: `Lv ${entry.level} — ${entry.value} (${waves * DW_SECONDS_PER_WAVE}s)`,
				waves
			};
		}) ?? [];

	const gbCdOptions = Object.entries(goldenBot.stats.Cooldown.levels)
		.map(([level, value]) => ({
			level: Number(level),
			label: `Lv ${level} — ${value}`,
			seconds: Number(String(value).replace(/s$/i, ''))
		}))
		.sort((a, b) => a.level - b.level);

	const gbDurOptions = Object.entries(goldenBot.stats.Duration.levels)
		.map(([level, value]) => ({
			level: Number(level),
			label: `Lv ${level} — ${value}`,
			seconds: Number(String(value).replace(/s$/i, ''))
		}))
		.sort((a, b) => a.level - b.level);

	let dwCdLevel = $state(
		String(dwCdOptions.find((o) => o.level === 8)?.level ?? dwCdOptions[0]?.level ?? 0)
	);
	let dwQtyLevel = $state(
		String(dwQtyOptions.find((o) => o.level === 3)?.level ?? dwQtyOptions[0]?.level ?? 0)
	);
	let gbCdLevel = $state(
		String(gbCdOptions.find((o) => o.level === 10)?.level ?? gbCdOptions[0]?.level ?? 0)
	);
	let gbDurLevel = $state(
		String(gbDurOptions.find((o) => o.level === 10)?.level ?? gbDurOptions[0]?.level ?? 0)
	);

	let dwCd = $derived(dwCdOptions.find((o) => String(o.level) === dwCdLevel)?.seconds ?? 0);
	let dwWaves = $derived(dwQtyOptions.find((o) => String(o.level) === dwQtyLevel)?.waves ?? 0);
	let dwDur = $derived(dwWaves * DW_SECONDS_PER_WAVE);
	let gbCd = $derived(gbCdOptions.find((o) => String(o.level) === gbCdLevel)?.seconds ?? 0);
	let gbDur = $derived(gbDurOptions.find((o) => String(o.level) === gbDurLevel)?.seconds ?? 0);
	let gbUptime = $derived(estimateBotUptimeFraction(`${gbDur}s`, `${gbCd}s`));
	let dwUptime = $derived(dwCd > 0 ? dwDur / dwCd : 0);

	function formatSeconds(n: number): string {
		if (!Number.isFinite(n) || n <= 0) return '—';
		return Number.isInteger(n) ? `${n}s` : `${n.toFixed(1)}s`;
	}

	function formatPct(fraction: number): string {
		if (!Number.isFinite(fraction) || fraction <= 0) return '—';
		return `${(fraction * 100).toFixed(1)}%`;
	}
</script>

<div class="grid gap-4 sm:grid-cols-2">
	<label class="block text-sm text-muted">
		Death Wave cooldown
		<select
			class="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-fg"
			bind:value={dwCdLevel}
		>
			{#each dwCdOptions as option (option.level)}
				<option value={String(option.level)}>{option.label}</option>
			{/each}
		</select>
	</label>
	<label class="block text-sm text-muted">
		Death Wave quantity (waves)
		<select
			class="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-fg"
			bind:value={dwQtyLevel}
		>
			{#each dwQtyOptions as option (option.level)}
				<option value={String(option.level)}>{option.label}</option>
			{/each}
		</select>
	</label>
	<label class="block text-sm text-muted">
		Golden Bot cooldown
		<select
			class="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-fg"
			bind:value={gbCdLevel}
		>
			{#each gbCdOptions as option (option.level)}
				<option value={String(option.level)}>{option.label}</option>
			{/each}
		</select>
	</label>
	<label class="block text-sm text-muted">
		Golden Bot duration
		<select
			class="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-fg"
			bind:value={gbDurLevel}
		>
			{#each gbDurOptions as option (option.level)}
				<option value={String(option.level)}>{option.label}</option>
			{/each}
		</select>
	</label>
</div>

<div class="mt-4 overflow-x-auto rounded-md border border-line/70 bg-bg/40">
	<table class="w-full min-w-[20rem] text-left text-sm">
		<thead class="border-b border-line/70 text-xs uppercase tracking-wide text-muted">
			<tr>
				<th class="px-3 py-2 font-medium">Source</th>
				<th class="px-3 py-2 font-medium">Cooldown</th>
				<th class="px-3 py-2 font-medium">Duration</th>
				<th class="px-3 py-2 font-medium">Uptime</th>
			</tr>
		</thead>
		<tbody class="font-mono text-fg">
			<tr class="border-b border-line/50">
				<td class="px-3 py-2 font-sans text-fg">Death Wave</td>
				<td class="px-3 py-2 text-gold">{formatSeconds(dwCd)}</td>
				<td class="px-3 py-2 text-accent">
					{formatSeconds(dwDur)}
					<span class="font-sans text-xs text-muted"> ({dwWaves} × {DW_SECONDS_PER_WAVE}s)</span>
				</td>
				<td class="px-3 py-2 text-fg">{formatPct(dwUptime)}</td>
			</tr>
			<tr>
				<td class="px-3 py-2 font-sans text-fg">Golden Bot</td>
				<td class="px-3 py-2 text-gold">{formatSeconds(gbCd)}</td>
				<td class="px-3 py-2 text-accent">{formatSeconds(gbDur)}</td>
				<td class="px-3 py-2 text-fg">{formatPct(gbUptime)}</td>
			</tr>
		</tbody>
	</table>
</div>
