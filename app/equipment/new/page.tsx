import Link from 'next/link'
import { getItemTemplates, getItem } from '@/lib/db/items'
import { getKits } from '@/lib/db/kits'
import { NewItemForm } from './_components/new-item-form'
import type { ItemTemplate } from '@/lib/types'

type Props = { searchParams: Promise<{ serial?: string; from?: string; kit?: string }> }

export default async function NewItemPage({ searchParams }: Props) {
  const { serial, from, kit } = await searchParams
  const [templates, kits] = await Promise.all([getItemTemplates(), getKits()])

  let initialTemplate: ItemTemplate | null = null
  if (from) {
    const item = await getItem(from)
    if (item) {
      initialTemplate = {
        id: item.id,
        name: item.name,
        category: item.category,
        value: item.value,
        country_of_origin: item.country_of_origin,
        weight_kg: item.weight_kg,
        notes: item.notes,
      }
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/equipment" className="text-sm text-brand-mid-grey hover:text-white">← Equipment</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Add item</h1>
      <NewItemForm
        templates={templates}
        kits={kits}
        initialSerial={serial ?? ''}
        initialTemplate={initialTemplate}
        initialKitId={kit ?? ''}
      />
    </div>
  )
}
