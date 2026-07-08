'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { ItemTemplate } from '@/lib/types'

const SerialScanner = dynamic(() => import('./serial-scanner'), { ssr: false })

function ScanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  )
}

type Suggestion = { serial: string; item: ItemTemplate }

export function ScanToFind() {
  const router = useRouter()
  const [scanning, setScanning] = useState(false)
  const [looking, setLooking] = useState(false)
  const [notFound, setNotFound] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)

  function reset() {
    setNotFound(null)
    setSuggestion(null)
  }

  async function handleDetected(serial: string) {
    setScanning(false)
    reset()
    setLooking(true)
    try {
      const res = await fetch(`/api/items/lookup?serial=${encodeURIComponent(serial)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.exact) {
          router.push(`/equipment/${data.exact.id}`)
          return
        }
        if (data.suggestion) {
          setSuggestion({ serial, item: data.suggestion })
          return
        }
      }
      setNotFound(serial)
    } catch {
      setNotFound(serial)
    } finally {
      setLooking(false)
    }
  }

  const toastClass =
    'fixed left-1/2 -translate-x-1/2 z-40 bottom-24 lg:bottom-6 w-[calc(100%-2rem)] max-w-sm bg-brand-dark-surface border border-brand-rule-grey rounded-lg px-4 py-3 shadow-lg'

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset()
          setScanning(true)
        }}
        disabled={looking}
        className="flex-1 lg:flex-none flex items-center justify-center gap-2 text-white text-sm font-medium border border-brand-rule-grey hover:border-white rounded px-4 py-2.5 lg:py-2 transition-colors disabled:opacity-50"
      >
        <ScanIcon />
        {looking ? 'Looking up…' : 'Scan'}
      </button>

      {suggestion && (
        <div role="status" className={toastClass}>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-white">
              Serial not found. Is this a <span className="font-medium">{suggestion.item.name}</span>?
            </p>
            <button
              onClick={() => setSuggestion(null)}
              aria-label="Dismiss"
              className="text-brand-mid-grey hover:text-white flex-shrink-0 -mt-0.5 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-brand-mid-grey break-all mt-0.5">{suggestion.serial}</p>
          <div className="flex gap-4 mt-2">
            <Link
              href={`/equipment/new?from=${suggestion.item.id}&serial=${encodeURIComponent(suggestion.serial)}`}
              className="text-sm font-medium text-brand-red hover:opacity-80"
            >
              Yes, add one →
            </Link>
            <Link
              href={`/equipment/new?serial=${encodeURIComponent(suggestion.serial)}`}
              className="text-sm text-brand-mid-grey hover:text-white transition-colors"
            >
              No, different item →
            </Link>
          </div>
        </div>
      )}

      {notFound && (
        <div role="status" className={toastClass}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-white">Serial not found</p>
              <p className="text-xs text-brand-mid-grey break-all mt-0.5">{notFound}</p>
            </div>
            <button
              onClick={() => setNotFound(null)}
              aria-label="Dismiss"
              className="text-brand-mid-grey hover:text-white flex-shrink-0 -mt-0.5 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <Link
            href={`/equipment/new?serial=${encodeURIComponent(notFound)}`}
            className="inline-block mt-2 text-sm text-brand-red hover:opacity-80 transition-opacity"
          >
            Add it as a new item →
          </Link>
        </div>
      )}

      {scanning && (
        <SerialScanner onDetected={handleDetected} onClose={() => setScanning(false)} />
      )}
    </>
  )
}
