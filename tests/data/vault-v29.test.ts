import { describe, expect, it } from 'vitest'

import {
  VAULT_V29_BINARY_ENEMY_LEVEL_COSTS,
  VAULT_V29_BINARY_ENEMY_PROVENANCE,
} from '../../src/data/generated/vault-v29-binary-enemy-keycosts.generated'
import {
  VAULT_V29_ENEMY,
  VAULT_V29_HARMONY,
  VAULT_V29_POWER,
  VAULT_V29_PROVENANCE,
  VAULT_V29_VERIFIED,
} from '../../src/data/generated/vault-v29.generated'
import { harmonyTreeNodes, powerTreeNodes } from '../../src/data/vault/tree'

/**
 * The v29 vault, held to the game's own Vault Config ScriptableObject.
 *
 * Harmony and Power key costs are the per-level `VaultUpgradeData.levels[].keyCost` arrays read
 * out of the SO (UnityPy), the same source and method that produced the Enemy tree. Every one of
 * the 80 Harmony+Power nodes was cross-confirmed against mytower.app (Skye's v29 tool) — id for
 * id, cost for cost, zero mismatches. Names come from the v29 I2 term table.
 *
 * This replaced an earlier extraction that read a single field (`TechTreeNodeData.keyCost @0x54`)
 * and produced one flat value per node — e.g. Power Damage as `[15]` rather than the real ladder
 * `[10, 20, 40, 70, 110]`. That value matched the pre-release workbook, which had changed by ship
 * time. The lesson pinned below: costs are per-level arrays from the SO, never single @0x54 reads.
 */
