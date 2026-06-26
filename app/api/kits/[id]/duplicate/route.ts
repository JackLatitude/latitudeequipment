import { createClient } from '@/lib/supabase/server'
import { duplicateKit } from '@/lib/db/kits'
import { NextResponse } from 'next/server'

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
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
