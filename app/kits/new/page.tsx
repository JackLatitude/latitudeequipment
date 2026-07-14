'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Field } from '@/components/ui/field'
import type { Profile } from '@/lib/types'
import { controlClass } from '@/components/ui/control'

export default function NewKitPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profiles').then((r) => r.json()).then(setProfiles)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch('/api/kits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const kit = await res.json()
      router.push(`/kits/${kit.id}`)
    } else {
      const { message } = await res.json()
      setError(message)
      setLoading(false)
    }
  }

  const inputClass = controlClass

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/kits" className="text-sm text-brand-mid-grey hover:text-white">
          ← Kits
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Add kit</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Kit name" required>
          <input name="name" required className={inputClass} />
        </Field>
        <Field label="Description">
          <textarea name="description" rows={2} className={inputClass} />
        </Field>
        <Field label="Initial holder" required>
          <select name="current_holder_id" required className={inputClass}>
            <option value="">Select a partner…</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
              </option>
            ))}
          </select>
        </Field>
        {error && <p className="text-sm text-brand-red">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-red text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Add kit'}
          </button>
          <Link
            href="/kits"
            className="text-sm font-medium text-brand-mid-grey px-4 py-2 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
