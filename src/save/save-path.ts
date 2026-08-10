import { countImportableBattleRuns } from './battle-history'

/** Official The Tower Android package id (Idle Tower Defense). */
export const TOWER_ANDROID_PACKAGE = 'com.TechTreeGames.TheTower'

export const TOWER_PLAYER_INFO_FILENAME = 'playerInfo.dat'

export const TOWER_ANDROID_PLAYER_INFO_SAVE_RELATIVE = `files/${TOWER_PLAYER_INFO_FILENAME}`

export const MISPLACED_PLAYER_INFO_SAVE_TITLE = 'Wrong playerInfo.dat location'

export function normalizePlayerInfoSourcePath(sourcePath: string): string {
  return String(sourcePath ?? '').trim().replace(/\\/g, '/')
}

export function buildMisplacedPlayerInfoSaveFix(sourcePath?: string | null): string {
  const example = `Android/data/${TOWER_ANDROID_PACKAGE}/${TOWER_ANDROID_PLAYER_INFO_SAVE_RELATIVE}`
  const picked = sourcePath?.trim()
  if (picked) {
    return `You selected the copy in the app folder root, not the one inside the files folder. Choose ${example} instead. (Selected: ${picked})`
  }
  return `That looks like the copy in the app folder root, not the one inside the files folder. Choose ${example} instead.`
}

/**
 * True when playerInfo.dat sits directly under Android/data/<package>/ instead of .../files/.
 * Also handles folder-picker relative paths like com.TechTreeGames.TheTower/playerInfo.dat.
 */
export function isMisplacedAndroidDataPlayerInfoPath(sourcePath: string): boolean {
  const normalized = normalizePlayerInfoSourcePath(sourcePath)
  if (!normalized) return false
  if (!/(^|\/)playerinfo\.dat$/i.test(normalized)) return false

  const androidDataMatch = normalized.match(/\/android\/data\/[^/]+\/(.+)$/i)
  if (androidDataMatch) {
    const afterPackage = androidDataMatch[1]
    if (/^files\//i.test(afterPackage)) return false
    return /^playerinfo\.dat$/i.test(afterPackage)
  }

  const segments = normalized.split('/').filter(Boolean)
  const fileName = segments.at(-1)
  if (!fileName || !/^playerinfo\.dat$/i.test(fileName)) return false
  const parent = segments.at(-2)
  if (!parent || /^files$/i.test(parent)) return false

  if (/techtree|thetower/i.test(parent)) return true
  if (/\.[A-Za-z][A-Za-z0-9_.-]*$/i.test(parent)) return true
  return false
}

export function looksLikeMisplacedParentPlayerInfoContent(
  parsedRoot: Record<string, unknown>,
  options?: { wasGzip?: boolean },
): boolean {
  if (options?.wasGzip !== false) return false
  if (countImportableBattleRuns(parsedRoot) > 0) return false
  const keyCount = Object.keys(parsedRoot).length
  if (keyCount <= 1) return false
  return true
}

export type MisplacedPlayerInfoSaveDetection = {
  title: string
  fix: string
}

export function detectMisplacedPlayerInfoSave(options: {
  sourcePath?: string | null
  parsedRoot?: Record<string, unknown> | null
  wasGzip?: boolean
}): MisplacedPlayerInfoSaveDetection | null {
  const sourcePath = options.sourcePath?.trim() || null
  if (sourcePath && isMisplacedAndroidDataPlayerInfoPath(sourcePath)) {
    return {
      title: MISPLACED_PLAYER_INFO_SAVE_TITLE,
      fix: buildMisplacedPlayerInfoSaveFix(sourcePath),
    }
  }

  if (
    options.parsedRoot
    && looksLikeMisplacedParentPlayerInfoContent(options.parsedRoot, { wasGzip: options.wasGzip })
  ) {
    return {
      title: MISPLACED_PLAYER_INFO_SAVE_TITLE,
      fix: buildMisplacedPlayerInfoSaveFix(sourcePath),
    }
  }

  return null
}
