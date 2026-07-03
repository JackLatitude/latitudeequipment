import { getHires, checkoutHire, checkinHire, getActiveHireItemsByItemIds } from '@/lib/db/hires'

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
    const itemsUpdateMock = jest.fn()
    const itemsUpdateEq = jest.fn().mockResolvedValue({ error: null })
    itemsUpdateMock.mockReturnValue({ eq: itemsUpdateEq })

    mockFrom.mockReturnValueOnce({
      update: itemsUpdateMock,
    })

    const hireUpdateMock = jest.fn()
    const hireUpdateEq = jest.fn().mockResolvedValue({ error: null })
    hireUpdateMock.mockReturnValue({ eq: hireUpdateEq })

    mockFrom.mockReturnValueOnce({
      update: hireUpdateMock,
    })

    await checkoutHire('h1')

    expect(mockFrom).toHaveBeenNthCalledWith(1, 'hire_items')
    expect(itemsUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ checked_out_at: expect.any(String) }))
    expect(itemsUpdateEq).toHaveBeenCalledWith('hire_id', 'h1')

    expect(mockFrom).toHaveBeenNthCalledWith(2, 'hires')
    expect(hireUpdateMock).toHaveBeenCalledWith({ status: 'active' })
    expect(hireUpdateEq).toHaveBeenCalledWith('id', 'h1')
  })
})

describe('checkinHire', () => {
  beforeEach(() => jest.clearAllMocks())

  it('checks in outstanding items then sets status to returned', async () => {
    const isChain = jest.fn().mockResolvedValue({ error: null })
    const eqChain = jest.fn().mockReturnValue({ is: isChain })
    const itemsUpdateMock = jest.fn().mockReturnValue({ eq: eqChain })

    mockFrom.mockReturnValueOnce({
      update: itemsUpdateMock,
    })

    const hireUpdateMock = jest.fn()
    const hireUpdateEq = jest.fn().mockResolvedValue({ error: null })
    hireUpdateMock.mockReturnValue({ eq: hireUpdateEq })

    mockFrom.mockReturnValueOnce({
      update: hireUpdateMock,
    })

    await checkinHire('h1')

    expect(mockFrom).toHaveBeenNthCalledWith(1, 'hire_items')
    expect(itemsUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ checked_in_at: expect.any(String) }))
    expect(eqChain).toHaveBeenCalledWith('hire_id', 'h1')
    expect(isChain).toHaveBeenCalledWith('checked_in_at', null)

    expect(mockFrom).toHaveBeenNthCalledWith(2, 'hires')
    expect(hireUpdateMock).toHaveBeenCalledWith({ status: 'returned' })
    expect(hireUpdateEq).toHaveBeenCalledWith('id', 'h1')
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
