import Link from 'next/link'
import { getItems } from '@/lib/db/items'
import { getProfiles } from '@/lib/db/users'
import { getActiveHireItemsByItemIds } from '@/lib/db/hires'
import { ItemTableWrapper } from './_components/item-table-wrapper'

type Props = {
  searchParams: Promise<{ search?: string; holder?: string }>
}

export default async function EquipmentPage({ searchParams }: Props) {
  const { search, holder } = await searchParams

  const [items, profiles] = await Promise.all([
    getItems({ search, holderId: holder }),
    getProfiles(),
  ])
  const activeHireItems = await getActiveHireItemsByItemIds(items.map((i) => i.id))
  const onHireItemIds = activeHireItems.map((hi) => hi.item_id)

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-xl font-semibold text-white">Equipment</h1>
        <Link
          href="/equipment/new"
          className="bg-brand-black text-white text-sm font-medium px-4 py-2.5 rounded hover:opacity-80 text-center lg:py-2"
        >
          Add item
        </Link>
      </div>
      <ItemTableWrapper
        items={items}
        profiles={profiles}
        onHireItemIds={onHireItemIds}
        initialSearch={search ?? ''}
        initialHolder={holder ?? ''}
      />
    </div>
  )
}
