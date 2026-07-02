import Link from 'next/link'
import type { Kit } from '@/lib/types'

type Props = { kit: Kit; itemCount: number }

export function KitCard({ kit, itemCount }: Props) {
  const holder = kit.current_holder?.display_name
  return (
    <Link
      href={`/kits/${kit.id}`}
      className="block border border-brand-rule-grey rounded-lg p-4 hover:border-white transition-colors bg-brand-dark-surface"
    >
      <div className="flex items-start justify-between mb-1">
        <h2 className="font-medium text-white">{kit.name}</h2>
        {holder ? (
          <span className="text-xs text-brand-mid-grey bg-white/5 border border-brand-rule-grey rounded-full px-2 py-0.5 ml-3 flex-shrink-0">
            {holder}
          </span>
        ) : (
          <span className="text-xs text-brand-red bg-brand-red/10 border border-brand-red/30 rounded-full px-2 py-0.5 ml-3 flex-shrink-0">
            Unassigned
          </span>
        )}
      </div>
      {kit.description && (
        <p className="text-sm text-brand-mid-grey mb-2">{kit.description}</p>
      )}
      <p className="text-xs text-brand-mid-grey/60 mt-2">
        {itemCount} {itemCount === 1 ? 'item' : 'items'}
      </p>
    </Link>
  )
}
