import { ITEM_OWNERS, normalizeOwner } from '@/lib/constants'

describe('ITEM_OWNERS', () => {
  it('has Latitude Equipment as the default (first) entry', () => {
    expect(ITEM_OWNERS[0]).toBe('Latitude Equipment')
    expect(ITEM_OWNERS).toEqual(['Latitude Equipment', 'Jack', 'Matt', 'Tom'])
  })
})

describe('normalizeOwner', () => {
  it('defaults to Latitude Equipment when the value is missing or empty', () => {
    expect(normalizeOwner(undefined)).toBe('Latitude Equipment')
    expect(normalizeOwner(null)).toBe('Latitude Equipment')
    expect(normalizeOwner('')).toBe('Latitude Equipment')
  })

  it('keeps a valid individual owner', () => {
    expect(normalizeOwner('Jack')).toBe('Jack')
    expect(normalizeOwner('Matt')).toBe('Matt')
    expect(normalizeOwner('Tom')).toBe('Tom')
  })

  it('coerces an unknown owner to the default', () => {
    expect(normalizeOwner('Nigel')).toBe('Latitude Equipment')
    expect(normalizeOwner(42)).toBe('Latitude Equipment')
  })
})
