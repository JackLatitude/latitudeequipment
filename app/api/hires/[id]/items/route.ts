import { createClient } from '@/lib/supabase/server'
import { addHireItems, getHireStatus } from '@/lib/db/hires'
import { NextResponse } from 'next/server'
import { serverError, readJson } from '@/lib/api/route-helpers'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await readJson(request)
  if (!body) return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  if (!Array.isArray(body.itemIds) || body.itemIds.length === 0) {
    return NextResponse.json({ message: 'itemIds must be a non-empty array' }, { status: 400 })
  }
  try {
    const status = await getHireStatus(id)
    if (status === null) {
      return NextResponse.json({ message: 'Hire not found' }, { status: 404 })
    }
    if (status !== 'draft') {
      return NextResponse.json({ message: 'Items can only be added to draft hires' }, { status: 409 })
    }
    await addHireItems(id, body.itemIds)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return serverError(e, 'POST /api/hires/[id]/items')
  }
}
