'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthError, PasswordInput, SubmitButton, authLabelClass } from '@/components/auth/auth-ui'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // PKCE flow: token_hash in query params
    const params = new URLSearchParams(window.location.search)
    const token_hash = params.get('token_hash')
    const queryType = params.get('type')
    if (token_hash && queryType === 'recovery') {
      supabase.auth.verifyOtp({ token_hash, type: 'recovery' }).then(({ error }) => {
        if (error) setExpired(true)
        else setReady(true)
      })
      return
    }

    // Implicit flow: access_token in URL hash fragment (#access_token=...&type=recovery)
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const access_token = hash.get('access_token')
    const refresh_token = hash.get('refresh_token')
    const hashType = hash.get('type')
    if (access_token && hashType === 'recovery') {
      supabase.auth.setSession({ access_token, refresh_token: refresh_token ?? '' }).then(({ error }) => {
        if (error) setExpired(true)
        else setReady(true)
      })
      return
    }

    // Already authenticated (invite flow or direct navigation)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
      else setExpired(true)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <AuthShell>
      <h1 className="sr-only">Set a new password</h1>
      {expired ? (
        <div>
          <p className="text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-3" style={{ fontFamily: 'Metropolis, sans-serif' }}>
            Link expired
          </p>
          <p className="text-sm text-brand-mid-grey mb-6">
            This reset link has expired or already been used. Request a new one.
          </p>
          <Link href="/forgot-password" className="text-xs text-brand-mid-grey transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white focus-visible:underline">
            Request new link →
          </Link>
        </div>
      ) : !ready ? (
        <p className="text-sm text-brand-mid-grey" role="status" aria-live="polite">Verifying link…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <p className="text-sm text-brand-mid-grey mb-5">
              Choose a new password for your account.
            </p>
            <label htmlFor="password" className={authLabelClass}>New password</label>
            <PasswordInput
              id="password"
              name="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              minLength={8}
              autoComplete="new-password"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'auth-error' : undefined}
            />
          </div>
          <div>
            <label htmlFor="confirm" className={authLabelClass}>Confirm password</label>
            <PasswordInput
              id="confirm"
              name="confirm-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'auth-error' : undefined}
            />
          </div>
          {error && <AuthError>{error}</AuthError>}
          <SubmitButton loading={loading} loadingLabel="Saving…">Set new password</SubmitButton>
        </form>
      )}
    </AuthShell>
  )
}
