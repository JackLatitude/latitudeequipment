'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Field } from '@/components/ui/field'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { controlClass } from '@/components/ui/control'
import { buttonClasses } from '@/components/ui/button'

type Props = { profile: Profile; email: string }

const inputClass = controlClass
const btnClass = buttonClasses('primary')

export function SettingsForm({ profile, email }: Props) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [inviteEmail, setInviteEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [nameMsg, setNameMsg] = useState<string | null>(null)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)

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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match.')
      return
    }

    setChangingPassword(true)
    setPasswordMsg(null)

    try {
      const client = createClient()

      // Verify current password before allowing update
      const { error: signInError } = await client.auth.signInWithPassword({
        email,
        password: currentPassword,
      })

      if (signInError) {
        setPasswordMsg('Current password is incorrect.')
        setChangingPassword(false)
        return
      }

      const { error } = await client.auth.updateUser({ password: newPassword })

      if (error) {
        setPasswordMsg(error.message)
      } else {
        setPasswordMsg('Password updated.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setPasswordMsg('Something went wrong.')
    }

    setChangingPassword(false)
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-base font-medium text-white mb-4">Your profile</h2>
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
          <h2 className="text-base font-medium text-white mb-4">Invite a partner</h2>
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

      <section>
        <h2 className="text-base font-medium text-white mb-4">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Field label="Current password">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          <Field label="New password">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Confirm password">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={inputClass}
            />
          </Field>
          {passwordMsg && <p className="text-sm text-brand-mid-grey">{passwordMsg}</p>}
          <button
            type="submit"
            disabled={changingPassword}
            className={btnClass}
          >
            {changingPassword ? 'Updating…' : 'Change password'}
          </button>
        </form>
      </section>

      <section className="pt-4 border-t border-brand-rule-grey lg:hidden">
        <button
          type="button"
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/login')
            router.refresh()
          }}
          className="w-full text-sm font-medium text-brand-mid-grey hover:text-white py-2 transition-colors"
        >
          Sign out
        </button>
      </section>
    </div>
  )
}
