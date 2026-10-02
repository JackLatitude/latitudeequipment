import * as XLSX from 'xlsx'
import type { Item } from '@/lib/types'
import { itemDisplayName } from '@/lib/format'

export type CarnetRow = {
  'Kit': string
  'Name': string
  'Serial Number': string
  'Value (£)': number | ''
  'Country of Origin': string
  'Weight (kg)': number | ''
}

// Groups items by kit (alphabetical, loose items last), keeping the incoming
// name/unit order within each group.
export function carnetRows(items: Item[]): CarnetRow[] {
  const sorted = [...items].sort((a, b) => {
    const ka = a.kit?.name
    const kb = b.kit?.name
    if (ka === kb) return 0
    if (!ka) return 1
    if (!kb) return -1
    return ka.localeCompare(kb)
  })

  return sorted.map((item) => ({
    'Kit': item.kit?.name ?? 'Loose item',
    'Name': itemDisplayName(item),
    'Serial Number': item.serial_number ?? '',
    'Value (£)': item.value ?? '',
    'Country of Origin': item.country_of_origin ?? '',
    'Weight (kg)': item.weight_kg ?? '',
  }))
}

export function buildCarnetWorkbook(items: Item[]): Uint8Array<ArrayBuffer> {
  const ws = XLSX.utils.json_to_sheet(carnetRows(items))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Carnet')
  return new Uint8Array(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}
