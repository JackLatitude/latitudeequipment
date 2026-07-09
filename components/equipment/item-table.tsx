'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Item, Profile } from '@/lib/types'
import { ITEM_OWNERS } from '@/lib/constants'

type Props = {
  items: Item[]
  profiles: Profile[]
  onHireItemIds: string[]
  search: string
  holderId: string
  onSearchChange: (v: string) => void
  onHolderChange: (v: string) => void
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function groupByCategory(items: Item[]): [string, Item[]][] {
  const map = new Map<string, Item[]>()
  for (const item of items) {
    const key = item.category?.trim() || 'Uncategorised'
    const existing = map.get(key)
    if (existing) existing.push(item)
    else map.set(key, [item])
  }
  const entries = Array.from(map.entries())
  // Sort: named categories alphabetically, Uncategorised always last
  return entries.sort(([a], [b]) => {
    if (a === 'Uncategorised') return 1
    if (b === 'Uncategorised') return -1
    return a.localeCompare(b)
  })
}

export function ItemTable({ items, profiles, onHireItemIds, search, holderId, onSearchChange, onHolderChange }: Props) {
  const inputClass = 'border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

  const onHire = new Set(onHireItemIds)
  const groups = groupByCategory(items)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  function toggle(category: string) {
    setCollapsed(prev => ({ ...prev, [category]: !prev[category] }))
  }

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
        <p className="text-sm text-brand-mid-grey">No equipment matches your filters. Try clearing the search or selecting a different holder.</p>
      ) : (
        <div className="space-y-4">
          {groups.map(([category, groupItems]) => {
            const isCollapsed = collapsed[category] ?? false
            return (
              <div key={category}>
                {/* Category header */}
                <button
                  type="button"
                  onClick={() => toggle(category)}
                  className="flex items-center gap-2 w-full text-left mb-2 group"
                >
                  <span className="text-xs font-medium uppercase tracking-wider text-brand-mid-grey group-hover:text-white transition-colors">
                    {category}
                  </span>
                  <span className="text-xs text-brand-mid-grey/50 group-hover:text-brand-mid-grey transition-colors">
                    {groupItems.length}
                  </span>
                  <span className="ml-auto text-brand-mid-grey/50 group-hover:text-brand-mid-grey transition-colors">
                    {isCollapsed ? <ChevronRight /> : <ChevronDown />}
                  </span>
                </button>

                {!isCollapsed && (
                  <>
                    {/* Mobile cards */}
                    <div className="lg:hidden space-y-2">
                      {groupItems.map((item) => (
                        <Link
                          key={item.id}
                          href={`/equipment/${item.id}`}
                          className="flex items-center justify-between bg-brand-dark-surface border border-brand-rule-grey rounded-lg px-4 py-3 active:opacity-70"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center min-w-0">
                              <p className="font-medium text-white truncate">{item.name}</p>
                              {onHire.has(item.id) && (
                                <span className="text-[10px] text-brand-red bg-brand-red/10 border border-brand-red/30 rounded-full px-1.5 py-0.5 ml-2 whitespace-nowrap flex-shrink-0">
                                  On hire
                                </span>
                              )}
                              {item.owner !== ITEM_OWNERS[0] && (
                                <span className="text-[10px] text-brand-mid-grey bg-white/5 border border-brand-rule-grey rounded-full px-1.5 py-0.5 ml-2 whitespace-nowrap flex-shrink-0">
                                  {item.owner}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-brand-mid-grey mt-0.5">
                              {item.serial_number ? item.serial_number : '—'}
                              {item.kit?.name ? ` · ${item.kit.name}` : ''}
                            </p>
                            <p className="text-sm text-brand-mid-grey">
                              {item.current_holder?.display_name ?? 'Unassigned'}
                            </p>
                          </div>
                          <span className="flex-shrink-0 ml-3 text-brand-mid-grey">
                            <ChevronRight />
                          </span>
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
                        {groupItems.map((item) => (
                          <tr key={item.id} className="border-b border-brand-rule-grey hover:bg-brand-dark-surface">
                            <td className="py-2.5 pr-4">
                              <Link href={`/equipment/${item.id}`} className="font-medium text-white hover:underline">
                                {item.name}
                              </Link>
                              {onHire.has(item.id) && (
                                <span className="text-[10px] text-brand-red bg-brand-red/10 border border-brand-red/30 rounded-full px-1.5 py-0.5 ml-2 align-middle whitespace-nowrap">
                                  On hire
                                </span>
                              )}
                              {item.owner !== ITEM_OWNERS[0] && (
                                <span className="text-[10px] text-brand-mid-grey bg-white/5 border border-brand-rule-grey rounded-full px-1.5 py-0.5 ml-2 align-middle whitespace-nowrap">
                                  {item.owner}
                                </span>
                              )}
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
          })}
        </div>
      )}
    </div>
  )
}
