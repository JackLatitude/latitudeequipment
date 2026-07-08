'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Field } from '@/components/ui/field'
import { SerialInput } from '@/components/equipment/serial-input'
import { ITEM_CATEGORIES } from '@/lib/constants'
import type { ItemTemplate, Kit } from '@/lib/types'

const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'
const labelClass = 'block text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-1.5'

type Fields = {
  name: string
  category: string
  value: string
  country: string
  weight: string
  notes: string
}

function fieldsFromTemplate(t: ItemTemplate | null): Fields {
  return {
    name: t?.name ?? '',
    category: t?.category ?? '',
    value: t?.value != null ? String(t.value) : '',
    country: t?.country_of_origin ?? '',
    weight: t?.weight_kg != null ? String(t.weight_kg) : '',
    notes: t?.notes ?? '',
  }
}

type Props = {
  templates: ItemTemplate[]
  kits: Kit[]
  initialSerial: string
  initialTemplate: ItemTemplate | null
  initialKitId: string
}

export function NewItemForm({ templates, kits, initialSerial, initialTemplate, initialKitId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [template, setTemplate] = useState<ItemTemplate | null>(initialTemplate)
  const [fields, setFields] = useState<Fields>(() => fieldsFromTemplate(initialTemplate))
  const [serial, setSerial] = useState(initialSerial)
  const [kitId, setKitId] = useState(initialKitId)

  // Copy-from picker
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  // Live serial lookup
  const [suggestion, setSuggestion] = useState<ItemTemplate | null>(null)
  const [duplicateId, setDuplicateId] = useState<string | null>(null)
  const [dismissedSerial, setDismissedSerial] = useState<string | null>(null)

  function setField<K extends keyof Fields>(k: K, v: string) {
    setFields((f) => ({ ...f, [k]: v }))
  }

  function applyTemplate(t: ItemTemplate | null) {
    setTemplate(t)
    setFields(fieldsFromTemplate(t))
    setSearch('')
    setPickerOpen(false)
    setSuggestion(null)
  }

  // As the serial changes (typed or scanned), check for an existing exact
  // match (duplicate) or a same-prefix model to suggest.
  useEffect(() => {
    const s = serial.trim()
    if (s.length < 4) {
      setSuggestion(null)
      setDuplicateId(null)
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/items/lookup?serial=${encodeURIComponent(s)}`, { signal: ctrl.signal })
        if (!res.ok) return
        const data = await res.json()
        if (data.exact) {
          setDuplicateId(data.exact.id)
          setSuggestion(null)
          return
        }
        setDuplicateId(null)
        // Don't nag if a template is already applied or this serial was dismissed.
        setSuggestion(template || s === dismissedSerial ? null : data.suggestion ?? null)
      } catch {
        // aborted / network — ignore
      }
    }, 400)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [serial, template, dismissedSerial])

  const q = search.trim().toLowerCase()
  const matches = q ? templates.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 8) : []

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fields.name,
        serial_number: serial,
        category: fields.category,
        value: fields.value,
        country_of_origin: fields.country,
        weight_kg: fields.weight,
        notes: fields.notes,
        kit_id: kitId,
      }),
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

      <Field label="Name" required>
        <input value={fields.name} onChange={(e) => setField('name', e.target.value)} required className={inputClass} />
      </Field>

      <Field label="Serial number">
        <SerialInput name="serial_number" value={serial} onChange={setSerial} inputClass={inputClass} />
        {suggestion && (
          <div className="mt-2 border border-brand-red/40 bg-brand-red/5 rounded px-3 py-2">
            <p className="text-sm text-white">
              Looks like a <span className="font-medium">{suggestion.name}</span>. Use its details?
            </p>
            <div className="flex gap-4 mt-2">
              <button
                type="button"
                onClick={() => applyTemplate(suggestion)}
                className="text-sm font-medium text-brand-red hover:opacity-80"
              >
                Yes, use them
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuggestion(null)
                  setDismissedSerial(serial.trim())
                }}
                className="text-sm text-brand-mid-grey hover:text-white transition-colors"
              >
                No
              </button>
            </div>
          </div>
        )}
        {duplicateId && (
          <p className="mt-2 text-xs text-brand-mid-grey">
            An item with this serial is already in the database.{' '}
            <Link href={`/equipment/${duplicateId}`} className="text-white hover:underline">
              View it →
            </Link>
          </p>
        )}
      </Field>

      <Field label="Category">
        <select value={fields.category} onChange={(e) => setField('category', e.target.value)} className={inputClass}>
          <option value="">Select a category</option>
          {ITEM_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="Kit">
        <select value={kitId} onChange={(e) => setKitId(e.target.value)} className={inputClass}>
          <option value="">None (loose item)</option>
          {kits.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Value (£)">
        <input type="number" step="0.01" min="0" value={fields.value} onChange={(e) => setField('value', e.target.value)} className={inputClass} />
      </Field>

      <Field label="Country of origin">
        <input value={fields.country} onChange={(e) => setField('country', e.target.value)} placeholder="e.g. China" className={inputClass} />
      </Field>

      <Field label="Weight (kg)">
        <input type="number" step="0.01" min="0" value={fields.weight} onChange={(e) => setField('weight', e.target.value)} className={inputClass} />
      </Field>

      <Field label="Notes">
        <textarea rows={3} value={fields.notes} onChange={(e) => setField('notes', e.target.value)} className={inputClass} />
      </Field>

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
