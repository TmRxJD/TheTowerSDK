<script lang="ts">
	import { CALCULATOR_BUILDERS } from 'thetowersdk/builders';

	/*
	 * Nothing here knows what any calculator is.
	 *
	 * The picker, the inputs and their bounds all come from the builder's own declaration, so this
	 * component renders a calculator it has never heard of — which is the whole claim the page makes.
	 */
	const builders = [...CALCULATOR_BUILDERS].sort((a, b) => a.title.localeCompare(b.title));

	let selectedId = $state(builders[0].id);
	let builder = $derived(builders.find((entry) => entry.id === selectedId) ?? builders[0]);

	/** Reset to the builder's own defaults whenever the picker changes. */
	const defaultsOf = (entry: (typeof builders)[number]) => ({
		...(entry.defaults as Record<string, unknown>)
	});

	let values = $state<Record<string, unknown>>(defaultsOf(builders[0]));
	let lastId = $state(builders[0].id);
	$effect(() => {
		if (builder.id !== lastId) {
			lastId = builder.id;
			values = defaultsOf(builder);
		}
	});

	/*
	 * `CALCULATOR_BUILDERS` is a union of 15 differently-typed calculators, so across the union the
	 * parameter of `normalize` intersects to `undefined` and no concrete value satisfies it. A
	 * caller who knows which calculator it wants gets full typing from `findCalculatorBuilder`;
	 * this component deliberately does not know, which is the point of it, so the boundary is
	 * crossed once, here, rather than by loosening anything the package exports.
	 */
	type AnyBuilder = {
		normalize: (input: Record<string, unknown>) => Record<string, unknown>;
		compute: (input: Record<string, unknown>) => unknown;
	};

	let result = $derived.by(() => {
		const untyped = builder as unknown as AnyBuilder;
		try {
			return untyped.compute(untyped.normalize(values));
		} catch (error) {
			return { error: error instanceof Error ? error.message : String(error) };
		}
	});

	const numberFields = $derived(builder.fields.filter((field) => field.kind === 'number'));
</script>

<div>
	<label class="block text-sm text-muted" for="builder-pick">Calculator</label>
	<select
		id="builder-pick"
		class="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-fg"
		bind:value={selectedId}
	>
		{#each builders as entry (entry.id)}
			<option value={entry.id}>{entry.title}</option>
		{/each}
	</select>
	<p class="mt-2 text-xs text-muted">{builder.summary}</p>

	<div class="mt-4 grid gap-3 sm:grid-cols-2">
		{#each numberFields as field (field.key)}
			<div>
				<label class="block text-xs text-muted" for={`f-${field.key}`}>
					{field.label}
					{#if field.max !== undefined}
						<span class="text-accent"> (max {field.max})</span>
					{/if}
				</label>
				<input
					id={`f-${field.key}`}
					type="number"
					class="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-fg"
					min={field.min}
					max={field.max}
					bind:value={values[field.key]}
				/>
			</div>
		{/each}
	</div>

	{#if builder.fields.length !== numberFields.length}
		<p class="mt-3 text-xs text-muted">
			This calculator also takes {builder.fields.length - numberFields.length} non-numeric field(s), left
			at their defaults here.
		</p>
	{/if}

	<pre
		class="mt-4 max-h-64 overflow-auto rounded-md border border-line/70 bg-bg px-3 py-2 text-xs">{JSON.stringify(
			result,
			null,
			2
		).slice(0, 1200)}</pre>
</div>
