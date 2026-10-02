import { createClient } from '@/lib/supabase/server'
import { getHire } from '@/lib/db/hires'
import { getItemsByIds } from '@/lib/db/items'
import { buildCarnetWorkbook } from '@/lib/carnet'
import { serverError } from '@/lib/api/route-helpers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const hire = await getHire(id)
  if (!hire) return NextResponse.json({ message: 'Hire not found' }, { status: 404 })

  const itemIds = (hire.hire_items ?? []).map((hi) => hi.item_id)
  if (itemIds.length === 0) {
    return NextResponse.json({ message: 'This hire has no items' }, { status: 400 })
  }

  try {
    // Re-fetched rather than read off hire_items so each item carries its kit.
    const items = await getItemsByIds(itemIds)
    const body = buildCarnetWorkbook(items)
    // `inline` for the same reason as the hire PDF: the standalone iOS app has
    // no download manager, so an attachment is silently dropped. Inline opens
    // Quick Look on iOS (with share/save); desktop browsers still download it.
    return new Response(body, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `inline; filename="${hire.ref}-carnet.xlsx"`,
        'Content-Length': String(body.byteLength),
      },
    })
  } catch (e: unknown) {
    return serverError(e, 'GET /api/hires/[id]/carnet')
  }
}
