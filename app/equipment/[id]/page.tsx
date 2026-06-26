import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getItem } from '@/lib/db/items'
import { getProfiles } from '@/lib/db/users'
import { getItemHistory, assignItem } from '@/lib/db/assignments'
import { createClient } from '@/lib/supabase/server'
import { AssignControl } from '@/components/equipment/assign-control'
import { revalidatePath } from 'next/cache'

type Props = { params: Promise<{ id: string }> }

export default async function ItemDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const [item, profiles, history] = await Promise.all([
    getItem(id),
    getProfiles(),
    getItemHistory(id),
  ])

  if (!item) return notFound()

  async function handleAssign(itemId: string, assignedToId: string | null) {
    'use server'
    await assignItem(itemId, assignedToId, user!.id)
    revalidatePath(`/equipment/${itemId}`)
    revalidatePath('/equipment')
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/equipment" className="text-sm text-gray-500 hover:text-gray-900">
          ← Equipment
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">{item.name}</h1>
        <Link
          href={`/equipment/${item.id}/edit`}
          className="text-sm text-gray-500 hover:text-gray-900 border border-gray-300 rounded px-3 py-1.5"
        >
          Edit
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mb-8 text-sm">
        {[
          ['Serial number', item.serial_number ?? '—'],
          ['Category', item.category ?? '—'],
          ['Kit', item.kit?.name ?? '—'],
          ['Value', item.value != null ? `£${item.value}` : '—'],
          ['Country of origin', item.country_of_origin ?? '—'],
          ['Weight', item.weight_kg != null ? `${item.weight_kg} kg` : '—'],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-900 mb-2">Current holder</h2>
        <AssignControl
          itemId={item.id}
          currentHolderId={item.current_holder_id}
          kitId={item.kit_id}
          profiles={profiles}
          currentUserId={user.id}
          onAssign={handleAssign}
        />
      </div>

      {item.notes && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-900 mb-1">Notes</h2>
          <p className="text-sm text-gray-600">{item.notes}</p>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-gray-900 mb-3">Assignment history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No history yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">
                  {h.assigned_to?.display_name ?? 'Unassigned'}
                </span>
                {' '}— assigned by {h.assigned_by?.display_name}{' '}
                <span className="text-gray-400">
                  {new Date(h.assigned_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
