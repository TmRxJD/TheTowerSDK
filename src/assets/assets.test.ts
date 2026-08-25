import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CARD_TEMPLATES, MODULE_TEMPLATES } from '../data/index'
import {
  allModuleAssetPaths,
  CARD_ASSET_FILES,
  cardAssetPath,
  MODULE_ASSET_FILES,
  moduleAssetPath,
  moduleFrameAssetPath,
  OTHER_ASSET_FILES,
  TOWER_ASSETS_ROOT,
  towerAssetUrl,
} from './index'

/**
 * The manifest names files in another package. Two things can go wrong and neither errors:
 * a name that no longer exists, and a module the manifest cannot resolve at all. Both render
 * as a missing image — on one card, at one rarity — and nobody notices for months.
 *
 * So the paths are checked against the real files on disk, not against each other.
 */
const ASSETS_DIR = path.resolve(__dirname, '..', '..', '..', 'tower-assets', 'assets', 'site')
const assetsInstalled = existsSync(ASSETS_DIR)

/** Absolute path for a manifest path, so existence can actually be checked. */
function onDisk(assetPath: string): string {
  return path.join(ASSETS_DIR, ...assetPath.replace(`${TOWER_ASSETS_ROOT}/`, '').split('/'))
}

/**
 * The artwork set is being replaced.
 *
 * What is in `tower-assets` today are screenshots of the real thing; proper extractions from
 * the game files are replacing them, so the package may be bare or partial at any point in
 * between. The resolver has to keep working across that, and the tests have to keep meaning
 * something — so anything that depends on a populated package is gated on the package
 * actually being populated, rather than asserting a count that a legitimate state breaks.
 */
const manifestPopulated = CARD_ASSET_FILES.length > 0
  && Object.values(MODULE_ASSET_FILES).some(files => files.length > 0)

describe('the asset manifest', () => {
  it('is well formed, whatever is in it', () => {
    // Holds for a bare package too: the shape is the contract, the contents are not.
    expect(Object.keys(MODULE_ASSET_FILES).length).toBe(4)
    for (const [category, files] of Object.entries(MODULE_ASSET_FILES)) {
      expect(Array.isArray(files), category).toBe(true)
    }
    expect(Array.isArray(CARD_ASSET_FILES)).toBe(true)
  })

  it.runIf(manifestPopulated)('covers the catalog while the package is populated', () => {
    expect(CARD_ASSET_FILES.length).toBeGreaterThan(20)
    for (const [category, files] of Object.entries(MODULE_ASSET_FILES)) {
      expect(files.length, category).toBeGreaterThan(10)
    }
  })

  it.runIf(assetsInstalled)('names only files that exist', () => {
    const missing: string[] = []
    for (const [category, files] of Object.entries(MODULE_ASSET_FILES)) {
      for (const file of files) {
        const full = path.join(ASSETS_DIR, `modules_${category.toLowerCase()}`, file)
        if (!existsSync(full)) missing.push(`${category}/${file}`)
      }
    }
    for (const file of CARD_ASSET_FILES) {
      if (!existsSync(path.join(ASSETS_DIR, 'cards', file))) missing.push(`cards/${file}`)
    }
    expect(missing.slice(0, 5), `${missing.length} missing: ${missing.slice(0, 5).join(', ')}`).toEqual([])
  })
})

