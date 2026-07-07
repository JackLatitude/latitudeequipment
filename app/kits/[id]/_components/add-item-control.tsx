'use client'

import { useState } from 'react'
import type { Item } from '@/lib/types'

type Props = {
  looseItems: Item[]
  onAdd: (itemIds: string[]) => Promise<void>
}

const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

export function AddItemControl({ looseItems, onAdd }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  if (looseItems.length === 0) return null

  const q = search.trim().toLowerCase()
  const filtered = q
    ? looseItems.filter(
        (i) => i.name.toLowerCase().includes(q) || i.serial_number?.toLowerCase().includes(q)
      )
    : looseItems

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAdd() {
    if (selected.size === 0) return
    setLoading(true)
    try {
      await onAdd([...selected])
      setSelected(new Set())
      setSearch('')
    } finally {
      setLoading(false)
    }
  }

  const label = loading
    ? 'Adding…'
    : selected.size === 0
      ? 'Add to kit'
      : `Add ${selected.size} ${selected.size === 1 ? 'item' : 'items'}`

  return (
    <div>
      {looseItems.length > 6 && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search loose items…"
          className={`${inputClass} mb-2`}
          autoComplete="off"
        />
      )}
      <ul className="max-h-56 overflow-auto border border-brand-rule-grey rounded-lg divide-y divide-brand-rule-grey bg-brand-dark-surface">
        {filtered.map((item) => (
          <li key={item.id}>
            <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors">
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
                className="w-4 h-4 flex-shrink-0 accent-brand-red"
              />
              <span className="min-w-0">
                <span className="text-sm text-white block truncate">{item.name}</span>
                {item.serial_number && (
                  <span className="text-xs text-brand-mid-grey">{item.serial_number}</span>
                )}
              </span>
            </label>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-3 py-2 text-sm text-brand-mid-grey">No matching loose items.</li>
        )}
      </ul>
      <button
        onClick={handleAdd}
        disabled={loading || selected.size === 0}
        className="mt-2 text-sm font-medium bg-brand-red text-white px-4 py-2 rounded hover:opacity-90 disabled:opacity-40"
      >
        {label}
      </button>
    </div>
  )
}
