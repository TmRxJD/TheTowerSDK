<script lang="ts">
	/**
	 * A miniature TowerAI chat panel.
	 *
	 * Each answer shows the pipeline that produced it — resolve shorthand,
	 * retrieve chunks, pull live catalog values, compose — because that is the
	 * part worth copying. Curated prose supplies meaning; the package supplies
	 * numbers, so a cost never goes stale inside a sentence.
	 */
	import { uwStoneChartData } from 'thetowersdk/data';
	import { formatNumberForDisplay } from 'thetowersdk/formatting';

	type Turn = {
		role: 'user' | 'assistant';
		text: string;
		pipeline?: string[];
		/** Label/value pairs rendered as an aligned list rather than prose. */
		rows?: [string, string][];
		total?: [string, string];
	};

	function stat(weaponName: string, statName: string) {
		const weapon = Object.values(uwStoneChartData).find((entry) => entry.name === weaponName);
		return weapon?.stats?.find((entry) => entry.name === statName);
	}

	function stonesToMax(weaponName: string, statName: string): string {
		const levels = stat(weaponName, statName)?.levels ?? [];
		return formatNumberForDisplay(
			levels.reduce((sum, level) => sum + (typeof level.cost === 'number' ? level.cost : 0), 0)
		);
	}

	type Answer = { text: string; rows?: [string, string][]; total?: [string, string] };

	type Entry = {
		match: RegExp;
		pipeline: () => string[];
		answer: () => Answer;
	};

	/** Every stat on a weapon, plus the sum — "to max" means all of them. */
	function weaponBreakdown(weaponName: string): Answer {
		const weapon = Object.values(uwStoneChartData).find((entry) => entry.name === weaponName);
		const stats = weapon?.stats ?? [];

		let grand = 0;
		const rows: [string, string][] = stats.map((entry) => {
			const sum = (entry.levels ?? []).reduce(
				(acc, level) => acc + (typeof level.cost === 'number' ? level.cost : 0),
				0
			);
			grand += sum;
			return [`${entry.name} (${entry.levels?.length ?? 0} lv)`, formatNumberForDisplay(sum)];
		});

		return {
			text: `Maxing every stat on ${weaponName} costs ${formatNumberForDisplay(grand)} stones.`,
			rows,
			total: ['All stats', formatNumberForDisplay(grand)]
		};
	}

	const ENTRIES: Entry[] = [
		{
			match: /\bgt\b|golden tower/i,
			pipeline: () => [
				'oracle_expand → "GT" resolves to Golden Tower',
				'kb.retrieve → 1 chunk: Golden Tower stone costs',
				'thetowersdk/data → uwStoneChartData.GoldenTower',
				`compose → ${(Object.values(uwStoneChartData).find((w) => w.name === 'Golden Tower')?.stats ?? []).length} stats summed`
			],
			answer: () => weaponBreakdown('Golden Tower')
		},
		{
			match: /\bdw\b|death wave/i,
			pipeline: () => [
				'oracle_expand → "DW" resolves to Death Wave',
				'kb.retrieve → 1 chunk: Death Wave stone costs',
				'thetowersdk/data → uwStoneChartData.DeathWave',
				`compose → ${(Object.values(uwStoneChartData).find((w) => w.name === 'Death Wave')?.stats ?? []).length} stats summed`
			],
			answer: () => weaponBreakdown('Death Wave')
		},
		{
			match: /currenc|shard|gem/i,
			pipeline: () => [
				'kb.retrieve → 1 chunk: Module currencies',
				'claimType → objective',
				'compose → no catalog lookup needed'
			],
			answer: () => ({
				text: 'Modules draw on five currencies, and two of them are pooled differently than people expect.',
				rows: [
					['Coins', 'Level upgrades'],
					['Module shards', 'Level upgrades — separate pool per type'],
					['Reroll shards', 'Sub-effect rerolls — one shared pool'],
					['Stones', 'Assist rarity and efficiency'],
					['Gems', 'Buying modules']
				]
			})
		},
		{
			match: /merg|fodder/i,
			pipeline: () => [
				'kb.retrieve → 1 chunk: Module merging',
				'oracle_traps → "level is recalculated" flagged as a known misread',
				'compose → curated prose only'
			],
			answer: () => ({
				text: 'The first module selected in a merge chain keeps its level and sub-effects; the rest are fodder. Level transfers directly rather than being recalculated.'
			})
		},
		{
			match: /theme|skin/i,
			pipeline: () => [
				'kb.retrieve → 1 chunk: Theme coin bonus',
				'thetowersdk/data → THEME_PASSIVE_FORMULA',
				'compose → formula rendered from the catalog'
			],
			answer: () => ({
				text: 'Owned themes pay out whether or not they are equipped. Coin Bonus = 1 + the sum of these, times how many you own in each category.',
				rows: [
					['Tower', '0.004 each'],
					['Background', '0.008 each'],
					['Menu', '0.006 each'],
					['Guardian', '0.006 each']
				]
			})
		}
	];

	const SUGGESTIONS = ['How many stones to max GT?', 'What currencies do modules use?'];

	let turns = $state<Turn[]>([
		{
			role: 'assistant',
			text: 'Hey there! Ask me a question about The Tower.'
		}
	]);
	let draft = $state('');
	let thinking = $state(false);

	function respond(question: string): Turn {
		const entry = ENTRIES.find((candidate) => candidate.match.test(question));

		if (!entry) {
			return {
				role: 'assistant',
				text: 'That is not in this demo knowledge base. A real one answers whatever you curate into it.',
				pipeline: ['kb.retrieve → 0 chunks above threshold', 'compose → declined']
			};
		}

		const answer = entry.answer();
		return {
			role: 'assistant',
			text: answer.text,
			rows: answer.rows,
			total: answer.total,
			pipeline: entry.pipeline()
		};
	}

	function send(question: string) {
		const trimmed = question.trim();
		if (!trimmed || thinking) return;

		turns = [...turns, { role: 'user', text: trimmed }];
		draft = '';
		thinking = true;

		setTimeout(() => {
			turns = [...turns, respond(trimmed)];
			thinking = false;
		}, 350);
	}
