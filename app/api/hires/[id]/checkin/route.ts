import { createClient } from '@/lib/supabase/server'
import { checkinHire, getHireStatus } from '@/lib/db/hires'
import { NextResponse } from 'next/server'
import { serverError } from '@/lib/api/route-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const status = await getHireStatus(id)
    if (status === null) {
      return NextResponse.json({ message: 'Hire not found' }, { status: 404 })
    }
    if (status !== 'active') {
      return NextResponse.json({ message: 'Only active hires can be returned' }, { status: 409 })
    }
    await checkinHire(id)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return serverError(e, 'POST /api/hires/[id]/checkin')
  }
}
