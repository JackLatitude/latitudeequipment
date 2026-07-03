import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getHire } from '@/lib/db/hires'
import { getItems } from '@/lib/db/items'
import { getKits } from '@/lib/db/kits'
import { HireActions } from './_components/hire-actions'
import { HireItemsList } from './_components/hire-items-list'
import { AddItemsPanel } from './_components/add-items-panel'

type Props = { params: Promise<{ id: string }> }

const STATUS_STYLES: Record<string, string> = {
  draft: 'text-brand-mid-grey bg-white/5 border-brand-rule-grey',
  active: 'text-brand-red bg-brand-red/10 border-brand-red/30',
  returned: 'text-brand-mid-grey/60 bg-transparent border-brand-rule-grey',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function HireDetailPage({ params }: Props) {
  const { id } = await params
  const hire = await getHire(id)
  if (!hire) return notFound()

  const isDraft = hire.status === 'draft'
  const hireItems = hire.hire_items ?? []

  const [items, kits] = isDraft
    ? await Promise.all([getItems(), getKits()])
    : [[], []]

  const dates = [formatDate(hire.start_date), formatDate(hire.end_date)].filter(Boolean).join(' – ')
  const labelClass = 'text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-0.5'

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/hires" className="text-sm text-brand-mid-grey hover:text-white">← Hires</Link>
      </div>

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-bold text-white">{hire.title}</h1>
        {isDraft && (
          <Link
            href={`/hires/${hire.id}/edit`}
            className="text-sm text-white border border-brand-rule-grey hover:border-white rounded px-3 py-1.5 transition-colors flex-shrink-0 ml-4"
          >
            Edit
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3 mb-8">
        <span className="text-sm text-brand-mid-grey">{hire.ref}</span>
        <span className={`text-xs border rounded-full px-2 py-0.5 capitalize ${STATUS_STYLES[hire.status]}`}>
          {hire.status}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mb-8">
        <div>
          <dt className={labelClass}>Client</dt>
          <dd className="text-sm font-medium text-white">
            {hire.client ? (
              <Link href={`/hires/clients/${hire.client.id}`} className="hover:underline">
                {hire.client.name}
              </Link>
            ) : '—'}
          </dd>
        </div>
        <div>
          <dt className={labelClass}>Dates</dt>
          <dd className="text-sm font-medium text-white">{dates || '—'}</dd>
        </div>
        {hire.client?.contact_name && (
          <div>
            <dt className={labelClass}>Contact</dt>
            <dd className="text-sm font-medium text-white">{hire.client.contact_name}</dd>
          </div>
        )}
        {hire.notes && (
          <div className="col-span-2">
            <dt className={labelClass}>Notes</dt>
            <dd className="text-sm text-white whitespace-pre-wrap">{hire.notes}</dd>
          </div>
        )}
      </dl>

      <div className="mb-8">
        <HireActions hireId={hire.id} status={hire.status} itemCount={hireItems.length} />
      </div>

      <div className="mb-8">
        <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-3">
          Items ({hireItems.length})
        </p>
        <HireItemsList hireId={hire.id} hireItems={hireItems} status={hire.status} />
      </div>

      {isDraft && (
        <div className="mb-8">
          <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-3">
            Add items
          </p>
          <AddItemsPanel
            hireId={hire.id}
            items={items}
            kits={kits}
            existingItemIds={hireItems.map((hi) => hi.item_id)}
          />
        </div>
      )}
    </div>
  )
}
