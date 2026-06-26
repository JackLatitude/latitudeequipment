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
  const [loading, setLoading] = useState(false)

  async function handleAssign(assignedToId: string | null) {
    setLoading(true)
    await onAssign(itemId, assignedToId)
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3">
      <select
        disabled={loading}
        value={currentHolderId ?? ''}
        onChange={(e) => handleAssign(e.target.value || null)}
        className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
      >
        {!kitId && <option value="">Unassigned (in storage)</option>}
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>{p.display_name}</option>
        ))}
      </select>
      {currentHolderId !== currentUserId && (
        <button
          disabled={loading}
          onClick={() => handleAssign(currentUserId)}
          className="bg-gray-900 text-white text-sm font-medium px-3 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          Take it
        </button>
      )}
    </div>
  )
}
