import { z } from 'zod'

export const sharedCardsProgressInputsSchema = z.object({
  ebLevel: z.number(),
  ebMastery: z.number(),
  wsLevel: z.number(),
  wsMastery: z.number(),
  waLevel: z.number(),
  waMastery: z.number(),
  coinsLevel: z.number(),
  coinsMastery: z.number(),
})

export type SharedCardsProgressInputs = z.infer<typeof sharedCardsProgressInputsSchema>

export const defaultSharedCardsProgressInputs: Readonly<SharedCardsProgressInputs> = {
  ebLevel: 1,
  ebMastery: -1,
  wsLevel: 1,
  wsMastery: -1,
  waLevel: 1,
  waMastery: -1,
  coinsLevel: 1,
  coinsMastery: -1,
}

function clampCardLevel(value: unknown, fallback: number): number {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(7, Math.max(1, parsed))
}

function clampCardMastery(value: unknown, fallback: number, level: number): number {
  if (level < 7) return -1
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return Math.min(10, parsed)
}

export function normalizeSharedCardsProgressInputs(
  value: unknown,
  fallback: SharedCardsProgressInputs = defaultSharedCardsProgressInputs,
): SharedCardsProgressInputs {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const ebLevel = clampCardLevel(source.ebLevel, fallback.ebLevel)
  const wsLevel = clampCardLevel(source.wsLevel, fallback.wsLevel)
  const waLevel = clampCardLevel(source.waLevel, fallback.waLevel)
  const coinsLevel = clampCardLevel(source.coinsLevel, fallback.coinsLevel)
  return {
    ebLevel,
    ebMastery: clampCardMastery(source.ebMastery, fallback.ebMastery, ebLevel),
    wsLevel,
    wsMastery: clampCardMastery(source.wsMastery, fallback.wsMastery, wsLevel),
    waLevel,
    waMastery: clampCardMastery(source.waMastery, fallback.waMastery, waLevel),
    coinsLevel,
    coinsMastery: clampCardMastery(source.coinsMastery, fallback.coinsMastery, coinsLevel),
  }
}

export type CardsLinkedProgress = {
  enemyBalanceLevel: number
  enemyBalanceMastery: number
  waveSkipLevel: number
  waveSkipMastery: number
  waveAcceleratorLevel: number
  waveAcceleratorMastery: number
}

export function cardsProgressInputsToLinkedProgress(
  inputs: SharedCardsProgressInputs,
): CardsLinkedProgress {
  return {
    enemyBalanceLevel: inputs.ebLevel,
    enemyBalanceMastery: inputs.ebMastery >= 0 ? inputs.ebMastery : 0,
    waveSkipLevel: inputs.wsLevel,
    waveSkipMastery: inputs.wsMastery >= 0 ? inputs.wsMastery : 0,
    waveAcceleratorLevel: inputs.waLevel,
    waveAcceleratorMastery: inputs.waMastery >= 0 ? inputs.waMastery : 0,
  }
}
