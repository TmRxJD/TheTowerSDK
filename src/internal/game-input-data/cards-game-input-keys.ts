import type { GameDataKey } from './game-data-registry'

export const LINKED_CARD_PROGRESS_SLUGS = ['eb', 'ws', 'wa'] as const

export type LinkedCardProgressSlug = (typeof LINKED_CARD_PROGRESS_SLUGS)[number]

export function isLinkedCardProgressSlug(slug: string): slug is LinkedCardProgressSlug {
  return (LINKED_CARD_PROGRESS_SLUGS as readonly string[]).includes(slug)
}

export function resolveLinkedCardLevelGameDataKey(slug: LinkedCardProgressSlug | string): GameDataKey {
  if (slug === 'wa') return 'wave_accelerator_level'
  return 'card_game_level'
}

export function resolveLinkedCardMasteryGameDataKey(): 'card_mastery_select' {
  return 'card_mastery_select'
}
