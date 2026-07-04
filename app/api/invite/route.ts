import { createClient } from '@/lib/supabase/server'
import { getProfile, inviteUser } from '@/lib/db/users'
import { NextResponse } from 'next/server'
import { serverError, readJson } from '@/lib/api/route-helpers'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const profile = await getProfile(user.id)
  if (!profile?.is_admin) {
    return NextResponse.json({ message: 'Admin only' }, { status: 403 })
  }

  const body = await readJson(request)
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  // Shape check only — Supabase does full validation on its side.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: 'A valid email address is required' }, { status: 400 })
  }
  try {
    await inviteUser(email)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return serverError(e, 'POST /api/invite')
  }
}
