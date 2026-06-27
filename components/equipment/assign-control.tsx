'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/types'

type Props = {
  itemId: string
  currentHolderId: string | null
  kitId: string | null
  profiles: Profile[]
  currentUserId: string
  onAssign: (itemId: string, assignedToId: string | null) => Promise<void>
}

export function AssignControl({ itemId, currentHolderId, kitId, profiles, currentUserId, onAssign }: Props) {
  const [selected, setSelected] = useState(currentHolderId ?? '')
  const [loading, setLoading] = useState(false)

  async function handleAssign() {
    setLoading(true)
    try {
      await onAssign(itemId, selected || null)
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
        className="border border-brand-rule-grey rounded px-2 py-1 text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
      >
        {kitId === null && <option value="">Unassigned</option>}
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>{p.display_name}</option>
        ))}
      </select>
      {selected !== (currentHolderId ?? '') && (
        <button
          onClick={handleAssign}
          disabled={loading}
          className="text-xs bg-brand-black text-white px-2 py-1 rounded hover:opacity-80 disabled:opacity-50 border border-brand-rule-grey"
        >
          {loading ? '…' : 'Save'}
        </button>
      )}
      {currentHolderId !== currentUserId && (
        <button
          onClick={() => { setSelected(currentUserId); }}
          disabled={loading}
          className="text-xs text-brand-mid-grey hover:text-white"
        >
          Take it
        </button>
      )}
    </div>
  )
}
