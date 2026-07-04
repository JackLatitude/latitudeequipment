import { createClient } from '@/lib/supabase/server'
import { deleteKit, updateKit } from '@/lib/db/kits'
import { NextResponse } from 'next/server'
import { serverError, readJson } from '@/lib/api/route-helpers'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await readJson(request)
  if (!body) return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })

  try {
    const kit = await updateKit(id, {
      name: body.name,
      description: body.description || undefined,
    })
    return NextResponse.json(kit)
  } catch (e: unknown) {
    return serverError(e, 'kits/[id]')
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    await deleteKit(id)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return serverError(e, 'kits/[id]')
  }
}
