/**
 * Effective Paths — effective economy, end to end.
 *
 * `eEcon!DS5` is four factors: a base, the coin weapons' synchronisation,
 * Spotlight's coverage and what wave skipping does to the clock. All four
 * multiply, so unlike the damage side there is no added half here.
 *
 * ```text
 * DS5 = CW5 × DM5 × DQ5 × DR5
 * CW5 = CP6 × Disco × CPK × Card × EOm × BHDig × Generator
 * ```
 *
 * The value it maximises is average coins per kill with the run's length folded
 * in — not coins per hour, and not the coins-saved figure the discount tab
 * reports. Those three are not comparable and the sheet keeps them apart.
 */

import { computeModuleStat } from '../data/module-bonus'
import { dissonantBoostOfType } from './effective-paths-ehp-model'
import { moduleBonus } from './effective-paths-generics'
import {
  blackHoleCoinBonus,
  blackHoleCooldown,
  blackHoleDuration,
  coinsCard,
  coinsPerKill,
  deathWaveCoinBonus,
  deathWaveCooldownFromStones,
  deathWaveQuantityFromStones,
  extraOrbMastery,
  freeUpgradeChance,
  galaxyCompressorTimeBoost,
  goldenCombo,
  goldenTowerBonus,
  goldenTowerCooldown,
  goldenTowerDuration,
  maxValueNukeCooldown,
  spotlightCoinBonus,
  spotlightCoverageAngle,
  spotlightQuantity,
  syncMultiplier,
  waveSkipFreeUpgrades,
  waveSkipTimeSaved,
} from './effective-paths-eecon-stats'
import type { EffectiveEconomyLevels } from './effective-paths-eecon-levels'

/** A module substat pair — primary in `AO`, assist in `AP`. */
export interface EconomySubstat {
  primary: number
  assist: number
}

const NO_SUBSTAT: EconomySubstat = { primary: 0, assist: 0 }

/** A card as the tab reads it: active in `AZ`, level in `AV`, value in `AW`. */
export interface EconomyCard {
  active: boolean
  level: number
  value: number
}

const NO_CARD: EconomyCard = { active: false, level: 0, value: 0 }

/** One workshop row — level in `BI`, resolved value in `BJ`, vault in `BO`. */
export interface EconomyWorkshopStat {
  value: number
  relicPct: number
  vaultPct: number
}

const NO_WORKSHOP: EconomyWorkshopStat = { value: 0, relicPct: 0, vaultPct: 0 }

export interface EffectiveEconomyConfig {
  /** `CP6` — the coins a kill is worth before anything multiplies it. */
  baseCoinsPerKill: number
  /** `CP5` — how long a wave lasts, in seconds. */
  waveDurationSeconds: number
  /** `CP8` — the time multiplier every cooldown and duration is scaled by. */
  timeMultiplier: number

  /** Workshop rows the base reads: Coins/Kill, the three free upgrades, packages. */
  coinsPerKill: EconomyWorkshopStat
  freeUpgradeAttack: EconomyWorkshopStat
  freeUpgradeDefense: EconomyWorkshopStat
  freeUpgradeUtility: EconomyWorkshopStat
  recoveryPackageChance: EconomyWorkshopStat
  /** `BE10` — the Package After Boss lab; 1 means the boss variant applies. */
  packageAfterBossLevel: number
  /** `BH29` — what the Gold Bot Cooldown lab is worth, in seconds. */
  goldBotCooldownLabSeconds: number

  /** Module substats, by the row they sit on. */
  substats: {
    coinsPerKill: EconomySubstat
    freeUpgradeAttack: EconomySubstat
    freeUpgradeDefense: EconomySubstat
    freeUpgradeUtility: EconomySubstat
    packageChance: EconomySubstat
    goldenTowerBonus: EconomySubstat
    goldenTowerDuration: EconomySubstat
    goldenTowerCooldown: EconomySubstat
    blackHoleDuration: EconomySubstat
    blackHoleCooldown: EconomySubstat
    spotlightAngle: EconomySubstat
    deathWaveQuantity: EconomySubstat
    deathWaveCooldown: EconomySubstat
  }

