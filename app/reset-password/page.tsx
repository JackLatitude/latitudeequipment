'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
      router.push('/equipment')
    }
  }

  const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-black">
      <div className="w-full bg-brand-black border-t-[3px] border-brand-red flex items-center px-8 h-16 fixed top-0 left-0">
        <Image src="/logos/logo_equipment_dark.png" alt="Latitude Equipment" width={123} height={44} priority />
      </div>
      <div className="w-full max-w-sm bg-brand-dark-surface rounded-lg border border-brand-rule-grey p-8 mt-16">
        {expired ? (
          <>
            <h1 className="text-xl font-bold text-white mb-2">Link expired</h1>
            <p className="text-sm text-brand-mid-grey mb-6">This reset link has expired or already been used. Request a new one.</p>
            <Link href="/forgot-password" className="text-sm text-brand-red hover:opacity-80 transition-opacity">
              Request new link →
            </Link>
          </>
        ) : !ready ? (
          <p className="text-sm text-brand-mid-grey">Verifying link…</p>
        ) : (
          <>
            <h1 className="text-xl font-bold text-white mb-2">Set new password</h1>
            <p className="text-sm text-brand-mid-grey mb-6">Choose a new password for your account.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-1">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  minLength={8}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  className={inputClass}
                />
              </div>
              {error && <p className="text-sm text-brand-red">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-red text-white rounded px-3 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
