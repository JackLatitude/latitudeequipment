'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2.5 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'
  const labelClass = 'block text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-1.5'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-black px-6">

      {/* Brand mark */}
      <div className="flex flex-col items-center mb-12">
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

      {/* Content */}
      <div className="w-full max-w-xs">
        <div className="border-t border-brand-rule-grey mb-8" />

        {sent ? (
          <div>
            <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-3" style={{ fontFamily: 'Metropolis, sans-serif' }}>
              Check your email
            </p>
            <p className="text-sm text-brand-mid-grey mb-6">
              A reset link has been sent to <span className="text-white">{email}</span>. Follow the link to set a new password.
            </p>
            <Link href="/login" className="text-xs text-brand-mid-grey hover:text-white transition-colors">
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="text-sm text-brand-mid-grey mb-5">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className={inputClass}
              />
            </div>
            {error && <p className="text-sm text-brand-red">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red text-white rounded px-3 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-xs text-brand-mid-grey pt-1">
              <Link href="/login" className="hover:text-white transition-colors">
                ← Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>

    </div>
  )
}
