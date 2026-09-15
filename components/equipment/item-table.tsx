'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Item, Profile } from '@/lib/types'
import { ITEM_CATEGORIES, ITEM_OWNERS } from '@/lib/constants'
import { itemDisplayName } from '@/lib/format'

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

function SortIcon({ dir }: { dir: SortDir }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={dir === 'desc' ? 'rotate-180' : undefined}>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  )
}

export type SortField = 'name' | 'serial_number' | 'kit' | 'holder' | 'created_at'
export type SortDir = 'asc' | 'desc'

const SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'serial_number', label: 'Serial number' },
  { value: 'kit', label: 'Kit' },
  { value: 'holder', label: 'Holder' },
  { value: 'created_at', label: 'Date added' },
]

function sortKey(item: Item, field: SortField): string | null {
  switch (field) {
    case 'name': return item.name
    case 'serial_number': return item.serial_number
    case 'kit': return item.kit?.name ?? null
    case 'holder': return item.current_holder?.display_name ?? null
    case 'created_at': return item.created_at
  }
}

// Tiebreak for rows the chosen field can't separate — most often several
// units of the same model, which would otherwise land in whatever order the
// database happened to return. Falls back to name, then unit number compared
// numerically, so #2 sorts before #10 rather than after it.
function tiebreak(a: Item, b: Item, sign: number): number {
  const byName = a.name.localeCompare(b.name)
  if (byName !== 0) return byName * sign
  const na = a.unit_number
  const nb = b.unit_number
  // Unnumbered units sort last either way, matching the rule for the primary key.
  if (na == null && nb == null) return 0
  if (na == null) return 1
  if (nb == null) return -1
  return (na - nb) * sign
}

export function sortItems(items: Item[], field: SortField, dir: SortDir): Item[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const ka = sortKey(a, field)
    const kb = sortKey(b, field)
    // Nulls (no serial/kit/holder) always sort last, regardless of direction.
    if (ka === null && kb !== null) return 1
    if (kb === null && ka !== null) return -1
    if (ka !== null && kb !== null) {
      const primary = ka.localeCompare(kb) * sign
      if (primary !== 0) return primary
    }
    return tiebreak(a, b, sign)
  })
}

const CATEGORY_RANK = new Map<string, number>(ITEM_CATEGORIES.map((c, i) => [c, i]))

function groupByCategory(items: Item[]): [string, Item[]][] {
  const map = new Map<string, Item[]>()
  for (const item of items) {
    const key = item.category?.trim() || 'Uncategorised'
    const existing = map.get(key)
    if (existing) existing.push(item)
    else map.set(key, [item])
  }
  const entries = Array.from(map.entries())
  // Sort: known categories in ITEM_CATEGORIES order, then any unrecognised
  // category alphabetically, then Uncategorised always last.
  return entries.sort(([a], [b]) => {
    if (a === 'Uncategorised') return 1
    if (b === 'Uncategorised') return -1
    const rankA = CATEGORY_RANK.get(a) ?? Infinity
    const rankB = CATEGORY_RANK.get(b) ?? Infinity
    if (rankA !== rankB) return rankA - rankB
    return a.localeCompare(b)
  })
}

export function ItemTable({ items, profiles, onHireItemIds, search, holderId, onSearchChange, onHolderChange }: Props) {
  const inputClass = 'border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

  const onHire = new Set(onHireItemIds)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const groups = groupByCategory(items)

  // Sections start collapsed, but a search/holder filter expands them — otherwise
  // filtering would leave the page looking empty, with only headers showing.
  // An explicit toggle overrides the default either way.
  const filtersActive = search.trim() !== '' || holderId !== ''
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const defaultCollapsed = !filtersActive

  function toggle(category: string) {
    setOverrides(prev => ({
      ...prev,
      [category]: !(prev[category] ?? defaultCollapsed),
    }))
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
        <div className="flex gap-2">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className={`${inputClass} flex-1 lg:flex-none lg:w-auto`}
            aria-label="Sort by"
          >
            {SORT_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>Sort: {f.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            className={`${inputClass} px-3 flex items-center justify-center`}
            aria-label={sortDir === 'asc' ? 'Sort ascending' : 'Sort descending'}
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            <SortIcon dir={sortDir} />
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-brand-mid-grey">No equipment matches your filters. Try clearing the search or selecting a different holder.</p>
      ) : (
        <div className="space-y-4">
          {groups.map(([category, rawGroupItems]) => {
            const groupItems = sortItems(rawGroupItems, sortField, sortDir)
            const isCollapsed = overrides[category] ?? defaultCollapsed
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
                              <p className="font-medium text-white truncate">{itemDisplayName(item)}</p>
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
                                {itemDisplayName(item)}
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
                            <td className="py-2.5 pr-4 text-brand-mid-grey">
                              {item.kit_id && item.kit ? (
                                <Link href={`/kits/${item.kit_id}`} className="hover:text-white hover:underline">
                                  {item.kit.name}
                                </Link>
                              ) : (
                                '—'
                              )}
                            </td>
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
