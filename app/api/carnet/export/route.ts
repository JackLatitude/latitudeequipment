import { createClient } from '@/lib/supabase/server'
import { getItemsByIds } from '@/lib/db/items'
import { NextResponse } from 'next/server'
import { serverError, readJson } from '@/lib/api/route-helpers'
import * as XLSX from 'xlsx'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await readJson(request)
  if (!body) return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })

  try {
    if (!Array.isArray(body.itemIds)) {
      return NextResponse.json({ message: 'itemIds must be an array' }, { status: 400 })
    }

    const itemIds: string[] = body.itemIds

    if (itemIds.length === 0) {
      return NextResponse.json({ message: 'No items selected' }, { status: 400 })
    }
    if (itemIds.length > 1000) {
      return NextResponse.json({ message: 'Too many items selected (max 1000)' }, { status: 400 })
    }

    const items = await getItemsByIds(itemIds)

    // Preserve the kit-grouped order the client sent
    const idOrder = new Map(itemIds.map((id, i) => [id, i]))
    items.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0))

    const rows = items.map((item) => ({
      'Kit': item.kit?.name ?? 'Loose item',
      'Name': item.name,
      'Serial Number': item.serial_number ?? '',
      'Value (£)': item.value ?? '',
      'Country of Origin': item.country_of_origin ?? '',
      'Weight (kg)': item.weight_kg ?? '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Carnet')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="carnet-export.xlsx"',
      },
    })
  } catch (e: unknown) {
    return serverError(e, 'POST /api/carnet/export')
  }
}
