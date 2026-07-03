import { createClient } from '@/lib/supabase/server'
import { updateHire } from '@/lib/db/hires'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  try {
    const hire = await updateHire(id, {
      title: body.title,
      client_id: body.client_id,
      start_date: body.start_date || undefined,
      end_date: body.end_date || undefined,
      notes: body.notes ?? undefined,
    })
    return NextResponse.json(hire)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
