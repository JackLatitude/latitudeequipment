import { createClient } from '@/lib/supabase/server'
import { createItem, updateItem, getItem } from '@/lib/db/items'
import { getKit } from '@/lib/db/kits'
import { assignItem } from '@/lib/db/assignments'
import { NextResponse } from 'next/server'
import { serverError, readJson, optionalNumber } from '@/lib/api/route-helpers'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await readJson(request)
  if (!body) return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  if (!body.name) return NextResponse.json({ message: 'Name is required' }, { status: 400 })
  const value = optionalNumber(body.value)
  const weightKg = optionalNumber(body.weight_kg)
  if (value === null || weightKg === null) {
    return NextResponse.json({ message: 'Value and weight must be numbers' }, { status: 400 })
  }
  const kitId = typeof body.kit_id === 'string' ? body.kit_id.trim() : ''
  try {
    // Validate the kit before creating so a bad id can't orphan an item.
    const kit = kitId ? await getKit(kitId) : null
    if (kitId && !kit) {
      return NextResponse.json({ message: 'Kit not found' }, { status: 404 })
    }

    const item = await createItem({
      name: body.name,
      serial_number: body.serial_number || undefined,
      category: body.category || undefined,
      notes: body.notes || undefined,
      value,
      country_of_origin: body.country_of_origin || undefined,
      weight_kg: weightKg,
    })

    if (kit) {
      // Attach to the kit and inherit its holder, matching the edit-form flow.
      await updateItem(item.id, { kit_id: kit.id })
      await assignItem(item.id, kit.current_holder_id, user.id, `Added to kit: ${kit.name}`)
      const updated = await getItem(item.id)
      return NextResponse.json(updated ?? item)
    }

    return NextResponse.json(item)
  } catch (e: unknown) {
    return serverError(e, 'POST /api/items')
  }
}