  /** Unique module effects — primary in `AO`, assist in `AS`, and they add. */
  uniques: {
    /** `AO6 + AS6`. Zero switches the free-upgrade term off entirely. */
    blackHoleDigestor: EconomySubstat
    /** `AO7 + AS7`. */
    galaxyCompressor: EconomySubstat
    /** `AO15 + AS15` — Multiverse Nexus, the Max Value Nuke module. */
    multiverseNexus: EconomySubstat
  }

  /** The three stone-bought assist efficiencies — `BO21`, `BO22`, `BO24`. */
  assistEfficiency: {
    generatorBonus: number
    generatorSubstat: number
    coreSubstat: number
  }

  /**
   * `CV5` — the Generator module pair, already resolved.
   *
   * The sheet builds this through `IDS_MOD_GENERATOR_*`, which reads the
   * player's equipped module rather than anything on the tab, so it arrives
   * here as a number. Give `rarity` and the model recomputes it as the coin
   * path buys levels instead.
   */
  generator: {
    bonus: number
    /** `AP5` — Generator assist slot filled. */
    hasAssist: boolean
    /**
     * `AP14` — Core assist slot filled.
     *
     * The Core assist-efficiency candidates hide on `NOT(AP14)` the same way
     * Generator ones hide on `NOT(AP5)`.
     */
    coreHasAssist: boolean
    primaryRarity?: string
    assistRarity?: string
    assistBonus?: number
  }

  cards: {
    coins: EconomyCard
    freeUpgrades: EconomyCard
    waveSkip: EconomyCard
    introSprint: EconomyCard
    recoveryPackage: EconomyCard
    coinsMastery: EconomyCard
    extraOrbMastery: EconomyCard
    waveSkipMastery: EconomyCard
    introSprintMastery: EconomyCard
    waveAcceleratorMastery: EconomyCard
  }

  /**
   * How many ultimate weapons the player has unlocked.
   *
   * `eEcon Stones!DP2` gates Golden Combo on
   * `COUNTIF('_IDS'!$AA$2:$AA$37, "UW Unlocked") <= 8` — the stat does not
   * exist below nine weapons, so offering it is a recommendation the player
   * cannot act on.
   */
  unlockedUltimateWeaponCount: number

  /** `AZ43` gates every perk, as `AY61` does on the damage tab. */
  perksEquipped: boolean
  perks: {
    coins: boolean
    freeUpgrades: boolean
    coinsTradeOff: boolean
    goldenTowerBonus: boolean
    blackHoleDuration: boolean
    deathWaveQuantity: boolean
  }

  /** The ultimate weapons, at rows 15 to 19. */
  weapons: {
    goldenTower: { unlocked: boolean, bonus: number, duration: number, cooldown: number, goldenCombo: number }
    blackHole: { unlocked: boolean, duration: number, cooldown: number }
    deathWave: { unlocked: boolean, quantity: number, cooldown: number }
    spotlight: { unlocked: boolean, angle: number, quantity: number }
    goldBot: { unlocked: boolean, bonus: number, duration: number, cooldown: number }
  }

  /** What only a player can answer. */
  estimates: {
    /** `AZ19` — the share of enemies that die inside the Black Hole. */
    blackHoleKillShare: number
    /** `AZ20` — kills a second, which the Golden Combo compounds over. */
    killsPerSecond: number
    /** `AZ22` — the share of enemies that die inside the Gold Bot. */
    goldBotKillShare: number
    /** `AX23` and `AZ23` — the Gold Bot sync ratio, as a fraction. */
    goldBotSyncRatio: number
    /** `AZ25` — how many waves apart bosses spawn. */
    bossWaveInterval: number
    /** `AZ26` — the share of enemies an Extra Orb tags. */
    extraOrbTagShare: number
  }

