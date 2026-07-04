'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

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

      {/* Form */}
      <div className="w-full max-w-xs">
        <div className="border-t border-brand-rule-grey mb-8" />
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
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
          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-brand-red">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-red text-white rounded px-3 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-center text-xs text-brand-mid-grey pt-1">
            <a href="/forgot-password" className="hover:text-white transition-colors">
              Forgot password?
            </a>
          </p>
        </form>
      </div>

    </div>
  )
}
