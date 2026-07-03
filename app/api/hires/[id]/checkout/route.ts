import { createClient } from '@/lib/supabase/server'
import { checkoutHire, getHireStatus } from '@/lib/db/hires'
import { NextResponse } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const status = await getHireStatus(id)
    if (status !== 'draft') {
      return NextResponse.json({ message: 'Only draft hires can be checked out' }, { status: 409 })
    }
    await checkoutHire(id)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message }, { status: 500 })
  }
}
