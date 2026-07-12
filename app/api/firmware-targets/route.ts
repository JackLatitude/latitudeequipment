import { createClient } from '@/lib/supabase/server'
import { upsertFirmwareTarget } from '@/lib/db/firmware'
import { NextResponse } from 'next/server'
import { serverError, readJson } from '@/lib/api/route-helpers'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const body = await readJson(request)
  if (!body) return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 })
  const model = typeof body.model === 'string' ? body.model.trim() : ''
  if (!model) return NextResponse.json({ message: 'Model is required' }, { status: 400 })

  try {
    const target = await upsertFirmwareTarget({
      model,
      manufacturer: typeof body.manufacturer === 'string' ? body.manufacturer : undefined,
      latest_version: typeof body.latest_version === 'string' ? body.latest_version : undefined,
      source_url: typeof body.source_url === 'string' ? body.source_url : undefined,
    })
    return NextResponse.json(target)
  } catch (e: unknown) {
    return serverError(e, 'POST /api/firmware-targets')
  }
}
