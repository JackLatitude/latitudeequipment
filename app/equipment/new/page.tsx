'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Field } from '@/components/ui/field'

export default function NewItemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const item = await res.json()
      router.push(`/equipment/${item.id}`)
    } else {
      const { message } = await res.json()
      setError(message)
      setLoading(false)
    }
  }

  const inputClass = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/equipment" className="text-sm text-gray-500 hover:text-gray-900">← Equipment</Link>
      </div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Add item</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" required>
          <input name="name" required className={inputClass} />
        </Field>
        <Field label="Serial number">
          <input name="serial_number" className={inputClass} />
        </Field>
        <Field label="Category">
          <input name="category" placeholder="e.g. Drone, Battery, Lens" className={inputClass} />
        </Field>
        <Field label="Value (£)">
          <input name="value" type="number" step="0.01" min="0" className={inputClass} />
        </Field>
        <Field label="Country of origin">
          <input name="country_of_origin" placeholder="e.g. China" className={inputClass} />
        </Field>
        <Field label="Weight (kg)">
          <input name="weight_kg" type="number" step="0.01" min="0" className={inputClass} />
        </Field>
        <Field label="Notes">
          <textarea name="notes" rows={3} className={inputClass} />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Add item'}
          </button>
          <Link href="/equipment" className="text-sm font-medium text-gray-500 px-4 py-2 hover:text-gray-900">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
