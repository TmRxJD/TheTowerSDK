/**
 * Showing a module or a card the way the game draws it.
 *
 *   npx tsx examples/12-show-module-and-card-art.ts
 *
 * The images are not in this package — they are The Tower's artwork, owned by TechTree
 * Games, and they live in `tower-assets`:
 *
 *   npm install tower-assets
 *
 * What ships here is the mapping. This example runs without the images installed, because
 * resolving a path and loading a file are different steps.
 */
import { CARD_TEMPLATES, MODULE_TEMPLATES } from 'thetowersdk/data'
import {
  allModuleAssetPaths,
  cardAssetPath,
  moduleAssetPath,
  moduleFrameAssetPath,
  towerAssetUrl,
} from 'thetowersdk/assets'

/*
 * ---------------------------------------------------------------------------
 * 1. Why this is not a string template.
 * ---------------------------------------------------------------------------
 *
 * A module's file is named after its INITIALS and rarity prefix, not its id or its name.
 * Building the path by hand gives you a file that does not exist — and a missing image does
 * not throw, it renders as nothing.
 */
// >>> snippet: module-art
const chip = MODULE_TEMPLATES.find(module => module.name === 'Om Chip')

console.log(`id:       ${chip?.id}`)
console.log(`initials: ${chip?.initials}`)
console.log(`art:      ${moduleAssetPath('Om Chip')}`)
// <<< snippet

console.log(`\nguessed by hand: modules_core/${chip?.id}.png   <- does not exist`)

/*
 * ---------------------------------------------------------------------------
 * 2. Cards, and the alias that catches people out.
 * ---------------------------------------------------------------------------
 */
console.log(`\ncard 'aoe':        ${cardAssetPath('aoe')}`)
console.log(`card 'slow-aura':  ${cardAssetPath('slow-aura')}   <- stored as sa.jpg, not slow-aura.jpg`)

/*
 * Anything without art returns `null` rather than a plausible path to nothing, so a caller
 * can tell "this has no art" from "I built the wrong path".
 */
console.log(`card 'no-such':    ${cardAssetPath('no-such-card')}`)

/*
 * ---------------------------------------------------------------------------
 * 3. Frames are per rarity, and follow a different rule.
 * ---------------------------------------------------------------------------
 *
 * The `+` tiers have their own frame; the module art underneath does not.
 */
for (const rarity of ['Epic', 'Epic+', 'Ancestral 5']) {
  console.log(`frame ${rarity.padEnd(12)} ${moduleFrameAssetPath('Core', rarity)}`)
}

/*
 * ---------------------------------------------------------------------------
 * 4. Coverage, and turning a path into something loadable.
 * ---------------------------------------------------------------------------
 */
const modules = allModuleAssetPaths()
const cards = CARD_TEMPLATES.filter(card => cardAssetPath(card.id))
console.log(`\n${modules.length}/${MODULE_TEMPLATES.length} modules and ${cards.length}/${CARD_TEMPLATES.length} cards have art.`)

/*
 * The manifest is transport-agnostic on purpose: a bundler, a static mount and a CDN each
 * want a different prefix, and baking one in would be wrong for the other two.
 */
// >>> snippet: asset-url
const url = towerAssetUrl(cardAssetPath('aoe'), '/node_modules/tower-assets')
console.log(`\nloadable URL: ${url}`)
// <<< snippet
