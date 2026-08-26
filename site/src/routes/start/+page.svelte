<script lang="ts">
	import { mcpJson, SHOW_GOVERNANCE } from '$lib/content';
	import { INSTALL_CMD, LINKS } from '$lib/links';
	import { href } from '$lib/paths';
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import GlassPanel from '$lib/ui/GlassPanel.svelte';
</script>

<svelte:head>
	<title>Get started · TheTowerSDK</title>
</svelte:head>

<p class="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Start</p>
<h1 class="mt-2 text-3xl font-semibold">Get Started</h1>
<p class="mt-2 max-w-2xl text-muted">
	Install the package, point your assistant at the MCP server, and start from a working example.
	Each step below stands on its own — the first is all you need to write code.
</p>

<div class="mt-8 max-w-3xl space-y-10">
	<section>
		<h2 class="text-xl font-medium">1. Install TheTowerSDK</h2>
		<p class="mt-2 text-sm text-muted">
			Add the package to your app or tool repo. Pin a version when you want frozen game numbers.
		</p>
		<div class="mt-3">
			<CodeBlock code={INSTALL_CMD} />
		</div>
		<p class="mt-2 text-sm text-muted">
			Package:
			<a href={LINKS.npm}>npmjs.com/package/thetowersdk</a>
			· source:
			<a href={LINKS.github}>GitHub</a>
		</p>
	</section>

	<section>
		<h2 class="text-xl font-medium">2. Register The MCP Server</h2>
		<p class="mt-2 text-sm text-muted">
			Point Cursor, Claude Code, or Copilot at the package MCP server. Your assistant can then list
			exports, read catalogs, decode saves, plan Effective Paths, and pull wiki pages while it
			works.
		</p>
		<div class="mt-3">
			<CodeBlock code={mcpJson} />
		</div>
		<p class="mt-2 text-sm text-muted">
			Put that under your editor’s MCP config (for example Cursor
			<code>.mcp.json</code>
			or the IDE MCP settings). Restart the IDE MCP session after saving. Docs:
			<a href={href('/docs/mcp/')}>MCP &amp; AI</a>.
		</p>
	</section>

	{#if SHOW_GOVERNANCE}
		<section>
			<!-- Unnumbered: the numbered steps must stay 1–5 whether or not this section renders. -->
			<h2 class="text-xl font-medium">Optional — Agentic Cognition Substrate (ACS)</h2>
			<p class="mt-2 text-sm text-muted">
				ACS governs how an AI may change your repo (commits, staging, status). Use it when you want
				structured AI development on Tower tools. TheTowerSDK is the game layer; ACS is the workflow
				layer.
			</p>
			<ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
				<li>
					Overview:
					<a href={LINKS.agsSite}>Agentic Cognition Substrate site</a>
				</li>
				<li>
					How it fits with this package:
					<a href={href('/docs/ags/')}>ACS docs</a>
					·
					<a href={href('/ai/')}>AI &amp; ACS</a>
				</li>
				<li>
					Tower players can request a personal grant with an in-game Player ID:
					<a href={href('/license/')}>Player license</a>
				</li>
			</ul>
		</section>
	{/if}

	<section>
		<h2 class="text-xl font-medium">3. Explore The Examples</h2>
		<p class="mt-2 text-sm text-muted">
			Every example on this site runs against the installed package. Open one, copy it, and change
			the inputs — the numbers move because they come from the catalogs, not from a fixture.
		</p>
		<ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
			<li><a href={href('/playground/')}>Examples</a> — runnable snippets, grouped by task</li>
			<li>
				<a href={href('/tools/')}>What You Can Build</a> — finished tool shapes, each linked to its docs
			</li>
			<li><a href={href('/docs/')}>Docs</a> — the full reference, one page per area</li>
		</ul>
	</section>

	<section>
		<h2 class="text-xl font-medium">4. Saves From a Device (optional)</h2>
		<p class="mt-2 text-sm text-muted">
			Android path:
			<code>Android/data/com.TechTreeGames.TheTower/files/playerInfo.dat</code>.
			<a href={LINKS.adbBridge}>adb-bridge</a>
			can copy it from a device or emulator. Decode with
			<code>thetowersdk/node</code>, then extractors in
			<code>thetowersdk/save</code>.
		</p>
	</section>

	<section>
		<h2 class="text-xl font-medium">5. Ready To Build</h2>
		<div class="mt-3 grid gap-4 sm:grid-cols-2">
			<GlassPanel>
				<h3 class="font-medium">Examples</h3>
				<p class="mt-2 text-sm text-muted">Interactive demos and sample imports.</p>
				<p class="mt-3 text-sm"><a href={href('/playground/')}>Open Examples →</a></p>
			</GlassPanel>
			<GlassPanel>
				<h3 class="font-medium">Example Product</h3>
				<p class="mt-2 text-sm text-muted">
					<a href={LINKS.tracker}>The Tower Run Tracker</a>
					ships calculators and trackers on this package.
				</p>
				<p class="mt-3 text-sm"><a href={href('/tools/')}>What You Can Build →</a></p>
			</GlassPanel>
		</div>
	</section>
</div>
