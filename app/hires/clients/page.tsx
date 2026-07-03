import Link from 'next/link'
import { getClients } from '@/lib/db/clients'

export default async function ClientsPage() {
  const clients = await getClients()
  return (
    <div>
      <div className="mb-6">
        <Link href="/hires" className="text-sm text-brand-mid-grey hover:text-white">← Hires</Link>
      </div>
      <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold text-white">Clients</h1>
        <Link
          href="/hires/clients/new"
          className="bg-brand-red text-white text-sm font-medium px-4 py-2.5 rounded hover:opacity-90 text-center lg:py-2"
        >
          Add client
        </Link>
      </div>
      {clients.length === 0 ? (
        <p className="text-sm text-brand-mid-grey">
          No clients yet. Add one with the button above.
        </p>
      ) : (
        <ul className="divide-y divide-brand-rule-grey border border-brand-rule-grey rounded-lg bg-brand-dark-surface">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/hires/clients/${client.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{client.name}</p>
                  <p className="text-xs text-brand-mid-grey truncate">
                    {[client.contact_name, client.email].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
