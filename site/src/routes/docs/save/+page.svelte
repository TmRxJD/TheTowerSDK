<script lang="ts">
	import CodeBlock from '$lib/ui/CodeBlock.svelte';
	import { LINKS } from '$lib/links';
	import { href } from '$lib/paths';
</script>

<h1 class="text-3xl font-semibold">Save Files</h1>
<p class="mt-3 text-muted">
	Decode <code>playerInfo.dat</code> locally, then read account progress and battle history through
	the SDK's typed save readers. Encrypted TDS1 files require caller-supplied decryption keys.
	The SDK includes the decoding logic, but no game keys or hosted decryption service.
</p>

<p class="mt-3 text-muted">
	These examples target the repository source. Use the <a href={href('/docs/install/')}>source-build instructions</a>
	for the caller-key decoder; published npm interfaces may differ.
</p>

<h2 class="mt-10 text-xl font-semibold">Encrypted Saves: Supply Your Own Keys</h2>
<p class="mt-3 text-muted">
	Pass <code>keys</code> as part of the decoder's second argument. TDS1 v1 uses three 32-byte
	values: <code>encryption</code> for AES-256-CBC, <code>authentication</code> for HMAC-SHA-256,
	and <code>mask</code> for the byte-mask stage. Each value accepts a <code>Uint8Array</code>
	or a canonical base64 string. Supply all three values for the save's format.
</p>
<p class="mt-3 text-muted">
	Keep key material outside source control, published packages and client bundles. Browser tools
	can accept a key file selected by the user; Node tools can read a private local JSON file with
	those three fields. Keys and saves remain on the device during decoding. There is no API key,
	account registration or network request involved.
</p>

<h2 class="mt-10 text-xl font-semibold">Decode In The Browser</h2>
<p class="mt-3 text-muted">
	Provide the original save file and a user-selected JSON key file. Web Crypto handles decryption
	in HTTPS or localhost contexts; <code>DecompressionStream</code> handles gzip. Missing or invalid
	keys produce an error rather than a network fallback.
</p>
<div class="mt-4">
	<CodeBlock code={`import { decodeSaveFile } from 'thetowersdk/save-decoder'
import { listImportableBattleRuns } from 'thetowersdk/save'

async function onFiles(saveFile, keyFile) {
  const keys = JSON.parse(await keyFile.text())
  const root = await decodeSaveFile(await saveFile.arrayBuffer(), { keys })
  return listImportableBattleRuns(root)
}`} />
</div>
<p class="mt-3 text-muted">
	For large saves, call the same decoder in a Web Worker and pass the user-supplied key material
	with the save bytes. Surface errors to the person importing the file without logging keys or save contents.
</p>

<h2 class="mt-10 text-xl font-semibold">Decode In Node</h2>
<p class="mt-3 text-muted">
	Use <code>decodePlayerInfoSaveBytesAsync</code> in Node 20 or later. It decrypts locally and
	returns <code>parsedRoot</code>, <code>battleRunCount</code> and <code>wasGzip</code>.
	All extractors below accept <code>parsedRoot</code>.
</p>
<div class="mt-4">
	<CodeBlock code={`import { readFile } from 'node:fs/promises'
import { decodePlayerInfoSaveBytesAsync } from 'thetowersdk/node'

// The key file contains the caller's base64 encryption, authentication and mask values.
const keysPath = process.env.TOWER_SAVE_KEYS_FILE
if (!keysPath) throw new Error('Set TOWER_SAVE_KEYS_FILE to a private key JSON file.')
const keys = JSON.parse(await readFile(keysPath, 'utf8'))
const decoded = await decodePlayerInfoSaveBytesAsync(await readFile('playerInfo.dat'), { keys })
const root = decoded.parsedRoot
console.log(decoded.battleRunCount, decoded.wasGzip)`} />
</div>

<h2 class="mt-10 text-xl font-semibold">Decrypt Bytes Without Parsing</h2>
<p class="mt-3 text-muted">
	<code>decryptSave</code> authenticates and decrypts the container, returning its original
	compressed payload. It does not decompress or parse the account. Use this when integrating with
	another NRBF reader or a WASM decoder. <code>gunzipBytes</code> performs decryption and gzip
	decompression together; <code>decodeSaveFile</code> also parses the save root.
</p>
<div class="mt-4">
	<CodeBlock code={`import { decryptSave, decodeSaveFile } from 'thetowersdk/save-decoder'

async function decryptAndRead(saveFile, keyFile) {
  const keys = JSON.parse(await keyFile.text())
  const compressedBytes = await decryptSave(new Uint8Array(await saveFile.arrayBuffer()), { keys })
  return decodeSaveFile(compressedBytes)
}`} />
</div>
<p class="mt-3 text-muted">
	Encrypted input is limited to 8 MiB. Unsupported versions, incomplete containers, invalid key
	lengths and failed integrity checks throw errors. The authentication check verifies container
	integrity; it does not validate gameplay values. The decoder does not modify the supplied save or key bytes.
</p>

<h2 class="mt-10 text-xl font-semibold">Older Saves And JSON Exports</h2>
<p class="mt-3 text-muted">
	Older gzip saves, raw NRBF and JSON exports require no keys. Call <code>decodeSaveFile(bytes)</code>
	or <code>decodePlayerInfoSaveBytesAsync(bytes)</code> without options; the format is detected
	automatically. These formats return the same save-root structure as encrypted saves.
</p>
<p class="mt-3 text-muted">
	The synchronous Node function <code>decodePlayerInfoSaveBytes</code> accepts unencrypted files.
	Encrypted saves use the asynchronous functions with caller keys. <code>decodeInflatedSave</code>,
	<code>NRBFReader</code> and <code>nrbfToJSON</code> accept already-decrypted local payloads.
	<code>isEncryptedSave</code> detects TDS1; <code>isGzipped</code> detects gzip.
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

async function watchSave(keyFile) {
  const keys = JSON.parse(await keyFile.text())
  const socket = new WebSocket('ws://127.0.0.1:8765')
  socket.onmessage = async (event) => {
    const bytes = new Uint8Array(await event.data.arrayBuffer())
    const root = await decodeSaveFile(bytes, { keys })
    render(listImportableBattleRuns(root))
  }
  return socket
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