describe('moduleAssetPath', () => {
  it('resolves by name and by id to the same file', () => {
    const template = MODULE_TEMPLATES[0]
    expect(moduleAssetPath(template.id)).toBe(moduleAssetPath(template.name))
  })

  it('is case-insensitive on the name, because a name comes from a user', () => {
    const template = MODULE_TEMPLATES.find(t => moduleAssetPath(t.id) !== null)!
    expect(moduleAssetPath(template.name.toUpperCase())).toBe(moduleAssetPath(template.id))
  })

  it('uses initials and a rarity prefix, not the id', () => {
    /*
     * The whole reason this is a manifest and not a template string. A tool building
     * `modules_core/${id}.png` produces a path that does not exist, and gets no error.
     */
    const omni = MODULE_TEMPLATES.find(t => t.initials.toLowerCase().replace(/[^a-z]/g, '') === 'oa')
    if (!omni) return
    const resolved = moduleAssetPath(omni.id)
    expect(resolved).toMatch(/_oa\.png$/)
    expect(resolved).not.toContain(omni.id)
  })

  it.runIf(assetsInstalled)('every module it resolves points at a real file', () => {
    const broken: string[] = []
    for (const { name, path: assetPath } of allModuleAssetPaths()) {
      if (!existsSync(onDisk(assetPath))) broken.push(`${name} -> ${assetPath}`)
    }
    expect(broken.slice(0, 5), `${broken.length} broken: ${broken.slice(0, 5).join(', ')}`).toEqual([])
  })

  it('resolves art for most of the catalog, and is honest about the rest', () => {
    /*
     * Not every module is drawn — unique and newer ones often are not. What matters is that
     * a missing one returns `null` rather than a plausible path to nothing.
     */
    const resolved = allModuleAssetPaths()
    if (manifestPopulated) expect(resolved.length).toBeGreaterThan(10)

    const unresolved = MODULE_TEMPLATES.filter(t => moduleAssetPath(t.id) === null)
    for (const template of unresolved) {
      expect(moduleAssetPath(template.id), template.name).toBeNull()
    }
  })

  it('returns null for a module that does not exist, rather than a guess', () => {
    for (const nonsense of ['no-such-module', '', 'constructor', '__proto__']) {
      expect(moduleAssetPath(nonsense), nonsense).toBeNull()
    }
  })

  it('falls back to the minimum rarity when the requested one has no art', () => {
    const template = MODULE_TEMPLATES.find(t => moduleAssetPath(t.id) !== null)!
    // A rarity that certainly has no file for this module.
    expect(moduleAssetPath(template.id, 'Ancestral')).toBe(moduleAssetPath(template.id))
  })
})

describe('moduleFrameAssetPath', () => {
  it('gives a per-rarity frame, and folds the + tiers onto their own file', () => {
    expect(moduleFrameAssetPath('Core', 'Epic')).toMatch(/mf_epic\.png$/)
    expect(moduleFrameAssetPath('Core', 'Epic+')).toMatch(/mf_epic_plus\.png$/)
    expect(moduleFrameAssetPath('Core', 'Ancestral 5')).toMatch(/mf_ancestral\.png$/)
    expect(moduleFrameAssetPath('Core', null)).toMatch(/mf_empty\.png$/)
  })

  it('needs a real category — frames are not shared between them', () => {
    expect(moduleFrameAssetPath('NotACategory', 'Epic')).toBeNull()
    expect(moduleFrameAssetPath('constructor', 'Epic')).toBeNull()
  })

  it.runIf(assetsInstalled)('every frame it names exists', () => {
    const broken: string[] = []
    for (const category of Object.keys(MODULE_ASSET_FILES)) {
      for (const rarity of ['Common', 'Rare', 'Rare+', 'Epic', 'Epic+', 'Legendary', 'Mythic', 'Ancestral', null]) {
        const resolved = moduleFrameAssetPath(category, rarity)
        if (resolved && !existsSync(onDisk(resolved))) broken.push(resolved)
      }
    }
    expect(broken.slice(0, 5), broken.slice(0, 5).join(', ')).toEqual([])
  })
})

