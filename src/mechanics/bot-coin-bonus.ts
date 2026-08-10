/** Golden Bot coin bonus when an enemy is inside the bot's range. */

export function coinBotBonusMultiplier(inGoldenBotRange: boolean, goldenBotBonusMultiplier: number): number {
  if (!inGoldenBotRange) return 1
  return Math.max(1, goldenBotBonusMultiplier)
}
