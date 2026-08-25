<script lang="ts">
	/** Illustrates extractor shapes — decode runs in Node on a real playerInfo.dat. */
	const sample = {
		labs: { researchedCount: 142, maxedCount: 38, bySlug: { attack_speed: 45, labs_speed: 99 } },
		modules: {
			owned: 48,
			equipped: {
				cannon: 'Dimension Core',
				armor: 'Anti-Cube Portal',
				generator: 'Galaxy Compressor',
				core: 'Sharp Fortitude'
			}
		},
		cards: { unlocked: 62, masteriesStarted: 11 },
		ultimateWeapons: {
			unlocked: ['Golden Tower', 'Black Hole', 'Death Wave', 'Chrono Field'],
			stonesSpent: 18420
		},
		bots: { unlocked: ['Golden Bot', 'Flame Bot', 'Thunder Bot'], medalsSpent: 3200 },
		vault: { harmonyNodes: 18, powerNodes: 12 },
		relics: { owned: 27 },
		lifetime: { totalWaves: 2_450_000, highestTier: { farm: 18, tournament: 'Champion' } },
		battleReports: { recentRuns: 40 },
		warnings: ['cards extractor: save predates card mastery fields']
	};
</script>

<div class="space-y-3 text-sm">
	<p class="text-muted">
		Decode <code>playerInfo.dat</code>, then pull labs, modules, cards, ultimate weapons, bots,
		vault, relics, lifetime stats, and battle reports from the same root:
	</p>
	<pre
		class="overflow-x-auto rounded-md border border-line/70 bg-bg/40 p-3 font-mono text-xs text-fg/90"
	>{JSON.stringify(sample, null, 2)}</pre>
	<p class="text-xs text-muted">
		<code>thetowersdk/node</code> decodes the file;
		<code>thetowersdk/save</code> extractors return typed slices (plus
		<code>warnings</code> when a field is missing or legacy).
	</p>
</div>
