import Link from 'next/link'
import { getItems } from '@/lib/db/items'
import { getProfiles } from '@/lib/db/users'
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-brand-black">Equipment</h1>
        <Link
          href="/equipment/new"
          className="bg-brand-black text-white text-sm font-medium px-4 py-2 rounded hover:opacity-80"
        >
          Add item
        </Link>
      </div>
      <ItemTableWrapper
        items={items}
        profiles={profiles}
        initialSearch={search ?? ''}
        initialHolder={holder ?? ''}
      />
    </div>
  )
}
