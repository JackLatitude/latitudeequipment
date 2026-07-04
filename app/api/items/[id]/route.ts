import { createClient } from '@/lib/supabase/server'
import { updateItem, getItem } from '@/lib/db/items'
import { getKit } from '@/lib/db/kits'
import { assignItem } from '@/lib/db/assignments'
import { NextResponse } from 'next/server'
import { serverError, readJson, optionalNumber } from '@/lib/api/route-helpers'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await readJson(request)
  if (!body) return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })

  try {
    // Handle kit assignment: when kit_id is provided and non-null, sync holder
    if (body.kit_id !== undefined) {
      if (body.kit_id) {
        const kit = await getKit(body.kit_id)
        if (!kit) return NextResponse.json({ message: 'Kit not found' }, { status: 404 })
        // Update kit_id first, then assign item to kit's holder
        await updateItem(id, { kit_id: body.kit_id })
        await assignItem(id, kit.current_holder_id, user.id, `Added to kit: ${kit.name}`)
      } else {
        // Removing from kit — just clear kit_id, leave holder unchanged
        await updateItem(id, { kit_id: null })
      }
      // Re-fetch and return updated item
      const updated = await getItem(id)
      return NextResponse.json(updated)
    }

    // Standard field update (no kit_id change)
    const value = optionalNumber(body.value)
    const weightKg = optionalNumber(body.weight_kg)
    if (value === null || weightKg === null) {
      return NextResponse.json({ message: 'Value and weight must be numbers' }, { status: 400 })
    }
    const item = await updateItem(id, {
      name: body.name,
      serial_number: body.serial_number || undefined,
      category: body.category || undefined,
      notes: body.notes || undefined,
      value,
      country_of_origin: body.country_of_origin || undefined,
      weight_kg: weightKg,
    })
    return NextResponse.json(item)
  } catch (e: unknown) {
    return serverError(e, 'PATCH /api/items/[id]')
  }
}
