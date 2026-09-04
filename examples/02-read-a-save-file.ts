/**
 * Example 2 — Read a real save file.
 *
 * Two steps: decode `playerInfo.dat` into a save root, then pull typed data
 * out of that root. The decode step is Node-only (it needs gzip); everything
 * after it is pure and also runs in a browser.
 *
 * Run it:
 *   npx tsx examples/02-read-a-save-file.ts /path/to/playerInfo.dat
 *
 * Where to find your save is explained in the README ("Getting a save file").
 */
import { readFile } from 'node:fs/promises'

import { decodePlayerInfoSaveBytes } from 'thetowersdk/node'
import {
  discoverSaveImportTargets,
  readCardsFromSaveRoot,
  readLabsFromSaveRoot,
  readWorkshopFromSaveRoot,
} from 'thetowersdk/save'

async function main(): Promise<void> {
  const savePath = process.argv[2]
  if (!savePath) {
    console.error('Usage: tsx examples/02-read-a-save-file.ts <path-to-playerInfo.dat>')
    process.exit(1)
  }

  // --- Step 1: decode -------------------------------------------------------
  const bytes = await readFile(savePath)
  const { parsedRoot, wasGzip, battleRunCount } = decodePlayerInfoSaveBytes(bytes)

  console.log(`Decoded ${savePath}`)
  console.log(`  gzip-compressed: ${wasGzip}`)
  console.log(`  top-level keys:  ${Object.keys(parsedRoot).length}`)
  console.log(`  battle runs:     ${battleRunCount}`)
  console.log()

  // --- Step 2: see what is in there -----------------------------------------
  // `discoverSaveImportTargets` is the "what does this save actually contain?"
  // pass. Show it to a user before importing anything.
  const discovery = discoverSaveImportTargets(parsedRoot)
  console.log('Available data:')
  for (const tracker of discovery.targets) {
    console.log(
      `  ${tracker.label.padEnd(20)} ${String(tracker.count).padStart(5)}  ${tracker.summary}`,
    )
  }
  console.log()

  // --- Step 3: extract the parts you care about -----------------------------
  // Every extractor returns `null` instead of throwing when a save predates
  // that feature, so always check before reading.
  const labs = readLabsFromSaveRoot(parsedRoot)
  if (labs) {
    console.log('Labs')
    console.log(`  unlocked:          ${labs.labsUnlocked}`)
    console.log(`  researches done:   ${labs.researchedCount}`)
    console.log(`  maxed:             ${labs.maxedCount}`)
    console.log(`  currently running: ${labs.activeQueue.length}`)
    if (labs.warnings.length) {
      // Extractors report anything they could not make sense of rather than
      // silently dropping it -- worth surfacing while developing.
      console.log(`  warnings:          ${labs.warnings.join('; ')}`)
    }
  } else {
    console.log('Labs: not present in this save')
  }
  console.log()

  const workshop = readWorkshopFromSaveRoot(parsedRoot)
  console.log(workshop ? 'Workshop: present' : 'Workshop: not present in this save')

  const cards = readCardsFromSaveRoot(parsedRoot)
  console.log(cards ? 'Cards: present' : 'Cards: not present in this save')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
