import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getClient } from '@/lib/db/clients'
import { getHiresByClient } from '@/lib/db/hires'
import { HireCard } from '../../_components/hire-card'
import { DeleteClientButton } from './_components/delete-client-button'

type Props = { params: Promise<{ id: string }> }

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const [client, hires] = await Promise.all([getClient(id), getHiresByClient(id)])
  if (!client) return notFound()

  const labelClass = 'text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-0.5'

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/hires/clients" className="text-sm text-brand-mid-grey hover:text-white">← Clients</Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">{client.name}</h1>
        <Link
          href={`/hires/clients/${client.id}/edit`}
          className="text-sm text-white border border-brand-rule-grey hover:border-white rounded px-3 py-1.5 transition-colors flex-shrink-0 ml-4"
        >
          Edit
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 mb-8">
        {client.contact_name && (
          <div>
            <dt className={labelClass}>Contact</dt>
            <dd className="text-sm font-medium text-white">{client.contact_name}</dd>
          </div>
        )}
        {client.email && (
          <div>
            <dt className={labelClass}>Email</dt>
            <dd className="text-sm font-medium text-white">{client.email}</dd>
          </div>
        )}
        {client.phone && (
          <div>
            <dt className={labelClass}>Phone</dt>
            <dd className="text-sm font-medium text-white">{client.phone}</dd>
          </div>
        )}
        {client.address && (
          <div className="col-span-2">
            <dt className={labelClass}>Address</dt>
            <dd className="text-sm text-white whitespace-pre-wrap">{client.address}</dd>
          </div>
        )}
        {client.notes && (
          <div className="col-span-2">
            <dt className={labelClass}>Notes</dt>
            <dd className="text-sm text-white whitespace-pre-wrap">{client.notes}</dd>
          </div>
        )}
      </dl>

      <div className="mb-10">
        <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-3">
          Hire history ({hires.length})
        </p>
        {hires.length === 0 ? (
          <p className="text-sm text-brand-mid-grey">No hires for this client yet.</p>
        ) : (
          <div className="grid gap-3">
            {hires.map((hire) => (
              <HireCard key={hire.id} hire={hire} />
            ))}
          </div>
        )}
      </div>

      <DeleteClientButton clientId={client.id} />
    </div>
  )
}
