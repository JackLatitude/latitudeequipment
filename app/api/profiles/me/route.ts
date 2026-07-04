import { createClient } from '@/lib/supabase/server'
import { updateProfile } from '@/lib/db/users'
import { NextResponse } from 'next/server'
import { serverError, readJson } from '@/lib/api/route-helpers'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await readJson(request)
  if (!body) return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  try {
    const profile = await updateProfile(user.id, { display_name: body.display_name })
    return NextResponse.json(profile)
  } catch (e: unknown) {
    return serverError(e, 'PATCH /api/profiles/me')
  }
}
