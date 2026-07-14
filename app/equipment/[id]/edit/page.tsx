import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getItem } from '@/lib/db/items'
import { getKits } from '@/lib/db/kits'
import { createClient } from '@/lib/supabase/server'
import { EditItemForm } from './_components/edit-item-form'

type Props = { params: Promise<{ id: string }> }

export default async function EditItemPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const [item, kits] = await Promise.all([getItem(id), getKits()])
  if (!item) return notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/equipment/${id}`} className="text-sm text-brand-mid-grey hover:text-white">
          ← Back
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-white mb-6">Edit item</h1>
      <EditItemForm item={item} kits={kits} />
    </div>
  )
}
