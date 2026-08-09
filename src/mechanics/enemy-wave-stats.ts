/** Re-export enemy wave stats; keep waveBands for level-skip wave scaling. */
export {
  ENEMY_TYPE_MULT,
  getBasicEnemyWaveStats,
  getEnemyWaveStats,
  getWaveBaseStats,
  type EnemyWaveBaseStats,
  type EnemyWaveEnemyType,
  type EnemyWaveStats,
} from '../internal/enemy-wave-stats'

/** Legacy band helper used by enemy-level-skip.ts (not GetWaveBaseHealth bands). */
export function waveBands(wave: number) {
  const w = Math.max(1, Math.floor(wave))
  return {
    over1024: Math.floor(w / 1024),
    over5: Math.floor(w / 5),
    over10: Math.floor(w / 10),
    over6: Math.floor(w / 6),
    over15: Math.floor(w / 15),
    over25: Math.floor(w / 25),
    over37: Math.floor(w / 37),
    over38: Math.floor(w / 38),
    over50: Math.floor(w / 50),
    over75: Math.floor(w / 75),
    over100: Math.floor(w / 100),
    over200: Math.floor(w / 200),
    over300: Math.floor(w / 300),
    overHigh: Math.floor(w / 500),
    overLate: Math.floor(w / 1000),
    overAdj: Math.floor(Math.floor(w / 10) / 64),
  }
}
