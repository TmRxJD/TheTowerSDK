import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  findGameAsset,
  GAME_ASSET_DOMAINS,
  GAME_ASSET_SIZES,
  GAME_ASSET_VERSION,
  GAME_ASSETS,
  gameAssetCoverage,
  gameAssetPath,
  gameAssetsInDomain,
  UNIDENTIFIED_GAME_SPRITES,
} from './index'

/**
 * The game artwork catalogue resolves to files that exist.
 *
 * Paths are derived — `<folder>/<slug>-<size>.webp` — rather than stored, so the catalogue is a
 * third of the size and cannot disagree with itself. The risk that trades against is a rule that
 * is subtly wrong for some domain, which would produce confident paths to nothing. A missing
 * image does not throw: it renders as a gap, on one card, at one size.
 *
 * So the sweep below checks every path against the DIRECTORY, not against the manifest the
 * catalogue was generated from — checking a claim against the thing it was derived from proves
 * only that the derivation is self-consistent.
 */

const ARTWORK = path.resolve(__dirname, '..', '..', '..', 'tower-assets', 'assets', 'game')
const HAS_ARTWORK = existsSync(ARTWORK)

describe('the game artwork catalogue', () => {
  it('carries the build it came from', () => {
    expect(GAME_ASSET_VERSION).toMatch(/^\d+\.\d+/)
    expect(GAME_ASSETS.length).toBeGreaterThan(1000)
    expect(GAME_ASSET_DOMAINS.length).toBeGreaterThan(15)
  })

  it('resolves by name, by slug and by sprite name', () => {
    const entry = findGameAsset('Amplifying Strike')
    expect(entry?.domain).toBe('modules')
    expect(findGameAsset('amplifying-strike')?.slug).toBe(entry?.slug)
    expect(findGameAsset(entry!.sprite)?.slug).toBe(entry?.slug)
  })

  it('returns null rather than a wrong path', () => {
    expect(gameAssetPath('Not A Real Asset')).toBeNull()
    expect(findGameAsset('Not A Real Asset')).toBeNull()
  })

  it('defaults to the middle size', () => {
    expect(gameAssetPath('Amplifying Strike')).toBe(gameAssetPath('Amplifying Strike', 'md'))
    expect(gameAssetPath('Amplifying Strike', 'lg')).toContain('-lg.webp')
  })

  it('reports what is catalogued and what is not', () => {
    const coverage = gameAssetCoverage()
    expect(coverage.version).toBe(GAME_ASSET_VERSION)
    expect(coverage.domains.reduce((sum, d) => sum + d.assets, 0)).toBe(GAME_ASSETS.length)
    /*
     * The unidentified count is part of the answer. The extraction names a sprite by matching it
     * against the SDK's own catalogs, and what it cannot place is reported rather than dropped —
     * a shorter catalogue would read as a complete one.
     */
    expect(coverage.unidentified).toBe(UNIDENTIFIED_GAME_SPRITES.length)
    expect(coverage.unidentified).toBeGreaterThan(0)
  })

  it('groups every asset under a known domain', () => {
    const known = new Set<string>(GAME_ASSET_DOMAINS)
    const stray = GAME_ASSETS.filter(entry => !known.has(entry.domain))
    expect(stray.map(entry => entry.name)).toEqual([])
    expect(gameAssetsInDomain('modules').length).toBeGreaterThan(50)
  })

  it.skipIf(!HAS_ARTWORK)('every derived path is a file that exists', () => {
    const missing: string[] = []
    for (const entry of GAME_ASSETS) {
      for (const size of GAME_ASSET_SIZES) {
        const resolved = gameAssetPath(entry.name, size)
        if (!resolved || !existsSync(path.join(ARTWORK, resolved))) {
          missing.push(`${entry.name} (${size}) -> ${resolved}`)
        }
      }
    }
    expect(
      missing.slice(0, 10),
      `${missing.length} of ${GAME_ASSETS.length * GAME_ASSET_SIZES.length} derived path(s) `
      + `do not exist:\n  ${missing.slice(0, 10).join('\n  ')}`,
    ).toEqual([])
  })
})
