'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Client, Profile } from '@/lib/types'
import { controlClass } from '@/components/ui/control'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

const inputClass = controlClass

export function NewHireForm({ clients, profiles }: { clients: Client[]; profiles: Profile[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [latitudeContactId, setLatitudeContactId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/hires', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        client_id: clientId,
        latitude_contact_id: latitudeContactId || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        notes: notes || undefined,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      setError(body.message)
      setLoading(false)
      return
    }
    const hire = await res.json()
    router.push(`/hires/${hire.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Title" required htmlFor="hire-title">
        <input id="hire-title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus className={inputClass} placeholder="e.g. Nike Shoot – July 2026" />
      </Field>
      <Field label="Client" required htmlFor="hire-client">
        <select id="hire-client" value={clientId} onChange={(e) => setClientId(e.target.value)} required className={inputClass}>
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <p className="text-xs text-brand-mid-grey mt-1.5">
          Client not listed? <Link href="/hires/clients/new" className="text-white hover:underline">Add a client</Link> first.
        </p>
      </Field>
      <Field label="Latitude Contact" htmlFor="hire-latitude-contact">
        <select id="hire-latitude-contact" value={latitudeContactId} onChange={(e) => setLatitudeContactId(e.target.value)} className={inputClass}>
          <option value="">Unassigned</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
        <p className="text-xs text-brand-mid-grey mt-1.5">Who at Latitude is managing this hire.</p>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date" htmlFor="hire-start-date">
          <input id="hire-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="End date" htmlFor="hire-end-date">
          <input id="hire-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Notes" htmlFor="hire-notes">
        <textarea id="hire-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
      </Field>
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <Button type="submit" loading={loading} loadingLabel="Creating…">
        Create hire
      </Button>
    </form>
  )
}
