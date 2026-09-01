/**
 * @jest-environment node
 */
// route-helpers imports next/server, which needs the Request global that the
// default jsdom environment doesn't provide.
import { parseUnitNumber } from '@/lib/api/route-helpers'

describe('parseUnitNumber', () => {
  it('treats a blank field as "let the database choose"', () => {
    for (const blank of ['', undefined, null]) {
      expect(parseUnitNumber(blank)).toEqual({ ok: true, value: undefined })
    }
  })

  it('accepts a whole number from a form, which arrives as a string', () => {
    expect(parseUnitNumber('3')).toEqual({ ok: true, value: 3 })
    expect(parseUnitNumber(' 12 ')).toEqual({ ok: true, value: 12 })
    expect(parseUnitNumber(1)).toEqual({ ok: true, value: 1 })
  })

  it('rejects zero, negatives, fractions and nonsense', () => {
    for (const bad of ['0', '-1', '2.5', 'abc']) {
      expect(parseUnitNumber(bad).ok).toBe(false)
    }
  })
})