  dissonance: {
    active: boolean
    tierPersonalBest: number
    allTierPersonalBests: readonly number[]
  }
}

/** Every column of the eEcon grid, by its own name on the sheet. */
export interface EffectiveEconomyBreakdown {
  /** `CW5`. */
  base: number
  /** `DM5`. */
  sync: number
  /** `DQ5`. */
  spotlight: number
  /** `DR5`. */
  waveBoost: number
  /** `DS5`. */
  effectiveEconomy: number
  columns: Readonly<Record<string, number>>
}

/** How many wave skips the sheet sums over — a constant `13` at both call sites. */
const WAVE_SKIP_HORIZON = 13

/** `eEcon!DS5` — average coins per kill for a player at a given set of levels. */
export function computeEffectiveEconomy(
  config: EffectiveEconomyConfig,
  levels: EffectiveEconomyLevels,
): EffectiveEconomyBreakdown {
  const time = levels.time
  const stone = levels.stone
  const { assistEfficiency: caps, estimates, weapons } = config

  const perk = (name: keyof EffectiveEconomyConfig['perks']) =>
    config.perksEquipped && config.perks[name]

  // --- The base, CQ5 through CW5 ----------------------------------------

  /** `CQ5`. */
  const dissonance = config.dissonance.active
    ? dissonantBoostOfType(
      'utility',
      config.dissonance.tierPersonalBest,
      config.dissonance.allTierPersonalBests,
      time.dissonantEchoUtility,
    )
    : 1

  /** `CR5`. */
  const cpk = coinsPerKill({
    workshopValue: config.coinsPerKill.value,
    labLevel: time.coinsPerKillBonus,
    stoneCap: caps.generatorSubstat,
    labCap: time.assistSubstatGenerator,
    primarySubstat: config.substats.coinsPerKill.primary,
    assistSubstat: config.substats.coinsPerKill.assist,
    enhancementLevel: time.enhancementCoinBonus,
    hasCoinPerk: perk('coins'),
    standardPerksBonusLabLevel: time.standardPerksBonus,
    hasCoinTradeOffPerk: perk('coinsTradeOff'),
    improveTradeOffPerksLabLevel: time.improveTradeOffPerks,
    vaultPct: config.coinsPerKill.vaultPct,
  })

  /** `CS5`. */
  const card = coinsCard(
    config.cards.coins.active,
    config.cards.coins.value,
    config.cards.coinsMastery.active,
    time.coinsMastery,
  )

  /** `CT5`. */
  const extraOrb = extraOrbMastery(
    config.cards.extraOrbMastery.active, time.extraOrbMastery, estimates.extraOrbTagShare,
  )

  /** `CU5` — free upgrades, which only count once a Black Hole Digestor exists. */
  const digestor = config.uniques.blackHoleDigestor
  const digestorValue = digestor.primary !== 0 ? digestor.primary : digestor.assist
  const freeUpgradeFor = (
    stat: EconomyWorkshopStat, substat: EconomySubstat,
  ) => freeUpgradeChance({
    workshopValue: stat.value,
    hasFreeUpgradesCard: config.cards.freeUpgrades.active,
    cardValue: config.cards.freeUpgrades.value,
    hasPerk: perk('freeUpgrades'),
    standardPerksBonusLabLevel: time.standardPerksBonus,
    stoneCap: caps.generatorSubstat,
    labCap: time.assistSubstatGenerator,
    primarySubstat: substat.primary,
    assistSubstat: substat.assist,
    enhancementLevel: time.enhancementFreeUpgrades,
    relicPct: stat.relicPct,
    vaultPct: stat.vaultPct,
  })

  const blackHoleDigestor = digestor.primary + digestor.assist === 0
    ? 1
    : 1 + (
      freeUpgradeFor(config.freeUpgradeAttack, config.substats.freeUpgradeAttack)
        + freeUpgradeFor(config.freeUpgradeDefense, config.substats.freeUpgradeDefense)
        + freeUpgradeFor(config.freeUpgradeUtility, config.substats.freeUpgradeUtility)
    ) * digestorValue * waveSkipFreeUpgrades(
      WAVE_SKIP_HORIZON,
      config.cards.waveSkip.active,
      config.cards.waveSkip.level,
      config.cards.waveSkipMastery.active,
      time.waveSkipMastery,
    )

  /** `CV5`. */
  const atLevel = (rarity: string | undefined, level: number, fallback: number) =>
    (rarity && level > 0
      ? computeModuleStat({ type: 'generator', rarityLabel: rarity, level })
      : fallback)

  const generator = moduleBonus({
    primaryBonus: atLevel(
      config.generator.primaryRarity, time.primaryModuleGenerator, config.generator.bonus,
    ),
    hasAssist: config.generator.hasAssist,
    assistBonus: atLevel(
      config.generator.assistRarity, time.assistModuleGenerator,
      config.generator.assistBonus ?? 1,
    ),
    stoneBonusCap: caps.generatorBonus,
    labBonusCap: time.assistBonusGenerator,
  })

  /** `CW5`. */
  const base = config.baseCoinsPerKill
    * dissonance * cpk * card * extraOrb * blackHoleDigestor * generator

  // --- The weapons, CX5 through DL5 -------------------------------------

  /** `CX5` — what recovery packages do to the length of a wave. */
  const compressor = config.uniques.galaxyCompressor
  const timeBoost = galaxyCompressorTimeBoost({
    workshopValue: config.recoveryPackageChance.value,
    labLevel: time.recoveryPackageChance,
    hasRecoveryCard: config.cards.recoveryPackage.active,
    cardValue: config.cards.recoveryPackage.value,
    stoneCap: caps.generatorSubstat,
    labCap: time.assistSubstatGenerator,
    primarySubstat: config.substats.packageChance.primary,
    assistSubstat: config.substats.packageChance.assist,
    packageAfterBossLevel: config.packageAfterBossLevel,
    bossWave: estimates.bossWaveInterval,
    galaxyCompressorValue: compressor.primary + compressor.assist,
    waveDurationSeconds: config.waveDurationSeconds,
  })

  const coreSubstat = (substat: EconomySubstat) => ({
    stoneCap: caps.coreSubstat,
    labCap: time.assistSubstatCore,
    primarySubstat: substat.primary,
    assistSubstat: substat.assist,
  })

  /** The raw cooldowns, before Max Value Nuke and the time boost. */
  const rawGoldenTowerCooldown = goldenTowerCooldown({
    hasGoldenTower: weapons.goldenTower.unlocked,
    stoneLevel: stone.goldenTowerCooldownStone,
    ...coreSubstat(config.substats.goldenTowerCooldown),
  })
  const rawBlackHoleCooldown = blackHoleCooldown({
    hasBlackHole: weapons.blackHole.unlocked,
    stoneLevel: stone.blackHoleCooldownStone,
    ...coreSubstat(config.substats.blackHoleCooldown),
  })
  const rawDeathWaveCooldown = deathWaveCooldownFromStones({
    hasDeathWave: weapons.deathWave.unlocked,
    stoneLevel: stone.deathWaveCooldownStone,
    ...coreSubstat(config.substats.deathWaveCooldown),
  })

  const nexus = config.uniques.multiverseNexus
  const hasNexus = nexus.primary + nexus.assist !== 0

  /** `CY5`. */
  const nukeCooldown = maxValueNukeCooldown({
    primaryModuleValue: nexus.primary,
    assistModuleValue: nexus.assist,
    goldenTowerCooldown: rawGoldenTowerCooldown,
    blackHoleCooldown: rawBlackHoleCooldown,
    deathWaveCooldown: rawDeathWaveCooldown,
    ultimateWeaponCount: [
      weapons.goldenTower.unlocked, weapons.blackHole.unlocked, weapons.deathWave.unlocked,
    ].filter(Boolean).length || 1,
  })

  /**
   * A weapon's cooldown as the grid reports it.
   *
   * Max Value Nuke replaces every cooldown with its own, and the time boost
   * then shortens whatever is left. The sheet rounds to a tenth, which matters
   * because `EPC_SYNC` lays the result out second by second.
   */
  const reportedCooldown = (raw: number) =>
    Math.round((hasNexus ? nukeCooldown : Math.floor(raw)) * timeBoost * 10) / 10

  /** `CZ5`, `DA5`, `DB5`, `DC5`. */
  const goldenTowerMultiplier = goldenTowerBonus({
    stoneLevel: stone.goldenTowerBonusStone,
    labLevel: time.goldenTowerBonus,
    hasPerk: perk('goldenTowerBonus'),
    ...coreSubstat(config.substats.goldenTowerBonus),
  })
  const goldenTowerDurationSeconds = goldenTowerDuration({
    stoneLevel: stone.goldenTowerDurationStone,
    labLevel: time.goldenTowerDuration,
    ...coreSubstat(config.substats.goldenTowerDuration),
  })
  const goldenTowerCooldownSeconds = reportedCooldown(rawGoldenTowerCooldown)
  const goldenComboMultiplier = goldenCombo(
    weapons.goldenTower.goldenCombo >= 0,
    weapons.goldenTower.goldenCombo,
    estimates.killsPerSecond,
    goldenTowerDurationSeconds,
  )

  /** `DD5`, `DE5`, `DF5`. */
  const blackHoleMultiplier = blackHoleCoinBonus(
    time.blackHoleCoinBonus, estimates.blackHoleKillShare,
  )
  const blackHoleDurationSeconds = blackHoleDuration({
    stoneLevel: stone.blackHoleDurationStone,
    hasPerk: perk('blackHoleDuration'),
    ...coreSubstat(config.substats.blackHoleDuration),
  })
  const blackHoleCooldownSeconds = reportedCooldown(rawBlackHoleCooldown)

  /** `DG5`, `DH5`, `DI5`. Death Wave's quantity stands in for its duration. */
  const deathWaveMultiplier = deathWaveCoinBonus(time.deathWaveCoinBonus)
  const deathWaveQuantity = deathWaveQuantityFromStones({
    stoneLevel: stone.deathWaveQuantityStone,
    hasPerk: perk('deathWaveQuantity'),
    ...coreSubstat(config.substats.deathWaveQuantity),
  }) * 4
  const deathWaveCooldownSeconds = reportedCooldown(rawDeathWaveCooldown)

  /** `DJ5`, `DK5`, `DL5` — the Gold Bot, which has no `EPC_` of its own. */
  const goldBotMultiplier = (weapons.goldBot.bonus - 1) * estimates.goldBotKillShare + 1
  const goldBotDurationSeconds = weapons.goldBot.duration + time.goldBotDuration / 2
  const goldBotCooldownSeconds = resolveGoldBotCooldown({
    weapons,
    compressorValue: compressor.primary + compressor.assist,
    goldenTowerCooldownSeconds,
    blackHoleCooldownSeconds,
    deathWaveCooldownSeconds,
    syncRatio: estimates.goldBotSyncRatio,
    labSeconds: config.goldBotCooldownLabSeconds,
  })

  /** `DM5`. A weapon up for its whole cycle has no cycle — the sheet uses 1. */
  const cycle = (
    active: boolean, multiplier: number, duration: number, cooldown: number,
  ) => {
    const scaledCooldown = duration >= cooldown ? 1 : cooldown * config.timeMultiplier
    return {
      active,
      multiplier,
      duration: Math.min(duration * config.timeMultiplier, scaledCooldown),
      cooldown: scaledCooldown,
    }
  }

  const sync = syncMultiplier({
    goldenTower: cycle(
      weapons.goldenTower.unlocked,
      goldenTowerMultiplier * goldenComboMultiplier,
      goldenTowerDurationSeconds,
      goldenTowerCooldownSeconds,
    ),
    blackHole: cycle(
      weapons.blackHole.unlocked, blackHoleMultiplier,
      blackHoleDurationSeconds, blackHoleCooldownSeconds,
    ),
    deathWave: cycle(
      weapons.deathWave.unlocked, deathWaveMultiplier,
      deathWaveQuantity, deathWaveCooldownSeconds,
    ),
    goldBot: cycle(
      weapons.goldBot.unlocked, goldBotMultiplier,
      goldBotDurationSeconds, goldBotCooldownSeconds,
    ),
  })

  // --- Spotlight and the clock, DN5 through DS5 -------------------------

  /** `DN5`, `DO5`, `DP5`. */
  const spotlightMultiplier = spotlightCoinBonus(time.spotlightCoinBonus)
  const spotlightAngleDegrees = spotlightCoverageAngle({
    stoneLevel: stone.spotlightAngleStone,
    ...coreSubstat(config.substats.spotlightAngle),
  })
  const spotlights = spotlightQuantity(stone.spotlightQuantityStone)

  /** `DQ5` — the bonus, weighted by how much of the field it lights. */
  const spotlight = !weapons.spotlight.unlocked
    ? 1
    : 1 + (spotlightMultiplier - 1)
      * Math.min(1, spotlightAngleDegrees * spotlights / 360)

  /** `DR5`. */
  const waveBoost = resolveWaveBoost(config, levels)

  const effectiveEconomy = base * sync * spotlight * waveBoost

  return {
    base,
    sync,
    spotlight,
    waveBoost,
    effectiveEconomy,
    columns: {
      CQ5: dissonance,
      CR5: cpk,
      CS5: card,
      CT5: extraOrb,
      CU5: blackHoleDigestor,
      CV5: generator,
      CW5: base,
      CX5: timeBoost,
      CY5: nukeCooldown,
      CZ5: goldenTowerMultiplier,
      DA5: goldenTowerDurationSeconds,
      DB5: goldenTowerCooldownSeconds,
      DC5: goldenComboMultiplier,
      DD5: blackHoleMultiplier,
      DE5: blackHoleDurationSeconds,
      DF5: blackHoleCooldownSeconds,
      DG5: deathWaveMultiplier,
      DH5: deathWaveQuantity,
      DI5: deathWaveCooldownSeconds,
      DJ5: goldBotMultiplier,
      DK5: goldBotDurationSeconds,
      DL5: goldBotCooldownSeconds,
      DM5: sync,
      DN5: spotlightMultiplier,
      DO5: spotlightAngleDegrees,
      DP5: spotlights,
      DQ5: spotlight,
      DR5: waveBoost,
      DS5: effectiveEconomy,
    },
  }
}

