'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/types'

type Props = {
  kitId: string
  currentHolderId: string
  profiles: Profile[]
  currentUserId: string
  onAssign: (kitId: string, assignedToId: string) => Promise<void>
}

export function KitAssignControl({ kitId, currentHolderId, profiles, currentUserId, onAssign }: Props) {
  const [selected, setSelected] = useState(currentHolderId)
  const [loading, setLoading] = useState(false)

  async function handleAssign() {
    setLoading(true)
    try {
      await onAssign(kitId, selected)
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
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>{p.display_name}</option>
        ))}
      </select>
      {selected !== currentHolderId && (
        <button
          onClick={handleAssign}
          disabled={loading}
          className="text-sm font-medium bg-brand-black text-white px-3 py-2 rounded hover:opacity-80 disabled:opacity-50 border border-brand-rule-grey"
        >
          {loading ? '…' : 'Assign'}
        </button>
      )}
      {currentHolderId !== currentUserId && (
        <button
          onClick={() => setSelected(currentUserId)}
          disabled={loading}
          className="text-sm text-brand-mid-grey hover:text-white"
        >
          Take it
        </button>
      )}
    </div>
  )
}
