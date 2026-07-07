import { createClient } from '@/lib/supabase/server'
import { getItemBySerial } from '@/lib/db/items'
import { NextResponse } from 'next/server'
import { serverError } from '@/lib/api/route-helpers'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const serial = new URL(request.url).searchParams.get('serial')?.trim()
  if (!serial) {
    return NextResponse.json({ message: 'serial is required' }, { status: 400 })
  }

  try {
    const item = await getItemBySerial(serial)
    if (!item) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json({ id: item.id })
  } catch (e: unknown) {
    return serverError(e, 'GET /api/items/lookup')
  }
}
