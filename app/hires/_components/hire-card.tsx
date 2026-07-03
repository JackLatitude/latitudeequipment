import Link from 'next/link'
import type { Hire } from '@/lib/types'

const STATUS_STYLES: Record<string, string> = {
  draft: 'text-brand-mid-grey bg-white/5 border-brand-rule-grey',
  active: 'text-brand-red bg-brand-red/10 border-brand-red/30',
  returned: 'text-brand-mid-grey/60 bg-transparent border-brand-rule-grey',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function HireCard({ hire }: { hire: Hire }) {
  const itemCount = hire.hire_items?.length ?? 0
  const dates = [formatDate(hire.start_date), formatDate(hire.end_date)].filter(Boolean).join(' – ')
  return (
    <Link
      href={`/hires/${hire.id}`}
      className="block border border-brand-rule-grey rounded-lg p-4 hover:border-white transition-colors bg-brand-dark-surface"
    >
      <div className="flex items-start justify-between mb-1">
        <h2 className="font-medium text-white">{hire.title}</h2>
        <span className={`text-xs border rounded-full px-2 py-0.5 ml-3 flex-shrink-0 capitalize ${STATUS_STYLES[hire.status]}`}>
          {hire.status}
        </span>
      </div>
      <p className="text-sm text-brand-mid-grey">
        {hire.ref}{hire.client ? ` · ${hire.client.name}` : ''}
      </p>
      <p className="text-xs text-brand-mid-grey/60 mt-2">
        {dates ? `${dates} · ` : ''}{itemCount} {itemCount === 1 ? 'item' : 'items'}
      </p>
    </Link>
  )
}
