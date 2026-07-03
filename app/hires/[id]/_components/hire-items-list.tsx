'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { HireItem, HireStatus } from '@/lib/types'

type Props = { hireId: string; hireItems: HireItem[]; status: HireStatus }

function formatDateTime(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function HireItemsList({ hireId, hireItems, status }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function call(path: string, method: string, itemId: string) {
    setBusy(itemId)
    setError(null)
    const res = await fetch(path, { method })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      setError(body.message)
    }
    router.refresh()
    setBusy(null)
  }

  if (hireItems.length === 0) {
    return (
      <p className="text-sm text-brand-mid-grey">
        No items on this hire yet. Add items or a kit below.
      </p>
    )
  }

  return (
    <div>
      <ul className="divide-y divide-brand-rule-grey border border-brand-rule-grey rounded-lg bg-brand-dark-surface">
        {hireItems.map((hi) => (
          <li key={hi.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{hi.item?.name ?? 'Unknown item'}</p>
              <p className="text-xs text-brand-mid-grey truncate">
                {[hi.item?.serial_number, hi.item?.category].filter(Boolean).join(' · ') || '—'}
              </p>
              {status !== 'draft' && (
                <p className="text-xs text-brand-mid-grey/60 mt-0.5">
                  {hi.checked_in_at
                    ? `Returned ${formatDateTime(hi.checked_in_at)}`
                    : hi.checked_out_at
                      ? `Out since ${formatDateTime(hi.checked_out_at)}`
                      : ''}
                </p>
              )}
            </div>
            {status === 'draft' && (
              <button
                onClick={() => call(`/api/hires/${hireId}/items/${hi.item_id}`, 'DELETE', hi.item_id)}
                disabled={busy !== null}
                className="text-xs text-brand-mid-grey hover:text-brand-red transition-colors flex-shrink-0 disabled:opacity-50"
              >
                Remove
              </button>
            )}
            {status === 'active' && !hi.checked_in_at && (
              <button
                onClick={() => call(`/api/hires/${hireId}/items/${hi.item_id}/checkin`, 'POST', hi.item_id)}
                disabled={busy !== null}
                className="text-xs text-white border border-brand-rule-grey hover:border-white rounded px-3 py-1.5 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                {busy === hi.item_id ? 'Checking in…' : 'Check in'}
              </button>
            )}
            {status === 'active' && hi.checked_in_at && (
              <span className="text-xs text-brand-mid-grey flex-shrink-0">Returned</span>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-brand-red mt-2">{error}</p>}
    </div>
  )
}
