import { createClient } from '@/lib/supabase/server'
import { reopenHire, getHireStatus } from '@/lib/db/hires'
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
    if (status !== 'returned') {
      // An active hire still has kit out in the field; it must be returned
      // before it can go back to draft, or the items would silently read as
      // available while they are on a job.
      return NextResponse.json({ message: 'Only returned hires can be reopened' }, { status: 409 })
    }
    await reopenHire(id)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return serverError(e, 'POST /api/hires/[id]/reopen')
  }
}
