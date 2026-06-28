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
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-black">
      <div className="w-full bg-brand-black border-t-[3px] border-brand-red flex items-center px-8 h-16 fixed top-0 left-0">
        <Image src="/logos/logo_equipment_dark.png" alt="Latitude Equipment" width={123} height={44} priority />
      </div>
      <div className="w-full max-w-sm bg-brand-dark-surface rounded-lg border border-brand-rule-grey p-8 mt-16">
        {sent ? (
          <>
            <h1 className="text-xl font-bold text-white mb-3">Check your email</h1>
            <p className="text-sm text-brand-mid-grey mb-6">
              We&apos;ve sent a password reset link to <span className="text-white">{email}</span>. Check your inbox and follow the link.
            </p>
            <Link href="/login" className="text-sm text-brand-mid-grey hover:text-white transition-colors">
              ← Back to sign in
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-white mb-2">Reset password</h1>
            <p className="text-sm text-brand-mid-grey mb-6">Enter your email and we&apos;ll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Email</label>
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
                className="w-full bg-brand-red text-white rounded px-3 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <p className="text-center text-sm text-brand-mid-grey">
                <Link href="/login" className="hover:text-white transition-colors">← Back to sign in</Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
