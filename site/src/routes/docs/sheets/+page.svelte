<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Spreadsheets · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Spreadsheets</h1>
<p class="mt-3 text-muted">
	Reading a Google Sheet, with the two ways a sheet lies to you already handled. Transport-agnostic:
	you supply something that can fetch a range, so the package never depends on
	<code>googleapis</code> or on any particular auth library.
</p>

<div class="mt-6">
	<CodeBlock
		code={`import { TowerSheets, columnIndexToLabel, buildA1Range } from 'thetowersdk/sheets'

const sheets = new TowerSheets(transport)

// Padded to the width you asked for, so a short row is not a missing column.
const grid = await sheets.readGrid('SHEET_ID', 'Labs!A1:H200')

columnIndexToLabel(0)    // 'A'
columnIndexToLabel(26)   // 'AA'   — bijective base-26, not A..Z then AA
columnIndexToLabel(701)  // 'ZZ'
buildA1Range('My Sheet', 'A1', 'H200')  // "'My Sheet'!A1:H200"`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">The two lies</h2>
<p class="mt-3 text-muted">
	<strong>A short row means unknown, not zero.</strong> The API truncates trailing empty cells, so a
	row that ends early is a row you know nothing about past that point.
	<code>readGrid</code> pads to the requested width so the difference stays visible.
</p>
<p class="mt-3 text-muted">
	<strong>A spilled cell carries no formula.</strong> Anything produced by <code>ARRAYFORMULA</code>
	or a mirror reads as empty in formula mode, so a formula-mode scan reports far less than the sheet contains.
	<code>readFormulas</code> reports the spill rather than silently returning nothing.
</p>

<h2 class="mt-10 text-xl font-semibold">Writes are opt-in</h2>
<p class="mt-3 text-muted">
	A transport is read-only unless it is built with writes enabled, and asking a read-only one to
	write throws instead of failing quietly against someone else's spreadsheet.
</p>

<h2 class="mt-10 text-xl font-semibold">A googleapis transport</h2>
<p class="mt-3 text-muted">
	The package ships a template you copy into your own project — it needs a Google service account
	and the sheet shared with that account's email address. Setup, scopes and the credentials template
	are in the repository's <code>docs/GOOGLE_SHEETS.md</code>.
</p>

<p class="mt-8 text-sm"><a href={href('/docs/bots/')}>Bots →</a></p>