</script>

<div class="flex h-[28rem] flex-col rounded-md border border-line/70 bg-bg/40">
	<div class="flex-1 space-y-3 overflow-y-auto p-3">
		{#each turns as turn, i (i)}
			{#if turn.role === 'user'}
				<div class="flex justify-end">
					<p class="max-w-[85%] rounded-lg rounded-br-sm bg-accent/15 px-3 py-2 text-sm text-fg">
						{turn.text}
					</p>
				</div>
			{:else}
				<div class="flex justify-start">
					<div class="max-w-[90%]">
						{#if turn.pipeline}
							<ol
								class="mb-2 space-y-0.5 border-l-2 border-line pl-2 font-mono text-[11px] text-muted"
							>
								{#each turn.pipeline as step (step)}
									<li>{step}</li>
								{/each}
							</ol>
						{/if}
						<div class="rounded-lg rounded-bl-sm bg-panel/70 px-3 py-2 text-sm text-fg/90">
							<p>{turn.text}</p>

							{#if turn.rows}
								<dl class="mt-2 space-y-0.5 font-mono text-xs">
									{#each turn.rows as [label, value] (label)}
										<div class="flex items-baseline justify-between gap-3">
											<dt class="text-muted">{label}</dt>
											<dd class="shrink-0 text-fg/90">{value}</dd>
										</div>
									{/each}
									{#if turn.total}
										<div
											class="mt-1 flex items-baseline justify-between gap-3 border-t border-line/50 pt-1"
										>
											<dt class="text-fg/80">{turn.total[0]}</dt>
											<dd class="shrink-0 font-semibold text-gold">{turn.total[1]}</dd>
										</div>
									{/if}
								</dl>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		{/each}

		{#if thinking}
			<p class="text-xs text-muted">Retrieving…</p>
		{/if}
	</div>

	<div class="border-t border-line/70 p-2">
		<div class="mb-2 flex flex-wrap gap-1.5">
			{#each SUGGESTIONS as suggestion (suggestion)}
				<button
					type="button"
					class="rounded-md border border-line/70 px-2 py-1 text-[11px] text-muted hover:text-fg"
					onclick={() => send(suggestion)}
				>
					{suggestion}
				</button>
			{/each}
		</div>
		<form
			class="flex gap-2"
			onsubmit={(event) => {
				event.preventDefault();
				send(draft);
			}}
		>
			<input
				type="text"
				class="flex-1 rounded-md border border-line bg-bg px-3 py-2 text-sm text-fg"
				bind:value={draft}
				placeholder="Ask about a mechanic…"
			/>
			<button type="submit" class="btn-primary rounded-md px-3 py-2 text-sm font-medium"
				>Send</button
			>
		</form>
	</div>
</div>

<p class="mt-3 rounded-md border border-line/60 bg-panel/40 p-2 text-xs text-muted">
	<strong class="text-fg/80">Example only.</strong> AI assistants are known to make mistakes, and this
	demo runs on a handful of chunks written for illustration. Do not rely on it for real answers about
	the game.
</p>
