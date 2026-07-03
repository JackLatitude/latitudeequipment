import { createClient } from '@/lib/supabase/server'
import { createHire } from '@/lib/db/hires'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.title || !body.client_id) {
    return NextResponse.json({ message: 'Title and client are required' }, { status: 400 })
  }
  try {
    const hire = await createHire({
      title: body.title,
      client_id: body.client_id,
      start_date: body.start_date || undefined,
      end_date: body.end_date || undefined,
      notes: body.notes || undefined,
      latitude_contact_id: body.latitude_contact_id || null,
      created_by_id: user.id,
    })
    return NextResponse.json(hire)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
