/**
 * v29 Vault Harmony/Power key costs — per VaultID, per level.
 *
 * GENERATED from the v29.0.0 Vault Config ScriptableObject (UnityPy;
 * VaultUpgradeData.levels[].keyCost, the same source and method as the Enemy tree). Every one of
 * the 80 nodes was cross-confirmed against mytower.app (credit: https://mytower.app), id for id.
 *
 * This SUPERSEDES an earlier single-field (TechTreeNodeData.keyCost @0x54) read that produced one
 * flat value per node (e.g. Power Damage `[15]`); those were the pre-release workbook numbers and
 * were wrong. The consumed vault data is VAULT_V29_HARMONY / VAULT_V29_POWER in vault-v29.generated.ts;
 * this file is the by-VaultID sidecar behind it.
 */

export const VAULT_V29_BINARY_PROVENANCE =
  'v29.0.0 Vault Config SO VaultUpgradeData.levels[].keyCost (UnityPy); 80/80 nodes match mytower.app'

/** VaultID -> per-level key costs (Harmony tree). */
export const VAULT_V29_BINARY_HARMONY_LEVEL_COSTS: Record<number, readonly number[]> = {
  1000: [20], // Auto Restart Run
  1010: [10, 20, 40, 60], // Ad Gem Stack
  1020: [25], // Damage Cap Slider
  1030: [20], // Global Presets
  1200: [5, 10, 20, 40, 60, 80], // Additional Card Slot
  1210: [5], // Charge Berserker
  1220: [10], // Demon Mode Automation
  1230: [25], // Smart Demon Mode Automation
  1240: [10], // Nuke Automation
  1250: [25], // Smart Nuke Automation
  1260: [15], // Death Ray Toggle
  1270: [20], // Spawn Accelerator Toggle
  1280: [50], // Life Saving Ordering
  1290: [50], // Energy Shield Restriction
  1300: [10], // Bastion Automation
  1310: [25], // Smart Bastion Automation
  1400: [10], // Missile Barrage Automation
  1410: [25], // Smart Missile Barrage Automation
  1420: [25], // Black Hole Size Slider
  1430: [25], // Swamp Range Slider
  1600: [5], // Auto Shatter Rare Modules
  1610: [10], // Daily Mission Shard Type
  1620: [15], // Free Mission Reroll
  1630: [5, 10, 15, 20, 25, 30, 35, 40], // Module Reroll Discount
  1640: [20], // Module Presets
  1800: [5, 10, 15], // Bot Respec Discount
  1805: [20], // Bot Presets
  1810: [10, 20, 30, 40], // Bot Range
  1820: [15], // Bot Cooldown Sliders
  2000: [5, 10, 15], // Workshop Respec Discount
  2005: [20], // Workshop Presets
  2010: [2, 4, 6, 8, 10, 12, 14, 16, 18], // Enhancements Discount
  2020: [15], // Workshop Orb Adjuster
  2200: [5, 10, 15], // Guardian Respec Discount
  2205: [20], // Guardian Presets
}

/** VaultID -> per-level key costs (Power tree). */
export const VAULT_V29_BINARY_POWER_LEVEL_COSTS: Record<number, readonly number[]> = {
  1: [10, 20, 40, 70, 110], // Damage
  10: [10, 20, 40, 70, 110], // Attack Speed
  20: [10, 20, 40, 70, 110], // Critical Chance
  30: [10, 20, 40, 70, 110], // Crit Factor
  40: [10, 20, 40, 70, 110], // Damage / Meter
  50: [10, 20, 40, 70, 110], // Multishot Chance
  60: [10, 20, 40, 70, 110], // Rapid Fire Chance
  70: [10, 20, 40, 70, 110], // Bounce Shot Chance
  80: [10, 20, 40, 70, 110], // Super Crit Chance
  90: [10, 20, 40, 70, 110], // Super Crit Mult
  100: [10, 20, 40, 70, 110], // Rend Armor Chance
  110: [10, 20, 40, 70, 110], // Rend Armor Mult
  200: [10, 20, 40, 70, 110], // Health
  210: [10, 20, 40, 70, 110], // Health Regen
  220: [20, 40, 70], // Defense %
  230: [10, 20, 40, 70, 110], // Defense Absolute
  240: [10, 20, 40, 70, 110], // Thorn Damage
  250: [10, 20, 40, 70, 110], // Knockback Chance
  260: [10, 20, 40, 70, 110], // Knockback Force
  270: [10, 20, 40, 70, 110], // Orb Speed
  280: [20, 40], // Orbs
  290: [10, 20, 40, 70, 110], // Shockwave Size
  300: [20, 40], // Shockwave Frequency
  310: [20, 40, 80, 140, 220], // Death Defy
  320: [10, 20, 40, 70, 110], // Wall Health
  330: [20, 40, 80, 140, 220], // Wall Rebuild
  400: [10, 20, 40, 70, 110], // Cash Bonus
  410: [10, 20, 40, 70, 110], // Cash / Wave
  420: [10, 20, 40, 70, 110], // Coins / Kill
  430: [10, 20, 40, 70, 110], // Coins / Wave
  440: [10, 20, 40, 70, 110], // Free Attack Upgrade
  450: [10, 20, 40, 70, 110], // Free Defense Upgrade
  460: [10, 20, 40, 70, 110], // Free Utility Upgrade
  470: [10, 20, 40, 70, 110], // Interest / Wave
  480: [10, 20, 40, 70, 110], // Recovery Amount
  490: [10, 20, 40, 70, 110], // Max Recovery
  500: [20, 40, 80], // Enemy Attack Skip
  510: [20, 40, 80], // Enemy Health Skip
  600: [5, 10, 20, 35, 55], // Ultimate Damage
  610: [10, 20, 40, 70, 110], // Chain Lightning Damage
  620: [10, 20, 40, 70, 110], // Smart Missile Damage
  630: [10, 20, 40, 70, 110], // Death Wave Damage
  640: [10, 20, 40, 70, 110], // Inner Land Mine Damage
  650: [10, 20, 40, 70, 110], // Golden Tower Bonus
  660: [10, 20, 40, 70, 110], // Swamp Damage
  670: [10, 20, 40, 70, 110], // Spotlight Bonus
  680: [10, 20, 40, 70, 110], // Black Hole Size
}
