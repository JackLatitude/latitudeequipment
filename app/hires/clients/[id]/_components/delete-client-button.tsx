'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      setError(body.message)
      setLoading(false)
      setConfirming(false)
      return
    }
    router.push('/hires/clients')
    router.refresh()
  }

  return (
    <div>
      {confirming ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-brand-mid-grey">Delete this client?</span>
          <button onClick={handleDelete} disabled={loading} className="text-sm text-brand-red hover:underline disabled:opacity-50">
            {loading ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button onClick={() => setConfirming(false)} className="text-sm text-brand-mid-grey hover:text-white">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="text-sm text-brand-mid-grey hover:text-brand-red transition-colors">
          Delete client
        </button>
      )}
      {error && <p className="text-sm text-brand-red mt-2">{error}</p>}
    </div>
  )
}
