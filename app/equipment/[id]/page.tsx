import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getItem, deleteItem } from '@/lib/db/items'
import { getProfiles } from '@/lib/db/users'
import { getItemHistory, assignItem } from '@/lib/db/assignments'
import { getActiveHireItemsByItemIds } from '@/lib/db/hires'
import { createClient } from '@/lib/supabase/server'
import { AssignControl } from '@/components/equipment/assign-control'
import { revalidatePath } from 'next/cache'
import { DeleteItemButton } from './_components/delete-button'

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

  const [activeHireItem] = await getActiveHireItemsByItemIds([item.id])

  async function handleAssign(itemId: string, assignedToId: string | null) {
    'use server'
    await assignItem(itemId, assignedToId, user!.id)
    revalidatePath(`/equipment/${itemId}`)
    revalidatePath('/equipment')
  }

  async function handleDelete(itemId: string) {
    'use server'
    await deleteItem(itemId)
    redirect('/equipment')
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/equipment" className="text-sm text-brand-mid-grey hover:text-white">
          ← Equipment
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{item.name}</h1>
        <div className="flex gap-2 flex-shrink-0 ml-4">
          <Link
            href={`/equipment/new?from=${item.id}`}
            className="text-sm text-white border border-brand-rule-grey hover:border-white rounded px-3 py-1.5 transition-colors whitespace-nowrap"
          >
            Add another
          </Link>
          <Link
            href={`/equipment/${item.id}/edit`}
            className="text-sm text-white border border-brand-rule-grey hover:border-white rounded px-3 py-1.5 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      {activeHireItem?.hire && (
        <p className="text-sm mb-4">
          <span className="text-brand-red font-medium">On hire</span>
          <span className="text-brand-mid-grey"> — </span>
          <Link href={`/hires/${activeHireItem.hire_id}`} className="text-white hover:underline">
            {activeHireItem.hire.title} · {activeHireItem.hire.ref}
          </Link>
        </p>
      )}

      {/* Current holder — shown first, most actionable field */}
      <div className="mb-8">
        <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-2">Current holder</p>
        <AssignControl
          itemId={item.id}
          currentHolderId={item.current_holder_id}
          kitId={item.kit_id}
          profiles={profiles}
          currentUserId={user.id}
          onAssign={handleAssign}
        />
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 mb-8">
        {[
          ['Serial number', item.serial_number ?? '—'],
          ['Category', item.category ?? '—'],
          ['Kit', item.kit?.name ?? '—'],
          ['Value', item.value != null ? `£${item.value.toLocaleString()}` : '—'],
          ['Country of origin', item.country_of_origin ?? '—'],
          ['Weight', item.weight_kg != null ? `${item.weight_kg} kg` : '—'],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-0.5">{label}</dt>
            <dd className="text-sm font-medium text-white">{value}</dd>
          </div>
        ))}
      </dl>

      {item.notes && (
        <div className="mb-8">
          <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-1">Notes</p>
          <p className="text-sm text-brand-mid-grey">{item.notes}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-3">Assignment history</p>
        {history.length === 0 ? (
          <p className="text-sm text-brand-mid-grey">No assignments recorded yet. Use the holder control above to assign this item.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="text-sm text-brand-mid-grey">
                <span className="font-medium text-white">
                  {h.assigned_to?.display_name ?? 'Unassigned'}
                </span>
                {' '}— assigned by {h.assigned_by?.display_name}{' '}
                <span className="text-brand-mid-grey/60">
                  {new Date(h.assigned_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-brand-rule-grey">
        <DeleteItemButton itemId={item.id} onDelete={handleDelete} />
      </div>
    </div>
  )
}
