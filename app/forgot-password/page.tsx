'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthError, SubmitButton, authInputClass, authLabelClass } from '@/components/auth/auth-ui'

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

  return (
    <AuthShell>
      <h1 className="sr-only">Reset your password</h1>
      {sent ? (
        <div>
          <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-3" style={{ fontFamily: 'Metropolis, sans-serif' }}>
            Check your email
          </p>
          <p className="text-sm text-brand-mid-grey mb-6">
            A reset link has been sent to <span className="text-white">{email}</span>. Follow the link to set a new password.
          </p>
          <Link href="/login" className="text-xs text-brand-mid-grey transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white focus-visible:underline">
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <p className="text-sm text-brand-mid-grey mb-5">
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <label htmlFor="email" className={authLabelClass}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'auth-error' : undefined}
              className={authInputClass}
            />
          </div>
          {error && <AuthError>{error}</AuthError>}
          <SubmitButton loading={loading} loadingLabel="Sending…">Send reset link</SubmitButton>
          <p className="text-center text-xs text-brand-mid-grey pt-1">
            <Link href="/login" className="rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white focus-visible:underline">
              ← Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  )
}
