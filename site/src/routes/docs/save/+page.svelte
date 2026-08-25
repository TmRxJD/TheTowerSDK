<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { adbBridgeSnippet, saveSnippet } from '$lib/content';
	import { LINKS } from '$lib/links';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Save files · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Save Files</h1>
<p class="mt-3 text-muted">The Tower stores an account as a single <code>playerInfo.dat</code>.</p>
<ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
	<li>
		<strong>Android</strong> —
		<code>Android/data/com.TechTreeGames.TheTower/files/playerInfo.dat</code>, on a device or inside
		an emulator.
	</li>
	<li>
		<strong>macOS</strong> — the native App Store build keeps it in its app container under
		<code>~/Library/Containers</code>, with non-sandboxed installs under
		<code>~/Library/Application Support</code>.
	</li>
</ul>

<h2 class="mt-8 text-xl font-medium">Getting The File</h2>
<p class="mt-2 text-sm text-muted">
	<a href={LINKS.adbBridge}>adb-bridge</a> finds the save and hands the bytes to whatever needs them.
	On Android it talks to a connected phone or a running emulator over ADB. On a Mac it reads the native
	build's container directly, so there is no device to connect and no ADB in the picture.
</p>
<div class="mt-3">
	<CodeBlock code={adbBridgeSnippet} />
</div>
<ul class="mt-4 list-disc space-y-1 pl-5 text-sm text-muted">
	<li>
		Installs Google's official platform-tools for you if <code>adb</code> is not already on the machine.
		The macOS path needs no tooling at all.
	</li>
	<li>
		Serves the save to a local page over a WebSocket bound to <code>127.0.0.1</code>, so a browser
		app can read a real account without an upload step.
	</li>
	<li>
		Can watch the save and re-send it whenever the game writes, which keeps a tracker live while you
		play instead of forcing a manual re-import.
	</li>
	<li>
		Reads only — it never modifies anything on the device, and it touches only the games you enable.
	</li>
	<li>
		One install covers multiple games; adding another registers it with the bridge you already have.
	</li>
</ul>
<p class="mt-3 text-sm text-muted">
	Feed those bytes to <code>decodePlayerInfoSaveBytes</code> below and the rest of this page applies unchanged.
</p>

<h2 class="mt-8 text-xl font-medium">Decode And Read</h2>
<p class="mt-2 text-sm text-muted">
	Decode in Node with <code>thetowersdk/node</code>, then use extractors in
	<code>thetowersdk/save</code> (labs, modules, cards, UWs, run history, and more).
</p>
<div class="mt-3">
	<CodeBlock code={saveSnippet} />
</div>
<p class="mt-4 text-sm"><a href={href('/playground/')}>See The Save Example →</a></p>