/**
 * `DL5` — the Gold Bot's cooldown.
 *
 * Three branches, and only the last one computes anything: with a Galaxy
 * Compressor, or with the three weapon cooldowns not all equal, the bot simply
 * runs on its own. Otherwise it is pulled toward their shared cooldown, floored
 * at 50 seconds and capped at two minutes.
 */
function resolveGoldBotCooldown(input: {
  weapons: EffectiveEconomyConfig['weapons']
  compressorValue: number
  goldenTowerCooldownSeconds: number
  blackHoleCooldownSeconds: number
  deathWaveCooldownSeconds: number
  syncRatio: number
  labSeconds: number
}): number {
  const own = input.weapons.goldBot.cooldown + input.labSeconds
  if (input.compressorValue !== 0) return own

  const cooldowns = [
    input.weapons.goldenTower.unlocked ? input.goldenTowerCooldownSeconds : 0,
    input.weapons.blackHole.unlocked ? input.blackHoleCooldownSeconds : 0,
    input.weapons.deathWave.unlocked ? input.deathWaveCooldownSeconds : 0,
  ]
  const unlocked = [
    input.weapons.goldenTower.unlocked,
    input.weapons.blackHole.unlocked,
    input.weapons.deathWave.unlocked,
  ].filter(Boolean).length
  if (unlocked === 0) return own

  const total = cooldowns.reduce((sum, value) => sum + value, 0)
  const average = total / unlocked
  if (Math.max(...cooldowns) !== average) return own

  return Math.min(Math.max(50, average * input.syncRatio), 120 + input.labSeconds)
}

