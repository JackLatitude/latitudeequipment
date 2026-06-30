'use client'

import { useState } from 'react'
import type { Item } from '@/lib/types'

type Props = {
  kitId: string
  looseItems: Item[]
  onAdd: (itemId: string) => Promise<void>
}

export function AddItemControl({ looseItems, onAdd }: Props) {
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)

  if (looseItems.length === 0) return null

  async function handleAdd() {
    if (!selected) return
    setLoading(true)
    try {
      await onAdd(selected)
      setSelected('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={loading}
        className="border border-brand-rule-grey rounded px-2 py-1.5 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red flex-1 max-w-xs"
      >
        <option value="">Select a loose item…</option>
        {looseItems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}{item.serial_number ? ` (${item.serial_number})` : ''}
          </option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        disabled={loading || !selected}
        className="text-sm font-medium bg-brand-black text-white px-3 py-1.5 rounded border border-brand-rule-grey hover:opacity-80 disabled:opacity-40"
      >
        {loading ? 'Adding…' : 'Add to kit'}
      </button>
    </div>
  )
}
