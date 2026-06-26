import { createClient } from '@/lib/supabase/server'
import { getProfile, inviteUser } from '@/lib/db/users'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const profile = await getProfile(user.id)
  if (!profile?.is_admin) {
    return NextResponse.json({ message: 'Admin only' }, { status: 403 })
  }

  const { email } = await request.json()
  try {
    await inviteUser(email)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
