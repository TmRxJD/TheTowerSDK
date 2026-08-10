/** Why medal budget may remain after allocation completes. */
export type BotMedalBudgetStopReason =
  | 'invalid_inputs'
  | 'complete'
  | 'tier_admission_blocked'
  | 'no_upgrade_candidates'

/** Shared planner thresholds — single source for Vue compute and future bot reuse. */
export const BOT_MEDAL_PLANNER_THRESHOLDS = {
  secondarySyncedDurationLagLevels: 4,
  naturalSyncTargetToleranceSeconds: 0.75,
  maxRecommendedAddedCooldownLabs: 2,
  durationLuxuryMinUptimeGain: 0.018,
  durationLuxuryPrimaryMinUptimeGain: 0.012,
  durationLowRangeBonusMinUptimeGain: 0.03,
  durationLowRangeBonusPrimaryMinUptimeGain: 0.024,
  minMeaningfulTailObjectiveDelta: 1e-9,
  minMeaningfulTierEntryObjectiveDelta: 0.015,
  primaryCompletionMaxRemainingLevels: 1,
  primaryDurationAdmissionMaxRemainingLevels: 3,
  priorityRangeAnchorToleranceMeters: 0.25,
  plannerLookaheadDepth: 14,
  plannerBeamWidth: 14,
  plannerMaxBatches: 24,
  plannerMaxBundleCandidates: 36,
  effectivePathForwardStepCount: 30,
  plannerBeamObjectiveMinDelta: 0.0001,
  plannerBeamBundleMinDelta: 0.0001,
  /** Penalize uptime ratios above this target (duration/cooldown). */
  dutyCycleOvershootTarget: 0.92,
} as const
