'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const DISMISS_KEY = 'firmware-alert-dismissed'

export function FirmwareAlertBanner({ count }: { count: number }) {
  // Start hidden so we never flash the banner before reading sessionStorage.
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  if (count <= 0 || dismissed) return null

  return (
    <div className="mb-6 flex items-center justify-between gap-3 border border-brand-red/40 bg-brand-red/10 rounded-lg px-4 py-3">
      <p className="text-sm text-white">
        {count} {count === 1 ? 'item needs' : 'items need'} a firmware update.{' '}
        <Link href="/firmware" className="font-medium text-brand-red hover:underline">
          Review →
        </Link>
      </p>
      <button
        type="button"
        aria-label="Dismiss firmware alert"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, '1')
          setDismissed(true)
        }}
        className="text-brand-mid-grey hover:text-white flex-shrink-0 transition-colors"
      >
        ✕
      </button>
    </div>
  )
}
