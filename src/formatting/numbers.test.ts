import { describe, expect, it } from 'vitest'
import { formatCompact } from '../internal/tool-formatting'

describe('compact notation matches how the game displays numbers', () => {
  it('formats suffixes through AZ using sequential ÷1000 steps', () => {
    expect(formatCompact(1e63)).toBe('1AJ')
    expect(formatCompact(1e66)).toBe('1000AJ')
    expect(formatCompact(1.5e72)).toBe('1.5AM')
    expect(formatCompact(9.87e111)).toBe('9.87AZ')
    expect(formatCompact(999e111)).toBe('999AZ')
  })

  it('uses toExponential(2) after AZ when no suffix step yields coefficient < 1000', () => {
    expect(formatCompact(1e114)).toBe('1.00e+114')
    expect(formatCompact(3e130)).toBe('3.00e+130')
    expect(formatCompact(2.997728057165945e130)).toBe('3.00e+130')
  })
})
