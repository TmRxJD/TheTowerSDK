/**
 * Small compounding bonuses.
 *
 * Derived from `plusFormulas.ts` in tower-idle-toolkit by skye (ISC).
 * See NOTICE at the package root.
 */

/**
 * Extra multiplier earned at the end of a Golden Combo, on top of the coins
 * already collected during it.
 *
 * @param bonusPercent Value of the Golden Combo bonus upgrade, as a percentage.
 * @param kills Number of kills in the combo.
 */
export function goldenComboBonus (bonusPercent: number, kills: number): number {
  return (1 + bonusPercent / 100) ** kills - 1
}

/**
 * Multiplier on base Inner Land Mine damage after charging.
 *
 * @param bonusPerSecond Value of the Charge Mines upgrade.
 * @param seconds Seconds spent charging.
 */
export function mineChargeMultiplier (bonusPerSecond: number, seconds: number): number {
  return 1 + bonusPerSecond * seconds
}
