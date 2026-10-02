/**
 * @jest-environment node
 */
import * as XLSX from 'xlsx'
import { carnetRows, buildCarnetWorkbook } from '@/lib/carnet'
import type { Item, Kit } from '@/lib/types'

const kit = (name: string): Kit => ({
  id: name, name, description: null, current_holder_id: 'u', created_at: '',
})

const item = (over: Partial<Item>): Item => ({
  id: 'i', name: 'Item', serial_number: null, category: null, notes: null,
  kit_id: null, current_holder_id: null, value: null, country_of_origin: null,
  weight_kg: null, owner: 'latitude', firmware_version: null, unit_number: null,
  paired_item_id: null, deleted_at: null, created_at: '', ...over,
})

describe('carnetRows', () => {
  it('groups by kit alphabetically with loose items last', () => {
    const rows = carnetRows([
      item({ name: 'Loose' }),
      item({ name: 'Zed', kit: kit('Zulu') }),
      item({ name: 'Alpha', kit: kit('Alpha') }),
    ])
    expect(rows.map((r) => r.Kit)).toEqual(['Alpha', 'Zulu', 'Loose item'])
  })

  it('keeps the incoming order within a kit', () => {
    const k = kit('Kit')
    const rows = carnetRows([
      item({ name: 'B', kit: k }),
      item({ name: 'A', kit: k }),
    ])
    expect(rows.map((r) => r.Name)).toEqual(['B', 'A'])
  })

  it('blanks out missing values', () => {
    const [row] = carnetRows([item({ name: 'Drone', unit_number: 2, value: 1200 })])
    expect(row).toEqual({
      'Kit': 'Loose item',
      'Name': 'Drone #2',
      'Serial Number': '',
      'Value (£)': 1200,
      'Country of Origin': '',
      'Weight (kg)': '',
    })
  })
})

describe('buildCarnetWorkbook', () => {
  it('produces a readable xlsx with a Carnet sheet', () => {
    const bytes = buildCarnetWorkbook([item({ name: 'Drone', serial_number: 'SN1' })])
    const wb = XLSX.read(bytes, { type: 'array' })
    expect(wb.SheetNames).toEqual(['Carnet'])
    const [row] = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Carnet)
    expect(row['Serial Number']).toBe('SN1')
  })
})
