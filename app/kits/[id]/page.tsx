import { notFound } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { getKit } from '@/lib/db/kits'
import { getItems } from '@/lib/db/items'
import { getProfiles } from '@/lib/db/users'
import { assignKit, assignItem } from '@/lib/db/assignments'
import { createClient } from '@/lib/supabase/server'
import { KitAssignControl } from '@/components/kits/kit-assign-control'
import { AssignControl } from '@/components/equipment/assign-control'

type Props = { params: Promise<{ id: string }> }

export default async function KitDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const [kit, allItems, profiles] = await Promise.all([
    getKit(id),
    getItems(),
    getProfiles(),
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

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/kits" className="text-sm text-brand-mid-grey hover:text-brand-black">
          ← Kits
        </Link>
      </div>

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-xl font-semibold text-brand-black">{kit.name}</h1>
        <Link
          href={`/kits/${kit.id}/edit`}
          className="text-sm text-brand-mid-grey border border-brand-rule-grey rounded px-3 py-1.5 hover:text-brand-black"
        >
          Edit
        </Link>
      </div>

      {kit.description && (
        <p className="text-sm text-brand-mid-grey mb-6">{kit.description}</p>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-medium text-brand-black mb-2">Kit holder</h2>
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
        <h2 className="text-sm font-medium text-brand-black mb-3">
          Items ({kitItems.length})
        </h2>
        {kitItems.length === 0 ? (
          <p className="text-sm text-brand-mid-grey">No items in this kit.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
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
                    <Link href={`/equipment/${item.id}`} className="font-medium text-brand-black hover:underline">
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
        )}
      </div>
    </div>
  )
}
