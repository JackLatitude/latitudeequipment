import { capitalizeWords, isUuid } from '@/lib/text'

describe('capitalizeWords', () => {
  it('capitalises ordinary words', () => {
    expect(capitalizeWords('sony body')).toBe('Sony Body')
  })

  it('uppercases 2-letter abbreviations', () => {
    expect(capitalizeWords('dx pl mount')).toBe('DX PL Mount')
  })

  it('title-cases 2-letter words that are real English words', () => {
    expect(capitalizeWords('ready to go')).toBe('Ready To Go')
  })

  it('uppercases the letters in a mixed letter/digit word, keeping digits as-is', () => {
    expect(capitalizeWords('ronin 4d')).toBe('Ronin 4D')
    expect(capitalizeWords('sony fx9 body')).toBe('Sony FX9 Body')
    expect(capitalizeWords('gh5s')).toBe('GH5S')
  })

  it('uppercases known pure-letter abbreviations', () => {
    expect(capitalizeWords('dji ronin 4d')).toBe('DJI Ronin 4D')
    expect(capitalizeWords('red camera')).toBe('RED Camera')
  })

  it('leaves words that already contain an uppercase letter untouched', () => {
    expect(capitalizeWords('DJI Ronin 4D')).toBe('DJI Ronin 4D')
    expect(capitalizeWords('GoPro Hero')).toBe('GoPro Hero')
  })

  it('trims and collapses surrounding whitespace', () => {
    expect(capitalizeWords('  sony   fx9  ')).toBe('Sony FX9')
  })
})

describe('isUuid', () => {
  it('accepts a well-formed uuid in either case', () => {
    expect(isUuid('3f2b8c1e-9a4d-4e7b-8c21-0d5f6a7b8c9d')).toBe(true)
    expect(isUuid('3F2B8C1E-9A4D-4E7B-8C21-0D5F6A7B8C9D')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isUuid('')).toBe(false)
    expect(isUuid('new')).toBe(false)
    expect(isUuid('3f2b8c1e-9a4d-4e7b-8c21-0d5f6a7b8c9')).toBe(false)
  })
})
