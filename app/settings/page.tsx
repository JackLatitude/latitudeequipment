import { getCurrentUser, getCurrentProfile } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { SettingsForm } from './_components/settings-form'

export default async function SettingsPage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()])
  if (!user) return notFound()

  if (!profile) return notFound()

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-8">Settings</h1>
      <SettingsForm profile={profile} email={user.email ?? ''} />
    </div>
  )
}
