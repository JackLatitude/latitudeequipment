import { sortItems } from '@/components/equipment/item-table'
import type { Item } from '@/lib/types'

function item(name: string, unitNumber: number | null, extra: Partial<Item> = {}): Item {
  return {
    id: `${name}-${unitNumber}`,
    name,
    unit_number: unitNumber,
    serial_number: null,
    category: null,
    notes: null,
    kit_id: null,
    current_holder_id: null,
    value: null,
    country_of_origin: null,
    weight_kg: null,
    owner: 'Latitude Equipment',
    firmware_version: null,
    paired_item_id: null,
    deleted_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...extra,
  } as Item
}

const numbers = (items: Item[]) => items.map((i) => i.unit_number)

describe('sortItems', () => {
  it('orders units of the same model by number, not database order', () => {
    const items = [item('TX Unit', 9), item('TX Unit', 2), item('TX Unit', 10), item('TX Unit', 1)]
    expect(numbers(sortItems(items, 'name', 'asc'))).toEqual([1, 2, 9, 10])
  })

  it('compares numbers numerically, so #2 comes before #10', () => {
    const items = [item('TX Unit', 10), item('TX Unit', 2)]
    expect(numbers(sortItems(items, 'name', 'asc'))).toEqual([2, 10])
  })

  it('reverses the numbering when the direction is flipped', () => {
    const items = [item('TX Unit', 2), item('TX Unit', 10), item('TX Unit', 1)]
    expect(numbers(sortItems(items, 'name', 'desc'))).toEqual([10, 2, 1])
  })

  it('still sorts by name first', () => {
    const items = [item('TX Unit', 1), item('Antenna', 5)]
    expect(sortItems(items, 'name', 'asc').map((i) => i.name)).toEqual(['Antenna', 'TX Unit'])
  })

  it('puts unnumbered units last in both directions', () => {
    const items = [item('TX Unit', null), item('TX Unit', 2), item('TX Unit', 1)]
    expect(numbers(sortItems(items, 'name', 'asc'))).toEqual([1, 2, null])
    expect(numbers(sortItems(items, 'name', 'desc'))).toEqual([2, 1, null])
  })

  it('breaks ties on other sort fields by number too', () => {
    // Same holder on every row: without the tiebreak these keep database order.
    const holder = { id: 'p1', display_name: 'Jack', is_admin: false, created_at: '' }
    const items = [
      item('TX Unit', 9, { current_holder: holder }),
      item('TX Unit', 1, { current_holder: holder }),
      item('TX Unit', 3, { current_holder: holder }),
    ]
    expect(numbers(sortItems(items, 'holder', 'asc'))).toEqual([1, 3, 9])
  })

  it('keeps rows with no value for the sort field last', () => {
    const items = [item('TX Unit', 1), item('TX Unit', 2, { serial_number: 'ABC' })]
    expect(numbers(sortItems(items, 'serial_number', 'asc'))).toEqual([2, 1])
    expect(numbers(sortItems(items, 'serial_number', 'desc'))).toEqual([2, 1])
  })
})
