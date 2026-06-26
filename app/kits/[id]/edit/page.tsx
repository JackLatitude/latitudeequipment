import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getKit } from '@/lib/db/kits'
import { createClient } from '@/lib/supabase/server'
import { EditKitForm } from './_components/edit-kit-form'

type Props = { params: Promise<{ id: string }> }

export default async function EditKitPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const kit = await getKit(id)
  if (!kit) return notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href={`/kits/${id}`} className="text-sm text-brand-mid-grey hover:text-brand-black">
          ← Back
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-brand-black mb-6">Edit kit</h1>
      <EditKitForm kit={kit} />
    </div>
  )
}
