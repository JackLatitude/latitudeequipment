import { createClient } from '@/lib/supabase/server'
import { createItem } from '@/lib/db/items'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  try {
    const item = await createItem({
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
