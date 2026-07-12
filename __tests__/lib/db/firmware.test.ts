import { getFirmwareTargets, upsertFirmwareTarget } from '@/lib/db/firmware'

const mockFrom: jest.Mock = jest.fn()
const mockSupabase = { from: mockFrom }

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

beforeEach(() => jest.clearAllMocks())

describe('getFirmwareTargets', () => {
  it('returns targets ordered by model', async () => {
    const rows = [{ id: 't1', model: 'DJI Air 3', latest_version: '1.1.0' }]
    const order = jest.fn().mockResolvedValue({ data: rows, error: null })
    mockFrom.mockReturnValue({ select: jest.fn().mockReturnValue({ order }) })
    const result = await getFirmwareTargets()
    expect(result).toEqual(rows)
    expect(order).toHaveBeenCalledWith('model')
  })

  it('throws on supabase error', async () => {
    const order = jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue({ select: jest.fn().mockReturnValue({ order }) })
    await expect(getFirmwareTargets()).rejects.toThrow('DB error')
  })
})

describe('upsertFirmwareTarget', () => {
  it('upserts on model and stamps last_checked_at when latest_version is provided', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 't1', model: 'DJI Air 3' }, error: null })
    const select = jest.fn().mockReturnValue({ single })
    const upsert = jest.fn().mockReturnValue({ select })
    mockFrom.mockReturnValue({ upsert })

    await upsertFirmwareTarget({ model: 'DJI Air 3', latest_version: '1.1.0' })

    const [row, opts] = upsert.mock.calls[0]
    expect(opts).toEqual({ onConflict: 'model' })
    expect(row.model).toBe('DJI Air 3')
    expect(row.latest_version).toBe('1.1.0')
    expect(typeof row.last_checked_at).toBe('string')
  })

  it('does not stamp last_checked_at when latest_version is absent', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 't1', model: 'DJI Air 3' }, error: null })
    const upsert = jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single }) })
    mockFrom.mockReturnValue({ upsert })

    await upsertFirmwareTarget({ model: 'DJI Air 3', source_url: 'https://dji.com' })

    const [row] = upsert.mock.calls[0]
    expect(row.last_checked_at).toBeUndefined()
    expect(row.source_url).toBe('https://dji.com')
  })
})
