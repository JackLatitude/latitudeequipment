import { createClient } from '@/lib/supabase/server'
import { updateHire, deleteHire, getHireStatus } from '@/lib/db/hires'
import { NextResponse } from 'next/server'
import { serverError, readJson } from '@/lib/api/route-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await readJson(request)
  if (!body) return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
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
    return serverError(e, 'hires/[id]')
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const status = await getHireStatus(id)
    if (status === null) {
      return NextResponse.json({ message: 'Hire not found' }, { status: 404 })
    }
    if (status === 'active') {
      // Deleting an active hire would cascade away its checkout records and
      // silently mark deployed equipment as available. Return it first.
      return NextResponse.json(
        { message: 'Active hires cannot be deleted — return the hire first' },
        { status: 409 }
      )
    }
    await deleteHire(id)
    return new Response(null, { status: 204 })
  } catch (e: unknown) {
    return serverError(e, 'DELETE /api/hires/[id]')
  }
}
