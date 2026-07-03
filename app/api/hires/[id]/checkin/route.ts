import { createClient } from '@/lib/supabase/server'
import { checkinHire, getHireStatus } from '@/lib/db/hires'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const status = await getHireStatus(id)
    if (status !== 'active') {
      return NextResponse.json({ message: 'Only active hires can be returned' }, { status: 409 })
    }
    await checkinHire(id)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
