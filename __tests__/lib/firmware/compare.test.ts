import { isOutdated } from '@/lib/firmware/compare'

describe('isOutdated', () => {
  it('is true when current differs from latest', () => {
    expect(isOutdated('1.0.0', '1.1.0')).toBe(true)
  })
  it('is false when they are equal', () => {
    expect(isOutdated('1.1.0', '1.1.0')).toBe(false)
  })
  it('ignores surrounding whitespace', () => {
    expect(isOutdated('  1.1.0 ', '1.1.0')).toBe(false)
  })
  it('is case-insensitive', () => {
    expect(isOutdated('V7.4', 'v7.4')).toBe(false)
  })
  it('is false when either side is empty, null, or undefined', () => {
    expect(isOutdated('', '1.1.0')).toBe(false)
    expect(isOutdated('1.0.0', '')).toBe(false)
    expect(isOutdated(null, '1.1.0')).toBe(false)
    expect(isOutdated('1.0.0', undefined)).toBe(false)
    expect(isOutdated('   ', '1.1.0')).toBe(false)
  })
})
