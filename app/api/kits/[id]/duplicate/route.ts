import { createClient } from '@/lib/supabase/server'
import { duplicateKit } from '@/lib/db/kits'
import { NextResponse } from 'next/server'
import { serverError } from '@/lib/api/route-helpers'

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const kit = await duplicateKit(id, user.id)
    return NextResponse.json(kit)
  } catch (e: unknown) {
    return serverError(e, 'POST /api/kits/[id]/duplicate')
  }
}
