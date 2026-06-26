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
  const [loading, setLoading] = useState(false)

  async function handleAssign(assignedToId: string) {
    setLoading(true)
    await onAssign(kitId, assignedToId)
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3">
      <select
        disabled={loading}
        value={currentHolderId}
        onChange={(e) => handleAssign(e.target.value)}
        className="border border-brand-rule-grey rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-black disabled:opacity-50"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>{p.display_name}</option>
        ))}
      </select>
      {currentHolderId !== currentUserId && (
        <button
          disabled={loading}
          onClick={() => handleAssign(currentUserId)}
          className="bg-brand-black text-brand-white text-sm font-medium px-3 py-2 rounded hover:opacity-80 disabled:opacity-50"
        >
          Take it
        </button>
      )}
    </div>
  )
}
