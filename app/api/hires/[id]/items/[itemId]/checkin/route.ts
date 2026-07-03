import { createClient } from '@/lib/supabase/server'
import { checkinHireItem, getHireStatus } from '@/lib/db/hires'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string; itemId: string }> }

export async function POST(request: Request, { params }: Ctx) {
  const { id, itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  try {
    const status = await getHireStatus(id)
    if (status !== 'active') {
      return NextResponse.json({ message: 'Items can only be checked in on active hires' }, { status: 409 })
    }
    await checkinHireItem(id, itemId, body.condition || undefined)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
