import { createClient } from '@/lib/supabase/server'
import { updateClient, deleteClient } from '@/lib/db/clients'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  try {
    const client = await updateClient(id, {
      name: body.name,
      contact_name: body.contact_name ?? undefined,
      email: body.email ?? undefined,
      phone: body.phone ?? undefined,
      address: body.address ?? undefined,
      notes: body.notes ?? undefined,
    })
    return NextResponse.json(client)
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
    await deleteClient(id)
    return new Response(null, { status: 204 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    if (message === 'CLIENT_HAS_HIRES') {
      return NextResponse.json(
        { message: 'Client has hires and cannot be deleted' },
        { status: 409 }
      )
    }
    return NextResponse.json({ message }, { status: 500 })
  }
}
