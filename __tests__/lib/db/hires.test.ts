import { getHires, checkoutHire, checkinHire, getActiveHireItemsByItemIds } from '@/lib/db/hires'

const mockFrom = jest.fn()
const mockRpc = jest.fn()
const mockSupabase = { from: mockFrom, rpc: mockRpc }

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

  it('runs the atomic checkout_hire transaction', async () => {
    mockRpc.mockResolvedValue({ error: null })
    await checkoutHire('h1')
    expect(mockRpc).toHaveBeenCalledWith('checkout_hire', { p_hire_id: 'h1' })
  })

  it('throws when the transaction fails', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'boom' } })
    await expect(checkoutHire('h1')).rejects.toThrow('boom')
  })
})

describe('checkinHire', () => {
  beforeEach(() => jest.clearAllMocks())

  it('runs the atomic checkin_hire transaction', async () => {
    mockRpc.mockResolvedValue({ error: null })
    await checkinHire('h1')
    expect(mockRpc).toHaveBeenCalledWith('checkin_hire', { p_hire_id: 'h1' })
  })
})

describe('getActiveHireItemsByItemIds', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns empty array for empty input without calling supabase', async () => {
    const result = await getActiveHireItemsByItemIds([])
    expect(result).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('builds the correct filter chain for active hire items', async () => {
    const fakeData = [{ id: 'hi1', item_id: 'i1' }]

    const eqMock = jest.fn().mockResolvedValue({ data: fakeData, error: null })
    const isMock = jest.fn().mockReturnValue({ eq: eqMock })
    const notMock = jest.fn().mockReturnValue({ is: isMock })
    const inMock = jest.fn().mockReturnValue({ not: notMock })
    const selectMock = jest.fn().mockReturnValue({ in: inMock })

    mockFrom.mockReturnValue({
      select: selectMock,
    })

    const result = await getActiveHireItemsByItemIds(['i1'])

    expect(mockFrom).toHaveBeenCalledWith('hire_items')
    expect(selectMock).toHaveBeenCalledWith('*, hire:hires!inner(*)')
    expect(inMock).toHaveBeenCalledWith('item_id', ['i1'])
    expect(notMock).toHaveBeenCalledWith('checked_out_at', 'is', null)
    expect(isMock).toHaveBeenCalledWith('checked_in_at', null)
    expect(eqMock).toHaveBeenCalledWith('hire.status', 'active')
    expect(result).toEqual(fakeData)
  })
})
