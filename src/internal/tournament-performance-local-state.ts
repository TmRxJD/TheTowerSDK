import { buildNormalizerPersistenceSchema } from './local-persistence-types'

export type TournamentPerformanceLocalState = {
  selectedLeagues: string[]
  searchPlayerId: string
}

export const defaultTournamentPerformanceLocalState = (): TournamentPerformanceLocalState => ({
  selectedLeagues: [],
  searchPlayerId: '',
})

function normalizeLeagueSelection(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0))]
}

export function normalizeTournamentPerformanceLocalState(
  input: unknown,
  base: TournamentPerformanceLocalState = defaultTournamentPerformanceLocalState(),
): TournamentPerformanceLocalState {
  const data = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  return {
    selectedLeagues: normalizeLeagueSelection(data.selectedLeagues),
    searchPlayerId: typeof data.searchPlayerId === 'string' ? data.searchPlayerId.trim() : base.searchPlayerId,
  }
}

export const tournamentPerformanceLocalPersistenceSchema = buildNormalizerPersistenceSchema(normalizeTournamentPerformanceLocalState)