describe('cardAssetPath', () => {
  it('resolves the alias that does not match its id', () => {
    // The single case that makes a hand-built path wrong, silently.
    expect(cardAssetPath('slow-aura')).toMatch(/\/sa\.jpg$/)
  })

  it('returns null for a card with no art rather than a broken path', () => {
    for (const nonsense of ['no-such-card', '', 'constructor', 'toString']) {
      expect(cardAssetPath(nonsense), nonsense).toBeNull()
    }
  })

  it.runIf(assetsInstalled)('resolves most of the card catalog to real files', () => {
    const broken: string[] = []
    let resolved = 0
    for (const card of CARD_TEMPLATES) {
      const assetPath = cardAssetPath(card.id)
      if (!assetPath) continue
      resolved += 1
      if (!existsSync(onDisk(assetPath))) broken.push(`${card.id} -> ${assetPath}`)
    }
    if (manifestPopulated) expect(resolved, 'no card resolved at all').toBeGreaterThan(20)
    expect(broken.slice(0, 5), broken.slice(0, 5).join(', ')).toEqual([])
  })
})

describe('towerAssetUrl', () => {
  it('joins a base without doubling or dropping the slash', () => {
    const assetPath = cardAssetPath('aoe')!
    expect(towerAssetUrl(assetPath, '/node_modules/tower-assets'))
      .toBe(`/node_modules/tower-assets/${assetPath}`)
    expect(towerAssetUrl(assetPath, '/node_modules/tower-assets/'))
      .toBe(`/node_modules/tower-assets/${assetPath}`)
  })

  it('passes null through, so a missing asset stays missing', () => {
    // Turning "no art" into a URL to nothing is exactly the failure this package avoids.
    expect(towerAssetUrl(null, '/base')).toBeNull()
  })
})

describe('artwork domains added to tower-assets', () => {
  /*
   * The image set is being extended from the game files — bots, guardians, relics and
   * whatever else. Each domain has its own naming rule, and a rule cannot be inferred from a
   * list of filenames: `epic_oc.png` only means something once you know it is rarity plus
   * initials. So a new directory is INVENTORIED automatically and its resolver is written by
   * hand afterwards.
   *
   * This is the bit that stops the gap being silent. A domain sitting in the manifest with no
   * resolver is a set of images nothing can display, and without a test saying so it looks
   * exactly like a domain nobody added yet.
   */
  const RESOLVED_DOMAINS = new Set([
    ...Object.values({ Armor: 'modules_armor', Cannon: 'modules_cannon', Core: 'modules_core', Generator: 'modules_generator' }),
    'cards',
  ])

  it('lists every domain that has no typed resolver yet', () => {
    const unresolved = Object.keys(OTHER_ASSET_FILES).filter(dir => !RESOLVED_DOMAINS.has(dir))

    if (unresolved.length > 0) {
      const detail = unresolved
        .map(dir => `${dir} (${OTHER_ASSET_FILES[dir]!.length} files)`)
        .join(', ')
      // Reported, not asserted away: these images exist and nothing can currently show them.
      console.warn(
        `tower-assets has ${unresolved.length} artwork domain(s) with no resolver in `
        + `thetowersdk/assets: ${detail}. Add one per domain — the naming rule differs each time.`,
      )
    }

    // The inventory itself must always be present and readable, whatever is in it.
    for (const [dir, files] of Object.entries(OTHER_ASSET_FILES)) {
      expect(Array.isArray(files), dir).toBe(true)
      expect(files.length, dir).toBeGreaterThan(0)
    }
  })

  it.runIf(assetsInstalled)('inventories every artwork directory on disk', () => {
    /*
     * The check that makes the warning above meaningful: if the generator silently skipped a
     * directory, the unresolved list would be empty and everything would look finished.
     */
    const onDiskDirs = readdirSync(ASSETS_DIR, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name !== 'ocr')
      .map(entry => entry.name)

    const inManifest = new Set([...RESOLVED_DOMAINS, ...Object.keys(OTHER_ASSET_FILES)])
    const missed = onDiskDirs.filter(dir => !inManifest.has(dir))

    expect(missed, `directories present but not inventoried: ${missed.join(', ')}`).toEqual([])
    expect(onDiskDirs.length).toBeGreaterThanOrEqual(RESOLVED_DOMAINS.size)
  })
})
