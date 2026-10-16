<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { LINKS } from '$lib/links';
	import { href } from '$lib/paths';
</script>

<h1 class="text-3xl font-semibold">Save Files</h1>
<p class="mt-3 text-muted">
	Decode <code>playerInfo.dat</code> once, then read research, workshop, modules, cards, ultimate
	weapons and battle history through the SDK's typed save readers.
</p>

<h2 class="mt-10 text-xl font-semibold">Encrypted Saves: Use The Free Decryption API</h2>
<p class="mt-3 text-muted">
	Current encrypted <code>TDS1</code> saves use the hosted Appwrite save-decode API. The SDK sends
	the encrypted file over HTTPS and receives decrypted bytes. Decompression, NRBF parsing and
	account extraction then run locally. Tell users that importing an encrypted save uploads it to
	this service. An internet connection is required for decryption.
</p>
<p class="mt-3 text-muted">
	The SDK includes the live endpoint, project ID and shared public API key. There is no signup or
	private decryption key to configure in your application. The public key identifies this free
	service; it is not a personal credential. Private game keys stay in the function's secret variables.
	The handler does not store saves or log their contents.
</p>
<p class="mt-3 text-muted">
	This API-backed decoder is available in the merged source; existing npm releases are unchanged.
	Until a new npm release is published, build and pack the source from
	<a href={LINKS.github}>TheTowerSDK</a> and install that tarball in your project.
</p>

<h2 class="mt-10 text-xl font-semibold">Decode In The Browser</h2>
<p class="mt-3 text-muted">
	Pass the original file bytes to <code>decodeSaveFile</code>. It detects encrypted saves, calls
	the API with its public defaults, and returns the parsed save root. Do not remove the header or
	decompress an encrypted file yourself.
</p>
<div class="mt-4">
	<CodeBlock code={`import { decodeSaveFile } from 'thetowersdk/save-decoder'
import { listImportableBattleRuns } from 'thetowersdk/save'

async function onFile(file) {
  // Encrypted files are uploaded for decryption; parsing stays local.
  const root = await decodeSaveFile(await file.arrayBuffer())
  return listImportableBattleRuns(root)
}`} />
</div>
<p class="mt-3 text-muted">
	For large files, call the same asynchronous decoder in a Web Worker to keep parsing off the
	main thread. Surface decoding and network errors to the person importing the file.
</p>

<h2 class="mt-10 text-xl font-semibold">Decode In Node</h2>
<p class="mt-3 text-muted">
	Use <code>decodePlayerInfoSaveBytesAsync</code> in Node 20 or later. It uses the same live API
	for encrypted saves and returns <code>parsedRoot</code>, <code>battleRunCount</code> and
	<code>wasGzip</code>. Every extractor below accepts <code>parsedRoot</code>.
</p>
<div class="mt-4">
	<CodeBlock code={`import { readFile } from 'node:fs/promises'
import { decodePlayerInfoSaveBytesAsync } from 'thetowersdk/node'

const decoded = await decodePlayerInfoSaveBytesAsync(await readFile('playerInfo.dat'))
const root = decoded.parsedRoot
console.log(decoded.battleRunCount, decoded.wasGzip)`} />
</div>

<h2 class="mt-10 text-xl font-semibold">Call The Decryption API Directly</h2>
<p class="mt-3 text-muted">
	Other clients can make a synchronous Appwrite execution request to
	<code>https://appwrite.athyen.pl/v1/functions/save-decode/executions</code>.
	Set <code>x-appwrite-project</code> to <code>68190de700097b8f59df</code>. The execution's
	<code>body</code> is a JSON string containing <code>saveBase64</code>; its nested headers carry
	<code>x-save-api-key: thetowersdk-public-v1</code>. No Appwrite login, JWT or private API key is needed.
</p>
<div class="mt-4">
	<CodeBlock code={`// Node 20+. The same HTTP request works from other languages.
import { readFile } from 'node:fs/promises'

const encrypted = await readFile('playerInfo.dat')
const response = await fetch(
  'https://appwrite.athyen.pl/v1/functions/save-decode/executions',
  {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-appwrite-project': '68190de700097b8f59df'
    },
    body: JSON.stringify({
      async: false,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-save-api-key': 'thetowersdk-public-v1'
      },
      body: JSON.stringify({ saveBase64: encrypted.toString('base64') })
    })
  }
)
if (!response.ok) throw new Error('Save API request failed: ' + response.status)
const execution = await response.json()
if (execution.status !== 'completed' || execution.responseStatusCode !== 200) {
  throw new Error('Save decryption failed: ' + execution.responseStatusCode)
}
const { decryptedBase64 } = JSON.parse(execution.responseBody)
const decryptedBytes = Buffer.from(decryptedBase64, 'base64')
// Decompress and parse decryptedBytes locally, or pass them to decodeSaveFile.`} />
</div>
<p class="mt-3 text-muted">
	The response is decrypted bytes wrapped in base64, <strong>not parsed account JSON</strong>.
	For normal saves these bytes are gzip-compressed NRBF. The SDK unwraps this response automatically.
	The function accepts files up to 8 MiB and limits requests to 30 per IP per minute per instance.
	Malformed or tampered saves return 400, a wrong public key 403, an oversized upload 413, and
	excess requests 429. Check both the HTTP status and the execution's <code>responseStatusCode</code>.
</p>
<p class="mt-3 text-muted">
	For a custom deployment, pass <code>endpoint</code>, <code>projectId</code> and <code>apiKey</code>
	as the second argument to either asynchronous SDK decoder. These are public client settings;
	never include private game keys or an Appwrite administrator key in your application.
</p>

<h2 class="mt-10 text-xl font-semibold">Older Saves And JSON Exports: Decode Locally</h2>
<p class="mt-3 text-muted">
	Older gzip saves, raw NRBF files and JSON exports do not call the API. The same
	<code>decodeSaveFile</code> and <code>decodePlayerInfoSaveBytesAsync</code> entry points detect
	them automatically and return the same save-root structure. These unencrypted formats work offline.
</p>
<p class="mt-3 text-muted">
	For synchronous Node code reading only unencrypted files, use
	<code>decodePlayerInfoSaveBytes</code>. It explicitly rejects encrypted TDS1 input; use its
	asynchronous counterpart for current saves. <code>gunzipBytes</code> also supports API-backed
	decryption and returns inflated NRBF bytes. <code>decodeInflatedSave</code>,
	<code>NRBFReader</code> and <code>nrbfToJSON</code> are for already-decrypted local payloads.
	<code>isEncryptedSave</code> detects TDS1, while <code>isGzipped</code> tests gzip magic.
</p>

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
		code={`import { decodeSaveFile } from 'thetowersdk/save-decoder'
import { listImportableBattleRuns } from 'thetowersdk/save'

// The player runs this once:
//   npx adb-bridge

const socket = new WebSocket('ws://127.0.0.1:8765')

socket.onmessage = async (event) => {
  const bytes = new Uint8Array(await event.data.arrayBuffer())
  const root = await decodeSaveFile(bytes)
  render(listImportableBattleRuns(root))
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
