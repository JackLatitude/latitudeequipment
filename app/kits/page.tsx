import Link from 'next/link'
import { getKits } from '@/lib/db/kits'
import { getItems } from '@/lib/db/items'
import { KitCard } from '@/components/kits/kit-card'

export default async function KitsPage() {
  const [kits, allItems] = await Promise.all([
    getKits(),
    getItems(),
  ])

  const itemCountByKit = allItems.reduce<Record<string, number>>((acc, item) => {
    if (item.kit_id) acc[item.kit_id] = (acc[item.kit_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Kits</h1>
        <Link
          href="/kits/new"
          className="bg-brand-black text-brand-white text-sm font-medium px-4 py-2 rounded hover:bg-brand-red transition-colors"
        >
          Add kit
        </Link>
      </div>

      {kits.length === 0 ? (
        <p className="text-sm text-brand-mid-grey">No kits yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kits.map((kit) => (
            <KitCard key={kit.id} kit={kit} itemCount={itemCountByKit[kit.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  )
}
