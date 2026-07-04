import { createClient } from '@/lib/supabase/server'
import { removeHireItem, getHireStatus } from '@/lib/db/hires'
import { NextResponse } from 'next/server'
import { serverError } from '@/lib/api/route-helpers'

type Ctx = { params: Promise<{ id: string; itemId: string }> }

export async function DELETE(request: Request, { params }: Ctx) {
  const { id, itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
    const status = await getHireStatus(id)
    if (status === null) {
      return NextResponse.json({ message: 'Hire not found' }, { status: 404 })
    }
    if (status !== 'draft') {
      return NextResponse.json({ message: 'Items can only be removed from draft hires' }, { status: 409 })
    }
    await removeHireItem(id, itemId)
    return new Response(null, { status: 204 })
  } catch (e: unknown) {
    return serverError(e, 'DELETE /api/hires/[id]/items/[itemId]')
  }
}
