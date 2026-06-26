import { getKits, duplicateKit } from '@/lib/db/kits'

const mockInsert = jest.fn()
const mockSelect = jest.fn()
const mockFrom = jest.fn()
const mockSupabase = { from: mockFrom }

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

describe('getKits', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns kits ordered by name', async () => {
    const fakeKits = [{ id: '1', name: 'Inspire Kit' }]
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: fakeKits, error: null }),
      }),
    })
    const result = await getKits()
    expect(result).toEqual(fakeKits)
  })
})

describe('duplicateKit', () => {
  it('creates new kit and new item records (not references)', async () => {
    const fakeKit = {
      id: 'kit-1',
      name: 'Inspire Kit',
      description: 'Main kit',
      current_holder_id: 'user-1',
    }
    const fakeItems = [
      { name: 'Drone', serial_number: 'SN1', category: 'Drone', notes: null, value: 5000, country_of_origin: 'China', weight_kg: 4.2 },
    ]

    // getKit call
    const getKitChain = { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: fakeKit, error: null }) }) }) }
    // getItems in kit call
    const getItemsChain = { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ is: jest.fn().mockResolvedValue({ data: fakeItems, error: null }) }) }) }
    // createKit call
    const createKitChain = { insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { ...fakeKit, id: 'kit-2', name: 'Inspire Kit — Copy' }, error: null }) }) }) }
    // createItems call
    const createItemsChain = { insert: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue({ data: [], error: null }) }) }

    mockFrom
      .mockReturnValueOnce(getKitChain)
      .mockReturnValueOnce(getItemsChain)
      .mockReturnValueOnce(createKitChain)
      .mockReturnValueOnce(createItemsChain)

    await duplicateKit('kit-1', 'user-2')

    expect(createItemsChain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ serial_number: null, name: 'Drone' }),
      ])
    )
  })
})
