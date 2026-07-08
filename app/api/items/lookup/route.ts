import { createClient } from '@/lib/supabase/server'
import { getItemBySerial, getItemBySerialPrefix } from '@/lib/db/items'
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
    const exactItem = await getItemBySerial(serial)
    if (exactItem) {
      return NextResponse.json({ exact: { id: exactItem.id }, suggestion: null })
    }
    // No exact hit — offer the closest model by DJI-style 4-char prefix.
    const suggestion = serial.length >= 4 ? await getItemBySerialPrefix(serial.slice(0, 4)) : null
    return NextResponse.json({ exact: null, suggestion })
  } catch (e: unknown) {
    return serverError(e, 'GET /api/items/lookup')
  }
}
