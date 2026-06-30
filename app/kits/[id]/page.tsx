import { notFound } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { getKit } from '@/lib/db/kits'
import { getItems, getLooseItems } from '@/lib/db/items'
import { getProfiles } from '@/lib/db/users'
import { assignKit, assignItem } from '@/lib/db/assignments'
import { createClient } from '@/lib/supabase/server'
import { KitAssignControl } from '@/components/kits/kit-assign-control'
import { AssignControl } from '@/components/equipment/assign-control'
import { KitActions } from './_components/kit-actions'
import { AddItemControl } from './_components/add-item-control'

type Props = { params: Promise<{ id: string }> }

export default async function KitDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const [kit, allItems, profiles, looseItems] = await Promise.all([
    getKit(id),
    getItems(),
    getProfiles(),
    getLooseItems(),
  ])

  if (!kit) return notFound()
  const kitItems = allItems.filter((item) => item.kit_id === kit.id)

  async function handleAssignKit(kitId: string, assignedToId: string) {
    'use server'
    await assignKit(kitId, assignedToId, user!.id)
    revalidatePath(`/kits/${kitId}`)
    revalidatePath('/kits')
    revalidatePath('/equipment')
  }

  async function handleAssignItem(itemId: string, assignedToId: string | null) {
    'use server'
    await assignItem(itemId, assignedToId, user!.id)
    revalidatePath(`/kits/${id}`)
    revalidatePath('/equipment')
  }

  async function handleAddItem(itemId: string) {
    'use server'
    await assignItem(itemId, kit!.current_holder_id, user!.id, `Added to kit: ${kit!.name}`)
    // Update kit_id on the item via direct DB update
    const { createClient: makeClient } = await import('@/lib/supabase/server')
    const db = await makeClient()
    const { error } = await db.from('items').update({ kit_id: kit!.id }).eq('id', itemId)
    if (error) throw new Error(error.message)
    revalidatePath(`/kits/${id}`)
    revalidatePath('/equipment')
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/kits" className="text-sm text-brand-mid-grey hover:text-white">
          ← Kits
        </Link>
      </div>

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-xl font-semibold text-white">{kit.name}</h1>
        <Link
          href={`/kits/${kit.id}/edit`}
          className="text-sm text-brand-mid-grey border border-brand-rule-grey rounded px-3 py-1.5 hover:text-white"
        >
          Edit
        </Link>
      </div>

      {kit.description && (
        <p className="text-sm text-brand-mid-grey mb-6">{kit.description}</p>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-medium text-white mb-2">Kit holder</h2>
        <KitAssignControl
          kitId={kit.id}
          currentHolderId={kit.current_holder_id}
          profiles={profiles}
          currentUserId={user.id}
          onAssign={handleAssignKit}
        />
        <p className="text-xs text-brand-mid-grey mt-1">
          Assigning the kit reassigns all items within it.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium text-white mb-3">
          Items ({kitItems.length})
        </h2>

        {looseItems.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-brand-mid-grey mb-2">Add a loose item to this kit:</p>
            <AddItemControl kitId={kit.id} looseItems={looseItems} onAdd={handleAddItem} />
          </div>
        )}

        {kitItems.length === 0 ? (
          <p className="text-sm text-brand-mid-grey">No items in this kit.</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="lg:hidden space-y-2">
              {kitItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/equipment/${item.id}`}
                  className="flex items-center justify-between bg-brand-dark-surface border border-brand-rule-grey rounded-lg px-4 py-3 active:opacity-70"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{item.name}</p>
                    <p className="text-sm text-brand-mid-grey mt-0.5">
                      {item.serial_number ? item.serial_number : '—'}
                    </p>
                  </div>
                  <svg className="flex-shrink-0 ml-3 text-brand-mid-grey" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <table className="hidden lg:table w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-brand-rule-grey text-left text-brand-mid-grey">
                  <th className="pb-2 pr-4 font-medium">Name</th>
                  <th className="pb-2 pr-4 font-medium">Serial</th>
                  <th className="pb-2 font-medium">Holder</th>
                </tr>
              </thead>
              <tbody>
                {kitItems.map((item) => (
                  <tr key={item.id} className="border-b border-brand-rule-grey">
                    <td className="py-2.5 pr-4">
                      <Link href={`/equipment/${item.id}`} className="font-medium text-white hover:underline">
                        {item.name}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-brand-mid-grey">{item.serial_number ?? '—'}</td>
                    <td className="py-2.5">
                      <AssignControl
                        itemId={item.id}
                        currentHolderId={item.current_holder_id}
                        kitId={item.kit_id}
                        profiles={profiles}
                        currentUserId={user.id}
                        onAssign={handleAssignItem}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div className="mt-8">
        <KitActions kitId={kit.id} />
      </div>
    </div>
  )
}
