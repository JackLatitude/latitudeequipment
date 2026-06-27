import { createClient } from '@/lib/supabase/server'
import { updateItem } from '@/lib/db/items'
import { getKit } from '@/lib/db/kits'
import { assignItem } from '@/lib/db/assignments'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await updateItem(id, { kit_id: null } as any)
      }
      // Re-fetch and return updated item
      const { getItem } = await import('@/lib/db/items')
      const updated = await getItem(id)
      return NextResponse.json(updated)
    }

    // Standard field update (no kit_id change)
    const item = await updateItem(id, {
      name: body.name,
      serial_number: body.serial_number || undefined,
      category: body.category || undefined,
      notes: body.notes || undefined,
      value: body.value ? parseFloat(body.value) : undefined,
      country_of_origin: body.country_of_origin || undefined,
      weight_kg: body.weight_kg ? parseFloat(body.weight_kg) : undefined,
    })
    return NextResponse.json(item)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
