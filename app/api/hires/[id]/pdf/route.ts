import { createClient } from '@/lib/supabase/server'
import { getHire } from '@/lib/db/hires'
import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const hire = await getHire(id)
  if (!hire) return NextResponse.json({ message: 'Hire not found' }, { status: 404 })

  const checkedOutAt = hire.hire_items?.find((hi) => hi.checked_out_at)?.checked_out_at ?? null

  const payload = {
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
    checked_out_at: checkedOutAt,
    items: (hire.hire_items ?? []).map((hi) => ({
      name: hi.item?.name ?? 'Unknown item',
      serial_number: hi.item?.serial_number ?? null,
      category: hi.item?.category ?? null,
      checked_in: hi.checked_in_at != null,
    })),
  }

  const script = path.join(process.cwd(), 'scripts', 'generate-hire-pdf.py')

  const pdf = await new Promise<Buffer>((resolve, reject) => {
    const proc = spawn('python3', [script])
    const chunks: Buffer[] = []
    const errChunks: Buffer[] = []
    proc.stdout.on('data', (c) => chunks.push(c))
    proc.stderr.on('data', (c) => errChunks.push(c))
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks))
      else reject(new Error(Buffer.concat(errChunks).toString() || `exit ${code}`))
    })
    proc.stdin.write(JSON.stringify(payload))
    proc.stdin.end()
  }).catch((e: Error) => e)

  if (pdf instanceof Error) {
    return NextResponse.json({ message: `PDF generation failed: ${pdf.message}` }, { status: 500 })
  }

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${hire.ref}-packing-slip.pdf"`,
    },
  })
}
