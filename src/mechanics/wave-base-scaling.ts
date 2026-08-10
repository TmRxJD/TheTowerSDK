/**
 * Wave-base scaling entry point.
 *
 * Re-exports the empirical regression scaler; see `wave-base-empirical-scaling`
 * for how the coefficients behave and what accuracy to expect.
 */
export {
  computeWaveBaseDamage,
  computeWaveBaseHealth,
  computeWaveBaseHealthRaw,
  damageTierDifficultyMultiplier,
  damageWave100Multiplier,
  healthTierDifficultyMultiplier,
  healthWave100Multiplier,
  tierCoinMultiplier,
  tierDifficultyMultiplier,
  wave100Multiplier,
  type WaveBaseScalingInput,
} from './wave-base-empirical-scaling'
