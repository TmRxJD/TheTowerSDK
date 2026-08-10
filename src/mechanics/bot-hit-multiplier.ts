/** Multiplicative factor applied to enemy hit damage. */

export interface AmplifyBotRangeInput {
  active: boolean
  amplifyBonusMultiplier: number
}

/** Spotlight boss reflect — Enemy.inSpotReflect (+0xF3), NOT coin bot. */
export interface SpotlightReflectAmpInput {
  active: boolean
  reflectMultiplier: number
}

export interface FlameModuleDebuffInput {
  active: boolean
}

export interface WildfirePoisonInput {
  active: boolean
  baseAmplifyMultiplier: number
  eliteSizeFactor?: number
  wildfireMultiplier?: number
}

/** Chain Lightning Shock — Enemy.shocked (+0xF4) / shockStack (+0xF8). */
export interface ChainLightningShockInput {
  active: boolean
  shockMultiplier: number
  shockStack?: number
}

export interface EnemyHitMultiplierInput {
  chainLightningShock?: ChainLightningShockInput
  poisonGateActive?: boolean
  poisonBaseMultiplier?: number
  poisonStackCount?: number
  wildfirePoison?: WildfirePoisonInput
  spotlightReflect?: SpotlightReflectAmpInput
  amplifyBot?: AmplifyBotRangeInput
  flameModuleDebuff?: FlameModuleDebuffInput
  shockwaveMultiplier?: number
  /** Protector aura damage reduction — typically <1. */
  protectorDamageReduction?: number
}

export function applyPoisonGateMultiplier(
  base: number,
  poisonGateActive: boolean,
  poisonBase: number,
  poisonStacks: number,
): number {
  if (!poisonGateActive) return base
  let mult = poisonBase
  if (poisonStacks > 0) {
    mult = (mult - 1) * poisonStacks + 1
  }
  return base * mult
}

/** `(base - 1) * shockStack + 1` while a shock stack is active, otherwise `base`. */
export function chainLightningShockMultiplier(
  shockMultiplier: number,
  shockStack = 0,
): number {
  if (shockStack > 0) {
    return (shockMultiplier - 1) * shockStack + 1
  }
  return shockMultiplier
}

export function enemyHitMultiplier(input: EnemyHitMultiplierInput): number {
  let mult = 1
  if (input.chainLightningShock?.active) {
    mult = chainLightningShockMultiplier(
      input.chainLightningShock.shockMultiplier,
      input.chainLightningShock.shockStack ?? 0,
    )
  }

  if (input.poisonGateActive) {
    mult = applyPoisonGateMultiplier(mult, true, input.poisonBaseMultiplier ?? 1, input.poisonStackCount ?? 0)
  }

  if (input.wildfirePoison?.active) {
    const base = input.wildfirePoison.baseAmplifyMultiplier
    const elite = input.wildfirePoison.eliteSizeFactor ?? 1
    mult *= base * elite
    if (input.wildfirePoison.wildfireMultiplier != null) {
      mult *= input.wildfirePoison.wildfireMultiplier
    }
  }

  if (input.spotlightReflect?.active) {
    mult *= Math.max(1, input.spotlightReflect.reflectMultiplier)
  }

  if (input.amplifyBot?.active) {
    mult *= Math.max(1, input.amplifyBot.amplifyBonusMultiplier)
  }

  if (input.flameModuleDebuff?.active) {
    mult += mult
  }

  if (input.shockwaveMultiplier != null && input.shockwaveMultiplier > 0) {
    mult *= input.shockwaveMultiplier
  }

  if (input.protectorDamageReduction != null && input.protectorDamageReduction > 0) {
    mult *= input.protectorDamageReduction
  }

  return mult
}

/** Bot-on-bot overlap boost for planner overlap interpolation. */
export function botBotBoostedMultiplier(
  botBotBonus: number,
  maximumPower: number,
  overlapFraction: number,
): number {
  const boosted = Math.max(1, botBotBonus) * Math.max(1, maximumPower)
  const overlap = Math.max(0, Math.min(1, overlapFraction))
  return 1 + (boosted - 1) * overlap
}
