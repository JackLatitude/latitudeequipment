'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Field } from '@/components/ui/field'
import type { Item, Kit } from '@/lib/types'

type Props = { item: Item; kits: Kit[] }

export function EditItemForm({ item, kits }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = e.currentTarget
    const raw = Object.fromEntries(new FormData(form))

    // kit_id is handled separately because it triggers holder sync
    const kitId = raw.kit_id as string | undefined
    const hasKitChange = kitId !== undefined && kitId !== (item.kit_id ?? '')

    if (hasKitChange) {
      const kitRes = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kit_id: kitId || null }),
      })
      if (!kitRes.ok) {
        const { message } = await kitRes.json()
        setError(message)
        setLoading(false)
        return
      }
    }

    // Update remaining fields
    const res = await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: raw.name,
        serial_number: raw.serial_number,
        category: raw.category,
        notes: raw.notes,
        value: raw.value,
        country_of_origin: raw.country_of_origin,
        weight_kg: raw.weight_kg,
      }),
    })

    if (res.ok) {
      router.push(`/equipment/${item.id}`)
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
      <Field label="Name" required>
        <input name="name" required defaultValue={item.name} className={inputClass} />
      </Field>
      <Field label="Serial number">
        <input name="serial_number" defaultValue={item.serial_number ?? ''} className={inputClass} />
      </Field>
      <Field label="Category">
        <input name="category" defaultValue={item.category ?? ''} placeholder="e.g. Drone, Battery, Lens" className={inputClass} />
      </Field>
      <Field label="Kit">
        <select name="kit_id" defaultValue={item.kit_id ?? ''} className={inputClass}>
          <option value="">None (loose item)</option>
          {kits.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Value (£)">
        <input name="value" type="number" step="0.01" min="0" defaultValue={item.value ?? ''} className={inputClass} />
      </Field>
      <Field label="Country of origin">
        <input name="country_of_origin" defaultValue={item.country_of_origin ?? ''} placeholder="e.g. China" className={inputClass} />
      </Field>
      <Field label="Weight (kg)">
        <input name="weight_kg" type="number" step="0.01" min="0" defaultValue={item.weight_kg ?? ''} className={inputClass} />
      </Field>
      <Field label="Notes">
        <textarea name="notes" rows={3} defaultValue={item.notes ?? ''} className={inputClass} />
      </Field>
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-black text-white text-sm font-medium px-4 py-2 rounded border border-brand-rule-grey hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        <Link
          href={`/equipment/${item.id}`}
          className="text-sm font-medium text-brand-mid-grey px-4 py-2 hover:text-white"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
