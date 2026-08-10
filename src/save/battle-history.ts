/** Locate battle history array inside NRBF-parsed save root (case-insensitive key). */
export function findBattleHistoryItems(parsedRoot: unknown): unknown[] | null {
  if (!parsedRoot || typeof parsedRoot !== 'object') {
    return null
  }

  const root = parsedRoot as Record<string, unknown>
  for (const key of Object.keys(root)) {
    if (!/battlehistory/i.test(key)) {
      continue
    }
    const history = root[key]
    if (!history || typeof history !== 'object') {
      continue
    }
    const items = (history as { _items?: unknown[] })._items
    if (Array.isArray(items)) {
      return items
    }
  }

  return null
}

export function looksLikeBattleRun(run: unknown): boolean {
  if (!run || typeof run !== 'object') {
    return false
  }
  const entry = run as Record<string, unknown>
  return (
    'tier' in entry
    || 'wave' in entry
    || 'battleDate' in entry
    || 'isTournament' in entry
    || 'killedBy' in entry
    || 'coinsEarned' in entry
  )
}

export function countImportableBattleRuns(parsedRoot: unknown): number {
  const items = findBattleHistoryItems(parsedRoot)
  if (!items) {
    return 0
  }
  return items.filter(looksLikeBattleRun).length
}

export function listImportableBattleRuns(parsedRoot: unknown): Record<string, unknown>[] {
  const items = findBattleHistoryItems(parsedRoot)
  if (!items) {
    return []
  }
  return items.filter(looksLikeBattleRun) as Record<string, unknown>[]
}
