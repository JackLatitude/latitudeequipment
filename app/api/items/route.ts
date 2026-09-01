import { createClient } from '@/lib/supabase/server'
import { createItem, updateItem, getItem, findUnitNumberClash } from '@/lib/db/items'
import { getKit } from '@/lib/db/kits'
import { assignItem } from '@/lib/db/assignments'
import { NextResponse } from 'next/server'
import { serverError, readJson, optionalNumber, parseUnitNumber } from '@/lib/api/route-helpers'
import { normalizeOwner } from '@/lib/constants'
import { capitalizeWords } from '@/lib/text'
import { itemDisplayName } from '@/lib/format'

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
  const unitNumber = parseUnitNumber(body.unit_number)
  if (!unitNumber.ok) return NextResponse.json({ message: unitNumber.message }, { status: 400 })
  const kitId = typeof body.kit_id === 'string' ? body.kit_id.trim() : ''
  const name = typeof body.name === 'string' ? capitalizeWords(body.name) : body.name
  try {
    // A number the user typed has to be free, or they'd end up with two
    // "#3"s and no way to tell the units apart on the shelf.
    if (unitNumber.value !== undefined) {
      const clash = await findUnitNumberClash(name, unitNumber.value)
      if (clash) {
        return NextResponse.json(
          { message: `${itemDisplayName(clash)} already uses that number` },
          { status: 409 }
        )
      }
    }

    // Validate the kit before creating so a bad id can't orphan an item.
    const kit = kitId ? await getKit(kitId) : null
    if (kitId && !kit) {
      return NextResponse.json({ message: 'Kit not found' }, { status: 404 })
    }

    const item = await createItem({
      name,
      serial_number: body.serial_number || undefined,
      category: body.category || undefined,
      notes: body.notes || undefined,
      value,
      country_of_origin: body.country_of_origin || undefined,
      weight_kg: weightKg,
      owner: normalizeOwner(body.owner),
      firmware_version: body.firmware_version || undefined,
      unit_number: unitNumber.value,
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
