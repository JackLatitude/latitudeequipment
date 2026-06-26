import { assignItem, assignKit, getItemHistory } from '@/lib/db/assignments'

const mockFrom = jest.fn()
const mockSupabase = { from: mockFrom }

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

describe('assignItem', () => {
  beforeEach(() => jest.clearAllMocks())

  it('updates item current_holder_id and inserts history record', async () => {
    const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    mockFrom
      .mockReturnValueOnce({ update: mockUpdate })
      .mockReturnValueOnce({ insert: mockInsert })

    await assignItem('item-1', 'user-2', 'user-1')

    expect(mockUpdate).toHaveBeenCalledWith({ current_holder_id: 'user-2' })
    expect(mockInsert).toHaveBeenCalledWith({
      item_id: 'item-1',
      assigned_to_id: 'user-2',
      assigned_by_id: 'user-1',
      note: null,
    })
  })

  it('accepts null for assigned_to_id (return to storage)', async () => {
    const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    mockFrom
      .mockReturnValueOnce({ update: mockUpdate })
      .mockReturnValueOnce({ insert: mockInsert })

    await assignItem('item-1', null, 'user-1')

    expect(mockUpdate).toHaveBeenCalledWith({ current_holder_id: null })
  })
})
