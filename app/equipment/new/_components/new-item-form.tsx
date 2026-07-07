'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Field } from '@/components/ui/field'
import { SerialInput } from '@/components/equipment/serial-input'
import { ITEM_CATEGORIES } from '@/lib/constants'
import type { ItemTemplate } from '@/lib/types'

const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'
const labelClass = 'block text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-1.5'

type Props = {
  templates: ItemTemplate[]
  initialSerial: string
  initialTemplate: ItemTemplate | null
}

export function NewItemForm({ templates, initialSerial, initialTemplate }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [template, setTemplate] = useState<ItemTemplate | null>(initialTemplate)
  const [fieldsKey, setFieldsKey] = useState(0) // bump to remount fields with new defaults
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  function applyTemplate(t: ItemTemplate | null) {
    setTemplate(t)
    setFieldsKey((k) => k + 1)
    setSearch('')
    setPickerOpen(false)
  }

  const q = search.trim().toLowerCase()
  const matches = q
    ? templates.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 8)
    : []

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const data = Object.fromEntries(new FormData(e.currentTarget))
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Copy-from picker */}
      <div>
        <label className={labelClass}>Copy details from an existing item</label>
        {template ? (
          <div className="flex items-center justify-between gap-3 border border-brand-rule-grey rounded px-3 py-2 bg-brand-input">
            <span className="text-sm text-white truncate">
              Copied from <span className="font-medium">{template.name}</span>
            </span>
            <button
              type="button"
              onClick={() => applyTemplate(null)}
              className="text-xs text-brand-mid-grey hover:text-white flex-shrink-0 transition-colors"
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPickerOpen(true)
              }}
              onFocus={() => setPickerOpen(true)}
              onBlur={() => setTimeout(() => setPickerOpen(false), 150)}
              placeholder="Search existing items…"
              className={inputClass}
              autoComplete="off"
            />
            {pickerOpen && matches.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 mt-1 max-h-64 overflow-auto border border-brand-rule-grey rounded-lg bg-brand-dark-surface shadow-lg">
                {matches.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        applyTemplate(t)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm text-white block truncate">{t.name}</span>
                      {t.category && <span className="text-xs text-brand-mid-grey">{t.category}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <p className="text-xs text-brand-mid-grey mt-1.5">
          Fills everything but the serial number, which stays unique to this unit.
        </p>
      </div>

      {/* Fields — remount on template change so new defaults take effect */}
      <div key={fieldsKey} className="space-y-4">
        <Field label="Name" required>
          <input name="name" required defaultValue={template?.name ?? ''} className={inputClass} />
        </Field>
        <Field label="Serial number">
          <SerialInput name="serial_number" defaultValue={initialSerial} inputClass={inputClass} />
        </Field>
        <Field label="Category">
          <select name="category" defaultValue={template?.category ?? ''} className={inputClass}>
            <option value="">Select a category</option>
            {ITEM_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Value (£)">
          <input name="value" type="number" step="0.01" min="0" defaultValue={template?.value ?? ''} className={inputClass} />
        </Field>
        <Field label="Country of origin">
          <input name="country_of_origin" defaultValue={template?.country_of_origin ?? ''} placeholder="e.g. China" className={inputClass} />
        </Field>
        <Field label="Weight (kg)">
          <input name="weight_kg" type="number" step="0.01" min="0" defaultValue={template?.weight_kg ?? ''} className={inputClass} />
        </Field>
        <Field label="Notes">
          <textarea name="notes" rows={3} defaultValue={template?.notes ?? ''} className={inputClass} />
        </Field>
      </div>

      {error && <p className="text-sm text-brand-red">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-brand-red text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Add item'}
        </button>
        <Link href="/equipment" className="text-sm font-medium text-brand-mid-grey px-4 py-2 hover:text-white">
          Cancel
        </Link>
      </div>
    </form>
  )
}
