import { createClient } from '@/lib/supabase/server'
import { createKit } from '@/lib/db/kits'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  try {
    const kit = await createKit({
      name: body.name,
      description: body.description || undefined,
      current_holder_id: body.current_holder_id,
    })
    return NextResponse.json(kit)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
