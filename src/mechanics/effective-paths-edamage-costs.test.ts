import { describe, expect, it } from 'vitest'
import {
  KEYS_CANDIDATE_NODES,
  keysCandidateCost,
  keysCandidateMaxLevel,
  resolveUltimateWeaponStat,
  ultimateWeaponMaxLevel,
  ultimateWeaponStats,
  ultimateWeaponStoneCost,
  vaultNodeKeysCost,
  vaultNodeMaxLevel,
} from './effective-paths-edamage-costs'
import { EFFECTIVE_DAMAGE_CANDIDATES } from './effective-paths-edamage-candidates'
import { DEFAULT_HARMONY_VAULT_NODES, DEFAULT_POWER_VAULT_NODES } from '../data/vault-tree'


/**
 * What the damage candidates cost.
 *
 * The mapping from a candidate's abbreviated name to the row that prices it is
 * the whole risk here — a name that resolves to nothing would silently drop an
 * upgrade from its path, which is the failure this port has hit most often.
 * So every candidate on the stone and keys paths is resolved, not a sample.
 */

const VAULT_NODES = [...DEFAULT_HARMONY_VAULT_NODES, ...DEFAULT_POWER_VAULT_NODES]

describe('the stone path resolves every ultimate weapon candidate', () => {
  const stoneCandidates = EFFECTIVE_DAMAGE_CANDIDATES.stone
    .filter(entry => !entry.sheetName.startsWith('Assist Module'))

  it('covers all 24 weapon stats, leaving only the assist capacities', () => {
    expect(stoneCandidates).toHaveLength(24)
    expect(EFFECTIVE_DAMAGE_CANDIDATES.stone.length - stoneCandidates.length).toBe(5)
  })

  for (const candidate of stoneCandidates) {
    it(`prices ${candidate.sheetName}`, () => {
      const resolved = resolveUltimateWeaponStat(candidate.sheetName)
      expect(resolved, candidate.sheetName).not.toBeNull()

      const { weapon, stat } = resolved as { weapon: string, stat: string }
      // The stat has to exist on that weapon's chart, or the name is wrong.
      const stats = ultimateWeaponStats(weapon)
      expect(stats, `${weapon} stats`).toContain(stat)

      const max = ultimateWeaponMaxLevel(weapon, stat)
      expect(max, `${weapon} ${stat} max`).toBeGreaterThan(0)
      expect(ultimateWeaponStoneCost(weapon, stat, 1)).toBeGreaterThan(0)
    })
  }

  it('renames the two stats the chart spells differently', () => {
    // Spotlight's damage is "Multiplier" on the chart; Chrono Field's slow is
    // "Speed". Both would resolve to nothing under their sheet names.
    expect(resolveUltimateWeaponStat('SL Damage')).toEqual({
      weapon: 'Spotlight', stat: 'Multiplier',
    })
    expect(resolveUltimateWeaponStat('CF Slow')).toEqual({
      weapon: 'Chrono Field', stat: 'Speed',
    })
  })

  it('refuses a name that is not a weapon stat', () => {
    expect(resolveUltimateWeaponStat('Assist Module Bonus - Cannon')).toBeNull()
    expect(resolveUltimateWeaponStat('Damage')).toBeNull()
  })

  it('will not price a stat before its weapon is unlocked', () => {
    // Level 0 is the unlock, which the chart prices as a word rather than a
    // number — so it is not a level a path can buy.
    expect(ultimateWeaponStoneCost('Death Wave', 'Damage', 0)).toBeNull()
    expect(ultimateWeaponStoneCost('Death Wave', 'Damage', 1)).toBe(5)
  })
})

describe('the keys path is the vault tree', () => {
  it('names a real node for every candidate', () => {
    const ids = new Set(VAULT_NODES.map(node => node.id))
    for (const candidate of EFFECTIVE_DAMAGE_CANDIDATES.keys) {
      const entry = KEYS_CANDIDATE_NODES[candidate.sheetName]
      expect(entry, candidate.sheetName).toBeDefined()
      for (const nodeId of entry.nodeIds) {
        expect(ids.has(nodeId), `${candidate.sheetName} -> ${nodeId}`).toBe(true)
      }
    }
  })

  it('matches every per-level percentage to the node’s own name', () => {
    // This is what makes the mapping a fact: the sheet divides by exactly the
    // percentage the vault node is named after. It caught two wrong ids.
    for (const [sheetName, entry] of Object.entries(KEYS_CANDIDATE_NODES)) {
      const node = VAULT_NODES.find(candidate => candidate.id === entry.nodeIds[0])
      const named = /^(-?[\d.]+)%/.exec(node?.name ?? '')
      expect(named, `${sheetName} -> ${node?.name}`).not.toBeNull()
      expect(Number(named?.[1]) / 100, sheetName).toBeCloseTo(entry.perLevel, 12)
    }
  })

  it('prices each level from the node’s own ladder', () => {
    // "5% Damage" costs 15, 30 then 60.
    expect(keysCandidateCost('Damage', 1)).toBe(15)
    expect(keysCandidateCost('Damage', 2)).toBe(30)
    expect(keysCandidateCost('Damage', 3)).toBe(60)
    expect(keysCandidateCost('Damage', 4)).toBeNull()
    expect(keysCandidateMaxLevel('Damage')).toBe(3)
  })

  it('spreads Ultimate Weapon Damage over its four separate nodes', () => {
    // Four single-level nodes at 15 keys each, not one four-level node.
    expect(keysCandidateMaxLevel('UW Damage')).toBe(4)
    for (const level of [1, 2, 3, 4]) {
      expect(keysCandidateCost('UW Damage', level), `level ${level}`).toBe(15)
    }
    expect(keysCandidateCost('UW Damage', 5)).toBeNull()
  })

  it('reads a single-level node as one level', () => {
    expect(vaultNodeMaxLevel('ultdmg1')).toBe(1)
    expect(vaultNodeKeysCost('ultdmg1', 1)).toBe(15)
    expect(vaultNodeKeysCost('ultdmg1', 2)).toBeNull()
  })

  it('refuses a node it does not know', () => {
    expect(vaultNodeMaxLevel('nosuchnode')).toBeNull()
    expect(vaultNodeKeysCost('nosuchnode', 1)).toBeNull()
    expect(keysCandidateCost('Nonsense', 1)).toBeNull()
  })
})
