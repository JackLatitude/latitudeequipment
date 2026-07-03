import { getClients, deleteClient } from '@/lib/db/clients'

const mockFrom = jest.fn()
const mockSupabase = { from: mockFrom }

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

describe('getClients', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns clients ordered by name', async () => {
    const fakeClients = [{ id: '1', name: 'Nike' }]
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: fakeClients, error: null }),
      }),
    })
    const result = await getClients()
    expect(result).toEqual(fakeClients)
  })
})

describe('deleteClient', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws CLIENT_HAS_HIRES when client has hires', async () => {
    // count query for hires
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 2, error: null }),
      }),
    })
    await expect(deleteClient('c1')).rejects.toThrow('CLIENT_HAS_HIRES')
  })

  it('deletes when client has no hires', async () => {
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
      }),
    })
    const mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    })
    mockFrom.mockReturnValueOnce({ delete: mockDelete })
    await deleteClient('c1')
    expect(mockDelete).toHaveBeenCalled()
  })
})