/**
 * `DR5` — what wave skipping and Intro Sprint do to the clock.
 *
 * A wave is 6500 units long. Wave Accelerator shortens it, then Intro Sprint
 * removes a slice of what remains and wave skips remove more; the boost is how
 * much shorter the wave ends up. Intro Sprint is counted twice over — once as
 * the time it saves and once as the part of the wave a skip can no longer save
 * — which is why the two `IS` terms differ by a tenth.
 */
function resolveWaveBoost(
  config: EffectiveEconomyConfig,
  levels: EffectiveEconomyLevels,
): number {
  const WAVE_UNITS = 6500
  const time = levels.time

  const accelerated = WAVE_UNITS / (config.cards.waveAcceleratorMastery.active
    ? 1 + 0.1 * (1 + time.waveAcceleratorMastery)
    : 1)

  const sprintValue = config.cards.introSprint.value
  const masteredSprint = 100 * 1.8 * (1 + time.introSprintMastery) - sprintValue

  const introSprint = config.cards.introSprint.active
    ? sprintValue - (1 + sprintValue / 10)
      + (config.cards.introSprintMastery.active
        ? masteredSprint - masteredSprint / 10
        : 0)
    : 0

  const introSprintDeduction = config.cards.introSprint.active
    ? sprintValue + (config.cards.introSprintMastery.active ? masteredSprint : 0)
    : 0

  const skipped = waveSkipTimeSaved(
    WAVE_SKIP_HORIZON,
    config.cards.waveSkip.active,
    config.cards.waveSkip.level,
    config.cards.waveSkipMastery.active,
    time.waveSkipMastery,
    accelerated,
    introSprintDeduction,
  )

  return WAVE_UNITS / (accelerated - introSprint - skipped)
}

