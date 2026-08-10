/**
 * Spawn rate cap (`enemySpawnChance`) from Wave Accelerator mastery chart.
 *
 * Indexes mastery level into threshold arrays, compares effective wave against thresholds,
 * then reads spawn cap from the chart column.
 */
import {
  WAVE_ACCELERATOR_SPAWN_RATE_ROWS,
  type WaveAcceleratorSpawnRatesRow,
} from '../data/chart-tables'

const SPAWN_RATE_ROWS = WAVE_ACCELERATOR_SPAWN_RATE_ROWS

export type WaveAcceleratorSpawnRateCapInput = {
  wave: number
  /**
   * Wave Accelerator mastery level 0–9 (110%–200% spawn acceleration).
   * `null` / omitted = no mastery bonus (chart "Normal" column).
   */
  waveAcceleratorMastery?: number | null
}

/** Mastery bonus % over baseline (level 0 → 10%, level 9 → 100%). */
export function waveAcceleratorSpawnMasteryBonusPercent(masteryLevel: number): number {
  const level = Math.max(0, Math.min(9, Math.floor(Number(masteryLevel) || 0)))
  return (level + 1) * 10
}

/**
 * Cards tracker mastery → chart column input.
 * `null` / omitted / negative = no WA mastery (chart "Normal" column).
 */
export function resolveWaveAcceleratorMasteryForSpawnCap(
  waveAcceleratorMastery: number | null | undefined,
): number | null {
  if (waveAcceleratorMastery == null) return null
  const level = Math.floor(Number(waveAcceleratorMastery))
  if (!Number.isFinite(level) || level < 0) return null
  return Math.min(9, level)
}

/** Chart column for a WA mastery level; `null` mastery uses the Normal (0% reduction) column. */
export function waveAcceleratorSpawnRateChartColumn(
  waveAcceleratorMastery: number | null | undefined,
): keyof WaveAcceleratorSpawnRatesRow {
  const mastery = resolveWaveAcceleratorMasteryForSpawnCap(waveAcceleratorMastery)
  if (mastery == null) {
    return 'normal'
  }
  const bonus = waveAcceleratorSpawnMasteryBonusPercent(mastery)
  if (bonus >= 100) return 'reduction100'
  return `reduction${bonus}` as keyof WaveAcceleratorSpawnRatesRow
}

function waveThresholdForRow(
  row: WaveAcceleratorSpawnRatesRow,
  column: keyof WaveAcceleratorSpawnRatesRow,
): number {
  const value = row[column]
  return typeof value === 'number' ? value : Number.POSITIVE_INFINITY
}

/**
 * Highest spawn-count row whose mastery-adjusted wave threshold is <= `wave`.
 * Below the first chart threshold, scales linearly toward the first cap (37 @ wave 1000).
 */
export function enemySpawnRateCapFromWaveAcceleratorChart(
  input: WaveAcceleratorSpawnRateCapInput,
): number {
  const wave = Math.max(1, Math.floor(Number(input.wave) || 1))
  const mastery = resolveWaveAcceleratorMasteryForSpawnCap(input.waveAcceleratorMastery)
  const column = waveAcceleratorSpawnRateChartColumn(mastery)

  let cap = 0
  for (const row of SPAWN_RATE_ROWS) {
    if (wave >= waveThresholdForRow(row, column)) {
      cap = row.spawnCount
    }
  }
  if (cap > 0) return cap

  const firstRow = SPAWN_RATE_ROWS[0]
  if (!firstRow) return 1

  const firstThreshold = waveThresholdForRow(firstRow, column)
  const firstCap = firstRow.spawnCount
  return Math.max(1, Math.floor(((firstCap - 1) * wave) / firstThreshold))
}
