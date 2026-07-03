import Link from 'next/link'
import { getHires } from '@/lib/db/hires'
import { HireCard } from './_components/hire-card'
import type { Hire, HireStatus } from '@/lib/types'

const GROUP_ORDER: { status: HireStatus; label: string }[] = [
  { status: 'active', label: 'Active' },
  { status: 'draft', label: 'Draft' },
  { status: 'returned', label: 'Returned' },
]

export default async function HiresPage() {
  const hires = await getHires()
  const groups = GROUP_ORDER.map(({ status, label }) => ({
    label,
    hires: hires.filter((h: Hire) => h.status === status),
  })).filter((g) => g.hires.length > 0)

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold text-white">Hires</h1>
        <div className="flex gap-3">
          <Link
            href="/hires/clients"
            className="text-white text-sm border border-brand-rule-grey hover:border-white rounded px-4 py-2.5 text-center transition-colors lg:py-2"
          >
            Clients
          </Link>
          <Link
            href="/hires/new"
            className="bg-brand-red text-white text-sm font-medium px-4 py-2.5 rounded hover:opacity-90 text-center lg:py-2"
          >
            New hire
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-brand-mid-grey">
          No hires yet. Create one with the New hire button above.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-3">
                {group.label}
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                {group.hires.map((hire) => (
                  <HireCard key={hire.id} hire={hire} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
