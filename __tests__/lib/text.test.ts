import { capitalizeWords } from '@/lib/text'

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
