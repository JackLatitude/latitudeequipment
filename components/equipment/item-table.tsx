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
      {/* Filters — stack on mobile, row on desktop */}
      <div className="flex flex-col gap-2 mb-4 lg:flex-row lg:gap-3">
        <input
          type="search"
          placeholder="Search by name or serial…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${inputClass} w-full lg:w-72`}
        />
        <select
          value={holderId}
          onChange={(e) => onHolderChange(e.target.value)}
          className={`${inputClass} w-full lg:w-auto`}
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
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/equipment/${item.id}`}
                className="flex items-center justify-between bg-brand-dark-surface border border-brand-rule-grey rounded-lg px-4 py-3 active:opacity-70"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{item.name}</p>
                  <p className="text-sm text-brand-mid-grey mt-0.5">
                    {item.serial_number ? item.serial_number : '—'}
                    {item.kit?.name ? ` · ${item.kit.name}` : ''}
                  </p>
                  <p className="text-sm text-brand-mid-grey">
                    {item.current_holder?.display_name ?? 'Unassigned'}
                  </p>
                </div>
                <svg className="flex-shrink-0 ml-3 text-brand-mid-grey" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <table className="hidden lg:table w-full text-sm border-collapse">
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
        </>
      )}
    </div>
  )
}