describe('the v29 vault (Vault Config SO)', () => {
  it('records its source and cross-check', () => {
    expect(VAULT_V29_PROVENANCE).toMatch(/Vault Config|ScriptableObject/i)
    expect(VAULT_V29_PROVENANCE).toMatch(/mytower/i)
    // The flag stays false until the owner's own in-game / binary pass; it gates nothing.
    expect(VAULT_V29_VERIFIED).toBe(false)
  })

  it('carries every tree and category the rework describes', () => {
    expect(VAULT_V29_HARMONY.categories.map(c => c.name)).toEqual([
      'Gameplay', 'Cards', 'Ultimate Weapons', 'Modules', 'Bots', 'Workshop', 'Guardians',
    ])
    expect(VAULT_V29_POWER.categories.map(c => c.name)).toEqual([
      'Attack', 'Defense', 'Utility', 'Ultimate Weapons',
    ])
    expect(VAULT_V29_ENEMY.categories.map(c => c.name)).toEqual([
      'Simple', 'Advanced', 'Elites', 'Fleets',
    ])
  })

  it('has the node counts the SO holds (not the workbook stubs)', () => {
    // Harmony 35 upgrades over 7 groups, Power 47 over 4 — the counts the extended SO extraction
    // returns and mytower agrees with, minus the two pulled Bastion nodes (see below). The old
    // workbook had 8 Cards / 17 filler Attack rows.
    expect(VAULT_V29_HARMONY.upgrades.length).toBe(33)
    expect(VAULT_V29_POWER.upgrades.length).toBe(47)
    const cards = VAULT_V29_HARMONY.upgrades.filter(u => u.category === 'Cards')
    expect(cards.length).toBe(10)
  })

  it('omits the Bastion nodes pulled from the release', () => {
    // Bastion Automation (1300) / Smart Bastion Automation (1310) exist in the binary but the
    // Bastion card never shipped, so they must not appear as buyable vault upgrades.
    const ids = new Set([...VAULT_V29_HARMONY.upgrades, ...VAULT_V29_POWER.upgrades].map(u => u.vaultId))
    expect(ids.has(1300)).toBe(false)
    expect(ids.has(1310)).toBe(false)
  })

  it('carries the parent dependency the game gates children with', () => {
    // e.g. Bot Presets (1805) cannot be bought until Bot Respec Discount (1800) is maxed.
    const botPresets = VAULT_V29_HARMONY.upgrades.find(u => u.vaultId === 1805)
    expect(botPresets?.dependsOn).toBe(1800)
    // Every dependency points at a node that still exists in the same tree.
    for (const u of VAULT_V29_HARMONY.upgrades) {
      if (u.dependsOn == null) continue
      expect(VAULT_V29_HARMONY.upgrades.some(p => p.vaultId === u.dependsOn)).toBe(true)
    }
  })

  it('prices every Harmony and Power upgrade per level (no single-value @0x54 stubs)', () => {
    const bad = [...VAULT_V29_HARMONY.upgrades, ...VAULT_V29_POWER.upgrades].filter(
      u => u.levelCosts.length === 0 || u.levelCosts.some(c => !Number.isInteger(c) || c <= 0),
    )
    expect(bad.map(u => `${u.category}/${u.name}`), 'every upgrade has positive integer per-level costs')
      .toEqual([])
  })

  it('pins mytower-confirmed key costs for known nodes', () => {
    const h = (name: string) => VAULT_V29_HARMONY.upgrades.find(u => u.name === name)?.levelCosts
    const p = (name: string) => VAULT_V29_POWER.upgrades.find(u => u.name === name)?.levelCosts
    // Harmony ▸ Cards ▸ Additional Card Slot (VaultID 1200) — was wrongly [10,15,20,25,35,45].
    expect(h('Additional Card Slot')).toEqual([5, 10, 20, 40, 60, 80])
    // Power ▸ Attack ▸ Damage (VaultID 1) — was wrongly [15].
    expect(p('Damage')).toEqual([10, 20, 40, 70, 110])
  })

  it('carries the stable VaultID on every Harmony and Power upgrade', () => {
    const missing = [...VAULT_V29_HARMONY.upgrades, ...VAULT_V29_POWER.upgrades].filter(
      u => typeof u.vaultId !== 'number',
    )
    expect(missing.length).toBe(0)
  })

  it('keeps the Enemy tree unchanged — one shared 30-level curve, integer costs', () => {
    expect(VAULT_V29_BINARY_ENEMY_PROVENANCE).toMatch(/VaultConfig|VaultUpgradeData/)
    expect(VAULT_V29_BINARY_ENEMY_LEVEL_COSTS[3000]).toEqual([
      25, 26, 28, 29, 30, 32, 34, 35, 37, 39, 41, 43, 45, 47, 49, 52, 55, 57, 60, 63, 66, 70, 73,
      77, 81, 85, 89, 93, 98, 103,
    ])
    const basicAttack = VAULT_V29_ENEMY.upgrades.find(
      u => u.enemy === 'Basic' && u.stat.startsWith('Attack'),
    )
    expect(basicAttack?.levelCosts).toHaveLength(30)
    expect(basicAttack?.levelCosts.every(Number.isInteger)).toBe(true)
    /* Owner spot-check 2026-08-27: Basic Attack L1–L3 in-game = 25 / 26 / 28 keys. */
    expect(basicAttack?.levelCosts.slice(0, 3)).toEqual([25, 26, 28])
  })

  it('opens exactly one category in each tree without a key', () => {
    expect(VAULT_V29_HARMONY.categories.filter(c => c.autoUnlocked).map(c => c.name)).toEqual(['Gameplay'])
    expect(VAULT_V29_ENEMY.categories.filter(c => c.autoUnlocked).map(c => c.name)).toEqual(['Simple'])
    expect(VAULT_V29_POWER.categories.every(c => (c.unlockCost ?? 0) > 0)).toBe(true)
  })

  it('gives every enemy the stats the rework describes', () => {
    const byEnemy = new Map<string, number>()
    for (const u of VAULT_V29_ENEMY.upgrades) byEnemy.set(u.enemy, (byEnemy.get(u.enemy) ?? 0) + 1)
    const short = [...byEnemy].filter(([, n]) => n < 3).map(([enemy, n]) => `${enemy} has ${n}`)
    expect(short, 'every enemy should carry Attack, Health and a special').toEqual([])
    expect(byEnemy.size).toBeGreaterThanOrEqual(8)
  })

  it('is kept apart from the vault that ships', () => {
    /*
     * The shipped tree is v28 and still correct. It stays a graph (every node names `parents`); if
     * v29 category data ever leaked into it, a node would arrive with no parents and the traversal
     * would silently treat it as a root.
     */
    const shipped = [...harmonyTreeNodes, ...powerTreeNodes]
    expect(shipped.every(node => Array.isArray(node.parents))).toBe(true)
  })
})
