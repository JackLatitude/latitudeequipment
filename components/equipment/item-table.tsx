'use client'

import Link from 'next/link'
import type { Item, Profile } from '@/lib/types'

type Props = {
  items: Item[]
  profiles: Profile[]
  search: string
  holderId: string
  onSearchChange: (v: string) => void
  onHolderChange: (v: string) => void
}

export function ItemTable({ items, profiles, search, holderId, onSearchChange, onHolderChange }: Props) {
  const inputClass = 'border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          type="search"
          placeholder="Search by name or serial…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${inputClass} w-72`}
        />
        <select
          value={holderId}
          onChange={(e) => onHolderChange(e.target.value)}
          className={inputClass}
        >
          <option value="">All holders</option>
          <option value="unassigned">Unassigned</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-brand-mid-grey">No equipment found.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-brand-rule-grey text-left text-brand-mid-grey">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Serial</th>
              <th className="pb-2 pr-4 font-medium">Kit</th>
              <th className="pb-2 font-medium">Holder</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-brand-rule-grey hover:bg-brand-dark-surface">
                <td className="py-2.5 pr-4">
                  <Link href={`/equipment/${item.id}`} className="font-medium text-white hover:underline">
                    {item.name}
                  </Link>
                </td>
                <td className="py-2.5 pr-4 text-brand-mid-grey">{item.serial_number ?? '—'}</td>
                <td className="py-2.5 pr-4 text-brand-mid-grey">{item.kit?.name ?? '—'}</td>
                <td className="py-2.5 text-brand-mid-grey">
                  {item.current_holder?.display_name ?? 'Unassigned'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
