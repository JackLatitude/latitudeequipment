import {
  getFirmwareTargets,
  upsertFirmwareTarget,
  getFirmwareModels,
  getOutdatedFirmwareCount,
} from '@/lib/db/firmware'

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

describe('getFirmwareModels', () => {
  it('filters to firmware categories + non-deleted items and groups via buildFirmwareModels', async () => {
    const itemRows = [
      { id: 'a', name: 'DJI Air 3', serial_number: 'S1', firmware_version: '1.0.0' },
      { id: 'b', name: 'DJI Air 3', serial_number: 'S2', firmware_version: '1.1.0' },
    ]
    const targetRows = [
      { id: 't1', model: 'DJI Air 3', manufacturer: 'DJI', latest_version: '1.1.0', source_url: null, last_checked_at: null, created_at: '2026-01-01T00:00:00Z' },
    ]
    const order = jest.fn().mockResolvedValue({ data: itemRows, error: null })
    const isFn = jest.fn().mockReturnValue({ order })
    const inFn = jest.fn().mockReturnValue({ is: isFn })
    const itemsSelect = jest.fn().mockReturnValue({ in: inFn })
    const targetsSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({ data: targetRows, error: null }),
    })
    mockFrom.mockImplementation((table: string) =>
      table === 'items' ? { select: itemsSelect } : { select: targetsSelect }
    )

    const models = await getFirmwareModels()

    expect(inFn).toHaveBeenCalledWith('category', expect.arrayContaining(['Cameras', 'Monitoring', 'Drones']))
    expect(isFn).toHaveBeenCalledWith('deleted_at', null)
    expect(models).toHaveLength(1)
    expect(models[0].units.find((u) => u.id === 'a')!.outdated).toBe(true)
    expect(models[0].units.find((u) => u.id === 'b')!.outdated).toBe(false)
  })
})

describe('getOutdatedFirmwareCount', () => {
  it('returns the count of outdated units across models', async () => {
    const itemRows = [
      { id: 'a', name: 'DJI Air 3', serial_number: null, firmware_version: '1.0.0' },
      { id: 'b', name: 'Sony FX6', serial_number: null, firmware_version: '2.0' },
    ]
    const targetRows = [
      { id: 't1', model: 'DJI Air 3', manufacturer: null, latest_version: '1.1.0', source_url: null, last_checked_at: null, created_at: 'x' },
      { id: 't2', model: 'Sony FX6', manufacturer: null, latest_version: '2.0', source_url: null, last_checked_at: null, created_at: 'x' },
    ]
    const order = jest.fn().mockResolvedValue({ data: itemRows, error: null })
    const itemsSelect = jest.fn().mockReturnValue({ in: jest.fn().mockReturnValue({ is: jest.fn().mockReturnValue({ order }) }) })
    const targetsSelect = jest.fn().mockReturnValue({
      order: jest.fn().mockResolvedValue({ data: targetRows, error: null }),
    })
    mockFrom.mockImplementation((table: string) =>
      table === 'items' ? { select: itemsSelect } : { select: targetsSelect }
    )

    expect(await getOutdatedFirmwareCount()).toBe(1)
  })
})
