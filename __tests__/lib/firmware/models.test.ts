import { buildFirmwareModels, countOutdated } from '@/lib/firmware/models'
import type { FirmwareTarget } from '@/lib/types'

function target(over: Partial<FirmwareTarget> & { model: string }): FirmwareTarget {
  return {
    id: `t-${over.model}`,
    manufacturer: null,
    latest_version: null,
    source_url: null,
    last_checked_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  }
}

describe('buildFirmwareModels', () => {
  it('groups units under one model (matched case/space-insensitively) and flags outdated units', () => {
    const items = [
      { id: 'a', name: 'DJI Air 3', serial_number: 'S1', firmware_version: '1.0.0' },
      { id: 'b', name: 'dji air 3 ', serial_number: 'S2', firmware_version: '1.1.0' },
    ]
    const targets = [target({ model: 'DJI Air 3', latest_version: '1.1.0', manufacturer: 'DJI' })]
    const models = buildFirmwareModels(items, targets)
    expect(models).toHaveLength(1)
    expect(models[0].model).toBe('DJI Air 3')
    expect(models[0].manufacturer).toBe('DJI')
    expect(models[0].units).toHaveLength(2)
    expect(models[0].units.find((u) => u.id === 'a')!.outdated).toBe(true)
    expect(models[0].units.find((u) => u.id === 'b')!.outdated).toBe(false)
  })

  it('includes a model with no target row, with null target fields and no outdated units', () => {
    const items = [{ id: 'a', name: 'Sony FX6', serial_number: null, firmware_version: '3.0' }]
    const models = buildFirmwareModels(items, [])
    expect(models).toHaveLength(1)
    expect(models[0].latest_version).toBeNull()
    expect(models[0].units[0].outdated).toBe(false)
  })

  it('sorts models by name', () => {
    const items = [
      { id: 'a', name: 'Zebra', serial_number: null, firmware_version: null },
      { id: 'b', name: 'Alpha', serial_number: null, firmware_version: null },
    ]
    const models = buildFirmwareModels(items, [])
    expect(models.map((m) => m.model)).toEqual(['Alpha', 'Zebra'])
  })
})

describe('countOutdated', () => {
  it('counts outdated units across all models', () => {
    const items = [
      { id: 'a', name: 'DJI Air 3', serial_number: null, firmware_version: '1.0.0' },
      { id: 'b', name: 'DJI Air 3', serial_number: null, firmware_version: '1.1.0' },
      { id: 'c', name: 'Sony FX6', serial_number: null, firmware_version: '2.0' },
    ]
    const targets = [
      target({ model: 'DJI Air 3', latest_version: '1.1.0' }),
      target({ model: 'Sony FX6', latest_version: '3.0' }),
    ]
    expect(countOutdated(buildFirmwareModels(items, targets))).toBe(2)
  })
})
