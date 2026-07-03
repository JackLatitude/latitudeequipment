import { getHires, checkoutHire, checkinHire } from '@/lib/db/hires'

const mockFrom = jest.fn()
const mockSupabase = { from: mockFrom }

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

describe('getHires', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns hires with client joined, newest first', async () => {
    const fakeHires = [{ id: 'h1', ref: 'LAT-001', title: 'Nike Shoot' }]
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: fakeHires, error: null }),
      }),
    })
    const result = await getHires()
    expect(result).toEqual(fakeHires)
    expect(mockFrom).toHaveBeenCalledWith('hires')
  })
})

describe('checkoutHire', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sets checked_out_at on all items then status to active', async () => {
    const itemsUpdateEq = jest.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({ eq: itemsUpdateEq }),
    })
    const hireUpdateEq = jest.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({ eq: hireUpdateEq }),
    })
    await checkoutHire('h1')
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'hire_items')
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'hires')
  })
})

describe('checkinHire', () => {
  beforeEach(() => jest.clearAllMocks())

  it('checks in outstanding items then sets status to returned', async () => {
    const isChain = jest.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({ is: isChain }),
      }),
    })
    const hireUpdateEq = jest.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({ eq: hireUpdateEq }),
    })
    await checkinHire('h1')
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'hire_items')
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'hires')
  })
})
