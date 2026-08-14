import { describe, expect, it } from 'vitest'
import { readDissonanceFromSaveRoot } from './dissonance'

describe('dissonance-from-save', () => {
  it('returns null for non-object roots', () => {
    expect(readDissonanceFromSaveRoot(null)).toBeNull()
  })

  it('warns when no boost fields are present', () => {
    const extract = readDissonanceFromSaveRoot({ userName: 'tester' })
    expect(extract?.warnings.some(w => w.includes('No dissonance wave data'))).toBe(true)
    expect(extract?.tiersWithData).toBe(0)
  })
})
