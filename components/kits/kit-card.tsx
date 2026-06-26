import Link from 'next/link'
import type { Kit } from '@/lib/types'

type Props = { kit: Kit; itemCount: number }

export function KitCard({ kit, itemCount }: Props) {
  return (
    <Link
      href={`/kits/${kit.id}`}
      className="block border border-brand-rule-grey rounded-lg p-4 hover:border-brand-black transition-colors"
    >
      <h2 className="font-medium text-brand-black mb-1">{kit.name}</h2>
      {kit.description && (
        <p className="text-sm text-brand-mid-grey mb-3">{kit.description}</p>
      )}
      <div className="flex items-center justify-between text-sm text-brand-mid-grey">
        <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        <span>{kit.current_holder?.display_name}</span>
      </div>
    </Link>
  )
}
