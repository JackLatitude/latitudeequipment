'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { HireStatus } from '@/lib/types'
import { buttonClasses } from '@/components/ui/button'

type Props = { hireId: string; status: HireStatus; itemCount: number }

export function HireActions({ hireId, status, itemCount }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  async function post(path: string, action: string) {
    setLoading(action)
    setError(null)
    const res = await fetch(path, { method: 'POST' })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      setError(body.message)
      setLoading(null)
      return
    }
    router.refresh()
    setLoading(null)
  }

  const primaryBtn = buttonClasses('primary')
  const secondaryBtn = 'text-white text-sm border border-brand-rule-grey hover:border-white rounded px-4 py-2 transition-colors'

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <a href={`/api/hires/${hireId}/pdf`} className={secondaryBtn}>
          {status === 'draft' ? 'Preview PDF' : 'Download PDF'}
        </a>
        {status === 'draft' && (
          <button
            onClick={() => post(`/api/hires/${hireId}/checkout`, 'checkout')}
            disabled={loading !== null || itemCount === 0}
            className={primaryBtn}
            title={itemCount === 0 ? 'Add items before checking out' : undefined}
          >
            {loading === 'checkout' ? 'Checking out…' : 'Check out →'}
          </button>
        )}
        {status === 'active' && (
          <button
            onClick={() => post(`/api/hires/${hireId}/checkin`, 'return')}
            disabled={loading !== null}
            className={primaryBtn}
          >
            {loading === 'return' ? 'Returning…' : 'Return all'}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-brand-red mt-2">{error}</p>}
    </div>
  )
}
