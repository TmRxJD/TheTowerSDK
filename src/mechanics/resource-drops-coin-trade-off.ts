/** x1.80 Coins, but Tower Max Health -70% trade-off perk base multiplier. */
export const COIN_TRADE_OFF_PERK_BASE_MULT = 1.8

export function coinTradeOffPerkMult(
  active: boolean,
  improveTradeOffLabPct: number,
): number {
  if (!active) return 1
  const improve = 1 + Math.max(0, Number(improveTradeOffLabPct) || 0) / 100
  return COIN_TRADE_OFF_PERK_BASE_MULT * improve
}

export function standardPerkBonusPctFromLabLevel(labLevel: number): number {
  const level = Math.max(0, Math.floor(Number(labLevel) || 0))
  return level
}
