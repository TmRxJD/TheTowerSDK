<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Patch Notes · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Patch Notes</h1>
<p class="mt-3 text-muted">
	Five years of the developers' own announcements, queryable — 232 notes from July 2021 to today.
	The catalogs say what a number <em>is</em>; these say <em>when it became that</em>, and what was
	said about it at the time.
</p>

<div class="mt-6">
	<CodeBlock
		code={`import {
  whenIntroduced,
  searchPatchNotes,
  patchNotesForVersion,
  patchNotesBetween,
  recentPatchNotes
} from 'thetowersdk/knowledge'

whenIntroduced('shockwave')
// { postedAt: '2021-07-15…', version: '0.1.29', title: 'v0.1.29 is out for everyone now…' }

searchPatchNotes('guardian')      // every note mentioning it, newest first
patchNotesForVersion('26.1.2')    // or 'v26.1.2' — both work
patchNotesBetween('2024-01-01', '2024-12-31')
recentPatchNotes(5)               // what changed lately`}
	/>
</div>

<p class="mt-4 text-sm text-muted">
	Every note carries the message id it came from, so a claim is traceable to the post rather than to
	this package.
</p>

<h2 class="mt-10 text-xl font-semibold">What It Will Not Tell You</h2>
<p class="mt-3 text-muted">
	<strong>The archive begins on 2021-07-15</strong>, the oldest post in the channel.
	<code>whenIntroduced</code> returning <code>null</code> means <em>not in this archive</em>, not
	<em>this never existed</em>.
</p>
<p class="mt-3 text-muted">
	<strong>A note mentioning a mechanic is not evidence it changed.</strong>
	<code>searchPatchNotes</code> is a text search over announcements: it finds leads, and the note still
	has to be read.
</p>
<p class="mt-3 text-muted">
	<strong>55 of the 232 notes state no version</strong>, so theirs is <code>null</code>. It is not
	inferred from the notes around it — a wrong version attached to a real change reads as fact.
</p>

<h2 class="mt-10 text-xl font-semibold">Kept Current, Carefully</h2>
<p class="mt-3 text-muted">
	Re-ingesting is read-only and resumable, and both steps refuse rather than write something wrong.
	Most notes are <em>forwarded</em>, and a forward carries its text in
	<code>message_snapshots</code> rather than in <code>content</code> — reading the wrong field returns
	80% of the channel as blank posts. A forward also keeps its own timestamp, so dating by the message
	would land four years of history on the afternoon it was bulk-forwarded. The build refuses a dataset
	with either shape.
</p>
<p class="mt-3 text-muted">
	Those traps live in the <a href={href('/docs/knowledge/')}>knowledge graph</a> as well, so an
	agent asking <em>when did this change</em> meets the dating rule before it reaches a date.
</p>

<p class="mt-8 text-sm"><a href={href('/docs/knowledge/')}>Knowledge →</a></p>
