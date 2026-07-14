'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { SerialInput } from '@/components/equipment/serial-input'
import type { Item, Kit } from '@/lib/types'
import { ITEM_CATEGORIES, ITEM_OWNERS } from '@/lib/constants'
import { controlClass } from '@/components/ui/control'

type Props = { item: Item; kits: Kit[] }

export function EditItemForm({ item, kits }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serial, setSerial] = useState(item.serial_number ?? '')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = e.currentTarget
    const raw = Object.fromEntries(new FormData(form))

    // kit_id is handled separately because it triggers holder sync
    const kitId = raw.kit_id as string
    const hasKitChange = kitId !== (item.kit_id ?? '')

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
        owner: raw.owner,
        firmware_version: raw.firmware_version,
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

  const inputClass = controlClass

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Name" required>
        <input name="name" required defaultValue={item.name} className={inputClass} />
      </Field>
      <Field label="Serial number">
        <SerialInput name="serial_number" value={serial} onChange={setSerial} inputClass={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <select name="category" defaultValue={item.category ?? ''} className={inputClass}>
            <option value="">Select a category</option>
            {ITEM_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Owner">
          <select name="owner" defaultValue={item.owner} className={inputClass}>
            {ITEM_OWNERS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Kit">
        <select name="kit_id" defaultValue={item.kit_id ?? ''} className={inputClass}>
          <option value="">None (loose item)</option>
          {kits.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Value (£)">
          <input name="value" type="number" step="0.01" min="0" defaultValue={item.value ?? ''} className={inputClass} />
        </Field>
        <Field label="Weight (kg)">
          <input name="weight_kg" type="number" step="0.01" min="0" defaultValue={item.weight_kg ?? ''} className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Country of origin">
          <input name="country_of_origin" defaultValue={item.country_of_origin ?? ''} placeholder="e.g. China" className={inputClass} />
        </Field>
        <Field label="Firmware version">
          <input name="firmware_version" defaultValue={item.firmware_version ?? ''} placeholder="e.g. 01.00.0500" className={inputClass} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea name="notes" rows={3} defaultValue={item.notes ?? ''} className={inputClass} />
      </Field>
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} loadingLabel="Saving…">Save changes</Button>
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
