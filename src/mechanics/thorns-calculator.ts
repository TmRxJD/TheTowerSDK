/**
 * Thorns: how many contacts it takes to kill what is touching your wall.
 *
 * This is the model the Run Tracker's thorns calculator runs, moved here so the package and the
 * site answer with the same numbers. It had lived beside the app, which meant the SDK shipped a
 * different, lower-level thorns calculator whose inputs -- an enemy factor, a thorn multiplier --
 * are values a player has no way to read off their screen.
 *
 * What a player does know is on this input: base thorns, the tier, plasma cannon and its mastery,
 * the two BC reduction labs, whether Sharp Fortitude is taken, and the wave a tournament heat
 * reading came from. Everything else is derived.
 *
 * Thorn damage is a share of the ENEMY'S contact damage, not of the tower's damage, which is the
 * part most tools get backwards.
 */
import { clampCampaignTier } from '../data/index'
import type { ThornsCalcsTournamentTier } from '../internal/calculator-local-state-schemas'

export type ThornsTournamentTier = ThornsCalcsTournamentTier
type TournamentTier = ThornsTournamentTier

export interface ThornsCalculatorInput {
  baseThorns: number
  tier: number
  pcLevel: number
  pcMasteryLevel: number
  bcLabLevel: number
  bcReductionLabLevel: number
  pcReductionLabLevel: number
  tournamentTier: TournamentTier
  heatWave: number
  sharpFortitude: boolean
}

export interface ThornsWallChartRow {
  wallThorns: number
  hitsToKillElite: number
  hitsToKillFleet: number
  hitsToKillElitePC: number
  hitsToKillBoss: number
  hitsToKillBossPC: number
}

export interface ThornsBaseChartRow {
  baseThornsVal: number
  hitsToKillElite: number
  hitsToKillFleet: number
  hitsToKillElitePC: number
  hitsToKillBoss: number
  hitsToKillBossPC: number
}

const THORN_TIER_EFFECTIVENESS = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.80, 0.70, 0.60, 0.50, 0.40, 0.30, 0.20, 0.10, 0.10, 0.10, 0.10,
] as const

const PC_TIER_EFFECTIVENESS = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.80, 0.70, 0.60, 0.50, 0.40, 0.30, 0.20, 0.10, 0.10, 0.10, 0.10,
] as const

/** Fleet thorns use 15% effectiveness (85% resistance) in v28.3+. */
const FLEET_THORNS_EFFECTIVENESS_MULT = 0.85

const HEAT_WAVE_TABLE: Array<{ wave: number; t11: number; t14: number }> = [
  { wave: 0, t11: 95, t14: 95 },
  { wave: 20, t11: 90, t14: 90 },
  { wave: 40, t11: 80, t14: 80 },
  { wave: 60, t11: 75, t14: 75 },
  { wave: 80, t11: 70, t14: 70 },
  { wave: 100, t11: 65, t14: 65 },
  { wave: 150, t11: 60, t14: 60 },
  { wave: 200, t11: 58, t14: 58 },
  { wave: 250, t11: 56, t14: 56 },
  { wave: 300, t11: 54, t14: 54 },
  { wave: 350, t11: 52, t14: 50 },
  { wave: 400, t11: 50, t14: 45 },
  { wave: 450, t11: 48, t14: 40 },
  { wave: 500, t11: 46, t14: 35 },
  { wave: 600, t11: 44, t14: 30 },
  { wave: 700, t11: 40, t14: 25 },
  { wave: 800, t11: 35, t14: 20 },
  { wave: 900, t11: 30, t14: 15 },
  { wave: 1000, t11: 20, t14: 5 },
]

