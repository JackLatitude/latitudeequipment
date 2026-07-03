import { createClient } from '@/lib/supabase/server'
import { getHire } from '@/lib/db/hires'
import { generateHirePdf, type HirePdfData } from '@/lib/pdf/hire-pdf'
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

  const checkedOutAt = hire.hire_items?.find((hi) => hi.checked_out_at)?.checked_out_at ?? null

  const data: HirePdfData = {
    ref: hire.ref,
    title: hire.title,
    status: hire.status,
    client: hire.client
      ? {
          name: hire.client.name,
          contact_name: hire.client.contact_name,
          email: hire.client.email,
          phone: hire.client.phone,
          address: hire.client.address,
        }
      : null,
    start_date: hire.start_date,
    end_date: hire.end_date,
    latitude_contact: hire.latitude_contact?.display_name ?? null,
    checked_out_at: checkedOutAt,
    items: (hire.hire_items ?? []).map((hi) => ({
      name: hi.item?.name ?? 'Unknown item',
      serial_number: hi.item?.serial_number ?? null,
      category: hi.item?.category ?? null,
      checked_in: hi.checked_in_at != null,
    })),
  }

  try {
    const pdf = await generateHirePdf(data)
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${hire.ref}-packing-slip.pdf"`,
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ message: `PDF generation failed: ${message}` }, { status: 500 })
  }
}
