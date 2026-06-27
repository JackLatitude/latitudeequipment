import { getItems, getItem, createItem, deleteItem } from '@/lib/db/items'

const mockSelect = jest.fn()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom: jest.Mock<any> = jest.fn(() => ({ select: mockSelect }))
const mockSupabase = { from: mockFrom }

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

describe('getItems', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns items from supabase', async () => {
    const fakeItems = [{ id: '1', name: 'Drone', deleted_at: null }]
    mockSelect.mockReturnValue({
      is: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: fakeItems, error: null }),
      }),
    })
    const result = await getItems()
    expect(result).toEqual(fakeItems)
  })

  it('throws on supabase error', async () => {
    mockSelect.mockReturnValue({
      is: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      }),
    })
    await expect(getItems()).rejects.toThrow('DB error')
  })
})

describe('deleteItem', () => {
  it('sets deleted_at rather than hard-deleting', async () => {
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })
    mockFrom.mockReturnValue({ update: mockUpdate })
    await deleteItem('item-1')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) })
    )
  })
})

describe('getLooseItems', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFrom.mockImplementation(() => ({ select: mockSelect }))
  })

  it('returns only items with null kit_id', async () => {
    const fakeItems = [{ id: '1', name: 'Drone', kit_id: null, deleted_at: null }]
    mockSelect.mockReturnValue({
      is: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: fakeItems, error: null }),
        }),
      }),
    })
    const { getLooseItems } = await import('@/lib/db/items')
    const result = await getLooseItems()
    expect(result).toEqual(fakeItems)
  })
})
