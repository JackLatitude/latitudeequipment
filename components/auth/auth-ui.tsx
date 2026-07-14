'use client'

import { useState } from 'react'
import Image from 'next/image'

// Shared auth-screen building blocks. Login, forgot-password and reset-password
// all render the same chrome (full-bleed black shell, brand mark, rule, form
// controls); keeping it in one place stops the three pages drifting apart.

export const authInputClass =
  'w-full rounded border border-brand-rule-grey bg-brand-input px-3.5 py-3 text-base lg:text-sm text-white transition-colors hover:border-brand-mid-grey focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/70'

export const authLabelClass =
  'block text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-1.5'

/**
 * Full-bleed auth shell. `fixed inset-0` lifts the screen out of the root
 * <main> padding so it owns the true viewport — no colour seam, no off-centre
 * push — and scrolls when the mobile keyboard shrinks the visible area.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-brand-black">
      <div
        className="animate-auth-in flex min-h-full flex-col items-center justify-center px-6"
        style={{
          paddingTop: 'max(3rem, env(safe-area-inset-top))',
          paddingBottom: 'max(3rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/logos/icon_o_mark.png"
            alt="Latitude Equipment"
            width={72}
            height={70}
            priority
            className="mb-5"
          />
          <p
            className="text-xs font-extralight tracking-[0.35em] uppercase text-white"
            style={{ fontFamily: 'Metropolis, sans-serif' }}
          >
            Latitude Equipment
          </p>
        </div>

        <div className="w-full max-w-xs">
          <div className="border-t border-brand-rule-grey mb-8" />
          {children}
        </div>
      </div>
    </div>
  )
}

export function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.35" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="4" y1="4" x2="20" y2="20" />}
    </svg>
  )
}

/** Password field with a built-in show/hide toggle. Accepts all standard input props. */
export function PasswordInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={`${authInputClass} pr-12${className ? ` ${className}` : ''}`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-brand-mid-grey transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white"
      >
        <EyeIcon off={show} />
      </button>
    </div>
  )
}

export function AuthError({ id = 'auth-error', children }: { id?: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      aria-live="assertive"
      className="rounded border border-brand-red/40 bg-brand-red/10 px-3 py-2.5 text-sm text-white"
    >
      {children}
    </p>
  )
}

export function SubmitButton({
  loading,
  loadingLabel,
  children,
}: {
  loading: boolean
  loadingLabel: string
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      className="flex w-full items-center justify-center gap-2 rounded bg-brand-red px-3 py-3 text-sm font-medium text-white transition-[opacity,transform] hover:opacity-90 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-brand-black disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading && <Spinner />}
      {loading ? loadingLabel : children}
    </button>
  )
}
