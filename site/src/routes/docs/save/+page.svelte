<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { LINKS } from '$lib/links';
	import { href } from '$lib/paths';
</script>

<svelte:head>
	<title>Save files · Docs · TheTowerSDK</title>
</svelte:head>

<h1 class="text-3xl font-semibold">Save Files</h1>
<p class="mt-3 text-muted">
	<code>playerInfo.dat</code> holds a player's whole account — research, workshop, modules, cards, ultimate
	weapons, bots, guardians, vault, relics, themes, and every battle the game kept. Decode it once and
	read whichever parts your tool needs, each as a typed object.
</p>

<h2 class="mt-10 text-xl font-semibold">Decode The File</h2>
<p class="mt-3 text-muted">
	<code>decodePlayerInfoSaveBytes</code> takes the raw bytes and returns the parsed account under
	<code>parsedRoot</code>, alongside the number of battles it found and whether the file was
	compressed. Every extractor on this page takes that <code>parsedRoot</code>.
</p>
<div class="mt-4">
	<CodeBlock
		code={`import { readFileSync } from 'node:fs'
import { decodePlayerInfoSaveBytes } from 'thetowersdk/node'

const decoded = decodePlayerInfoSaveBytes(readFileSync('playerInfo.dat'))

console.log(decoded.battleRunCount)   // 30
console.log(decoded.wasGzip)          // true

const root = decoded.parsedRoot       // pass this to the extractors`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">Read The Run History</h2>
<p class="mt-3 text-muted">
	<code>listImportableBattleRuns</code> returns the battle reports as the game recorded them. Each run
	carries well over a hundred fields — tier and wave, coins and cash, damage by source, enemies by kind,
	and what killed you.
</p>
<div class="mt-4">
	<CodeBlock
		code={`import { listImportableBattleRuns } from 'thetowersdk/save'

const runs = listImportableBattleRuns(root)

for (const run of runs.slice(0, 5)) {
  console.log({
    date: run.battleDate,        // '2026-08-09T00:21:42.063Z'
    tier: run.tier,              // 23
    wave: run.wave,              // 41
    coins: run.coinsEarned,
    realTime: run.realTime,      // seconds of wall clock
    gameTime: run.gameTime       // seconds of in-game time
  })
}`}
	/>
</div>
<p class="mt-3 text-muted">
	Coins per hour falls out of two of those fields, which is where most run trackers start.
</p>
<div class="mt-4">
	<CodeBlock
		code={`import { formatNumberForDisplay } from 'thetowersdk/formatting'

const withCph = runs.map((run) => ({
  tier: run.tier,
  wave: run.wave,
  cph: formatNumberForDisplay(run.coinsEarned / (run.realTime / 3600))
}))`}
	/>
</div>
<p class="mt-3 text-muted">
	The damage and enemy breakdowns are on the same object, so a per-run detail view needs no second
	call.
</p>
<div class="mt-4">
	<CodeBlock
		code={`const run = runs[0]

const damageBySource = {
  projectiles: run.projectilesDamage,
  thorns: run.thornDamage,
  orbs: run.orbDamage,
  deathWave: run.deathWaveDamage,
  blackHole: run.blackHoleDamage,
  smartMissiles: run.smartMissileDamage,
  chainLightning: run.chainLightningDamage
}

const enemiesByKind = {
  basic: run.totalBasic,
  fast: run.totalFast,
  tank: run.totalTank,
  ranged: run.totalRanged,
  boss: run.totalBoss,
  elites: run.totalElites
}`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">Read Account Progress</h2>
<p class="mt-3 text-muted">
	Each area has its own extractor, and each returns a summary plus the detail behind it.
</p>
<div class="mt-4">
	<CodeBlock
		code={`import {
  readLabsFromSaveRoot,
  readCardsFromSaveRoot,
  readUltimateWeaponsFromSaveRoot,
  readBotsFromSaveRoot,
  readVaultFromSaveRoot,
  readModulesFromSaveRoot
} from 'thetowersdk/save'

const labs = readLabsFromSaveRoot(root)
console.log(labs.researchedCount)             // 189
console.log(labs.maxedCount)                  // 147
console.log(labs.researches.length)           // 250 — one entry per lab
console.log(labs.researches[0])
// { index: 0, level: 100, displayName: 'Damage', slug: 'damage',
//   category: 'Attack', percentComplete: 0, remainingSeconds: 4341120 }

const cards = readCardsFromSaveRoot(root)
console.log(cards.slotsUnlocked)              // 22
console.log(cards.cards[0])
// { index: 0, slug: 'dmg', name: 'Damage', level: 7, count: 0,
//   unlocked: true, active: true, masteryUnlocked: true }

const uw = readUltimateWeaponsFromSaveRoot(root)
console.log(uw.slots.length)                  // 9
console.log(uw.slots[0])
// { slotIndex: 0, unlocked: true, active: true,
//   plusLevel: 6, plusUnlocked: true, plusOn: true, baseStatLevels: [20, 4, 15] }

const bots = readBotsFromSaveRoot(root)
console.log(bots.bots[0])
// { index: 0, name: 'Flame Bot', label: 'Flame Bot', unlocked: true,
//   active: true, statLevels: [0, 15, 0, 6], plusUnlocked: false, plusLevel: 0 }

const vault = readVaultFromSaveRoot(root)
console.log(vault.keys)                       // 79
console.log(vault.powerUnlockedCount)         // 45
console.log(vault.harmonyUnlockedCount)       // 45`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">Join A Save To The Catalogs</h2>
<p class="mt-3 text-muted">
	A save gives levels; the <a href={href('/docs/data/')}>catalogs</a> give what each level costs and does.
	Put them together and you have a "what should I buy next" view for a specific account.
</p>
<div class="mt-4">
	<CodeBlock
		code={`import { readLabsFromSaveRoot } from 'thetowersdk/save'
import { LAB_CATALOG } from 'thetowersdk/data'
import { formatNumberForDisplay } from 'thetowersdk/formatting'

const owned = readLabsFromSaveRoot(root)

// A research entry names its lab in \`displayName\`, which matches the catalog's \`name\`.
const nextUp = owned.researches
  .map((research) => {
    const catalog = LAB_CATALOG.find((entry) => entry.name === research.displayName)
    const next = catalog?.levels.find((level) => level.level === research.level + 1)
    return next && { name: research.displayName, level: research.level, cost: next.cost }
  })
  .filter(Boolean)
  .sort((a, b) => a.cost - b.cost)

for (const lab of nextUp.slice(0, 5)) {
  console.log(\`\${lab.name} \${lab.level} → \${lab.level + 1}: \${formatNumberForDisplay(lab.cost)}\`)
}

// Interest 6 → 7: 3.59K
// Starting Cash 8 → 9: 4.51K
// Workshop Attack Discount 12 → 13: 13.35K`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">Get The File From A Device</h2>
<p class="mt-3 text-muted">
	On Android the save lives at
	<code>Android/data/com.TechTreeGames.TheTower/files/playerInfo.dat</code>.
	<a href={LINKS.adbBridge}>adb-bridge</a> finds it and serves it to your page over a local WebSocket
	— from a phone or emulator over ADB, or from the Mac App Store build's own container. Ask it to watch
	and it re-sends on every write, so a tracker updates while the player plays.
</p>
<div class="mt-4">
	<CodeBlock
		code={`// The player runs this once:
//   npx adb-bridge

const socket = new WebSocket('ws://127.0.0.1:8765')

socket.onmessage = async (event) => {
  const bytes = new Uint8Array(await event.data.arrayBuffer())
  const decoded = decodePlayerInfoSaveBytes(bytes)
  render(listImportableBattleRuns(decoded.parsedRoot))
}`}
	/>
</div>

<h2 class="mt-10 text-xl font-semibold">Browser Uploads</h2>
<p class="mt-3 text-muted">
	The decoder takes bytes, so a file input works the same way as a file read from disk.
</p>
<div class="mt-4">
	<CodeBlock
		code={`async function onFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const decoded = decodePlayerInfoSaveBytes(bytes)
  return decoded.parsedRoot
}`}
	/>
</div>

<p class="mt-8 text-sm">
	<a href={href('/docs/data/')}>Catalogs →</a>
	·
	<a href={LINKS.adbBridge}>adb-bridge →</a>
	·
	<a href={href('/playground/')}>Runnable Examples →</a>
</p>
