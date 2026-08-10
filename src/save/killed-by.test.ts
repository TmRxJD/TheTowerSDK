import { describe, expect, it } from 'vitest'
import {
  enemyDisplayNameFromSaveEnumIndex,
  extractKilledByEnumIndex,
  normalizeKilledByDisplayLabel,
  resolveKilledByFromSave,
} from './killed-by'

describe('killed-by-from-save', () => {
  it('extracts enum indices from NRBF enum objects and plain numbers', () => {
    expect(extractKilledByEnumIndex({ value__: 3 })).toBe(3)
    expect(extractKilledByEnumIndex({ value: 4 })).toBe(4)
    expect(extractKilledByEnumIndex(2)).toBe(2)
    expect(extractKilledByEnumIndex('5')).toBe(5)
    expect(extractKilledByEnumIndex(null)).toBeNull()
  })

  // Locks the save-file index order. Asserting 4 = Boss or 11 = Overcharge
  // encodes a shifted table and misreports deaths from index 7 onward.
  it('maps save enum indices to canonical enemy names', () => {
    expect(enemyDisplayNameFromSaveEnumIndex(0)).toBe('Basic')
    expect(enemyDisplayNameFromSaveEnumIndex(2)).toBe('Tank')
    expect(enemyDisplayNameFromSaveEnumIndex(3)).toBe('Boss')
    expect(enemyDisplayNameFromSaveEnumIndex(4)).toBe('Ranged')
    expect(enemyDisplayNameFromSaveEnumIndex(5)).toBe('Protector')
    expect(enemyDisplayNameFromSaveEnumIndex(9)).toBe('Ray')
    expect(enemyDisplayNameFromSaveEnumIndex(10)).toBe('Saboteur')
    expect(enemyDisplayNameFromSaveEnumIndex(11)).toBe('Commander')
    expect(enemyDisplayNameFromSaveEnumIndex(12)).toBe('Overcharge')
    expect(enemyDisplayNameFromSaveEnumIndex(99)).toBe('Apathy')
    expect(enemyDisplayNameFromSaveEnumIndex(-1)).toBe('Apathy')
  })

  it('resolves killedBy save shapes without touching OCR labels', () => {
    expect(resolveKilledByFromSave({ value__: 1 })).toBe('Fast')
    expect(resolveKilledByFromSave({ value__: 2 })).toBe('Tank')
    expect(resolveKilledByFromSave(3)).toBe('Boss')
    expect(resolveKilledByFromSave(4)).toBe('Ranged')
    expect(resolveKilledByFromSave(5)).toBe('Protector')
    expect(resolveKilledByFromSave({ value__: 12 })).toBe('Overcharge')
    expect(resolveKilledByFromSave({ value__: 99 })).toBe('Apathy')
    expect(resolveKilledByFromSave({ typeName: 'Game.Enums.EnemyType+Ray', value__: 9 })).toBe('Ray')
    expect(resolveKilledByFromSave({ typeName: 'Assembly-CSharp.KilledByType+Apathy', value__: 99 })).toBe('Apathy')
    expect(resolveKilledByFromSave('  Range  ')).toBe('Ranged')
    expect(resolveKilledByFromSave(null)).toBe('Apathy')
    expect(resolveKilledByFromSave(undefined, 'Unknown')).toBe('Unknown')
  })

  it('normalizes common label variants', () => {
    expect(normalizeKilledByDisplayLabel('vampires')).toBe('Vampire')
    expect(normalizeKilledByDisplayLabel('')).toBe('Apathy')
  })
})
