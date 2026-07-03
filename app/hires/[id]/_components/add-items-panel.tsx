'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Item, Kit } from '@/lib/types'

type Props = {
  hireId: string
  items: Item[]         // all non-deleted items
  kits: Kit[]           // all kits
  existingItemIds: string[]
}

export function AddItemsPanel({ hireId, items, kits, existingItemIds }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existing = useMemo(() => new Set(existingItemIds), [existingItemIds])

  const q = search.trim().toLowerCase()
  const matchedItems = q
    ? items.filter(
        (i) =>
          !existing.has(i.id) &&
          (i.name.toLowerCase().includes(q) || i.serial_number?.toLowerCase().includes(q))
      ).slice(0, 10)
    : []
  const matchedKits = q
    ? kits.filter((k) => k.name.toLowerCase().includes(q)).slice(0, 5)
    : []

  async function add(itemIds: string[]) {
    if (itemIds.length === 0) return
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/hires/${hireId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemIds }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      setError(body.message)
    } else {
      setSearch('')
    }
    router.refresh()
    setBusy(false)
  }

  function addKit(kitId: string) {
    const kitItemIds = items.filter((i) => i.kit_id === kitId && !existing.has(i.id)).map((i) => i.id)
    if (kitItemIds.length === 0) {
      setError('All items in this kit are already on the hire (or the kit is empty)')
      return
    }
    add(kitItemIds)
  }

  const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search items or kits to add…"
        className={inputClass}
      />
      {error && <p className="text-sm text-brand-red mt-2">{error}</p>}
      {q && (matchedKits.length > 0 || matchedItems.length > 0) && (
        <ul className="mt-2 divide-y divide-brand-rule-grey border border-brand-rule-grey rounded-lg bg-brand-dark-surface">
          {matchedKits.map((kit) => (
            <li key={kit.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{kit.name}</p>
                <p className="text-xs text-brand-mid-grey">Kit — adds all items</p>
              </div>
              <button
                onClick={() => addKit(kit.id)}
                disabled={busy}
                className="text-xs text-white border border-brand-rule-grey hover:border-white rounded px-3 py-1.5 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                Add kit
              </button>
            </li>
          ))}
          {matchedItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{item.name}</p>
                <p className="text-xs text-brand-mid-grey truncate">
                  {[item.serial_number, item.category].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <button
                onClick={() => add([item.id])}
                disabled={busy}
                className="text-xs text-white border border-brand-rule-grey hover:border-white rounded px-3 py-1.5 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
      {q && matchedKits.length === 0 && matchedItems.length === 0 && (
        <p className="text-sm text-brand-mid-grey mt-2">No matching items or kits.</p>
      )}
    </div>
  )
}
