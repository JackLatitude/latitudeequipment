'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Item } from '@/lib/types'
import { itemDisplayName } from '@/lib/format'

type Props = {
  itemId: string
  pairedItem: Pick<Item, 'id' | 'name' | 'serial_number' | 'unit_number'> | null | undefined
  candidates: Pick<Item, 'id' | 'name' | 'serial_number' | 'unit_number'>[]
  onPair: (itemId: string, partnerId: string) => Promise<void>
  onUnpair: (itemId: string) => Promise<void>
}

export function PairControl({ itemId, pairedItem, candidates, onPair, onUnpair }: Props) {
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePair() {
    if (!selected) return
    setLoading(true)
    try {
      await onPair(itemId, selected)
    } finally {
      setLoading(false)
    }
  }

  async function handleUnpair() {
    setLoading(true)
    try {
      await onUnpair(itemId)
    } finally {
      setLoading(false)
    }
  }

  if (pairedItem) {
    return (
      <div className="flex items-center gap-3">
        <Link href={`/equipment/${pairedItem.id}`} className="text-sm text-white hover:underline">
          {itemDisplayName(pairedItem)}
        </Link>
        {pairedItem.serial_number && (
          <span className="text-sm text-brand-mid-grey">{pairedItem.serial_number}</span>
        )}
        <button
          onClick={handleUnpair}
          disabled={loading}
          className="text-xs text-brand-mid-grey hover:text-brand-red transition-colors disabled:opacity-50"
        >
          {loading ? '…' : 'Unpair'}
        </button>
      </div>
    )
  }

  if (candidates.length === 0) {
    return <p className="text-sm text-brand-mid-grey">No unpaired units available to pair with.</p>
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={loading}
        className="border border-brand-rule-grey rounded px-2 py-1 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
      >
        <option value="">Select a unit…</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {itemDisplayName(c)}{c.serial_number ? ` — ${c.serial_number}` : ''}
          </option>
        ))}
      </select>
      {selected && (
        <button
          onClick={handlePair}
          disabled={loading}
          className="text-xs bg-brand-black text-white px-2 py-1 rounded hover:opacity-80 disabled:opacity-50 border border-brand-rule-grey"
        >
          {loading ? '…' : 'Pair'}
        </button>
      )}
    </div>
  )
}