/**
 * The six perks the economy tab reads — `eEcon!AZ45` to `AZ50`.
 *
 * Named as the sheet's own rows name them. The two stacking ones carry no
 * quantity here because the tab does not ask for one: `EPC_CPK` writes
 * `0.15 * 5` and `EPC_FUP` writes `0.05 * 5` inline, so five of each is baked
 * into the formulas rather than being an input.
 *
 * `AZ43` gates all six, and unlike the damage tab's `AY61` — which is
 * `NOT(AX20 = "Tourney")` — it is a plain switch the player sets, not
 * something derived from the run.
 *
 * None of them takes a quantity. The Quantity column beside the first two is
 * display only — see {@link ECONOMY_PERK_STACKS}.
 */
export const ECONOMY_PERKS = [
  { key: 'coins', cell: 'AZ45', label: 'Coins' },
  { key: 'freeUpgrades', cell: 'AZ46', label: 'Free Upgrades' },
  { key: 'coinsTradeOff', cell: 'AZ47', label: 'x1.8 Coins / Health −70%' },
  { key: 'goldenTowerBonus', cell: 'AZ48', label: 'Golden Tower Bonus x1.5' },
  { key: 'blackHoleDuration', cell: 'AZ49', label: 'Black Hole Duration' },
  { key: 'deathWaveQuantity', cell: 'AZ50', label: 'Death Wave Quantity' },
] as const satisfies ReadonlyArray<{
  key: keyof EffectiveEconomyConfig['perks']
  cell: string
  label: string
}>

