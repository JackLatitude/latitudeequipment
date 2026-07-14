'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthError, PasswordInput, SubmitButton, authInputClass, authLabelClass } from '@/components/auth/auth-ui'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <AuthShell>
      <h1 className="sr-only">Sign in to Latitude Equipment</h1>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
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
        <div>
          <label htmlFor="password" className={authLabelClass}>Password</label>
          <PasswordInput
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'auth-error' : undefined}
          />
        </div>

        {error && <AuthError>{error}</AuthError>}

        <SubmitButton loading={loading} loadingLabel="Signing in…">Sign in</SubmitButton>

        <p className="text-center text-xs text-brand-mid-grey pt-1">
          <Link
            href="/forgot-password"
            className="rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:text-white focus-visible:underline"
          >
            Forgot password?
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
