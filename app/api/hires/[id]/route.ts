import { createClient } from '@/lib/supabase/server'
import { updateHire, deleteHire } from '@/lib/db/hires'
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
      latitude_contact_id: body.latitude_contact_id || null,
    })
    return NextResponse.json(hire)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    await deleteHire(id)
    return new Response(null, { status: 204 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
