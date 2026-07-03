'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client, Profile } from '@/lib/types'

const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'
const labelClass = 'block text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-1.5'

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
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div>
        <label htmlFor="hire-title" className={labelClass}>Title</label>
        <input id="hire-title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus className={inputClass} placeholder="e.g. Nike Shoot – July 2026" />
      </div>
      <div>
        <label htmlFor="hire-client" className={labelClass}>Client</label>
        <select id="hire-client" value={clientId} onChange={(e) => setClientId(e.target.value)} required className={inputClass}>
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <p className="text-xs text-brand-mid-grey mt-1.5">
          Client not listed? <a href="/hires/clients/new" className="text-white hover:underline">Add a client</a> first.
        </p>
      </div>
      <div>
        <label htmlFor="hire-latitude-contact" className={labelClass}>Latitude Contact</label>
        <select id="hire-latitude-contact" value={latitudeContactId} onChange={(e) => setLatitudeContactId(e.target.value)} className={inputClass}>
          <option value="">Unassigned</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
        <p className="text-xs text-brand-mid-grey mt-1.5">Who at Latitude is managing this hire.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="hire-start-date" className={labelClass}>Start date</label>
          <input id="hire-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="hire-end-date" className={labelClass}>End date</label>
          <input id="hire-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="hire-notes" className={labelClass}>Notes</label>
        <textarea id="hire-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
      </div>
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <button type="submit" disabled={loading} className="bg-brand-red text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 disabled:opacity-50">
        {loading ? 'Creating…' : 'Create hire'}
      </button>
    </form>
  )
}
