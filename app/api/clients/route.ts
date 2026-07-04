import { createClient } from '@/lib/supabase/server'
import { createClient_ } from '@/lib/db/clients'
import { NextResponse } from 'next/server'
import { serverError, readJson } from '@/lib/api/route-helpers'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await readJson(request)
  if (!body) return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  if (!body.name) {
    return NextResponse.json({ message: 'Name is required' }, { status: 400 })
  }
  try {
    const client = await createClient_({
      name: body.name,
      contact_name: body.contact_name || undefined,
      email: body.email || undefined,
      phone: body.phone || undefined,
      address: body.address || undefined,
      notes: body.notes || undefined,
    })
    return NextResponse.json(client)
  } catch (e: unknown) {
    return serverError(e, 'POST /api/clients')
  }
}
