'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Field } from '@/components/ui/field'
import type { Kit } from '@/lib/types'

type Props = { kit: Kit }

export function EditKitForm({ kit }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const raw = Object.fromEntries(new FormData(e.currentTarget))
    const res = await fetch(`/api/kits/${kit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(raw),
    })
    if (res.ok) {
      router.push(`/kits/${kit.id}`)
    } else {
      const { message } = await res.json()
      setError(message)
      setLoading(false)
    }
  }

  const inputClass =
    'w-full border border-brand-rule-grey rounded px-3 py-2 text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Kit name" required>
        <input name="name" required defaultValue={kit.name} className={inputClass} />
      </Field>
      <Field label="Description">
        <textarea name="description" rows={3} defaultValue={kit.description ?? ''} className={inputClass} />
      </Field>
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-black text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        <Link
          href={`/kits/${kit.id}`}
          className="text-sm font-medium text-brand-mid-grey px-4 py-2 hover:text-white"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
