'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client, Hire, Profile } from '@/lib/types'
import { controlClass } from '@/components/ui/control'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

const inputClass = controlClass

export function EditHireForm({ hire, clients, profiles }: { hire: Hire; clients: Client[]; profiles: Profile[] }) {
  const router = useRouter()
  const [title, setTitle] = useState(hire.title)
  const [clientId, setClientId] = useState(hire.client_id)
  const [latitudeContactId, setLatitudeContactId] = useState(hire.latitude_contact_id ?? '')
  const [startDate, setStartDate] = useState(hire.start_date ?? '')
  const [endDate, setEndDate] = useState(hire.end_date ?? '')
  const [notes, setNotes] = useState(hire.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/hires/${hire.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        client_id: clientId,
        latitude_contact_id: latitudeContactId || null,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        notes: notes || null,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      setError(body.message)
      setLoading(false)
      return
    }
    router.push(`/hires/${hire.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Title" required htmlFor="edit-hire-title">
        <input id="edit-hire-title" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
      </Field>
      <Field label="Client" required htmlFor="edit-hire-client">
        <select id="edit-hire-client" value={clientId} onChange={(e) => setClientId(e.target.value)} required className={inputClass}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Latitude Contact" htmlFor="edit-hire-latitude-contact">
        <select id="edit-hire-latitude-contact" value={latitudeContactId} onChange={(e) => setLatitudeContactId(e.target.value)} className={inputClass}>
          <option value="">Unassigned</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" htmlFor="edit-hire-start-date">
          <input id="edit-hire-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="End date" htmlFor="edit-hire-end-date">
          <input id="edit-hire-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Notes" htmlFor="edit-hire-notes">
        <textarea id="edit-hire-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
      </Field>
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <Button type="submit" loading={loading} loadingLabel="Saving…">
        Save changes
      </Button>
    </form>
  )
}
