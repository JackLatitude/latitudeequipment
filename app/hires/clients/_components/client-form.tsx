'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client } from '@/lib/types'

const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-base lg:text-sm bg-brand-input text-white focus:outline-none focus:ring-2 focus:ring-brand-red'
const labelClass = 'block text-xs font-extralight uppercase tracking-wider text-brand-mid-grey mb-1.5'

export function ClientForm({ client }: { client?: Client }) {
  const router = useRouter()
  const [name, setName] = useState(client?.name ?? '')
  const [contactName, setContactName] = useState(client?.contact_name ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [address, setAddress] = useState(client?.address ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const payload = {
      name,
      contact_name: contactName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      notes: notes || undefined,
    }
    const res = client
      ? await fetch(`/api/clients/${client.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Something went wrong' }))
      setError(body.message)
      setLoading(false)
      return
    }
    const saved = await res.json()
    router.push(`/hires/clients/${saved.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div>
        <label htmlFor="client-name" className={labelClass}>Name</label>
        <input id="client-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus className={inputClass} placeholder="Company or individual's name" />
      </div>
      <div>
        <label htmlFor="client-contact-name" className={labelClass}>Contact name</label>
        <input id="client-contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} placeholder="Leave blank for individuals" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label htmlFor="client-email" className={labelClass}>Email</label>
          <input id="client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="client-phone" className={labelClass}>Phone</label>
          <input id="client-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="client-address" className={labelClass}>Address</label>
        <textarea id="client-address" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className={inputClass} />
      </div>
      <div>
        <label htmlFor="client-notes" className={labelClass}>Notes</label>
        <textarea id="client-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
      </div>
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <button type="submit" disabled={loading} className="bg-brand-red text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 disabled:opacity-50">
        {loading ? 'Saving…' : client ? 'Save changes' : 'Add client'}
      </button>
    </form>
  )
}
