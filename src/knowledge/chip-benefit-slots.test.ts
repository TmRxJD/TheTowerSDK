import { describe, expect, it } from 'vitest'
import { guardianUpgrades } from '../data/guardian-upgrades'
import {
  CHIP_BENEFIT_INDEX_BOUNTY,
  CHIP_BENEFIT_INDEX_CASH_MULTIPLIER,
  CHIP_BENEFIT_SLOT_COUNT,
  CHIP_BENEFIT_SLOTS_BY_READER,
  CHIP_BENEFIT_SLOTS_PER_CHIP,
  CHIP_TYPES_WITH_RUNTIME_BEHAVIOUR,
  GAME_CHIP_TYPE_VALUES,
  GUARDIAN_RELEASED_CHIPS,
  GUARDIAN_RUNTIME_CLASS,
  GUARDIAN_UNRELEASED_CHIP_TYPES,
  GUARDIAN_UPGRADE_TRACKS,
} from './compartments/guardian'

const SLOTS = Object.keys(CHIP_BENEFIT_SLOTS_BY_READER).map(Number)

describe('the chip benefit slot map is evidence-backed', () => {
  it('names every listed slot with a reader, never a bare guess', () => {
    for (const [slot, reader] of Object.entries(CHIP_BENEFIT_SLOTS_BY_READER)) {
      expect(reader.trim().length, `slot ${slot} has no reader`).toBeGreaterThan(8)
      // A reader is a qualified method or a named function, not a description.
      expect(reader, `slot ${slot}`).toMatch(/[A-Z][A-Za-z]*\.[A-Za-z]|Bonus|Kill/)
    }
  })

  it('keeps the two anchor slots where the readers put them', () => {
    expect(SLOTS).toContain(CHIP_BENEFIT_INDEX_BOUNTY)
    expect(SLOTS).toContain(CHIP_BENEFIT_INDEX_CASH_MULTIPLIER)
    expect(CHIP_BENEFIT_SLOTS_BY_READER[CHIP_BENEFIT_INDEX_BOUNTY]).toMatch(/Bounty|Steal/)
    expect(CHIP_BENEFIT_SLOTS_BY_READER[CHIP_BENEFIT_INDEX_CASH_MULTIPLIER]).toMatch(/Kill|cash/i)
  })

  it('puts every identified reader in the block its chip predicts', () => {
    // The layout claim, checked slot by slot rather than asserted.
    const expected: Record<number, string> = {
      0: 'Steal', 8: 'Attack', 9: 'Scare', 11: 'Scare', 14: 'Rush',
      16: 'Ally', 23: 'Summon', 25: 'Scout', 27: 'Repair', 28: 'Repair',
    }
    for (const slot of SLOTS) {
      const chip = GAME_CHIP_TYPE_VALUES[Math.floor(slot / CHIP_BENEFIT_SLOTS_PER_CHIP)]
      expect(chip, `slot ${slot}`).toBe(expected[slot])
    }
  })

  it('sizes the array as chips times tracks', () => {
    expect(CHIP_BENEFIT_SLOT_COUNT)
      .toBe(GAME_CHIP_TYPE_VALUES.length * CHIP_BENEFIT_SLOTS_PER_CHIP)
    expect(Math.max(...SLOTS)).toBeLessThan(CHIP_BENEFIT_SLOT_COUNT)
  })

  it('lands the cash multiplier on Summon track 2, which our own table calls cashBonus', () => {
    const slot = CHIP_BENEFIT_INDEX_CASH_MULTIPLIER
    expect(GAME_CHIP_TYPE_VALUES[Math.floor(slot / CHIP_BENEFIT_SLOTS_PER_CHIP)]).toBe('Summon')
    expect(slot % CHIP_BENEFIT_SLOTS_PER_CHIP).toBe(2)
    const summon = (guardianUpgrades as Record<string, Record<string, unknown>[]>).summon!
    const tracks = Object.keys(summon[0]!).filter(k => k !== 'level' && !k.endsWith('Cost'))
    expect(tracks[2]).toBe('cashBonus')
  })
})

describe('built versus released', () => {
  it('has more built chip types than the workbook carries', () => {
    expect(CHIP_TYPES_WITH_RUNTIME_BEHAVIOUR).toBeGreaterThan(GUARDIAN_RELEASED_CHIPS.length)
    expect(GUARDIAN_RELEASED_CHIPS).toHaveLength(6)
  })

  it('keeps the unreleased ones out of the released list', () => {
    for (const chip of GUARDIAN_UNRELEASED_CHIP_TYPES) {
      expect(GUARDIAN_RELEASED_CHIPS).not.toContain(chip)
      expect(GAME_CHIP_TYPE_VALUES).toContain(chip)
    }
    expect(GUARDIAN_UNRELEASED_CHIP_TYPES).toEqual(['Repair'])
  })

  it('matches the released list to the shipped upgrade tables', () => {
    const tabled = Object.keys(guardianUpgrades as Record<string, unknown>)
      .map(c => c.charAt(0).toUpperCase() + c.slice(1))
    expect(tabled.sort()).toEqual([...GUARDIAN_RELEASED_CHIPS].sort())
  })
})

describe('all ten chip types have runtime behaviour', () => {
  it('counts ten, matching the game enum rather than our catalog', () => {
    expect(CHIP_TYPES_WITH_RUNTIME_BEHAVIOUR).toBe(GAME_CHIP_TYPE_VALUES.length)
    expect(GUARDIAN_RUNTIME_CLASS).toBe('TowerBuddy')
  })

  it('exceeds the six chips the upgrade tables carry', () => {
    const chipCount = Object.keys(guardianUpgrades as Record<string, unknown>).length
    expect(chipCount).toBe(6)
    expect(CHIP_TYPES_WITH_RUNTIME_BEHAVIOUR).toBeGreaterThan(chipCount)
  })
})

describe('the two chip tables are not interchangeable', () => {
  it('has more benefit slots than upgrade tracks', () => {
    expect(Math.max(...SLOTS)).toBeGreaterThan(GUARDIAN_UPGRADE_TRACKS.length)
  })

  it('keeps upgrade tracks keyed by chip name, not by slot number', () => {
    for (const track of GUARDIAN_UPGRADE_TRACKS) {
      expect(typeof track.chip).toBe('string')
      expect(Number.isNaN(Number(track.chip))).toBe(true)
    }
  })
})