function clampInteger(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

function normalizeTournamentTier(value: string | undefined): TournamentTier {
  if (value === 't11' || value === 't14' || value === 't17') {
    return value
  }
  return 'none'
}

function getTournamentEffectiveness(tier: TournamentTier, wave: number): number | undefined {
  if (tier === 'none') return undefined
  const row = HEAT_WAVE_TABLE.find(entry => entry.wave === wave)
  if (!row) return undefined
  return tier === 't11' ? row.t11 / 100 : row.t14 / 100
}

export function normalizeThornsInput(input: Partial<ThornsCalculatorInput>): ThornsCalculatorInput {
  const normalized: ThornsCalculatorInput = {
    baseThorns: clampInteger(Number(input.baseThorns ?? 100), 0, 600),
    tier: clampCampaignTier(Number(input.tier ?? 1)),
    pcLevel: clampInteger(Number(input.pcLevel ?? 0), 0, 7),
    pcMasteryLevel: clampInteger(Number(input.pcMasteryLevel ?? 0), 0, 9),
    bcLabLevel: clampInteger(Number(input.bcLabLevel ?? 0), 0, 10),
    bcReductionLabLevel: clampInteger(Number(input.bcReductionLabLevel ?? 0), 0, 20),
    pcReductionLabLevel: clampInteger(Number(input.pcReductionLabLevel ?? 0), 0, 20),
    tournamentTier: normalizeTournamentTier(input.tournamentTier),
    heatWave: clampInteger(Number(input.heatWave ?? 0), 0, 1000),
    sharpFortitude: Boolean(input.sharpFortitude ?? false),
  }

  if (normalized.pcLevel < 7) {
    normalized.pcMasteryLevel = 0
  }
  if (normalized.pcMasteryLevel > 0) {
    normalized.pcLevel = 7
  }

  return normalized
}

function getDerivedScalars(input: ThornsCalculatorInput) {
  const tierIndex = clampCampaignTier(input.tier) - 1
  const tournamentEffectiveness = getTournamentEffectiveness(input.tournamentTier, input.heatWave)
  const thornsTierEffectiveness = tournamentEffectiveness ?? THORN_TIER_EFFECTIVENESS[tierIndex]
  const pcTierEffectiveness = tournamentEffectiveness ?? PC_TIER_EFFECTIVENESS[tierIndex]

  const bcReductionMultiplier = 1 + input.bcReductionLabLevel / 100
  const adjustedEffectiveness = (thornsTierEffectiveness + input.bcLabLevel * 0.02) * bcReductionMultiplier

  const pcBaseEffectiveness = input.pcLevel > 0 ? 0.3 + (input.pcLevel - 1) * 0.04 : 0
  const pcReductionLabMultiplier = 1 + input.pcReductionLabLevel / 100
  const pcEffectiveBoss = input.pcLevel > 0
    ? pcBaseEffectiveness * pcTierEffectiveness * bcReductionMultiplier * pcReductionLabMultiplier
    : 0
  const pcEffectiveElite = input.pcLevel >= 7 && input.pcMasteryLevel > 0
    ? pcBaseEffectiveness * (0.05 + (input.pcMasteryLevel - 1) * 0.05) * bcReductionMultiplier * pcReductionLabMultiplier
    : 0

  return {
    adjustedEffectiveness,
    pcEffectiveBoss,
    pcEffectiveElite,
  }
}

function hitsToKill(damagePerHit: (hitNumber: number) => number): number {
  let total = 0
  let hits = 0
  while (total <= 100 && hits < 1000) {
    hits += 1
    total += damagePerHit(hits)
  }
  return hits
}

export function buildThornsWallChart(input: Partial<ThornsCalculatorInput>): ThornsWallChartRow[] {
  const normalized = normalizeThornsInput(input)
  const derived = getDerivedScalars(normalized)

  const rows: ThornsWallChartRow[] = []
  for (let wallThorns = 1; wallThorns <= 20; wallThorns += 1) {
    const eliteDamage = (hitNumber: number) => {
      const effectiveWall = normalized.sharpFortitude && hitNumber > 1
        ? wallThorns * (1 + 0.01 * (hitNumber - 1))
        : wallThorns
      return normalized.baseThorns * ((effectiveWall / 100) * derived.adjustedEffectiveness)
    }

    const bossDamage = (hitNumber: number) => eliteDamage(hitNumber) / 2
    const fleetDamage = (hitNumber: number) => eliteDamage(hitNumber) * FLEET_THORNS_EFFECTIVENESS_MULT

    const hitsToKillElite = hitsToKill(eliteDamage)
    const hitsToKillFleet = hitsToKill(fleetDamage)
    const hitsToKillElitePC = normalized.pcLevel > 0
      ? hitsToKill(hitNumber => eliteDamage(hitNumber) * (1 + derived.pcEffectiveElite))
      : hitsToKillElite
    const hitsToKillBoss = hitsToKill(bossDamage)
    const hitsToKillBossPC = normalized.pcLevel > 0
      ? hitsToKill(hitNumber => bossDamage(hitNumber) * (1 + derived.pcEffectiveBoss))
      : hitsToKillBoss

    rows.push({
      wallThorns,
      hitsToKillElite,
      hitsToKillFleet,
      hitsToKillElitePC,
      hitsToKillBoss,
      hitsToKillBossPC,
    })
  }

  return rows
}

export function buildThornsBaseChart(input: Partial<ThornsCalculatorInput>): ThornsBaseChartRow[] {
  const normalized = normalizeThornsInput(input)
  const derived = getDerivedScalars(normalized)

  const rows: ThornsBaseChartRow[] = []
  for (let offset = 0; offset < 20; offset += 1) {
    const baseValue = clampInteger(normalized.baseThorns + offset, 0, 600)

    const eliteDamage = () => baseValue * (1 * derived.adjustedEffectiveness)
    const bossDamage = () => eliteDamage() / 2
    const fleetDamage = () => eliteDamage() * FLEET_THORNS_EFFECTIVENESS_MULT

    const hitsToKillElite = hitsToKill(() => eliteDamage())
    const hitsToKillFleet = hitsToKill(() => fleetDamage())
    const hitsToKillElitePC = normalized.pcLevel > 0
      ? hitsToKill(() => eliteDamage() * (1 + derived.pcEffectiveElite))
      : hitsToKillElite
    const hitsToKillBoss = hitsToKill(() => bossDamage())
    const hitsToKillBossPC = normalized.pcLevel > 0
      ? hitsToKill(() => bossDamage() * (1 + derived.pcEffectiveBoss))
      : hitsToKillBoss

    rows.push({
      baseThornsVal: baseValue,
      hitsToKillElite,
      hitsToKillFleet,
      hitsToKillElitePC,
      hitsToKillBoss,
      hitsToKillBossPC,
    })
  }

  return rows
}
