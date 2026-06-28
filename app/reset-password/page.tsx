'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-black">
      <div className="w-full bg-brand-black border-t-[3px] border-brand-red flex items-center px-8 h-16 fixed top-0 left-0">
        <Image src="/logos/logo_equipment_dark.png" alt="Latitude Equipment" width={123} height={44} priority />
      </div>
      <div className="w-full max-w-sm bg-brand-dark-surface rounded-lg border border-brand-rule-grey p-8 mt-16">
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
      </div>
    </div>
  )
}
