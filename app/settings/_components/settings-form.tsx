'use client'

import { useState } from 'react'
import { Field } from '@/components/ui/field'
import type { Profile } from '@/lib/types'

type Props = { profile: Profile }

const inputClass = 'w-full border border-brand-rule-grey rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-black'
const btnClass = 'bg-brand-black text-brand-white text-sm font-medium px-4 py-2 rounded hover:opacity-80 disabled:opacity-50'

export function SettingsForm({ profile }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [inviteEmail, setInviteEmail] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [nameMsg, setNameMsg] = useState<string | null>(null)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setSavingName(true)
    setNameMsg(null)
    const res = await fetch('/api/profiles/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName }),
    })
    setNameMsg(res.ok ? 'Saved.' : 'Something went wrong.')
    setSavingName(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteMsg(null)
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    })
    if (res.ok) {
      setInviteMsg(`Invite sent to ${inviteEmail}.`)
      setInviteEmail('')
    } else {
      const { message } = await res.json()
      setInviteMsg(message)
    }
    setInviting(false)
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-base font-medium text-brand-black mb-4">Your profile</h2>
        <form onSubmit={handleSaveName} className="space-y-4">
          <Field label="Display name">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
            />
          </Field>
          {nameMsg && <p className="text-sm text-brand-mid-grey">{nameMsg}</p>}
          <button
            type="submit"
            disabled={savingName}
            className={btnClass}
          >
            {savingName ? 'Saving…' : 'Save name'}
          </button>
        </form>
      </section>

      {profile.is_admin && (
        <section>
          <h2 className="text-base font-medium text-brand-black mb-4">Invite a partner</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <Field label="Email address">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className={inputClass}
              />
            </Field>
            {inviteMsg && <p className="text-sm text-brand-mid-grey">{inviteMsg}</p>}
            <button
              type="submit"
              disabled={inviting}
              className={btnClass}
            >
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
