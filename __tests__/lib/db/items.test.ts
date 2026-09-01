import { getItems, getItem, createItem, deleteItem } from '@/lib/db/items'

const mockSelect = jest.fn()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom: jest.Mock<any> = jest.fn(() => ({ select: mockSelect }))
const mockSupabase = { from: mockFrom }

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

// A stand-in for a supabase query builder: every chained call returns the same
// object, which is itself awaitable. Tests then don't have to mirror the exact
// sequence of .is()/.order()/.in() calls a query happens to make.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function queryResult(result: { data: unknown; error: unknown }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = Promise.resolve(result)
  for (const method of ['is', 'order', 'in', 'eq', 'neq', 'ilike', 'limit', 'or']) {
    chain[method] = jest.fn(() => chain)
  }
  return chain
}

describe('getItems', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns items from supabase', async () => {
    const fakeItems = [{ id: '1', name: 'Drone', deleted_at: null }]
    mockSelect.mockReturnValue(queryResult({ data: fakeItems, error: null }))
    const result = await getItems()
    expect(result).toEqual(fakeItems)
  })

  it('orders by unit number after name, so same-model units read 1, 2, 3', async () => {
    const chain = queryResult({ data: [], error: null })
    mockSelect.mockReturnValue(chain)
    await getItems()
    expect(chain.order).toHaveBeenNthCalledWith(1, 'name')
    expect(chain.order).toHaveBeenNthCalledWith(2, 'unit_number', { nullsFirst: false })
  })

  it('throws on supabase error', async () => {
    mockSelect.mockReturnValue(queryResult({ data: null, error: { message: 'DB error' } }))
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
    mockSelect.mockReturnValue(queryResult({ data: fakeItems, error: null }))
    const { getLooseItems } = await import('@/lib/db/items')
    const result = await getLooseItems()
    expect(result).toEqual(fakeItems)
  })
})

describe('getItemsByIds', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFrom.mockImplementation(() => ({ select: mockSelect }))
  })

  it('returns items matching the given ids', async () => {
    const fakeItems = [{ id: 'abc', name: 'Drone', deleted_at: null }]
    mockSelect.mockReturnValue(queryResult({ data: fakeItems, error: null }))
    const { getItemsByIds } = await import('@/lib/db/items')
    const result = await getItemsByIds(['abc'])
    expect(result).toEqual(fakeItems)
  })

  it('returns empty array for empty ids input', async () => {
    const { getItemsByIds } = await import('@/lib/db/items')
    const result = await getItemsByIds([])
    expect(result).toEqual([])
  })
})

describe('findUnitNumberClash', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFrom.mockImplementation(() => ({ select: mockSelect }))
  })

  it('reports the live unit already holding that number', async () => {
    const holder = { id: 'x', name: 'TX Unit', unit_number: 3 }
    mockSelect.mockReturnValue(queryResult({ data: [holder], error: null }))
    const { findUnitNumberClash } = await import('@/lib/db/items')
    expect(await findUnitNumberClash('TX Unit', 3)).toEqual(holder)
  })

  it('reports nothing when the number is free', async () => {
    mockSelect.mockReturnValue(queryResult({ data: [], error: null }))
    const { findUnitNumberClash } = await import('@/lib/db/items')
    expect(await findUnitNumberClash('TX Unit', 3)).toBeNull()
  })

  it('excludes the item itself and its pair partner from the search', async () => {
    const chain = queryResult({ data: [], error: null })
    mockSelect.mockReturnValue(chain)
    const { findUnitNumberClash } = await import('@/lib/db/items')
    await findUnitNumberClash('TX Unit', 3, ['self-id', 'partner-id'])
    expect(chain.neq).toHaveBeenCalledWith('id', 'self-id')
    expect(chain.neq).toHaveBeenCalledWith('id', 'partner-id')
  })

  it('ignores a blank name rather than querying for every item', async () => {
    const { findUnitNumberClash } = await import('@/lib/db/items')
    expect(await findUnitNumberClash('   ', 3)).toBeNull()
  })
})
