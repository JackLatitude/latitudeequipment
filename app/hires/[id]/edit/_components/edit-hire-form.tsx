'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client, Hire, Profile } from '@/lib/types'
import { controlClass } from '@/components/ui/control'

const inputClass = controlClass
const labelClass = 'block text-sm font-medium text-white mb-1'

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
      <div>
        <label htmlFor="edit-hire-title" className={labelClass}>Title</label>
        <input id="edit-hire-title" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
      </div>
      <div>
        <label htmlFor="edit-hire-client" className={labelClass}>Client</label>
        <select id="edit-hire-client" value={clientId} onChange={(e) => setClientId(e.target.value)} required className={inputClass}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="edit-hire-latitude-contact" className={labelClass}>Latitude Contact</label>
        <select id="edit-hire-latitude-contact" value={latitudeContactId} onChange={(e) => setLatitudeContactId(e.target.value)} className={inputClass}>
          <option value="">Unassigned</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-hire-start-date" className={labelClass}>Start date</label>
          <input id="edit-hire-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="edit-hire-end-date" className={labelClass}>End date</label>
          <input id="edit-hire-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="edit-hire-notes" className={labelClass}>Notes</label>
        <textarea id="edit-hire-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
      </div>
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <button type="submit" disabled={loading} className="bg-brand-red text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 disabled:opacity-50">
        {loading ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}
