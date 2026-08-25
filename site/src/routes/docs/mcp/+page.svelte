<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { mcpJson } from '$lib/content';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>MCP &amp; AI · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">MCP &amp; AI</h1>
<p class="mt-3 text-muted">
	The package ships an MCP server. Point Cursor, Claude Code, or Copilot at it after install so the
	assistant can use real exports, catalogs, saves, planners, and wiki pages.
</p>

<div class="mt-6">
	<CodeBlock code={mcpJson} />
</div>

<h2 class="mt-8 text-xl font-medium">What The Server Can Do</h2>
<ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
	<li>
		<code>list_exports</code> / <code>get_export</code> — what exists, one table previewed rather than
		dumped
	</li>
	<li>
		<code>describe_schema</code> — a table's declared shape, not one guessed from a sample row
	</li>
	<li>
		<code>decode_save</code> / <code>run_extractor</code> — what is in a <code>playerInfo.dat</code>
	</li>
	<li><code>define_term</code> — what an acronym means, and whether it is ambiguous</li>
	<li><code>plan_effective_path</code> — a path, with the candidates it excluded and why</li>
	<li>
		<code>wiki_search</code> / <code>wiki_page</code> — how a mechanic behaves, from the community wiki
	</li>
	<li>
		<code>sdk_graph_render</code> — the mechanics graph as a <strong>Mermaid</strong> diagram, not an
		image
	</li>
</ul>

<h2 class="mt-10 text-xl font-medium">The Tower Oracle</h2>
<p class="mt-2 text-sm text-muted">
	A knowledge graph of game mechanics: nodes are mechanics, edges are the relationships between
	them, and every claim records its source. It answers how a mechanic behaves, what it interacts
	with, and the specific ways it has been misread before.
</p>
<ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
	<li>
		<code>oracle_traps</code> — <strong>call first.</strong> Every known way this mechanic has been got
		wrong
	</li>
	<li>
		<code>oracle_expand</code> — what an acronym means, from a closed set (<code>GT+</code>,
		<code>CF</code>, <code>DW</code>)
	</li>
	<li>
		<code>oracle_brief</code> / <code>oracle_get</code> / <code>oracle_search</code> — orientation, one
		node, or find it by phrasing
	</li>
	<li><code>oracle_map</code> — how a mechanic connects to the rest of the game</li>
	<li>
		<code>oracle_footguns</code> / <code>oracle_coverage</code> / <code>oracle_contradictions</code>
	</li>
</ul>
<p class="mt-3 text-sm text-muted">
	Every claim carries a <code>claimType</code> of <code>objective</code> or <code>sentiment</code>,
	so measured values and community opinion stay distinguishable. <code>oracle_coverage</code>
	reports how well a compartment is covered, and <code>oracle_contradictions</code> surfaces claims that
	disagree, ranked by source authority.
</p>

<h2 class="mt-10 text-xl font-medium">The Sheet Oracle</h2>
<p class="mt-2 text-sm text-muted">
	Reads a live Google Sheet through MCP, so an assistant can work from a spreadsheet's own
	calculations. Point it at any sheet shared with your service account.
</p>
<ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
	<li><code>sheet_info</code> — sheet id, version, writable flag. Call first</li>
	<li><code>eval_formula</code> — evaluate a formula in the sheet and return what it computes</li>
	<li><code>read_range</code> — values or formulas in A1 notation</li>
	<li><code>list_lambdas</code> — named functions and their parameter order</li>
	<li><code>inspect_tab_ui</code> — the live label and value control panel for a tab</li>
	<li><code>write_cells</code> — set inputs to a known state before reading a result</li>
</ul>

<h3 class="mt-6 text-lg font-medium">Registering a Service Account</h3>
<p class="mt-2 text-sm text-muted">
	The sheet tools authenticate as a Google Cloud <strong>service account</strong> — a robot identity with
	its own email address, which reaches the sheets you share with it.
</p>
<ol class="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted">
	<li>In the Google Cloud console, create or pick a project.</li>
	<li>Enable the <strong>Google Sheets API</strong> for it.</li>
	<li>
		<strong>IAM &amp; Admin → Service Accounts → Create.</strong> Access is granted per-sheet by sharing,
		so no project roles are needed.
	</li>
	<li>
		<strong>Keys → Add key → Create new key → JSON.</strong> It downloads once. Treat it as a password
		and keep it out of version control.
	</li>
	<li>Copy the account email — <code>something@project-id.iam.gserviceaccount.com</code>.</li>
	<li>
		<strong>Share your spreadsheet with that email.</strong> Viewer is enough to read; Editor is
		required for <code>eval_formula</code> and <code>write_cells</code>, which write to a scratch
		cell.
	</li>
	<li>Point the tools at the key file and sheet id via environment variables.</li>
</ol>
<p class="mt-3 text-sm text-muted">
	If a read comes back empty, check the sharing first — an unshared sheet reads as an empty range
	rather than a permissions error. To revoke a key, delete it in the console; sharing stays intact
	for its replacement.
</p>

<p class="mt-8 text-sm">
	<a href={href('/ai/')}>Prompts And Example Results →</a>
	·
	<a href={href('/docs/ags/')}>ACS →</a>
</p>
