<script lang="ts">
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Building a bot · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Building a Bot</h1>
<p class="mt-3 text-muted">
	The package is framework-agnostic, so a chat bot imports the same catalogs and formulas a website
	does and both answer a player identically. The Run Tracker ships three Discord bots built this
	way.
</p>

<h2 class="mt-8 text-xl font-medium">Share The Calculation Layer</h2>
<p class="mt-2 text-sm text-muted">
	Parsing, normalization, cost math and run shapes belong in a package both the bot and your UI
	import. Platform code — embeds, components, modals, collectors — stays in the bot. That keeps one
	answer per question regardless of where a player asks it.
</p>

<h2 class="mt-8 text-xl font-medium">Interaction Conventions</h2>
<p class="mt-2 text-sm text-muted">
	These apply to any platform built on callbacks carrying opaque ids — Discord, Slack, Telegram,
	Matrix.
</p>
<ul class="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
	<li>
		<strong>One router.</strong> Every interaction dispatches through a single entry point, with persistent
		handlers registered against it.
	</li>
	<li>
		<strong>Component ids get one owner.</strong> Build and parse them in a single module and let handlers
		consume parsed values. An id is a wire format: it is serialized, handed to a remote client, and handed
		back later — possibly after a redeploy. Registry lookup uses exact or longest-prefix matching.
	</li>
	<li>
		<strong>Interactions are owned.</strong> Wait on a modal by filtering on the component id
		<em>and</em> the initiating user, so one user's click resolves only their own pending wait.
	</li>
	<li>
		<strong>Guard tokens before touching state.</strong> Callbacks arrive late, twice, and after restarts.
		Check a session token is present and unexpired first.
	</li>
	<li>
		<strong>Support every component kind up front.</strong> Buttons, all select-menu variants, and modals,
		even when the current feature uses one.
	</li>
	<li>
		<strong>Return quietly when the interaction is not yours.</strong> Submissions belonging to a command-local
		ownership flow should exit silently so real failures stay visible in logs.
	</li>
	<li>
		<strong>Keep diagnostic scripts.</strong> Check them into the repo — you will want them during an
		incident.
	</li>
</ul>

<h2 class="mt-8 text-xl font-medium">Save-driven Features</h2>
<p class="mt-2 text-sm text-muted">
	Run import, progress tracking and account summaries all start from <code>playerInfo.dat</code>.
	Decode once and share the parsed root across handlers rather than re-decoding per interaction.
	<a href={href('/docs/save/')}>Save File Docs →</a>
</p>

<p class="mt-8 text-sm">
	<a href={href('/docs/data/')}>Game Data →</a>
	·
	<a href={href('/docs/mechanics/')}>Formulas →</a>
</p>
