import { createClient } from '@/lib/supabase/server'
import { createKit } from '@/lib/db/kits'
import { NextResponse } from 'next/server'
import { serverError, readJson } from '@/lib/api/route-helpers'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await readJson(request)
  if (!body) return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  try {
    const kit = await createKit({
      name: body.name,
      description: body.description || undefined,
      current_holder_id: body.current_holder_id,
    })
    return NextResponse.json(kit)
  } catch (e: unknown) {
    return serverError(e, 'POST /api/kits')
  }
}
