'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'

const DISMISS_KEY = 'firmware-alert-dismissed'

// sessionStorage is an external store, so read it as one. An effect that
// setState'd on mount would work, but it costs a second render pass on every
// dashboard load and trips react-hooks/set-state-in-effect.
let listeners: (() => void)[] = []

function subscribe(onChange: () => void) {
  listeners.push(onChange)
  return () => {
    listeners = listeners.filter((l) => l !== onChange)
  }
}

function getSnapshot(): boolean {
  // Private-mode Safari and blocked site data make this throw; a banner that
  // can't remember its dismissal is better than a dashboard that won't render.
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

// Server render has no sessionStorage. Report dismissed so the banner is never
// in the HTML, which is what keeps it from flashing before the client reads.
function getServerSnapshot(): boolean {
  return true
}

function dismiss() {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // Non-persistent dismissal is still better than ignoring the click.
  }
  listeners.forEach((l) => l())
}

export function FirmwareAlertBanner({ count }: { count: number }) {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

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
        onClick={dismiss}
        className="text-brand-mid-grey hover:text-white flex-shrink-0 transition-colors"
      >
        ✕
      </button>
    </div>
  )
}