export type EconomyPerk = typeof ECONOMY_PERKS[number]['key']

/**
 * The estimates the sheet asks the player for, at the values it ships with.
 *
 * These are inputs no tracker holds, and they are **not** zero on the sheet:
 * `eEcon!AZ19` and `AZ22` default both kill shares to 100%, `AZ25` puts a boss
 * every ten waves and `AZ26` tags 90% of enemies with an extra orb. Zeroing
 * them is not a neutral starting point — it is an account where nothing dies
 * inside a Black Hole, which the coin model then reports as a much smaller
 * number than the sheet gives the same player.
 *
 * `killsPerSecond` is `AZ20`, which reads `7 + eDamage!CX9`. That second term
 * is the Summon guardian's spawn rate and the sheet leaves its numerator at
 * zero, so seven is the answer for every account today.
 */
export const SHEET_DEFAULT_ECONOMY_ESTIMATES: EffectiveEconomyConfig['estimates'] = {
  blackHoleKillShare: 1,
  killsPerSecond: 7,
  goldBotKillShare: 1,
  goldBotSyncRatio: 1,
  bossWaveInterval: 10,
  extraOrbTagShare: 0.9,
}

/** A config with everything switched off, to spread over. */
export function zeroEffectiveEconomyConfig(): EffectiveEconomyConfig {
  const substat = () => ({ ...NO_SUBSTAT })
  return {
    baseCoinsPerKill: 1,
    waveDurationSeconds: 35,
    timeMultiplier: 1,
    coinsPerKill: { ...NO_WORKSHOP },
    freeUpgradeAttack: { ...NO_WORKSHOP },
    freeUpgradeDefense: { ...NO_WORKSHOP },
    freeUpgradeUtility: { ...NO_WORKSHOP },
    recoveryPackageChance: { ...NO_WORKSHOP },
    packageAfterBossLevel: 0,
    goldBotCooldownLabSeconds: 0,
    substats: {
      coinsPerKill: substat(),
      freeUpgradeAttack: substat(),
      freeUpgradeDefense: substat(),
      freeUpgradeUtility: substat(),
      packageChance: substat(),
      goldenTowerBonus: substat(),
      goldenTowerDuration: substat(),
      goldenTowerCooldown: substat(),
      blackHoleDuration: substat(),
      blackHoleCooldown: substat(),
      spotlightAngle: substat(),
      deathWaveQuantity: substat(),
      deathWaveCooldown: substat(),
    },
    uniques: {
      blackHoleDigestor: substat(),
      galaxyCompressor: substat(),
      multiverseNexus: substat(),
    },
    assistEfficiency: { generatorBonus: 0, generatorSubstat: 0, coreSubstat: 0 },
    generator: { bonus: 1, hasAssist: false, coreHasAssist: false },
    cards: {
      coins: { ...NO_CARD },
      freeUpgrades: { ...NO_CARD },
      waveSkip: { ...NO_CARD },
      introSprint: { ...NO_CARD },
      recoveryPackage: { ...NO_CARD },
      coinsMastery: { ...NO_CARD },
      extraOrbMastery: { ...NO_CARD },
      waveSkipMastery: { ...NO_CARD },
      introSprintMastery: { ...NO_CARD },
      waveAcceleratorMastery: { ...NO_CARD },
    },
    unlockedUltimateWeaponCount: 0,
    perksEquipped: false,
    perks: {
      coins: false,
      freeUpgrades: false,
      coinsTradeOff: false,
      goldenTowerBonus: false,
      blackHoleDuration: false,
      deathWaveQuantity: false,
    },
    weapons: {
      goldenTower: { unlocked: false, bonus: 0, duration: 0, cooldown: 0, goldenCombo: 0 },
      blackHole: { unlocked: false, duration: 0, cooldown: 0 },
      deathWave: { unlocked: false, quantity: 0, cooldown: 0 },
      spotlight: { unlocked: false, angle: 0, quantity: 0 },
      goldBot: { unlocked: false, bonus: 1, duration: 0, cooldown: 0 },
    },
    estimates: { ...SHEET_DEFAULT_ECONOMY_ESTIMATES },
    dissonance: { active: false, tierPersonalBest: 0, allTierPersonalBests: [] },
  }
}
