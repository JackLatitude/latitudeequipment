import { getItems } from '@/lib/db/items'
import { getKits } from '@/lib/db/kits'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CarnetSelector } from './_components/carnet-selector'

export default async function CarnetPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const [items, kits] = await Promise.all([getItems(), getKits()])

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Carnet Export</h1>
        <p className="text-sm text-brand-mid-grey mt-1">
          Select the items you want to include, then export as a spreadsheet.
        </p>
      </div>
      <CarnetSelector items={items} kits={kits} />
    </div>
  )
}
