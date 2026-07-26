'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client } from '@/lib/types'
import { controlClass } from '@/components/ui/control'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

const inputClass = controlClass

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Name" required htmlFor="client-name">
        <input id="client-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus className={inputClass} placeholder="Company or individual's name" />
      </Field>
      <Field label="Contact name" htmlFor="client-contact-name">
        <input id="client-contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} placeholder="Leave blank for individuals" />
      </Field>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Field label="Email" htmlFor="client-email">
          <input id="client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Phone" htmlFor="client-phone">
          <input id="client-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Address" htmlFor="client-address">
        <textarea id="client-address" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className={inputClass} />
      </Field>
      <Field label="Notes" htmlFor="client-notes">
        <textarea id="client-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
      </Field>
      {error && <p className="text-sm text-brand-red">{error}</p>}
      <Button type="submit" loading={loading} loadingLabel="Saving…">
        {client ? 'Save changes' : 'Add client'}
      </Button>
    </form>
  )
}
