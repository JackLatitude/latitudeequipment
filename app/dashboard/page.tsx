import Link from 'next/link'
import { getItems } from '@/lib/db/items'
import { getKits } from '@/lib/db/kits'
import { getHires } from '@/lib/db/hires'
import { getClients } from '@/lib/db/clients'
import { StatCard } from './_components/stat-card'
import { HireCard } from '../hires/_components/hire-card'

const labelClass = 'text-xs font-extralight uppercase tracking-wider text-brand-mid-grey'

export default async function DashboardPage() {
  const [items, kits, hires, clients] = await Promise.all([
    getItems(),
    getKits(),
    getHires(),
    getClients(),
  ])

  const activeHires = hires.filter((h) => h.status === 'active')
  const draftHires = hires.filter((h) => h.status === 'draft')
  const activeCount = activeHires.length
  const draftCount = draftHires.length
  const clientCount = clients.length

  // Items out right now = hire_items on active hires not yet checked back in.
  const onHire = activeHires.reduce(
    (n, h) => n + (h.hire_items?.filter((hi) => !hi.checked_in_at).length ?? 0),
    0
  )

  // Active hires due back within the next 7 days (includes any already overdue).
  const now = new Date()
  const in7 = new Date(now.getTime() + 7 * 86_400_000)
  const returningSoon = activeHires.filter(
    (h) => h.end_date && new Date(h.end_date) <= in7
  ).length

  const operational = activeCount > 0
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London',
  })

  const statusClauses = operational
    ? [
        `${onHire} ${onHire === 1 ? 'asset' : 'assets'} deployed`,
        `${activeCount} active ${activeCount === 1 ? 'job' : 'jobs'}`,
        ...(returningSoon > 0 ? [`${returningSoon} due back this week`] : []),
      ]
    : ['All equipment in store', 'no active hires']

  // Active hires first (soonest return date first, undated last), then drafts.
  const sortedActive = [...activeHires].sort((a, b) => {
    if (!a.end_date) return 1
    if (!b.end_date) return -1
    return a.end_date.localeCompare(b.end_date)
  })
  const focusHires = [...sortedActive, ...draftHires].slice(0, 6)

  return (
    <div>
      {/* Status readout hero */}
      <section className="mb-10">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <span className={labelClass}>{dateStr}</span>
        </div>
        <div className="border-t border-brand-rule-grey pt-4">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                operational ? 'bg-brand-red motion-safe:animate-pulse' : 'bg-brand-mid-grey'
              }`}
              aria-hidden="true"
            />
            <span className="text-xs font-extralight uppercase tracking-[0.25em] text-white">
              {operational ? 'Operational' : 'Standby'}
            </span>
          </div>
          <p className="mt-2 text-lg lg:text-xl font-extralight text-white/90">
            {statusClauses.join(' · ')}
          </p>
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <StatCard label="Equipment" value={items.length} sub={`${onHire} on hire`} href="/equipment" />
        <StatCard
          label="On hire now"
          value={onHire}
          accent={onHire > 0}
          sub={`across ${activeCount} active ${activeCount === 1 ? 'hire' : 'hires'}`}
          href="/hires"
        />
        <StatCard
          label="Active hires"
          value={activeCount}
          sub={draftCount > 0 ? `${draftCount} in draft` : 'none in draft'}
          href="/hires"
        />
        <StatCard
          label="Kits"
          value={kits.length}
          sub={`${clientCount} ${clientCount === 1 ? 'client' : 'clients'}`}
          href="/kits"
        />
      </section>

      {/* Hires + quick actions */}
      <div className="grid lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className={labelClass}>Active &amp; upcoming hires</p>
            <Link href="/hires" className="text-xs text-brand-mid-grey hover:text-white transition-colors">
              All hires →
            </Link>
          </div>
          {focusHires.length === 0 ? (
            <div className="border border-brand-rule-grey rounded-lg p-6 bg-brand-dark-surface text-center">
              <p className="text-sm text-brand-mid-grey mb-3">No active or draft hires right now.</p>
              <Link
                href="/hires/new"
                className="inline-block bg-brand-red text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90"
              >
                New hire
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {focusHires.map((h) => (
                <HireCard key={h.id} hire={h} />
              ))}
            </div>
          )}
        </section>

        <section>
          <p className={`${labelClass} mb-3`}>Quick actions</p>
          <div className="flex flex-col gap-2">
            <Link
              href="/hires/new"
              className="bg-brand-red text-white text-sm font-medium px-4 py-2.5 rounded hover:opacity-90 text-center"
            >
              New hire
            </Link>
            <Link
              href="/equipment/new"
              className="text-white text-sm border border-brand-rule-grey hover:border-white rounded px-4 py-2.5 text-center transition-colors"
            >
              Add equipment
            </Link>
            <Link
              href="/kits/new"
              className="text-white text-sm border border-brand-rule-grey hover:border-white rounded px-4 py-2.5 text-center transition-colors"
            >
              New kit
            </Link>
            <Link
              href="/hires/clients/new"
              className="text-white text-sm border border-brand-rule-grey hover:border-white rounded px-4 py-2.5 text-center transition-colors"
            >
              Add client
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
