import { describe, expect, it } from 'vitest'

import {
  buildMisplacedPlayerInfoSaveFix,
  detectMisplacedPlayerInfoSave,
  isMisplacedAndroidDataPlayerInfoPath,
  looksLikeMisplacedParentPlayerInfoContent,
} from './save-path'

describe('player-info-save-path', () => {
  it('flags Android/data package-root playerInfo.dat', () => {
    expect(
      isMisplacedAndroidDataPlayerInfoPath(
        '/storage/emulated/0/Android/data/com.TechTreeGames.TheTower/playerInfo.dat',
      ),
    ).toBe(true)
    expect(
      isMisplacedAndroidDataPlayerInfoPath(
        'C:\\Users\\x\\Android\\data\\com.TechTreeGames.TheTower\\playerInfo.dat',
      ),
    ).toBe(true)
  })

  it('accepts the files/playerInfo.dat copy', () => {
    expect(
      isMisplacedAndroidDataPlayerInfoPath(
        '/storage/emulated/0/Android/data/com.TechTreeGames.TheTower/files/playerInfo.dat',
      ),
    ).toBe(false)
    expect(
      isMisplacedAndroidDataPlayerInfoPath('com.TechTreeGames.TheTower/files/playerInfo.dat'),
    ).toBe(false)
  })

  it('flags folder-picker relative paths under the package folder', () => {
    expect(isMisplacedAndroidDataPlayerInfoPath('com.TechTreeGames.TheTower/playerInfo.dat')).toBe(true)
    expect(isMisplacedAndroidDataPlayerInfoPath('Downloads/playerInfo.dat')).toBe(false)
  })

  it('detects misplaced saves from path before content checks', () => {
    const detection = detectMisplacedPlayerInfoSave({
      sourcePath: 'com.TechTreeGames.TheTower/playerInfo.dat',
      parsedRoot: {
        recordCount: 12,
        battleHistory: { _items: [{ tier: 1, wave: 10 }] },
      },
      wasGzip: true,
    })
    expect(detection?.title).toMatch(/wrong playerinfo/i)
    expect(detection?.fix).toMatch(/files\/playerInfo\.dat/i)
  })

  it('falls back to content heuristic for uncompressed stub saves without battle history', () => {
    expect(
      looksLikeMisplacedParentPlayerInfoContent({ recordCount: 3, strings: ['x'] }, { wasGzip: false }),
    ).toBe(true)
    expect(
      looksLikeMisplacedParentPlayerInfoContent({ recordCount: 3, strings: ['x'] }, { wasGzip: true }),
    ).toBe(false)

    const detection = detectMisplacedPlayerInfoSave({
      parsedRoot: { recordCount: 3, strings: ['x'] },
      wasGzip: false,
    })
    expect(detection?.fix).toBe(buildMisplacedPlayerInfoSaveFix(null))
  })
})
